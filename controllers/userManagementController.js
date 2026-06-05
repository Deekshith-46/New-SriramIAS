const User = require('../models/User');
const AdminAccess = require('../models/AdminAccess');
const Student = require('../models/Student');
const {
  normalizeUserRecord,
  normalizeAdminRecord,
  resolveRoleFilter,
  buildAdminCollectionQueryAsync,
  fetchStudentsForUnifiedList,
  normalizeStudentListRecord,
  getAllUserRolesForDropdown,
  getCreateUserRolesForDropdown,
  getAllUserCentersForDropdown,
  resolveRecordTypeForRequest,
  buildAdminViewSummary
} = require('../utils/userManagementHelpers');
const { getUpdatableFieldsForType } = require('../utils/userManagementFields');
const {
  applyAdminAccessUpdate,
  applyUserAccountUpdate,
  applyStudentProfileUpdate,
  applyEmployeeProfileUpdate
} = require('../utils/userManagementUpdate');
const { createStudentUser, createAdminAccessUser } = require('../utils/userManagementCreate');
const { deleteStudent, ACTIVE_STUDENT } = require('../utils/studentService');
const { applyBatchOnlyStudentUpdate } = require('../utils/userManagementUpdate');

exports.getUnifiedUsers = async (req, res) => {
  try {
    const {
      search = '',
      role,
      center,
      centerId: centerIdQuery,
      status,
      userType,
      recordType,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const centerId = centerIdQuery || center;
    const collectionFilter = recordType || userType;
    const includeUsers =
      !collectionFilter ||
      collectionFilter === 'ALL' ||
      collectionFilter === 'USER' ||
      collectionFilter === 'STUDENT';
    const includeAdmins =
      !collectionFilter || collectionFilter === 'ALL' || collectionFilter === 'ADMIN';

    const roleFilter = await resolveRoleFilter(role);

    let fetchStudents = includeUsers;
    let fetchAdmins = includeAdmins;

    if (role && role !== 'ALL') {
      if (roleFilter.mode === 'STUDENT') {
        fetchAdmins = false;
      } else if (roleFilter.mode === 'ADMIN_ROLE') {
        fetchStudents = false;
      } else if (roleFilter.mode === 'NONE') {
        fetchStudents = false;
        fetchAdmins = false;
      }
    }

    const adminQuery = await buildAdminCollectionQueryAsync({
      search,
      status,
      role,
      centerId,
      roleFilter
    });

    const fetchTasks = [];
    if (fetchStudents) {
      fetchTasks.push(
        fetchStudentsForUnifiedList({ search, status, centerId })
      );
    } else {
      fetchTasks.push(Promise.resolve([]));
    }

    if (fetchAdmins) {
      fetchTasks.push(
        AdminAccess.find(adminQuery)
          .populate('roleId', 'roleTitle roleCode status')
          .populate('centerId', 'centerName centerCode')
          .lean()
      );
    } else {
      fetchTasks.push(Promise.resolve([]));
    }

    const [studentRows, admins] = await Promise.all(fetchTasks);

    let merged = [...studentRows, ...admins.map(normalizeAdminRecord)];

    const sortField = ['createdAt', 'fullName', 'email', 'role', 'status', 'joinedDate'].includes(
      sortBy
    )
      ? sortBy === 'joinedDate'
        ? 'createdAt'
        : sortBy
      : 'createdAt';
    const dir = sortOrder === 'asc' ? 1 : -1;

    merged.sort((a, b) => {
      const av = a[sortField] ?? a.createdAt;
      const bv = b[sortField] ?? b.createdAt;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const start = (pageNum - 1) * limitNum;
    const paginated = merged.slice(start, start + limitNum);

    res.json({
      success: true,
      total: merged.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(merged.length / limitNum) || 0,
      count: paginated.length,
      data: paginated
    });
  } catch (error) {
    console.error('Get unified users error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const isAdminRoleUserType = (userType) =>
  typeof userType === 'string' &&
  userType !== 'STUDENT' &&
  userType !== 'ALL' &&
  /^[a-f0-9]{24}$/i.test(userType);

exports.createUnifiedUser = async (req, res) => {
  try {
    const { userType } = req.body;

    if (userType === 'STUDENT') {
      const result = await createStudentUser(req.body, req.user?._id);
      return res.status(201).json({
        success: true,
        message: 'Student created successfully',
        recordType: result.summary.recordType,
        userType: result.summary.userType,
        createRoleValue: 'STUDENT',
        selectedRole: {
          value: 'STUDENT',
          label: 'Student',
          roleCode: 'STUDENT',
          kind: 'STUDENT'
        },
        summary: result.summary,
        data: result.user,
        studentProfile: result.student
      });
    }

    if (isAdminRoleUserType(userType)) {
      const roleId = req.body.roleId || userType;
      const result = await createAdminAccessUser(
        { ...req.body, roleId },
        req.user?._id
      );
      const roleDoc =
        result.admin?.roleId && typeof result.admin.roleId === 'object'
          ? result.admin.roleId
          : null;

      return res.status(201).json({
        success: true,
        message: 'Admin user created successfully',
        recordType: result.summary.recordType,
        userType: result.summary.userType,
        createRoleValue: userType,
        selectedRole: {
          value: String(roleId),
          label: roleDoc?.roleTitle || result.summary?.role,
          roleCode: roleDoc?.roleCode || result.summary?.roleKey,
          kind: 'ADMIN_ACCESS'
        },
        roleId: String(roleId),
        summary: result.summary,
        data: result.admin
      });
    }

    return res.status(400).json({
      success: false,
      message:
        'userType is required: use STUDENT for students, or a Role _id from GET /api/admin/user-roles. Do not use ALL or ADMIN.'
    });
  } catch (error) {
    console.error('Create unified user error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate email, mobile, or employee ID'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getUpdateFields = async (req, res) => {
  try {
    const type = req.query.type === 'ADMIN' ? 'ADMIN' : 'USER';
    res.json({
      success: true,
      ...getUpdatableFieldsForType(type)
    });
  } catch (error) {
    console.error('Get update fields error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getUserRoles = async (req, res) => {
  try {
    const data = await getAllUserRolesForDropdown();
    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Get user roles error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getUserCenters = async (req, res) => {
  try {
    const data = await getAllUserCentersForDropdown();
    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Get user centers error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Create User form — roles without ALL (use user-roles for list filters) */
exports.getCreateUserRoles = async (req, res) => {
  try {
    const data = await getCreateUserRolesForDropdown();
    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Get create user roles error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteUnifiedUser = async (req, res) => {
  try {
    const typeParam = req.query.recordType || req.query.type;
    const recordType = await resolveRecordTypeForRequest(req.params.id, typeParam);

    if (recordType === 'ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Admin accounts cannot be deleted from this endpoint yet. Deactivate via accountStatus instead.'
      });
    }

    const result = await deleteStudent(req.params.id);
    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    return res.json({
      success: true,
      message: 'Student permanently deleted'
    });
  } catch (error) {
    console.error('Delete unified user error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSingleUser = async (req, res) => {
  try {
    const typeParam = req.query.recordType || req.query.type;
    const recordType = await resolveRecordTypeForRequest(req.params.id, typeParam);

    if (!recordType) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (recordType === 'STUDENT') {
      const student = await Student.findById(req.params.id)
        .populate('centerId', 'centerName centerCode city state name')
        .lean();

      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      const summary = normalizeStudentListRecord(student);

      return res.json({
        success: true,
        userType: summary.userType,
        recordType: summary.recordType,
        summary
      });
    }

    if (recordType === 'ADMIN') {
      const admin = await AdminAccess.findById(req.params.id)
        .select('-password')
        .populate('roleId', 'roleTitle roleCode status')
        .populate('centerId', 'centerName centerCode city state');

      if (!admin) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const summary = buildAdminViewSummary(admin);

      return res.json({
        success: true,
        userType: summary.userType,
        recordType: summary.recordType,
        summary
      });
    }

    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('center', 'centerName centerCode city state name');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role !== 'student') {
      return res.status(400).json({
        success: false,
        message:
          'This account is not a student. Parents and legacy users are not managed here. Use type=ADMIN for AdminAccess records.'
      });
    }

    const studentProfile = await Student.findOne({ userId: user._id, ...ACTIVE_STUDENT }).lean();

    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found or was removed'
      });
    }

    const summary = normalizeStudentListRecord({
      ...studentProfile,
      userId: user
    });

    res.json({
      success: true,
      userType: summary.userType,
      recordType: summary.recordType,
      summary
    });
  } catch (error) {
    console.error('Get single user error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateUnifiedUser = async (req, res) => {
  try {
    const typeParam = req.query.recordType || req.query.type;
    const recordType = await resolveRecordTypeForRequest(req.params.id, typeParam);

    if (!recordType) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (Object.keys(req.body || {}).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body is empty. Send at least one field to update.',
        updatableFields: getUpdatableFieldsForType(recordType === 'ADMIN' ? 'ADMIN' : 'USER')
      });
    }

    if (recordType === 'STUDENT') {
      const student = await Student.findById(req.params.id);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      await applyBatchOnlyStudentUpdate(student, req.body);

      const refreshed = await Student.findById(student._id)
        .populate('centerId', 'centerName centerCode city state name')
        .lean();
      const summary = normalizeStudentListRecord(refreshed);

      return res.json({
        success: true,
        message: 'Student updated successfully',
        userType: summary.userType,
        recordType: summary.recordType,
        summary
      });
    }

    if (recordType === 'ADMIN') {
      const admin = await AdminAccess.findById(req.params.id).select('+password');
      if (!admin) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      await applyAdminAccessUpdate(admin, req.body);
      await admin.save();

      const populated = await AdminAccess.findById(admin._id)
        .select('-password')
        .populate('roleId', 'roleTitle roleCode status')
        .populate('centerId', 'centerName centerCode city state');

      const summary = buildAdminViewSummary(populated);

      return res.json({
        success: true,
        message: 'Admin user updated successfully',
        userType: summary.userType,
        recordType: summary.recordType,
        summary
      });
    }

    const user = await User.findById(req.params.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Only student accounts can be updated with type=USER'
      });
    }

    await applyUserAccountUpdate(user, req.body);
    await user.save();

    const studentProfile = await applyStudentProfileUpdate(user._id, req.body);

    const populated = await User.findById(user._id)
      .select('-password')
      .populate('center', 'centerName centerCode city state name');

    const student =
      studentProfile ||
      (await Student.findOne({ userId: user._id, ...ACTIVE_STUDENT }).lean());

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found or was removed'
      });
    }

    const summary = normalizeStudentListRecord({
      ...student,
      userId: populated
    });

    res.json({
      success: true,
      message: 'Student updated successfully',
      userType: summary.userType,
      recordType: summary.recordType,
      summary
    });
  } catch (error) {
    console.error('Update unified user error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Duplicate email or phone' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
