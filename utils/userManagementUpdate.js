const Center = require('../models/Center');
const Role = require('../models/Role');
const Student = require('../models/Student');
const Employee = require('../models/Employee');
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

  let student = await Student.findOne({ userId });
  if (!student) {
    student = await Student.create({ userId });
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

module.exports = {
  applyAdminAccessUpdate,
  applyUserAccountUpdate,
  applyStudentProfileUpdate,
  applyEmployeeProfileUpdate
};
