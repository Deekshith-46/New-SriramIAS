const TestPaper = require('../models/TestPaper');
const TestCategory = require('../models/TestCategory');
const TestQuestion = require('../models/TestQuestion');
const TestAttempt = require('../models/TestAttempt');
const mongoose = require('mongoose');

// @desc    Create paper
// @route   POST /api/test-papers
// @access  Private (Super Admin, Center Admin)
exports.createPaper = async (req, res) => {
  try {
    const { categoryId, title, mainsCategory, year, month, date, duration, totalMarks, negativeMarks, description } = req.body;

    if (!categoryId || !title || !year || !date) {
      return res.status(400).json({
        success: false,
        message: 'Category ID, title, year, and date are required'
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

    // Verify category is EXAM type
    if (category.type !== 'EXAM') {
      return res.status(400).json({
        success: false,
        message: 'This category is not for exams'
      });
    }

    const paper = await TestPaper.create({
      categoryId,
      title,
      mainsCategory,
      year,
      month,
      date,
      duration,
      totalMarks,
      negativeMarks,
      description
    });

    res.status(201).json({
      success: true,
      message: 'Paper created successfully',
      data: paper
    });
  } catch (error) {
    console.error('Create Paper Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating paper',
      error: error.message
    });
  }
};

// @desc    Get paper filters (mainsCategory, years, and months)
// @route   GET /api/test-papers/filters
// @access  Public
exports.getPaperFilters = async (req, res) => {
  try {
    const { categoryId } = req.query;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'categoryId is required'
      });
    }

    const result = await TestPaper.aggregate([
      {
        $match: {
          categoryId: new mongoose.Types.ObjectId(categoryId),
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          mainsCategories: { $addToSet: "$mainsCategory" },
          years: { $addToSet: "$year" },
          months: { $addToSet: "$month" }
        }
      }
    ]);

    let data = result[0] || { mainsCategories: [], years: [], months: [] };

    // Sort years descending
    data.years.sort((a, b) => b - a);
    
    // Sort months descending and filter out null/undefined/empty
    data.months = data.months.filter(m => m !== null && m !== undefined && m !== '');
    data.months.sort((a, b) => b - a);

    // Sort mainsCategories
    data.mainsCategories.sort();

    // Convert month number → name
    const monthNames = [
      "", "January", "February", "March", "April",
      "May", "June", "July", "August",
      "September", "October", "November", "December"
    ];

    const formattedMonths = data.months.map(m => ({
      value: m,
      label: monthNames[parseInt(m)] || m
    }));

    res.json({
      success: true,
      mainsCategories: data.mainsCategories,
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

// @desc    Get all papers
// @route   GET /api/test-papers
// @access  Public
exports.getAllPapers = async (req, res) => {
  try {
    const { categoryId, year, month, mainsCategory } = req.query;
    
    const filter = { isActive: true };
    if (categoryId) filter.categoryId = categoryId;
    if (year) filter.year = parseInt(year);
    if (month) filter.month = month;
    if (mainsCategory) filter.mainsCategory = mainsCategory;

    const papers = await TestPaper.find(filter)
      .populate('categoryId', 'name slug type')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: papers.length,
      data: papers
    });
  } catch (error) {
    console.error('Get Papers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching papers',
      error: error.message
    });
  }
};

// @desc    Get single paper with questions
// @route   GET /api/test-papers/:id
// @access  Public
exports.getPaper = async (req, res) => {
  try {
    const paper = await TestPaper.findById(req.params.id)
      .populate('categoryId', 'name slug type');

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Get questions for this paper
    const questions = await TestQuestion.find({ paperId: req.params.id })
      .select('-correctAnswer') // Don't send correct answers to students
      .sort({ questionNumber: 1 });

    res.status(200).json({
      success: true,
      data: {
        ...paper.toObject(),
        questions
      }
    });
  } catch (error) {
    console.error('Get Paper Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching paper',
      error: error.message
    });
  }
};

// @desc    Update paper
// @route   PUT /api/test-papers/:id
// @access  Private (Super Admin, Center Admin)
exports.updatePaper = async (req, res) => {
  try {
    const paper = await TestPaper.findById(req.params.id);

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    const updatedPaper = await TestPaper.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Paper updated successfully',
      data: updatedPaper
    });
  } catch (error) {
    console.error('Update Paper Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating paper',
      error: error.message
    });
  }
};

// @desc    Delete paper
// @route   DELETE /api/test-papers/:id
// @access  Private (Super Admin, Center Admin)
exports.deletePaper = async (req, res) => {
  try {
    const paper = await TestPaper.findById(req.params.id);

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Delete all questions for this paper
    await TestQuestion.deleteMany({ paperId: req.params.id });

    // Delete all attempts for this paper
    await TestAttempt.deleteMany({ paperId: req.params.id });

    // Delete paper
    await TestPaper.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Paper and all related data deleted successfully'
    });
  } catch (error) {
    console.error('Delete Paper Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting paper',
      error: error.message
    });
  }
};
