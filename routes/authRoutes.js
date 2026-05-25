const express = require('express');
const router = express.Router();
const {
  loginSuperAdmin,
  login,
  sendOtp,
  verifyOtp,
  studentSignup,
  verifyStudentSignup,
  parentLoginRequest
} = require('../controllers/authController');
const {
  loginAdminAccess,
  verifyAdminAccessOtp
} = require('../controllers/adminAuthController');
const { validate, validations } = require('../middleware/validation');

router.post('/login-super-admin', loginSuperAdmin);
router.post('/login-admin-access', loginAdminAccess);
router.post('/login-admin-access/verify-otp', verifyAdminAccessOtp);
router.post('/login', login);
router.post('/send-otp', ...sendOtp);
router.post('/verify-otp', ...verifyOtp);
router.post('/student-signup', validate(validations.studentSignup), studentSignup);
router.post('/verify-student-signup', validate(validations.verifyStudentSignup), verifyStudentSignup);
router.post('/parent-login-request', validate(validations.parentLoginRequest), parentLoginRequest);

module.exports = router;
