const User = require('../models/User');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const generateToken = require('../utils/generateToken');
const { sendOTP, verifyOTP } = require('../utils/otpService');
const { validate, validations } = require('../middleware/validation');

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
exports.sendOtp = async (req, res) => {
  try {
    const { mobile, email } = req.body;

    // Validate input - must provide either email or mobile
    if (!email && !mobile) {
      return res.status(400).json({ 
        message: 'Email or mobile is required' 
      });
    }

    // Find user with STRICT query (not $or)
    let user;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    } else if (mobile) {
      user = await User.findOne({ mobile: mobile.trim() });
    }

    console.log('Send OTP - Email:', email, 'Mobile:', mobile);
    console.log('User found:', user ? { id: user._id, name: user.name, role: user.role } : 'null');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    // Determine OTP type based on user role
    const otpType = user.role === 'parent' ? 'parent' : 'student';

    // Send OTP
    try {
      await sendOTP(user._id, mobile, email, otpType, user.name);
    } catch (error) {
      return res.status(429).json({ message: error.message });
    }

    // Return userId so client doesn't need to send email again
    res.json({
      success: true,
      message: 'OTP sent successfully',
      userId: user._id.toString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Verify OTP and Login
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res) => {
  try {
    const { mobile, email, userId, otp } = req.body;

    // Validate input - must provide email, mobile, or userId
    if (!email && !mobile && !userId) {
      return res.status(400).json({ 
        message: 'Email, mobile, or userId is required' 
      });
    }

    if (!otp) {
      return res.status(400).json({ 
        message: 'OTP is required' 
      });
    }

    // Find user by email, mobile, or userId (strict query - backend finds user internally)
    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    } else if (mobile) {
      user = await User.findOne({ mobile: mobile.trim() });
    }

    console.log('Verify OTP - Email:', email, 'Mobile:', mobile, 'UserId:', userId);
    console.log('User found:', user ? { id: user._id, name: user.name, role: user.role } : 'null');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated. Please complete OTP verification first.' });
    }

    // Determine OTP type based on user role
    const otpType = user.role === 'parent' ? 'parent' : 'student';

    // Verify OTP using user's internal ID
    const verification = await verifyOTP(user._id, otp, otpType);

    if (!verification.valid) {
      return res.status(400).json({ message: verification.message });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      success: true,
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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Student Signup - Send OTP
// @route   POST /api/auth/student-signup
// @access  Public
exports.studentSignup = async (req, res) => {
  try {
    const { name, mobile, email } = req.body;

    // Check if an ACTIVE user already exists
    const activeUser = await User.findOne({ 
      $or: [{ mobile }, { email }],
      isActive: true
    });

    if (activeUser) {
      return res.status(400).json({ 
        message: 'User already exists with this mobile or email. Please login instead.' 
      });
    }

    // Check if an INACTIVE user exists (OTP sent but not verified)
    const inactiveUser = await User.findOne({ 
      $or: [{ mobile }, { email }],
      isActive: false
    });

    if (inactiveUser) {
      // Delete the old inactive user to allow fresh signup
      await User.deleteOne({ _id: inactiveUser._id });
      console.log('🗑️ Deleted inactive user for fresh signup:', inactiveUser._id);
    }

    // Create new temporary user (inactive until OTP verification)
    const user = await User.create({
      name,
      mobile,
      email,
      role: 'student',
      isActive: false  // Inactive until OTP verified
    });

    // Send OTP for verification
    try {
      await sendOTP(user._id, mobile, email, 'student', user.name);
    } catch (error) {
      // If OTP fails, delete the user
      await User.deleteOne({ _id: user._id });
      return res.status(429).json({ message: error.message });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully. Please verify to complete registration.',
      userId: user._id.toString()
    });
  } catch (error) {
    console.error(error);
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'User already exists with this mobile or email' 
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Verify Student OTP and Complete Signup
// @route   POST /api/auth/verify-student-signup
// @access  Public
exports.verifyStudentSignup = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ 
        message: 'User ID and OTP are required' 
      });
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If already verified, return login token instead of error
    if (user.isActive) {
      // Check if student profile exists
      let studentProfile = await Student.findOne({ userId: user._id });
      
      // Create student profile if it doesn't exist
      if (!studentProfile) {
        studentProfile = await Student.create({
          userId: user._id
        });
      }

      // Generate JWT token for login
      const token = generateToken(user);

      return res.status(200).json({
        success: true,
        message: 'Already verified. Login successful.',
        token: token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          isActive: user.isActive
        }
      });
    }

    // Verify OTP for unverified users
    const verification = await verifyOTP(user._id, otp, 'student');

    if (!verification.valid) {
      return res.status(400).json({ message: verification.message });
    }

    // Activate user account
    user.isActive = true;
    await user.save();

    // Create student profile
    await Student.create({
      userId: user._id
    });

    // Generate JWT token for immediate login
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Student registration completed successfully',
      token: token,
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

    try {
      await sendOTP(parentUser._id, otpMobile, otpEmail, 'parent', parentUser.name);
    } catch (error) {
      return res.status(429).json({ message: error.message });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      sentTo: otpEmail ? 'email' : 'mobile',
      userId: parentUser._id.toString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
