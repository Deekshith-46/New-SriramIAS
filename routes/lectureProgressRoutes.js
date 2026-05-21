const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { updateProgress, getProgress } = require('../controllers/lectureProgressController');

router.use(protect);

router.post('/', updateProgress);
router.get('/:lectureId', getProgress);

module.exports = router;
