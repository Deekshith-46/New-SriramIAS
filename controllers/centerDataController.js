const Center = require('../models/Center');
const CenterData = require('../models/CenterData');
const Gallery = require('../models/Gallery');
const SuccessStory = require('../models/SuccessStory');
const Faculty = require('../models/Faculty');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const cloudinary = require('../config/cloudinary');

// Helper function to delete image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
    }
  }
};

// Helper function to get complete center data
const getCompleteCenterData = async (centerId) => {
  const center = await Center.findById(centerId).select('-__v');
  
  if (!center) {
    return null;
  }

  const centerData = await CenterData.findOne({ center: centerId }).select('-__v');
  const gallery = await Gallery.findOne({ center: centerId });
  const successStories = await SuccessStory.find({ center: centerId }).sort({ createdAt: -1 });
  const faculty = await Faculty.find({ center: centerId }).sort({ createdAt: -1 });

  return {
    center,
    centerData: centerData || null,
    gallery: gallery || { images: [] },
    successStories,
    faculty
  };
};

// ==========================================
// CENTER DATA MODULE (CRUD)
// ==========================================

// @desc    Create center data
// @route   POST /api/centers
// @access  Private (Super Admin)
exports.createCenter = async (req, res) => {
  try {
    const { centerId, title, phone, email } = req.body;

    // Validate required fields
    if (!centerId || !title || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'Center ID, title, phone, and email are required'
      });
    }

    // Check if center exists
    const center = await Center.findById(centerId);
    if (!center) {
      return res.status(404).json({
        success: false,
        message: 'Center not found'
      });
    }

    // Check if center data already exists
    const existingCenterData = await CenterData.findOne({ 
      $or: [
        { center: centerId },
        { email }
      ]
    });

    if (existingCenterData) {
      return res.status(400).json({
        success: false,
        message: 'Center data already exists for this center or email'
      });
    }

    // Check if thumbnail is uploaded
    if (!req.files || !req.files.thumbnail) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail image is required'
      });
    }

    // Upload thumbnail to Cloudinary
    const thumbnailResult = await uploadToCloudinary(
      req.files.thumbnail[0],
      'centers/thumbnails'
    );

    // Create center data
    const centerData = await CenterData.create({
      center: centerId,
      title,
      phone,
      email,
      thumbnail: {
        url: thumbnailResult.url,
        public_id: thumbnailResult.public_id
      },
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Center data created successfully',
      data: centerData
    });
  } catch (error) {
    console.error('Create Center Data Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating center data',
      error: error.message
    });
  }
};

// @desc    Get all centers with data (list view)
// @route   GET /api/centers
// @access  Public
exports.getAllCenters = async (req, res) => {
  try {
    const centersData = await CenterData.find({ isActive: true })
      .populate('center', 'name')
      .select('-__v')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: centersData.length,
      data: centersData
    });
  } catch (error) {
    console.error('Get Centers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching centers',
      error: error.message
    });
  }
};

// @desc    Get complete center data
// @route   GET /api/centers/:id
// @access  Public
exports.getCenterCompleteData = async (req, res) => {
  try {
    const centerId = req.params.id;
    const completeData = await getCompleteCenterData(centerId);

    if (!completeData) {
      return res.status(404).json({
        success: false,
        message: 'Center not found'
      });
    }

    res.status(200).json({
      success: true,
      data: completeData
    });
  } catch (error) {
    console.error('Get Center Data Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching center data',
      error: error.message
    });
  }
};

// @desc    Update center data
// @route   PUT /api/centers/:id
// @access  Private (Super Admin)
exports.updateCenter = async (req, res) => {
  try {
    const centerData = await CenterData.findOne({ center: req.params.id });

    if (!centerData) {
      return res.status(404).json({
        success: false,
        message: 'Center data not found'
      });
    }

    const updates = { ...req.body };

    // Handle thumbnail update if provided
    if (req.files && req.files.thumbnail) {
      await deleteFromCloudinary(centerData.thumbnail.public_id);
      
      const thumbnailResult = await uploadToCloudinary(
        req.files.thumbnail[0],
        'centers/thumbnails'
      );
      
      updates.thumbnail = {
        url: thumbnailResult.url,
        public_id: thumbnailResult.public_id
      };
    }

    const updatedCenterData = await CenterData.findOneAndUpdate(
      { center: req.params.id },
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Center data updated successfully',
      data: updatedCenterData
    });
  } catch (error) {
    console.error('Update Center Data Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating center data',
      error: error.message
    });
  }
};

