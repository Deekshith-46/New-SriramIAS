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

// Public routes
router.get('/top-performers/:paperId', getTopPerformers);

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
