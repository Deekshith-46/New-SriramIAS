const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { paginate } = require('../middleware/resourceMiddleware');

const {
  createFilter,
  getFilters,
  getFiltersByCategory,
  updateFilter,
  deleteFilter
} = require('../controllers/filterController');

// ==================== FILTER ROUTES ====================

// Public routes
router.get('/', paginate, getFilters);
router.get('/category/:categoryId', getFiltersByCategory);

// Protected routes (Admin only)
router.post('/',
  protect,
  authorize('super_admin', 'center_admin'),
  createFilter
);

router.put('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  updateFilter
);

router.delete('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  deleteFilter
);

module.exports = router;
