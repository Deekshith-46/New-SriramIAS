const TopStory = require('../models/TopStory');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

// @desc    Create top story
// @route   POST /api/top-stories
// @access  Private (Super Admin & Admin)
exports.createTopStory = async (req, res) => {
  try {
    const { title, description, authorName, date } = req.body;

    // Validate required thumbnail
    if (!req.files || !req.files['thumbnail']) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail image is required'
      });
    }

    // Upload thumbnail to Cloudinary
    const thumbnailResult = await uploadToCloudinary(
      req.files['thumbnail'][0],
      'top-stories/thumbnails'
    );

    const topStory = new TopStory({
      title,
      description,
      thumbnail: {
        url: thumbnailResult.url,
        publicId: thumbnailResult.public_id
      },
      authorName,
      date: date || new Date(),
      createdBy: req.user?._id
    });

    await topStory.save();

    res.status(201).json({
      success: true,
      message: 'Top story created successfully',
      data: topStory
    });
  } catch (error) {
    console.error('Create Top Story Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating top story',
      error: error.message
    });
  }
};

// @desc    Get all top stories
// @route   GET /api/top-stories
// @access  Public
exports.getTopStories = async (req, res) => {
  try {
    const { limit, page } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 0;

    let query = TopStory.find({ isActive: true }).sort({ createdAt: -1 });

    // Apply pagination if limit is provided
    if (limitNum > 0) {
      const skip = (pageNum - 1) * limitNum;
      query = query.skip(skip).limit(limitNum);
    }

    const topStories = await query;

    res.json({
      success: true,
      count: topStories.length,
      data: topStories
    });
  } catch (error) {
    console.error('Get Top Stories Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching top stories',
      error: error.message
    });
  }
};

// @desc    Get single top story
// @route   GET /api/top-stories/:id
// @access  Public
exports.getTopStory = async (req, res) => {
  try {
    const topStory = await TopStory.findById(req.params.id);

    if (!topStory || !topStory.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Top story not found'
      });
    }

    res.json({
      success: true,
      data: topStory
    });
  } catch (error) {
    console.error('Get Top Story Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching top story',
      error: error.message
    });
  }
};

// @desc    Update top story
// @route   PUT /api/top-stories/:id
// @access  Private (Super Admin & Admin)
exports.updateTopStory = async (req, res) => {
  try {
    const { title, description, authorName, date } = req.body;

    const topStory = await TopStory.findById(req.params.id);

    if (!topStory) {
      return res.status(404).json({
        success: false,
        message: 'Top story not found'
      });
    }

    // Update text fields
    if (title) topStory.title = title;
    if (description) topStory.description = description;
    if (authorName) topStory.authorName = authorName;
    if (date) topStory.date = date;

    // Upload new thumbnail if provided
    if (req.files && req.files['thumbnail']) {
      // Delete old image from Cloudinary
      if (topStory.thumbnail.publicId) {
        const cloudinary = require('cloudinary').v2;
        await cloudinary.uploader.destroy(topStory.thumbnail.publicId);
      }

      const thumbnailResult = await uploadToCloudinary(
        req.files['thumbnail'][0],
        'top-stories/thumbnails'
      );

      topStory.thumbnail = {
        url: thumbnailResult.url,
        publicId: thumbnailResult.public_id
      };
    }

    await topStory.save();

    res.json({
      success: true,
      message: 'Top story updated successfully',
      data: topStory
    });
  } catch (error) {
    console.error('Update Top Story Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating top story',
      error: error.message
    });
  }
};

// @desc    Delete top story (soft delete)
// @route   DELETE /api/top-stories/:id
// @access  Private (Super Admin & Admin)
exports.deleteTopStory = async (req, res) => {
  try {
    const topStory = await TopStory.findById(req.params.id);

    if (!topStory) {
      return res.status(404).json({
        success: false,
        message: 'Top story not found'
      });
    }

    // Soft delete
    topStory.isActive = false;
    await topStory.save();

    res.json({
      success: true,
      message: 'Top story deleted successfully',
      data: topStory
    });
  } catch (error) {
    console.error('Delete Top Story Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting top story',
      error: error.message
    });
  }
};
