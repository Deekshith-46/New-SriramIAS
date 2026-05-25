const AdminAccess = require('../models/AdminAccess');
const Role = require('../models/Role');
const Center = require('../models/Center');

const escapeRegex = (term) =>
  new RegExp(String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

const formatAdminAccessForAdmin = (doc) => {
  const a = doc?.toObject ? doc.toObject() : { ...doc };
  const role = a.roleId && typeof a.roleId === 'object' ? a.roleId : null;
  const center = a.centerId && typeof a.centerId === 'object' ? a.centerId : null;

  return {
    _id: a._id,
    fullName: a.fullName,
    officialEmail: a.officialEmail,
    contactNumber: a.contactNumber,
    employeeId: a.employeeId,
    roleId: role?._id || a.roleId,
    roleTitle: role?.roleTitle || null,
    roleCode: role?.roleCode || null,
    centerId: center?._id || a.centerId,
    centerName: center?.centerName || center?.name || null,
    centerCode: center?.centerCode || null,
    accountStatus: a.accountStatus !== false,
    twoFactorEnabled: !!a.twoFactorEnabled,
    loginAlertEnabled: !!a.loginAlertEnabled,
    sessionTimeout: a.sessionTimeout || '1_HOUR',
    lastLoginAt: a.lastLoginAt || null,
    createdBy: a.createdBy || null,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt
  };
};

const findRoleIdsBySearch = async (term) => {
  const regex = escapeRegex(term);
  const roles = await Role.find({
    $or: [{ roleTitle: regex }, { roleCode: regex }]
  })
    .select('_id')
    .lean();
  return roles.map((r) => r._id);
};

const findCenterIdsBySearch = async (term) => {
  const regex = escapeRegex(term);
  const centers = await Center.find({
    isDeleted: false,
    $or: [{ centerName: regex }, { centerCode: regex }, { name: regex }]
  })
    .select('_id')
    .lean();
  return centers.map((c) => c._id);
};

/** One search box: matches full name, email, employee ID, role, or center */
const buildAdminAccessListQuery = async ({
  search = '',
  status,
  roleId,
  centerId
} = {}) => {
  const query = {};

  if (status === 'ACTIVE') {
    query.accountStatus = true;
  }
  if (status === 'INACTIVE') {
    query.accountStatus = false;
  }

  if (roleId) {
    query.roleId = roleId;
  }

  if (centerId) {
    query.centerId = centerId;
  }

  const term = String(search).trim();
  if (!term) {
    return query;
  }

  const regex = escapeRegex(term);
  const [roleIds, centerIds] = await Promise.all([
    findRoleIdsBySearch(term),
    findCenterIdsBySearch(term)
  ]);

  const orConditions = [
    { fullName: regex },
    { officialEmail: regex },
    { employeeId: regex },
    { contactNumber: regex }
  ];

  if (roleIds.length) {
    orConditions.push({ roleId: { $in: roleIds } });
  }
  if (centerIds.length) {
    orConditions.push({ centerId: { $in: centerIds } });
  }

  query.$or = orConditions;
  return query;
};

const findActiveAdminAccessById = (id) =>
  AdminAccess.findById(id)
    .select('+password')
    .populate('roleId', 'roleTitle roleCode status')
    .populate('centerId', 'centerName centerCode status isDeleted');

const findActiveAdminAccessByIdPublic = (id) =>
  AdminAccess.findById(id)
    .populate('roleId', 'roleTitle roleCode status')
    .populate('centerId', 'centerName centerCode status');

const findAdminAccessByEmail = (email) =>
  AdminAccess.findOne({
    officialEmail: String(email).toLowerCase().trim()
  })
    .select('+password')
    .populate('roleId', 'roleTitle roleCode status')
    .populate('centerId', 'centerName centerCode status isDeleted');

module.exports = {
  formatAdminAccessForAdmin,
  buildAdminAccessListQuery,
  findActiveAdminAccessById,
  findActiveAdminAccessByIdPublic,
  findAdminAccessByEmail
};
