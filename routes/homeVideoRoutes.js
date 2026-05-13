const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const {
  addVideo,
  getVideos,
  updateVideo,
  deleteVideo
} = require('../controllers/homeVideoController');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Public route
router.get('/', getVideos);

// Protected routes (Super Admin only)
router.post(
  '/',
  protect,
  allowRoles('super_admin'),
  upload.any(), // Accept FormData
  addVideo
);

router.put(
  '/:id',
  protect,
  allowRoles('super_admin'),
  upload.any(), // Accept FormData
  updateVideo
);

router.delete(
  '/:id',
  protect,
  allowRoles('super_admin'),
  deleteVideo
);

module.exports = router;
