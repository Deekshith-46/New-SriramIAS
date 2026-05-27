const mongoose = require('mongoose');
const AcademicCategory = require('../models/AcademicCategory');
const AcademicSubCategory = require('../models/AcademicSubCategory');
const Course = require('../models/Course');
const { validateProgramCenterLink, escapeRegex } = require('../utils/academicHierarchyHelpers');
const { generateAcademicCategoryId, isValidObjectId } = require('../utils/academicIdGenerator');

const formatCategory = (doc, extras = {}) => ({
  _id: doc._id,
  categoryId: doc.categoryId,
  categoryName: doc.categoryName,
  centerId: doc.centerId?._id || doc.centerId,
  centerName: doc.centerId?.centerName || doc.centerId?.name,
  programId: doc.programId?._id || doc.programId,
  programName: doc.programId?.programName,
  status: doc.status,
  linkedSubCategories: extras.linkedSubCategories ?? 0,
  linkedCourses: extras.linkedCourses ?? 0,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildCategoryListQuery = ({ search = '', center, program, status }) => {
  const query = {};

  if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
    query.status = status;
  }
  if (center && isValidObjectId(center)) {
    query.centerId = new mongoose.Types.ObjectId(center);
  }
  if (program && isValidObjectId(program)) {
    query.programId = new mongoose.Types.ObjectId(program);
  }

  const trimmed = String(search).trim();
  if (trimmed) {
    query.categoryName = new RegExp(escapeRegex(trimmed), 'i');
  }

  return query;
};

exports.createCategory = async (req, res) => {
  try {
    const { centerId, programId, categoryName, status = 'ACTIVE' } = req.body;

    if (!categoryName?.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const validation = await validateProgramCenterLink(programId, centerId);
    if (!validation.ok) {
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    const category = await AcademicCategory.create({
      categoryId: await generateAcademicCategoryId(),
      categoryName: categoryName.trim(),
      centerId,
      programId,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    const populated = await AcademicCategory.findById(category._id)
      .populate('centerId', 'centerName name')
      .populate('programId', 'programName programId');

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: formatCategory(populated.toObject())
    });
  } catch (error) {
    console.error('Create academic category error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists for this center and program'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const {
      search = '',
      center,
      program,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = buildCategoryListQuery({ search, center, program, status });
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    const allowedSort = ['createdAt', 'categoryName', 'categoryId', 'status'];
    sort[allowedSort.includes(sortBy) ? sortBy : 'createdAt'] = sortOrder === 'asc' ? 1 : -1;

    const [categories, total] = await Promise.all([
      AcademicCategory.find(query)
        .populate('centerId', 'centerName name')
        .populate('programId', 'programName programId')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AcademicCategory.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 0,
      count: categories.length,
      data: categories.map((c) => formatCategory(c))
    });
  } catch (error) {
    console.error('Get academic categories error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCategoriesFilter = async (req, res) => {
  try {
    const { centerId, programId } = req.query;

    if (!centerId || !programId) {
      return res.status(400).json({
        success: false,
        message: 'centerId and programId query parameters are required'
      });
    }

    const validation = await validateProgramCenterLink(programId, centerId);
    if (!validation.ok) {
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    const categories = await AcademicCategory.find({
      centerId,
      programId,
      status: 'ACTIVE'
    })
      .select('_id categoryId categoryName')
      .sort({ categoryName: 1 })
      .lean();

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Filter academic categories error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const category = await AcademicCategory.findById(req.params.id)
      .populate('centerId', 'centerName name centerCode')
      .populate('programId', 'programName programId');

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const [subCount, courseCount] = await Promise.all([
      AcademicSubCategory.countDocuments({ categoryId: category._id, status: 'ACTIVE' }),
      Course.countDocuments({ academicCategory: category._id })
    ]);

    res.json({
      success: true,
      data: formatCategory(category.toObject(), {
        linkedSubCategories: subCount,
        linkedCourses: courseCount
      })
    });
  } catch (error) {
    console.error('Get academic category by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await AcademicCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const nextCenterId = req.body.centerId ?? category.centerId;
    const nextProgramId = req.body.programId ?? category.programId;

    if (req.body.centerId !== undefined || req.body.programId !== undefined) {
      const validation = await validateProgramCenterLink(nextProgramId, nextCenterId);
      if (!validation.ok) {
        return res.status(validation.status).json({ success: false, message: validation.message });
      }
      category.centerId = nextCenterId;
      category.programId = nextProgramId;
    }

    if (req.body.categoryName !== undefined) {
      if (!String(req.body.categoryName).trim()) {
        return res.status(400).json({ success: false, message: 'Category name cannot be empty' });
      }
      category.categoryName = String(req.body.categoryName).trim();
    }

    if (req.body.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
      }
      category.status = req.body.status;
    }

    await category.save();

    const populated = await AcademicCategory.findById(category._id)
      .populate('centerId', 'centerName name')
      .populate('programId', 'programName programId');

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: formatCategory(populated.toObject())
    });
  } catch (error) {
    console.error('Update academic category error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists for this center and program'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateCategoryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
    }

    const category = await AcademicCategory.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('centerId', 'centerName name')
      .populate('programId', 'programName programId');

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({
      success: true,
      message: 'Category status updated',
      data: formatCategory(category.toObject())
    });
  } catch (error) {
    console.error('Update academic category status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await AcademicCategory.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully',
      data: { _id: category._id }
    });
  } catch (error) {
    console.error('Delete academic category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
