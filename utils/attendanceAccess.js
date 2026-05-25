const Enrollment = require('../models/Enrollment');
const Parent = require('../models/Parent');
const Student = require('../models/Student');
const Employee = require('../models/Employee');
const Center = require('../models/Center');
const { ACTIVE_ENROLLMENT_STATUSES, isEnrollmentAccessValid } = require('./courseAccess');

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const getMonthRange = (year, month) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
};

const getPrimaryEnrollment = async (studentUserId, courseId = null) => {
  const filter = {
    userId: studentUserId,
    status: { $in: ACTIVE_ENROLLMENT_STATUSES },
    isDeleted: false,
    accessBlocked: { $ne: true }
  };

  if (courseId) filter.courseId = courseId;

  const enrollment = await Enrollment.findOne(filter).sort({ createdAt: -1 }).lean();

  if (!enrollment || !isEnrollmentAccessValid(enrollment)) return null;
  return enrollment;
};

const getParentStudentUserId = async (parentUserId) => {
  const link = await Parent.findOne({ userId: parentUserId }).lean();
  if (!link?.studentId) return null;

  const studentRef = link.studentId;
  if (studentRef.userId) {
    return studentRef.userId;
  }

  const studentProfile = await Student.findById(studentRef).lean();
  return studentProfile?.userId ?? null;
};

const getEmployeeCenterIds = async (employeeUserId) => {
  const employee = await Employee.findOne({ userId: employeeUserId }).lean();
  if (!employee?.center) return [];

  const centers = await Center.find({
    isDeleted: false,
    $or: [
      { centerName: employee.center },
      { name: employee.center },
      { city: employee.center }
    ]
  })
    .select('_id')
    .lean();
  return centers.map((c) => c._id.toString());
};

const studentHasEnrollmentInCenters = async (studentUserId, centerIds) => {
  if (!centerIds.length) return false;

  const count = await Enrollment.countDocuments({
    userId: studentUserId,
    centerId: { $in: centerIds },
    status: { $in: ACTIVE_ENROLLMENT_STATUSES },
    isDeleted: false
  });

  return count > 0;
};

const getRequestUserId = (user) => user?._id || user?.id;

const resolveTargetStudentId = async (req) => {
  const userId = getRequestUserId(req.user);
  if (!userId) {
    return { error: 'Authenticated user id not found' };
  }

  const { role } = req.user;
  const queryStudentId = req.query?.studentId || req.body?.studentId;

  if (role === 'student') {
    return userId.toString();
  }

  if (role === 'parent') {
    const childUserId = await getParentStudentUserId(userId);
    if (!childUserId) {
      return { error: 'No linked student found for this parent account' };
    }
    if (queryStudentId && queryStudentId.toString() !== childUserId.toString()) {
      return { error: 'Access denied for this student' };
    }
    return childUserId.toString();
  }

  if (!queryStudentId) {
    return { error: 'studentId query parameter is required' };
  }

  return queryStudentId.toString();
};

const assertCanViewStudentAttendance = async (req, res, studentUserId) => {
  if (!studentUserId) {
    res.status(400).json({ success: false, message: 'Invalid studentId' });
    return false;
  }

  const { role, center } = req.user;
  const userId = getRequestUserId(req.user);

  if (role === 'student') {
    if (userId.toString() !== studentUserId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return false;
    }
    return true;
  }

  if (role === 'parent') {
    const childUserId = await getParentStudentUserId(userId);
    if (!childUserId || childUserId.toString() !== studentUserId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return false;
    }
    return true;
  }

  if (role === 'super_admin') {
    return true;
  }

  if (role === 'center_admin') {
    if (!center) {
      res.status(403).json({ success: false, message: 'Center not assigned to your account' });
      return false;
    }
    const ok = await studentHasEnrollmentInCenters(studentUserId, [center.toString()]);
    if (!ok) {
      res.status(403).json({ success: false, message: 'Access denied for this student' });
      return false;
    }
    return true;
  }

  if (role === 'employee') {
    const centerIds = await getEmployeeCenterIds(userId);
    const ok = await studentHasEnrollmentInCenters(studentUserId, centerIds);
    if (!ok) {
      res.status(403).json({ success: false, message: 'Access denied for this student' });
      return false;
    }
    return true;
  }

  res.status(403).json({ success: false, message: 'Access denied' });
  return false;
};

const formatTimeLabel = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

module.exports = {
  startOfDay,
  endOfDay,
  getMonthRange,
  getPrimaryEnrollment,
  getParentStudentUserId,
  resolveTargetStudentId,
  assertCanViewStudentAttendance,
  formatTimeLabel
};
