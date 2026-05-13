const HomeSection4 = require('../models/HomeSection4');
const cloudinary = require('../config/cloudinary');

// Helper function to upload to Cloudinary
const uploadToCloudinary = async (file) => {
  if (!file) return null;
  
  try {
    if (file.buffer) {
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'homepage/section4',
      });
      
      return result.secure_url;
    }
    
    if (file.path) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'homepage/section4',
      });
      
      return result.secure_url;
    }
    
    return null;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
};

// @desc    Create section 4 card
// @route   POST /api/home-section4
// @access  Private (Super Admin only)
exports.createSection4 = async (req, res) => {
  try {
    const { title, description, order } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'title and description are required'
      });
    }

    // Get image files
    const imageFiles = req.files.filter(f => f.fieldname === 'images');

    // Upload images to Cloudinary
    const imageUrls = [];
    for (const file of imageFiles) {
      const url = await uploadToCloudinary(file);
      imageUrls.push(url);
    }

    // Create card
    const card = await HomeSection4.create({
      title,
      description,
      images: imageUrls,
      order: order || 0
    });

    res.status(201).json({
      success: true,
      message: 'Section 4 card created successfully',
      data: card
    });

  } catch (err) {
    console.error('Create Section4 Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error creating section 4 card',
      error: err.message
    });
  }
};

// @desc    Get all section 4 cards
// @route   GET /api/home-section4
// @access  Public
exports.getSection4 = async (req, res) => {
  try {
    const cards = await HomeSection4.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 });

    res.json({
      success: true,
      count: cards.length,
      data: cards
    });

  } catch (err) {
    console.error('Get Section4 Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching section 4 cards',
      error: err.message
    });
  }
};

// @desc    Update section 4 card
// @route   PUT /api/home-section4/:id
// @access  Private (Super Admin only)
exports.updateSection4 = async (req, res) => {
  try {
    const card = await HomeSection4.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    const { title, description, order } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (order !== undefined) updateData.order = order;

    // Handle image updates
    const imageFiles = req.files.filter(f => f.fieldname === 'images');
    if (imageFiles.length > 0) {
      // Upload new images
      const imageUrls = [];
      for (const file of imageFiles) {
        const url = await uploadToCloudinary(file);
        imageUrls.push(url);
      }

      // Replace old images with new ones
      updateData.images = imageUrls;
    }

    const updatedCard = await HomeSection4.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Section 4 card updated successfully',
      data: updatedCard
    });

  } catch (err) {
    console.error('Update Section4 Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating section 4 card',
      error: err.message
    });
  }
};

// @desc    Delete section 4 card
// @route   DELETE /api/home-section4/:id
// @access  Private (Super Admin only)
exports.deleteSection4 = async (req, res) => {
  try {
    const card = await HomeSection4.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Delete images from Cloudinary
    if (card.images && card.images.length > 0) {
      for (const imageUrl of card.images) {
        try {
          // Extract public_id from URL
          const parts = imageUrl.split('/');
          const filename = parts[parts.length - 1];
          const publicId = filename.split('.')[0];
          await cloudinary.uploader.destroy(`homepage/section4/${publicId}`);
        } catch (err) {
          console.error('Error deleting image from Cloudinary:', err);
        }
      }
    }

    await HomeSection4.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Section 4 card deleted successfully'
    });

  } catch (err) {
    console.error('Delete Section4 Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting section 4 card',
      error: err.message
    });
  }
};

// @desc    Reorder all section 4 cards in sequence
// @route   PUT /api/home-section4/reorder
// @access  Private (Super Admin only)
exports.reorderSection4 = async (req, res) => {
  try {
    const { cardOrder } = req.body;

    // cardOrder should be an array of card IDs in the desired order
    if (!Array.isArray(cardOrder) || cardOrder.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'cardOrder array is required and cannot be empty'
      });
    }

    // Update each card's order field based on its position in the array
    const updatePromises = cardOrder.map((cardId, index) => {
      return HomeSection4.findByIdAndUpdate(
        cardId,
        { $set: { order: index } },
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    // Fetch updated cards
    const updatedCards = await HomeSection4.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 });

    res.json({
      success: true,
      message: 'Cards reordered successfully',
      count: updatedCards.length,
      data: updatedCards
    });

  } catch (err) {
    console.error('Reorder Section4 Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error reordering cards',
      error: err.message
    });
  }
};
