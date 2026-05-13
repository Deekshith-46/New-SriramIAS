const express = require('express');
const router = express.Router();
const {
  createCenterAdmin,
  createEmployee,
  getUsers,
  updateUserStatus,
  getCenters,
  createCenter,
  updateCenter,
  deleteCenter,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles, ROLES } = require('../middleware/roleMiddleware');

// All admin routes require authentication
router.use(protect);

// ==========================================
// SUPER ADMIN ONLY ROUTES
// ==========================================

// Center Management
router.post('/create-center-admin', allowRoles(ROLES.SUPER_ADMIN), createCenterAdmin);
router.get('/centers', allowRoles(ROLES.SUPER_ADMIN), getCenters);
router.post('/centers', allowRoles(ROLES.SUPER_ADMIN), createCenter);
router.put('/centers/:id', allowRoles(ROLES.SUPER_ADMIN), updateCenter);
router.delete('/centers/:id', allowRoles(ROLES.SUPER_ADMIN), deleteCenter);

// Category Management
router.post('/categories', allowRoles(ROLES.SUPER_ADMIN), createCategory);
router.put('/categories/:id', allowRoles(ROLES.SUPER_ADMIN), updateCategory);
router.delete('/categories/:id', allowRoles(ROLES.SUPER_ADMIN), deleteCategory);

// ==========================================
// SUPER ADMIN & CENTER ADMIN ROUTES
// ==========================================
router.post('/create-employee', allowRoles(ROLES.SUPER_ADMIN, ROLES.CENTER_ADMIN), createEmployee);
router.get('/users', allowRoles(ROLES.SUPER_ADMIN, ROLES.CENTER_ADMIN), getUsers);
router.put('/user/:id/status', allowRoles(ROLES.SUPER_ADMIN, ROLES.CENTER_ADMIN), updateUserStatus);
router.get('/categories', allowRoles(ROLES.SUPER_ADMIN, ROLES.CENTER_ADMIN), getCategories);

module.exports = router;
