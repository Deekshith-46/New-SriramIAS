const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  toggleBookmark,
  getAllBookmarks,
  getRecordingBookmarks,
  getTestBookmarks,
  getBookmarkStatus
} = require('../controllers/lmsBookmarkController');

router.use(protect);

router.post('/toggle', toggleBookmark);
router.get('/status', getBookmarkStatus);
router.get('/recordings', getRecordingBookmarks);
router.get('/tests', getTestBookmarks);
router.get('/', getAllBookmarks);

module.exports = router;
