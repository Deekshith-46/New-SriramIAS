const AcademicStudent = require('../models/AcademicStudent');
const BatchEnrollment = require('../models/BatchEnrollment');
const Batch = require('../models/Batch');
const Course = require('../models/Course');
const { isValidObjectId } = require('./contentIdGenerator');
const { NOT_DELETED } = require('./contentMastersHelpers');
const {
  PAYMENT_STATUSES,
  ENROLLMENT_STATUSES
} = require('./enrollmentErpConstants');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeMobile = (mobile) => String(mobile || '').trim().replace(/\s+/g, '');

const validatePaymentStatus = (status) => {
  if (!status) return { ok: true, value: 'PENDING' };
  const upper = String(status).trim().toUpperCase();
  if (!PAYMENT_STATUSES.includes(upper)) {
    return {
      ok: false,
      message: `paymentStatus must be one of: ${PAYMENT_STATUSES.join(', ')}`
    };
  }
  return { ok: true, value: upper };
};

const validateEnrollmentStatus = (status) => {
  if (!status) return { ok: true, value: 'ACTIVE' };
  const upper = String(status).trim().toUpperCase();
  if (!ENROLLMENT_STATUSES.includes(upper)) {
    return {
      ok: false,
      message: `status must be one of: ${ENROLLMENT_STATUSES.join(', ')}`
    };
  }
  return { ok: true, value: upper };
};

const validatePercent = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: 0 };
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return { ok: false, message: `${fieldName} must be between 0 and 100` };
  }
  return { ok: true, value: Math.round(n * 100) / 100 };
};

const findStudentByEmailOrMobile = async ({ email, mobileNumber }) => {
  const emailNorm = normalizeEmail(email);
  const mobileNorm = normalizeMobile(mobileNumber);

  if (!emailNorm && !mobileNorm) {
    return null;
  }

  const or = [];
  if (emailNorm) or.push({ email: emailNorm });
  if (mobileNorm) or.push({ mobileNumber: mobileNorm });

  return AcademicStudent.findOne({
    ...NOT_DELETED,
    $or: or
  }).lean();
};

const validateActiveBatch = async (batchId) => {
  if (!isValidObjectId(batchId)) {
    return { ok: false, message: 'Invalid batch id' };
  }
  const batch = await Batch.findOne({
    _id: batchId,
    isDeleted: { $ne: true },
    status: { $in: ['ACTIVE', 'UPCOMING'] }
  }).lean();
  if (!batch) {
    return { ok: false, message: 'Invalid or inactive batch' };
  }
  return { ok: true, batch };
};

const validateCourseForBatch = async (courseId, batch) => {
  if (!isValidObjectId(courseId)) {
    return { ok: false, message: 'Invalid course id' };
  }
  const course = await Course.findOne({
    _id: courseId,
    status: 'ACTIVE',
    ...NOT_DELETED
  }).lean();
  if (!course) {
    return { ok: false, message: 'Invalid or inactive course' };
  }
  if (String(course._id) !== String(batch.course)) {
    return {
      ok: false,
      message: 'Selected course does not match the batch course'
    };
  }
  return { ok: true, course };
};

const assertNoActiveEnrollment = async (studentId, batchId, excludeEnrollmentId = null) => {
  const filter = {
    student: studentId,
    batch: batchId,
    status: 'ACTIVE',
    ...NOT_DELETED
  };
  if (excludeEnrollmentId) {
    filter._id = { $ne: excludeEnrollmentId };
  }
  const existing = await BatchEnrollment.findOne(filter).lean();
  if (existing) {
    return {
      ok: false,
      message: 'Student already has an active enrollment in this batch'
    };
  }
  return { ok: true };
};

const syncBatchStudentCount = async (batchId) => {
  const count = await BatchEnrollment.countDocuments({
    batch: batchId,
    status: 'ACTIVE',
    ...NOT_DELETED
  });
  await Batch.findByIdAndUpdate(batchId, { totalStudents: count });
  return count;
};

const ENROLLMENT_POPULATE = [
  { path: 'student', select: 'studentId studentName email mobileNumber status createdAt updatedAt' },
  { path: 'batch', select: 'batchId batchName course status' },
  { path: 'course', select: 'courseId courseName' }
];

const formatEnrollment = (doc, { includeBatch = true } = {}) => ({
  _id: doc._id,
  enrollmentId: doc.enrollmentId,
  student: doc.student
    ? {
        _id: doc.student._id,
        studentId: doc.student.studentId,
        studentName: doc.student.studentName,
        email: doc.student.email,
        mobileNumber: doc.student.mobileNumber,
        status: doc.student.status,
        createdAt: doc.student.createdAt,
        updatedAt: doc.student.updatedAt
      }
    : doc.student,
  batch:
    includeBatch && doc.batch
      ? {
          _id: doc.batch._id,
          batchId: doc.batch.batchId,
          batchName: doc.batch.batchName
        }
      : includeBatch
        ? doc.batch
        : undefined,
  course: doc.course
    ? {
        _id: doc.course._id,
        courseId: doc.course.courseId,
        courseName: doc.course.courseName
      }
    : doc.course,
  paymentStatus: doc.paymentStatus,
  attendancePercentage: doc.attendancePercentage ?? 0,
  courseProgressPercentage: doc.courseProgressPercentage ?? 0,
  enrollmentDate: doc.enrollmentDate,
  status: doc.status,
  transferredFrom: doc.transferredFrom || null,
  transferredTo: doc.transferredTo || null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const listActiveEnrollmentsForBatch = async (batchId) =>
  BatchEnrollment.find({
    batch: batchId,
    status: 'ACTIVE',
    ...NOT_DELETED
  })
    .populate(ENROLLMENT_POPULATE)
    .sort({ enrollmentDate: -1 })
    .lean();

/** Resolve enrollment by MongoDB _id or display id (e.g. ENR-2024-2201). */
const findEnrollmentByRef = async (ref, { activeOnly = false } = {}) => {
  const filter = { ...NOT_DELETED };
  if (activeOnly) filter.status = 'ACTIVE';

  const id = String(ref || '').trim();
  if (!id) return null;

  if (isValidObjectId(id)) {
    return BatchEnrollment.findOne({ _id: id, ...filter });
  }
  return BatchEnrollment.findOne({ enrollmentId: id, ...filter });
};

module.exports = {
  normalizeEmail,
  normalizeMobile,
  validatePaymentStatus,
  validateEnrollmentStatus,
  validatePercent,
  findStudentByEmailOrMobile,
  validateActiveBatch,
  validateCourseForBatch,
  assertNoActiveEnrollment,
  syncBatchStudentCount,
  findEnrollmentByRef,
  ENROLLMENT_POPULATE,
  formatEnrollment,
  listActiveEnrollmentsForBatch,
  PAYMENT_STATUSES
};
