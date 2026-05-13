const ResourceCategory = require('../models/ResourceCategory');
const SubCategory = require('../models/SubCategory');
const Filter = require('../models/Filter');
const Resource = require('../models/Resource');
const MockTest = require('../models/MockTest');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const { paginate, buildPaginationResponse } = require('../middleware/resourceMiddleware');

// ==================== CATEGORY CONTROLLERS ====================

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    let thumbnailData = {};
    if (req.file) {
      const result = await uploadToCloudinary(req.file, 'resources/categories');
      thumbnailData = {
        url: result.url,
        public_id: result.public_id
      };
    }

    const category = new ResourceCategory({
      name,
      description,
      thumbnail: thumbnailData,
      createdBy: req.user._id,
      centerId: req.user.center || null
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = {};
    
    // Enforce center-based filtering for Center Admin
    if (req.user && req.user.role === 'center_admin') {
      filter.centerId = req.user.center;
    }
    
    // Always filter active by default unless specified
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    } else {
      filter.isActive = true;
    }

    const categories = await ResourceCategory.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const category = await ResourceCategory.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const category = await ResourceCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    let thumbnailData = category.thumbnail;
    if (req.file) {
      const result = await uploadToCloudinary(req.file, 'resources/categories');
      thumbnailData = {
        url: result.url,
        public_id: result.public_id
      };
    }

    category.name = name || category.name;
    category.description = description || category.description;
    category.thumbnail = thumbnailData;
    category.isActive = isActive !== undefined ? isActive : category.isActive;
    // Update centerId if admin changes (Super Admin only)
    if (req.user.role === 'super_admin' && req.body.centerId) {
      category.centerId = req.body.centerId;
    }

    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await ResourceCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has subcategories or resources
    const subCategories = await SubCategory.countDocuments({ categoryId: req.params.id });
    const resources = await Resource.countDocuments({ categoryId: req.params.id });
    const mockTests = await MockTest.countDocuments({ categoryId: req.params.id });

    if (subCategories > 0 || resources > 0 || mockTests > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category. It has associated subcategories, resources, or mock tests.'
      });
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== SUBCATEGORY CONTROLLERS ====================

exports.createSubCategory = async (req, res) => {
  try {
    const { name, categoryId, description } = req.body;

    // Check if category exists
    const category = await ResourceCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    let thumbnailData = {};
    if (req.file) {
      const result = await uploadToCloudinary(req.file, 'resources/subcategories');
      thumbnailData = {
        url: result.url,
        public_id: result.public_id
      };
    }

    const subCategory = new SubCategory({
      name,
      categoryId,
      description,
      thumbnail: thumbnailData
    });

    await subCategory.save();

    res.status(201).json({
      success: true,
      message: 'SubCategory created successfully',
      data: subCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getSubCategories = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { isActive } = req.query;
    
    const filter = {};
    if (categoryId) {
      filter.categoryId = categoryId;
    }
    
    // Always filter active by default
    filter.isActive = isActive !== undefined ? isActive === 'true' : true;

    const subCategories = await SubCategory.find(filter)
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: subCategories.length,
      data: subCategories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateSubCategory = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const subCategory = await SubCategory.findById(req.params.id);

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: 'SubCategory not found'
      });
    }

    let thumbnailData = subCategory.thumbnail;
    if (req.file) {
      const result = await uploadToCloudinary(req.file, 'resources/subcategories');
      thumbnailData = {
        url: result.url,
        public_id: result.public_id
      };
    }

    subCategory.name = name || subCategory.name;
    subCategory.description = description || subCategory.description;
    subCategory.thumbnail = thumbnailData;
    subCategory.isActive = isActive !== undefined ? isActive : subCategory.isActive;

    await subCategory.save();

    res.json({
      success: true,
      message: 'SubCategory updated successfully',
      data: subCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteSubCategory = async (req, res) => {
  try {
    const subCategory = await SubCategory.findById(req.params.id);

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: 'SubCategory not found'
      });
    }

    // Check if subcategory has resources or mock tests
    const resources = await Resource.countDocuments({ subCategoryId: req.params.id });
    const mockTests = await MockTest.countDocuments({ subCategoryId: req.params.id });

    if (resources > 0 || mockTests > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete subcategory. It has associated resources or mock tests.'
      });
    }

    await subCategory.deleteOne();

    res.json({
      success: true,
      message: 'SubCategory deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
