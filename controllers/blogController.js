const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const BlogContent = require('../models/BlogContent');
const Language = require('../models/Language');
const Paper = require('../models/Paper');
const cloudinary = require('../config/cloudinary');
const slugify = require('slugify');

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file) => {
  if (!file) return null;
  
  try {
    if (file.buffer) {
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'blogs',
      });
      
      return result;
    }
    
    if (file.path) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'blogs',
      });
      
      return result;
    }
    
    return null;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
};

// @desc    Create blog with content sections
// @route   POST /api/blogs
// @access  Private (Admin)
exports.createBlog = async (req, res) => {
  try {
    const { languageId, paperId, title, description, date, tableContent } = req.body;

    // Validate required fields
    if (!languageId || !paperId || !title) {
      return res.status(400).json({
        success: false,
        message: 'languageId, paperId, and title are required'
      });
    }

    // Validate language exists and is active
    const language = await Language.findById(languageId);
    if (!language || !language.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive language'
      });
    }

    // Validate paper exists and is active
    const paper = await Paper.findById(paperId);
    if (!paper || !paper.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive paper'
      });
    }

    // Upload thumbnail
    const thumbnailFile = req.files?.thumbnail?.[0];
    let thumbnail = null;
    if (thumbnailFile) {
      const result = await uploadToCloudinary(thumbnailFile);
      thumbnail = { url: result.url, public_id: result.public_id };
    }

    // Upload multiple images
    const imagesFiles = req.files?.images || [];
    const images = [];
    for (const file of imagesFiles) {
      const result = await uploadToCloudinary(file);
      images.push({ url: result.url, public_id: result.public_id });
    }

    // Auto-extract year and month from date
    const blogDate = date ? new Date(date) : new Date();
    const blogYear = blogDate.getFullYear();
    const blogMonth = blogDate.getMonth() + 1;

    // Generate slug from title
    const slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now();

    // Create blog
    const blog = await Blog.create({
      languageId,
      paperId,
      title,
      description,
      slug,
      thumbnail,
      images,
      date: blogDate,
      year: blogYear,
      month: blogMonth,
      isActive: true,
      views: 0
    });

    // Create blog content sections if provided
    if (tableContent) {
      try {
        console.log('📝 Raw tableContent:', tableContent);
        console.log('📝 Type:', typeof tableContent);
        
        const contents = JSON.parse(tableContent);
        console.log('✅ Parsed contents:', contents);
        
        const contentData = contents.map((item, index) => ({
          blogId: blog._id,
          title: item.title,
          content: item.content,
          order: item.order || (index + 1)
        }));

        await BlogContent.insertMany(contentData);
        console.log('✅ Blog content created:', contentData.length, 'sections');
      } catch (err) {
        console.error('❌ Table content parse error:', err);
        console.error('❌ Raw value:', tableContent);
        return res.status(400).json({
          success: false,
          message: 'Invalid tableContent format. Must be valid JSON array.'
        });
      }
    }

    // Populate and return
    const populatedBlog = await Blog.findById(blog._id)
      .populate('languageId', 'name code')
      .populate('paperId', 'name');

    // Get the blog contents
    const contents = await BlogContent.find({ blogId: blog._id }).sort({ order: 1 });

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: {
        ...populatedBlog._doc,
        contents
      }
    });

  } catch (err) {
    console.error('Create Blog Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error creating blog',
      error: err.message
    });
  }
};

