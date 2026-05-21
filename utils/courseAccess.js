const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

const ACTIVE_ENROLLMENT_STATUSES = ['active', 'pending'];

const getActiveEnrollment = async (userId, courseId) => {
  return Enrollment.findOne({
    userId,
    courseId,
    status: { $in: ACTIVE_ENROLLMENT_STATUSES },
    isDeleted: false,
    accessBlocked: { $ne: true }
  });
};

const isEnrollmentAccessValid = (enrollment) => {
  if (!enrollment) return false;

  const now = new Date();
  if (enrollment.accessEndsAt && now > enrollment.accessEndsAt) return false;
  if (enrollment.validUntil && now > enrollment.validUntil) return false;

  return true;
};

const assertEnrollmentAccess = async (req, res, courseId) => {
  const enrollment = await getActiveEnrollment(req.user._id, courseId);

  if (!enrollment || !isEnrollmentAccessValid(enrollment)) {
    res.status(403).json({
      success: false,
      message: 'Access denied. You are not enrolled in this course or access has expired.'
    });
    return null;
  }

  return enrollment;
};

const getCourseForAdmin = async (req, res, courseId) => {
  const course = await Course.findById(courseId);

  if (!course) {
    res.status(404).json({ success: false, message: 'Course not found' });
    return null;
  }

  if (req.user.role === 'center_admin') {
    const userCenter = req.user.center?.toString();
    const courseCenter = course.center?.toString();

    if (!userCenter || userCenter !== courseCenter) {
      res.status(403).json({
        success: false,
        message: 'You can only manage content for your own center courses'
      });
      return null;
    }
  }

  return course;
};

const parseJsonField = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

module.exports = {
  ACTIVE_ENROLLMENT_STATUSES,
  getActiveEnrollment,
  isEnrollmentAccessValid,
  assertEnrollmentAccess,
  getCourseForAdmin,
  parseJsonField
};
