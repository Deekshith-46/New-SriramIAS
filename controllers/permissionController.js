const Role = require('../models/Role');
const PermissionMatrix = require('../models/PermissionMatrix');
const {
  permissionModules,
  formatMatrixDocument,
  buildRolePermissionSummary,
  getRoleIdFromRequest,
  isSuperAdminRequest
} = require('../utils/permissionHelpers');

exports.getPermissionModuleConfig = async (req, res) => {
  try {
    res.json({
      success: true,
      count: permissionModules.length,
      data: permissionModules.map((m) => ({
        moduleKey: m.moduleKey,
        moduleTitle: m.moduleTitle,
        features: m.features.map((title) => ({
          featureTitle: title,
          featureKey: title.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '')
        }))
      }))
    });
  } catch (error) {
    console.error('Get permission modules error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getPermissionMatrix = async (req, res) => {
  try {
    const { search = '', roleId } = req.query;

    const roleQuery = {};
    if (roleId) {
      roleQuery._id = roleId;
    }
    if (search?.trim()) {
      roleQuery.$or = [
        { roleTitle: { $regex: search.trim(), $options: 'i' } },
        { roleCode: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const roles = await Role.find(roleQuery).sort({ roleTitle: 1 }).lean();
    const data = [];

    for (const role of roles) {
      const matrices = await PermissionMatrix.find({ roleId: role._id }).sort({ moduleKey: 1 });
      data.push(await buildRolePermissionSummary(role, matrices));
    }

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Get permission matrix error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getPermissionMatrixByRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.roleId).lean();
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const matrices = await PermissionMatrix.find({ roleId: role._id }).sort({ moduleKey: 1 });
    res.json({
      success: true,
      data: await buildRolePermissionSummary(role, matrices)
    });
  } catch (error) {
    console.error('Get permission matrix by role error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Logged-in admin: allowed features for sidebar / routes */
exports.getMyPermissions = async (req, res) => {
  try {
    if (isSuperAdminRequest(req)) {
      return res.json({
        success: true,
        isSuperAdmin: true,
        message: 'Full access — super admin bypass',
        data: permissionModules
      });
    }

    const roleId = getRoleIdFromRequest(req);
    if (!roleId) {
      return res.status(403).json({
        success: false,
        message: 'No role linked to this account'
      });
    }

    const matrices = await PermissionMatrix.find({ roleId }).sort({ moduleKey: 1 }).lean();
    const modules = matrices.map((m) => ({
      moduleKey: m.moduleKey,
      moduleTitle: m.moduleTitle,
      features: m.permissions
        .filter((p) => p.allowed)
        .map((p) => ({
          featureKey: p.featureKey,
          featureTitle: p.featureTitle
        }))
    }));

    res.json({
      success: true,
      isSuperAdmin: false,
      roleId,
      data: modules
    });
  } catch (error) {
    console.error('Get my permissions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateFeaturePermission = async (req, res) => {
  try {
    const { featureKey, allowed } = req.body;
    const key = String(featureKey).toUpperCase().trim();

    const matrix = await PermissionMatrix.findById(req.params.permissionId);
    if (!matrix) {
      return res.status(404).json({ success: false, message: 'Permission matrix not found' });
    }

    const feature = matrix.permissions.find((item) => item.featureKey === key);
    if (!feature) {
      return res.status(404).json({ success: false, message: 'Feature not found' });
    }

    feature.allowed = !!allowed;
    await matrix.save();

    res.json({
      success: true,
      message: 'Permission updated',
      data: formatMatrixDocument(matrix)
    });
  } catch (error) {
    console.error('Update feature permission error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.enableAllModulePermissions = async (req, res) => {
  try {
    const matrix = await PermissionMatrix.findById(req.params.permissionId);
    if (!matrix) {
      return res.status(404).json({ success: false, message: 'Permission matrix not found' });
    }

    matrix.permissions.forEach((p) => {
      p.allowed = true;
    });
    await matrix.save();

    res.json({
      success: true,
      message: 'All features enabled for this module',
      data: formatMatrixDocument(matrix)
    });
  } catch (error) {
    console.error('Enable all permissions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.restrictAllModulePermissions = async (req, res) => {
  try {
    const matrix = await PermissionMatrix.findById(req.params.permissionId);
    if (!matrix) {
      return res.status(404).json({ success: false, message: 'Permission matrix not found' });
    }

    matrix.permissions.forEach((p) => {
      p.allowed = false;
    });
    await matrix.save();

    res.json({
      success: true,
      message: 'All features restricted for this module',
      data: formatMatrixDocument(matrix)
    });
  } catch (error) {
    console.error('Restrict all permissions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.resetModulePermissions = async (req, res) => {
  try {
    const matrix = await PermissionMatrix.findById(req.params.permissionId);
    if (!matrix) {
      return res.status(404).json({ success: false, message: 'Permission matrix not found' });
    }

    matrix.permissions.forEach((p) => {
      p.allowed = false;
    });
    await matrix.save();

    res.json({
      success: true,
      message: 'Permissions reset to default (all restricted)',
      data: formatMatrixDocument(matrix)
    });
  } catch (error) {
    console.error('Reset permissions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
