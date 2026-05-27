const { isSuperAdminRequest } = require('../utils/permissionHelpers');

/**
 * Allows legacy User (role super_admin) or AdminAccess (roleCode SUPER_ADMIN).
 * Must run after protect.
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user && !req.adminAccess) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  if (!isSuperAdminRequest(req)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super Admin only.'
    });
  }

  next();
};

module.exports = { requireSuperAdmin };
