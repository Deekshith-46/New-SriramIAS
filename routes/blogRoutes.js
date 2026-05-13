const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createBlog,
  getBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  getFiltersByLanguage,
  getFiltersByPaper,
  getBlogFilterOptions
} = require('../controllers/blogController');

const {
  createLanguage,
  getLanguages,
  updateLanguage,
  deleteLanguage
} = require('../controllers/languageController');

const {
  createPaper,
  getPapers,
  updatePaper,
  deletePaper
} = require('../controllers/paperController');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// ==============================
// LANGUAGE ROUTES
// ==============================
router.route('/languages')
  .get(getLanguages)
  .post(protect, authorize('super_admin'), createLanguage);

router.route('/languages/:id')
  .put(protect, authorize('super_admin'), updateLanguage)
  .delete(protect, authorize('super_admin'), deleteLanguage);

// ==============================
// PAPER ROUTES
// ==============================
router.route('/papers')
  .get(getPapers)
  .post(protect, authorize('super_admin'), createPaper);

router.route('/papers/:id')
  .put(protect, authorize('super_admin'), updatePaper)
  .delete(protect, authorize('super_admin'), deletePaper);

// ==============================
// BLOG ROUTES
// ==============================

// Public routes
router.get('/blogs', getBlogs);
router.get('/blogs/filter-options', getBlogFilterOptions);
router.get('/blogs/filters/language', getFiltersByLanguage);
router.get('/blogs/filters/paper', getFiltersByPaper);
router.get('/blogs/:id', getBlogById);

// Protected routes (Admin only)
router.post(
  '/blogs',
  protect,
  authorize('super_admin'),
  upload.fields([
    { name: 'thumbnail' },
    { name: 'images', maxCount: 20 }
  ]),
  createBlog
);

router.put(
  '/blogs/:id',
  protect,
  authorize('super_admin'),
  upload.fields([
    { name: 'thumbnail' },
    { name: 'images', maxCount: 20 }
  ]),
  updateBlog
);

router.delete(
  '/blogs/:id',
  protect,
  authorize('super_admin'),
  deleteBlog
);

module.exports = router;
