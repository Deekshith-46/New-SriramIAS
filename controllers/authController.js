const mongoose = require('mongoose');
const User = require('../models/User');
const Parent = require('../models/Parent');
const Center = require('../models/Center');
const generateToken = require('../utils/generateToken');
const { sendOTP, verifyOTP } = require('../utils/otpService');
const { validate, validations } = require('../middleware/validation');
const { assertStudentGmail, normalizeEmail } = require('../utils/studentEmail');
const { ensureStudentProfileForUser, resolveLoginUser, normalizeMobile } = require('../utils/studentService');

const authFail = (res, status, message, code = null) =>
  res.status(status).json({
    success: false,
    message,
    ...(code ? { code } : {})
  });

const otpFailureCode = (message) => {
  if (message.includes('expired')) return 'OTP_EXPIRED';
  if (message.includes('Maximum')) return 'OTP_MAX_ATTEMPTS';
  if (message.includes('not found')) return 'OTP_NOT_FOUND';
  return 'INVALID_OTP';
};

const assertContactMatchesUser = (user, { email, mobile }) => {
  if (email) {
    const emailNorm = normalizeEmail(email);
    if (!user.email || normalizeEmail(user.email) !== emailNorm) {
      return 'Email does not match the account for this userId';
    }
  }
  if (mobile) {
    const mobileNorm = normalizeMobile(mobile);
    if (!user.mobile || normalizeMobile(user.mobile) !== mobileNorm) {
      return 'Mobile does not match the account for this userId';
    }
  }
  return null;
};