// @desc    Delete center data (cascade delete)
// @route   DELETE /api/centers/:id
// @access  Private (Super Admin)
exports.deleteCenter = async (req, res) => {
  try {
    const centerData = await CenterData.findOne({ center: req.params.id });

    if (!centerData) {
      return res.status(404).json({
        success: false,
        message: 'Center data not found'
      });
    }

    // Delete center thumbnail
    await deleteFromCloudinary(centerData.thumbnail.public_id);

    // Delete gallery images
    const gallery = await Gallery.findOne({ center: req.params.id });
    if (gallery) {
      for (let img of gallery.images) {
        await deleteFromCloudinary(img.public_id);
      }
      await Gallery.deleteOne({ center: req.params.id });
    }

    // Delete success stories
    const successStories = await SuccessStory.find({ center: req.params.id });
    for (let story of successStories) {
      await deleteFromCloudinary(story.thumbnail.public_id);
    }
    await SuccessStory.deleteMany({ center: req.params.id });

    // Delete faculty
    const faculty = await Faculty.find({ center: req.params.id });
    for (let member of faculty) {
      await deleteFromCloudinary(member.image.public_id);
    }
    await Faculty.deleteMany({ center: req.params.id });

    // Delete center data
    await CenterData.findOneAndDelete({ center: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Center and all related data deleted successfully'
    });
  } catch (error) {
    console.error('Delete Center Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting center',
      error: error.message
    });
  }
};

// ==========================================
// GALLERY MODULE (CRUD)
// ==========================================

// @desc    Update gallery
// @route   POST /api/centers/:id/gallery
// @access  Private (Super Admin, Center Admin)
exports.updateGallery = async (req, res) => {
  try {
    const centerData = await CenterData.findOne({ center: req.params.id });

    if (!centerData) {
      return res.status(404).json({
        success: false,
        message: 'Center data not found'
      });
    }

    if (!req.files || !req.files.images || req.files.images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one image is required'
      });
    }

    if (req.files.images.length > 6) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 6 images allowed in gallery'
      });
    }

    let gallery = await Gallery.findOne({ center: req.params.id });

    // Delete old images
    if (gallery && gallery.images.length > 0) {
      for (let img of gallery.images) {
        await deleteFromCloudinary(img.public_id);
      }
    }

    // Upload new images
    const uploadPromises = req.files.images.map(file =>
      uploadToCloudinary(file, 'centers/gallery')
    );
    const uploadedImages = await Promise.all(uploadPromises);

    const imagesData = uploadedImages.map(result => ({
      url: result.url,
      public_id: result.public_id
    }));

    gallery = await Gallery.findOneAndUpdate(
      { center: req.params.id },
      { center: req.params.id, images: imagesData },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Gallery updated successfully',
      data: gallery
    });
  } catch (error) {
    console.error('Update Gallery Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating gallery',
      error: error.message
    });
  }
};

// @desc    Delete gallery image
// @route   DELETE /api/centers/:id/gallery/:imageId
// @access  Private (Super Admin, Center Admin)
exports.deleteGalleryImage = async (req, res) => {
  try {
    const gallery = await Gallery.findOne({ center: req.params.id });

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: 'Gallery not found'
      });
    }

    const imageIndex = gallery.images.findIndex(
      img => img.public_id === req.params.imageId || img._id.toString() === req.params.imageId
    );

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    const image = gallery.images[imageIndex];
    await deleteFromCloudinary(image.public_id);

    gallery.images.splice(imageIndex, 1);
    await gallery.save();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: gallery
    });
  } catch (error) {
    console.error('Delete Gallery Image Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image',
      error: error.message
    });
  }
};

// ==========================================
// SUCCESS STORIES MODULE (CRUD)
// ==========================================

// @desc    Create success story
// @route   POST /api/centers/:id/success-stories
// @access  Private (Super Admin, Center Admin, Employee)
exports.createSuccessStory = async (req, res) => {
  try {
    const { name, rank } = req.body;

    if (!name || !rank) {
      return res.status(400).json({
        success: false,
        message: 'Name and rank are required'
      });
    }

    if (!req.files || !req.files.thumbnail) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail image is required'
      });
    }

    const thumbnailResult = await uploadToCloudinary(
      req.files.thumbnail[0],
      'centers/success-stories'
    );

    const story = await SuccessStory.create({
      center: req.params.id,
      name,
      rank,
      thumbnail: {
        url: thumbnailResult.url,
        public_id: thumbnailResult.public_id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Success story created successfully',
      data: story
    });
  } catch (error) {
    console.error('Create Success Story Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating success story',
      error: error.message
    });
  }
};

