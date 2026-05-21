const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getCourseProgress,
  updateLastOpened
} = require('../controllers/courseProgressController');

router.use(protect);

router.post('/last-opened', updateLastOpened);
router.get('/:courseId', getCourseProgress);

module.exports = router;
