# Student Signup & Parent Details — Complete Code Guide

> **Project:** Sriram IAS Backend  
> **Covers:** Student registration (OTP), center selection, parent details, models, routes

---

## 1. Flow overview

```txt
STEP 1 — Load centers (public)
  GET /api/centers/signup

STEP 2 — Student signup (public)
  POST /api/auth/student-signup
  Body: name, email (Gmail), mobile, centerId
  → Creates User (role=student, isActive=false)
  → Sends OTP to email

STEP 3 — Verify OTP (public)
  POST /api/auth/verify-student-signup
  Body: userId, otp
  → Activates User
  → Creates empty Student profile
  → Returns JWT

STEP 4 — Later: add parent (authenticated student)
  PUT /api/user/update-parent-details
  OR partial via PUT /api/user/profile
  → Updates Student.parentName / parentMobile / parentEmail
  → Creates/links Parent User + Parent link record
```

**Signup collects:** full name, Gmail email, mobile, center  
**Parent details:** added after login (not at signup)

---

## 2. API endpoints

| Step | Method | Endpoint | Auth |
|------|--------|----------|------|
| Centers list | GET | `/api/centers/signup` | Public |
| Signup | POST | `/api/auth/student-signup` | Public |
| Verify OTP | POST | `/api/auth/verify-student-signup` | Public |
| Get profile | GET | `/api/user/profile` | Bearer token |
| Get student details | GET | `/api/user/student-details` | Student token |
| Update profile (+ parent optional) | PUT | `/api/user/profile` | Bearer token |
| Update parent (dedicated) | PUT | `/api/user/update-parent-details` | Student token |
| Parent login OTP | POST | `/api/auth/parent-login-request` | Public |

**Route registration (`app.js`):**

```javascript
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api', publicRoutes);
```

---

## 3. Request / response examples

### Get centers for signup

```http
GET /api/centers/signup
```

```json
{
  "success": true,
  "count": 2,
  "data": [
    { "_id": "674abc...", "centerName": "Hyderabad Center" }
  ]
}
```

### Student signup

```http
POST /api/auth/student-signup
Content-Type: application/json
```

```json
{
  "name": "Rahul Kumar",
  "email": "rahul@gmail.com",
  "mobile": "9876543210",
  "centerId": "674abc..."
}
```

```json
{
  "success": true,
  "message": "OTP sent successfully. Please verify to complete registration.",
  "userId": "674user...",
  "center": { "_id": "674abc...", "centerName": "Hyderabad Center" },
  "otp": "123456"
}
```

`otp` is only returned in non-production for testing.

### Verify signup

```http
POST /api/auth/verify-student-signup
```

```json
{
  "userId": "674user...",
  "otp": "123456"
}
```

```json
{
  "success": true,
  "message": "Student registration completed successfully",
  "token": "eyJhbG...",
  "user": {
    "id": "...",
    "name": "Rahul Kumar",
    "email": "rahul@gmail.com",
    "mobile": "9876543210",
    "role": "student",
    "isActive": true,
    "center": { "_id": "...", "centerName": "Hyderabad Center", "centerCode": "HYD01" }
  }
}
```

### Add parent details (after login)

```http
PUT /api/user/update-parent-details
Authorization: Bearer <studentToken>
```

```json
{
  "parentName": "Mr. Kumar",
  "parentMobile": "9876543211",
  "parentEmail": "parent@gmail.com"
}
```

---

## 4. Data model relationships

```txt
User (student)
  ├── center → Center (operational center from admin)
  └── Student (profile)
        ├── parentName, parentMobile, parentEmail (stored on Student)
        └── Parent (link table) → User (parent role) when parent account created
```

---

## 5. Models — complete code

### `models/User.js`

