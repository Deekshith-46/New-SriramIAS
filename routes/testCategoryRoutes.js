const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const {
  createCategory,
  getAllCategories,
  getCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/testCategoryController');

// Public routes
router.get('/', getAllCategories);
router.get('/:id', getCategory);

// Protected routes (Admin only)
router.post(
  '/',
  protect,
  allowRoles('super_admin', 'center_admin'),
  upload.single('image'),
  createCategory
);

router.put(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  upload.single('image'),
  updateCategory
);

router.delete(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  deleteCategory
);

module.exports = router;
