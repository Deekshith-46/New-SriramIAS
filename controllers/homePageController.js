const HomePage = require('../models/HomePage');
const HomeVideo = require('../models/HomeVideo');
const HomeSection4 = require('../models/HomeSection4');
const HomeTopper = require('../models/HomeTopper');
const Course = require('../models/Course');
const Book = require('../models/Book');
const cloudinary = require('../config/cloudinary');

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file) => {
  if (!file) return null;
  
  try {
    // For multer memory storage, file is in buffer
    if (file.buffer) {
      // Convert buffer to base64
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'homepage',
      });
      
      return result.secure_url;
    }
    
    // For file path (if using disk storage)
    if (file.path) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'homepage',
      });
      
      return result.secure_url;
    }
    
    return null;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
};

// @desc    Save/Update HomePage (Create if not exists, else update)
// @route   POST /api/homepage
// @access  Private (Super Admin only)
exports.saveHomePage = async (req, res) => {
  try {
    const data = {};

    // Parse section data from req.body
    // Section 1: Toppers (Title & Subtitle only)
    if (req.body.section1_title || req.body.section1_subTitle) {
      data.section1 = {};
      if (req.body.section1_title) data.section1.title = req.body.section1_title;
      if (req.body.section1_subTitle) data.section1.subTitle = req.body.section1_subTitle;
    }

    // Section 2: Learning Sections (Title only)
    if (req.body.section2_title) {
      data.section2 = {
        title: req.body.section2_title
      };
    }

    // Check if any data to update
    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data provided to update'
      });
    }

    // Find existing homepage or create new
    let home = await HomePage.findOne();

    if (home) {
      // Update existing document using $set
      home = await HomePage.findByIdAndUpdate(
        home._id,
        { $set: data },
        { new: true, runValidators: true }
      );
      
      res.json({
        success: true,
        message: 'HomePage updated successfully',
        data: home
      });
    } else {
      // Create new document
      home = await HomePage.create(data);
      
      res.status(201).json({
        success: true,
        message: 'HomePage created successfully',
        data: home
      });
    }
  } catch (err) {
    console.error('Save HomePage Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error saving HomePage',
      error: err.message 
    });
  }
};

// @desc    Get HomePage data
// @route   GET /api/homepage
// @access  Public
exports.getHomePage = async (req, res) => {
  try {
    const home = await HomePage.findOne();

    if (!home) {
      return res.status(404).json({
        success: false,
        message: 'HomePage not configured yet'
      });
    }

    // Get toppers from HomeTopper collection
    const toppers = await HomeTopper.find({ isActive: true })
      .sort({ createdAt: -1 });

    // Get section2 cards from HomeSection4 collection
    const section2Cards = await HomeSection4.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 });

    // Get videos from HomeVideo collection (for section3)
    const videos = await HomeVideo.find().sort({ createdAt: -1 });

    // Get courses grouped by category
    const courses = await Course.find({ isActive: true })
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    // Group courses by category
    const groupedCourses = {};

    courses.forEach(course => {
      const categoryName = course.category?.name || 'Uncategorized';

      if (!groupedCourses[categoryName]) {
        groupedCourses[categoryName] = [];
      }

      groupedCourses[categoryName].push({
        _id: course._id,
        title: course.title,
        bannerImage: course.keyFeatures?.[0]?.image || null
      });
    });

    // Convert to frontend format
    const courseSection = {
      title: 'EXPLORE OUR COURSES',
      categories: Object.keys(groupedCourses).map(category => ({
        name: category,
        courses: groupedCourses[category]
      }))
    };

    // Get books for homepage
    const books = await Book.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(10);

    // Format books with required fields
    const formattedBooks = books.map(book => ({
      _id: book._id,
      image: book.image?.url || null,
      title: book.title,
      discountedPrice: book.discountedPrice,
      summary: book.summary?.substring(0, 100) || ''
    }));

    // Books section for homepage
    const bookSection = {
      title: 'BUY OUR BOOKS',
      books: formattedBooks
    };

    // Convert to plain object and add dynamic sections
    const homeData = home.toObject();
    
    // Add section1 with toppers
    homeData.section1 = {
      title: homeData.section1?.title || 'OUR TOPPERS',
      subTitle: homeData.section1?.subTitle || 'Celebrating Success Stories',
      toppers: toppers
    };

    // Add section2 with cards
    homeData.section2 = {
      title: homeData.section2?.title || 'OUR LEARNING PROGRAMS',
      cards: section2Cards
    };

    // Add section3 with videos
    homeData.section3 = {
      videos: videos.map(video => ({
        _id: video._id,
        videoUrl: video.videoUrl,
        videoThumbnail: video.videoThumbnail
      }))
    };

    // Add sectionCourses with grouped courses by category
    homeData.sectionCourses = courseSection;

    // Add sectionBooks with formatted books
    homeData.sectionBooks = bookSection;

    res.json({
      success: true,
      data: homeData
    });
  } catch (err) {
    console.error('Get HomePage Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching HomePage',
      error: err.message 
    });
  }
};

// @desc    Delete a specific section from HomePage
// @route   DELETE /api/homepage/section/:sectionName
// @access  Private (Super Admin only)
exports.deleteSection = async (req, res) => {
  try {
    const { sectionName } = req.params;

    // Validate section name format (must be section followed by number)
    const sectionPattern = /^section\d+$/;
    if (!sectionPattern.test(sectionName)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section name. Format should be: section1, section2, section3, etc.'
      });
    }

    // Find homepage
    const home = await HomePage.findOne();
    if (!home) {
      return res.status(404).json({
        success: false,
        message: 'HomePage not found'
      });
    }

    // Check if section exists
    if (!home[sectionName]) {
      return res.status(404).json({
        success: false,
        message: `${sectionName} does not exist`
      });
    }

    // Delete the section
    await HomePage.findByIdAndUpdate(
      home._id,
      { $unset: { [sectionName]: 1 } },
      { new: true }
    );

    res.json({
      success: true,
      message: `${sectionName} deleted successfully`
    });

  } catch (err) {
    console.error('Delete Section Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting section',
      error: err.message 
    });
  }
};
