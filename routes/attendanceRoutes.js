const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  checkIn,
  checkOut,
  applyLeave,
  getAttendanceStats,
  getAttendanceList,
  getTodayStatus
} = require('../controllers/studentAttendanceController');

const studentOnly = authorize('student');

router.use(protect);

router.post('/check-in', studentOnly, checkIn);
router.post('/check-out', studentOnly, checkOut);
router.post('/leave', studentOnly, applyLeave);

router.get('/stats', getAttendanceStats);
router.get('/list', getAttendanceList);
router.get('/today', getTodayStatus);

module.exports = router;
