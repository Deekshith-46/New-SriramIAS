const mongoose = require('mongoose');
const AdminAccess = require('../models/AdminAccess');
const Role = require('../models/Role');
const Center = require('../models/Center');
const {
  formatAdminAccessForAdmin,
  buildAdminAccessListQuery,
  findActiveAdminAccessByIdPublic
} = require('../utils/adminAccessHelpers');

const pickUpdatableFields = (body) => {
  const payload = {};
  const allowed = [
    'fullName',
    'officialEmail',
    'contactNumber',
    'employeeId',
    'roleId',
    'centerId',
    'accountStatus',
    'twoFactorEnabled',
    'loginAlertEnabled',
    'sessionTimeout'
  ];
  for (const key of allowed) {
    if (body[key] !== undefined) payload[key] = body[key];
  }
  if (payload.officialEmail) {
    payload.officialEmail = String(payload.officialEmail).toLowerCase().trim();
  }
  if (payload.employeeId) {
    payload.employeeId = String(payload.employeeId).toUpperCase().trim();
  }
  if (payload.fullName) payload.fullName = String(payload.fullName).trim();
  if (payload.contactNumber) payload.contactNumber = String(payload.contactNumber).trim();
  return payload;
};

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

exports.createAdminAccess = async (req, res) => {
  try {
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
    } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    const email = String(officialEmail).toLowerCase().trim();
    const empId = String(employeeId).toUpperCase().trim();

    const existingEmail = await AdminAccess.findOne({ officialEmail: email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    const existingEmployee = await AdminAccess.findOne({ employeeId: empId });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID already exists'
      });
    }

    const check = await validateRoleAndCenter(roleId, centerId);
    if (check.error) {
      return res.status(check.error.status).json({
        success: false,
        message: check.error.message
      });
    }

    const admin = await AdminAccess.create({
      fullName: fullName.trim(),
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
      createdBy: req.user._id
    });

    const populated = await findActiveAdminAccessByIdPublic(admin._id);

    res.status(201).json({
      success: true,
      message: 'Admin access created successfully',
      data: formatAdminAccessForAdmin(populated)
    });
  } catch (error) {
    console.error('Create admin access error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(400).json({
        success: false,
        message: field === 'employeeId' ? 'Employee ID already exists' : 'Email already exists'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getAdminAccessList = async (req, res) => {
  try {
    const {
      search = '',
      status,
      roleId,
      centerId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = await buildAdminAccessListQuery({
      search,
      status,
      roleId,
      centerId
    });
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    const allowedSort = ['createdAt', 'fullName', 'officialEmail', 'employeeId'];
    sort[allowedSort.includes(sortBy) ? sortBy : 'createdAt'] =
      sortOrder === 'asc' ? 1 : -1;

    const [admins, total] = await Promise.all([
      AdminAccess.find(query)
        .populate('roleId', 'roleTitle roleCode status')
        .populate('centerId', 'centerName centerCode status')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AdminAccess.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 0,
      count: admins.length,
      data: admins.map(formatAdminAccessForAdmin)
    });
  } catch (error) {
    console.error('Get admin access list error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getAdminAccessById = async (req, res) => {
  try {
    const admin = await findActiveAdminAccessByIdPublic(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    res.json({
      success: true,
      data: formatAdminAccessForAdmin(admin)
    });
  } catch (error) {
    console.error('Get admin access by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateAdminAccess = async (req, res) => {
  try {
    const admin = await AdminAccess.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    const updates = pickUpdatableFields(req.body);

    if (req.body.password) {
      if (req.body.password !== req.body.confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match'
        });
      }
      admin.password = req.body.password;
    }

    if (!Object.keys(updates).length && !req.body.password) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    if (updates.officialEmail) {
      const dup = await AdminAccess.findOne({
        officialEmail: updates.officialEmail,
        _id: { $ne: admin._id }
      });
      if (dup) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
    }

    if (updates.employeeId) {
      const dup = await AdminAccess.findOne({
        employeeId: updates.employeeId,
        _id: { $ne: admin._id }
      });
      if (dup) {
        return res.status(400).json({ success: false, message: 'Employee ID already exists' });
      }
    }

    if (updates.roleId || updates.centerId) {
      const check = await validateRoleAndCenter(
        updates.roleId || admin.roleId,
        updates.centerId || admin.centerId
      );
      if (check.error) {
        return res.status(check.error.status).json({
          success: false,
          message: check.error.message
        });
      }
    }

    Object.assign(admin, updates);
    await admin.save();

    const populated = await findActiveAdminAccessByIdPublic(admin._id);

    res.json({
      success: true,
      message: 'Admin access updated successfully',
      data: formatAdminAccessForAdmin(populated)
    });
  } catch (error) {
    console.error('Update admin access error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Duplicate email or employee ID' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateAdminAccessStatus = async (req, res) => {
  try {
    const { accountStatus } = req.body;

    const admin = await AdminAccess.findByIdAndUpdate(
      req.params.id,
      { accountStatus: !!accountStatus },
      { new: true }
    )
      .populate('roleId', 'roleTitle roleCode status')
      .populate('centerId', 'centerName centerCode status');

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    res.json({
      success: true,
      message: 'Account status updated successfully',
      data: formatAdminAccessForAdmin(admin)
    });
  } catch (error) {
    console.error('Update admin access status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteAdminAccess = async (req, res) => {
  try {
    const admin = await AdminAccess.findByIdAndDelete(req.params.id);

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    res.json({
      success: true,
      message: 'Admin user deleted successfully'
    });
  } catch (error) {
    console.error('Delete admin access error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Dropdown: Mentor Admins only (roleCode = MENTOR_ADMIN)
 * GET /api/admin/admin-access/mentors/dropdown?search=&centerId=
 */
exports.getMentorAdminsDropdown = async (req, res) => {
  try {
    const { search = '', centerId } = req.query;

    const role = await Role.findOne({ roleCode: 'MENTOR_ADMIN', status: 'ACTIVE' })
      .select('_id roleTitle roleCode')
      .lean();

    if (!role) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const query = { roleId: role._id, accountStatus: true };

    if (centerId && mongoose.Types.ObjectId.isValid(centerId)) {
      query.centerId = centerId;
    }

    const term = String(search || '').trim();
    if (term) {
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ fullName: regex }, { officialEmail: regex }, { employeeId: regex }];
    }

    const rows = await AdminAccess.find(query)
      .select('_id fullName officialEmail employeeId centerId roleId accountStatus')
      .populate('centerId', 'centerName centerCode name')
      .populate('roleId', 'roleTitle roleCode')
      .sort({ fullName: 1 })
      .lean();

    res.json({
      success: true,
      count: rows.length,
      data: rows.map((a) => ({
        _id: a._id,
        fullName: a.fullName,
        officialEmail: a.officialEmail,
        employeeId: a.employeeId,
        centerId: a.centerId?._id || a.centerId,
        centerName: a.centerId?.centerName || a.centerId?.name || null,
        centerCode: a.centerId?.centerCode || null,
        roleCode: a.roleId?.roleCode || 'MENTOR_ADMIN',
        roleTitle: a.roleId?.roleTitle || 'Mentor Admin'
      }))
    });
  } catch (error) {
    console.error('Mentor admins dropdown error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
