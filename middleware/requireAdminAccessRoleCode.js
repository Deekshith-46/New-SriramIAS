/**
 * Restrict routes to AdminAccess users with allowed roleCode(s).
 * Must run after `protect` (which sets req.adminAccess for admin_access tokens).
 */
const requireAdminAccessRoleCode = (...roleCodes) => {
  const allowed = roleCodes.map((r) => String(r).toUpperCase());

  return (req, res, next) => {
    if (!req.adminAccess) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const roleCode = String(req.adminAccess.roleId?.roleCode || '').toUpperCase();
    if (!roleCode || !allowed.includes(roleCode)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        required: allowed,
        current: roleCode || null
      });
    }

    next();
  };
};

module.exports = { requireAdminAccessRoleCode };

