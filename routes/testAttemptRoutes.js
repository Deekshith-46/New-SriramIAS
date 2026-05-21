const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  submitAttempt,
  getResult,
  getDetailedReview,
  getTopPerformers,
  getMyAttempts
} = require('../controllers/testAttemptController');
const { getAttemptResult } = require('../controllers/lmsTestAttemptController');

// Public routes
router.get('/top-performers/:paperId', getTopPerformers);

// LMS course test result (My Courses → Tests)
router.get('/:attemptId', protect, getAttemptResult);

// Protected routes (Student)
router.post(
  '/:paperId',
  protect,
  submitAttempt
);

router.get(
  '/result/:paperId',
  protect,
  getResult
);

router.get(
  '/review/:paperId',
  protect,
  getDetailedReview
);

router.get(
  '/my-attempts',
  protect,
  getMyAttempts
);

module.exports = router;
