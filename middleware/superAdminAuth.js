const { protect } = require('./authMiddleware');
const { requireSuperAdmin } = require('./requireSuperAdmin');

/** Use on all Super Admin ERP routes (faculty-subjects, batches, batch-enrollments, etc.) */
const superAdminAuth = [protect, requireSuperAdmin];

module.exports = { superAdminAuth, protect, requireSuperAdmin };
