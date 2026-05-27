const Course = require('../models/Course');
const Center = require('../models/Center');
const Category = require('../models/Category');
const { generateCourseId, isValidObjectId } = require('../utils/courseIdGenerator');
const { validateCourseHierarchy } = require('../utils/courseHierarchyValidation');
const {
  safeParseJson,
  resolveCourseName,
  resolveCenterId,
  resolveProgramId,
  resolveCategoryId,
  resolveSubCategoryId,
  resolveCourseStatus,
  escapeRegex,
  courseListPopulate
} = require('../utils/coursePayloadHelpers');
const { getCreatedByFromRequest } = require('../utils/academicHierarchyHelpers');
const {
  buildCourseCmsPayload,
  shouldRebuildCms,
  hasCmsFiles
} = require('../utils/courseCmsMedia');
const {
  validateCmsLimits,
  validateCourseUploadFiles,
  validateFeatureCardFormFields
} = require('../utils/courseCmsValidation');
const {
  formatCourseResponse,
  formatCoursesList
} = require('../utils/formatCourseResponse');

const NOT_DELETED = { isDeleted: { $ne: true } };

const runCmsUploadValidation = (req, res) => {
  const limits = validateCmsLimits(req);
  if (!limits.ok) {
    res.status(limits.status).json({ success: false, message: limits.message });
    return false;
  }
  const featureCards = validateFeatureCardFormFields(req);
  if (!featureCards.ok) {
    res.status(featureCards.status).json({ success: false, message: featureCards.message });
    return false;
  }
  const files = validateCourseUploadFiles(req);
  if (!files.ok) {
    res.status(files.status).json({ success: false, message: files.message });
    return false;
  }
  return true;
};

// @desc    Create course (ERP + CMS multipart)
// @route   POST /api/courses
exports.createCourse = async (req, res) => {
  try {
    const user = req.user;
    const courseName = resolveCourseName(req.body);
    const centerId = resolveCenterId(req.body);
    const programId = resolveProgramId(req.body);
    const categoryId = resolveCategoryId(req.body);
    const subCategoryId = resolveSubCategoryId(req.body);
    const { courseOverview } = req.body;

    if (!courseName) {
      return res.status(400).json({
        success: false,
        message: 'courseName is required'
      });
    }

    if (!centerId || !programId || !categoryId || !subCategoryId) {
      return res.status(400).json({
        success: false,
        message:
          'centerId, programId, categoryId, and subCategoryId are required'
      });
    }

    const hierarchy = await validateCourseHierarchy({
      centerId,
      programId,
      categoryId,
      subCategoryId
    });
    if (!hierarchy.ok) {
      return res.status(hierarchy.status).json({
        success: false,
        message: hierarchy.message,
        ...(hierarchy.reason && { reason: hierarchy.reason })
      });
    }

    if (!runCmsUploadValidation(req, res)) return;

    if (user?.role === 'center_admin') {
      const centerRow = await Center.findById(centerId);
      if (!centerRow?.centerAdmin || !centerRow.centerAdmin.equals(user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the admin of this center.'
        });
      }
    }

    const cms = await buildCourseCmsPayload(req);
    const erpStatus = resolveCourseStatus(req.body);

    const course = await Course.create({
      courseId: await generateCourseId(),
      courseName,
      title: courseName,
      center: centerId,
      program: programId,
      academicCategory: categoryId,
      academicSubCategory: subCategoryId,
      courseOverview: courseOverview || '',
      status: erpStatus,
      isActive: erpStatus === 'ACTIVE',
      keyFeatures: cms.keyFeatures,
      whyChooseSection: cms.whyChooseSection,
      helpSections: cms.helpSections,
      createdBy: user?._id || getCreatedByFromRequest(req)
    });

    const populatedCourse = await Course.findById(course._id).populate(courseListPopulate);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course: formatCourseResponse(populatedCourse)
    });
  } catch (error) {
    console.error('Create Course Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating course',
      error: error.message
    });
  }
};

