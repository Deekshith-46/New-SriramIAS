const Role = require('../models/Role');
const {
  formatRoleForAdmin,
  buildRoleListQuery,
  findRoleById
} = require('../utils/roleHelpers');
const {
  createPermissionMatrixForRole,
  deletePermissionMatrixForRole
} = require('../utils/permissionHelpers');

const pickUpdatableFields = (body) => {
  const payload = {};
  if (body.roleTitle !== undefined) payload.roleTitle = String(body.roleTitle).trim();
  if (body.roleCode !== undefined) payload.roleCode = String(body.roleCode).toUpperCase().trim();
  if (body.status !== undefined) payload.status = body.status;
  return payload;
};

exports.createRole = async (req, res) => {
  try {
    const { roleTitle, roleCode, status } = req.body;

    if (!roleTitle?.trim()) {
      return res.status(400).json({ success: false, message: 'Role title is required' });
    }
    if (!roleCode?.trim()) {
      return res.status(400).json({ success: false, message: 'Role code is required' });
    }

    const code = String(roleCode).toUpperCase().trim();
    const existing = await Role.findOne({ roleCode: code });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Role code already exists'
      });
    }

    const role = await Role.create({
      roleTitle: roleTitle.trim(),
      roleCode: code,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      createdBy: req.user._id
    });

    await createPermissionMatrixForRole(role._id);

    res.status(201).json({
      success: true,
      message: 'Role created successfully. Permission matrix generated.',
      data: formatRoleForAdmin(role)
    });
  } catch (error) {
    console.error('Create role error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Role code already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getRoles = async (req, res) => {
  try {
    const {
      search = '',
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = buildRoleListQuery({ search, status });
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    const allowedSort = ['createdAt', 'roleTitle', 'roleCode', 'status'];
    sort[allowedSort.includes(sortBy) ? sortBy : 'createdAt'] =
      sortOrder === 'asc' ? 1 : -1;

    const [roles, total] = await Promise.all([
      Role.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
      Role.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 0,
      count: roles.length,
      data: roles.map(formatRoleForAdmin)
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getRoleById = async (req, res) => {
  try {
    const role = await findRoleById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    res.json({
      success: true,
      data: formatRoleForAdmin(role)
    });
  } catch (error) {
    console.error('Get role by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const role = await findRoleById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const updates = pickUpdatableFields(req.body);
    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    if (updates.roleCode) {
      const duplicate = await Role.findOne({
        roleCode: updates.roleCode,
        _id: { $ne: role._id }
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Role code already exists' });
      }
    }

    if (updates.status && !['ACTIVE', 'INACTIVE'].includes(updates.status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be ACTIVE or INACTIVE'
      });
    }

    Object.assign(role, updates);
    await role.save();

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: formatRoleForAdmin(role)
    });
  } catch (error) {
    console.error('Update role error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Role code already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateRoleStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be ACTIVE or INACTIVE'
      });
    }

    const role = await findRoleById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    role.status = status;
    await role.save();

    res.json({
      success: true,
      message: 'Role status updated successfully',
      data: formatRoleForAdmin(role)
    });
  } catch (error) {
    console.error('Update role status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const role = await findRoleById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    await deletePermissionMatrixForRole(role._id);
    await Role.findByIdAndDelete(role._id);

    res.json({
      success: true,
      message: 'Role and permission matrix deleted successfully'
    });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Active roles for dropdowns (Phase 2: assign to users) */
exports.getRolesDropdown = async (req, res) => {
  try {
    const roles = await Role.find({ status: 'ACTIVE' })
      .select('roleTitle roleCode')
      .sort({ roleTitle: 1 })
      .lean();

    res.json({
      success: true,
      count: roles.length,
      data: roles.map((r) => ({
        _id: r._id,
        roleTitle: r.roleTitle,
        roleCode: r.roleCode
      }))
    });
  } catch (error) {
    console.error('Roles dropdown error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
