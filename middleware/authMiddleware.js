const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AdminAccess = require('../models/AdminAccess');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }

  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.authType === 'admin_access') {
        const admin = await AdminAccess.findById(decoded.id)
          .select('-password')
          .populate('roleId', 'roleTitle roleCode status')
          .populate('centerId', 'centerName centerCode');

        if (!admin) {
          return res.status(401).json({ message: 'Not authorized, admin not found' });
        }

        if (!admin.accountStatus) {
          return res.status(403).json({ message: 'Account is deactivated' });
        }

        req.adminAccess = admin;
        req.authType = 'admin_access';
        return next();
      }

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (!req.user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }

      req.authType = 'user';
      next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role}' is not authorized to access this route`,
        required: roles,
        current: req.user.role
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
