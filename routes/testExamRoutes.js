const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createTestExam,
  updateTestExam,
  deleteTestExam,
  getCourseTestExamsAdmin,
  getCourseTestSchedule,
  getTestExamAdmin,
  startTestExam
} = require('../controllers/testExamController');

const admin = authorize('super_admin', 'center_admin', 'employee');

router.post('/', protect, admin, createTestExam);
router.put('/:id', protect, admin, updateTestExam);
router.delete('/:id', protect, admin, deleteTestExam);

router.get('/course/:courseId/admin', protect, admin, getCourseTestExamsAdmin);
router.get('/course/:courseId', protect, getCourseTestSchedule);

router.get('/:id/admin', protect, admin, getTestExamAdmin);
router.get('/:id/start', protect, startTestExam);

module.exports = router;
