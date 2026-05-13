const TestContent = require('../models/TestContent');
const TestCategory = require('../models/TestCategory');
const cloudinary = require('../config/cloudinary');
const mongoose = require('mongoose');

// @desc    Create content
// @route   POST /api/test-contents
// @access  Private (Super Admin, Center Admin)
exports.createContent = async (req, res) => {
  try {
    const { categoryId, title, year, month, description } = req.body;

    if (!categoryId || !title || !year) {
      return res.status(400).json({
        success: false,
        message: 'Category ID, title, and year are required'
      });
    }

    // Verify category exists
    const category = await TestCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Verify category is CONTENT type
    if (category.type !== 'CONTENT') {
      return res.status(400).json({
        success: false,
        message: 'This category is not for content upload'
      });
    }

    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'PDF file is required'
      });
    }

    // Upload PDF to Cloudinary
    const fileResult = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      {
        resource_type: 'raw',
        folder: 'test-contents',
        format: 'pdf'
      }
    );

    const content = await TestContent.create({
      categoryId,
      title,
      year,
      month,
      description,
      file: {
        url: fileResult.secure_url,
        public_id: fileResult.public_id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Content uploaded successfully',
      data: content
    });
  } catch (error) {
    console.error('Create Content Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading content',
      error: error.message
    });
  }
};

// @desc    Get all contents
// @route   GET /api/test-contents
// @access  Public
exports.getAllContents = async (req, res) => {
  try {
    const { categoryId, year, month } = req.query;
    
    const filter = { isActive: true };
    if (categoryId) filter.categoryId = categoryId;
    if (year) filter.year = parseInt(year);
    if (month) filter.month = parseInt(month);

    const contents = await TestContent.find(filter)
      .populate('categoryId', 'name slug type')
      .sort({ year: -1, month: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: contents.length,
      data: contents
    });
  } catch (error) {
    console.error('Get Contents Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contents',
      error: error.message
    });
  }
};

// @desc    Get content filters (years and months)
// @route   GET /api/test-contents/filters
// @access  Public
exports.getContentFilters = async (req, res) => {
  try {
    const { categoryId } = req.query;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'categoryId is required'
      });
    }

    const result = await TestContent.aggregate([
      {
        $match: {
          categoryId: new mongoose.Types.ObjectId(categoryId),
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          years: { $addToSet: "$year" },
          months: { $addToSet: "$month" }
        }
      }
    ]);

    let data = result[0] || { years: [], months: [] };

    // Sort years descending
    data.years.sort((a, b) => b - a);
    
    // Sort months descending and filter out null/undefined
    data.months = data.months.filter(m => m !== null && m !== undefined);
    data.months.sort((a, b) => b - a);

    // Convert month number → name
    const monthNames = [
      "", "January", "February", "March", "April",
      "May", "June", "July", "August",
      "September", "October", "November", "December"
    ];

    const formattedMonths = data.months.map(m => ({
      value: m,
      label: monthNames[m]
    }));

    res.json({
      success: true,
      years: data.years,
      months: formattedMonths
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// @desc    Get single content
// @route   GET /api/test-contents/:id
// @access  Public
exports.getContent = async (req, res) => {
  try {
    const content = await TestContent.findById(req.params.id)
      .populate('categoryId', 'name slug type');

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Get Content Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching content',
      error: error.message
    });
  }
};

// @desc    Update content
// @route   PUT /api/test-contents/:id
// @access  Private (Super Admin, Center Admin)
exports.updateContent = async (req, res) => {
  try {
    const content = await TestContent.findById(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    const updates = { ...req.body };

    // Upload new file if provided
    if (req.file) {
      // Delete old file
      if (content.file && content.file.public_id) {
        await cloudinary.uploader.destroy(content.file.public_id, {
          resource_type: 'raw'
        });
      }
      
      const fileResult = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
        {
          resource_type: 'raw',
          folder: 'test-contents',
          format: 'pdf'
        }
      );
      
      updates.file = {
        url: fileResult.secure_url,
        public_id: fileResult.public_id
      };
    }

    const updatedContent = await TestContent.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Content updated successfully',
      data: updatedContent
    });
  } catch (error) {
    console.error('Update Content Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating content',
      error: error.message
    });
  }
};

// @desc    Delete content
// @route   DELETE /api/test-contents/:id
// @access  Private (Super Admin, Center Admin)
exports.deleteContent = async (req, res) => {
  try {
    const content = await TestContent.findById(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Delete file from Cloudinary
    if (content.file && content.file.public_id) {
      await cloudinary.uploader.destroy(content.file.public_id, {
        resource_type: 'raw'
      });
    }

    await TestContent.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    console.error('Delete Content Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting content',
      error: error.message
    });
  }
};
