const permissionModules = require('../config/permissionModules');
const PermissionMatrix = require('../models/PermissionMatrix');
const Role = require('../models/Role');

const toFeatureKey = (title) =>
  String(title)
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');

const buildPermissionsFromModule = (moduleDef) =>
  moduleDef.features.map((feature) => ({
    featureKey: toFeatureKey(feature),
    featureTitle: feature,
    allowed: false
  }));

const countFeatureStats = (permissions = []) => {
  const list = permissions || [];
  const allowedCount = list.filter((p) => p.allowed).length;
  return {
    totalFeatures: list.length,
    allowedCount,
    restrictedCount: list.length - allowedCount
  };
};

const formatMatrixDocument = (doc) => {
  const m = doc?.toObject ? doc.toObject() : { ...doc };
  const stats = countFeatureStats(m.permissions);
  return {
    _id: m._id,
    roleId: m.roleId,
    moduleKey: m.moduleKey,
    moduleTitle: m.moduleTitle,
    ...stats,
    permissions: m.permissions
  };
};

const createPermissionMatrixForRole = async (roleId) => {
  const existing = await PermissionMatrix.find({ roleId }).select('moduleKey').lean();
  const existingKeys = new Set(existing.map((e) => e.moduleKey));

  const rows = [];
  for (const moduleDef of permissionModules) {
    if (existingKeys.has(moduleDef.moduleKey)) continue;

    rows.push({
      roleId,
      moduleKey: moduleDef.moduleKey,
      moduleTitle: moduleDef.moduleTitle,
      permissions: buildPermissionsFromModule(moduleDef)
    });
  }

  if (rows.length) {
    await PermissionMatrix.insertMany(rows);
  }

  await syncNewFeaturesForRole(roleId);
  return PermissionMatrix.find({ roleId }).sort({ moduleKey: 1 });
};

/** Add new features from config to existing module rows without removing custom toggles */
const syncNewFeaturesForRole = async (roleId) => {
  for (const moduleDef of permissionModules) {
    const row = await PermissionMatrix.findOne({ roleId, moduleKey: moduleDef.moduleKey });
    if (!row) continue;

    const existingKeys = new Set(row.permissions.map((p) => p.featureKey));
    let changed = false;

    for (const feature of moduleDef.features) {
      const featureKey = toFeatureKey(feature);
      if (!existingKeys.has(featureKey)) {
        row.permissions.push({
          featureKey,
          featureTitle: feature,
          allowed: false
        });
        changed = true;
      }
    }

    if (changed) {
      await row.save();
    }
  }
};

const deletePermissionMatrixForRole = async (roleId) => {
  await PermissionMatrix.deleteMany({ roleId });
};

const syncPermissionMatrixForAllRoles = async () => {
  const roles = await Role.find().select('_id roleCode').lean();
  for (const role of roles) {
    await createPermissionMatrixForRole(role._id);
  }
};

const buildRolePermissionSummary = async (role, matrices) => {
  const modules = matrices.map(formatMatrixDocument);
  const totals = modules.reduce(
    (acc, m) => {
      acc.allowedCount += m.allowedCount;
      acc.restrictedCount += m.restrictedCount;
      acc.totalFeatures += m.totalFeatures;
      return acc;
    },
    { allowedCount: 0, restrictedCount: 0, totalFeatures: 0 }
  );

  return {
    role: {
      _id: role._id,
      roleTitle: role.roleTitle,
      roleCode: role.roleCode,
      status: role.status
    },
    ...totals,
    modules
  };
};

const getRoleIdFromRequest = (req) => {
  if (req.adminAccess?.roleId) {
    const r = req.adminAccess.roleId;
    return r._id || r;
  }
  return req.user?.roleId || null;
};

const getRoleCodeFromRequest = (req) => {
  if (req.user?.role === 'super_admin') return 'SUPER_ADMIN';
  const populated = req.adminAccess?.roleId;
  if (populated && typeof populated === 'object' && populated.roleCode) {
    return populated.roleCode;
  }
  return req.user?.roleCode || null;
};

const isSuperAdminRequest = (req) => getRoleCodeFromRequest(req) === 'SUPER_ADMIN';

module.exports = {
  permissionModules,
  toFeatureKey,
  buildPermissionsFromModule,
  countFeatureStats,
  formatMatrixDocument,
  createPermissionMatrixForRole,
  deletePermissionMatrixForRole,
  syncPermissionMatrixForAllRoles,
  syncNewFeaturesForRole,
  buildRolePermissionSummary,
  getRoleIdFromRequest,
  getRoleCodeFromRequest,
  isSuperAdminRequest
};
