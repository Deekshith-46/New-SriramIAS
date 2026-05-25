const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  submitTest,
  getResultById,
  getMyResultsByCourse,
  getMyResults,
  getResultsByTestExam
} = require('../controllers/testResultController');

router.post('/submit', protect, submitTest);

router.get('/me', protect, getMyResults);
router.get('/me/course/:courseId', protect, getMyResultsByCourse);
router.get('/test-exam/:testExamId', protect, getResultsByTestExam);
router.get('/:id', protect, getResultById);

module.exports = router;