// @desc    Update course (multipart — same file fields as create)
// @route   PUT /api/courses/:id
exports.updateCourse = async (req, res) => {
  try {
    const user = req.user;
    const course = await Course.findOne({ _id: req.params.id, ...NOT_DELETED });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (!runCmsUploadValidation(req, res)) return;

    if (user?.role === 'center_admin') {
      const centerDoc = await Center.findById(course.center);
      if (!centerDoc?.centerAdmin || !centerDoc.centerAdmin.equals(user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only edit courses for your center.'
        });
      }
    }

    const updates = {};

    const nextCourseName = resolveCourseName(req.body);
    if (nextCourseName) {
      updates.courseName = nextCourseName;
      updates.title = nextCourseName;
    }

    const hierarchyFieldsSent =
      req.body.centerId !== undefined ||
      req.body.center !== undefined ||
      req.body.programId !== undefined ||
      req.body.program !== undefined ||
      req.body.categoryId !== undefined ||
      req.body.academicCategory !== undefined ||
      req.body.subCategoryId !== undefined ||
      req.body.academicSubCategory !== undefined;

    if (hierarchyFieldsSent) {
      const hierarchy = await validateCourseHierarchy({
        centerId: resolveCenterId(req.body) || course.center,
        programId: resolveProgramId(req.body) || course.program,
        categoryId: resolveCategoryId(req.body) || course.academicCategory,
        subCategoryId: resolveSubCategoryId(req.body) || course.academicSubCategory
      });
      if (!hierarchy.ok) {
        return res.status(hierarchy.status).json({
          success: false,
          message: hierarchy.message,
          ...(hierarchy.reason && { reason: hierarchy.reason })
        });
      }
      const cId = resolveCenterId(req.body);
      const pId = resolveProgramId(req.body);
      const catId = resolveCategoryId(req.body);
      const subId = resolveSubCategoryId(req.body);
      if (cId) updates.center = cId;
      if (pId) updates.program = pId;
      if (catId) updates.academicCategory = catId;
      if (subId) updates.academicSubCategory = subId;
    }

    if (req.body.courseOverview !== undefined) {
      updates.courseOverview = req.body.courseOverview;
    }
    if (req.body.status !== undefined) {
      const erpStatus = resolveCourseStatus(req.body);
      updates.status = erpStatus;
      updates.isActive = erpStatus === 'ACTIVE';
    }

    if (shouldRebuildCms(req.body, req) || hasCmsFiles(req)) {
      const cms = await buildCourseCmsPayload(req, course);
      updates.keyFeatures = cms.keyFeatures;
      updates.whyChooseSection = cms.whyChooseSection;
      updates.helpSections = cms.helpSections;
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate(courseListPopulate);

    res.json({
      success: true,
      message: 'Course updated successfully',
      course: formatCourseResponse(updatedCourse)
    });
  } catch (error) {
    console.error('Update Course Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating course',
      error: error.message
    });
  }
};

// @desc    Patch course status only
// @route   PATCH /api/courses/status/:id
exports.updateCourseStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'status must be ACTIVE or INACTIVE'
      });
    }

    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { status, isActive: status === 'ACTIVE' },
      { new: true }
    ).populate(courseListPopulate);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.json({
      success: true,
      message: 'Course status updated',
      course: formatCourseResponse(course)
    });
  } catch (error) {
    console.error('Update course status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating course status',
      error: error.message
    });
  }
};

// @desc    Get all courses (with filters)
// @route   GET /api/courses
exports.getCourses = async (req, res) => {
  try {
    const {
      center,
      centerId,
      category,
      program,
      programId,
      categoryId,
      subCategoryId,
      search,
      status,
      isActive,
      isFeatured,
      centerName,
      categoryName,
      page = 1,
      limit = 10
    } = req.query;

    const filter = { ...NOT_DELETED };

    const resolvedCenter = centerId || center;
    if (resolvedCenter && isValidObjectId(resolvedCenter)) {
      filter.center = resolvedCenter;
    }

    const resolvedProgram = programId || program;
    if (resolvedProgram && isValidObjectId(resolvedProgram)) {
      filter.program = resolvedProgram;
    }
    if (categoryId && isValidObjectId(categoryId)) filter.academicCategory = categoryId;
    if (subCategoryId && isValidObjectId(subCategoryId)) {
      filter.academicSubCategory = subCategoryId;
    }
    if (category && isValidObjectId(category)) filter.category = category;

    if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
      filter.status = status;
      filter.isActive = status === 'ACTIVE';
    } else if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (isFeatured) filter.isFeatured = true;

    const searchTerm = String(search || '').trim();
    if (searchTerm) {
      const regex = new RegExp(escapeRegex(searchTerm), 'i');
      filter.$or = [{ courseName: regex }, { title: regex }, { courseId: regex }];
    }

    if (centerName) {
      const centers = await Center.find({
        isDeleted: false,
        $or: [
          { centerName: new RegExp(centerName, 'i') },
          { name: new RegExp(centerName, 'i') },
          { city: new RegExp(centerName, 'i') },
          { centerCode: new RegExp(centerName, 'i') }
        ]
      });
      if (centers.length > 0) {
        filter.center = { $in: centers.map((c) => c._id) };
      } else {
        return res.json({
          success: true,
          count: 0,
          total: 0,
          courses: [],
          message: `No courses found for center: ${centerName}`
        });
      }
    }

    if (categoryName && categoryName !== 'All') {
      const categories = await Category.find({ name: new RegExp(categoryName, 'i') });
      if (categories.length > 0) {
        filter.category = { $in: categories.map((c) => c._id) };
      } else {
        return res.json({
          success: true,
          count: 0,
          total: 0,
          courses: [],
          message: `No courses found for category: ${categoryName}`
        });
      }
    }

    const total = await Course.countDocuments(filter);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);

    let courses;
    let limitNum;
    let pages;

    if (limit === 'all') {
      courses = await Course.find(filter).populate(courseListPopulate).sort({ createdAt: -1 });
      limitNum = total;
      pages = 1;
    } else {
      limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
      const skip = (pageNum - 1) * limitNum;
      pages = Math.ceil(total / limitNum) || 1;
      courses = await Course.find(filter)
        .populate(courseListPopulate)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);
    }

    res.json({
      success: true,
      count: courses.length,
      total,
      page: pageNum,
      limit: limit === 'all' ? 'all' : limitNum,
      pages,
      courses: formatCoursesList(courses)
    });
  } catch (error) {
    console.error('Get Courses Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error.message
    });
  }
};

