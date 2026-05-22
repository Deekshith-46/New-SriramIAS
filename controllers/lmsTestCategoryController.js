const LmsTestCategory = require('../models/LmsTestCategory');
const LmsTest = require('../models/LmsTest');
const { NOT_DELETED } = require('../utils/lmsTestHelpers');
const { PERIOD_SLUGS, slugFromCategoryTitle } = require('../utils/categorySlugFromTitle');

const CORE_SLUGS = PERIOD_SLUGS;

exports.getCategories = async (req, res) => {
  try {
    const categories = await LmsTestCategory.find().sort({ slug: 1 }).lean();

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Get LMS test categories error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const nextSlug = slugFromCategoryTitle(title);
    if (!nextSlug) {
      return res.status(400).json({
        success: false,
        message: 'title must include daily, weekly, or monthly'
      });
    }

    const category = await LmsTestCategory.create({ title: title.trim(), slug: nextSlug });

    res.status(201).json({
      success: true,
      message: 'Test category created',
      data: category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category slug already exists' });
    }
    console.error('Create LMS test category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await LmsTestCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { title } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const nextSlug = slugFromCategoryTitle(title);
    if (!nextSlug) {
      return res.status(400).json({
        success: false,
        message: 'title must include daily, weekly, or monthly'
      });
    }

    if (category.slug !== nextSlug) {
      const inUse = await LmsTest.countDocuments({
        categoryId: category._id,
        ...NOT_DELETED
      });
      if (inUse > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change category period while tests use this category'
        });
      }
      category.slug = nextSlug;
    }

    category.title = title.trim();
    await category.save();

    res.json({
      success: true,
      message: 'Category updated',
      data: category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category slug already exists' });
    }
    console.error('Update LMS test category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await LmsTestCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (CORE_SLUGS.includes(category.slug)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete core categories (weekly, daily, monthly). Update title only.'
      });
    }

    const testsCount = await LmsTest.countDocuments({
      categoryId: category._id,
      ...NOT_DELETED
    });

    if (testsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${testsCount} test(s) still use it`
      });
    }

    await LmsTestCategory.deleteOne({ _id: category._id });

    res.json({
      success: true,
      message: 'Category deleted'
    });
  } catch (error) {
    console.error('Delete LMS test category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
