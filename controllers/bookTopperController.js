const BookTopper = require('../models/BookTopper');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

// @desc    Get all active topper videos
// @route   GET /api/toppers
// @access  Public
exports.getAllToppers = async (req, res) => {
  try {
    const toppers = await BookTopper.find({ isActive: true }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: toppers.length,
      data: toppers
    });
  } catch (error) {
    console.error('Get Toppers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching toppers',
      error: error.message
    });
  }
};

// @desc    Get single topper video
// @route   GET /api/toppers/:id
// @access  Public
exports.getTopper = async (req, res) => {
  try {
    const topper = await BookTopper.findOne({ 
      _id: req.params.id,
      isActive: true 
    });

    if (!topper) {
      return res.status(404).json({
        success: false,
        message: 'Topper video not found'
      });
    }

    res.json({
      success: true,
      data: topper
    });
  } catch (error) {
    console.error('Get Topper Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching topper',
      error: error.message
    });
  }
};

// @desc    Create topper video
// @route   POST /api/toppers
// @access  Private (Super Admin & Admin)
exports.createTopper = async (req, res) => {
  try {
    const { title } = req.body;

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
    const videoResult = await uploadToCloudinary(req.file, 'books/toppers', 'video');

    // Create topper
    const topper = await BookTopper.create({
      title,
      videoUrl: videoResult.url,
      videoPublicId: videoResult.public_id,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Topper video created successfully',
      data: topper
    });
  } catch (error) {
    console.error('Create Topper Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating topper',
      error: error.message
    });
  }
};

// @desc    Update topper video
// @route   PUT /api/toppers/:id
// @access  Private (Super Admin & Admin)
exports.updateTopper = async (req, res) => {
  try {
    const { title } = req.body;

    const topper = await BookTopper.findById(req.params.id);

    if (!topper) {
      return res.status(404).json({
        success: false,
        message: 'Topper video not found'
      });
    }

    // Update fields
    if (title) topper.title = title;

    // If new video is uploaded, delete old one from Cloudinary
    if (req.file) {
      const cloudinary = require('../config/cloudinary');
      if (topper.videoPublicId) {
        await cloudinary.uploader.destroy(topper.videoPublicId, { resource_type: 'video' });
      }
      
      // Upload new video
      const videoResult = await uploadToCloudinary(req.file, 'books/toppers', 'video');
      topper.videoUrl = videoResult.url;
      topper.videoPublicId = videoResult.public_id;
    }

    await topper.save();

    res.json({
      success: true,
      message: 'Topper video updated successfully',
      data: topper
    });
  } catch (error) {
    console.error('Update Topper Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating topper',
      error: error.message
    });
  }
};

// @desc    Delete topper video (soft delete)
// @route   DELETE /api/toppers/:id
// @access  Private (Super Admin & Admin)
exports.deleteTopper = async (req, res) => {
  try {
    const topper = await BookTopper.findById(req.params.id);

    if (!topper) {
      return res.status(404).json({
        success: false,
        message: 'Topper video not found'
      });
    }

    topper.isActive = false;
    await topper.save();

    res.json({
      success: true,
      message: 'Topper video deleted successfully'
    });
  } catch (error) {
    console.error('Delete Topper Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting topper',
      error: error.message
    });
  }
};
