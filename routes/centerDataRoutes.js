const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const { validate, validations } = require('../middleware/validation');
const {
  createCenter,
  getAllCenters,
  getCenterCompleteData,
  updateCenter,
  deleteCenter,
  updateGallery,
  deleteGalleryImage,
  createSuccessStory,
  updateSuccessStory,
  deleteSuccessStory,
  createFaculty,
  updateFaculty,
  deleteFaculty
} = require('../controllers/centerDataController');

// ==========================================
// PUBLIC ROUTES (No authentication needed)
// ==========================================

// Get all centers (list view)
router.get('/', getAllCenters);

// Get complete center data
router.get('/:id', getCenterCompleteData);

// ==========================================
// PROTECTED ROUTES (Authentication required)
// ==========================================

router.use(protect);

// ==========================================
// CENTER CRUD
// ==========================================

// Create center data - Super Admin only
router.post(
  '/',
  allowRoles('super_admin'),
  upload.fields([{ name: 'thumbnail', maxCount: 1 }]),
  validate(validations.createCenter),
  createCenter
);

// Update center data - Super Admin only
router.put(
  '/:id',
  allowRoles('super_admin'),
  upload.fields([{ name: 'thumbnail', maxCount: 1 }]),
  validate(validations.updateCenter),
  updateCenter
);

// Delete center data - Super Admin only
router.delete(
  '/:id',
  allowRoles('super_admin'),
  deleteCenter
);

// ==========================================
// GALLERY CRUD
// ==========================================

// Update gallery - Super Admin & Center Admin
router.post(
  '/:id/gallery',
  allowRoles('super_admin', 'center_admin'),
  upload.fields([{ name: 'images', maxCount: 6 }]),
  updateGallery
);

// Delete single gallery image
router.delete(
  '/:id/gallery/:imageId',
  allowRoles('super_admin', 'center_admin'),
  deleteGalleryImage
);

// ==========================================
// SUCCESS STORIES CRUD
// ==========================================

// Create success story
router.post(
  '/:id/success-stories',
  allowRoles('super_admin', 'center_admin', 'employee'),
  upload.fields([{ name: 'thumbnail', maxCount: 1 }]),
  validate(validations.createSuccessStory),
  createSuccessStory
);

// Update success story
router.put(
  '/:id/success-stories/:storyId',
  allowRoles('super_admin', 'center_admin', 'employee'),
  upload.fields([{ name: 'thumbnail', maxCount: 1 }]),
  validate(validations.updateSuccessStory),
  updateSuccessStory
);

// Delete success story
router.delete(
  '/:id/success-stories/:storyId',
  allowRoles('super_admin', 'center_admin', 'employee'),
  deleteSuccessStory
);

// ==========================================
// FACULTY CRUD
// ==========================================

// Create faculty
router.post(
  '/:id/faculty',
  allowRoles('super_admin', 'center_admin', 'employee'),
  upload.fields([{ name: 'image', maxCount: 1 }]),
  validate(validations.createFaculty),
  createFaculty
);

// Update faculty
router.put(
  '/:id/faculty/:facultyId',
  allowRoles('super_admin', 'center_admin', 'employee'),
  upload.fields([{ name: 'image', maxCount: 1 }]),
  validate(validations.updateFaculty),
  updateFaculty
);

// Delete faculty
router.delete(
  '/:id/faculty/:facultyId',
  allowRoles('super_admin', 'center_admin', 'employee'),
  deleteFaculty
);

module.exports = router;
