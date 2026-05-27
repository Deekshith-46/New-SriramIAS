const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const {
  createSubCategory,
  getSubCategories,
  getSubCategoriesFilter,
  getSubCategoryById,
  updateSubCategory,
  updateSubCategoryStatus,
  deleteSubCategory
} = require('../controllers/academicSubCategoryController');

router.use(protect, requireSuperAdmin);

router.get('/filter', getSubCategoriesFilter);
router.patch('/status/:id', updateSubCategoryStatus);

router.post('/', createSubCategory);
router.get('/', getSubCategories);
router.get('/:id', getSubCategoryById);
router.put('/:id', updateSubCategory);
router.delete('/:id', deleteSubCategory);

module.exports = router;
