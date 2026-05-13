const express = require('express');
const router = express.Router();
const {
  createBook,
  getBooks,
  getBook,
  getSampleBooks,
  updateBook,
  deleteBook
} = require('../controllers/bookController');
const { protect, authorize } = require('../middleware/authMiddleware');
const blogUpload = require('../middleware/blogUpload');

// Public routes
router.get('/', getBooks);
router.get('/sample', getSampleBooks);
router.get('/:id', getBook);

// Admin routes
router.post(
  '/',
  protect,
  authorize('super_admin', 'admin'),
  blogUpload.fields([{ name: 'image', maxCount: 1 }]),
  createBook
);

router.put(
  '/:id',
  protect,
  authorize('super_admin', 'admin'),
  blogUpload.fields([{ name: 'image', maxCount: 1 }]),
  updateBook
);

router.delete('/:id', protect, authorize('super_admin', 'admin'), deleteBook);

module.exports = router;
