const Center = require('../models/Center');
const Role = require('../models/Role');
const User = require('../models/User');
const Student = require('../models/Student');
const Employee = require('../models/Employee');
const { NOT_DELETED } = require('./contentMastersHelpers');
const {
  ensureStudentProfileForUser,
  assertStudentContactAvailable,
  ACTIVE_STUDENT
} = require('./studentService');
const { SESSION_TIMEOUTS } = require('../models/AdminAccess');

const applyAdminAccessUpdate = async (admin, body) => {
  const {
    fullName,
    officialEmail,
    contactNumber,
    employeeId,
    roleId,
    centerId,
    password,
    confirmPassword,
    accountStatus,
    twoFactorEnabled,
    loginAlertEnabled,
    sessionTimeout,
    lastLoginAt
  } = body;

  if (password !== undefined) {
    if (password !== confirmPassword) {
      const err = new Error('Passwords do not match');
      err.statusCode = 400;
      throw err;
    }
    if (String(password).length < 6) {
      const err = new Error('Password must be at least 6 characters');
      err.statusCode = 400;
      throw err;
    }
    admin.password = password;
  }

  if (fullName !== undefined) admin.fullName = String(fullName).trim();
  if (officialEmail !== undefined) admin.officialEmail = String(officialEmail).toLowerCase().trim();
  if (contactNumber !== undefined) admin.contactNumber = String(contactNumber).trim();
  if (employeeId !== undefined) admin.employeeId = String(employeeId).toUpperCase().trim();

  if (accountStatus !== undefined) admin.accountStatus = !!accountStatus;
  if (twoFactorEnabled !== undefined) admin.twoFactorEnabled = !!twoFactorEnabled;
  if (loginAlertEnabled !== undefined) admin.loginAlertEnabled = !!loginAlertEnabled;

  if (sessionTimeout !== undefined) {
    if (!SESSION_TIMEOUTS.includes(sessionTimeout)) {
      const err = new Error(`sessionTimeout must be one of: ${SESSION_TIMEOUTS.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    admin.sessionTimeout = sessionTimeout;
  }

  if (lastLoginAt !== undefined) {
    admin.lastLoginAt = lastLoginAt === null || lastLoginAt === '' ? null : new Date(lastLoginAt);
  }

  if (roleId !== undefined) {
    const role = await Role.findById(roleId);
    if (!role) {
      const err = new Error('Role not found');
      err.statusCode = 404;
      throw err;
    }
    if (role.status === 'INACTIVE') {
      const err = new Error('Cannot assign an inactive role');
      err.statusCode = 400;
      throw err;
    }
    admin.roleId = roleId;
  }

  if (centerId !== undefined) {
    const center = await Center.findOne({ _id: centerId, isDeleted: false });
    if (!center) {
      const err = new Error('Center not found');
      err.statusCode = 404;
      throw err;
    }
    admin.centerId = centerId;
  }
};

const applyUserAccountUpdate = async (user, body) => {
  const name = body.name ?? body.fullName;
  const mobile = body.mobile ?? body.phoneNumber ?? body.contactNumber;
  const active = body.isActive ?? body.accountStatus;
  const centerRef = body.centerId ?? body.center;

  const { email, password, confirmPassword, role, location } = body;

  if (password !== undefined) {
    if (password !== confirmPassword) {
      const err = new Error('Passwords do not match');
      err.statusCode = 400;
      throw err;
    }
    if (String(password).length < 6) {
      const err = new Error('Password must be at least 6 characters');
      err.statusCode = 400;
      throw err;
    }
    user.password = password;
  }

  if (name !== undefined) user.name = String(name).trim();
  if (email !== undefined) user.email = String(email).toLowerCase().trim();
  if (mobile !== undefined) user.mobile = String(mobile).trim();
  if (active !== undefined) user.isActive = !!active;

  if (role !== undefined) {
    const allowed = ['super_admin', 'center_admin', 'employee', 'student', 'parent'];
    if (!allowed.includes(role)) {
      const err = new Error(`role must be one of: ${allowed.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    user.role = role;
  }

  if (location !== undefined) {
    const allowedLoc = ['Hyderabad', 'New Delhi', 'Pune'];
    if (location !== null && location !== '' && !allowedLoc.includes(location)) {
      const err = new Error(`location must be one of: ${allowedLoc.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    user.location = location || undefined;
  }

  if (centerRef !== undefined) {
    if (centerRef === null || centerRef === '') {
      user.center = null;
    } else {
      const center = await Center.findOne({ _id: centerRef, isDeleted: false });
      if (!center) {
        const err = new Error('Center not found');
        err.statusCode = 404;
        throw err;
      }
      user.center = centerRef;
      if (center.city && !body.location) {
        user.location = center.city;
      }
    }
  }

  if (user.role === 'student') {
    const student = await Student.findOne({ userId: user._id, ...ACTIVE_STUDENT });
    if (student) {
      const nextEmail = email !== undefined ? user.email : student.email;
      const nextMobile = mobile !== undefined ? user.mobile : student.mobileNumber;
      const dup = await assertStudentContactAvailable({
        email: nextEmail,
        mobileNumber: nextMobile,
        excludeId: student._id
      });
      if (!dup.ok) {
        const err = new Error(dup.message);
        err.statusCode = 409;
        throw err;
      }
      if (name !== undefined) student.studentName = user.name;
      if (email !== undefined) student.email = user.email;
      if (mobile !== undefined) student.mobileNumber = user.mobile;
      if (centerRef !== undefined) student.centerId = user.center || null;
      await student.save();
    }
  }
};

const applyStudentProfileUpdate = async (userId, body) => {
  const {
    parentName,
    parentMobile,
    parentEmail,
    parentMobileVerified,
    parentEmailVerified
  } = body;

  const hasStudentFields = [
    parentName,
    parentMobile,
    parentEmail,
    parentMobileVerified,
    parentEmailVerified
  ].some((v) => v !== undefined);

  if (!hasStudentFields) return null;

  let student = await Student.findOne({ userId, ...ACTIVE_STUDENT });
  if (!student) {
    const user = await User.findById(userId);
    if (!user) return null;
    await ensureStudentProfileForUser(user, {
      parentName,
      parentEmail,
      parentMobile
    });
    student = await Student.findOne({ userId, ...ACTIVE_STUDENT });
    if (!student) return null;
  }

  if (parentName !== undefined) student.parentName = String(parentName).trim();
  if (parentMobile !== undefined) student.parentMobile = String(parentMobile).trim();
  if (parentEmail !== undefined) {
    student.parentEmail = String(parentEmail).toLowerCase().trim();
    if (body.parentEmailVerified === undefined) {
      student.parentEmailVerified = false;
    }
  }
  if (parentMobileVerified !== undefined) {
    student.parentMobileVerified = !!parentMobileVerified;
  }
  if (parentEmailVerified !== undefined) {
    student.parentEmailVerified = !!parentEmailVerified;
  }

  await student.save();
  return student;
};

const applyEmployeeProfileUpdate = async (userId, body) => {
  const permissions = body.permissions ?? body.employeePermissions;
  const empCenter = body.employeeCenter ?? body.center;

  if (permissions === undefined && empCenter === undefined) return null;

  let employee = await Employee.findOne({ userId });
  if (!employee) {
    employee = await Employee.create({ userId });
  }

  if (permissions !== undefined) {
    employee.permissions = Array.isArray(permissions) ? permissions : [];
  }

  if (empCenter !== undefined) {
    const allowed = ['Hyderabad', 'New Delhi', 'Pune'];
    if (empCenter !== null && empCenter !== '' && !allowed.includes(empCenter)) {
      const err = new Error(`employee center must be one of: ${allowed.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    employee.center = empCenter || undefined;
  }

  await employee.save();
  return employee;
};

/** Batch-only student (no portal User) — update master Student row */
const applyBatchOnlyStudentUpdate = async (student, body) => {
  const name = body.name ?? body.fullName ?? body.studentName;
  const email = body.email;
  const mobile = body.mobile ?? body.phoneNumber ?? body.mobileNumber;
  const centerRef = body.centerId ?? body.center;
  const active = body.isActive ?? body.accountStatus ?? body.status;

  if (name !== undefined) student.studentName = String(name).trim();

  const nextEmail = email !== undefined ? String(email).toLowerCase().trim() : student.email;
  const nextMobile =
    mobile !== undefined ? String(mobile).trim() : student.mobileNumber;

  if (email !== undefined || mobile !== undefined) {
    const dup = await assertStudentContactAvailable({
      email: nextEmail,
      mobileNumber: nextMobile,
      excludeId: student._id
    });
    if (!dup.ok) {
      const err = new Error(dup.message);
      err.statusCode = 409;
      throw err;
    }
    if (email !== undefined) student.email = nextEmail;
    if (mobile !== undefined) student.mobileNumber = nextMobile;
  }

  if (centerRef !== undefined) {
    if (centerRef === null || centerRef === '') {
      student.centerId = null;
    } else {
      const center = await Center.findOne({ _id: centerRef, isDeleted: false });
      if (!center) {
        const err = new Error('Center not found');
        err.statusCode = 404;
        throw err;
      }
      student.centerId = centerRef;
    }
  }

  if (active !== undefined) {
    const isActive =
      active === true ||
      active === 'ACTIVE' ||
      active === 'active' ||
      active === 1;
    student.status = isActive ? 'ACTIVE' : 'INACTIVE';
  }

  const parentFields = [
    'parentName',
    'parentMobile',
    'parentEmail',
    'parentMobileVerified',
    'parentEmailVerified'
  ];
  if (parentFields.some((k) => body[k] !== undefined)) {
    if (body.parentName !== undefined) student.parentName = String(body.parentName).trim();
    if (body.parentMobile !== undefined) student.parentMobile = String(body.parentMobile).trim();
    if (body.parentEmail !== undefined) {
      student.parentEmail = String(body.parentEmail).toLowerCase().trim();
    }
    if (body.parentMobileVerified !== undefined) {
      student.parentMobileVerified = !!body.parentMobileVerified;
    }
    if (body.parentEmailVerified !== undefined) {
      student.parentEmailVerified = !!body.parentEmailVerified;
    }
  }

  await student.save();
};

module.exports = {
  applyAdminAccessUpdate,
  applyUserAccountUpdate,
  applyStudentProfileUpdate,
  applyEmployeeProfileUpdate,
  applyBatchOnlyStudentUpdate
};
