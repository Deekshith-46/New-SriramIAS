// Role-based access control middleware

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  CENTER_ADMIN: 'center_admin',
  EMPLOYEE: 'employee',
  STUDENT: 'student',
  PARENT: 'parent'
};

// Check if user has required role(s)
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Check if user belongs to specific location (for center admins and employees)
const checkLocation = (req, res, next) => {
  if (req.user.role === ROLES.SUPER_ADMIN) {
    return next(); // Super admin can access all locations
  }

  const requestedLocation = req.params.location || req.body.location;
  
  if (requestedLocation && req.user.location !== requestedLocation) {
    return res.status(403).json({ 
      message: 'Access denied. You can only access your assigned location.' 
    });
  }

  next();
};

module.exports = {
  ROLES,
  allowRoles,
  checkLocation
};
