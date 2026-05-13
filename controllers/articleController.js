const Article = require('../models/Article');
const BlogCategory = require('../models/BlogCategory');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

// @desc    Create a new article
// @route   POST /api/blog/articles
// @access  Private (Admin)
exports.createArticle = async (req, res) => {
  try {
    const { title, description, content, categoryId } = req.body;

    // Check if category exists and is active
    const category = await BlogCategory.findById(categoryId);
    if (!category || !category.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive category'
      });
    }

    // Upload thumbnail to Cloudinary
    let thumbnail = {};
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
      thumbnail = await uploadToCloudinary(req.files.thumbnail[0], 'blog/thumbnails');
    }

    // Upload article images to Cloudinary (max 5)
    let images = [];
    if (req.files && req.files.images) {
      if (req.files.images.length > 5) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 5 images allowed per article'
        });
      }
      
      const uploadPromises = req.files.images.map(file => 
        uploadToCloudinary(file, 'blog/articles')
      );
      images = await Promise.all(uploadPromises);
    }

    const article = new Article({
      title,
      description,
      content,
      categoryId,
      thumbnail,
      images,
      author: req.user?._id
    });

    await article.save();

    // Populate category for response
    const populatedArticle = await Article.findById(article._id)
      .populate('categoryId', 'name slug');

    // Only include full author details for super admin
    let responseArticle = populatedArticle.toObject();
    if (req.user.role === 'super_admin') {
      await populatedArticle.populate('author', 'name email');
      responseArticle = populatedArticle.toObject();
    } else {
      // For other users, don't include author details
      responseArticle.author = undefined;
    }

    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      data: responseArticle
    });
  } catch (error) {
    console.error('Create Article Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating article',
      error: error.message
    });
  }
};

// @desc    Get all articles with filters, search & pagination
// @route   GET /api/blog/articles
// @access  Public
exports.getArticles = async (req, res) => {
  try {
    const { page = 1, limit = 10, categoryId, search, isActive, sort = 'latest' } = req.query;

    let filter = { isActive: true }; // Default to active only
    
    // Filter by active status (only if explicitly set to false)
    if (isActive === 'false') {
      filter.isActive = false;
    } else if (isActive === 'all') {
      delete filter.isActive; // Allow admin to see all
    }

    // Filter by category
    if (categoryId) {
      filter.categoryId = categoryId;
    }

    // Search using text index (faster than regex)
    if (search) {
      filter.$text = { $search: search };
    }

    // Sorting options
    let sortOption = { createdAt: -1 }; // Default: latest
    if (sort === 'popular') {
      sortOption = { views: -1 };
    } else if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    }

    const articles = await Article.find(filter)
      .populate('categoryId', 'name slug')
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Article.countDocuments(filter);

    // Only include full author details for super admin
    let responseArticles = articles.map(article => {
      const articleObj = article.toObject();
      if (req.user && req.user.role === 'super_admin') {
        return articleObj;
      } else {
        delete articleObj.author;
        return articleObj;
      }
    });

    // If super admin, populate author details
    if (req.user && req.user.role === 'super_admin') {
      await Article.populate(responseArticles, { path: 'author', select: 'name email' });
    }

    res.json({
      success: true,
      count: articles.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: responseArticles
    });
  } catch (error) {
    console.error('Get Articles Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching articles',
      error: error.message
    });
  }
};

// @desc    Get recent 6 articles
// @route   GET /api/blog/articles/recent
// @access  Public
exports.getRecentArticles = async (req, res) => {
  try {
    const articles = await Article.find({ isActive: true })
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 })
      .limit(6);

    // Don't include author details for recent articles (public endpoint)
    const responseArticles = articles.map(article => {
      const articleObj = article.toObject();
      delete articleObj.author;
      return articleObj;
    });

    res.json({
      success: true,
      count: articles.length,
      data: responseArticles
    });
  } catch (error) {
    console.error('Get Recent Articles Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching recent articles',
      error: error.message
    });
  }
};

// @desc    Get single article by ID or slug
// @route   GET /api/blog/articles/:id
// @access  Public
exports.getArticleById = async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find by ID or slug
    let article = await Article.findOne({ 
      $or: [
        { _id: id },
        { slug: id }
      ],
      isActive: true 
    })
      .populate('categoryId', 'name slug');

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Increment views
    await article.incrementViews();

    // Fetch again to get updated views
    article = await Article.findById(article._id)
      .populate('categoryId', 'name slug');

    // Only include full author details for super admin
    let responseArticle = article.toObject();
    if (req.user && req.user.role === 'super_admin') {
      await article.populate('author', 'name email');
      responseArticle = article.toObject();
    } else {
      // For public/other users, don't include author details
      delete responseArticle.author;
    }

    res.json({
      success: true,
      data: responseArticle
    });
  } catch (error) {
    console.error('Get Article Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching article',
      error: error.message
    });
  }
};

// @desc    Update article
// @route   PUT /api/blog/articles/:id
// @access  Private (Admin)
exports.updateArticle = async (req, res) => {
  try {
    const { title, description, content, categoryId, removeThumbnail, removeImages } = req.body;

    let article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Validate category if changed
    if (categoryId) {
      const category = await BlogCategory.findById(categoryId);
      if (!category || !category.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive category'
        });
      }
      article.categoryId = categoryId;
    }

    // Update text fields
    if (title) article.title = title;
    if (description !== undefined) article.description = description;
    if (content) article.content = content;

    // Remove thumbnail if requested
    if (removeThumbnail === 'true') {
      article.thumbnail = {};
    }

    // Upload new thumbnail if provided
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
      article.thumbnail = await uploadToCloudinary(req.files.thumbnail[0], 'blog/thumbnails');
    }

    // Remove specific images if requested
    if (removeImages) {
      const indexesToRemove = removeImages.split(',').map(i => parseInt(i));
      article.images = article.images.filter((_, index) => !indexesToRemove.includes(index));
    }

    // Upload new images if provided
    if (req.files && req.files.images) {
      const totalImages = article.images.length + req.files.images.length;
      if (totalImages > 5) {
        return res.status(400).json({
          success: false,
          message: `Maximum 5 images allowed. You currently have ${article.images.length} and are trying to add ${req.files.images.length} more.`
        });
      }

      const uploadPromises = req.files.images.map(file => 
        uploadToCloudinary(file, 'blog/articles')
      );
      const newImages = await Promise.all(uploadPromises);
      article.images = [...article.images, ...newImages];
    }

    await article.save();

    // Populate for response
    article = await Article.findById(article._id)
      .populate('categoryId', 'name slug');

    // Only include full author details for super admin
    let responseArticle = article.toObject();
    if (req.user.role === 'super_admin') {
      await article.populate('author', 'name email');
      responseArticle = article.toObject();
    } else {
      // For center admin, don't include author details
      responseArticle.author = undefined;
    }

    res.json({
      success: true,
      message: 'Article updated successfully',
      data: responseArticle
    });
  } catch (error) {
    console.error('Update Article Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating article',
      error: error.message
    });
  }
};

// @desc    Delete article (soft delete)
// @route   DELETE /api/blog/articles/:id
// @access  Private (Admin)
exports.deleteArticle = async (req, res) => {
  try {
    let article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Soft delete
    article.isActive = false;
    await article.save();

    res.json({
      success: true,
      message: 'Article deleted successfully',
      data: article
    });
  } catch (error) {
    console.error('Delete Article Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting article',
      error: error.message
    });
  }
};