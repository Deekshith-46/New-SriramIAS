const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { saveNote, getNote } = require('../controllers/lectureNoteController');

router.use(protect);

router.post('/', saveNote);
router.get('/:lectureId', getNote);

module.exports = router;
