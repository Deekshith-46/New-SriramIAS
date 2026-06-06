/**
 * Users & Access → List Users is a Student Management module for mutations.
 * List/view remain available for all user types.
 */

const MODULE_KEY = 'STUDENT_MANAGEMENT';

const MESSAGES = Object.freeze({
  MODIFY_BLOCKED: 'Only student accounts can be modified from this module',
  DELETE_BLOCKED: 'Only student accounts can be deleted from Users & Access'
});

const User = require('../models/User');

const canModifyStudentRecord = (record) => {
  if (!record) return false;
  if (record.recordType === 'ADMIN') return false;
  if (record.recordType === 'STUDENT') return true;
  if (record.recordType === 'USER') {
    return (
      record.userType === 'STUDENT' ||
      record.roleKey === 'student' ||
      record.role === 'Student'
    );
  }
  return false;
};

const isStudentManageableRecord = (recordType) =>
  recordType === 'STUDENT' || recordType === 'USER';

const assertStudentRecordAction = async (id, recordType, action = 'modify') => {
  const message =
    action === 'delete' ? MESSAGES.DELETE_BLOCKED : MESSAGES.MODIFY_BLOCKED;

  if (recordType === 'ADMIN') {
    return { allowed: false, status: 403, message };
  }

  if (recordType === 'STUDENT') {
    return { allowed: true };
  }

  if (recordType === 'USER') {
    const user = await User.findById(id).select('role').lean();
    if (!user) {
      return { allowed: false, status: 404, message: 'User not found' };
    }
    if (user.role !== 'student') {
      return { allowed: false, status: 403, message };
    }
    return { allowed: true };
  }

  return { allowed: false, status: 404, message: 'User not found' };
};

const attachModulePermissions = (record) => {
  if (!record) return record;

  const canModify = canModifyStudentRecord(record);

  return {
    ...record,
    permissions: {
      canView: true,
      canEdit: canModify,
      canDelete: canModify,
      editDisabledReason: canModify ? null : MESSAGES.MODIFY_BLOCKED,
      deleteDisabledReason: canModify ? null : MESSAGES.DELETE_BLOCKED
    }
  };
};

/** Strip admin/role fields — POST /users always creates STUDENT. */
const sanitizeStudentCreatePayload = (body = {}) => {
  const payload = { ...body };

  delete payload.userType;
  delete payload.role;
  delete payload.roleId;
  delete payload.officialEmail;
  delete payload.employeeId;
  delete payload.password;
  delete payload.confirmPassword;
  delete payload.accountStatus;
  delete payload.twoFactorEnabled;
  delete payload.loginAlertEnabled;
  delete payload.sessionTimeout;
  delete payload.contactNumber;

  if (payload.status === undefined) {
    payload.status = true;
  }

  return payload;
};

const wasNonStudentRoleRequested = (body = {}) => {
  const { userType, role, roleId } = body;
  if (role || roleId) return true;
  if (!userType || userType === 'STUDENT') return false;
  return userType !== 'STUDENT';
};

const getStudentCreateRoles = () => [
  {
    value: 'STUDENT',
    label: 'Student',
    roleCode: 'STUDENT',
    kind: 'STUDENT',
    locked: true
  }
];

const getModuleConfig = () => ({
  module: MODULE_KEY,
  listUsersLabel: 'List Users',
  createFormLabel: 'Create Student',
  createAllowedRoles: ['STUDENT'],
  modifyAllowedRecordTypes: ['USER', 'STUDENT'],
  viewAllowedRecordTypes: ['USER', 'STUDENT', 'ADMIN'],
  messages: MESSAGES
});

module.exports = {
  MODULE_KEY,
  MESSAGES,
  canModifyStudentRecord,
  isStudentManageableRecord,
  assertStudentRecordAction,
  attachModulePermissions,
  sanitizeStudentCreatePayload,
  wasNonStudentRoleRequested,
  getStudentCreateRoles,
  getModuleConfig
};
