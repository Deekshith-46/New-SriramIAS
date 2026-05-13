const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  saveHomePage,
  getHomePage,
  deleteSection
} = require('../controllers/homePageController');

const {
  createSection4,
  getSection4,
  updateSection4,
  deleteSection4,
  reorderSection4
} = require('../controllers/homeSection4Controller');

const {
  addVideo,
  getVideos,
  updateVideo,
  deleteVideo
} = require('../controllers/homeVideoController');

const {
  createTopper,
  getToppers,
  updateTopper,
  deleteTopper
} = require('../controllers/homeTopperController');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// ==========================================
// HOME PAGE ROUTES
// ==========================================
router.get('/', getHomePage);
router.post(
  '/',
  protect,
  authorize('super_admin'),
  upload.any(),
  saveHomePage
);
router.delete(
  '/section/:sectionName',
  protect,
  authorize('super_admin'),
  deleteSection
);

// ==========================================
// TOPPERS ROUTES (Section 3)
// ==========================================
router.route('/toppers')
  .get(getToppers)
  .post(protect, authorize('super_admin'), upload.any(), createTopper);

router.route('/toppers/:id')
  .put(protect, authorize('super_admin'), upload.any(), updateTopper)
  .delete(protect, authorize('super_admin'), deleteTopper);

// ==========================================
// SECTION 2 ROUTES (Learning Programs)
// ==========================================
router.route('/section2')
  .get(getSection4)
  .post(protect, authorize('super_admin'), upload.any(), createSection4);

// Reorder route (must be before /:id route)
router.put(
  '/section2/reorder',
  protect,
  authorize('super_admin'),
  reorderSection4
);

router.route('/section2/:id')
  .put(protect, authorize('super_admin'), upload.any(), updateSection4)
  .delete(protect, authorize('super_admin'), deleteSection4);

// ==========================================
// HOME VIDEO ROUTES (Section 7)
// ==========================================
router.route('/videos')
  .get(getVideos)
  .post(protect, authorize('super_admin'), upload.any(), addVideo);

router.route('/videos/:id')
  .put(protect, authorize('super_admin'), upload.any(), updateVideo)
  .delete(protect, authorize('super_admin'), deleteVideo);

module.exports = router;