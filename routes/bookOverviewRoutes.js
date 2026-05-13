const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  getAllOverviews,
  getOverview,
  createOverview,
  updateOverview,
  deleteOverview
} = require('../controllers/bookOverviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getAllOverviews);
router.get('/:id', getOverview);

// Admin routes
router.post('/', protect, authorize('super_admin', 'admin'), upload.single('video'), createOverview);
router.put('/:id', protect, authorize('super_admin', 'admin'), upload.single('video'), updateOverview);
router.delete('/:id', protect, authorize('super_admin', 'admin'), deleteOverview);

module.exports = router;