```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  mobile: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  password: {
    type: String,
    select: false
  },
  role: {
    type: String,
    enum: ['super_admin', 'center_admin', 'employee', 'student', 'parent'],
    required: true
  },
  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    default: null
  },
  location: {
    type: String,
    enum: ['Hyderabad', 'New Delhi', 'Pune']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

### `models/Student.js`

```javascript
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  parentName: {
    type: String,
    trim: true
  },
  parentMobile: {
    type: String,
    sparse: true,
    unique: true,
    trim: true
  },
  parentEmail: {
    type: String,
    sparse: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  parentMobileVerified: {
    type: Boolean,
    default: false
  },
  parentEmailVerified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
```

### `models/Parent.js`

```javascript
const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Parent', parentSchema);
```

### `models/OTP.js`

```javascript
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  mobile: String,
  email: String,
  otp: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['student', 'parent', 'password_reset', 'admin_access'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  }
}, { timestamps: true });

otpSchema.index({ userId: 1, type: 1 });
otpSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('OTP', otpSchema);
```

### `models/Center.js` (used at signup — ref only)

Student signup stores `User.center` → `Center` document created in Center Management (`/api/admin/centers`). Required fields at signup: `_id`, `centerName`, `status: ACTIVE`, `isDeleted: false`.

---

## 6. Utils — complete code

### `utils/studentEmail.js`

```javascript
const GMAIL_DOMAIN = '@gmail.com';

const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') return null;
  return email.toLowerCase().trim();
};

const isGmailAddress = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return normalized.endsWith(GMAIL_DOMAIN);
};

const assertStudentGmail = (email) => {
  if (!email) return null;
  const normalized = normalizeEmail(email);
  if (!isGmailAddress(normalized)) {
    const err = new Error('Student email must be a Gmail address (e.g. name@gmail.com)');
    err.statusCode = 400;
    throw err;
  }
  return normalized;
};