// @desc    Update success story
// @route   PUT /api/centers/:id/success-stories/:storyId
// @access  Private (Super Admin, Center Admin, Employee)
exports.updateSuccessStory = async (req, res) => {
  try {
    const story = await SuccessStory.findOne({
      _id: req.params.storyId,
      center: req.params.id
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Success story not found'
      });
    }

    const updates = { ...req.body };

    if (req.files && req.files.thumbnail) {
      await deleteFromCloudinary(story.thumbnail.public_id);
      
      const thumbnailResult = await uploadToCloudinary(
        req.files.thumbnail[0],
        'centers/success-stories'
      );
      
      updates.thumbnail = {
        url: thumbnailResult.url,
        public_id: thumbnailResult.public_id
      };
    }

    const updatedStory = await SuccessStory.findByIdAndUpdate(
      req.params.storyId,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Success story updated successfully',
      data: updatedStory
    });
  } catch (error) {
    console.error('Update Success Story Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating success story',
      error: error.message
    });
  }
};

// @desc    Delete success story
// @route   DELETE /api/centers/:id/success-stories/:storyId
// @access  Private (Super Admin, Center Admin, Employee)
exports.deleteSuccessStory = async (req, res) => {
  try {
    const story = await SuccessStory.findOne({
      _id: req.params.storyId,
      center: req.params.id
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Success story not found'
      });
    }

    await deleteFromCloudinary(story.thumbnail.public_id);
    await SuccessStory.findByIdAndDelete(req.params.storyId);

    res.status(200).json({
      success: true,
      message: 'Success story deleted successfully'
    });
  } catch (error) {
    console.error('Delete Success Story Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting success story',
      error: error.message
    });
  }
};

// ==========================================
// FACULTY MODULE (CRUD)
// ==========================================

// @desc    Create faculty
// @route   POST /api/centers/:id/faculty
// @access  Private (Super Admin, Center Admin, Employee)
exports.createFaculty = async (req, res) => {
  try {
    const { name, title, description } = req.body;

    if (!name || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Name, title, and description are required'
      });
    }

    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: 'Faculty image is required'
      });
    }

    const imageResult = await uploadToCloudinary(
      req.files.image[0],
      'centers/faculty'
    );

    const faculty = await Faculty.create({
      center: req.params.id,
      name,
      title,
      description,
      image: {
        url: imageResult.url,
        public_id: imageResult.public_id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Faculty member created successfully',
      data: faculty
    });
  } catch (error) {
    console.error('Create Faculty Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating faculty member',
      error: error.message
    });
  }
};

// @desc    Update faculty
// @route   PUT /api/centers/:id/faculty/:facultyId
// @access  Private (Super Admin, Center Admin, Employee)
exports.updateFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findOne({
      _id: req.params.facultyId,
      center: req.params.id
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty member not found'
      });
    }

    const updates = { ...req.body };

    if (req.files && req.files.image) {
      await deleteFromCloudinary(faculty.image.public_id);
      
      const imageResult = await uploadToCloudinary(
        req.files.image[0],
        'centers/faculty'
      );
      
      updates.image = {
        url: imageResult.url,
        public_id: imageResult.public_id
      };
    }

    const updatedFaculty = await Faculty.findByIdAndUpdate(
      req.params.facultyId,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Faculty member updated successfully',
      data: updatedFaculty
    });
  } catch (error) {
    console.error('Update Faculty Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating faculty member',
      error: error.message
    });
  }
};

// @desc    Delete faculty
// @route   DELETE /api/centers/:id/faculty/:facultyId
// @access  Private (Super Admin, Center Admin, Employee)
exports.deleteFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findOne({
      _id: req.params.facultyId,
      center: req.params.id
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty member not found'
      });
    }

    await deleteFromCloudinary(faculty.image.public_id);
    await Faculty.findByIdAndDelete(req.params.facultyId);

    res.status(200).json({
      success: true,
      message: 'Faculty member deleted successfully'
    });
  } catch (error) {
    console.error('Delete Faculty Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting faculty member',
      error: error.message
    });
  }
};
