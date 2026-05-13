const express = require('express');
const router = express.Router();
const {
  createFeaturedArticle,
  getFeaturedArticles,
  getFeaturedArticle,
  updateFeaturedArticle,
  deleteFeaturedArticle
} = require('../controllers/featuredArticleController');
const { protect, authorize } = require('../middleware/authMiddleware');
const blogUpload = require('../middleware/blogUpload');

// Get all featured articles (Public)
router.get('/', getFeaturedArticles);

// Get single featured article (Public)
router.get('/:id', getFeaturedArticle);

// Create featured article with image upload (Super Admin & Admin only)
router.post(
  '/',
  protect,
  authorize('super_admin', 'admin'),
  blogUpload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'secondaryImage', maxCount: 1 }
  ]),
  createFeaturedArticle
);

// Update featured article with image upload (Super Admin & Admin only)
router.put(
  '/:id',
  protect,
  authorize('super_admin', 'admin'),
  blogUpload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'secondaryImage', maxCount: 1 }
  ]),
  updateFeaturedArticle
);

// Delete featured article - Soft delete (Super Admin & Admin only)
router.delete('/:id', protect, authorize('super_admin', 'admin'), deleteFeaturedArticle);

module.exports = router;