// @desc    Super Admin Login
// @route   POST /api/auth/login-super-admin
// @access  Public
exports.loginSuperAdmin = [
  validate(validations.superAdminLogin),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Check against environment variables
      if (
        email !== process.env.SUPER_ADMIN_EMAIL ||
        password !== process.env.SUPER_ADMIN_PASSWORD
      ) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Find or create super admin user
      let user = await User.findOne({ email, role: 'super_admin' });

      if (!user) {
        user = await User.create({
          name: 'Super Admin',
          email,
          password,
          role: 'super_admin',
          isActive: true
        });
      }

      res.json({
        success: true,
        token: generateToken(user),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
];

// @desc    Login (Center Admin & Employee)
// @route   POST /api/auth/login
// @access  Public
exports.login = [
  validate(validations.login),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }

      // Check if role is allowed (only center_admin and employee can use this)
      if (!['center_admin', 'employee'].includes(user.role)) {
        return res.status(403).json({ 
          message: 'Please use OTP login for students and parents' 
        });
      }

      // Check password
      const isMatch = await user.matchPassword(password);

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      res.json({
        success: true,
        token: generateToken(user),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          location: user.location
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
];

// @desc    Send OTP
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOtp = [
  validate(validations.sendOtp),
  async (req, res) => {
  try {
    const { mobile, email: rawEmail } = req.body;
    const email = rawEmail ? normalizeEmail(rawEmail) : null;

    const { user } = await resolveLoginUser({ email, mobile });

    if (!user) {
      return authFail(res, 404, 'User not found');
    }

    if (!user.isActive) {
      return authFail(res, 403, 'Account is deactivated');
    }

    if (!['student', 'parent'].includes(user.role)) {
      return authFail(res, 403, 'OTP login is only available for students and parents');
    }

    const otpType = user.role === 'parent' ? 'parent' : 'student';

    let otp;
    try {
      otp = await sendOTP(
        user._id,
        mobile || user.mobile,
        email || user.email,
        otpType,
        user.name
      );
    } catch (error) {
      if (error.statusCode === 503) {
        return res.status(503).json({ message: error.message });
      }
      return res.status(429).json({ message: error.message });
    }

    const exposeOtp =
      process.env.EXPOSE_OTP_IN_RESPONSE === 'true' || process.env.NODE_ENV !== 'production';

    res.json({
      success: true,
      message: 'OTP sent successfully',
      userId: user._id.toString(),
      flow: 'login',
      nextStep: 'POST /api/auth/verify-otp',
      otp: exposeOtp ? otp : undefined
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
}];

// @desc    Verify OTP and Login
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = [
  validate(validations.verifyOtp),
  async (req, res) => {
  try {
    const { mobile, email: rawEmail, userId, otp } = req.body;
    const email = rawEmail ? normalizeEmail(rawEmail) : null;

    if (!userId && !email && !mobile) {
      return authFail(res, 400, 'userId, email, or mobile is required');
    }

    let user = null;

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return authFail(res, 400, 'Invalid userId');
      }
      user = await User.findById(userId);
      if (!user) {
        return authFail(res, 404, 'User not found');
      }
      const contactMismatch = assertContactMatchesUser(user, { email, mobile });
      if (contactMismatch) {
        return authFail(res, 400, contactMismatch);
      }
    } else {
      ({ user } = await resolveLoginUser({ email, mobile }));
      if (!user) {
        return authFail(res, 404, 'User not found');
      }
    }

    if (!['student', 'parent'].includes(user.role)) {
      return authFail(res, 403, 'OTP login is only available for students and parents');
    }

    if (!user.isActive) {
      return authFail(
        res,
        403,
        'Account is not active. Complete signup verification or contact support.'
      );
    }

    const otpType = user.role === 'parent' ? 'parent' : 'student';
    const verification = await verifyOTP(user._id, otp, otpType);

    if (!verification.valid) {
      let message = verification.message;
      if (message.includes('not found') || message.includes('expired')) {
        message = 'Invalid or expired login OTP. Please call send-otp again and use the latest OTP.';
      }
      return authFail(res, 400, message, otpFailureCode(verification.message));
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      flow: 'login',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
}];

// @desc    Student Signup - Send OTP
// @route   POST /api/auth/student-signup
// @access  Public
exports.studentSignup = async (req, res) => {
  try {
    const { name, mobile, email: rawEmail, centerId } = req.body;
    let email;

    try {
      email = assertStudentGmail(rawEmail);
    } catch (err) {
      return res.status(err.statusCode || 400).json({ message: err.message });
    }

    const center = await Center.findOne({
      _id: centerId,
      isDeleted: false,
      status: 'ACTIVE'
    });

    if (!center) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive center. Please select a valid center.'
      });
    }

    // Check if an ACTIVE user already exists
    const activeUser = await User.findOne({ 
      $or: [{ mobile }, ...(email ? [{ email }] : [])],
      isActive: true
    });

    if (activeUser) {
      return res.status(400).json({ 
        message: 'User already exists with this mobile or email. Please login instead.' 
      });
    }

    // Check if an INACTIVE user exists (OTP sent but not verified)
    const inactiveUser = await User.findOne({ 
      $or: [{ mobile }, ...(email ? [{ email }] : [])],
      isActive: false
    });

    if (inactiveUser) {
      // Delete the old inactive user to allow fresh signup
      await User.deleteOne({ _id: inactiveUser._id });
      console.log('🗑️ Deleted inactive user for fresh signup:', inactiveUser._id);
    }

    // Create new temporary user (inactive until OTP verification)
    const user = await User.create({
      name: name.trim(),
      mobile,
      email,
      center: center._id,
      role: 'student',
      isActive: false
    });

    let otp;
    try {
      otp = await sendOTP(user._id, mobile, email, 'student_signup', user.name);
    } catch (error) {
      await User.deleteOne({ _id: user._id });
      if (error.statusCode === 503) {
        return res.status(503).json({ message: error.message });
      }
      return res.status(429).json({ message: error.message });
    }

    const exposeOtp =
      process.env.EXPOSE_OTP_IN_RESPONSE === 'true' || process.env.NODE_ENV !== 'production';

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully. Please verify to complete registration.',
      userId: user._id.toString(),
      flow: 'signup',
      nextStep: 'POST /api/auth/verify-student-signup',
      center: {
        _id: center._id,
        centerName: center.centerName || center.name
      },
      otp: exposeOtp ? otp : undefined
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'User already exists with this mobile or email'
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const formatStudentAuthUser = async (user) => {
  const doc = user?.toObject ? user.toObject() : { ...user };
  let center = null;

  if (doc.center) {
    const c = await Center.findById(doc.center).select('centerName centerCode name').lean();
    if (c) {
      center = {
        _id: c._id,
        centerName: c.centerName || c.name,
        centerCode: c.centerCode
      };
    }
  }

  return {
    id: doc._id,
    name: doc.name,
    email: doc.email,
    mobile: doc.mobile,
    role: doc.role,
    isActive: doc.isActive,
    center
  };
};

// @desc    Verify Student OTP and Complete Signup
// @route   POST /api/auth/verify-student-signup
// @access  Public
exports.verifyStudentSignup = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return authFail(res, 400, 'Invalid userId');
    }

    const user = await User.findById(userId);

    if (!user) {
      return authFail(res, 404, 'User not found');
    }

    if (user.role !== 'student') {
      return authFail(res, 400, 'Invalid signup verification request', 'INVALID_REQUEST');
    }

    // Signup OTP is separate from login OTP (send-otp uses type "student")
    const verification = await verifyOTP(user._id, otp, 'student_signup');

    if (!verification.valid) {
      let message = verification.message;
      if (message.includes('not found') || message.includes('expired')) {
        message =
          'Invalid or expired signup OTP. If you already registered, use send-otp and verify-otp to login.';
      }
      return authFail(res, 400, message, otpFailureCode(verification.message));
    }

    if (user.isActive) {
      return authFail(
        res,
        409,
        'Account already verified. Please login using send-otp and verify-otp.',
        'ACCOUNT_ALREADY_VERIFIED'
      );
    }

    // Activate user account
    user.isActive = true;
    await user.save();

    await ensureStudentProfileForUser(user);

    // Generate JWT token for immediate login
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Student registration completed successfully',
      token: token,
      user: await formatStudentAuthUser(user)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Parent Login Request - Send OTP
// @route   POST /api/auth/parent-login-request
// @access  Public
exports.parentLoginRequest = async (req, res) => {
  try {
    const { email, mobile } = req.body;

    // Validate input - must provide either email or mobile
    if (!email && !mobile) {
      return res.status(400).json({ 
        message: 'Parent email or mobile is required' 
      });
    }

    // Find parent user by email or mobile
    let parentUser;
    if (email) {
      parentUser = await User.findOne({ 
        email: email.toLowerCase().trim(), 
        role: 'parent' 
      });
    } else if (mobile) {
      parentUser = await User.findOne({ 
        mobile: mobile.trim(), 
        role: 'parent' 
      });
    }

    console.log('Parent Login - Lookup:', email || mobile);
    console.log('Parent user found:', parentUser ? { id: parentUser._id, name: parentUser.name } : 'null');

    if (!parentUser) {
      return res.status(404).json({ 
        message: 'Parent account not found. Please ensure the student has added your details.' 
      });
    }

    if (!parentUser.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    // Send OTP to parent's email or mobile
    const otpEmail = parentUser.email;
    const otpMobile = parentUser.mobile;

    let otp;
    try {
      otp = await sendOTP(parentUser._id, otpMobile, otpEmail, 'parent', parentUser.name);
    } catch (error) {
      if (error.statusCode === 503) {
        return res.status(503).json({ message: error.message });
      }
      return res.status(429).json({ message: error.message });
    }

    const exposeOtp =
      process.env.EXPOSE_OTP_IN_RESPONSE === 'true' || process.env.NODE_ENV !== 'production';

    res.json({
      success: true,
      message: 'OTP sent successfully',
      sentTo: otpEmail ? 'email' : 'mobile',
      userId: parentUser._id.toString(),
      otp: exposeOtp ? otp : undefined
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