module.exports = {
  GMAIL_DOMAIN,
  normalizeEmail,
  isGmailAddress,
  assertStudentGmail
};
```

### `utils/otpService.js`

```javascript
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('./emailService');
const { assertEmailConfigured } = require('./emailConfig');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const dispatchOTPEmail = (email, otp, userName, type, mobile) => {
  sendOTPEmail(email, otp, userName, type)
    .then(() => console.log('✅ OTP email sent successfully'))
    .catch((error) => {
      console.error('❌ Failed to send OTP email:', error.message);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n🔐 OTP (${type}) for ${mobile || email}: ${otp}\n`);
      }
    });
};

const sendOTP = async (userId, mobile, email, type = 'student', userName = null) => {
  const otp = generateOTP();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentOtps = await OTP.countDocuments({
    userId,
    createdAt: { $gte: oneHourAgo }
  });

  if (recentOtps >= 5) {
    throw new Error('Too many OTP requests. Please try again after 1 hour.');
  }

  await OTP.deleteMany({ userId, type });

  await OTP.create({
    userId,
    mobile,
    email,
    otp,
    type,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    attempts: 0,
    maxAttempts: 3
  });

  if (email) {
    assertEmailConfigured();
    console.log('Sending OTP email to:', email);
    dispatchOTPEmail(email, otp, userName || 'User', type, mobile);
  } else if (process.env.NODE_ENV !== 'production') {
    console.log(`\n🔐 OTP (${type}) for ${mobile || email}: ${otp}\n`);
  }

  return otp;
};

const verifyOTP = async (userId, otp, type) => {
  const otpRecord = await OTP.findOne({
    userId,
    otp,
    type
  });

  if (!otpRecord) {
    return { valid: false, message: 'Invalid OTP' };
  }

  if (otpRecord.expiresAt < new Date()) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return { valid: false, message: 'OTP has expired' };
  }

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return { valid: false, message: 'Maximum attempts exceeded. Please request a new OTP.' };
  }

  otpRecord.attempts += 1;
  await otpRecord.save();

  await OTP.deleteOne({ _id: otpRecord._id });

  return { valid: true, message: 'OTP verified successfully' };
};

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP
};
```

### `utils/generateToken.js`

```javascript
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      location: user.location
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

module.exports = generateToken;
```

---

## 7. Validation (`middleware/validation.js` — student & parent sections)

```javascript
// Inside validations object:

studentSignup: Joi.object({
  name: Joi.string().min(2).max(100).required().trim(),
  mobile: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({ 'string.pattern.base': 'Invalid Indian mobile number' }),
  email: studentGmailEmail.required(),
  centerId: Joi.string().hex().length(24).required()
}),

verifyStudentSignup: Joi.object({
  userId: Joi.string().required()
    .messages({ 'any.required': 'User ID is required' }),
  otp: Joi.string().length(6).pattern(/^\d{6}$/).required()
    .messages({
      'string.length': 'OTP must be 6 digits',
      'string.pattern.base': 'OTP must contain only numbers'
    })
}),

updateProfile: Joi.object({
  name: Joi.string().min(2).max(100),
  email: Joi.string().email(),
  mobile: Joi.string().pattern(/^[6-9]\d{9}$/)
    .messages({ 'string.pattern.base': 'Invalid Indian mobile number' }),
  parentName: Joi.string().min(2).max(100),
  parentMobile: Joi.string().pattern(/^[6-9]\d{9}$/)
    .messages({ 'string.pattern.base': 'Invalid Indian mobile number' }),
  parentEmail: Joi.string().email()
}).min(1),

updateParentDetails: Joi.object({
  parentName: Joi.string().min(2).max(100).required(),
  parentMobile: Joi.string().pattern(/^[6-9]\d{9}$/).required()
    .messages({ 'string.pattern.base': 'Invalid Indian mobile number' }),
  parentEmail: Joi.string().email().required()
}),
```

---

## 8. Routes — complete code

### `routes/authRoutes.js` (student + parent auth)

```javascript
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
```

### `routes/userRoutes.js` (parent profile)

```javascript
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

router.use(protect);

router.get('/profile', getProfile);
router.get('/student-details', getStudentDetails);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.put('/update-parent-details', updateParentDetails);

module.exports = router;
```

### `routes/publicRoutes.js` (centers for signup)

```javascript
// Active centers for student signup dropdown (public, minimal fields)
router.get('/centers/signup', async (req, res) => {
  try {
    const centers = await Center.find({
      isDeleted: false,
      status: 'ACTIVE'
    })
      .sort({ centerName: 1 })
      .select('centerName name');

    res.json({
      success: true,
      count: centers.length,
      data: centers.map((c) => ({
        _id: c._id,
        centerName: c.centerName || c.name
      }))
    });
  } catch (error) {
    console.error('Get signup centers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching centers',
      error: error.message
    });
  }
});
```

---

## 9. Controllers — student signup (`controllers/authController.js`)

```javascript
const User = require('../models/User');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const Center = require('../models/Center');
const generateToken = require('../utils/generateToken');
const { sendOTP, verifyOTP } = require('../utils/otpService');
const { validate, validations } = require('../middleware/validation');
const { assertStudentGmail, normalizeEmail } = require('../utils/studentEmail');

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

    const activeUser = await User.findOne({
      $or: [{ mobile }, ...(email ? [{ email }] : [])],
      isActive: true
    });

    if (activeUser) {
      return res.status(400).json({
        message: 'User already exists with this mobile or email. Please login instead.'
      });
    }

    const inactiveUser = await User.findOne({
      $or: [{ mobile }, ...(email ? [{ email }] : [])],
      isActive: false
    });

    if (inactiveUser) {
      await User.deleteOne({ _id: inactiveUser._id });
      console.log('🗑️ Deleted inactive user for fresh signup:', inactiveUser._id);
    }

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
      otp = await sendOTP(user._id, mobile, email, 'student', user.name);
    } catch (error) {
      await User.deleteOne({ _id: user._id });
      if (error.statusCode === 503) {
        return res.status(503).json({ message: error.message });
      }
      return res.status(429).json({ message: error.message });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully. Please verify to complete registration.',
      userId: user._id.toString(),
      center: {
        _id: center._id,
        centerName: center.centerName || center.name
      },
      otp
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

    if (!userId || !otp) {
      return res.status(400).json({
        message: 'User ID and OTP are required'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isActive) {
      let studentProfile = await Student.findOne({ userId: user._id });

      if (!studentProfile) {
        studentProfile = await Student.create({
          userId: user._id
        });
      }

      const token = generateToken(user);

      return res.status(200).json({
        success: true,
        message: 'Already verified. Login successful.',
        token: token,
        user: await formatStudentAuthUser(user)
      });
    }

    const verification = await verifyOTP(user._id, otp, 'student');

    if (!verification.valid) {
      return res.status(400).json({ message: verification.message });
    }

    user.isActive = true;
    await user.save();

    await Student.create({
      userId: user._id
    });

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
```

---

## 10. Controllers — parent details (`controllers/userController.js`)

```javascript
const User = require('../models/User');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const { validate, validations } = require('../middleware/validation');

// @desc    Update User Profile (optional parent fields for students)
// @route   PUT /api/user/profile
exports.updateProfile = [
  validate(validations.updateProfile),
  async (req, res) => {
    try {
      const { name, email, mobile, parentName, parentMobile, parentEmail } = req.body;

      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (name) user.name = name;
      if (email) user.email = email;
      if (mobile) user.mobile = mobile;

      await user.save();

      let studentProfile;
      if (user.role === 'student') {
        studentProfile = await Student.findOne({ userId: user._id });

        if (!studentProfile) {
          return res.status(404).json({ message: 'Student profile not found' });
        }

        if (parentName !== undefined) studentProfile.parentName = parentName;
        if (parentMobile !== undefined) {
          studentProfile.parentMobile = parentMobile;
          studentProfile.parentMobileVerified = false;
        }
        if (parentEmail !== undefined) {
          studentProfile.parentEmail = parentEmail;
          studentProfile.parentEmailVerified = false;
        }

        await studentProfile.save();
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          student: studentProfile || undefined
        }
      });
    } catch (error) {
      console.error(error);
      if (error.code === 11000) {
        return res.status(400).json({
          message: 'Email or mobile already in use by another account'
        });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
];

// @desc    Student Update Parent Details (creates parent User + Parent link)
// @route   PUT /api/user/update-parent-details
exports.updateParentDetails = [
  validate(validations.updateParentDetails),
  async (req, res) => {
    try {
      const { parentName, parentMobile, parentEmail } = req.body;

      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.role !== 'student') {
        return res.status(403).json({
          message: 'Only students can update parent details'
        });
      }

      let studentProfile = await Student.findOne({ userId: user._id });

      if (!studentProfile) {
        return res.status(404).json({ message: 'Student profile not found' });
      }

      studentProfile.parentName = parentName;
      studentProfile.parentMobile = parentMobile;
      studentProfile.parentEmail = parentEmail;
      studentProfile.parentMobileVerified = false;
      studentProfile.parentEmailVerified = false;

      await studentProfile.save();

      let parentUser = await User.findOne({
        $or: [
          { email: parentEmail.toLowerCase().trim() },
          { mobile: parentMobile.trim() }
        ],
        role: 'parent'
      });

      if (!parentUser) {
        parentUser = await User.create({
          name: parentName,
          email: parentEmail,
          mobile: parentMobile,
          role: 'parent',
          isActive: true
        });

        await Parent.create({
          userId: parentUser._id,
          studentId: studentProfile._id
        });
      } else {
        parentUser.name = parentName;
        await parentUser.save();

        let parentLink = await Parent.findOne({ userId: parentUser._id });

        if (!parentLink) {
          await Parent.create({
            userId: parentUser._id,
            studentId: studentProfile._id
          });
        } else {
          parentLink.studentId = studentProfile._id;
          await parentLink.save();
        }
      }

      res.json({
        success: true,
        message: 'Parent details updated successfully. Parent can now login using their mobile or email.',
        parent: {
          id: parentUser._id,
          name: parentUser.name,
          email: parentUser.email,
          mobile: parentUser.mobile
        }
      });
    } catch (error) {
      console.error(error);
      if (error.code === 11000) {
        return res.status(400).json({
          message: 'Parent email or mobile already in use by another account'
        });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
];

// @desc    Get Complete Student Details (includes parent + center)
// @route   GET /api/user/student-details
exports.getStudentDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'student') {
      return res.status(403).json({
        message: 'Only students can access this endpoint'
      });
    }

    const userWithCenter = await User.findById(user._id)
      .populate('center', 'centerName centerCode name');

    const student = await Student.findOne({ userId: user._id });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    let parentInfo = null;
    if (student.parentMobile || student.parentEmail) {
      const parentUser = await User.findOne({
        $or: [
          { email: student.parentEmail },
          { mobile: student.parentMobile }
        ],
        role: 'parent'
      }).select('-password');

      if (parentUser) {
        const parentRecord = await Parent.findOne({ userId: parentUser._id });
        parentInfo = {
          userId: parentUser._id,
          name: parentUser.name,
          email: parentUser.email,
          mobile: parentUser.mobile,
          isActive: parentUser.isActive,
          linkedAt: parentRecord?.createdAt
        };
      }
    }

    res.json({
      success: true,
      student: {
        user: {
          id: userWithCenter._id,
          name: userWithCenter.name,
          email: userWithCenter.email,
          mobile: userWithCenter.mobile,
          role: userWithCenter.role,
          isActive: userWithCenter.isActive,
          center: userWithCenter.center
            ? {
                _id: userWithCenter.center._id,
                centerName:
                  userWithCenter.center.centerName || userWithCenter.center.name,
                centerCode: userWithCenter.center.centerCode
              }
            : null,
          createdAt: userWithCenter.createdAt,
          updatedAt: userWithCenter.updatedAt
        },
        profile: {
          id: student._id,
          parentName: student.parentName || null,
          parentMobile: student.parentMobile || null,
          parentEmail: student.parentEmail || null,
          parentMobileVerified: student.parentMobileVerified,
          parentEmailVerified: student.parentEmailVerified,
          createdAt: student.createdAt,
          updatedAt: student.updatedAt
        },
        parent: parentInfo
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
```

---

## 11. File structure summary

```txt
models/
  User.js          — student account (name, email, mobile, center, role)
  Student.js       — parentName, parentMobile, parentEmail on profile
  Parent.js        — links parent User ↔ Student
  OTP.js           — signup OTP storage
  Center.js        — center selected at signup

controllers/
  authController.js   — studentSignup, verifyStudentSignup
  userController.js   — updateParentDetails, updateProfile, getStudentDetails

routes/
  authRoutes.js       — /api/auth/student-signup, verify-student-signup
  userRoutes.js       — /api/user/update-parent-details, profile
  publicRoutes.js     — /api/centers/signup

utils/
  studentEmail.js     — Gmail-only validation
  otpService.js       — sendOTP, verifyOTP
  generateToken.js    — JWT after verify

middleware/
  validation.js       — studentSignup, verifyStudentSignup, updateParentDetails
  authMiddleware.js   — protect (Bearer token)
```

---

## 12. Environment variables

```env
JWT_SECRET=your_secret
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
NODE_ENV=development
```

In development, OTP may be printed in server console if email fails.

---

## 13. Frontend checklist

- [ ] Load centers: `GET /api/centers/signup`
- [ ] Signup form: name, Gmail, mobile, centerId
- [ ] OTP screen: `userId` from signup response + 6-digit OTP
- [ ] Store JWT from verify response
- [ ] Parent form (after login): `PUT /api/user/update-parent-details` with Bearer token

---

## 14. Super Admin edit (optional)

Super Admin can also update student + parent via unified user management:

```http
PUT /api/admin/users/:userId?type=USER
```

See `USER_MANAGEMENT_API_GUIDE.md` for all PUT fields (`parentName`, `parentMobile`, `parentEmail`, etc.).