exports.getCoursesForEnquiry = async (req, res) => {
  try {
    const { centerName, categoryName } = req.query;
    const filter = { isActive: true, status: 'ACTIVE', ...NOT_DELETED };

    if (centerName) {
      const centers = await Center.find({
        isDeleted: false,
        $or: [
          { centerName: new RegExp(centerName, 'i') },
          { name: new RegExp(centerName, 'i') },
          { city: new RegExp(centerName, 'i') },
          { centerCode: new RegExp(centerName, 'i') }
        ]
      });
      if (centers.length > 0) {
        filter.center = { $in: centers.map((c) => c._id) };
      } else {
        return res.json({ success: true, count: 0, courses: [] });
      }
    }

    if (categoryName && categoryName !== 'All') {
      const categories = await Category.find({ name: new RegExp(categoryName, 'i') });
      if (categories.length > 0) {
        filter.category = { $in: categories.map((c) => c._id) };
      } else {
        return res.json({ success: true, count: 0, courses: [] });
      }
    }

    const courses = await Course.find(filter)
      .select('_id courseName title')
      .sort({ courseName: 1, title: 1 });

    res.json({
      success: true,
      count: courses.length,
      courses: courses.map((c) => ({
        _id: c._id,
        title: c.courseName || c.title
      }))
    });
  } catch (error) {
    console.error('Get Courses for Enquiry Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching courses for enquiry',
      error: error.message
    });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const courseId = req.params.id || req.body.id;
    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID is required' });
    }

    const course = await Course.findOne({ _id: courseId, ...NOT_DELETED }).populate(
      courseListPopulate
    );
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.json({ success: true, course: formatCourseResponse(course) });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching course',
      error: error.message
    });
  }
};

exports.getCourseBySlug = async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug, ...NOT_DELETED }).populate(
      courseListPopulate
    );
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.json({ success: true, course: formatCourseResponse(course) });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching course',
      error: error.message
    });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Super Admin can delete courses.'
      });
    }

    const course = await Course.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    course.isDeleted = true;
    course.deletedAt = new Date();
    course.status = 'INACTIVE';
    course.isActive = false;
    await course.save();

    res.json({
      success: true,
      message: 'Course deleted successfully (soft delete — enrollments remain linked)'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting course',
      error: error.message
    });
  }
};

exports.getCoursesGrouped = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true, status: 'ACTIVE', ...NOT_DELETED })
      .populate('center', 'name centerName')
      .populate('academicCategory', 'categoryName')
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    const grouped = {};
    for (const course of courses) {
      const centerName = course.center?.centerName || course.center?.name || 'Unknown';
      const catName =
        course.academicCategory?.categoryName || course.category?.name || 'General';
      if (!grouped[centerName]) grouped[centerName] = {};
      if (!grouped[centerName][catName]) grouped[centerName][catName] = [];
      grouped[centerName][catName].push(formatCourseResponse(course));
    }

    res.json({ success: true, grouped });
  } catch (error) {
    console.error('Get grouped courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching grouped courses',
      error: error.message
    });
  }
};