// @desc    Get blogs with filters
// @route   GET /api/blogs
// @access  Public
exports.getBlogs = async (req, res) => {
  try {
    const { languageId, paperId, year, month, date, limit } = req.query;

    const filter = { isActive: true };

    if (languageId) filter.languageId = languageId;
    if (paperId) filter.paperId = paperId;
    
    // If complete date is provided, use it directly (year, month auto-extracted)
    if (date) {
      const selectedDate = new Date(date);
      const start = new Date(selectedDate.setHours(0, 0, 0, 0));
      const end = new Date(selectedDate.setHours(23, 59, 59, 999));
      filter.date = { $gte: start, $lte: end };
    } else {
      // Fallback to year/month filtering if date not provided
      if (year) filter.year = parseInt(year);
      if (month) filter.month = parseInt(month);
    }

    // Default limit if not provided
    const blogLimit = parseInt(limit) || 10;

    let blogs = await Blog.find(filter)
      .populate('languageId', 'name code')
      .populate('paperId', 'name')
      .sort({ createdAt: -1 }); // ALWAYS sort by latest

    // Apply limit if specified
    if (blogLimit) {
      blogs = blogs.slice(0, blogLimit);
    }

    res.json({
      success: true,
      count: blogs.length,
      data: blogs
    });

  } catch (err) {
    console.error('Get Blogs Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: err.message
    });
  }
};

// @desc    Get single blog with content sections
// @route   GET /api/blogs/:id
// @access  Public
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('languageId', 'name code')
      .populate('paperId', 'name');

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Get blog content sections
    const contents = await BlogContent.find({ blogId: blog._id })
      .sort({ order: 1 });

    res.json({
      success: true,
      data: {
        ...blog._doc,
        contents
      }
    });

  } catch (err) {
    console.error('Get Blog Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching blog',
      error: err.message
    });
  }
};

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private (Admin)
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    const updates = {};

    // Update basic fields
    if (req.body.languageId) {
      // Validate language
      const language = await Language.findById(req.body.languageId);
      if (!language || !language.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive language'
        });
      }
      updates.languageId = req.body.languageId;
    }
    
    if (req.body.paperId) {
      // Validate paper
      const paper = await Paper.findById(req.body.paperId);
      if (!paper || !paper.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive paper'
        });
      }
      updates.paperId = req.body.paperId;
    }
    
    if (req.body.title) {
      updates.title = req.body.title;
      // Regenerate slug if title changes
      updates.slug = slugify(req.body.title, { lower: true, strict: true }) + '-' + Date.now();
    }
    
    if (req.body.description !== undefined) updates.description = req.body.description;
    
    if (req.body.date) {
      updates.date = new Date(req.body.date);
      // Auto-extract year and month from date
      updates.year = updates.date.getFullYear();
      updates.month = updates.date.getMonth() + 1;
    }
    
    // Only update year/month if date is not provided
    if (!req.body.date) {
      if (req.body.year) updates.year = parseInt(req.body.year);
      if (req.body.month) updates.month = parseInt(req.body.month);
    }
    
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

    // Upload new thumbnail if provided
    const thumbnailFile = req.files?.thumbnail?.[0];
    if (thumbnailFile) {
      // Delete old thumbnail
      if (blog.thumbnail?.public_id) {
        await cloudinary.uploader.destroy(blog.thumbnail.public_id);
      }
      const result = await uploadToCloudinary(thumbnailFile);
      updates.thumbnail = { url: result.url, public_id: result.public_id };
    }

    // Upload new images if provided
    const imagesFiles = req.files?.images || [];
    if (imagesFiles.length > 0) {
      // Delete old images
      if (blog.images && blog.images.length > 0) {
        for (const img of blog.images) {
          if (img.public_id) {
            await cloudinary.uploader.destroy(img.public_id);
          }
        }
      }
      
      const newImages = [];
      for (const file of imagesFiles) {
        const result = await uploadToCloudinary(file);
        newImages.push({ url: result.url, public_id: result.public_id });
      }
      updates.images = newImages;
    }

    // Update blog
    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('languageId', 'name code').populate('paperId', 'name');

    // Update content sections if provided
    if (req.body.tableContent) {
      try {
        console.log('📝 Updating tableContent...');
        const contents = JSON.parse(req.body.tableContent);
        
        // Delete old contents first
        await BlogContent.deleteMany({ blogId: blog._id });
        console.log('✅ Old contents deleted');
        
        // Insert new contents
        const contentData = contents.map((item, index) => ({
          blogId: blog._id,
          title: item.title,
          content: item.content,
          order: item.order || (index + 1)
        }));

        await BlogContent.insertMany(contentData);
        console.log('✅ New contents created:', contentData.length, 'sections');
      } catch (err) {
        console.error('❌ Table content update error:', err);
      }
    }

    // Get updated contents
    const updatedContents = await BlogContent.find({ blogId: updatedBlog._id }).sort({ order: 1 });

    res.json({
      success: true,
      message: 'Blog updated successfully',
      data: {
        ...updatedBlog._doc,
        contents: updatedContents
      }
    });

  } catch (err) {
    console.error('Update Blog Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating blog',
      error: err.message
    });
  }
};

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private (Admin)
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Delete thumbnail from Cloudinary
    if (blog.thumbnail?.public_id) {
      await cloudinary.uploader.destroy(blog.thumbnail.public_id);
    }

    // Delete images from Cloudinary
    if (blog.images && blog.images.length > 0) {
      for (const img of blog.images) {
        if (img.public_id) {
          await cloudinary.uploader.destroy(img.public_id);
        }
      }
    }

    // Delete blog content sections
    await BlogContent.deleteMany({ blogId: blog._id });

    // Delete blog
    await Blog.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });

  } catch (err) {
    console.error('Delete Blog Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting blog',
      error: err.message
    });
  }
};

