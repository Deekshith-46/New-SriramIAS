const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const BatchEnrollment = require('../models/BatchEnrollment');
const AdminAccess = require('../models/AdminAccess');
const cloudinary = require('../config/cloudinary');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const {
  parsePagination,
  parseSort,
  escapeRegex,
  NOT_DELETED
} = require('../utils/contentMastersHelpers');
const { attachParentDetailsToEnrollments } = require('../utils/studentService');
const {
  parseFees,
  parseObjectIdList,
  parseBannerImage,
  parseBrochure,
  validateBatchDates,
  validateDurationInMonths,
  validateFacultySubjectIds,
  validateActiveCourse,
  validateBatchStatus
} = require('../utils/batchFacultyHelpers');
const {
  generateBatchId,
  generateBatchEnrollmentId
} = require('../utils/contentIdGenerator');
const {
  syncBatchStudentCount,
  formatEnrollment,
  listActiveEnrollmentsForBatch
} = require('../utils/enrollmentErpHelpers');

const resolveMentorIdFromBody = (body) => body.mentorId ?? body.mentor ?? body.mentorAdminId;

const validateMentorAdmin = async (mentorId) => {
  if (!mentorId || !mongoose.Types.ObjectId.isValid(mentorId)) {
    return { ok: false, message: 'Valid mentorId is required' };
  }

  const mentor = await AdminAccess.findOne({ _id: mentorId, accountStatus: true })
    .populate('roleId', 'roleTitle roleCode status')
    .populate('centerId', 'centerName centerCode name status')
    .lean();

  if (!mentor) return { ok: false, message: 'Invalid or inactive mentor' };
  if (mentor.roleId?.status !== 'ACTIVE') return { ok: false, message: 'Mentor role is not active' };
  if (mentor.roleId?.roleCode !== 'MENTOR_ADMIN') {
    return { ok: false, message: 'Selected mentor must be a MENTOR_ADMIN' };
  }

  return { ok: true, mentor };
};

const getBannerFile = (req) => req.files?.bannerImage?.[0];
const getBrochureFile = (req) => req.files?.brochure?.[0];

const resolveBatchBanner = async (req, existing) => {
  const file = getBannerFile(req);
  if (file?.buffer) {
    const uploaded = await uploadToCloudinary(file, 'batches', 'image');
    if (existing?.publicId) {
      try {
        await cloudinary.uploader.destroy(existing.publicId);
      } catch (e) {
        console.warn('Could not delete old batch banner:', e.message);
      }
    }
    return { url: uploaded.url, publicId: uploaded.public_id };
  }
  const parsed = parseBannerImage(req.body.bannerImage);
  if (parsed) return parsed;
  return existing || undefined;
};

const resolveBatchBrochure = async (req, existing) => {
  const file = getBrochureFile(req);
  if (file?.buffer) {
    const uploaded = await uploadToCloudinary(file, 'batches/brochures', 'raw', 'pdf');
    if (existing?.publicId) {
      try {
        await cloudinary.uploader.destroy(existing.publicId, { resource_type: 'raw' });
      } catch (e) {
        console.warn('Could not delete old batch brochure:', e.message);
      }
    }
    return { url: uploaded.url, publicId: uploaded.public_id };
  }
  const parsed = parseBrochure(req.body.brochure);
  if (parsed) return parsed;
  return existing || undefined;
};

