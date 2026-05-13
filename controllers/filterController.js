const Filter = require('../models/Filter');

// ==================== FILTER CONTROLLERS ====================

exports.createFilter = async (req, res) => {
  try {
    const { type, value, categoryId, subCategoryId } = req.body;

    // Check if filter already exists
    const existingFilter = await Filter.findOne({
      type,
      value,
      categoryId,
      subCategoryId: subCategoryId || null
    });

    if (existingFilter) {
      return res.status(400).json({
        success: false,
        message: 'Filter already exists for this category'
      });
    }

    const filter = new Filter({
      type,
      value,
      categoryId,
      subCategoryId: subCategoryId || null,
      centerId: req.user.center || null
    });

    await filter.save();

    res.status(201).json({
      success: true,
      message: 'Filter created successfully',
      data: filter
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Filter already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getFilters = async (req, res) => {
  try {
    const { type, categoryId, subCategoryId, isActive } = req.query;
    
    const filter = {};
    
    // Enforce center-based filtering for Center Admin
    if (req.user && req.user.role === 'center_admin') {
      filter.centerId = req.user.center;
    }
    
    if (type) filter.type = type;
    if (categoryId) filter.categoryId = categoryId;
    if (subCategoryId) filter.subCategoryId = subCategoryId;
    
    // Always filter active by default
    filter.isActive = isActive !== undefined ? isActive === 'true' : true;

    const filters = await Filter.find(filter)
      .populate('categoryId', 'name slug')
      .populate('subCategoryId', 'name')
      .sort({ type: 1, value: 1 });

    res.json({
      success: true,
      count: filters.length,
      data: filters
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getFiltersByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { type } = req.query;

    const filter = { categoryId };
    if (type) filter.type = type;

    const filters = await Filter.find(filter)
      .populate('subCategoryId', 'name')
      .sort({ type: 1, value: 1 });

    // Group by type
    const groupedFilters = filters.reduce((acc, filter) => {
      if (!acc[filter.type]) {
        acc[filter.type] = [];
      }
      acc[filter.type].push({
        _id: filter._id,
        value: filter.value,
        subCategoryId: filter.subCategoryId
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: groupedFilters
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateFilter = async (req, res) => {
  try {
    const { value, isActive } = req.body;
    const filter = await Filter.findById(req.params.id);

    if (!filter) {
      return res.status(404).json({
        success: false,
        message: 'Filter not found'
      });
    }

    filter.value = value || filter.value;
    filter.isActive = isActive !== undefined ? isActive : filter.isActive;

    await filter.save();

    res.json({
      success: true,
      message: 'Filter updated successfully',
      data: filter
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteFilter = async (req, res) => {
  try {
    const filter = await Filter.findById(req.params.id);

    if (!filter) {
      return res.status(404).json({
        success: false,
        message: 'Filter not found'
      });
    }

    await filter.deleteOne();

    res.json({
      success: true,
      message: 'Filter deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
