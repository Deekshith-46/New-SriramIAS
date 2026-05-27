const express = require('express');
const router = express.Router();
const courseUpload = require('../middleware/courseUpload');
const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const { allowRoles } = require('../middleware/roleMiddleware');
const {
  createCourse,
  getCourses,
  getCoursesDropdown,
  getCoursesForEnquiry,
  getCourseById,
  getCourseBySlug,
  updateCourse,
  updateCourseStatus,
  deleteCourse,
  getCoursesGrouped
} = require('../controllers/courseController');

const adminRoles = allowRoles('super_admin', 'center_admin');

router.get('/dropdown', protect, requireSuperAdmin, getCoursesDropdown);
router.get('/', getCourses);
router.get('/enquiry', getCoursesForEnquiry);
router.get('/grouped', getCoursesGrouped);
router.get('/slug/:slug', getCourseBySlug);
router.get('/:id', getCourseById);
router.post('/find', getCourseById);

router.post('/', protect, adminRoles, courseUpload, createCourse);
router.put('/:id', protect, adminRoles, courseUpload, updateCourse);
router.patch('/status/:id', protect, adminRoles, updateCourseStatus);
router.delete('/:id', protect, allowRoles('super_admin'), deleteCourse);

module.exports = router;
