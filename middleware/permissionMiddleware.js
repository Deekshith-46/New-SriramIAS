const PermissionMatrix = require('../models/PermissionMatrix');
const {
  isSuperAdminRequest,
  getRoleIdFromRequest
} = require('../utils/permissionHelpers');

/**
 * Protect API routes by module + feature key.
 * Super Admin (User super_admin or roleCode SUPER_ADMIN) bypasses all checks.
 */
const checkPermission = (moduleKey, featureKey) => {
  const normalizedModule = String(moduleKey).toUpperCase().trim();
  const normalizedFeature = String(featureKey).toUpperCase().trim();

  return async (req, res, next) => {
    try {
      if (isSuperAdminRequest(req)) {
        return next();
      }

      const roleId = getRoleIdFromRequest(req);
      if (!roleId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. No role assigned for permission check.'
        });
      }

      const matrix = await PermissionMatrix.findOne({
        roleId,
        moduleKey: normalizedModule
      }).lean();

      if (!matrix) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Module not configured for this role.'
        });
      }

      const feature = matrix.permissions.find(
        (item) => item.featureKey === normalizedFeature
      );

      if (!feature || !feature.allowed) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied',
          moduleKey: normalizedModule,
          featureKey: normalizedFeature
        });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  };
};

module.exports = { checkPermission };
