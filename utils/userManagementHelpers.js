const Role = require('../models/Role');
const Student = require('../models/Student');
const Center = require('../models/Center');
const User = require('../models/User');
const AdminAccess = require('../models/AdminAccess');

const escapeRegex = (term) =>
  new RegExp(String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

const formatJoinedDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 10);
};

const buildStudentDetails = (student) => {
  if (!student) {
    return {
      parentName: null,
      parentEmail: null,
      parentMobile: null
    };
  }
  return {
    parentName: student.parentName || null,
    parentEmail: student.parentEmail || null,
    parentMobile: student.parentMobile || null
  };
};

const normalizeUserRecord = (user, studentProfile = null) => {
  const center = user.center;
  const centerName =
    center && typeof center === 'object'
      ? center.centerName || center.name
      : null;

  return {
    id: user._id,
    fullName: user.name,
    email: user.email || null,
    phoneNumber: user.mobile || null,
    role: 'Student',
    roleType: 'STUDENT',
    roleKey: 'student',
    center: centerName || user.location || '-',
    centerId: center?._id || user.center || null,
    status: user.isActive ? 'ACTIVE' : 'INACTIVE',
    userType: 'STUDENT',
    recordType: 'USER',
    joinedDate: formatJoinedDate(user.createdAt),
    createdAt: user.createdAt,
    studentDetails: buildStudentDetails(studentProfile)
  };
};

const normalizeAdminRecord = (admin) => {
  const roleCode = admin.roleId?.roleCode || null;

  return {
    id: admin._id,
    fullName: admin.fullName,
    email: admin.officialEmail,
    phoneNumber: admin.contactNumber,
    role: admin.roleId?.roleTitle || 'Admin',
    roleType: roleCode || 'ADMIN',
    roleKey: roleCode,
    roleId: admin.roleId?._id || admin.roleId,
    center: admin.centerId?.centerName || admin.centerId?.name || '-',
    centerId: admin.centerId?._id || admin.centerId,
    status: admin.accountStatus ? 'ACTIVE' : 'INACTIVE',
    userType: roleCode || 'UNKNOWN',
    recordType: 'ADMIN',
    joinedDate: formatJoinedDate(admin.createdAt),
    createdAt: admin.createdAt
  };
};

/** View / edit screen — list fields plus admin-only form fields (no raw MongoDB doc) */
const buildAdminViewSummary = (admin) => {
  const base = normalizeAdminRecord(admin);
  const center =
    admin.centerId && typeof admin.centerId === 'object' ? admin.centerId : null;
  const role = admin.roleId && typeof admin.roleId === 'object' ? admin.roleId : null;

  return {
    ...base,
    employeeId: admin.employeeId,
    accountStatus: admin.accountStatus !== false,
    twoFactorEnabled: !!admin.twoFactorEnabled,
    loginAlertEnabled: !!admin.loginAlertEnabled,
    sessionTimeout: admin.sessionTimeout || '1_HOUR',
    centerCode: center?.centerCode || null,
    city: center?.city || null,
    state: center?.state || null,
    roleStatus: role?.status || null
  };
};

/**
 * GET/PUT ?type= or ?recordType=
 * - USER / ADMIN → collection
 * - STUDENT → USER collection
 * - CONTENT_ADMIN, SUPER_ADMIN, … → ADMIN collection (role code from list row)
 */
const resolveRecordTypeQuery = (typeOrRecordType) => {
  const value = typeOrRecordType;
  if (!value) return null;
  if (value === 'USER' || value === 'ADMIN') return value;
  if (value === 'STUDENT') return 'USER';
  if (value === 'ALL') return null;
  return 'ADMIN';
};

const resolveRecordTypeById = async (id) => {
  const [admin, user] = await Promise.all([
    AdminAccess.findById(id).select('_id').lean(),
    User.findById(id).select('_id role').lean()
  ]);

  if (admin) return 'ADMIN';
  if (user) return 'USER';
  return null;
};

const resolveRecordTypeForRequest = async (id, typeOrRecordType) => {
  const fromQuery = resolveRecordTypeQuery(typeOrRecordType);
  if (fromQuery) return fromQuery;
  return resolveRecordTypeById(id);
};

/**
 * role query param:
 * - ALL / omitted → both students + admins
 * - STUDENT → User(role=student) only
 * - <Role._id> → AdminAccess with that roleId only
 */
const resolveRoleFilter = async (role) => {
  if (!role || role === 'ALL') {
    return { mode: 'ALL' };
  }

  if (role === 'STUDENT') {
    return { mode: 'STUDENT' };
  }

  if (!/^[a-f0-9]{24}$/i.test(role)) {
    return { mode: 'NONE' };
  }

  const roleDoc = await Role.findById(role).select('roleCode roleTitle').lean();
  if (!roleDoc) {
    return { mode: 'NONE' };
  }

  return {
    mode: 'ADMIN_ROLE',
    roleId: role,
    roleCode: roleDoc.roleCode,
    roleTitle: roleDoc.roleTitle
  };
};

