const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/authMiddleware');
const { filterByCenter, paginate } = require('../middleware/resourceMiddleware');

const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  createSubCategory,
  getSubCategories,
  updateSubCategory,
  deleteSubCategory
} = require('../controllers/resourceCategoryController');

// ==================== CATEGORY ROUTES ====================

// Public routes
router.get('/categories', paginate, getCategories);
router.get('/categories/:id', getCategoryById);

// Protected routes (Admin only)
router.post('/categories', 
  protect, 
  authorize('super_admin', 'center_admin'),
  upload.single('thumbnail'),
  createCategory
);

router.put('/categories/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  upload.single('thumbnail'),
  updateCategory
);

router.delete('/categories/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  deleteCategory
);

// ==================== SUBCATEGORY ROUTES ====================

// Public routes
router.get('/subcategories', paginate, getSubCategories);
router.get('/subcategories/category/:categoryId', getSubCategories);

// Protected routes (Admin only)
router.post('/subcategories',
  protect,
  authorize('super_admin', 'center_admin'),
  upload.single('thumbnail'),
  createSubCategory
);

router.put('/subcategories/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  upload.single('thumbnail'),
  updateSubCategory
);

router.delete('/subcategories/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  deleteSubCategory
);

module.exports = router;
