const FeaturedArticle = require('../models/FeaturedArticle');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

// @desc    Create featured article
// @route   POST /api/featured-articles
// @access  Private (Super Admin & Admin)
exports.createFeaturedArticle = async (req, res) => {
  try {
    const { title, description, authorName, date } = req.body;

    // Validate required images
    if (!req.files || !req.files['mainImage'] || !req.files['secondaryImage']) {
      return res.status(400).json({
        success: false,
        message: 'Both main image and secondary image are required'
      });
    }

    // Upload main image to Cloudinary
    const mainImageResult = await uploadToCloudinary(
      req.files['mainImage'][0],
      'featured-articles/main'
    );

    // Upload secondary image to Cloudinary
    const secondaryImageResult = await uploadToCloudinary(
      req.files['secondaryImage'][0],
      'featured-articles/secondary'
    );

    const featuredArticle = new FeaturedArticle({
      title,
      description,
      mainImage: {
        url: mainImageResult.url,
        publicId: mainImageResult.public_id
      },
      secondaryImage: {
        url: secondaryImageResult.url,
        publicId: secondaryImageResult.public_id
      },
      authorName,
      date: date || new Date(),
      createdBy: req.user?._id
    });

    await featuredArticle.save();

    res.status(201).json({
      success: true,
      message: 'Featured article created successfully',
      data: featuredArticle
    });
  } catch (error) {
    console.error('Create Featured Article Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating featured article',
      error: error.message
    });
  }
};

// @desc    Get all featured articles
// @route   GET /api/featured-articles
// @access  Public
exports.getFeaturedArticles = async (req, res) => {
  try {
    const { limit, page } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 0;

    let query = FeaturedArticle.find({ isActive: true }).sort({ createdAt: -1 });

    // Apply pagination if limit is provided
    if (limitNum > 0) {
      const skip = (pageNum - 1) * limitNum;
      query = query.skip(skip).limit(limitNum);
    }

    const featuredArticles = await query;

    res.json({
      success: true,
      count: featuredArticles.length,
      data: featuredArticles
    });
  } catch (error) {
    console.error('Get Featured Articles Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching featured articles',
      error: error.message
    });
  }
};

// @desc    Get single featured article
// @route   GET /api/featured-articles/:id
// @access  Public
exports.getFeaturedArticle = async (req, res) => {
  try {
    const featuredArticle = await FeaturedArticle.findById(req.params.id);

    if (!featuredArticle || !featuredArticle.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Featured article not found'
      });
    }

    res.json({
      success: true,
      data: featuredArticle
    });
  } catch (error) {
    console.error('Get Featured Article Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching featured article',
      error: error.message
    });
  }
};

// @desc    Update featured article
// @route   PUT /api/featured-articles/:id
// @access  Private (Super Admin & Admin)
exports.updateFeaturedArticle = async (req, res) => {
  try {
    const { title, description, authorName, date } = req.body;

    const featuredArticle = await FeaturedArticle.findById(req.params.id);

    if (!featuredArticle) {
      return res.status(404).json({
        success: false,
        message: 'Featured article not found'
      });
    }

    // Update text fields
    if (title) featuredArticle.title = title;
    if (description) featuredArticle.description = description;
    if (authorName) featuredArticle.authorName = authorName;
    if (date) featuredArticle.date = date;

    // Upload new main image if provided
    if (req.files && req.files['mainImage']) {
      // Delete old image from Cloudinary
      if (featuredArticle.mainImage.publicId) {
        const cloudinary = require('cloudinary').v2;
        await cloudinary.uploader.destroy(featuredArticle.mainImage.publicId);
      }

      const mainImageResult = await uploadToCloudinary(
        req.files['mainImage'][0],
        'featured-articles/main'
      );

      featuredArticle.mainImage = {
        url: mainImageResult.url,
        publicId: mainImageResult.public_id
      };
    }

    // Upload new secondary image if provided
    if (req.files && req.files['secondaryImage']) {
      // Delete old image from Cloudinary
      if (featuredArticle.secondaryImage.publicId) {
        const cloudinary = require('cloudinary').v2;
        await cloudinary.uploader.destroy(featuredArticle.secondaryImage.publicId);
      }

      const secondaryImageResult = await uploadToCloudinary(
        req.files['secondaryImage'][0],
        'featured-articles/secondary'
      );

      featuredArticle.secondaryImage = {
        url: secondaryImageResult.url,
        publicId: secondaryImageResult.public_id
      };
    }

    await featuredArticle.save();

    res.json({
      success: true,
      message: 'Featured article updated successfully',
      data: featuredArticle
    });
  } catch (error) {
    console.error('Update Featured Article Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating featured article',
      error: error.message
    });
  }
};

// @desc    Delete featured article (soft delete)
// @route   DELETE /api/featured-articles/:id
// @access  Private (Super Admin & Admin)
exports.deleteFeaturedArticle = async (req, res) => {
  try {
    const featuredArticle = await FeaturedArticle.findById(req.params.id);

    if (!featuredArticle) {
      return res.status(404).json({
        success: false,
        message: 'Featured article not found'
      });
    }

    // Soft delete
    featuredArticle.isActive = false;
    await featuredArticle.save();

    res.json({
      success: true,
      message: 'Featured article deleted successfully',
      data: featuredArticle
    });
  } catch (error) {
    console.error('Delete Featured Article Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting featured article',
      error: error.message
    });
  }
};
