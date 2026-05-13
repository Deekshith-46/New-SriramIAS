const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const {
  createCourse,
  getCourses,
  getCoursesForEnquiry,
  getCourseById,
  getCourseBySlug,
  updateCourse,
  deleteCourse,
  getCoursesGrouped
} = require('../controllers/courseController');

// ==========================================
// PUBLIC ROUTES (No authentication needed)
// ==========================================
router.get('/', getCourses);
router.get('/enquiry', getCoursesForEnquiry);
router.get('/grouped', getCoursesGrouped);
router.get('/slug/:slug', getCourseBySlug);
router.get('/:id', getCourseById);
router.post('/find', getCourseById);

// ==========================================
// ADMIN ROUTES (Protected)
// ==========================================

// Create course - Super Admin & Center Admin
router.post(
  '/',
  protect,
  allowRoles('super_admin', 'center_admin'),
  upload.fields([
    { name: 'banner', maxCount: 1 },
    { name: 'highlight', maxCount: 1 },
    { name: 'section', maxCount: 1 },
    { name: 'gallery', maxCount: 5 },
    { name: 'video', maxCount: 1 },
    { name: 'brochure', maxCount: 1 }
  ]),
  createCourse
);

// Update course - Super Admin & Center Admin
router.put(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  upload.fields([
    { name: 'banner', maxCount: 1 },
    { name: 'highlight', maxCount: 1 },
    { name: 'section', maxCount: 1 },
    { name: 'gallery', maxCount: 5 },
    { name: 'video', maxCount: 1 },
    { name: 'brochure', maxCount: 1 }
  ]),
  updateCourse
);

// Delete course - Super Admin only
router.delete(
  '/:id',
  protect,
  allowRoles('super_admin'),
  deleteCourse
);

module.exports = router;