/** Unified list: only platform students from User (never parent / legacy admin User rows) */
const buildUserCollectionQuery = ({ search, status, centerId }) => {
  const query = { role: 'student' };

  if (status === 'ACTIVE') query.isActive = true;
  if (status === 'INACTIVE') query.isActive = false;

  if (centerId && centerId !== 'ALL') {
    query.center = centerId;
  }

  const term = String(search).trim();
  if (term) {
    const regex = escapeRegex(term);
    if (/^student$/i.test(term)) {
      return query;
    }
    query.$or = [{ name: regex }, { email: regex }, { mobile: regex }];
  }

  return query;
};

const buildAdminCollectionQueryAsync = async ({
  search,
  status,
  role,
  centerId,
  roleFilter
}) => {
  const query = {};

  if (status === 'ACTIVE') query.accountStatus = true;
  if (status === 'INACTIVE') query.accountStatus = false;

  if (centerId && centerId !== 'ALL') {
    query.centerId = centerId;
  }

  if (roleFilter?.mode === 'ADMIN_ROLE' && roleFilter.roleId) {
    query.roleId = roleFilter.roleId;
  } else if (role && role !== 'ALL' && role !== 'STUDENT') {
    query._id = { $exists: false };
  }

  const term = String(search).trim();
  if (term) {
    const regex = escapeRegex(term);
    const roleMatches = await Role.find({
      $or: [{ roleTitle: regex }, { roleCode: regex }]
    }).select('_id');
    const roleIds = roleMatches.map((r) => r._id);

    query.$or = [
      { fullName: regex },
      { officialEmail: regex },
      { contactNumber: regex },
      { employeeId: regex }
    ];
    if (roleIds.length) {
      query.$or.push({ roleId: { $in: roleIds } });
    }
  }

  return query;
};

const attachStudentProfiles = async (users) => {
  if (!users.length) return new Map();
  const ids = users.map((u) => u._id);
  const profiles = await Student.find({ userId: { $in: ids } }).lean();
  return new Map(profiles.map((p) => [String(p.userId), p]));
};

/** Center filter dropdown for List Users page: ALL + active operational centers */
const getAllUserCentersForDropdown = async () => {
  const centers = await Center.find({
    isDeleted: false,
    status: 'ACTIVE'
  })
    .select('centerName centerCode city state name')
    .sort({ centerName: 1 })
    .lean();

  return [
    { value: 'ALL', label: 'All Centers' },
    ...centers.map((c) => ({
      value: c._id.toString(),
      label: c.centerName || c.name,
      centerCode: c.centerCode,
      city: c.city,
      state: c.state
    }))
  ];
};

/** Role filter dropdown: ALL + STUDENT (platform) + dynamic Role Management roles */
const getAllUserRolesForDropdown = async () => {
  const roles = await Role.find()
    .select('roleTitle roleCode status')
    .sort({ roleTitle: 1 })
    .lean();

  const dynamicRoles = roles.map((r) => ({
    value: r._id.toString(),
    label: r.roleTitle,
    roleCode: r.roleCode,
    status: r.status
  }));

  return [
    { value: 'ALL', label: 'All Roles' },
    {
      value: 'STUDENT',
      label: 'Student',
      roleCode: 'STUDENT'
    },
    ...dynamicRoles
  ];
};

/**
 * Create User page dropdown only — no ALL, no ADMIN.
 * userType in POST /api/admin/users = value from this list.
 */
const getCreateUserRolesForDropdown = async () => {
  const roles = await Role.find({ status: 'ACTIVE' })
    .select('roleTitle roleCode status')
    .sort({ roleTitle: 1 })
    .lean();

  return [
    {
      value: 'STUDENT',
      label: 'Student',
      roleCode: 'STUDENT',
      kind: 'STUDENT'
    },
    ...roles.map((r) => ({
      value: r._id.toString(),
      label: r.roleTitle,
      roleCode: r.roleCode,
      status: r.status,
      kind: 'ADMIN_ACCESS'
    }))
  ];
};

module.exports = {
  normalizeUserRecord,
  normalizeAdminRecord,
  resolveRoleFilter,
  buildUserCollectionQuery,
  buildAdminCollectionQueryAsync,
  attachStudentProfiles,
  getAllUserRolesForDropdown,
  getCreateUserRolesForDropdown,
  getAllUserCentersForDropdown,
  resolveRecordTypeQuery,
  resolveRecordTypeById,
  resolveRecordTypeForRequest,
  buildAdminViewSummary,
  formatJoinedDate,
  buildStudentDetails
};
