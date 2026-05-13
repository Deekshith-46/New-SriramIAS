const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const {
  createContent,
  getAllContents,
  getContentFilters,
  getContent,
  updateContent,
  deleteContent
} = require('../controllers/testContentController');

// Public routes
router.get('/filters', getContentFilters);
router.get('/', getAllContents);
router.get('/:id', getContent);

// Protected routes (Admin only)
router.post(
  '/',
  protect,
  allowRoles('super_admin', 'center_admin'),
  upload.single('file'),
  createContent
);

router.put(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  upload.single('file'),
  updateContent
);

router.delete(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  deleteContent
);

module.exports = router;
