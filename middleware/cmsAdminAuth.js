const { protect } = require('./authMiddleware');
const { getRoleCodeFromRequest } = require('../utils/permissionHelpers');

const CMS_ADMIN_ROLE_CODES = ['SUPER_ADMIN', 'CENTER_ADMIN'];
const CMS_ADMIN_USER_ROLES = ['super_admin', 'center_admin'];

const allowCmsAdmin = (req, res, next) => {
  if (!req.user && !req.adminAccess) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  if (req.user && CMS_ADMIN_USER_ROLES.includes(req.user.role)) {
    return next();
  }

  const roleCode = getRoleCodeFromRequest(req);
  if (req.adminAccess && CMS_ADMIN_ROLE_CODES.includes(roleCode)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Insufficient permissions.'
  });
};

const cmsAdminAuth = [protect, allowCmsAdmin];

module.exports = {
  allowCmsAdmin,
  cmsAdminAuth
};
