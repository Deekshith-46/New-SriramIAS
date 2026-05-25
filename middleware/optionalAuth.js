const jwt = require('jsonwebtoken');
const User = require('../models/User');

/** Attach req.user when Bearer token is valid; continue as guest otherwise. */
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.isActive) {
      req.user = user;
    }
  } catch (_err) {
    // ignore invalid token for public portal reads
  }

  next();
};

module.exports = optionalAuth;
