const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  updateParentDetails,
  getStudentDetails
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// All user routes require authentication
router.use(protect);

router.get('/profile', getProfile);
router.get('/student-details', getStudentDetails);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.put('/update-parent-details', updateParentDetails);

module.exports = router;
