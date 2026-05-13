const BlogCategory = require('../models/BlogCategory');
const Article = require('../models/Article');

// @desc    Create a new blog category
// @route   POST /api/blog/categories
// @access  Private (Admin)
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    // Check if category already exists
    const existingCategory = await BlogCategory.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists'
      });
    }

    const category = new BlogCategory({
      name,
      createdBy: req.user?._id
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Create Category Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating category',
      error: error.message
    });
  }
};

// @desc    Get all blog categories
// @route   GET /api/blog/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const { isActive } = req.query;
    
    let filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const categories = await BlogCategory.find(filter)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Get Categories Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories',
      error: error.message
    });
  }
};

// @desc    Get single category
// @route   GET /api/blog/categories/:id
// @access  Public
exports.getCategoryById = async (req, res) => {
  try {
    const category = await BlogCategory.findById(req.params.id);

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
    console.error('Get Category Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching category',
      error: error.message
    });
  }
};

// @desc    Update category
// @route   PUT /api/blog/categories/:id
// @access  Private (Admin)
exports.updateCategory = async (req, res) => {
  try {
    const { name, isActive } = req.body;

    let category = await BlogCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Update fields
    if (name) category.name = name;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Update Category Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating category',
      error: error.message
    });
  }
};

// @desc    Delete category (soft delete)
// @route   DELETE /api/blog/categories/:id
// @access  Private (Admin)
exports.deleteCategory = async (req, res) => {
  try {
    const category = await BlogCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has active articles
    const activeArticles = await Article.find({ 
      categoryId: req.params.id, 
      isActive: true 
    });

    if (activeArticles.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${activeArticles.length} active article(s). Please delete or reassign them first.`,
        articleCount: activeArticles.length
      });
    }

    // Soft delete
    category.isActive = false;
    await category.save();

    res.json({
      success: true,
      message: 'Category deleted successfully',
      data: category
    });
  } catch (error) {
    console.error('Delete Category Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting category',
      error: error.message
    });
  }
};