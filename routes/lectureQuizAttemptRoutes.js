const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  submitQuizAttempt,
  getQuizAttempts
} = require('../controllers/lectureQuizAttemptController');

router.use(protect);

router.post('/', submitQuizAttempt);
router.get('/:lectureId', getQuizAttempts);

module.exports = router;
