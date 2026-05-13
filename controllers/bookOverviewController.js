const BookOverview = require('../models/BookOverview');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

// @desc    Get all active overview videos
// @route   GET /api/overviews
// @access  Public
exports.getAllOverviews = async (req, res) => {
  try {
    const overviews = await BookOverview.find({ isActive: true }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: overviews.length,
      data: overviews
    });
  } catch (error) {
    console.error('Get Overviews Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching overviews',
      error: error.message
    });
  }
};

// @desc    Get single overview video
// @route   GET /api/overviews/:id
// @access  Public
exports.getOverview = async (req, res) => {
  try {
    const overview = await BookOverview.findOne({ 
      _id: req.params.id,
      isActive: true 
    });

    if (!overview) {
      return res.status(404).json({
        success: false,
        message: 'Overview video not found'
      });
    }

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('Get Overview Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching overview',
      error: error.message
    });
  }
};

// @desc    Create overview video
// @route   POST /api/overviews
// @access  Private (Super Admin & Admin)
exports.createOverview = async (req, res) => {
  try {
    const { title, topperName, examRank } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Video file is required'
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Upload video to Cloudinary
    const videoResult = await uploadToCloudinary(req.file, 'books/overviews', 'video');

    // Create overview
    const overview = await BookOverview.create({
      title,
      videoUrl: videoResult.url,
      videoPublicId: videoResult.public_id,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Overview video created successfully',
      data: overview
    });
  } catch (error) {
    console.error('Create Overview Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating overview',
      error: error.message
    });
  }
};

// @desc    Update overview video
// @route   PUT /api/overviews/:id
// @access  Private (Super Admin & Admin)
exports.updateOverview = async (req, res) => {
  try {
    const { title } = req.body;

    const overview = await BookOverview.findById(req.params.id);

    if (!overview) {
      return res.status(404).json({
        success: false,
        message: 'Overview video not found'
      });
    }

    // Update fields
    if (title) overview.title = title;

    // If new video is uploaded, delete old one from Cloudinary
    if (req.file) {
      const cloudinary = require('../config/cloudinary');
      if (overview.videoPublicId) {
        await cloudinary.uploader.destroy(overview.videoPublicId, { resource_type: 'video' });
      }
      
      // Upload new video
      const videoResult = await uploadToCloudinary(req.file, 'books/overviews', 'video');
      overview.videoUrl = videoResult.url;
      overview.videoPublicId = videoResult.public_id;
    }

    await overview.save();

    res.json({
      success: true,
      message: 'Overview video updated successfully',
      data: overview
    });
  } catch (error) {
    console.error('Update Overview Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating overview',
      error: error.message
    });
  }
};

// @desc    Delete overview video (soft delete)
// @route   DELETE /api/overviews/:id
// @access  Private (Super Admin & Admin)
exports.deleteOverview = async (req, res) => {
  try {
    const overview = await BookOverview.findById(req.params.id);

    if (!overview) {
      return res.status(404).json({
        success: false,
        message: 'Overview video not found'
      });
    }

    overview.isActive = false;
    await overview.save();

    res.json({
      success: true,
      message: 'Overview video deleted successfully'
    });
  } catch (error) {
    console.error('Delete Overview Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting overview',
      error: error.message
    });
  }
};
