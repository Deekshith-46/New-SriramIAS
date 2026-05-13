const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  getAllToppers,
  getTopper,
  createTopper,
  updateTopper,
  deleteTopper
} = require('../controllers/bookTopperController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getAllToppers);
router.get('/:id', getTopper);

// Admin routes
router.post('/', protect, authorize('super_admin', 'admin'), upload.single('video'), createTopper);
router.put('/:id', protect, authorize('super_admin', 'admin'), upload.single('video'), updateTopper);
router.delete('/:id', protect, authorize('super_admin', 'admin'), deleteTopper);

module.exports = router;
