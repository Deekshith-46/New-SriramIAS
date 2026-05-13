const HomeTopper = require('../models/HomeTopper');
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
        folder: 'homepage/toppers',
      });
      
      return result.secure_url;
    }
    
    // For file path (if using disk storage)
    if (file.path) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'homepage/toppers',
      });
      
      return result.secure_url;
    }
    
    return null;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
};

// @desc    Create a new topper
// @route   POST /api/homepage/toppers
// @access  Private (Super Admin)
exports.createTopper = async (req, res) => {
  try {
    const { name, rank, description } = req.body;

    if (!name || !rank) {
      return res.status(400).json({
        success: false,
        message: 'name and rank are required'
      });
    }

    // Upload image file to Cloudinary
    const imageFile = req.files.find(f => f.fieldname === 'image');
    let imageUrl = null;
    
    if (imageFile) {
      imageUrl = await uploadToCloudinary(imageFile);
    }

    const topper = await HomeTopper.create({
      image: imageUrl,
      name,
      rank,
      description: description || ''
    });

    res.status(201).json({
      success: true,
      message: 'Topper created successfully',
      data: topper
    });

  } catch (err) {
    console.error('Create Topper Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating topper',
      error: err.message 
    });
  }
};

// @desc    Get all active toppers
// @route   GET /api/homepage/toppers
// @access  Public
exports.getToppers = async (req, res) => {
  try {
    const toppers = await HomeTopper.find({ isActive: true })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: toppers.length,
      data: toppers
    });

  } catch (err) {
    console.error('Get Toppers Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching toppers',
      error: err.message 
    });
  }
};

// @desc    Update topper
// @route   PUT /api/homepage/toppers/:id
// @access  Private (Super Admin)
exports.updateTopper = async (req, res) => {
  try {
    const topper = await HomeTopper.findById(req.params.id);

    if (!topper) {
      return res.status(404).json({
        success: false,
        message: 'Topper not found'
      });
    }

    const updateData = {};

    // Update fields if provided
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.rank) updateData.rank = req.body.rank;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    // Upload new image if file provided
    const imageFile = req.files.find(f => f.fieldname === 'image');
    if (imageFile) {
      updateData.image = await uploadToCloudinary(imageFile);
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data provided for update'
      });
    }

    const updatedTopper = await HomeTopper.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Topper updated successfully',
      data: updatedTopper
    });

  } catch (err) {
    console.error('Update Topper Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating topper',
      error: err.message 
    });
  }
};

// @desc    Delete topper
// @route   DELETE /api/homepage/toppers/:id
// @access  Private (Super Admin)
exports.deleteTopper = async (req, res) => {
  try {
    const topper = await HomeTopper.findById(req.params.id);

    if (!topper) {
      return res.status(404).json({
        success: false,
        message: 'Topper not found'
      });
    }

    // Delete image from Cloudinary
    if (topper.image) {
      try {
        // Extract public_id from URL
        const parts = topper.image.split('/');
        const filename = parts[parts.length - 1];
        const publicId = filename.split('.')[0];
        await cloudinary.uploader.destroy(`homepage/toppers/${publicId}`);
      } catch (err) {
        console.error('Error deleting image from Cloudinary:', err);
      }
    }

    await HomeTopper.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Topper deleted successfully'
    });

  } catch (err) {
    console.error('Delete Topper Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting topper',
      error: err.message 
    });
  }
};
