const AdminAccess = require('../models/AdminAccess');
const Role = require('../models/Role');
const Center = require('../models/Center');
const { findActiveAdminAccessByIdPublic } = require('./adminAccessHelpers');
const {
  normalizeAdminRecord,
  normalizeStudentListRecord
} = require('./userManagementHelpers');
const { createStudentWithUser } = require('./studentService');

const validateRoleAndCenter = async (roleId, centerId) => {
  const role = await Role.findById(roleId);
  if (!role) {
    return { error: { status: 404, message: 'Role not found' } };
  }
  if (role.status !== 'ACTIVE') {
    return { error: { status: 400, message: 'Role is not active' } };
  }

  const center = await Center.findOne({ _id: centerId, isDeleted: false });
  if (!center) {
    return { error: { status: 404, message: 'Center not found' } };
  }
  if (center.status === 'DISABLED') {
    return { error: { status: 400, message: 'Center is disabled' } };
  }

  return { role, center };
};

const createStudentUser = async (body, createdBy) => {
  const { user, student } = await createStudentWithUser(body);

  return {
    user,
    student,
    summary: normalizeStudentListRecord({
      ...student,
      userId: user
    })
  };
};

const createAdminAccessUser = async (body, createdBy) => {
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
    sessionTimeout
  } = body;

  if (password !== confirmPassword) {
    const err = new Error('Passwords do not match');
    err.statusCode = 400;
    throw err;
  }

  const email = String(officialEmail).toLowerCase().trim();
  const empId = String(employeeId).toUpperCase().trim();

  const existingEmail = await AdminAccess.findOne({ officialEmail: email });
  if (existingEmail) {
    const err = new Error('Email already exists');
    err.statusCode = 400;
    throw err;
  }

  const existingEmployee = await AdminAccess.findOne({ employeeId: empId });
  if (existingEmployee) {
    const err = new Error('Employee ID already exists');
    err.statusCode = 400;
    throw err;
  }

  const check = await validateRoleAndCenter(roleId, centerId);
  if (check.error) {
    const err = new Error(check.error.message);
    err.statusCode = check.error.status;
    throw err;
  }

  const admin = await AdminAccess.create({
    fullName: String(fullName).trim(),
    officialEmail: email,
    contactNumber: String(contactNumber).trim(),
    employeeId: empId,
    roleId,
    centerId,
    password,
    accountStatus: accountStatus !== false,
    twoFactorEnabled: !!twoFactorEnabled,
    loginAlertEnabled: !!loginAlertEnabled,
    sessionTimeout: sessionTimeout || '1_HOUR',
    createdBy: createdBy || null
  });

  const populated = await findActiveAdminAccessByIdPublic(admin._id);

  return {
    admin: populated,
    summary: normalizeAdminRecord(populated)
  };
};

module.exports = {
  createStudentUser,
  createAdminAccessUser
};
