const express = require('express');
const router = express.Router();
const {
  createCenterAdmin,
  createEmployee,
  getUsers,
  updateUserStatus,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/adminController');
const centerManagementRoutes = require('./centerManagementRoutes');
const roleRoutes = require('./roleRoutes');
const adminAccessRoutes = require('./adminAccessRoutes');
const permissionRoutes = require('./permissionRoutes');
const userManagementRoutes = require('./userManagementRoutes');
const {
  getUserRoles,
  getUserCenters,
  getCreateUserRoles
} = require('../controllers/userManagementController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles, ROLES } = require('../middleware/roleMiddleware');

// All admin routes require authentication
router.use(protect);

// ==========================================
// SUPER ADMIN ONLY ROUTES
// ==========================================

// Center admin user + operational center CRUD (separate from website CenterData)
router.post('/create-center-admin', allowRoles(ROLES.SUPER_ADMIN), createCenterAdmin);
router.use('/centers', centerManagementRoutes);
router.use('/roles', roleRoutes);
router.use('/admin-access', adminAccessRoutes);
router.use('/permissions', permissionRoutes);
router.get('/user-roles', allowRoles(ROLES.SUPER_ADMIN), getUserRoles);
router.get('/user-create-roles', allowRoles(ROLES.SUPER_ADMIN), getCreateUserRoles);
router.get('/user-centers', allowRoles(ROLES.SUPER_ADMIN), getUserCenters);
router.use('/users', userManagementRoutes);

// Category Management
router.post('/categories', allowRoles(ROLES.SUPER_ADMIN), createCategory);
router.put('/categories/:id', allowRoles(ROLES.SUPER_ADMIN), updateCategory);
router.delete('/categories/:id', allowRoles(ROLES.SUPER_ADMIN), deleteCategory);

// ==========================================
// SUPER ADMIN & CENTER ADMIN ROUTES
// ==========================================
router.post('/create-employee', allowRoles(ROLES.SUPER_ADMIN, ROLES.CENTER_ADMIN), createEmployee);
/** @deprecated Legacy staff list — use GET /api/admin/users for unified governance */
router.get('/legacy-users', allowRoles(ROLES.SUPER_ADMIN, ROLES.CENTER_ADMIN), getUsers);
router.put('/user/:id/status', allowRoles(ROLES.SUPER_ADMIN, ROLES.CENTER_ADMIN), updateUserStatus);
router.get('/categories', allowRoles(ROLES.SUPER_ADMIN, ROLES.CENTER_ADMIN), getCategories);

module.exports = router;
