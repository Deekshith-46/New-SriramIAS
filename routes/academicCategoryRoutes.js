const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const {
  createCategory,
  getCategories,
  getCategoriesFilter,
  getCategoryById,
  updateCategory,
  updateCategoryStatus,
  deleteCategory
} = require('../controllers/academicCategoryController');

router.use(protect, requireSuperAdmin);

router.get('/filter', getCategoriesFilter);
router.patch('/status/:id', updateCategoryStatus);

router.post('/', createCategory);
router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