const formatBatch = (doc) => ({
  _id: doc._id,
  batchId: doc.batchId,
  batchName: doc.batchName,
  course: doc.course
    ? {
        _id: doc.course._id,
        courseId: doc.course.courseId,
        courseName: doc.course.courseName
      }
    : doc.course,
  commencementDate: doc.commencementDate ?? null,
  durationInMonths: doc.durationInMonths ?? null,
  batchStartDate: doc.batchStartDate ?? null,
  batchEndDate: doc.batchEndDate ?? null,
  bannerImage: doc.bannerImage
    ? { url: doc.bannerImage.url, publicId: doc.bannerImage.publicId }
    : undefined,
  brochure: doc.brochure?.url
    ? { url: doc.brochure.url, publicId: doc.brochure.publicId }
    : undefined,
  fees: doc.fees,
  facultySubjects: (doc.facultySubjects || []).map((fs) => ({
    _id: fs._id,
    facultySubjectId: fs.facultySubjectId,
    subjectName: fs.subjectName
  })),
  mentor: doc.mentor
    ? {
        _id: doc.mentor._id || doc.mentor,
        fullName: doc.mentor.fullName,
        officialEmail: doc.mentor.officialEmail,
        employeeId: doc.mentor.employeeId,
        centerId: doc.mentor.centerId?._id || doc.mentor.centerId,
        centerName: doc.mentor.centerId?.centerName || doc.mentor.centerId?.name || null,
        centerCode: doc.mentor.centerId?.centerCode || null,
        roleCode: doc.mentor.roleId?.roleCode || null,
        roleTitle: doc.mentor.roleId?.roleTitle || null
      }
    : null,
  status: doc.status,
  totalStudents: doc.totalStudents ?? 0,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildBatchQuery = ({ search = '', courseId, status }) => {
  const query = { ...NOT_DELETED };
  if (
    status &&
    ['ACTIVE', 'UPCOMING', 'INACTIVE', 'COMPLETED', 'ARCHIVED', 'CANCELLED'].includes(status)
  ) {
    query.status = status;
  }
  if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
    query.course = new mongoose.Types.ObjectId(courseId);
  }
  const trimmed = String(search ?? '').trim();
  if (trimmed) {
    query.batchName = { $regex: escapeRegex(trimmed), $options: 'i' };
  }
  return query;
};

exports.createBatch = async (req, res) => {
  try {
    const {
      batchName,
      courseId,
      mentorId,
      mentor,
      mentorAdminId,
      commencementDate,
      durationInMonths,
      batchStartDate,
      batchEndDate,
      bannerImage,
      brochure,
      fees,
      feesJson,
      facultySubjects = [],
      status
    } = req.body;

    if (!batchName?.trim()) {
      return res.status(400).json({ success: false, message: 'batchName is required' });
    }

    const mentorValidation = await validateMentorAdmin(
      resolveMentorIdFromBody({ mentorId, mentor, mentorAdminId })
    );
    if (!mentorValidation.ok) {
      return res.status(400).json({ success: false, message: mentorValidation.message });
    }

    const courseValidation = await validateActiveCourse(courseId);
    if (!courseValidation.ok) {
      return res.status(400).json({ success: false, message: courseValidation.message });
    }

    const facultyList = parseObjectIdList(
      facultySubjects.length ? facultySubjects : req.body.facultySubjectIds
    );
    const fsValidation = await validateFacultySubjectIds(facultyList);
    if (!fsValidation.ok) {
      return res.status(400).json({ success: false, message: fsValidation.message });
    }

    const datesValidation = validateBatchDates({
      commencementDate,
      batchStartDate,
      batchEndDate
    });
    if (!datesValidation.ok) {
      return res.status(400).json({ success: false, message: datesValidation.message });
    }

    const durValidation = validateDurationInMonths(durationInMonths);
    if (!durValidation.ok) {
      return res.status(400).json({ success: false, message: durValidation.message });
    }

    const statusValidation = validateBatchStatus(status);
    if (!statusValidation.ok) {
      return res.status(400).json({ success: false, message: statusValidation.message });
    }

    const parsedFees = parseFees({ fees, feesJson });
    if (!parsedFees.ok) {
      return res.status(400).json({ success: false, message: parsedFees.message });
    }

    const resolvedBanner = (await resolveBatchBanner(req, parseBannerImage(bannerImage))) || undefined;
    const resolvedBrochure = (await resolveBatchBrochure(req, parseBrochure(brochure))) || undefined;

    const batch = await Batch.create({
      batchId: await generateBatchId(),
      batchName: batchName.trim(),
      course: courseValidation.course._id,
      mentor: mentorValidation.mentor._id,
      commencementDate: datesValidation.commencementDate,
      durationInMonths: durValidation.value,
      batchStartDate: datesValidation.batchStartDate,
      batchEndDate: datesValidation.batchEndDate,
      bannerImage: resolvedBanner,
      brochure: resolvedBrochure,
      fees: parsedFees.value,
      facultySubjects: fsValidation.facultySubjects,
      status: statusValidation.value,
      totalStudents: 0
    });

    const populated = await Batch.findById(batch._id)
      .populate('course', 'courseId courseName')
      .populate('facultySubjects', 'facultySubjectId subjectName')
      .populate({
        path: 'mentor',
        select: 'fullName officialEmail employeeId centerId roleId accountStatus',
        populate: [
          { path: 'centerId', select: 'centerName centerCode name' },
          { path: 'roleId', select: 'roleTitle roleCode status' }
        ]
      })
      .lean();

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: formatBatch(populated)
    });
  } catch (error) {
    console.error('Create batch error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getBatches = async (req, res) => {
  try {
    const query = buildBatchQuery({
      search: req.query.search ?? req.query.q ?? '',
      courseId: req.query.courseId,
      status: req.query.status
    });
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ['createdAt', 'batchName', 'batchId', 'status']);

    const [rows, total] = await Promise.all([
      Batch.find(query)
        .populate('course', 'courseId courseName')
        .populate('facultySubjects', 'facultySubjectId subjectName')
        .populate({
          path: 'mentor',
          select: 'fullName officialEmail employeeId centerId roleId',
          populate: [
            { path: 'centerId', select: 'centerName centerCode name' },
            { path: 'roleId', select: 'roleTitle roleCode status' }
          ]
        })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Batch.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map(formatBatch)
    });
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findOne({ _id: req.params.id, ...NOT_DELETED })
      .populate('course', 'courseId courseName')
      .populate('facultySubjects', 'facultySubjectId subjectName')
      .populate({
        path: 'mentor',
        select: 'fullName officialEmail employeeId centerId roleId',
        populate: [
          { path: 'centerId', select: 'centerName centerCode name' },
          { path: 'roleId', select: 'roleTitle roleCode status' }
        ]
      })
      .lean();
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const [totalStudents, enrollments] = await Promise.all([
      syncBatchStudentCount(batch._id),
      listActiveEnrollmentsForBatch(batch._id)
    ]);
    batch.totalStudents = totalStudents;

    const data = formatBatch(batch);
    const studentRows = enrollments.map((enrollment) =>
      formatEnrollment(enrollment, { includeBatch: false })
    );
    data.students = await attachParentDetailsToEnrollments(studentRows);
    data.studentCount = data.students.length;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get batch by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateBatch = async (req, res) => {
  try {
    const batch = await Batch.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const updates = {};

    if (
      req.body.mentorId !== undefined ||
      req.body.mentor !== undefined ||
      req.body.mentorAdminId !== undefined
    ) {
      const nextMentorId = resolveMentorIdFromBody(req.body);
      const mentorValidation = await validateMentorAdmin(nextMentorId);
      if (!mentorValidation.ok) {
        return res.status(400).json({ success: false, message: mentorValidation.message });
      }
      updates.mentor = mentorValidation.mentor._id;
    }

    if (req.body.batchName !== undefined) {
      if (!String(req.body.batchName).trim()) {
        return res.status(400).json({ success: false, message: 'batchName cannot be empty' });
      }
      updates.batchName = String(req.body.batchName).trim();
    }

    if (req.body.courseId !== undefined || req.body.course !== undefined) {
      const nextCourseId = req.body.courseId ?? req.body.course;
      const courseValidation = await validateActiveCourse(nextCourseId);
      if (!courseValidation.ok) {
        return res.status(400).json({ success: false, message: courseValidation.message });
      }
      updates.course = courseValidation.course._id;
    }

    if (req.body.facultySubjects !== undefined || req.body.facultySubjectIds !== undefined) {
      const next = parseObjectIdList(req.body.facultySubjects ?? req.body.facultySubjectIds);
      const fsValidation = await validateFacultySubjectIds(next);
      if (!fsValidation.ok) {
        return res.status(400).json({ success: false, message: fsValidation.message });
      }
      updates.facultySubjects = fsValidation.facultySubjects;
    }

    if (
      req.body.commencementDate !== undefined ||
      req.body.batchStartDate !== undefined ||
      req.body.batchEndDate !== undefined
    ) {
      const datesValidation = validateBatchDates({
        commencementDate: req.body.commencementDate ?? batch.commencementDate,
        batchStartDate: req.body.batchStartDate ?? batch.batchStartDate,
        batchEndDate: req.body.batchEndDate ?? batch.batchEndDate
      });
      if (!datesValidation.ok) {
        return res.status(400).json({ success: false, message: datesValidation.message });
      }
      updates.commencementDate = datesValidation.commencementDate;
      updates.batchStartDate = datesValidation.batchStartDate;
      updates.batchEndDate = datesValidation.batchEndDate;
    }

    if (req.body.durationInMonths !== undefined) {
      const durValidation = validateDurationInMonths(req.body.durationInMonths);
      if (!durValidation.ok) {
        return res.status(400).json({ success: false, message: durValidation.message });
      }
      updates.durationInMonths = durValidation.value;
    }

    if (req.body.fees !== undefined || req.body.feesJson !== undefined) {
      const parsedFees = parseFees({ fees: req.body.fees, feesJson: req.body.feesJson });
      if (!parsedFees.ok) {
        return res.status(400).json({ success: false, message: parsedFees.message });
      }
      updates.fees = parsedFees.value;
    }

    if (req.body.status !== undefined) {
      const statusValidation = validateBatchStatus(req.body.status);
      if (!statusValidation.ok) {
        return res.status(400).json({ success: false, message: statusValidation.message });
      }
      updates.status = statusValidation.value;
    }

    if (getBannerFile(req) || req.body.bannerImage !== undefined) {
      updates.bannerImage = await resolveBatchBanner(req, batch.bannerImage);
    }

    if (getBrochureFile(req) || req.body.brochure !== undefined) {
      updates.brochure = await resolveBatchBrochure(req, batch.brochure);
    }

    await Batch.findByIdAndUpdate(batch._id, { $set: updates });

    const updated = await Batch.findById(batch._id)
      .populate('course', 'courseId courseName')
      .populate('facultySubjects', 'facultySubjectId subjectName')
      .populate({
        path: 'mentor',
        select: 'fullName officialEmail employeeId centerId roleId',
        populate: [
          { path: 'centerId', select: 'centerName centerCode name' },
          { path: 'roleId', select: 'roleTitle roleCode status' }
        ]
      })
      .lean();

    res.json({ success: true, message: 'Batch updated successfully', data: formatBatch(updated) });
  } catch (error) {
    console.error('Update batch error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateBatchStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const statusValidation = validateBatchStatus(status);
    if (!statusValidation.ok) {
      return res.status(400).json({ success: false, message: statusValidation.message });
    }

    const batch = await Batch.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { status: statusValidation.value },
      { new: true }
    )
      .populate('course', 'courseId courseName')
      .populate('facultySubjects', 'facultySubjectId subjectName')
      .populate({
        path: 'mentor',
        select: 'fullName officialEmail employeeId centerId roleId',
        populate: [
          { path: 'centerId', select: 'centerName centerCode name' },
          { path: 'roleId', select: 'roleTitle roleCode status' }
        ]
      })
      .lean();

    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    res.json({ success: true, message: 'Batch status updated', data: formatBatch(batch) });
  } catch (error) {
    console.error('Update batch status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    batch.isDeleted = true;
    batch.deletedAt = new Date();
    batch.status = 'INACTIVE';
    await batch.save();

    res.json({ success: true, message: 'Batch deleted successfully', data: { _id: batch._id } });
  } catch (error) {
    console.error('Delete batch error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const formatBatchQuickView = (doc, totalStudents) => ({
  batchId: doc.batchId,
  batchName: doc.batchName,
  linkedCourse: doc.course
    ? {
        _id: doc.course._id,
        courseId: doc.course.courseId,
        courseName: doc.course.courseName
      }
    : null,
  dateOfCommencement: doc.commencementDate ?? null,
  durationInMonths: doc.durationInMonths ?? null,
  batchStartDate: doc.batchStartDate ?? null,
  batchEndDate: doc.batchEndDate ?? null,
  status: doc.status,
  createdOn: doc.createdAt,
  modifiedOn: doc.updatedAt,
  linkedSubjects: (doc.facultySubjects || []).map((fs) => ({
    _id: fs._id,
    facultySubjectId: fs.facultySubjectId,
    subjectName: fs.subjectName,
    categories: fs.categories || []
  })),
  currency: doc.fees?.currency || 'INR',
  onlinePaymentAmount: doc.fees?.onlineAmount ?? 0,
  offlinePaymentAmount: doc.fees?.offlineAmount ?? 0,
  discountAmount: doc.fees?.discountAmount ?? 0,
  onlineBulletPoints: doc.fees?.onlineBulletPoints || [],
  offlineBulletPoints: doc.fees?.offlineBulletPoints || [],
  bannerImage: doc.bannerImage
    ? { url: doc.bannerImage.url, publicId: doc.bannerImage.publicId }
    : null,
  brochure: doc.brochure?.url
    ? { url: doc.brochure.url, publicId: doc.brochure.publicId }
    : null,
  totalStudents
});

exports.getBatchQuickView = async (req, res) => {
  try {
    const batch = await Batch.findOne({ _id: req.params.id, ...NOT_DELETED })
      .populate('course', 'courseId courseName')
      .populate('facultySubjects', 'facultySubjectId subjectName categories')
      .populate({
        path: 'mentor',
        select: 'fullName officialEmail employeeId centerId roleId',
        populate: [
          { path: 'centerId', select: 'centerName centerCode name' },
          { path: 'roleId', select: 'roleTitle roleCode status' }
        ]
      })
      .lean();

    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const totalStudents = await syncBatchStudentCount(batch._id);

    res.json({
      success: true,
      data: formatBatchQuickView(batch, totalStudents)
    });
  } catch (error) {
    console.error('Get batch quick view error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getBatchesDropdown = async (req, res) => {
  try {
    const { courseId, facultySubjectId, excludeBatchId, status } = req.query;
    const query = { ...NOT_DELETED };

    if (status && ['ACTIVE', 'UPCOMING', 'INACTIVE', 'COMPLETED'].includes(status)) {
      query.status = status;
    } else {
      query.status = 'ACTIVE';
    }

    if (facultySubjectId && mongoose.Types.ObjectId.isValid(facultySubjectId)) {
      query.facultySubjects = new mongoose.Types.ObjectId(facultySubjectId);
    }

    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      query.course = new mongoose.Types.ObjectId(courseId);
    }
    if (excludeBatchId && mongoose.Types.ObjectId.isValid(excludeBatchId)) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeBatchId) };
    }

    const rows = await Batch.find(query)
      .select('_id batchId batchName')
      .sort({ batchName: 1 })
      .lean();

    res.json({
      success: true,
      data: rows.map((row) => ({
        _id: row._id,
        batchId: row.batchId || '',
        batchName: row.batchName || ''
      }))
    });
  } catch (error) {
    console.error('Get batches dropdown error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.duplicateBatch = async (req, res) => {
  try {
    const source = await Batch.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!source) return res.status(404).json({ success: false, message: 'Batch not found' });

    const body = req.body || {};
    // Default behavior: copy students as well (enterprise expectation for "Duplicate Batch")
    // Only skip if explicitly set to false.
    const includeStudents = !(
      body.includeStudents === false ||
      body.includeStudents === 'false' ||
      body.includeStudents === 0 ||
      body.includeStudents === '0'
    );

    const nextBatchName =
      body.batchName?.trim() || `${source.batchName} (Copy)`;

    const courseId = body.courseId ?? body.course ?? source.course;
    const courseValidation = await validateActiveCourse(courseId);
    if (!courseValidation.ok) {
      return res.status(400).json({ success: false, message: courseValidation.message });
    }

    const facultyList = parseObjectIdList(body.facultySubjects ?? body.facultySubjectIds);
    const facultyIds =
      facultyList.length > 0 ? facultyList : source.facultySubjects.map(String);
    const fsValidation = await validateFacultySubjectIds(facultyIds);
    if (!fsValidation.ok) {
      return res.status(400).json({ success: false, message: fsValidation.message });
    }

    const datesValidation = validateBatchDates({
      commencementDate: body.commencementDate ?? source.commencementDate,
      batchStartDate: body.batchStartDate ?? source.batchStartDate,
      batchEndDate: body.batchEndDate ?? source.batchEndDate
    });
    if (!datesValidation.ok) {
      return res.status(400).json({ success: false, message: datesValidation.message });
    }

    const durValidation = validateDurationInMonths(
      body.durationInMonths !== undefined ? body.durationInMonths : source.durationInMonths
    );
    if (!durValidation.ok) {
      return res.status(400).json({ success: false, message: durValidation.message });
    }

    const statusValidation = validateBatchStatus(body.status, 'UPCOMING');
    if (!statusValidation.ok) {
      return res.status(400).json({ success: false, message: statusValidation.message });
    }

    let fees = source.fees;
    if (body.fees !== undefined || body.feesJson !== undefined) {
      const parsedFees = parseFees({ fees: body.fees, feesJson: body.feesJson });
      if (!parsedFees.ok) {
        return res.status(400).json({ success: false, message: parsedFees.message });
      }
      fees = parsedFees.value;
    }

    // Banner for duplicate:
    // - if a new bannerImage file is provided, upload it (do NOT delete source banner)
    // - else if bannerImage JSON provided, use it
    // - else copy source.bannerImage (url/publicId)
    let bannerImage = source.bannerImage?.url
      ? { url: source.bannerImage.url, publicId: source.bannerImage.publicId || '' }
      : undefined;

    if (getBannerFile(req)?.buffer) {
      const uploaded = await uploadToCloudinary(getBannerFile(req), 'batches', 'image');
      bannerImage = { url: uploaded.url, publicId: uploaded.public_id };
    } else if (body.bannerImage !== undefined) {
      const parsed = parseBannerImage(body.bannerImage);
      if (parsed) bannerImage = parsed;
    }

    let brochure = source.brochure?.url
      ? { url: source.brochure.url, publicId: source.brochure.publicId || '' }
      : undefined;

    if (getBrochureFile(req)?.buffer) {
      const uploaded = await uploadToCloudinary(
        getBrochureFile(req),
        'batches/brochures',
        'raw',
        'pdf'
      );
      brochure = { url: uploaded.url, publicId: uploaded.public_id };
    } else if (body.brochure !== undefined) {
      const parsed = parseBrochure(body.brochure);
      if (parsed) brochure = parsed;
    }

    const duplicate = await Batch.create({
      batchId: await generateBatchId(),
      batchName: nextBatchName,
      course: courseValidation.course._id,
      commencementDate: datesValidation.commencementDate,
      durationInMonths: durValidation.value,
      batchStartDate: datesValidation.batchStartDate,
      batchEndDate: datesValidation.batchEndDate,
      bannerImage,
      brochure,
      fees,
      facultySubjects: fsValidation.facultySubjects,
      status: statusValidation.value,
      totalStudents: 0
    });

    let studentsCopied = 0;
    if (includeStudents) {
      const activeEnrollments = await BatchEnrollment.find({
        batch: source._id,
        status: 'ACTIVE',
        ...NOT_DELETED
      }).lean();

      for (const enrollment of activeEnrollments) {
        const exists = await BatchEnrollment.findOne({
          student: enrollment.student,
          batch: duplicate._id,
          status: 'ACTIVE',
          ...NOT_DELETED
        }).lean();
        if (exists) continue;

        await BatchEnrollment.create({
          enrollmentId: await generateBatchEnrollmentId(),
          student: enrollment.student,
          batch: duplicate._id,
          course: duplicate.course,
          paymentStatus: enrollment.paymentStatus,
          attendancePercentage: enrollment.attendancePercentage,
          courseProgressPercentage: enrollment.courseProgressPercentage,
          enrollmentDate: new Date(),
          status: 'ACTIVE'
        });
        studentsCopied += 1;
      }
      await syncBatchStudentCount(duplicate._id);
    }

    const populated = await Batch.findById(duplicate._id)
      .populate('course', 'courseId courseName')
      .populate('facultySubjects', 'facultySubjectId subjectName')
      .lean();

    res.status(201).json({
      success: true,
      message: includeStudents
        ? `Batch duplicated with ${studentsCopied} student(s) copied`
        : 'Batch duplicated successfully (students not copied)',
      studentsCopied,
      data: formatBatch(populated)
    });
  } catch (error) {
    console.error('Duplicate batch error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
