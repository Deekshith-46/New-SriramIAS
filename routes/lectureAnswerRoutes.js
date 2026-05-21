const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { saveAnswer, getAnswer } = require('../controllers/lectureAnswerController');

router.use(protect);

router.post('/', saveAnswer);
router.get('/:lectureId', getAnswer);

module.exports = router;
