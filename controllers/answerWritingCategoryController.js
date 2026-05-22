const AnswerWritingCategory = require('../models/AnswerWritingCategory');
const AnswerWritingQuestion = require('../models/AnswerWritingQuestion');
const { uniqueSlugForModel } = require('../utils/categorySlugFromTitle');

exports.getCategories = async (req, res) => {
  try {
    const categories = await AnswerWritingCategory.find().sort({ slug: 1 }).lean();
    res.json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    console.error('Get answer writing categories error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const category = await AnswerWritingCategory.findById(req.params.id).lean();
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Get answer writing category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const nextSlug = await uniqueSlugForModel(AnswerWritingCategory, title);
    if (!nextSlug) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const category = await AnswerWritingCategory.create({
      title: title.trim(),
      slug: nextSlug
    });

    res.status(201).json({ success: true, message: 'Category created', data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category slug already exists' });
    }
    console.error('Create answer writing category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await AnswerWritingCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { title } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const trimmedTitle = title.trim();
    const nextSlug = await uniqueSlugForModel(AnswerWritingCategory, trimmedTitle, category._id);
    if (!nextSlug) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    category.title = trimmedTitle;

    if (category.slug !== nextSlug) {
      const inUse = await AnswerWritingQuestion.countDocuments({ categoryId: category._id });
      if (!inUse) {
        category.slug = nextSlug;
      }
    }
    await category.save();

    res.json({ success: true, message: 'Category updated', data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category slug already exists' });
    }
    console.error('Update answer writing category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await AnswerWritingCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const questionsCount = await AnswerWritingQuestion.countDocuments({ categoryId: category._id });
    if (questionsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${questionsCount} question(s) still use it. Delete questions first.`
      });
    }

    await AnswerWritingCategory.deleteOne({ _id: category._id });

    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error('Delete answer writing category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