// @desc    Get blogs filtered by language (with contents)
// @route   GET /api/blogs/filters/language
// @access  Public
exports.getFiltersByLanguage = async (req, res) => {
  try {
    const { languageId } = req.query;
    
    if (!languageId) {
      return res.status(400).json({
        success: false,
        message: 'languageId is required'
      });
    }

    const blogs = await Blog.find({ 
      isActive: true, 
      languageId: new mongoose.Types.ObjectId(languageId) 
    })
      .select('thumbnail title date')
      .sort({ createdAt: -1 });

    // Format response
    const formattedBlogs = blogs.map(blog => ({
      _id: blog._id,
      thumbnail: blog.thumbnail?.url || null,
      title: blog.title,
      date: blog.date
    }));

    res.json({
      success: true,
      count: formattedBlogs.length,
      data: formattedBlogs
    });

  } catch (err) {
    console.error('Get Filters By Language Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: err.message
    });
  }
};

// @desc    Get blogs filtered by paper (with contents, regardless of language)
// @route   GET /api/blogs/filters/paper
// @access  Public
exports.getFiltersByPaper = async (req, res) => {
  try {
    const { paperId } = req.query;
    
    if (!paperId) {
      return res.status(400).json({
        success: false,
        message: 'paperId is required'
      });
    }

    const blogs = await Blog.find({ 
      isActive: true, 
      paperId: new mongoose.Types.ObjectId(paperId) 
    })
      .select('thumbnail title date')
      .sort({ createdAt: -1 });

    // Format response
    const formattedBlogs = blogs.map(blog => ({
      _id: blog._id,
      thumbnail: blog.thumbnail?.url || null,
      title: blog.title,
      date: blog.date
    }));

    res.json({
      success: true,
      count: formattedBlogs.length,
      data: formattedBlogs
    });

  } catch (err) {
    console.error('Get Filters By Paper Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: err.message
    });
  }
};

// @desc    Get blog filter options (years, months, dates)
// @route   GET /api/blogs/filter-options
// @access  Public
exports.getBlogFilterOptions = async (req, res) => {
  try {
    const data = await Blog.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          years: { $addToSet: "$year" },
          months: { $addToSet: "$month" },
          dates: { $addToSet: "$date" }
        }
      }
    ]);

    const result = data[0] || { years: [], months: [], dates: [] };

    res.json({
      success: true,
      years: result.years.sort((a, b) => b - a),
      months: result.months.sort((a, b) => b - a),
      dates: result.dates.sort((a, b) => new Date(b) - new Date(a)).map(d => ({
        value: d,
        label: new Date(d).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })
      }))
    });

  } catch (err) {
    console.error('Get Filter Options Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching filter options',
      error: err.message
    });
  }
};
