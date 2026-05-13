const HomeVideo = require('../models/HomeVideo');
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
        folder: 'home-videos',
      });
      
      return result.secure_url;
    }
    
    // For file path (if using disk storage)
    if (file.path) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'home-videos',
      });
      
      return result.secure_url;
    }
    
    return null;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
};

// @desc    Add a new video
// @route   POST /api/home-videos
// @access  Private (Super Admin)
exports.addVideo = async (req, res) => {
  try {
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'videoUrl is required'
      });
    }

    // Upload thumbnail file to Cloudinary
    const thumbnailFile = req.files.find(f => f.fieldname === 'videoThumbnail');
    if (!thumbnailFile) {
      return res.status(400).json({
        success: false,
        message: 'videoThumbnail file is required'
      });
    }

    const videoThumbnail = await uploadToCloudinary(thumbnailFile);

    const video = await HomeVideo.create({
      videoUrl,
      videoThumbnail
    });

    res.status(201).json({
      success: true,
      message: 'Video added successfully',
      data: video
    });

  } catch (err) {
    console.error('Add Video Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding video',
      error: err.message 
    });
  }
};

// @desc    Get all videos
// @route   GET /api/home-videos
// @access  Public
exports.getVideos = async (req, res) => {
  try {
    const videos = await HomeVideo.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: videos.length,
      data: videos
    });

  } catch (err) {
    console.error('Get Videos Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching videos',
      error: err.message 
    });
  }
};

// @desc    Update video
// @route   PUT /api/home-videos/:id
// @access  Private (Super Admin)
exports.updateVideo = async (req, res) => {
  try {
    const updateData = {};

    // Update videoUrl if provided
    if (req.body.videoUrl) {
      updateData.videoUrl = req.body.videoUrl;
    }

    // Upload new thumbnail if file provided
    const thumbnailFile = req.files.find(f => f.fieldname === 'videoThumbnail');
    if (thumbnailFile) {
      updateData.videoThumbnail = await uploadToCloudinary(thumbnailFile);
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data provided for update'
      });
    }

    const video = await HomeVideo.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    res.json({
      success: true,
      message: 'Video updated successfully',
      data: video
    });

  } catch (err) {
    console.error('Update Video Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating video',
      error: err.message 
    });
  }
};

// @desc    Delete video
// @route   DELETE /api/home-videos/:id
// @access  Private (Super Admin)
exports.deleteVideo = async (req, res) => {
  try {
    const video = await HomeVideo.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    await HomeVideo.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });

  } catch (err) {
    console.error('Delete Video Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting video',
      error: err.message 
    });
  }
};
