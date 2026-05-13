const express = require('express');
const router = express.Router();
const {
  createTopStory,
  getTopStories,
  getTopStory,
  updateTopStory,
  deleteTopStory
} = require('../controllers/topStoryController');
const { protect, authorize } = require('../middleware/authMiddleware');
const blogUpload = require('../middleware/blogUpload');

// Get all top stories (Public)
router.get('/', getTopStories);

// Get single top story (Public)
router.get('/:id', getTopStory);

// Create top story with image upload (Super Admin & Admin only)
router.post(
  '/',
  protect,
  authorize('super_admin', 'admin'),
  blogUpload.fields([
    { name: 'thumbnail', maxCount: 1 }
  ]),
  createTopStory
);

// Update top story with image upload (Super Admin & Admin only)
router.put(
  '/:id',
  protect,
  authorize('super_admin', 'admin'),
  blogUpload.fields([
    { name: 'thumbnail', maxCount: 1 }
  ]),
  updateTopStory
);

// Delete top story - Soft delete (Super Admin & Admin only)
router.delete('/:id', protect, authorize('super_admin', 'admin'), deleteTopStory);

module.exports = router;
