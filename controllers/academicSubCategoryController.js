const mongoose = require('mongoose');
const AcademicSubCategory = require('../models/AcademicSubCategory');
const Course = require('../models/Course');
const { validateCategoryForHierarchy, escapeRegex } = require('../utils/academicHierarchyHelpers');
const { generateAcademicSubCategoryId, isValidObjectId } = require('../utils/academicIdGenerator');

const formatSubCategory = (doc, extras = {}) => ({
  _id: doc._id,
  subCategoryId: doc.subCategoryId,
  subCategoryName: doc.subCategoryName,
  centerId: doc.centerId?._id || doc.centerId,
  centerName: doc.centerId?.centerName || doc.centerId?.name,
  programId: doc.programId?._id || doc.programId,
  programName: doc.programId?.programName,
  categoryId: doc.categoryId?._id || doc.categoryId,
  categoryName: doc.categoryId?.categoryName,
  status: doc.status,
  linkedCourses: extras.linkedCourses ?? 0,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const resolveSubCategorySearchTerm = (query = {}) => {
  const raw = query.search ?? query.subCategoryName ?? '';
  const value = Array.isArray(raw) ? raw[0] : raw;
  return String(value ?? '').trim();
};

const buildSubCategoryListQuery = ({ search = '', center, program, category, status }) => {
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
  if (category && isValidObjectId(category)) {
    query.categoryId = new mongoose.Types.ObjectId(category);
  }

  const trimmed = String(search).trim();
  if (trimmed) {
    const term = escapeRegex(trimmed);
    query.$or = [
      { subCategoryName: { $regex: term, $options: 'i' } },
      { subCategoryId: { $regex: term, $options: 'i' } }
    ];
  }

  return query;
};

exports.createSubCategory = async (req, res) => {
  try {
    const { centerId, programId, categoryId, subCategoryName, status = 'ACTIVE' } = req.body;

    if (!subCategoryName?.trim()) {
      return res.status(400).json({ success: false, message: 'SubCategory name is required' });
    }

    const validation = await validateCategoryForHierarchy({ centerId, programId, categoryId });
    if (!validation.ok) {
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    const subCategory = await AcademicSubCategory.create({
      subCategoryId: await generateAcademicSubCategoryId(),
      subCategoryName: subCategoryName.trim(),
      centerId,
      programId,
      categoryId,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    const populated = await AcademicSubCategory.findById(subCategory._id)
      .populate('centerId', 'centerName name')
      .populate('programId', 'programName programId')
      .populate('categoryId', 'categoryName categoryId');

    res.status(201).json({
      success: true,
      message: 'SubCategory created successfully',
      data: formatSubCategory(populated.toObject())
    });
  } catch (error) {
    console.error('Create academic subcategory error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'SubCategory name already exists for this category'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubCategories = async (req, res) => {
  try {
    const search = resolveSubCategorySearchTerm(req.query);
    const {
      center,
      program,
      category,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = buildSubCategoryListQuery({ search, center, program, category, status });
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    const allowedSort = ['createdAt', 'subCategoryName', 'subCategoryId', 'status'];
    sort[allowedSort.includes(sortBy) ? sortBy : 'createdAt'] = sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      AcademicSubCategory.find(query)
        .populate('centerId', 'centerName name')
        .populate('programId', 'programName programId')
        .populate('categoryId', 'categoryName categoryId')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AcademicSubCategory.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 0,
      count: items.length,
      data: items.map((row) => formatSubCategory(row))
    });
  } catch (error) {
    console.error('Get academic subcategories error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Dropdown: subcategories for center + program + category (same chain as create form). */
exports.getSubCategoriesFilter = async (req, res) => {
  try {
    const { centerId, programId, categoryId } = req.query;

    if (!centerId || !programId || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'centerId, programId, and categoryId query parameters are required'
      });
    }

    const validation = await validateCategoryForHierarchy({ centerId, programId, categoryId });
    if (!validation.ok) {
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    const subCategories = await AcademicSubCategory.find({
      centerId,
      programId,
      categoryId,
      status: 'ACTIVE'
    })
      .select('_id subCategoryId subCategoryName')
      .sort({ subCategoryName: 1 })
      .lean();

    res.json({
      success: true,
      count: subCategories.length,
      data: subCategories
    });
  } catch (error) {
    console.error('Filter academic subcategories error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubCategoryById = async (req, res) => {
  try {
    const subCategory = await AcademicSubCategory.findById(req.params.id)
      .populate('centerId', 'centerName name centerCode')
      .populate('programId', 'programName programId')
      .populate('categoryId', 'categoryName categoryId');

    if (!subCategory) {
      return res.status(404).json({ success: false, message: 'SubCategory not found' });
    }

    const linkedCourses = await Course.countDocuments({ academicSubCategory: subCategory._id });

    res.json({
      success: true,
      data: formatSubCategory(subCategory.toObject(), { linkedCourses })
    });
  } catch (error) {
    console.error('Get academic subcategory by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateSubCategory = async (req, res) => {
  try {
    const subCategory = await AcademicSubCategory.findById(req.params.id);
    if (!subCategory) {
      return res.status(404).json({ success: false, message: 'SubCategory not found' });
    }

    const nextCenterId = req.body.centerId ?? subCategory.centerId;
    const nextProgramId = req.body.programId ?? subCategory.programId;
    const nextCategoryId = req.body.categoryId ?? subCategory.categoryId;

    if (
      req.body.centerId !== undefined ||
      req.body.programId !== undefined ||
      req.body.categoryId !== undefined
    ) {
      const validation = await validateCategoryForHierarchy({
        centerId: nextCenterId,
        programId: nextProgramId,
        categoryId: nextCategoryId
      });
      if (!validation.ok) {
        return res.status(validation.status).json({ success: false, message: validation.message });
      }
      subCategory.centerId = nextCenterId;
      subCategory.programId = nextProgramId;
      subCategory.categoryId = nextCategoryId;
    }

    if (req.body.subCategoryName !== undefined) {
      if (!String(req.body.subCategoryName).trim()) {
        return res.status(400).json({ success: false, message: 'SubCategory name cannot be empty' });
      }
      subCategory.subCategoryName = String(req.body.subCategoryName).trim();
    }

    if (req.body.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
      }
      subCategory.status = req.body.status;
    }

    await subCategory.save();

    const populated = await AcademicSubCategory.findById(subCategory._id)
      .populate('centerId', 'centerName name')
      .populate('programId', 'programName programId')
      .populate('categoryId', 'categoryName categoryId');

    res.json({
      success: true,
      message: 'SubCategory updated successfully',
      data: formatSubCategory(populated.toObject())
    });
  } catch (error) {
    console.error('Update academic subcategory error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'SubCategory name already exists for this category'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateSubCategoryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
    }

    const subCategory = await AcademicSubCategory.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('centerId', 'centerName name')
      .populate('programId', 'programName programId')
      .populate('categoryId', 'categoryName categoryId');

    if (!subCategory) {
      return res.status(404).json({ success: false, message: 'SubCategory not found' });
    }

    res.json({
      success: true,
      message: 'SubCategory status updated',
      data: formatSubCategory(subCategory.toObject())
    });
  } catch (error) {
    console.error('Update academic subcategory status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteSubCategory = async (req, res) => {
  try {
    const subCategory = await AcademicSubCategory.findByIdAndDelete(req.params.id);

    if (!subCategory) {
      return res.status(404).json({ success: false, message: 'SubCategory not found' });
    }

    res.json({
      success: true,
      message: 'SubCategory deleted successfully',
      data: { _id: subCategory._id }
    });
  } catch (error) {
    console.error('Delete academic subcategory error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
