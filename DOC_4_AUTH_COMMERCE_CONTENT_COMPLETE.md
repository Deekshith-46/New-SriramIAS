# Auth, Admin, Homepage, Commerce & Website Content

> **Project:** Sriram-IAS Backend  
> **Volume:** `DOC_4_AUTH_COMMERCE_CONTENT_COMPLETE.md`  
> **Files:** 80  
> **Generated:** 2026-05-23  
> **Regenerate:** `node scripts/generate-complete-code-docs.js`

See also: [ARCHITECTURE_INTERCONNECTION_FLOW.md](./ARCHITECTURE_INTERCONNECTION_FLOW.md) | [COMPLETE_CODE_DOCUMENTATION_INDEX.md](./COMPLETE_CODE_DOCUMENTATION_INDEX.md)

---

## Table of contents

1. [Overview](#1-overview)
2. [Files in this volume](#2-files-in-this-volume)
3. [Route map (app.js)](#3-route-map-appjs)
4. [Complete source code](#4-complete-source-code)

---

## 1. Overview

Signup/login, super admin & center admin, homepage CMS, books/cart/orders, live classes, blog, enquiries, center pages (gallery/faculty).

---

## 2. Files in this volume

- `controllers/adminController.js`
- `controllers/announcementController.js`
- `controllers/articleController.js`
- `controllers/authController.js`
- `controllers/blogCategoryController.js`
- `controllers/blogController.js`
- `controllers/bookController.js`
- `controllers/bookOverviewController.js`
- `controllers/bookTopperController.js`
- `controllers/cartController.js`
- `controllers/centerDataController.js`
- `controllers/couponController.js`
- `controllers/enquiryController.js`
- `controllers/featuredArticleController.js`
- `controllers/homePageController.js`
- `controllers/homeSection4Controller.js`
- `controllers/homeTopperController.js`
- `controllers/homeVideoController.js`
- `controllers/languageController.js`
- `controllers/liveClassController.js`
- `controllers/orderController.js`
- `controllers/paperController.js`
- `controllers/topStoryController.js`
- `controllers/userController.js`
- `models/Announcement.js`
- `models/AnnouncementRead.js`
- `models/Article.js`
- `models/Blog.js`
- `models/BlogCategory.js`
- `models/BlogContent.js`
- `models/Book.js`
- `models/BookOrder.js`
- `models/BookOverview.js`
- `models/BookTopper.js`
- `models/Cart.js`
- `models/Center.js`
- `models/CenterData.js`
- `models/Coupon.js`
- `models/CouponUsage.js`
- `models/Employee.js`
- `models/Enquiry.js`
- `models/Faculty.js`
- `models/FeaturedArticle.js`
- `models/Gallery.js`
- `models/HomePage.js`
- `models/HomeSection4.js`
- `models/HomeTopper.js`
- `models/HomeVideo.js`
- `models/Language.js`
- `models/LiveClass.js`
- `models/OTP.js`
- `models/Order.js`
- `models/Paper.js`
- `models/Parent.js`
- `models/Student.js`
- `models/SuccessStory.js`
- `models/TopStory.js`
- `models/User.js`
- `routes/adminEnquiryRoutes.js`
- `routes/adminRoutes.js`
- `routes/announcementRoutes.js`
- `routes/authRoutes.js`
- `routes/blogRoutes.js`
- `routes/bookOverviewRoutes.js`
- `routes/bookRoutes.js`
- `routes/bookTopperRoutes.js`
- `routes/cartRoutes.js`
- `routes/centerDataRoutes.js`
- `routes/centerEnquiryRoutes.js`
- `routes/couponRoutes.js`
- `routes/enquiryRoutes.js`
- `routes/featuredArticleRoutes.js`
- `routes/fixCouponRoutes.js`
- `routes/homePageRoutes.js`
- `routes/homeVideoRoutes.js`
- `routes/liveClassRoutes.js`
- `routes/orderRoutes.js`
- `routes/publicRoutes.js`
- `routes/topStoryRoutes.js`
- `routes/userRoutes.js`

---

## 3. Route map (app.js)

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const publicRoutes = require('./routes/publicRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const adminEnquiryRoutes = require('./routes/adminEnquiryRoutes');
const centerEnquiryRoutes = require('./routes/centerEnquiryRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const filterRoutes = require('./routes/filterRoutes');
const resourceFileRoutes = require('./routes/resourceFileRoutes');
const mockTestRoutes = require('./routes/mockTestRoutes');
const questionRoutes = require('./routes/questionRoutes');
const blogRoutes = require('./routes/blogRoutes');
const featuredArticleRoutes = require('./routes/featuredArticleRoutes');
const topStoryRoutes = require('./routes/topStoryRoutes');
const bookRoutes = require('./routes/bookRoutes');
const bookOverviewRoutes = require('./routes/bookOverviewRoutes');
const bookTopperRoutes = require('./routes/bookTopperRoutes');
const couponRoutes = require('./routes/couponRoutes');
const fixCouponRoutes = require('./routes/fixCouponRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const liveClassRoutes = require('./routes/liveClassRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const cartRoutes = require('./routes/cartRoutes');

const centerDataRoutes = require('./routes/centerDataRoutes');
const testCategoryRoutes = require('./routes/testCategoryRoutes');

const testContentRoutes = require('./routes/testContentRoutes');
const testPaperRoutes = require('./routes/testPaperRoutes');
const testQuestionRoutes = require('./routes/testQuestionRoutes');
const testAttemptRoutes = require('./routes/testAttemptRoutes');
const homePageRoutes = require('./routes/homePageRoutes');
const homeVideoRoutes = require('./routes/homeVideoRoutes');
const courseSubjectRoutes = require('./routes/courseSubjectRoutes');
const recordedLectureRoutes = require('./routes/recordedLectureRoutes');
const lectureNoteRoutes = require('./routes/lectureNoteRoutes');
const lectureProgressRoutes = require('./routes/lectureProgressRoutes');
const lectureQuizAttemptRoutes = require('./routes/lectureQuizAttemptRoutes');
const lectureAnswerRoutes = require('./routes/lectureAnswerRoutes');
const courseProgressRoutes = require('./routes/courseProgressRoutes');
const lmsTestRoutes = require('./routes/lmsTestRoutes');
const testExamRoutes = require('./routes/testExamRoutes');
const testResultRoutes = require('./routes/testResultRoutes');
const lmsBookmarkRoutes = require('./routes/lmsBookmarkRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const answerWritingRoutes = require('./routes/answerWritingRoutes');
const portalFreeResourceRoutes = require('./routes/portalFreeResourceRoutes');
const portalCurrentAffairsRoutes = require('./routes/portalCurrentAffairsRoutes');


const app = express();

// Connect to database
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
})); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Rate limiting for OTP endpoints
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many OTP requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for lecture tracking (prevent progress/notes spam)
const lectureProgressLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many progress updates. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

const lectureNotesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many note updates. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiters
app.use('/api/auth/send-otp', otpLimiter);
app.use('/api/auth/verify-otp', otpLimiter);
app.use('/api/lecture-progress', lectureProgressLimiter);
app.use('/api/lecture-notes', lectureNotesLimiter);
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api', publicRoutes); // Public routes for centers and categories
app.use('/api/enquiries', enquiryRoutes); // Public enquiry route
app.use('/api/admin/enquiries', adminEnquiryRoutes); // Super Admin enquiry routes
app.use('/api/center/enquiries', centerEnquiryRoutes); // Center Admin & Employee enquiry routes

// Free Resources CMS routes
app.use('/api/resources', resourceRoutes); // Categories & SubCategories
app.use('/api/resources/filters', filterRoutes); // Dynamic Filters
app.use('/api/resources/files', resourceFileRoutes); // Resources (PDFs, Study Material)
app.use('/api/resources/mock-tests', mockTestRoutes); // Mock Tests
app.use('/api/resources/questions', questionRoutes); // Questions

// Portal UI — two tabs (CMS unchanged at /api/resources/*)
app.use('/api/portal/current-affairs', portalCurrentAffairsRoutes);
app.use('/api/portal/free-resources', portalFreeResourceRoutes);

// Blog routes
app.use('/api/blog', blogRoutes);

// Featured Articles routes
app.use('/api/featured-articles', featuredArticleRoutes);

// Top Stories routes
app.use('/api/top-stories', topStoryRoutes);

// Book Commerce routes
app.use('/api/books', bookRoutes);
app.use('/api/overviews', bookOverviewRoutes);  // Independent overview videos
app.use('/api/toppers', bookTopperRoutes);      // Independent topper videos

// Coupon routes
app.use('/api/coupons', couponRoutes);
app.use('/api/coupons', fixCouponRoutes); // Fix duplicate coupon issues

// Payment & Enrollment routes
app.use('/api/payments', paymentRoutes);

// Order Management routes
app.use('/api/orders', orderRoutes);

// Live Class routes
app.use('/api/live-classes', liveClassRoutes);

// My Courses — recorded lectures LMS
app.use('/api/course-subjects', courseSubjectRoutes);
app.use('/api/recorded-lectures', recordedLectureRoutes);
app.use('/api/lecture-notes', lectureNoteRoutes);
app.use('/api/lecture-progress', lectureProgressRoutes);
app.use('/api/lecture-quiz-attempts', lectureQuizAttemptRoutes);
app.use('/api/lecture-answers', lectureAnswerRoutes);
app.use('/api/course-progress', courseProgressRoutes);

// My Courses — Tests (Weekly / Daily / Monthly)
app.use('/api/tests', lmsTestRoutes);

// Test Series — course-linked exams (NCERT-style test series courses)
app.use('/api/test-exams', testExamRoutes);
app.use('/api/test-results', testResultRoutes);

// My Courses — Bookmarks (recordings + tests)
app.use('/api/bookmarks', lmsBookmarkRoutes);

// Attendance (student check-in/out, multi-role view)
app.use('/api/attendance', attendanceRoutes);

// Answer writing (UPSC Mains)
app.use('/api/answer-writing', answerWritingRoutes);

// Announcement routes
app.use('/api/announcements', announcementRoutes);

// Cart routes
app.use('/api/cart', cartRoutes);


// Center Data routes
app.use('/api/centers', centerDataRoutes);

// Test & Content Management routes
app.use('/api/test-categories', testCategoryRoutes);
app.use('/api/test-contents', testContentRoutes);
app.use('/api/test-papers', testPaperRoutes);
app.use('/api/test-questions', testQuestionRoutes);
app.use('/api/test-attempts', testAttemptRoutes);

// HomePage CMS routes
app.use('/api/homepage', homePageRoutes);

// Home Video routes
app.use('/api/home-videos', homeVideoRoutes);



const { isEmailConfigured } = require('./utils/emailConfig');

const healthPayload = () => ({
  status: 'OK',
  message: 'Sriram IAS Backend is running',
  timestamp: new Date().toISOString(),
  email: {
    configured: isEmailConfigured(),
    provider: 'gmail-smtp',
    otpInResponse: true,
    hint: isEmailConfigured()
      ? 'OTP sent via email and included in API response (testing)'
      : 'Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in environment'
  }
});

app.get('/health', (req, res) => {
  res.json(healthPayload());
});

app.get('/api/health', (req, res) => {
  res.json(healthPayload());
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Sriram IAS Backend API',
    version: '1.0.0',
    documentation: '/api-docs' // You can add Swagger docs later
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
```

---

## 4. Complete source code

### `controllers/adminController.js`

```javascript
const User = require('../models/User');
const Employee = require('../models/Employee');
const Center = require('../models/Center');
const Category = require('../models/Category');
const { validate, validations } = require('../middleware/validation');

// @desc    Create Center Admin
// @route   POST /api/admin/create-center-admin
// @access  Super Admin
exports.createCenterAdmin = [
  validate(validations.createCenterAdmin),
  async (req, res) => {
    try {
      const { name, email, password, location } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({ 
          message: 'User already exists with this email' 
        });
      }

      // Create center admin user
      const user = await User.create({
        name,
        email,
        password,
        role: 'center_admin',
        location,
        isActive: true
      });

      // Create or update center record
      let center = await Center.findOne({ location });

      if (center) {
        center.adminId = user._id;
        await center.save();
      } else {
        await Center.create({
          location,
          adminId: user._id
        });
      }

      res.status(201).json({
        success: true,
        message: 'Center admin created successfully',
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
      if (error.code === 11000) {
        return res.status(400).json({ 
          message: 'User already exists with this email' 
        });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
];

// @desc    Create Employee
// @route   POST /api/admin/create-employee
// @access  Center Admin
exports.createEmployee = [
  validate(validations.createEmployee),
  async (req, res) => {
    try {
      const { name, email, password, permissions, center } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({ 
          message: 'User already exists with this email' 
        });
      }

      // Use center admin's location if not provided
      const employeeLocation = center || req.user.location;

      // Create employee user
      const user = await User.create({
        name,
        email,
        password,
        role: 'employee',
        location: employeeLocation,
        isActive: true
      });

      // Create employee profile
      const employee = await Employee.create({
        userId: user._id,
        permissions: permissions || [],
        center: employeeLocation
      });

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          location: user.location,
          permissions: employee.permissions
        }
      });
    } catch (error) {
      console.error(error);
      if (error.code === 11000) {
        return res.status(400).json({ 
          message: 'User already exists with this email' 
        });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
];

// @desc    Get All Users (Filtered by Role and Location)
// @route   GET /api/admin/users
// @access  Super Admin, Center Admin
exports.getUsers = async (req, res) => {
  try {
    const { role, location, page = 1, limit = 10 } = req.query;

    // Build filter
    const filter = {};

    // Filter by role if provided
    if (role) {
      filter.role = role;
    }

    // Filter by location based on user role
    if (req.user.role === 'center_admin') {
      // Center admins can only see users in their location
      filter.location = req.user.location;
    } else if (location && req.user.role === 'super_admin') {
      // Super admins can filter by location
      filter.location = location;
    }

    // Pagination
    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update User Status (Activate/Deactivate)
// @route   PUT /api/admin/user/:id/status
// @access  Super Admin, Center Admin
exports.updateUserStatus = [
  validate(validations.updateUserStatus),
  async (req, res) => {
    try {
      const { isActive } = req.body;
      const userId = req.params.id;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Center admins can only update users in their location
      if (req.user.role === 'center_admin' && user.location !== req.user.location) {
        return res.status(403).json({ 
          message: 'You can only manage users in your location' 
        });
      }

      user.isActive = isActive;
      await user.save();

      res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isActive: user.isActive
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
];

// @desc    Get Centers
// @route   GET /api/admin/centers
// @access  Super Admin
exports.getCenters = async (req, res) => {
  try {
    const centers = await Center.find().populate('centerAdmin', 'name email').sort({ createdAt: -1 });

    res.json({
      success: true,
      centers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create Center
// @route   POST /api/admin/centers
// @access  Super Admin
exports.createCenter = async (req, res) => {
  try {
    const { name } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        message: 'Center name is required' 
      });
    }

    // Check if center already exists
    const existingCenter = await Center.findOne({ name });
    if (existingCenter) {
      return res.status(400).json({ 
        message: 'Center already exists with this name' 
      });
    }

    // Create center
    const center = await Center.create({
      name
    });

    res.status(201).json({
      success: true,
      message: 'Center created successfully',
      center
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Center already exists with this name' 
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update Center
// @route   PUT /api/admin/centers/:id
// @access  Super Admin
exports.updateCenter = async (req, res) => {
  try {
    const { name } = req.body;
    const centerId = req.params.id;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        message: 'Center name is required' 
      });
    }

    // Check if center exists
    const center = await Center.findById(centerId);
    if (!center) {
      return res.status(404).json({ 
        message: 'Center not found' 
      });
    }

    // Check if name already exists (but not the current center)
    const existingCenter = await Center.findOne({ name, _id: { $ne: centerId } });
    if (existingCenter) {
      return res.status(400).json({ 
        message: 'Another center already exists with this name' 
      });
    }

    // Update center
    center.name = name;
    await center.save();

    res.json({
      success: true,
      message: 'Center updated successfully',
      center
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete Center
// @route   DELETE /api/admin/centers/:id
// @access  Super Admin
exports.deleteCenter = async (req, res) => {
  try {
    const centerId = req.params.id;

    // Check if center exists
    const center = await Center.findById(centerId);
    if (!center) {
      return res.status(404).json({ 
        message: 'Center not found' 
      });
    }

    // Check if center has courses
    const Course = require('../models/Course');
    const courseCount = await Course.countDocuments({ center: centerId });
    if (courseCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete center. It has ${courseCount} course(s) associated with it. Delete the courses first.` 
      });
    }

    // Delete center
    await Center.findByIdAndDelete(centerId);

    res.json({
      success: true,
      message: 'Center deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get Categories
// @route   GET /api/admin/categories
// @access  Super Admin, Center Admin
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create Category
// @route   POST /api/admin/categories
// @access  Super Admin
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        message: 'Category name is required' 
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ 
        message: 'Category already exists with this name' 
      });
    }

    // Create category
    const category = await Category.create({
      name
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Category already exists with this name' 
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update Category
// @route   PUT /api/admin/categories/:id
// @access  Super Admin
exports.updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const categoryId = req.params.id;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        message: 'Category name is required' 
      });
    }

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ 
        message: 'Category not found' 
      });
    }

    // Check if name already exists (but not the current category)
    const existingCategory = await Category.findOne({ name, _id: { $ne: categoryId } });
    if (existingCategory) {
      return res.status(400).json({ 
        message: 'Another category already exists with this name' 
      });
    }

    // Update category
    category.name = name;
    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete Category
// @route   DELETE /api/admin/categories/:id
// @access  Super Admin
exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ 
        message: 'Category not found' 
      });
    }

    // Check if category has courses
    const Course = require('../models/Course');
    const courseCount = await Course.countDocuments({ category: categoryId });
    if (courseCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category. It has ${courseCount} course(s) associated with it. Delete the courses first.` 
      });
    }

    // Delete category
    await Category.findByIdAndDelete(categoryId);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
```

### `controllers/announcementController.js`

```javascript
const Announcement = require('../models/Announcement');
const AnnouncementRead = require('../models/AnnouncementRead');
const Enrollment = require('../models/Enrollment');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

// @desc    Create announcement (Admin)
// @route   POST /api/announcements
// @access  Private/Admin
// @type    multipart/form-data (supports thumbnail & pdf upload)
exports.createAnnouncement = async (req, res) => {
   try {
      const {
         title,
         description,
         announcementType,
         courseId,
         categoryId,
         centerId,
         publishedAt
      } = req.body;

      // Validate required fields
      if (!title || !description || !courseId) {
         return res.status(400).json({
            success: false,
            message: 'Missing required fields: title, description, and courseId are required'
         });
      }

      // Center admin security validation
      if (req.user.role === 'center_admin') {
         if (!req.user.centerId || (centerId && req.user.centerId.toString() !== centerId)) {
            return res.status(403).json({
               success: false,
               message: 'You can only create announcements for your own center'
            });
         }
      }

      // Upload thumbnail to Cloudinary if provided
      let thumbnail = null;
      if (req.files && req.files.thumbnail) {
         thumbnail = await uploadToCloudinary(req.files.thumbnail[0], 'announcements/thumbnails', 'image');
      }

      // Upload PDF to Cloudinary if provided
      let pdf = null;
      if (req.files && req.files.pdf) {
         const pdfFile = req.files.pdf[0];
         pdf = await uploadToCloudinary(pdfFile, 'announcements/pdfs', 'raw');
         pdf.originalName = pdfFile.originalname;
      }

      // Save in MongoDB
      const announcement = await Announcement.create({
         title,
         description,
         announcementType: announcementType || 'general',
         courseId,
         categoryId: categoryId || null,
         centerId: centerId || null,
         publishedAt: publishedAt || Date.now(),
         thumbnail,
         pdf,
         createdBy: req.user._id
      });

      res.status(201).json({
         success: true,
         message: 'Announcement created successfully',
         data: announcement
      });

   } catch (error) {
      console.error('Create Announcement Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to create announcement',
         error: error.message
      });
   }
};

// @desc    Get all announcements (Admin)
// @route   GET /api/announcements
// @access  Private/Admin
exports.getAllAnnouncements = async (req, res) => {
   try {
      const { courseId, centerId, categoryId, announcementType, isActive, page = 1, limit = 20 } = req.query;

      // Protect against large limits
      const safeLimit = Math.min(parseInt(limit) || 20, 100);
      const safePage = Math.max(parseInt(page) || 1, 1);

      const filter = {};
      if (courseId) filter.courseId = courseId;
      if (centerId) filter.centerId = centerId;
      if (categoryId) filter.categoryId = categoryId;
      if (announcementType) filter.announcementType = announcementType;
      if (isActive !== undefined) filter.isActive = isActive === 'true';

      // Center admin can only see their center's announcements
      if (req.user.role === 'center_admin' && req.user.centerId) {
         filter.centerId = req.user.centerId;
      }

      const skip = (safePage - 1) * safeLimit;

      const announcements = await Announcement.find(filter)
         .populate('courseId', 'title slug')
         .populate('centerId', 'name')
         .populate('categoryId', 'name')
         .populate('createdBy', 'name email')
         .sort({ publishedAt: -1 })
         .skip(skip)
         .limit(safeLimit);

      const total = await Announcement.countDocuments(filter);

      res.json({
         success: true,
         count: announcements.length,
         total,
         pages: Math.ceil(total / safeLimit),
         currentPage: safePage,
         data: announcements
      });

   } catch (error) {
      console.error('Get All Announcements Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch announcements',
         error: error.message
      });
   }
};

// @desc    Get single announcement (Admin)
// @route   GET /api/announcements/:id
// @access  Private/Admin
exports.getAnnouncementById = async (req, res) => {
   try {
      const announcement = await Announcement.findById(req.params.id)
         .populate('courseId', 'title slug')
         .populate('centerId', 'name')
         .populate('categoryId', 'name')
         .populate('createdBy', 'name email');

      if (!announcement) {
         return res.status(404).json({
            success: false,
            message: 'Announcement not found'
         });
      }

      res.json({
         success: true,
         data: announcement
      });

   } catch (error) {
      console.error('Get Announcement Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch announcement',
         error: error.message
      });
   }
};

// @desc    Update announcement (Admin)
// @route   PUT /api/announcements/:id
// @access  Private/Admin
// @type    multipart/form-data
exports.updateAnnouncement = async (req, res) => {
   try {
      const {
         title,
         description,
         announcementType,
         courseId,
         categoryId,
         centerId,
         publishedAt
      } = req.body;

      const announcement = await Announcement.findById(req.params.id);

      if (!announcement) {
         return res.status(404).json({
            success: false,
            message: 'Announcement not found'
         });
      }

      // Center admin security validation
      if (req.user.role === 'center_admin') {
         if (!req.user.centerId || req.user.centerId.toString() !== announcement.centerId?.toString()) {
            return res.status(403).json({
               success: false,
               message: 'You can only update announcements for your own center'
            });
         }
      }

      // Upload new thumbnail if provided
      let thumbnail = announcement.thumbnail;
      if (req.files && req.files.thumbnail) {
         thumbnail = await uploadToCloudinary(req.files.thumbnail[0], 'announcements/thumbnails', 'image');
      }

      // Upload new PDF if provided
      let pdf = announcement.pdf;
      if (req.files && req.files.pdf) {
         const pdfFile = req.files.pdf[0];
         pdf = await uploadToCloudinary(pdfFile, 'announcements/pdfs', 'raw');
         pdf.originalName = pdfFile.originalname;
      }

      // Update fields
      announcement.title = title || announcement.title;
      announcement.description = description || announcement.description;
      announcement.announcementType = announcementType || announcement.announcementType;
      announcement.courseId = courseId || announcement.courseId;
      announcement.categoryId = categoryId !== undefined ? categoryId : announcement.categoryId;
      announcement.centerId = centerId !== undefined ? centerId : announcement.centerId;
      announcement.publishedAt = publishedAt ? new Date(publishedAt) : announcement.publishedAt;
      announcement.thumbnail = thumbnail;
      announcement.pdf = pdf;

      await announcement.save();

      res.json({
         success: true,
         message: 'Announcement updated successfully',
         data: announcement
      });

   } catch (error) {
      console.error('Update Announcement Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to update announcement',
         error: error.message
      });
   }
};

// @desc    Delete announcement permanently (Admin)
// @route   DELETE /api/announcements/:id
// @access  Private/Admin
exports.deleteAnnouncement = async (req, res) => {
   try {
      const announcement = await Announcement.findById(req.params.id);

      if (!announcement) {
         return res.status(404).json({
            success: false,
            message: 'Announcement not found'
         });
      }

      // Center admin security validation
      if (req.user.role === 'center_admin') {
         if (!req.user.centerId || req.user.centerId.toString() !== announcement.centerId?.toString()) {
            return res.status(403).json({
               success: false,
               message: 'You can only delete announcements for your own center'
            });
         }
      }

      // Hard delete - remove from database completely
      await Announcement.findByIdAndDelete(req.params.id);

      // Also delete associated read records
      await AnnouncementRead.deleteMany({
         announcementId: req.params.id
      });

      res.json({
         success: true,
         message: 'Announcement deleted permanently',
         data: {
            _id: announcement._id,
            title: announcement.title
         }
      });

   } catch (error) {
      console.error('Delete Announcement Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to delete announcement',
         error: error.message
      });
   }
};

// @desc    Get announcements for enrolled students
// @route   GET /api/announcements/student
// @access  Private
exports.getStudentAnnouncements = async (req, res) => {
   try {
      const { page = 1, limit = 20 } = req.query;

      // Protect against large limits
      const safeLimit = Math.min(parseInt(limit) || 20, 100);
      const safePage = Math.max(parseInt(page) || 1, 1);
      const skip = (safePage - 1) * safeLimit;

      // Get student's enrollments
      const enrollments = await Enrollment.find({
         userId: req.user._id,
         status: { $in: ['active', 'pending'] }
      }).select('courseId');

      if (!enrollments.length) {
         return res.json({
            success: true,
            message: 'No enrollments found',
            data: [],
            total: 0
         });
      }

      const courseIds = enrollments.map(e => e.courseId);

      // Fetch announcements for enrolled courses
      const announcements = await Announcement.find({
         courseId: { $in: courseIds },
         isActive: true
      })
         .populate('courseId', 'title slug')
         .populate('centerId', 'name')
         .sort({ publishedAt: -1 })
         .skip(skip)
         .limit(safeLimit);

      const total = await Announcement.countDocuments({
         courseId: { $in: courseIds },
         isActive: true
      });

      // Get read status for each announcement
      const announcementIds = announcements.map(a => a._id);
      const readRecords = await AnnouncementRead.find({
         userId: req.user._id,
         announcementId: { $in: announcementIds }
      }).select('announcementId');

      const readAnnouncementIds = new Set(readRecords.map(r => r.announcementId.toString()));

      // Add isRead flag to each announcement
      const announcementsWithReadStatus = announcements.map(announcement => {
         const announcementObj = announcement.toObject();
         announcementObj.isRead = readAnnouncementIds.has(announcement._id.toString());
         return announcementObj;
      });

      res.json({
         success: true,
         count: announcementsWithReadStatus.length,
         total,
         pages: Math.ceil(total / safeLimit),
         currentPage: safePage,
         data: announcementsWithReadStatus
      });

   } catch (error) {
      console.error('Get Student Announcements Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch announcements',
         error: error.message
      });
   }
};

// @desc    Mark announcement as read (Student)
// @route   POST /api/announcements/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
   try {
      const announcement = await Announcement.findById(req.params.id);

      if (!announcement) {
         return res.status(404).json({
            success: false,
            message: 'Announcement not found'
         });
      }

      if (!announcement.isActive) {
         return res.status(400).json({
            success: false,
            message: 'This announcement is no longer available'
         });
      }

      // Create or update read record (upsert)
      const readRecord = await AnnouncementRead.findOneAndUpdate(
         {
            announcementId: announcement._id,
            userId: req.user._id
         },
         {
            readAt: Date.now()
         },
         {
            upsert: true,
            new: true
         }
      );

      res.json({
         success: true,
         message: 'Announcement marked as read',
         data: readRecord
      });

   } catch (error) {
      console.error('Mark as Read Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to mark announcement as read',
         error: error.message
      });
   }
};

// @desc    Get unread announcement count (Student)
// @route   GET /api/announcements/student/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
   try {
      // Get student's enrollments
      const enrollments = await Enrollment.find({
         userId: req.user._id,
         status: { $in: ['active', 'pending'] }
      }).select('courseId');

      if (!enrollments.length) {
         return res.json({
            success: true,
            data: { unreadCount: 0 }
         });
      }

      const courseIds = enrollments.map(e => e.courseId);

      // Get total active announcements
      const totalAnnouncements = await Announcement.countDocuments({
         courseId: { $in: courseIds },
         isActive: true
      });

      // Get read announcements
      const readAnnouncements = await AnnouncementRead.countDocuments({
         userId: req.user._id
      });

      const unreadCount = totalAnnouncements - readAnnouncements;

      res.json({
         success: true,
         data: {
            unreadCount: Math.max(0, unreadCount)
         }
      });

   } catch (error) {
      console.error('Get Unread Count Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch unread count',
         error: error.message
      });
   }
};
```

### `controllers/articleController.js`

```javascript
const Article = require('../models/Article');
const BlogCategory = require('../models/BlogCategory');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

// @desc    Create a new article
// @route   POST /api/blog/articles
// @access  Private (Admin)
exports.createArticle = async (req, res) => {
  try {
    const { title, description, content, categoryId } = req.body;

    // Check if category exists and is active
    const category = await BlogCategory.findById(categoryId);
    if (!category || !category.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive category'
      });
    }

    // Upload thumbnail to Cloudinary
    let thumbnail = {};
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
      thumbnail = await uploadToCloudinary(req.files.thumbnail[0], 'blog/thumbnails');
    }

    // Upload article images to Cloudinary (max 5)
    let images = [];
    if (req.files && req.files.images) {
      if (req.files.images.length > 5) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 5 images allowed per article'
        });
      }
      
      const uploadPromises = req.files.images.map(file => 
        uploadToCloudinary(file, 'blog/articles')
      );
      images = await Promise.all(uploadPromises);
    }

    const article = new Article({
      title,
      description,
      content,
      categoryId,
      thumbnail,
      images,
      author: req.user?._id
    });

    await article.save();

    // Populate category for response
    const populatedArticle = await Article.findById(article._id)
      .populate('categoryId', 'name slug');

    // Only include full author details for super admin
    let responseArticle = populatedArticle.toObject();
    if (req.user.role === 'super_admin') {
      await populatedArticle.populate('author', 'name email');
      responseArticle = populatedArticle.toObject();
    } else {
      // For other users, don't include author details
      responseArticle.author = undefined;
    }

    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      data: responseArticle
    });
  } catch (error) {
    console.error('Create Article Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating article',
      error: error.message
    });
  }
};

// @desc    Get all articles with filters, search & pagination
// @route   GET /api/blog/articles
// @access  Public
exports.getArticles = async (req, res) => {
  try {
    const { page = 1, limit = 10, categoryId, search, isActive, sort = 'latest' } = req.query;

    let filter = { isActive: true }; // Default to active only
    
    // Filter by active status (only if explicitly set to false)
    if (isActive === 'false') {
      filter.isActive = false;
    } else if (isActive === 'all') {
      delete filter.isActive; // Allow admin to see all
    }

    // Filter by category
    if (categoryId) {
      filter.categoryId = categoryId;
    }

    // Search using text index (faster than regex)
    if (search) {
      filter.$text = { $search: search };
    }

    // Sorting options
    let sortOption = { createdAt: -1 }; // Default: latest
    if (sort === 'popular') {
      sortOption = { views: -1 };
    } else if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    }

    const articles = await Article.find(filter)
      .populate('categoryId', 'name slug')
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Article.countDocuments(filter);

    // Only include full author details for super admin
    let responseArticles = articles.map(article => {
      const articleObj = article.toObject();
      if (req.user && req.user.role === 'super_admin') {
        return articleObj;
      } else {
        delete articleObj.author;
        return articleObj;
      }
    });

    // If super admin, populate author details
    if (req.user && req.user.role === 'super_admin') {
      await Article.populate(responseArticles, { path: 'author', select: 'name email' });
    }

    res.json({
      success: true,
      count: articles.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: responseArticles
    });
  } catch (error) {
    console.error('Get Articles Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching articles',
      error: error.message
    });
  }
};

// @desc    Get recent 6 articles
// @route   GET /api/blog/articles/recent
// @access  Public
exports.getRecentArticles = async (req, res) => {
  try {
    const articles = await Article.find({ isActive: true })
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 })
      .limit(6);

    // Don't include author details for recent articles (public endpoint)
    const responseArticles = articles.map(article => {
      const articleObj = article.toObject();
      delete articleObj.author;
      return articleObj;
    });

    res.json({
      success: true,
      count: articles.length,
      data: responseArticles
    });
  } catch (error) {
    console.error('Get Recent Articles Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching recent articles',
      error: error.message
    });
  }
};

// @desc    Get single article by ID or slug
// @route   GET /api/blog/articles/:id
// @access  Public
exports.getArticleById = async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find by ID or slug
    let article = await Article.findOne({ 
      $or: [
        { _id: id },
        { slug: id }
      ],
      isActive: true 
    })
      .populate('categoryId', 'name slug');

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Increment views
    await article.incrementViews();

    // Fetch again to get updated views
    article = await Article.findById(article._id)
      .populate('categoryId', 'name slug');

    // Only include full author details for super admin
    let responseArticle = article.toObject();
    if (req.user && req.user.role === 'super_admin') {
      await article.populate('author', 'name email');
      responseArticle = article.toObject();
    } else {
      // For public/other users, don't include author details
      delete responseArticle.author;
    }

    res.json({
      success: true,
      data: responseArticle
    });
  } catch (error) {
    console.error('Get Article Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching article',
      error: error.message
    });
  }
};

// @desc    Update article
// @route   PUT /api/blog/articles/:id
// @access  Private (Admin)
exports.updateArticle = async (req, res) => {
  try {
    const { title, description, content, categoryId, removeThumbnail, removeImages } = req.body;

    let article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Validate category if changed
    if (categoryId) {
      const category = await BlogCategory.findById(categoryId);
      if (!category || !category.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive category'
        });
      }
      article.categoryId = categoryId;
    }

    // Update text fields
    if (title) article.title = title;
    if (description !== undefined) article.description = description;
    if (content) article.content = content;

    // Remove thumbnail if requested
    if (removeThumbnail === 'true') {
      article.thumbnail = {};
    }

    // Upload new thumbnail if provided
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
      article.thumbnail = await uploadToCloudinary(req.files.thumbnail[0], 'blog/thumbnails');
    }

    // Remove specific images if requested
    if (removeImages) {
      const indexesToRemove = removeImages.split(',').map(i => parseInt(i));
      article.images = article.images.filter((_, index) => !indexesToRemove.includes(index));
    }

    // Upload new images if provided
    if (req.files && req.files.images) {
      const totalImages = article.images.length + req.files.images.length;
      if (totalImages > 5) {
        return res.status(400).json({
          success: false,
          message: `Maximum 5 images allowed. You currently have ${article.images.length} and are trying to add ${req.files.images.length} more.`
        });
      }

      const uploadPromises = req.files.images.map(file => 
        uploadToCloudinary(file, 'blog/articles')
      );
      const newImages = await Promise.all(uploadPromises);
      article.images = [...article.images, ...newImages];
    }

    await article.save();

    // Populate for response
    article = await Article.findById(article._id)
      .populate('categoryId', 'name slug');

    // Only include full author details for super admin
    let responseArticle = article.toObject();
    if (req.user.role === 'super_admin') {
      await article.populate('author', 'name email');
      responseArticle = article.toObject();
    } else {
      // For center admin, don't include author details
      responseArticle.author = undefined;
    }

    res.json({
      success: true,
      message: 'Article updated successfully',
      data: responseArticle
    });
  } catch (error) {
    console.error('Update Article Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating article',
      error: error.message
    });
  }
};

// @desc    Delete article (soft delete)
// @route   DELETE /api/blog/articles/:id
// @access  Private (Admin)
exports.deleteArticle = async (req, res) => {
  try {
    let article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Soft delete
    article.isActive = false;
    await article.save();

    res.json({
      success: true,
      message: 'Article deleted successfully',
      data: article
    });
  } catch (error) {
    console.error('Delete Article Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting article',
      error: error.message
    });
  }
};
```

### `controllers/authController.js`

```javascript
const User = require('../models/User');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const generateToken = require('../utils/generateToken');
const { sendOTP, verifyOTP } = require('../utils/otpService');
const { validate, validations } = require('../middleware/validation');
const { assertStudentGmail, normalizeEmail } = require('../utils/studentEmail');

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

    // Find user with STRICT query (not $or)
    let user;
    if (email) {
      user = await User.findOne({ email });
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

    if (email && otpType === 'student') {
      try {
        assertStudentGmail(email);
      } catch (err) {
        return res.status(err.statusCode || 400).json({ message: err.message });
      }
    }

    let otp;
    try {
      otp = await sendOTP(user._id, mobile, email, otpType, user.name);
    } catch (error) {
      if (error.statusCode === 503) {
        return res.status(503).json({ message: error.message });
      }
      return res.status(429).json({ message: error.message });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      userId: user._id.toString(),
      otp
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
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

    // Find user by email, mobile, or userId (strict query - backend finds user internally)
    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (email) {
      user = await User.findOne({ email });
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

    if (email && otpType === 'student') {
      try {
        assertStudentGmail(email);
      } catch (err) {
        return res.status(err.statusCode || 400).json({ message: err.message });
      }
    }

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
}];

// @desc    Student Signup - Send OTP
// @route   POST /api/auth/student-signup
// @access  Public
exports.studentSignup = async (req, res) => {
  try {
    const { name, mobile, email: rawEmail } = req.body;
    let email = null;

    if (rawEmail) {
      try {
        email = assertStudentGmail(rawEmail);
      } catch (err) {
        return res.status(err.statusCode || 400).json({ message: err.message });
      }
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
      name,
      mobile,
      email,
      role: 'student',
      isActive: false  // Inactive until OTP verified
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
      otp
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

    let otp;
    try {
      otp = await sendOTP(parentUser._id, otpMobile, otpEmail, 'parent', parentUser.name);
    } catch (error) {
      if (error.statusCode === 503) {
        return res.status(503).json({ message: error.message });
      }
      return res.status(429).json({ message: error.message });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      sentTo: otpEmail ? 'email' : 'mobile',
      userId: parentUser._id.toString(),
      otp
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
```

### `controllers/blogCategoryController.js`

```javascript
const BlogCategory = require('../models/BlogCategory');
const Article = require('../models/Article');

// @desc    Create a new blog category
// @route   POST /api/blog/categories
// @access  Private (Admin)
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    // Check if category already exists
    const existingCategory = await BlogCategory.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists'
      });
    }

    const category = new BlogCategory({
      name,
      createdBy: req.user?._id
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Create Category Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating category',
      error: error.message
    });
  }
};

// @desc    Get all blog categories
// @route   GET /api/blog/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const { isActive } = req.query;
    
    let filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const categories = await BlogCategory.find(filter)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Get Categories Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories',
      error: error.message
    });
  }
};

// @desc    Get single category
// @route   GET /api/blog/categories/:id
// @access  Public
exports.getCategoryById = async (req, res) => {
  try {
    const category = await BlogCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Get Category Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching category',
      error: error.message
    });
  }
};

// @desc    Update category
// @route   PUT /api/blog/categories/:id
// @access  Private (Admin)
exports.updateCategory = async (req, res) => {
  try {
    const { name, isActive } = req.body;

    let category = await BlogCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Update fields
    if (name) category.name = name;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Update Category Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating category',
      error: error.message
    });
  }
};

// @desc    Delete category (soft delete)
// @route   DELETE /api/blog/categories/:id
// @access  Private (Admin)
exports.deleteCategory = async (req, res) => {
  try {
    const category = await BlogCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has active articles
    const activeArticles = await Article.find({ 
      categoryId: req.params.id, 
      isActive: true 
    });

    if (activeArticles.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${activeArticles.length} active article(s). Please delete or reassign them first.`,
        articleCount: activeArticles.length
      });
    }

    // Soft delete
    category.isActive = false;
    await category.save();

    res.json({
      success: true,
      message: 'Category deleted successfully',
      data: category
    });
  } catch (error) {
    console.error('Delete Category Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting category',
      error: error.message
    });
  }
};
```

### `controllers/blogController.js`

```javascript
const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const BlogContent = require('../models/BlogContent');
const Language = require('../models/Language');
const Paper = require('../models/Paper');
const cloudinary = require('../config/cloudinary');
const slugify = require('slugify');

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file) => {
  if (!file) return null;
  
  try {
    if (file.buffer) {
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'blogs',
      });
      
      return result;
    }
    
    if (file.path) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'blogs',
      });
      
      return result;
    }
    
    return null;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
};

// @desc    Create blog with content sections
// @route   POST /api/blogs
// @access  Private (Admin)
exports.createBlog = async (req, res) => {
  try {
    const { languageId, paperId, title, description, date, tableContent } = req.body;

    // Validate required fields
    if (!languageId || !paperId || !title) {
      return res.status(400).json({
        success: false,
        message: 'languageId, paperId, and title are required'
      });
    }

    // Validate language exists and is active
    const language = await Language.findById(languageId);
    if (!language || !language.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive language'
      });
    }

    // Validate paper exists and is active
    const paper = await Paper.findById(paperId);
    if (!paper || !paper.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive paper'
      });
    }

    // Upload thumbnail
    const thumbnailFile = req.files?.thumbnail?.[0];
    let thumbnail = null;
    if (thumbnailFile) {
      const result = await uploadToCloudinary(thumbnailFile);
      thumbnail = { url: result.url, public_id: result.public_id };
    }

    // Upload multiple images
    const imagesFiles = req.files?.images || [];
    const images = [];
    for (const file of imagesFiles) {
      const result = await uploadToCloudinary(file);
      images.push({ url: result.url, public_id: result.public_id });
    }

    // Auto-extract year and month from date
    const blogDate = date ? new Date(date) : new Date();
    const blogYear = blogDate.getFullYear();
    const blogMonth = blogDate.getMonth() + 1;

    // Generate slug from title
    const slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now();

    // Create blog
    const blog = await Blog.create({
      languageId,
      paperId,
      title,
      description,
      slug,
      thumbnail,
      images,
      date: blogDate,
      year: blogYear,
      month: blogMonth,
      isActive: true,
      views: 0
    });

    // Create blog content sections if provided
    if (tableContent) {
      try {
        console.log('📝 Raw tableContent:', tableContent);
        console.log('📝 Type:', typeof tableContent);
        
        const contents = JSON.parse(tableContent);
        console.log('✅ Parsed contents:', contents);
        
        const contentData = contents.map((item, index) => ({
          blogId: blog._id,
          title: item.title,
          content: item.content,
          order: item.order || (index + 1)
        }));

        await BlogContent.insertMany(contentData);
        console.log('✅ Blog content created:', contentData.length, 'sections');
      } catch (err) {
        console.error('❌ Table content parse error:', err);
        console.error('❌ Raw value:', tableContent);
        return res.status(400).json({
          success: false,
          message: 'Invalid tableContent format. Must be valid JSON array.'
        });
      }
    }

    // Populate and return
    const populatedBlog = await Blog.findById(blog._id)
      .populate('languageId', 'name code')
      .populate('paperId', 'name');

    // Get the blog contents
    const contents = await BlogContent.find({ blogId: blog._id }).sort({ order: 1 });

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: {
        ...populatedBlog._doc,
        contents
      }
    });

  } catch (err) {
    console.error('Create Blog Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error creating blog',
      error: err.message
    });
  }
};

// @desc    Get blogs with filters
// @route   GET /api/blogs
// @access  Public
exports.getBlogs = async (req, res) => {
  try {
    const { languageId, paperId, year, month, date, limit } = req.query;

    const filter = { isActive: true };

    if (languageId) filter.languageId = languageId;
    if (paperId) filter.paperId = paperId;
    
    // If complete date is provided, use it directly (year, month auto-extracted)
    if (date) {
      const selectedDate = new Date(date);
      const start = new Date(selectedDate.setHours(0, 0, 0, 0));
      const end = new Date(selectedDate.setHours(23, 59, 59, 999));
      filter.date = { $gte: start, $lte: end };
    } else {
      // Fallback to year/month filtering if date not provided
      if (year) filter.year = parseInt(year);
      if (month) filter.month = parseInt(month);
    }

    // Default limit if not provided
    const blogLimit = parseInt(limit) || 10;

    let blogs = await Blog.find(filter)
      .populate('languageId', 'name code')
      .populate('paperId', 'name')
      .sort({ createdAt: -1 }); // ALWAYS sort by latest

    // Apply limit if specified
    if (blogLimit) {
      blogs = blogs.slice(0, blogLimit);
    }

    res.json({
      success: true,
      count: blogs.length,
      data: blogs
    });

  } catch (err) {
    console.error('Get Blogs Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: err.message
    });
  }
};

// @desc    Get single blog with content sections
// @route   GET /api/blogs/:id
// @access  Public
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('languageId', 'name code')
      .populate('paperId', 'name');

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Get blog content sections
    const contents = await BlogContent.find({ blogId: blog._id })
      .sort({ order: 1 });

    res.json({
      success: true,
      data: {
        ...blog._doc,
        contents
      }
    });

  } catch (err) {
    console.error('Get Blog Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching blog',
      error: err.message
    });
  }
};

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private (Admin)
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    const updates = {};

    // Update basic fields
    if (req.body.languageId) {
      // Validate language
      const language = await Language.findById(req.body.languageId);
      if (!language || !language.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive language'
        });
      }
      updates.languageId = req.body.languageId;
    }
    
    if (req.body.paperId) {
      // Validate paper
      const paper = await Paper.findById(req.body.paperId);
      if (!paper || !paper.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive paper'
        });
      }
      updates.paperId = req.body.paperId;
    }
    
    if (req.body.title) {
      updates.title = req.body.title;
      // Regenerate slug if title changes
      updates.slug = slugify(req.body.title, { lower: true, strict: true }) + '-' + Date.now();
    }
    
    if (req.body.description !== undefined) updates.description = req.body.description;
    
    if (req.body.date) {
      updates.date = new Date(req.body.date);
      // Auto-extract year and month from date
      updates.year = updates.date.getFullYear();
      updates.month = updates.date.getMonth() + 1;
    }
    
    // Only update year/month if date is not provided
    if (!req.body.date) {
      if (req.body.year) updates.year = parseInt(req.body.year);
      if (req.body.month) updates.month = parseInt(req.body.month);
    }
    
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

    // Upload new thumbnail if provided
    const thumbnailFile = req.files?.thumbnail?.[0];
    if (thumbnailFile) {
      // Delete old thumbnail
      if (blog.thumbnail?.public_id) {
        await cloudinary.uploader.destroy(blog.thumbnail.public_id);
      }
      const result = await uploadToCloudinary(thumbnailFile);
      updates.thumbnail = { url: result.url, public_id: result.public_id };
    }

    // Upload new images if provided
    const imagesFiles = req.files?.images || [];
    if (imagesFiles.length > 0) {
      // Delete old images
      if (blog.images && blog.images.length > 0) {
        for (const img of blog.images) {
          if (img.public_id) {
            await cloudinary.uploader.destroy(img.public_id);
          }
        }
      }
      
      const newImages = [];
      for (const file of imagesFiles) {
        const result = await uploadToCloudinary(file);
        newImages.push({ url: result.url, public_id: result.public_id });
      }
      updates.images = newImages;
    }

    // Update blog
    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('languageId', 'name code').populate('paperId', 'name');

    // Update content sections if provided
    if (req.body.tableContent) {
      try {
        console.log('📝 Updating tableContent...');
        const contents = JSON.parse(req.body.tableContent);
        
        // Delete old contents first
        await BlogContent.deleteMany({ blogId: blog._id });
        console.log('✅ Old contents deleted');
        
        // Insert new contents
        const contentData = contents.map((item, index) => ({
          blogId: blog._id,
          title: item.title,
          content: item.content,
          order: item.order || (index + 1)
        }));

        await BlogContent.insertMany(contentData);
        console.log('✅ New contents created:', contentData.length, 'sections');
      } catch (err) {
        console.error('❌ Table content update error:', err);
      }
    }

    // Get updated contents
    const updatedContents = await BlogContent.find({ blogId: updatedBlog._id }).sort({ order: 1 });

    res.json({
      success: true,
      message: 'Blog updated successfully',
      data: {
        ...updatedBlog._doc,
        contents: updatedContents
      }
    });

  } catch (err) {
    console.error('Update Blog Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating blog',
      error: err.message
    });
  }
};

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private (Admin)
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Delete thumbnail from Cloudinary
    if (blog.thumbnail?.public_id) {
      await cloudinary.uploader.destroy(blog.thumbnail.public_id);
    }

    // Delete images from Cloudinary
    if (blog.images && blog.images.length > 0) {
      for (const img of blog.images) {
        if (img.public_id) {
          await cloudinary.uploader.destroy(img.public_id);
        }
      }
    }

    // Delete blog content sections
    await BlogContent.deleteMany({ blogId: blog._id });

    // Delete blog
    await Blog.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });

  } catch (err) {
    console.error('Delete Blog Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting blog',
      error: err.message
    });
  }
};

// @desc    Get blogs filtered by language (with contents)
// @route   GET /api/blogs/filters/language
// @access  Public
exports.getFiltersByLanguage = async (req, res) => {
  try {
    const { languageId } = req.query;
    
    if (!languageId) {
      return res.status(400).json({
        success: false,
        message: 'languageId is required'
      });
    }

    const blogs = await Blog.find({ 
      isActive: true, 
      languageId: new mongoose.Types.ObjectId(languageId) 
    })
      .select('thumbnail title date')
      .sort({ createdAt: -1 });

    // Format response
    const formattedBlogs = blogs.map(blog => ({
      _id: blog._id,
      thumbnail: blog.thumbnail?.url || null,
      title: blog.title,
      date: blog.date
    }));

    res.json({
      success: true,
      count: formattedBlogs.length,
      data: formattedBlogs
    });

  } catch (err) {
    console.error('Get Filters By Language Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: err.message
    });
  }
};

// @desc    Get blogs filtered by paper (with contents, regardless of language)
// @route   GET /api/blogs/filters/paper
// @access  Public
exports.getFiltersByPaper = async (req, res) => {
  try {
    const { paperId } = req.query;
    
    if (!paperId) {
      return res.status(400).json({
        success: false,
        message: 'paperId is required'
      });
    }

    const blogs = await Blog.find({ 
      isActive: true, 
      paperId: new mongoose.Types.ObjectId(paperId) 
    })
      .select('thumbnail title date')
      .sort({ createdAt: -1 });

    // Format response
    const formattedBlogs = blogs.map(blog => ({
      _id: blog._id,
      thumbnail: blog.thumbnail?.url || null,
      title: blog.title,
      date: blog.date
    }));

    res.json({
      success: true,
      count: formattedBlogs.length,
      data: formattedBlogs
    });

  } catch (err) {
    console.error('Get Filters By Paper Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: err.message
    });
  }
};

// @desc    Get blog filter options (years, months, dates)
// @route   GET /api/blogs/filter-options
// @access  Public
exports.getBlogFilterOptions = async (req, res) => {
  try {
    const data = await Blog.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          years: { $addToSet: "$year" },
          months: { $addToSet: "$month" },
          dates: { $addToSet: "$date" }
        }
      }
    ]);

    const result = data[0] || { years: [], months: [], dates: [] };

    res.json({
      success: true,
      years: result.years.sort((a, b) => b - a),
      months: result.months.sort((a, b) => b - a),
      dates: result.dates.sort((a, b) => new Date(b) - new Date(a)).map(d => ({
        value: d,
        label: new Date(d).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })
      }))
    });

  } catch (err) {
    console.error('Get Filter Options Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching filter options',
      error: err.message
    });
  }
};
```

### `controllers/bookController.js`

```javascript
const Book = require('../models/Book');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const cloudinary = require('../config/cloudinary');

// @desc    Create a new book
// @route   POST /api/books
// @access  Private (Super Admin & Admin)
exports.createBook = async (req, res) => {
  try {
    const {
      title,
      authorNames,
      subjects,
      summary,
      fullPrice,
      discountPercent,
      stock,
      deliveryCharge,
      offerText,
      isBestSeller
    } = req.body;

    // Validate required image
    if (!req.files || !req.files['image']) {
      return res.status(400).json({
        success: false,
        message: 'Book image is required'
      });
    }

    // Parse arrays from string if sent as form-data
    const parsedAuthorNames = typeof authorNames === 'string' ? JSON.parse(authorNames) : authorNames;
    const parsedSubjects = typeof subjects === 'string' ? JSON.parse(subjects) : subjects;

    // Auto-calculate discountedPrice from fullPrice and discountPercent
    const parsedFullPrice = parseFloat(fullPrice);
    const parsedDiscountPercent = parseFloat(discountPercent) || 0;
    
    // Validate discount percentage
    if (parsedDiscountPercent < 0 || parsedDiscountPercent > 100) {
      return res.status(400).json({
        success: false,
        message: 'Discount percent must be between 0 and 100'
      });
    }
    
    // Auto-calculate discounted price
    const calculatedDiscountedPrice = Math.round(parsedFullPrice - (parsedFullPrice * parsedDiscountPercent / 100));

    // Upload image to Cloudinary
    const imageResult = await uploadToCloudinary(
      req.files['image'][0],
      'books/covers'
    );

    const book = new Book({
      title,
      authorNames: parsedAuthorNames,
      subjects: parsedSubjects,
      summary,
      image: {
        url: imageResult.url,
        publicId: imageResult.public_id
      },
      fullPrice: parsedFullPrice,
      discountPercent: parsedDiscountPercent,
      discountedPrice: calculatedDiscountedPrice,
      stock: parseInt(stock) || 0,
      inStock: parseInt(stock) > 0,
      deliveryCharge: parseFloat(deliveryCharge) || 0,
      offerText: offerText || '',
      isCouponApplicable: true,
      isBestSeller: isBestSeller === 'true' || isBestSeller === true,
      createdBy: req.user?._id
    });

    await book.save();

    res.status(201).json({
      success: true,
      message: 'Book created successfully',
      data: book
    });
  } catch (error) {
    console.error('Create Book Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating book',
      error: error.message
    });
  }
};

// @desc    Get all books
// @route   GET /api/books
// @access  Public
exports.getBooks = async (req, res) => {
  try {
    const { isBestSeller, subject, page, limit } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 0;

    let query = { isActive: true };

    // Filter by best seller
    if (isBestSeller === 'true') {
      query.isBestSeller = true;
    }

    // Filter by subject (FIX #4: Use $in for array matching)
    if (subject) {
      query.subjects = { $in: [subject] };
    }

    let booksQuery = Book.find(query).sort({ createdAt: -1 });

    // Apply pagination if limit is provided
    if (limitNum > 0) {
      const skip = (pageNum - 1) * limitNum;
      booksQuery = booksQuery.skip(skip).limit(limitNum);
    }

    const books = await booksQuery;

    res.json({
      success: true,
      count: books.length,
      data: books
    });
  } catch (error) {
    console.error('Get Books Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching books',
      error: error.message
    });
  }
};

// @desc    Get single book
// @route   GET /api/books/:id
// @access  Public
exports.getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book || !book.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.json({
      success: true,
      data: book
    });
  } catch (error) {
    console.error('Get Book Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching book',
      error: error.message
    });
  }
};

// @desc    Get sample books (latest 10 for carousel)
// @route   GET /api/books/sample
// @access  Public
exports.getSampleBooks = async (req, res) => {
  try {
    const books = await Book.find({ isActive: true })
      .select('title image discountedPrice fullPrice discountPercent subjects')
      .limit(10)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: books.length,
      data: books
    });
  } catch (error) {
    console.error('Get Sample Books Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sample books',
      error: error.message
    });
  }
};

// @desc    Update book
// @route   PUT /api/books/:id
// @access  Private (Super Admin & Admin)
exports.updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    const {
      title,
      authorNames,
      subjects,
      summary,
      fullPrice,
      discountPercent,
      stock,
      deliveryCharge,
      offerText,
      isBestSeller
    } = req.body;

    // Update text fields
    if (title) book.title = title;
    if (authorNames) book.authorNames = typeof authorNames === 'string' ? JSON.parse(authorNames) : authorNames;
    if (subjects) book.subjects = typeof subjects === 'string' ? JSON.parse(subjects) : subjects;
    if (summary) book.summary = summary;
    
    // Auto-recalculate discountedPrice if fullPrice or discountPercent changes
    if (fullPrice || discountPercent !== undefined) {
      const newFullPrice = fullPrice ? parseFloat(fullPrice) : book.fullPrice;
      const newDiscountPercent = discountPercent !== undefined ? parseFloat(discountPercent) : book.discountPercent;
      
      // Validate discount percentage
      if (newDiscountPercent < 0 || newDiscountPercent > 100) {
        return res.status(400).json({
          success: false,
          message: 'Discount percent must be between 0 and 100'
        });
      }
      
      // Auto-calculate discounted price
      book.fullPrice = newFullPrice;
      book.discountPercent = newDiscountPercent;
      book.discountedPrice = Math.round(newFullPrice - (newFullPrice * newDiscountPercent / 100));
    }
    
    // Update stock
    if (stock !== undefined) {
      book.stock = parseInt(stock);
      book.inStock = parseInt(stock) > 0;
    }
    
    // Update delivery charge
    if (deliveryCharge !== undefined) {
      book.deliveryCharge = parseFloat(deliveryCharge);
    }
    
    // Update offer text
    if (offerText !== undefined) {
      book.offerText = offerText;
    }
    
    if (isBestSeller !== undefined) book.isBestSeller = isBestSeller === 'true' || isBestSeller === true;

    // Upload new image if provided
    if (req.files && req.files['image']) {
      // Delete old image from Cloudinary
      if (book.image.publicId) {
        await cloudinary.uploader.destroy(book.image.publicId);
      }

      const imageResult = await uploadToCloudinary(
        req.files['image'][0],
        'books/covers'
      );

      book.image = {
        url: imageResult.url,
        publicId: imageResult.public_id
      };
    }

    await book.save();

    res.json({
      success: true,
      message: 'Book updated successfully',
      data: book
    });
  } catch (error) {
    console.error('Update Book Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating book',
      error: error.message
    });
  }
};

// @desc    Delete book (soft delete)
// @route   DELETE /api/books/:id
// @access  Private (Super Admin & Admin)
exports.deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Soft delete
    book.isActive = false;
    await book.save();

    res.json({
      success: true,
      message: 'Book deleted successfully',
      data: book
    });
  } catch (error) {
    console.error('Delete Book Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting book',
      error: error.message
    });
  }
};
```

### `controllers/bookOverviewController.js`

```javascript
const BookOverview = require('../models/BookOverview');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

// @desc    Get all active overview videos
// @route   GET /api/overviews
// @access  Public
exports.getAllOverviews = async (req, res) => {
  try {
    const overviews = await BookOverview.find({ isActive: true }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: overviews.length,
      data: overviews
    });
  } catch (error) {
    console.error('Get Overviews Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching overviews',
      error: error.message
    });
  }
};

// @desc    Get single overview video
// @route   GET /api/overviews/:id
// @access  Public
exports.getOverview = async (req, res) => {
  try {
    const overview = await BookOverview.findOne({ 
      _id: req.params.id,
      isActive: true 
    });

    if (!overview) {
      return res.status(404).json({
        success: false,
        message: 'Overview video not found'
      });
    }

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('Get Overview Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching overview',
      error: error.message
    });
  }
};

// @desc    Create overview video
// @route   POST /api/overviews
// @access  Private (Super Admin & Admin)
exports.createOverview = async (req, res) => {
  try {
    const { title, topperName, examRank } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Video file is required'
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Upload video to Cloudinary
    const videoResult = await uploadToCloudinary(req.file, 'books/overviews', 'video');

    // Create overview
    const overview = await BookOverview.create({
      title,
      videoUrl: videoResult.url,
      videoPublicId: videoResult.public_id,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Overview video created successfully',
      data: overview
    });
  } catch (error) {
    console.error('Create Overview Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating overview',
      error: error.message
    });
  }
};

// @desc    Update overview video
// @route   PUT /api/overviews/:id
// @access  Private (Super Admin & Admin)
exports.updateOverview = async (req, res) => {
  try {
    const { title } = req.body;

    const overview = await BookOverview.findById(req.params.id);

    if (!overview) {
      return res.status(404).json({
        success: false,
        message: 'Overview video not found'
      });
    }

    // Update fields
    if (title) overview.title = title;

    // If new video is uploaded, delete old one from Cloudinary
    if (req.file) {
      const cloudinary = require('../config/cloudinary');
      if (overview.videoPublicId) {
        await cloudinary.uploader.destroy(overview.videoPublicId, { resource_type: 'video' });
      }
      
      // Upload new video
      const videoResult = await uploadToCloudinary(req.file, 'books/overviews', 'video');
      overview.videoUrl = videoResult.url;
      overview.videoPublicId = videoResult.public_id;
    }

    await overview.save();

    res.json({
      success: true,
      message: 'Overview video updated successfully',
      data: overview
    });
  } catch (error) {
    console.error('Update Overview Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating overview',
      error: error.message
    });
  }
};

// @desc    Delete overview video (soft delete)
// @route   DELETE /api/overviews/:id
// @access  Private (Super Admin & Admin)
exports.deleteOverview = async (req, res) => {
  try {
    const overview = await BookOverview.findById(req.params.id);

    if (!overview) {
      return res.status(404).json({
        success: false,
        message: 'Overview video not found'
      });
    }

    overview.isActive = false;
    await overview.save();

    res.json({
      success: true,
      message: 'Overview video deleted successfully'
    });
  } catch (error) {
    console.error('Delete Overview Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting overview',
      error: error.message
    });
  }
};
```

### `controllers/bookTopperController.js`

```javascript
const BookTopper = require('../models/BookTopper');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

// @desc    Get all active topper videos
// @route   GET /api/toppers
// @access  Public
exports.getAllToppers = async (req, res) => {
  try {
    const toppers = await BookTopper.find({ isActive: true }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: toppers.length,
      data: toppers
    });
  } catch (error) {
    console.error('Get Toppers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching toppers',
      error: error.message
    });
  }
};

// @desc    Get single topper video
// @route   GET /api/toppers/:id
// @access  Public
exports.getTopper = async (req, res) => {
  try {
    const topper = await BookTopper.findOne({ 
      _id: req.params.id,
      isActive: true 
    });

    if (!topper) {
      return res.status(404).json({
        success: false,
        message: 'Topper video not found'
      });
    }

    res.json({
      success: true,
      data: topper
    });
  } catch (error) {
    console.error('Get Topper Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching topper',
      error: error.message
    });
  }
};

// @desc    Create topper video
// @route   POST /api/toppers
// @access  Private (Super Admin & Admin)
exports.createTopper = async (req, res) => {
  try {
    const { title } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Video file is required'
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Upload video to Cloudinary
    const videoResult = await uploadToCloudinary(req.file, 'books/toppers', 'video');

    // Create topper
    const topper = await BookTopper.create({
      title,
      videoUrl: videoResult.url,
      videoPublicId: videoResult.public_id,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Topper video created successfully',
      data: topper
    });
  } catch (error) {
    console.error('Create Topper Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating topper',
      error: error.message
    });
  }
};

// @desc    Update topper video
// @route   PUT /api/toppers/:id
// @access  Private (Super Admin & Admin)
exports.updateTopper = async (req, res) => {
  try {
    const { title } = req.body;

    const topper = await BookTopper.findById(req.params.id);

    if (!topper) {
      return res.status(404).json({
        success: false,
        message: 'Topper video not found'
      });
    }

    // Update fields
    if (title) topper.title = title;

    // If new video is uploaded, delete old one from Cloudinary
    if (req.file) {
      const cloudinary = require('../config/cloudinary');
      if (topper.videoPublicId) {
        await cloudinary.uploader.destroy(topper.videoPublicId, { resource_type: 'video' });
      }
      
      // Upload new video
      const videoResult = await uploadToCloudinary(req.file, 'books/toppers', 'video');
      topper.videoUrl = videoResult.url;
      topper.videoPublicId = videoResult.public_id;
    }

    await topper.save();

    res.json({
      success: true,
      message: 'Topper video updated successfully',
      data: topper
    });
  } catch (error) {
    console.error('Update Topper Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating topper',
      error: error.message
    });
  }
};

// @desc    Delete topper video (soft delete)
// @route   DELETE /api/toppers/:id
// @access  Private (Super Admin & Admin)
exports.deleteTopper = async (req, res) => {
  try {
    const topper = await BookTopper.findById(req.params.id);

    if (!topper) {
      return res.status(404).json({
        success: false,
        message: 'Topper video not found'
      });
    }

    topper.isActive = false;
    await topper.save();

    res.json({
      success: true,
      message: 'Topper video deleted successfully'
    });
  } catch (error) {
    console.error('Delete Topper Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting topper',
      error: error.message
    });
  }
};
```

### `controllers/cartController.js`

```javascript
const Cart = require('../models/Cart');
const Course = require('../models/Course');
const Book = require('../models/Book');
const Enrollment = require('../models/Enrollment');
const Coupon = require('../models/Coupon');

// @desc    Add item to cart (Course or Book)
// @route   POST /api/cart/add
// @access  Private (Students)
exports.addToCart = async (req, res) => {
  try {
    const { itemType, itemId, courseMode, quantity } = req.body;

    // Validate required fields
    if (!itemType || !itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item type and item ID are required'
      });
    }

    // Validate item type
    if (!['COURSE', 'BOOK'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: 'Item type must be either COURSE or BOOK'
      });
    }

    // Type-safe validation for course mode
    if (itemType === 'COURSE') {
      if (!courseMode || !['online', 'offline'].includes(courseMode)) {
        return res.status(400).json({
          success: false,
          message: 'Course mode is required and must be either online or offline'
        });
      }
    }

    // Set quantity (courses always 1, books can be multiple)
    const itemQuantity = itemType === 'COURSE' ? 1 : (quantity || 1);

    // Fetch item details based on type
    let item;
    let actualPrice;
    let discountedPrice;
    let appliedOfferText = '';
    let isCouponApplicable = true;
    let itemSnapshot;

    if (itemType === 'COURSE') {
      item = await Course.findById(itemId).populate('center', 'name').populate('category', 'name');
      
      if (!item || !item.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Course not found or inactive'
        });
      }

      // Check if course mode is available
      if (!item.modes.includes(courseMode)) {
        return res.status(400).json({
          success: false,
          message: `Course is not available in ${courseMode} mode`
        });
      }

      // Check if student already enrolled
      const existingEnrollment = await Enrollment.findOne({
        student: req.user._id,
        course: itemId,
        mode: courseMode,
        isActive: true
      });

      if (existingEnrollment) {
        return res.status(400).json({
          success: false,
          message: 'Already enrolled in this course',
          alreadyEnrolled: true
        });
      }

      // Get pricing for the selected mode
      const fees = item.fees[courseMode];
      actualPrice = fees.actualPrice;
      discountedPrice = fees.discountedPrice;
      appliedOfferText = fees.offerText || '';

      // Create enhanced snapshot
      itemSnapshot = {
        title: item.title,
        image: item.bannerImage?.url || null,
        center: item.center?.name || null,
        category: item.category?.name || null,
        duration: item.duration || null,
        validity: item.accessValidityInDays ? `${item.accessValidityInDays} days` : null,
        mode: courseMode,
        deliveryCharge: 0, // Courses have no delivery charge
        inStock: true // Courses always in stock
      };

    } else if (itemType === 'BOOK') {
      item = await Book.findById(itemId);
      
      if (!item || !item.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Book not found or inactive'
        });
      }

      // Stock validation
      if (!item.inStock || item.stock <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Book is out of stock'
        });
      }

      // Validate requested quantity
      if (itemQuantity > item.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${item.stock} copies available in stock`
        });
      }

      actualPrice = item.fullPrice;
      discountedPrice = item.discountedPrice;
      appliedOfferText = item.offerText || '';
      isCouponApplicable = item.isCouponApplicable !== false;

      // Create enhanced snapshot
      itemSnapshot = {
        title: item.title,
        image: item.image?.url || null,
        authorNames: item.authorNames,
        subjects: item.subjects,
        deliveryCharge: item.deliveryCharge || 0,
        inStock: item.inStock
      };
    }

    // Find or create cart for user
    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      cart = new Cart({
        userId: req.user._id,
        items: []
      });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (cartItem) => {
        if (cartItem.itemType === itemType && cartItem.itemId.toString() === itemId) {
          // For courses, also check mode
          if (itemType === 'COURSE') {
            return cartItem.courseMode === courseMode;
          }
          return true;
        }
        return false;
      }
    );

    if (existingItemIndex > -1) {
      // Update quantity if item exists (only for books)
      if (itemType === 'BOOK') {
        const newQuantity = cart.items[existingItemIndex].quantity + itemQuantity;
        
        // Re-validate stock
        const book = await Book.findById(itemId);
        if (newQuantity > book.stock) {
          return res.status(400).json({
            success: false,
            message: `Only ${book.stock} copies available in stock`
          });
        }
        
        cart.items[existingItemIndex].quantity = newQuantity;
      }
      // For courses, just update the price snapshot (in case prices changed)
      cart.items[existingItemIndex].actualPrice = actualPrice;
      cart.items[existingItemIndex].discountedPrice = discountedPrice;
      cart.items[existingItemIndex].appliedOfferText = appliedOfferText;
      cart.items[existingItemIndex].isCouponApplicable = isCouponApplicable;
      cart.items[existingItemIndex].itemSnapshot = itemSnapshot;
    } else {
      // Add new item to cart
      cart.items.push({
        itemType,
        itemId,
        courseMode: itemType === 'COURSE' ? courseMode : undefined,
        quantity: itemQuantity,
        actualPrice,
        discountedPrice,
        appliedOfferText,
        isCouponApplicable,
        itemSnapshot
      });
    }

    // Save cart (totals auto-calculated by pre-save hook)
    await cart.save();

    // Populate item references for response
    const populatedCart = await Cart.findOne({ userId: req.user._id });

    res.status(200).json({
      success: true,
      message: 'Item added to cart successfully',
      cart: populatedCart
    });

  } catch (error) {
    console.error('Add to Cart Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding item to cart',
      error: error.message
    });
  }
};

// @desc    Apply coupon to cart
// @route   POST /api/cart/apply-coupon
// @access  Private (Students)
exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      });
    }

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Find coupon
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    // Check coupon validity
    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      return res.status(400).json({
        success: false,
        message: 'Coupon is not yet active'
      });
    }

    if (coupon.endDate && now > coupon.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Coupon has expired'
      });
    }

    // Check usage limit
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({
        success: false,
        message: 'Coupon usage limit reached'
      });
    }

    // Check minimum cart value
    if (coupon.minCartValue && cart.totalDiscountedPrice < coupon.minCartValue) {
      return res.status(400).json({
        success: false,
        message: `Minimum cart value should be ₹${coupon.minCartValue}`
      });
    }

    // Check if coupon is applicable to cart items
    let applicableItems = 0;
    cart.items.forEach(item => {
      if (item.isCouponApplicable !== false) {
        applicableItems++;
      }
    });

    if (applicableItems === 0) {
      return res.status(400).json({
        success: false,
        message: 'Coupon is not applicable to items in your cart'
      });
    }

    // Calculate coupon discount
    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((cart.totalDiscountedPrice * coupon.discountValue) / 100);
      
      // Apply max discount cap if exists
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else if (coupon.discountType === 'FLAT') {
      discountAmount = coupon.discountValue;
    }

    // Apply coupon to cart
    cart.appliedCoupon = {
      couponId: coupon._id,
      couponCode: coupon.code,
      discountAmount,
      discountType: coupon.discountType
    };

    cart.couponDiscount = discountAmount;

    // Save cart (finalAmount auto-calculated)
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      cart,
      savings: discountAmount
    });

  } catch (error) {
    console.error('Apply Coupon Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error applying coupon',
      error: error.message
    });
  }
};

// @desc    Remove coupon from cart
// @route   DELETE /api/cart/remove-coupon
// @access  Private (Students)
exports.removeCoupon = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Remove coupon
    cart.appliedCoupon = {
      couponId: null,
      couponCode: null,
      discountAmount: 0,
      discountType: null
    };

    cart.couponDiscount = 0;

    // Save cart (finalAmount auto-calculated)
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Coupon removed successfully',
      cart
    });

  } catch (error) {
    console.error('Remove Coupon Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing coupon',
      error: error.message
    });
  }
};

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private (Students)
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Cart is empty',
        cart: {
          items: [],
          totalItems: 0,
          totalActualPrice: 0,
          totalDiscountedPrice: 0,
          totalDiscount: 0
        }
      });
    }

    res.status(200).json({
      success: true,
      cart
    });

  } catch (error) {
    console.error('Get Cart Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cart',
      error: error.message
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:itemId
// @access  Private (Students)
exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { courseMode } = req.query; // Optional: for courses

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Find and remove item
    const initialLength = cart.items.length;
    
    cart.items = cart.items.filter((cartItem) => {
      if (cartItem.itemId.toString() === itemId) {
        // For courses, also check mode
        if (cartItem.itemType === 'COURSE' && courseMode) {
          return cartItem.courseMode !== courseMode;
        }
        // For books or courses without mode filter
        return false;
      }
      return true;
    });

    // Check if item was removed
    if (cart.items.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Save cart (totals auto-calculated)
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully',
      cart
    });

  } catch (error) {
    console.error('Remove from Cart Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing item from cart',
      error: error.message
    });
  }
};

// @desc    Update item quantity in cart
// @route   PUT /api/cart/update-quantity/:itemId
// @access  Private (Students)
exports.updateQuantity = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity, courseMode } = req.body;

    // Validate quantity
    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Find item in cart
    const itemIndex = cart.items.findIndex((cartItem) => {
      if (cartItem.itemId.toString() === itemId) {
        if (cartItem.itemType === 'COURSE' && courseMode) {
          return cartItem.courseMode === courseMode;
        }
        return true;
      }
      return false;
    });

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Check if item is a course (quantity always 1)
    if (cart.items[itemIndex].itemType === 'COURSE') {
      return res.status(400).json({
        success: false,
        message: 'Course quantity cannot be changed (always 1)'
      });
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;

    // Save cart (totals auto-calculated)
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Quantity updated successfully',
      cart
    });

  } catch (error) {
    console.error('Update Quantity Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating quantity',
      error: error.message
    });
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart/clear
// @access  Private (Students)
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Clear all items
    cart.items = [];

    // Save cart (totals auto-calculated)
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      cart
    });

  } catch (error) {
    console.error('Clear Cart Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cart',
      error: error.message
    });
  }
};

// @desc    Get cart total (calculated price summary)
// @route   GET /api/cart/total
// @access  Private (Students)
exports.getCartTotal = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Cart is empty',
        total: {
          totalItems: 0,
          totalActualPrice: 0,
          totalDiscountedPrice: 0,
          totalDiscount: 0,
          savings: 0,
          savingsPercent: 0
        }
      });
    }

    // Calculate savings percentage
    const savingsPercent = cart.totalActualPrice > 0 
      ? Math.round((cart.totalDiscount / cart.totalActualPrice) * 100) 
      : 0;

    res.status(200).json({
      success: true,
      total: {
        totalItems: cart.totalItems,
        totalActualPrice: cart.totalActualPrice,
        totalDiscountedPrice: cart.totalDiscountedPrice,
        totalDiscount: cart.totalDiscount,
        savings: cart.totalDiscount,
        savingsPercent
      }
    });

  } catch (error) {
    console.error('Get Cart Total Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating cart total',
      error: error.message
    });
  }
};

// @desc    Check if item is in cart
// @route   GET /api/cart/check/:itemType/:itemId
// @access  Private (Students)
exports.checkItemInCart = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const { courseMode } = req.query; // Optional: for courses

    // Validate item type
    if (!['COURSE', 'BOOK'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: 'Item type must be either COURSE or BOOK'
      });
    }

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(200).json({
        success: true,
        isInCart: false
      });
    }

    // Check if item exists in cart
    const isInCart = cart.items.some((cartItem) => {
      if (cartItem.itemType === itemType && cartItem.itemId.toString() === itemId) {
        if (itemType === 'COURSE' && courseMode) {
          return cartItem.courseMode === courseMode;
        }
        return true;
      }
      return false;
    });

    res.status(200).json({
      success: true,
      isInCart
    });

  } catch (error) {
    console.error('Check Item in Cart Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking item in cart',
      error: error.message
    });
  }
};
```

### `controllers/centerDataController.js`

```javascript
const Center = require('../models/Center');
const CenterData = require('../models/CenterData');
const Gallery = require('../models/Gallery');
const SuccessStory = require('../models/SuccessStory');
const Faculty = require('../models/Faculty');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const cloudinary = require('../config/cloudinary');

// Helper function to delete image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
    }
  }
};

// Helper function to get complete center data
const getCompleteCenterData = async (centerId) => {
  const center = await Center.findById(centerId).select('-__v');
  
  if (!center) {
    return null;
  }

  const centerData = await CenterData.findOne({ center: centerId }).select('-__v');
  const gallery = await Gallery.findOne({ center: centerId });
  const successStories = await SuccessStory.find({ center: centerId }).sort({ createdAt: -1 });
  const faculty = await Faculty.find({ center: centerId }).sort({ createdAt: -1 });

  return {
    center,
    centerData: centerData || null,
    gallery: gallery || { images: [] },
    successStories,
    faculty
  };
};

// ==========================================
// CENTER DATA MODULE (CRUD)
// ==========================================

// @desc    Create center data
// @route   POST /api/centers
// @access  Private (Super Admin)
exports.createCenter = async (req, res) => {
  try {
    const { centerId, title, phone, email } = req.body;

    // Validate required fields
    if (!centerId || !title || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'Center ID, title, phone, and email are required'
      });
    }

    // Check if center exists
    const center = await Center.findById(centerId);
    if (!center) {
      return res.status(404).json({
        success: false,
        message: 'Center not found'
      });
    }

    // Check if center data already exists
    const existingCenterData = await CenterData.findOne({ 
      $or: [
        { center: centerId },
        { email }
      ]
    });

    if (existingCenterData) {
      return res.status(400).json({
        success: false,
        message: 'Center data already exists for this center or email'
      });
    }

    // Check if thumbnail is uploaded
    if (!req.files || !req.files.thumbnail) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail image is required'
      });
    }

    // Upload thumbnail to Cloudinary
    const thumbnailResult = await uploadToCloudinary(
      req.files.thumbnail[0],
      'centers/thumbnails'
    );

    // Create center data
    const centerData = await CenterData.create({
      center: centerId,
      title,
      phone,
      email,
      thumbnail: {
        url: thumbnailResult.url,
        public_id: thumbnailResult.public_id
      },
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Center data created successfully',
      data: centerData
    });
  } catch (error) {
    console.error('Create Center Data Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating center data',
      error: error.message
    });
  }
};

// @desc    Get all centers with data (list view)
// @route   GET /api/centers
// @access  Public
exports.getAllCenters = async (req, res) => {
  try {
    const centersData = await CenterData.find({ isActive: true })
      .populate('center', 'name')
      .select('-__v')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: centersData.length,
      data: centersData
    });
  } catch (error) {
    console.error('Get Centers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching centers',
      error: error.message
    });
  }
};

// @desc    Get complete center data
// @route   GET /api/centers/:id
// @access  Public
exports.getCenterCompleteData = async (req, res) => {
  try {
    const centerId = req.params.id;
    const completeData = await getCompleteCenterData(centerId);

    if (!completeData) {
      return res.status(404).json({
        success: false,
        message: 'Center not found'
      });
    }

    res.status(200).json({
      success: true,
      data: completeData
    });
  } catch (error) {
    console.error('Get Center Data Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching center data',
      error: error.message
    });
  }
};

// @desc    Update center data
// @route   PUT /api/centers/:id
// @access  Private (Super Admin)
exports.updateCenter = async (req, res) => {
  try {
    const centerData = await CenterData.findOne({ center: req.params.id });

    if (!centerData) {
      return res.status(404).json({
        success: false,
        message: 'Center data not found'
      });
    }

    const updates = { ...req.body };

    // Handle thumbnail update if provided
    if (req.files && req.files.thumbnail) {
      await deleteFromCloudinary(centerData.thumbnail.public_id);
      
      const thumbnailResult = await uploadToCloudinary(
        req.files.thumbnail[0],
        'centers/thumbnails'
      );
      
      updates.thumbnail = {
        url: thumbnailResult.url,
        public_id: thumbnailResult.public_id
      };
    }

    const updatedCenterData = await CenterData.findOneAndUpdate(
      { center: req.params.id },
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Center data updated successfully',
      data: updatedCenterData
    });
  } catch (error) {
    console.error('Update Center Data Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating center data',
      error: error.message
    });
  }
};

// @desc    Delete center data (cascade delete)
// @route   DELETE /api/centers/:id
// @access  Private (Super Admin)
exports.deleteCenter = async (req, res) => {
  try {
    const centerData = await CenterData.findOne({ center: req.params.id });

    if (!centerData) {
      return res.status(404).json({
        success: false,
        message: 'Center data not found'
      });
    }

    // Delete center thumbnail
    await deleteFromCloudinary(centerData.thumbnail.public_id);

    // Delete gallery images
    const gallery = await Gallery.findOne({ center: req.params.id });
    if (gallery) {
      for (let img of gallery.images) {
        await deleteFromCloudinary(img.public_id);
      }
      await Gallery.deleteOne({ center: req.params.id });
    }

    // Delete success stories
    const successStories = await SuccessStory.find({ center: req.params.id });
    for (let story of successStories) {
      await deleteFromCloudinary(story.thumbnail.public_id);
    }
    await SuccessStory.deleteMany({ center: req.params.id });

    // Delete faculty
    const faculty = await Faculty.find({ center: req.params.id });
    for (let member of faculty) {
      await deleteFromCloudinary(member.image.public_id);
    }
    await Faculty.deleteMany({ center: req.params.id });

    // Delete center data
    await CenterData.findOneAndDelete({ center: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Center and all related data deleted successfully'
    });
  } catch (error) {
    console.error('Delete Center Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting center',
      error: error.message
    });
  }
};

// ==========================================
// GALLERY MODULE (CRUD)
// ==========================================

// @desc    Update gallery
// @route   POST /api/centers/:id/gallery
// @access  Private (Super Admin, Center Admin)
exports.updateGallery = async (req, res) => {
  try {
    const centerData = await CenterData.findOne({ center: req.params.id });

    if (!centerData) {
      return res.status(404).json({
        success: false,
        message: 'Center data not found'
      });
    }

    if (!req.files || !req.files.images || req.files.images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one image is required'
      });
    }

    if (req.files.images.length > 6) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 6 images allowed in gallery'
      });
    }

    let gallery = await Gallery.findOne({ center: req.params.id });

    // Delete old images
    if (gallery && gallery.images.length > 0) {
      for (let img of gallery.images) {
        await deleteFromCloudinary(img.public_id);
      }
    }

    // Upload new images
    const uploadPromises = req.files.images.map(file =>
      uploadToCloudinary(file, 'centers/gallery')
    );
    const uploadedImages = await Promise.all(uploadPromises);

    const imagesData = uploadedImages.map(result => ({
      url: result.url,
      public_id: result.public_id
    }));

    gallery = await Gallery.findOneAndUpdate(
      { center: req.params.id },
      { center: req.params.id, images: imagesData },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Gallery updated successfully',
      data: gallery
    });
  } catch (error) {
    console.error('Update Gallery Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating gallery',
      error: error.message
    });
  }
};

// @desc    Delete gallery image
// @route   DELETE /api/centers/:id/gallery/:imageId
// @access  Private (Super Admin, Center Admin)
exports.deleteGalleryImage = async (req, res) => {
  try {
    const gallery = await Gallery.findOne({ center: req.params.id });

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: 'Gallery not found'
      });
    }

    const imageIndex = gallery.images.findIndex(
      img => img.public_id === req.params.imageId || img._id.toString() === req.params.imageId
    );

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    const image = gallery.images[imageIndex];
    await deleteFromCloudinary(image.public_id);

    gallery.images.splice(imageIndex, 1);
    await gallery.save();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: gallery
    });
  } catch (error) {
    console.error('Delete Gallery Image Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image',
      error: error.message
    });
  }
};

// ==========================================
// SUCCESS STORIES MODULE (CRUD)
// ==========================================

// @desc    Create success story
// @route   POST /api/centers/:id/success-stories
// @access  Private (Super Admin, Center Admin, Employee)
exports.createSuccessStory = async (req, res) => {
  try {
    const { name, rank } = req.body;

    if (!name || !rank) {
      return res.status(400).json({
        success: false,
        message: 'Name and rank are required'
      });
    }

    if (!req.files || !req.files.thumbnail) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail image is required'
      });
    }

    const thumbnailResult = await uploadToCloudinary(
      req.files.thumbnail[0],
      'centers/success-stories'
    );

    const story = await SuccessStory.create({
      center: req.params.id,
      name,
      rank,
      thumbnail: {
        url: thumbnailResult.url,
        public_id: thumbnailResult.public_id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Success story created successfully',
      data: story
    });
  } catch (error) {
    console.error('Create Success Story Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating success story',
      error: error.message
    });
  }
};

// @desc    Update success story
// @route   PUT /api/centers/:id/success-stories/:storyId
// @access  Private (Super Admin, Center Admin, Employee)
exports.updateSuccessStory = async (req, res) => {
  try {
    const story = await SuccessStory.findOne({
      _id: req.params.storyId,
      center: req.params.id
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Success story not found'
      });
    }

    const updates = { ...req.body };

    if (req.files && req.files.thumbnail) {
      await deleteFromCloudinary(story.thumbnail.public_id);
      
      const thumbnailResult = await uploadToCloudinary(
        req.files.thumbnail[0],
        'centers/success-stories'
      );
      
      updates.thumbnail = {
        url: thumbnailResult.url,
        public_id: thumbnailResult.public_id
      };
    }

    const updatedStory = await SuccessStory.findByIdAndUpdate(
      req.params.storyId,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Success story updated successfully',
      data: updatedStory
    });
  } catch (error) {
    console.error('Update Success Story Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating success story',
      error: error.message
    });
  }
};

// @desc    Delete success story
// @route   DELETE /api/centers/:id/success-stories/:storyId
// @access  Private (Super Admin, Center Admin, Employee)
exports.deleteSuccessStory = async (req, res) => {
  try {
    const story = await SuccessStory.findOne({
      _id: req.params.storyId,
      center: req.params.id
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Success story not found'
      });
    }

    await deleteFromCloudinary(story.thumbnail.public_id);
    await SuccessStory.findByIdAndDelete(req.params.storyId);

    res.status(200).json({
      success: true,
      message: 'Success story deleted successfully'
    });
  } catch (error) {
    console.error('Delete Success Story Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting success story',
      error: error.message
    });
  }
};

// ==========================================
// FACULTY MODULE (CRUD)
// ==========================================

// @desc    Create faculty
// @route   POST /api/centers/:id/faculty
// @access  Private (Super Admin, Center Admin, Employee)
exports.createFaculty = async (req, res) => {
  try {
    const { name, title, description } = req.body;

    if (!name || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Name, title, and description are required'
      });
    }

    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: 'Faculty image is required'
      });
    }

    const imageResult = await uploadToCloudinary(
      req.files.image[0],
      'centers/faculty'
    );

    const faculty = await Faculty.create({
      center: req.params.id,
      name,
      title,
      description,
      image: {
        url: imageResult.url,
        public_id: imageResult.public_id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Faculty member created successfully',
      data: faculty
    });
  } catch (error) {
    console.error('Create Faculty Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating faculty member',
      error: error.message
    });
  }
};

// @desc    Update faculty
// @route   PUT /api/centers/:id/faculty/:facultyId
// @access  Private (Super Admin, Center Admin, Employee)
exports.updateFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findOne({
      _id: req.params.facultyId,
      center: req.params.id
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty member not found'
      });
    }

    const updates = { ...req.body };

    if (req.files && req.files.image) {
      await deleteFromCloudinary(faculty.image.public_id);
      
      const imageResult = await uploadToCloudinary(
        req.files.image[0],
        'centers/faculty'
      );
      
      updates.image = {
        url: imageResult.url,
        public_id: imageResult.public_id
      };
    }

    const updatedFaculty = await Faculty.findByIdAndUpdate(
      req.params.facultyId,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Faculty member updated successfully',
      data: updatedFaculty
    });
  } catch (error) {
    console.error('Update Faculty Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating faculty member',
      error: error.message
    });
  }
};

// @desc    Delete faculty
// @route   DELETE /api/centers/:id/faculty/:facultyId
// @access  Private (Super Admin, Center Admin, Employee)
exports.deleteFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findOne({
      _id: req.params.facultyId,
      center: req.params.id
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty member not found'
      });
    }

    await deleteFromCloudinary(faculty.image.public_id);
    await Faculty.findByIdAndDelete(req.params.facultyId);

    res.status(200).json({
      success: true,
      message: 'Faculty member deleted successfully'
    });
  } catch (error) {
    console.error('Delete Faculty Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting faculty member',
      error: error.message
    });
  }
};
```

### `controllers/couponController.js`

```javascript
const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const Category = require('../models/Category');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const cloudinary = require('../config/cloudinary');

// @desc    Apply coupon to cart
// @route   POST /api/coupons/apply
// @access  Private
exports.applyCoupon = async (req, res) => {
   try {
      const { couponCode, cartAmount, quantity, categoryId, purchaseType } = req.body;

      if (!couponCode || !cartAmount) {
         return res.status(400).json({
            success: false,
            message: 'Coupon code and cart amount are required'
         });
      }

      // Find coupon
      const coupon = await Coupon.findOne({
         couponCode: couponCode.toUpperCase(),
         isDeleted: false
      }).populate('categoryId', 'name');

      if (!coupon) {
         return res.status(404).json({
            success: false,
            message: 'Invalid coupon code'
         });
      }

      // Check status
      if (coupon.status === 'INACTIVE') {
         return res.status(400).json({
            success: false,
            message: 'Coupon is currently inactive'
         });
      }

      // Check validity dates
      const now = new Date();
      if (now < coupon.validFrom) {
         return res.status(400).json({
            success: false,
            message: `Coupon will be active from ${coupon.validFrom.toLocaleDateString()}`
         });
      }

      if (now > coupon.validTill) {
         return res.status(400).json({
            success: false,
            message: 'Coupon has expired'
         });
      }

      // CHECK APPLICABLE FOR (COURSE, BOOK, or BOTH)
      if (coupon.applicableFor === 'COURSE' && purchaseType !== 'COURSE') {
         return res.status(400).json({
            success: false,
            message: 'This coupon is only applicable for courses'
         });
      }

      if (coupon.applicableFor === 'BOOK' && purchaseType !== 'BOOK') {
         return res.status(400).json({
            success: false,
            message: 'This coupon is only applicable for books'
         });
      }

      // For COURSE coupons, categoryId is REQUIRED and must match
      if (coupon.applicableFor === 'COURSE') {
         if (!coupon.categoryId) {
            return res.status(400).json({
               success: false,
               message: 'Invalid coupon configuration: Course coupons require a category'
            });
         }
         
         if (!categoryId || categoryId.toString() !== coupon.categoryId._id.toString()) {
            return res.status(400).json({
               success: false,
               message: `This coupon is only applicable for ${coupon.categoryId.name} category`
            });
         }
      }

      // For BOTH coupons with categoryId, it must match if provided
      if (coupon.applicableFor === 'BOTH' && coupon.categoryId && purchaseType === 'COURSE') {
         if (!categoryId || categoryId.toString() !== coupon.categoryId._id.toString()) {
            return res.status(400).json({
               success: false,
               message: `This coupon is only applicable for ${coupon.categoryId.name} category`
            });
         }
      }

      // Check minimum cart value
      if (cartAmount < coupon.minimumCartValue) {
         return res.status(400).json({
            success: false,
            message: `Minimum cart value ₹${coupon.minimumCartValue} required`
         });
      }

      // Check minimum quantity
      if (quantity && quantity < coupon.minimumQuantity) {
         return res.status(400).json({
            success: false,
            message: `Minimum quantity ${coupon.minimumQuantity} required`
         });
      }

      // Check total usage limit
      if (coupon.totalUsersLimit && coupon.usedCount >= coupon.totalUsersLimit) {
         return res.status(400).json({
            success: false,
            message: 'Coupon usage limit reached'
         });
      }

      // Check per-customer usage limit
      const userUsage = await CouponUsage.countDocuments({
         couponId: coupon._id,
         userId: req.user._id
      });

      if (userUsage >= coupon.usageLimitPerCustomer) {
         return res.status(400).json({
            success: false,
            message: `You have used this coupon ${userUsage}/${coupon.usageLimitPerCustomer} times. Limit exceeded.`
         });
      }

      // Calculate discount based on type
      let discount = 0;
      const originalPrice = parseFloat(cartAmount);

      if (coupon.type === 'PERCENTAGE') {
         discount = (originalPrice * coupon.value) / 100;
      } else if (coupon.type === 'FLAT') {
         discount = coupon.value;
      }

      // Prevent negative prices
      const finalPrice = Math.max(0, originalPrice - discount);

      // Calculate dynamic status
      const displayStatus = now > coupon.validTill ? 'EXPIRED' : coupon.status;

      res.json({
         success: true,
         message: 'Coupon applied successfully',
         data: {
            couponId: coupon._id,
            couponName: coupon.couponName,
            couponCode: coupon.couponCode,
            discountType: coupon.type,
            discountAmount: Math.round(discount),
            originalPrice: Math.round(originalPrice),
            finalAmount: Math.round(finalPrice),
            status: displayStatus
         }
      });

   } catch (error) {
      console.error('Apply Coupon Error:', error);
      res.status(500).json({
         success: false,
         message: 'Server error while applying coupon',
         error: error.message
      });
   }
};

// @desc    Create coupon
// @route   POST /api/coupons
// @access  Private (Super Admin & Admin)
exports.createCoupon = async (req, res) => {
   try {
      const {
         couponName,
         couponCode,
         type,
         value,
         categoryId,
         applicableFor,
         validFrom,
         validTill,
         totalUsersLimit,
         usageLimitPerCustomer,
         minimumQuantity,
         minimumCartValue,
         status
      } = req.body;

      // Validate required fields
      if (!couponName || !couponCode || !type || !validFrom || !validTill) {
         return res.status(400).json({
            success: false,
            message: 'Required fields: couponName, couponCode, type, validFrom, validTill'
         });
      }

      // Check if coupon code already exists
      const existingCoupon = await Coupon.findOne({
         couponCode: couponCode.toUpperCase(),
         isDeleted: false
      });

      if (existingCoupon) {
         return res.status(400).json({
            success: false,
            message: 'Coupon code already exists'
         });
      }

      // Validate category if provided
      if (categoryId) {
         const category = await Category.findById(categoryId);
         if (!category) {
            return res.status(404).json({
               success: false,
               message: 'Category not found'
            });
         }
      }

      // Handle image upload
      let backgroundImage = {};
      if (req.files && req.files.backgroundImage) {
         const imageResult = await uploadToCloudinary(
            req.files.backgroundImage[0],
            'coupons/banners'
         );
         backgroundImage = {
            url: imageResult.url,
            public_id: imageResult.public_id
         };
      }

      // Create coupon
      const coupon = await Coupon.create({
         couponName,
         couponCode: couponCode.toUpperCase(),
         type,
         value: parseFloat(value),
         categoryId: categoryId || null,
         applicableFor: applicableFor || 'BOTH',
         backgroundImage,
         validFrom: new Date(validFrom),
         validTill: new Date(validTill),
         totalUsersLimit: totalUsersLimit ? parseInt(totalUsersLimit) : null,
         usageLimitPerCustomer: parseInt(usageLimitPerCustomer) || 1,
         minimumQuantity: parseInt(minimumQuantity) || 1,
         minimumCartValue: parseFloat(minimumCartValue) || 0,
         status: status || 'ACTIVE',
         createdBy: req.user._id
      });

      res.status(201).json({
         success: true,
         message: 'Coupon created successfully',
         data: coupon
      });

   } catch (error) {
      console.error('Create Coupon Error:', error);
      res.status(500).json({
         success: false,
         message: 'Server error while creating coupon',
         error: error.message
      });
   }
};

// @desc    Get all coupons with filters
// @route   GET /api/coupons
// @access  Private (Super Admin & Admin)
exports.getCoupons = async (req, res) => {
   try {
      const { status, type, categoryId, search } = req.query;

      // Build filter
      const filter = { isDeleted: false };

      if (status && status !== 'EXPIRED') {
         filter.status = status;
      }

      if (type) {
         filter.type = type;
      }

      if (categoryId) {
         filter.categoryId = categoryId;
      }

      if (search) {
         filter.$or = [
            { couponName: { $regex: search, $options: 'i' } },
            { couponCode: { $regex: search, $options: 'i' } }
         ];
      }

      const coupons = await Coupon.find(filter)
         .populate('categoryId', 'name')
         .populate('createdBy', 'name email')
         .sort({ createdAt: -1 });

      // Add dynamic status
      const now = new Date();
      const couponsWithStatus = coupons.map(coupon => {
         const couponObj = coupon.toObject();
         const isExpired = now > coupon.validTill;
         couponObj.displayStatus = isExpired ? 'EXPIRED' : coupon.status;
         return couponObj;
      });

      res.json({
         success: true,
         count: couponsWithStatus.length,
         data: couponsWithStatus
      });

   } catch (error) {
      console.error('Get Coupons Error:', error);
      res.status(500).json({
         success: false,
         message: 'Server error while fetching coupons',
         error: error.message
      });
   }
};

// @desc    Get public active coupons (no auth required)
// @route   GET /api/coupons
// @access  Public
exports.getPublicCoupons = async (req, res) => {
   try {
      const { categoryId, type, search } = req.query;
      const now = new Date();

      // Build filter for public view
      const filter = {
         isDeleted: false,
         status: 'ACTIVE',
         validTill: { $gte: now }  // Only exclude expired coupons
      };

      // Filter by category if provided
      if (categoryId) {
         filter.categoryId = categoryId;
      }

      // Filter by type if provided
      if (type && ['PERCENTAGE', 'FLAT'].includes(type)) {
         filter.type = type;
      }

      // Search by coupon name or code
      if (search) {
         filter.$or = [
            { couponName: { $regex: search, $options: 'i' } },
            { couponCode: { $regex: search, $options: 'i' } }
         ];
      }

      // Fetch active, non-expired coupons
      const coupons = await Coupon.find(filter)
         .select('couponName couponCode type value categoryId backgroundImage validFrom validTill minimumCartValue usageLimitPerCustomer')
         .populate('categoryId', 'name')
         .sort({ createdAt: -1 });

      // Add dynamic status
      const couponsWithStatus = coupons.map(coupon => {
         const couponObj = coupon.toObject();
         const isExpired = now > coupon.validTill;
         couponObj.displayStatus = isExpired ? 'EXPIRED' : 'ACTIVE';
         return couponObj;
      });

      res.json({
         success: true,
         count: couponsWithStatus.length,
         data: couponsWithStatus
      });

   } catch (error) {
      console.error('Get Public Coupons Error:', error);
      res.status(500).json({
         success: false,
         message: 'Server error while fetching coupons',
         error: error.message
      });
   }
};

// @desc    Get single coupon by ID
// @route   GET /api/coupons/:id
// @access  Private (Super Admin & Admin)
exports.getCouponById = async (req, res) => {
   try {
      const coupon = await Coupon.findOne({
         _id: req.params.id,
         isDeleted: false
      })
         .populate('categoryId', 'name')
         .populate('createdBy', 'name email');

      if (!coupon) {
         return res.status(404).json({
            success: false,
            message: 'Coupon not found'
         });
      }

      // Add dynamic status
      const now = new Date();
      const couponObj = coupon.toObject();
      const isExpired = now > coupon.validTill;
      couponObj.displayStatus = isExpired ? 'EXPIRED' : coupon.status;

      res.json({
         success: true,
         data: couponObj
      });

   } catch (error) {
      console.error('Get Coupon Error:', error);
      res.status(500).json({
         success: false,
         message: 'Server error while fetching coupon',
         error: error.message
      });
   }
};

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private (Super Admin & Admin)
exports.updateCoupon = async (req, res) => {
   try {
      const coupon = await Coupon.findOne({
         _id: req.params.id,
         isDeleted: false
      });

      if (!coupon) {
         return res.status(404).json({
            success: false,
            message: 'Coupon not found'
         });
      }

      const {
         couponName,
         couponCode,
         type,
         value,
         categoryId,
         applicableFor,
         validFrom,
         validTill,
         totalUsersLimit,
         usageLimitPerCustomer,
         minimumQuantity,
         minimumCartValue,
         status
      } = req.body;

      // Check if new code already exists
      if (couponCode && couponCode.toUpperCase() !== coupon.couponCode) {
         const existingCode = await Coupon.findOne({
            couponCode: couponCode.toUpperCase(),
            _id: { $ne: req.params.id },
            isDeleted: false
         });

         if (existingCode) {
            return res.status(400).json({
               success: false,
               message: 'Coupon code already exists'
            });
         }
         coupon.couponCode = couponCode.toUpperCase();
      }

      // Validate category if provided
      if (categoryId) {
         const category = await Category.findById(categoryId);
         if (!category) {
            return res.status(404).json({
               success: false,
               message: 'Category not found'
            });
         }
         coupon.categoryId = categoryId;
      }

      // Handle image update
      if (req.files && req.files.backgroundImage) {
         // Delete old image from Cloudinary
         if (coupon.backgroundImage && coupon.backgroundImage.public_id) {
            await cloudinary.uploader.destroy(coupon.backgroundImage.public_id);
         }

         const imageResult = await uploadToCloudinary(
            req.files.backgroundImage[0],
            'coupons/banners'
         );
         coupon.backgroundImage = {
            url: imageResult.url,
            public_id: imageResult.public_id
         };
      }

      // Update fields
      if (couponName) coupon.couponName = couponName;
      if (type) coupon.type = type;
      if (value !== undefined) coupon.value = parseFloat(value);
      if (applicableFor) coupon.applicableFor = applicableFor;
      if (validFrom) coupon.validFrom = new Date(validFrom);
      if (validTill) coupon.validTill = new Date(validTill);
      if (totalUsersLimit !== undefined) coupon.totalUsersLimit = parseInt(totalUsersLimit) || null;
      if (usageLimitPerCustomer !== undefined) coupon.usageLimitPerCustomer = parseInt(usageLimitPerCustomer);
      if (minimumQuantity !== undefined) coupon.minimumQuantity = parseInt(minimumQuantity);
      if (minimumCartValue !== undefined) coupon.minimumCartValue = parseFloat(minimumCartValue);
      if (status) coupon.status = status;

      await coupon.save();

      res.json({
         success: true,
         message: 'Coupon updated successfully',
         data: coupon
      });

   } catch (error) {
      console.error('Update Coupon Error:', error);
      res.status(500).json({
         success: false,
         message: 'Server error while updating coupon',
         error: error.message
      });
   }
};

// @desc    Delete coupon (hard delete - permanently removes from database)
// @route   DELETE /api/coupons/:id
// @access  Private (Super Admin & Admin)
exports.deleteCoupon = async (req, res) => {
   try {
      const coupon = await Coupon.findById(req.params.id);

      if (!coupon) {
         return res.status(404).json({
            success: false,
            message: 'Coupon not found'
         });
      }

      // Delete image from Cloudinary if exists
      if (coupon.backgroundImage && coupon.backgroundImage.public_id) {
         await cloudinary.uploader.destroy(coupon.backgroundImage.public_id);
      }

      // Hard delete - permanently remove from database
      await Coupon.findByIdAndDelete(req.params.id);

      res.json({
         success: true,
         message: 'Coupon permanently deleted'
      });

   } catch (error) {
      console.error('Delete Coupon Error:', error);
      res.status(500).json({
         success: false,
         message: 'Server error while deleting coupon',
         error: error.message
      });
   }
};

// @desc    Get coupon usage analytics
// @route   GET /api/coupons/:id/usages
// @access  Private (Super Admin & Admin)
exports.getCouponUsages = async (req, res) => {
   try {
      const coupon = await Coupon.findById(req.params.id);

      if (!coupon) {
         return res.status(404).json({
            success: false,
            message: 'Coupon not found'
         });
      }

      const usages = await CouponUsage.find({ couponId: coupon._id })
         .populate('userId', 'name email')
         .sort({ usedAt: -1 });

      res.json({
         success: true,
         count: usages.length,
         data: usages
      });

   } catch (error) {
      console.error('Get Coupon Usages Error:', error);
      res.status(500).json({
         success: false,
         message: 'Server error while fetching coupon usages',
         error: error.message
      });
   }
};
```

### `controllers/enquiryController.js`

```javascript
const Enquiry = require('../models/Enquiry');
const Course = require('../models/Course');

// @desc    Create new enquiry (Public - No auth required)
// @route   POST /api/enquiries
// @access  Public
exports.createEnquiry = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      center,
      centerName,
      course,
      courseTitle,
      category,
      categoryName,
      targetYear,
      expectation
    } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    // Validate phone number (Indian format)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number'
      });
    }

    // Resolve course from ID or title
    let courseId = course;
    if (!courseId && courseTitle) {
      const courseDoc = await Course.findOne({ title: new RegExp(courseTitle, 'i') });
      if (courseDoc) {
        courseId = courseDoc._id;
      } else {
        return res.status(404).json({
          success: false,
          message: `Course not found: ${courseTitle}`
        });
      }
    }

    // Validate course exists
    const courseDoc = await Course.findById(courseId);
    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // ✅ VALIDATE center (if provided) - must match course's center
    let centerId = courseDoc.center; // Always use course's center as source of truth
    if (center) {
      // If frontend sends center ID, validate it matches
      if (center !== courseDoc.center.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Center does not match selected course'
        });
      }
    } else if (centerName) {
      // If frontend sends center name, validate it matches
      const Center = require('../models/Center');
      const centerDoc = await Center.findOne({ name: new RegExp(centerName, 'i') });
      if (centerDoc && centerDoc._id.toString() !== courseDoc.center.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Center does not match selected course'
        });
      }
    }

    // ✅ VALIDATE category (if provided) - must match course's category
    let categoryId = courseDoc.category; // Always use course's category as source of truth
    if (category) {
      // If frontend sends category ID, validate it matches
      if (category !== courseDoc.category.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Category does not match selected course'
        });
      }
    } else if (categoryName) {
      // If frontend sends category name, validate it matches
      const Category = require('../models/Category');
      const categoryDoc = await Category.findOne({ name: new RegExp(categoryName, 'i') });
      if (categoryDoc && categoryDoc._id.toString() !== courseDoc.category.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Category does not match selected course'
        });
      }
    }

    // Spam prevention: Check if same phone submitted enquiry in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentEnquiry = await Enquiry.findOne({
      phone,
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (recentEnquiry) {
      return res.status(429).json({
        success: false,
        message: 'You have already submitted an enquiry recently. Please wait a few minutes before submitting again.',
        waitTime: '5 minutes'
      });
    }

    // Detect source type based on fields provided
    let source = 'main';
    if (targetYear || expectation) {
      source = 'demo';
    } else if (categoryName && !targetYear && !expectation) {
      source = 'course';
    }

    // Create enquiry
    const enquiry = await Enquiry.create({
      name,
      phone,
      email,
      center: centerId,
      course: courseId,
      category: categoryId,
      targetYear,
      expectation,
      source
    });

    // Populate response
    const populatedEnquiry = await Enquiry.findById(enquiry._id)
      .populate('course', 'title')
      .populate('center', 'name')
      .populate('category', 'name');

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully! Our team will contact you shortly.',
      enquiry: populatedEnquiry
    });

  } catch (error) {
    console.error('Create Enquiry Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting enquiry',
      error: error.message
    });
  }
};

// @desc    Get all enquiries (Super Admin only - via /api/admin/enquiries)
// @route   GET /api/admin/enquiries
// @access  Private (Super Admin)
exports.getEnquiries = async (req, res) => {
  try {
    const { status, center, course, source, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = {};

    // Filter by status
    if (status) {
      filter.status = status;
    }

    // Filter by center (optional for super admin)
    if (center) {
      filter.center = center;
    }

    // Filter by course
    if (course) {
      filter.course = course;
    }

    // Filter by source (main, course, demo)
    if (source) {
      filter.source = source;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const enquiries = await Enquiry.find(filter)
      .populate('course', 'title')
      .populate('center', 'name')
      .populate('category', 'name')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Enquiry.countDocuments(filter);

    res.json({
      success: true,
      count: enquiries.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      enquiries
    });

  } catch (error) {
    console.error('Get Enquiries Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching enquiries',
      error: error.message
    });
  }
};

// @desc    Get enquiries for center (Center Admin & Employee)
// @route   GET /api/center/enquiries
// @access  Private (Center Admin, Employee)
exports.getCenterEnquiries = async (req, res) => {
  try {
    const user = req.user;
    const { status, course, source, page = 1, limit = 20 } = req.query;

    // Get center ID from user (handle both ObjectId and populated object)
    const centerId = user.center?._id || user.center;

    if (!centerId) {
      return res.status(400).json({
        success: false,
        message: 'Center not assigned to your account. Please contact admin.'
      });
    }

    // Build filter - FORCE their center only
    const filter = {
      center: centerId
    };

    // Filter by status
    if (status) {
      filter.status = status;
    }

    // Filter by course
    if (course) {
      filter.course = course;
    }

    // Filter by source (main, course, demo)
    if (source) {
      filter.source = source;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const enquiries = await Enquiry.find(filter)
      .populate('course', 'title')
      .populate('center', 'name')
      .populate('category', 'name')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Enquiry.countDocuments(filter);

    res.json({
      success: true,
      count: enquiries.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      enquiries
    });

  } catch (error) {
    console.error('Get Center Enquiries Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching enquiries',
      error: error.message
    });
  }
};

// @desc    Get single enquiry
// @route   GET /api/admin/enquiries/:id
// @access  Private (Admin)
exports.getEnquiryById = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id)
      .populate('course', 'title')
      .populate('center', 'name')
      .populate('category', 'name')
      .populate('assignedTo', 'name email');

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    res.json({
      success: true,
      enquiry
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching enquiry',
      error: error.message
    });
  }
};

// @desc    Update enquiry status
// @route   PUT /api/admin/enquiries/:id
// @access  Private (Admin)
exports.updateEnquiry = async (req, res) => {
  try {
    const { status, notes, assignedTo } = req.body;

    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    // Build updates
    const updates = {};
    if (status) updates.status = status;
    if (notes) updates.notes = notes;
    if (assignedTo) updates.assignedTo = assignedTo;

    const updatedEnquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('course', 'title')
      .populate('center', 'name')
      .populate('category', 'name')
      .populate('assignedTo', 'name email');

    res.json({
      success: true,
      message: 'Enquiry updated successfully',
      enquiry: updatedEnquiry
    });

  } catch (error) {
    console.error('Update Enquiry Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating enquiry',
      error: error.message
    });
  }
};

// @desc    Get enquiry statistics
// @route   GET /api/admin/enquiries/stats
// @access  Private (Super Admin, Center Admin, Employee)
exports.getEnquiryStats = async (req, res) => {
  try {
    const user = req.user;

    // Build filter based on role
    const filter = {};
    
    if (user.role === 'super_admin') {
      // Super Admin sees all stats
      // Can optionally filter by center if provided in query
      if (req.query.center) {
        filter.center = req.query.center;
      }
    } else if (user.role === 'center_admin' || user.role === 'employee') {
      // Center Admin & Employee see only their center's stats
      const centerId = user.center?._id || user.center;
      if (!centerId) {
        return res.status(400).json({
          success: false,
          message: 'Center not assigned to your account'
        });
      }
      filter.center = centerId;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get counts by status
    const stats = await Enquiry.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Format stats
    const statsObj = {
      total: 0,
      new: 0,
      contacted: 0,
      converted: 0,
      closed: 0
    };

    stats.forEach(stat => {
      statsObj[stat._id] = stat.count;
      statsObj.total += stat.count;
    });

    // Get recent enquiries (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = await Enquiry.countDocuments({
      ...filter,
      createdAt: { $gte: sevenDaysAgo }
    });

    res.json({
      success: true,
      stats: {
        ...statsObj,
        recent: recentCount
      }
    });

  } catch (error) {
    console.error('Get Enquiry Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};
```

### `controllers/featuredArticleController.js`

```javascript
const FeaturedArticle = require('../models/FeaturedArticle');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

// @desc    Create featured article
// @route   POST /api/featured-articles
// @access  Private (Super Admin & Admin)
exports.createFeaturedArticle = async (req, res) => {
  try {
    const { title, description, authorName, date } = req.body;

    // Validate required images
    if (!req.files || !req.files['mainImage'] || !req.files['secondaryImage']) {
      return res.status(400).json({
        success: false,
        message: 'Both main image and secondary image are required'
      });
    }

    // Upload main image to Cloudinary
    const mainImageResult = await uploadToCloudinary(
      req.files['mainImage'][0],
      'featured-articles/main'
    );

    // Upload secondary image to Cloudinary
    const secondaryImageResult = await uploadToCloudinary(
      req.files['secondaryImage'][0],
      'featured-articles/secondary'
    );

    const featuredArticle = new FeaturedArticle({
      title,
      description,
      mainImage: {
        url: mainImageResult.url,
        publicId: mainImageResult.public_id
      },
      secondaryImage: {
        url: secondaryImageResult.url,
        publicId: secondaryImageResult.public_id
      },
      authorName,
      date: date || new Date(),
      createdBy: req.user?._id
    });

    await featuredArticle.save();

    res.status(201).json({
      success: true,
      message: 'Featured article created successfully',
      data: featuredArticle
    });
  } catch (error) {
    console.error('Create Featured Article Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating featured article',
      error: error.message
    });
  }
};

// @desc    Get all featured articles
// @route   GET /api/featured-articles
// @access  Public
exports.getFeaturedArticles = async (req, res) => {
  try {
    const { limit, page } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 0;

    let query = FeaturedArticle.find({ isActive: true }).sort({ createdAt: -1 });

    // Apply pagination if limit is provided
    if (limitNum > 0) {
      const skip = (pageNum - 1) * limitNum;
      query = query.skip(skip).limit(limitNum);
    }

    const featuredArticles = await query;

    res.json({
      success: true,
      count: featuredArticles.length,
      data: featuredArticles
    });
  } catch (error) {
    console.error('Get Featured Articles Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching featured articles',
      error: error.message
    });
  }
};

// @desc    Get single featured article
// @route   GET /api/featured-articles/:id
// @access  Public
exports.getFeaturedArticle = async (req, res) => {
  try {
    const featuredArticle = await FeaturedArticle.findById(req.params.id);

    if (!featuredArticle || !featuredArticle.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Featured article not found'
      });
    }

    res.json({
      success: true,
      data: featuredArticle
    });
  } catch (error) {
    console.error('Get Featured Article Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching featured article',
      error: error.message
    });
  }
};

// @desc    Update featured article
// @route   PUT /api/featured-articles/:id
// @access  Private (Super Admin & Admin)
exports.updateFeaturedArticle = async (req, res) => {
  try {
    const { title, description, authorName, date } = req.body;

    const featuredArticle = await FeaturedArticle.findById(req.params.id);

    if (!featuredArticle) {
      return res.status(404).json({
        success: false,
        message: 'Featured article not found'
      });
    }

    // Update text fields
    if (title) featuredArticle.title = title;
    if (description) featuredArticle.description = description;
    if (authorName) featuredArticle.authorName = authorName;
    if (date) featuredArticle.date = date;

    // Upload new main image if provided
    if (req.files && req.files['mainImage']) {
      // Delete old image from Cloudinary
      if (featuredArticle.mainImage.publicId) {
        const cloudinary = require('cloudinary').v2;
        await cloudinary.uploader.destroy(featuredArticle.mainImage.publicId);
      }

      const mainImageResult = await uploadToCloudinary(
        req.files['mainImage'][0],
        'featured-articles/main'
      );

      featuredArticle.mainImage = {
        url: mainImageResult.url,
        publicId: mainImageResult.public_id
      };
    }

    // Upload new secondary image if provided
    if (req.files && req.files['secondaryImage']) {
      // Delete old image from Cloudinary
      if (featuredArticle.secondaryImage.publicId) {
        const cloudinary = require('cloudinary').v2;
        await cloudinary.uploader.destroy(featuredArticle.secondaryImage.publicId);
      }

      const secondaryImageResult = await uploadToCloudinary(
        req.files['secondaryImage'][0],
        'featured-articles/secondary'
      );

      featuredArticle.secondaryImage = {
        url: secondaryImageResult.url,
        publicId: secondaryImageResult.public_id
      };
    }

    await featuredArticle.save();

    res.json({
      success: true,
      message: 'Featured article updated successfully',
      data: featuredArticle
    });
  } catch (error) {
    console.error('Update Featured Article Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating featured article',
      error: error.message
    });
  }
};

// @desc    Delete featured article (soft delete)
// @route   DELETE /api/featured-articles/:id
// @access  Private (Super Admin & Admin)
exports.deleteFeaturedArticle = async (req, res) => {
  try {
    const featuredArticle = await FeaturedArticle.findById(req.params.id);

    if (!featuredArticle) {
      return res.status(404).json({
        success: false,
        message: 'Featured article not found'
      });
    }

    // Soft delete
    featuredArticle.isActive = false;
    await featuredArticle.save();

    res.json({
      success: true,
      message: 'Featured article deleted successfully',
      data: featuredArticle
    });
  } catch (error) {
    console.error('Delete Featured Article Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting featured article',
      error: error.message
    });
  }
};
```

### `controllers/homePageController.js`

```javascript
const HomePage = require('../models/HomePage');
const HomeVideo = require('../models/HomeVideo');
const HomeSection4 = require('../models/HomeSection4');
const HomeTopper = require('../models/HomeTopper');
const Course = require('../models/Course');
const Book = require('../models/Book');
const cloudinary = require('../config/cloudinary');

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file) => {
  if (!file) return null;
  
  try {
    // For multer memory storage, file is in buffer
    if (file.buffer) {
      // Convert buffer to base64
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'homepage',
      });
      
      return result.secure_url;
    }
    
    // For file path (if using disk storage)
    if (file.path) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'homepage',
      });
      
      return result.secure_url;
    }
    
    return null;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
};

// @desc    Save/Update HomePage (Create if not exists, else update)
// @route   POST /api/homepage
// @access  Private (Super Admin only)
exports.saveHomePage = async (req, res) => {
  try {
    const data = {};

    // Parse section data from req.body
    // Section 1: Toppers (Title & Subtitle only)
    if (req.body.section1_title || req.body.section1_subTitle) {
      data.section1 = {};
      if (req.body.section1_title) data.section1.title = req.body.section1_title;
      if (req.body.section1_subTitle) data.section1.subTitle = req.body.section1_subTitle;
    }

    // Section 2: Learning Sections (Title only)
    if (req.body.section2_title) {
      data.section2 = {
        title: req.body.section2_title
      };
    }

    // Check if any data to update
    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data provided to update'
      });
    }

    // Find existing homepage or create new
    let home = await HomePage.findOne();

    if (home) {
      // Update existing document using $set
      home = await HomePage.findByIdAndUpdate(
        home._id,
        { $set: data },
        { new: true, runValidators: true }
      );
      
      res.json({
        success: true,
        message: 'HomePage updated successfully',
        data: home
      });
    } else {
      // Create new document
      home = await HomePage.create(data);
      
      res.status(201).json({
        success: true,
        message: 'HomePage created successfully',
        data: home
      });
    }
  } catch (err) {
    console.error('Save HomePage Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error saving HomePage',
      error: err.message 
    });
  }
};

// @desc    Get HomePage data
// @route   GET /api/homepage
// @access  Public
exports.getHomePage = async (req, res) => {
  try {
    const home = await HomePage.findOne();

    if (!home) {
      return res.status(404).json({
        success: false,
        message: 'HomePage not configured yet'
      });
    }

    // Get toppers from HomeTopper collection
    const toppers = await HomeTopper.find({ isActive: true })
      .sort({ createdAt: -1 });

    // Get section2 cards from HomeSection4 collection
    const section2Cards = await HomeSection4.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 });

    // Get videos from HomeVideo collection (for section3)
    const videos = await HomeVideo.find().sort({ createdAt: -1 });

    // Get courses grouped by category
    const courses = await Course.find({ isActive: true })
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    // Group courses by category
    const groupedCourses = {};

    courses.forEach(course => {
      const categoryName = course.category?.name || 'Uncategorized';

      if (!groupedCourses[categoryName]) {
        groupedCourses[categoryName] = [];
      }

      groupedCourses[categoryName].push({
        _id: course._id,
        title: course.title,
        bannerImage: course.bannerImage?.url || null
      });
    });

    // Convert to frontend format
    const courseSection = {
      title: 'EXPLORE OUR COURSES',
      categories: Object.keys(groupedCourses).map(category => ({
        name: category,
        courses: groupedCourses[category]
      }))
    };

    // Get books for homepage
    const books = await Book.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(10);

    // Format books with required fields
    const formattedBooks = books.map(book => ({
      _id: book._id,
      image: book.image?.url || null,
      title: book.title,
      discountedPrice: book.discountedPrice,
      summary: book.summary?.substring(0, 100) || ''
    }));

    // Books section for homepage
    const bookSection = {
      title: 'BUY OUR BOOKS',
      books: formattedBooks
    };

    // Convert to plain object and add dynamic sections
    const homeData = home.toObject();
    
    // Add section1 with toppers
    homeData.section1 = {
      title: homeData.section1?.title || 'OUR TOPPERS',
      subTitle: homeData.section1?.subTitle || 'Celebrating Success Stories',
      toppers: toppers
    };

    // Add section2 with cards
    homeData.section2 = {
      title: homeData.section2?.title || 'OUR LEARNING PROGRAMS',
      cards: section2Cards
    };

    // Add section3 with videos
    homeData.section3 = {
      videos: videos.map(video => ({
        _id: video._id,
        videoUrl: video.videoUrl,
        videoThumbnail: video.videoThumbnail
      }))
    };

    // Add sectionCourses with grouped courses by category
    homeData.sectionCourses = courseSection;

    // Add sectionBooks with formatted books
    homeData.sectionBooks = bookSection;

    res.json({
      success: true,
      data: homeData
    });
  } catch (err) {
    console.error('Get HomePage Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching HomePage',
      error: err.message 
    });
  }
};

// @desc    Delete a specific section from HomePage
// @route   DELETE /api/homepage/section/:sectionName
// @access  Private (Super Admin only)
exports.deleteSection = async (req, res) => {
  try {
    const { sectionName } = req.params;

    // Validate section name format (must be section followed by number)
    const sectionPattern = /^section\d+$/;
    if (!sectionPattern.test(sectionName)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section name. Format should be: section1, section2, section3, etc.'
      });
    }

    // Find homepage
    const home = await HomePage.findOne();
    if (!home) {
      return res.status(404).json({
        success: false,
        message: 'HomePage not found'
      });
    }

    // Check if section exists
    if (!home[sectionName]) {
      return res.status(404).json({
        success: false,
        message: `${sectionName} does not exist`
      });
    }

    // Delete the section
    await HomePage.findByIdAndUpdate(
      home._id,
      { $unset: { [sectionName]: 1 } },
      { new: true }
    );

    res.json({
      success: true,
      message: `${sectionName} deleted successfully`
    });

  } catch (err) {
    console.error('Delete Section Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting section',
      error: err.message 
    });
  }
};
```

### `controllers/homeSection4Controller.js`

```javascript
const HomeSection4 = require('../models/HomeSection4');
const cloudinary = require('../config/cloudinary');

// Helper function to upload to Cloudinary
const uploadToCloudinary = async (file) => {
  if (!file) return null;
  
  try {
    if (file.buffer) {
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'homepage/section4',
      });
      
      return result.secure_url;
    }
    
    if (file.path) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'homepage/section4',
      });
      
      return result.secure_url;
    }
    
    return null;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
};

// @desc    Create section 4 card
// @route   POST /api/home-section4
// @access  Private (Super Admin only)
exports.createSection4 = async (req, res) => {
  try {
    const { title, description, order } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'title and description are required'
      });
    }

    // Get image files
    const imageFiles = req.files.filter(f => f.fieldname === 'images');

    // Upload images to Cloudinary
    const imageUrls = [];
    for (const file of imageFiles) {
      const url = await uploadToCloudinary(file);
      imageUrls.push(url);
    }

    // Create card
    const card = await HomeSection4.create({
      title,
      description,
      images: imageUrls,
      order: order || 0
    });

    res.status(201).json({
      success: true,
      message: 'Section 4 card created successfully',
      data: card
    });

  } catch (err) {
    console.error('Create Section4 Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error creating section 4 card',
      error: err.message
    });
  }
};

// @desc    Get all section 4 cards
// @route   GET /api/home-section4
// @access  Public
exports.getSection4 = async (req, res) => {
  try {
    const cards = await HomeSection4.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 });

    res.json({
      success: true,
      count: cards.length,
      data: cards
    });

  } catch (err) {
    console.error('Get Section4 Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching section 4 cards',
      error: err.message
    });
  }
};

// @desc    Update section 4 card
// @route   PUT /api/home-section4/:id
// @access  Private (Super Admin only)
exports.updateSection4 = async (req, res) => {
  try {
    const card = await HomeSection4.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    const { title, description, order } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (order !== undefined) updateData.order = order;

    // Handle image updates
    const imageFiles = req.files.filter(f => f.fieldname === 'images');
    if (imageFiles.length > 0) {
      // Upload new images
      const imageUrls = [];
      for (const file of imageFiles) {
        const url = await uploadToCloudinary(file);
        imageUrls.push(url);
      }

      // Replace old images with new ones
      updateData.images = imageUrls;
    }

    const updatedCard = await HomeSection4.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Section 4 card updated successfully',
      data: updatedCard
    });

  } catch (err) {
    console.error('Update Section4 Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating section 4 card',
      error: err.message
    });
  }
};

// @desc    Delete section 4 card
// @route   DELETE /api/home-section4/:id
// @access  Private (Super Admin only)
exports.deleteSection4 = async (req, res) => {
  try {
    const card = await HomeSection4.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Delete images from Cloudinary
    if (card.images && card.images.length > 0) {
      for (const imageUrl of card.images) {
        try {
          // Extract public_id from URL
          const parts = imageUrl.split('/');
          const filename = parts[parts.length - 1];
          const publicId = filename.split('.')[0];
          await cloudinary.uploader.destroy(`homepage/section4/${publicId}`);
        } catch (err) {
          console.error('Error deleting image from Cloudinary:', err);
        }
      }
    }

    await HomeSection4.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Section 4 card deleted successfully'
    });

  } catch (err) {
    console.error('Delete Section4 Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting section 4 card',
      error: err.message
    });
  }
};

// @desc    Reorder all section 4 cards in sequence
// @route   PUT /api/home-section4/reorder
// @access  Private (Super Admin only)
exports.reorderSection4 = async (req, res) => {
  try {
    const { cardOrder } = req.body;

    // cardOrder should be an array of card IDs in the desired order
    if (!Array.isArray(cardOrder) || cardOrder.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'cardOrder array is required and cannot be empty'
      });
    }

    // Update each card's order field based on its position in the array
    const updatePromises = cardOrder.map((cardId, index) => {
      return HomeSection4.findByIdAndUpdate(
        cardId,
        { $set: { order: index } },
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    // Fetch updated cards
    const updatedCards = await HomeSection4.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 });

    res.json({
      success: true,
      message: 'Cards reordered successfully',
      count: updatedCards.length,
      data: updatedCards
    });

  } catch (err) {
    console.error('Reorder Section4 Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error reordering cards',
      error: err.message
    });
  }
};
```

### `controllers/homeTopperController.js`

```javascript
const HomeTopper = require('../models/HomeTopper');
const cloudinary = require('../config/cloudinary');

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file) => {
  if (!file) return null;
  
  try {
    // For multer memory storage, file is in buffer
    if (file.buffer) {
      // Convert buffer to base64
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'homepage/toppers',
      });
      
      return result.secure_url;
    }
    
    // For file path (if using disk storage)
    if (file.path) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'homepage/toppers',
      });
      
      return result.secure_url;
    }
    
    return null;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
};

// @desc    Create a new topper
// @route   POST /api/homepage/toppers
// @access  Private (Super Admin)
exports.createTopper = async (req, res) => {
  try {
    const { name, rank, description } = req.body;

    if (!name || !rank) {
      return res.status(400).json({
        success: false,
        message: 'name and rank are required'
      });
    }

    // Upload image file to Cloudinary
    const imageFile = req.files.find(f => f.fieldname === 'image');
    let imageUrl = null;
    
    if (imageFile) {
      imageUrl = await uploadToCloudinary(imageFile);
    }

    const topper = await HomeTopper.create({
      image: imageUrl,
      name,
      rank,
      description: description || ''
    });

    res.status(201).json({
      success: true,
      message: 'Topper created successfully',
      data: topper
    });

  } catch (err) {
    console.error('Create Topper Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating topper',
      error: err.message 
    });
  }
};

// @desc    Get all active toppers
// @route   GET /api/homepage/toppers
// @access  Public
exports.getToppers = async (req, res) => {
  try {
    const toppers = await HomeTopper.find({ isActive: true })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: toppers.length,
      data: toppers
    });

  } catch (err) {
    console.error('Get Toppers Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching toppers',
      error: err.message 
    });
  }
};

// @desc    Update topper
// @route   PUT /api/homepage/toppers/:id
// @access  Private (Super Admin)
exports.updateTopper = async (req, res) => {
  try {
    const topper = await HomeTopper.findById(req.params.id);

    if (!topper) {
      return res.status(404).json({
        success: false,
        message: 'Topper not found'
      });
    }

    const updateData = {};

    // Update fields if provided
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.rank) updateData.rank = req.body.rank;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    // Upload new image if file provided
    const imageFile = req.files.find(f => f.fieldname === 'image');
    if (imageFile) {
      updateData.image = await uploadToCloudinary(imageFile);
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data provided for update'
      });
    }

    const updatedTopper = await HomeTopper.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Topper updated successfully',
      data: updatedTopper
    });

  } catch (err) {
    console.error('Update Topper Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating topper',
      error: err.message 
    });
  }
};

// @desc    Delete topper
// @route   DELETE /api/homepage/toppers/:id
// @access  Private (Super Admin)
exports.deleteTopper = async (req, res) => {
  try {
    const topper = await HomeTopper.findById(req.params.id);

    if (!topper) {
      return res.status(404).json({
        success: false,
        message: 'Topper not found'
      });
    }

    // Delete image from Cloudinary
    if (topper.image) {
      try {
        // Extract public_id from URL
        const parts = topper.image.split('/');
        const filename = parts[parts.length - 1];
        const publicId = filename.split('.')[0];
        await cloudinary.uploader.destroy(`homepage/toppers/${publicId}`);
      } catch (err) {
        console.error('Error deleting image from Cloudinary:', err);
      }
    }

    await HomeTopper.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Topper deleted successfully'
    });

  } catch (err) {
    console.error('Delete Topper Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting topper',
      error: err.message 
    });
  }
};
```

### `controllers/homeVideoController.js`

```javascript
const HomeVideo = require('../models/HomeVideo');
const cloudinary = require('../config/cloudinary');

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file) => {
  if (!file) return null;
  
  try {
    // For multer memory storage, file is in buffer
    if (file.buffer) {
      // Convert buffer to base64
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'home-videos',
      });
      
      return result.secure_url;
    }
    
    // For file path (if using disk storage)
    if (file.path) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'home-videos',
      });
      
      return result.secure_url;
    }
    
    return null;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
};

// @desc    Add a new video
// @route   POST /api/home-videos
// @access  Private (Super Admin)
exports.addVideo = async (req, res) => {
  try {
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'videoUrl is required'
      });
    }

    // Upload thumbnail file to Cloudinary
    const thumbnailFile = req.files.find(f => f.fieldname === 'videoThumbnail');
    if (!thumbnailFile) {
      return res.status(400).json({
        success: false,
        message: 'videoThumbnail file is required'
      });
    }

    const videoThumbnail = await uploadToCloudinary(thumbnailFile);

    const video = await HomeVideo.create({
      videoUrl,
      videoThumbnail
    });

    res.status(201).json({
      success: true,
      message: 'Video added successfully',
      data: video
    });

  } catch (err) {
    console.error('Add Video Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding video',
      error: err.message 
    });
  }
};

// @desc    Get all videos
// @route   GET /api/home-videos
// @access  Public
exports.getVideos = async (req, res) => {
  try {
    const videos = await HomeVideo.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: videos.length,
      data: videos
    });

  } catch (err) {
    console.error('Get Videos Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching videos',
      error: err.message 
    });
  }
};

// @desc    Update video
// @route   PUT /api/home-videos/:id
// @access  Private (Super Admin)
exports.updateVideo = async (req, res) => {
  try {
    const updateData = {};

    // Update videoUrl if provided
    if (req.body.videoUrl) {
      updateData.videoUrl = req.body.videoUrl;
    }

    // Upload new thumbnail if file provided
    const thumbnailFile = req.files.find(f => f.fieldname === 'videoThumbnail');
    if (thumbnailFile) {
      updateData.videoThumbnail = await uploadToCloudinary(thumbnailFile);
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data provided for update'
      });
    }

    const video = await HomeVideo.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    res.json({
      success: true,
      message: 'Video updated successfully',
      data: video
    });

  } catch (err) {
    console.error('Update Video Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating video',
      error: err.message 
    });
  }
};

// @desc    Delete video
// @route   DELETE /api/home-videos/:id
// @access  Private (Super Admin)
exports.deleteVideo = async (req, res) => {
  try {
    const video = await HomeVideo.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    await HomeVideo.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });

  } catch (err) {
    console.error('Delete Video Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting video',
      error: err.message 
    });
  }
};
```

### `controllers/languageController.js`

```javascript
const Language = require('../models/Language');

// @desc    Create language
// @route   POST /api/languages
// @access  Private (Admin)
exports.createLanguage = async (req, res) => {
  try {
    const { name, code, isActive } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name and code are required'
      });
    }

    const language = await Language.create({
      name,
      code,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      message: 'Language created successfully',
      data: language
    });

  } catch (err) {
    console.error('Create Language Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error creating language',
      error: err.message
    });
  }
};

// @desc    Get all languages
// @route   GET /api/languages
// @access  Public
exports.getLanguages = async (req, res) => {
  try {
    const languages = await Language.find({ isActive: true }).sort({ name: 1 });

    res.json({
      success: true,
      count: languages.length,
      data: languages
    });

  } catch (err) {
    console.error('Get Languages Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching languages',
      error: err.message
    });
  }
};

// @desc    Update language
// @route   PUT /api/languages/:id
// @access  Private (Admin)
exports.updateLanguage = async (req, res) => {
  try {
    const language = await Language.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!language) {
      return res.status(404).json({
        success: false,
        message: 'Language not found'
      });
    }

    res.json({
      success: true,
      message: 'Language updated successfully',
      data: language
    });

  } catch (err) {
    console.error('Update Language Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating language',
      error: err.message
    });
  }
};

// @desc    Delete language
// @route   DELETE /api/languages/:id
// @access  Private (Admin)
exports.deleteLanguage = async (req, res) => {
  try {
    const language = await Language.findById(req.params.id);

    if (!language) {
      return res.status(404).json({
        success: false,
        message: 'Language not found'
      });
    }

    await Language.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Language deleted successfully'
    });

  } catch (err) {
    console.error('Delete Language Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting language',
      error: err.message
    });
  }
};
```

### `controllers/liveClassController.js`

```javascript
const LiveClass = require('../models/LiveClass');
const Enrollment = require('../models/Enrollment');
const hmsClient = require('../config/hms');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

// @desc    Create live class (Admin)
// @route   POST /api/live-classes
// @access  Private/Admin
// @type    multipart/form-data (supports thumbnail upload)
exports.createLiveClass = async (req, res) => {
   try {
      const {
         title,
         topic,
         lectureTitle,
         subject,
         startDateTime,
         endDateTime,
         courseId,
         centerId,
         categoryId,
         teacherName,
         description
      } = req.body;

      // Validate required fields
      if (!title || !topic || !startDateTime || !endDateTime || !courseId || !centerId || !categoryId || !teacherName) {
         return res.status(400).json({
            success: false,
            message: 'Missing required fields'
         });
      }

      // Center admin security validation
      if (req.user.role === 'center_admin') {
         if (!req.user.centerId || req.user.centerId.toString() !== centerId) {
            return res.status(403).json({
               success: false,
               message: 'You can only create classes for your own center'
            });
         }
      }

      // Auto-calculate duration
      const start = new Date(startDateTime);
      const end = new Date(endDateTime);
      const durationInMinutes = Math.round((end - start) / (1000 * 60));

      if (durationInMinutes <= 0) {
         return res.status(400).json({
            success: false,
            message: 'End time must be after start time'
         });
      }

      // Validate startDateTime is in the future
      if (start < new Date()) {
         return res.status(400).json({
            success: false,
            message: 'Class start time must be in the future'
         });
      }

      // Upload thumbnail to Cloudinary if provided
      let thumbnail = null;
      if (req.file) {
         thumbnail = await uploadToCloudinary(req.file, 'live-classes/thumbnails', 'image');
      }

      // Create room in 100ms (use timestamp to avoid duplicates)
      const room = await hmsClient.createRoom({
         name: `${title} - ${Date.now()}`,
         description: topic,
         template_id: process.env.HMS_TEMPLATE_ID
      });

      console.log('✅ 100ms Room Created:', room);

      // Save in MongoDB
      const liveClass = await LiveClass.create({
         title,
         topic,
         lectureTitle,
         subject,
         startDateTime: start,
         endDateTime: end,
         durationInMinutes,
         courseId,
         centerId,
         categoryId,
         roomId: room.id,
         roomName: room.name,
         teacherName,
         description: description || '',
         thumbnail: thumbnail,
         createdBy: req.user._id
      });

      res.status(201).json({
         success: true,
         message: 'Live class created successfully',
         data: liveClass
      });

   } catch (error) {
      console.error('Create Live Class Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to create live class',
         error: error.message
      });
   }
};

// @desc    Get all live classes (Admin)
// @route   GET /api/live-classes
// @access  Private/Admin
exports.getAllLiveClasses = async (req, res) => {
   try {
      const { status, courseId, centerId, categoryId, page = 1, limit = 20 } = req.query;

      // Protect against large limits
      const safeLimit = Math.min(parseInt(limit) || 20, 100);
      const safePage = Math.max(parseInt(page) || 1, 1);

      // Filter out cancelled classes by default
      const filter = {};
      if (status) {
         filter.status = status;
      } else {
         filter.status = { $ne: 'cancelled' };
      }

      if (courseId) filter.courseId = courseId;
      if (centerId) filter.centerId = centerId;
      if (categoryId) filter.categoryId = categoryId;

      const skip = (safePage - 1) * safeLimit;

      const classes = await LiveClass.find(filter)
         .populate('courseId', 'title slug bannerImage')
         .populate('centerId', 'name')
         .populate('categoryId', 'name')
         .populate('createdBy', 'name email')
         .sort({ startDateTime: 1 })
         .skip(skip)
         .limit(safeLimit);

      const total = await LiveClass.countDocuments(filter);

      res.json({
         success: true,
         count: classes.length,
         total,
         pages: Math.ceil(total / safeLimit),
         currentPage: safePage,
         data: classes
      });

   } catch (error) {
      console.error('Get All Live Classes Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch live classes',
         error: error.message
      });
   }
};

// @desc    Get single live class (Admin)
// @route   GET /api/live-classes/:id
// @access  Private/Admin
exports.getLiveClassById = async (req, res) => {
   try {
      const liveClass = await LiveClass.findById(req.params.id)
         .populate('courseId', 'title slug bannerImage')
         .populate('centerId', 'name')
         .populate('categoryId', 'name')
         .populate('createdBy', 'name email');

      if (!liveClass) {
         return res.status(404).json({
            success: false,
            message: 'Live class not found'
         });
      }

      res.json({
         success: true,
         data: liveClass
      });

   } catch (error) {
      console.error('Get Live Class Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch live class',
         error: error.message
      });
   }
};

// @desc    Update live class (Admin)
// @route   PUT /api/live-classes/:id
// @access  Private/Admin
exports.updateLiveClass = async (req, res) => {
   try {
      const {
         title,
         topic,
         lectureTitle,
         subject,
         startDateTime,
         endDateTime,
         teacherName,
         description
      } = req.body;

      const liveClass = await LiveClass.findById(req.params.id);

      if (!liveClass) {
         return res.status(404).json({
            success: false,
            message: 'Live class not found'
         });
      }

      // Block editing for live/completed classes
      if (liveClass.status === 'live' || liveClass.status === 'completed') {
         return res.status(400).json({
            success: false,
            message: `Cannot edit a ${liveClass.status} class. Only scheduled classes can be edited.`
         });
      }

      // Safer duration calculation
      const updatedStart = startDateTime ? new Date(startDateTime) : liveClass.startDateTime;
      const updatedEnd = endDateTime ? new Date(endDateTime) : liveClass.endDateTime;
      const durationInMinutes = Math.round((updatedEnd - updatedStart) / (1000 * 60));

      if (durationInMinutes <= 0) {
         return res.status(400).json({
            success: false,
            message: 'End time must be after start time'
         });
      }

      // Update fields
      liveClass.title = title || liveClass.title;
      liveClass.topic = topic || liveClass.topic;
      liveClass.lectureTitle = lectureTitle || liveClass.lectureTitle;
      liveClass.subject = subject || liveClass.subject;
      liveClass.startDateTime = startDateTime ? new Date(startDateTime) : liveClass.startDateTime;
      liveClass.endDateTime = endDateTime ? new Date(endDateTime) : liveClass.endDateTime;
      liveClass.durationInMinutes = durationInMinutes;
      liveClass.teacherName = teacherName || liveClass.teacherName;
      liveClass.description = description !== undefined ? description : liveClass.description;

      await liveClass.save();

      res.json({
         success: true,
         message: 'Live class updated successfully',
         data: liveClass
      });

   } catch (error) {
      console.error('Update Live Class Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to update live class',
         error: error.message
      });
   }
};

// @desc    Join live class (Student)
// @route   GET /api/live-classes/:id/join
// @access  Private
exports.joinClass = async (req, res) => {
   try {
      const liveClass = await LiveClass.findById(req.params.id);

      if (!liveClass) {
         return res.status(404).json({
            success: false,
            message: 'Live class not found'
         });
      }

      // Check if class is active
      if (!liveClass.isActive) {
         return res.status(400).json({
            success: false,
            message: 'This class is no longer available'
         });
      }

      // Check if class is cancelled
      if (liveClass.status === 'cancelled') {
         return res.status(400).json({
            success: false,
            message: 'This class has been cancelled'
         });
      }

      // Check if class is completed
      if (liveClass.status === 'completed') {
         return res.status(400).json({
            success: false,
            message: 'This class has already ended'
         });
      }

      // Time validation - allow join 15 mins before start until end
      const now = new Date();
      const joinWindowStart = new Date(liveClass.startDateTime.getTime() - (15 * 60 * 1000));
      const joinWindowEnd = new Date(liveClass.endDateTime.getTime());

      if (now < joinWindowStart) {
         const minutesUntilStart = Math.round((liveClass.startDateTime - now) / (1000 * 60));
         return res.status(400).json({
            success: false,
            message: `Class starts in ${minutesUntilStart} minutes. You can join 15 minutes before start time.`,
            canJoinAt: joinWindowStart
         });
      }

      if (now > joinWindowEnd) {
         return res.status(400).json({
            success: false,
            message: 'This class has already ended'
         });
      }

      // Verify enrollment
      const enrollment = await Enrollment.findOne({
         userId: req.user._id,
         courseId: liveClass.courseId,
         status: { $in: ['active', 'pending'] }
      });

      if (!enrollment) {
         return res.status(403).json({
            success: false,
            message: 'Access denied. You are not enrolled in this course.'
         });
      }

      // Generate 100ms auth token for student role (with 1-hour expiration)
      const authToken = await hmsClient.generateToken(
         liveClass.roomId,
         req.user._id.toString(),
         'student'
      );

      res.json({
         success: true,
         message: 'Join token generated successfully',
         data: {
            token: authToken,
            roomId: liveClass.roomId,
            roomName: liveClass.roomName,
            classTitle: liveClass.title,
            teacherName: liveClass.teacherName,
            startDateTime: liveClass.startDateTime,
            endDateTime: liveClass.endDateTime
         }
      });

   } catch (error) {
      console.error('Join Class Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to join class',
         error: error.message
      });
   }
};

// @desc    Get today's live classes (Student)
// @route   GET /api/live-classes/today
// @access  Private
exports.getTodayClasses = async (req, res) => {
   try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Get student's enrollments
      const enrollments = await Enrollment.find({
         userId: req.user._id,
         status: { $in: ['active', 'pending'] }
      }).select('courseId');

      if (!enrollments.length) {
         return res.json({
            success: true,
            message: 'No enrollments found',
            data: []
         });
      }

      const courseIds = enrollments.map(e => e.courseId);

      const classes = await LiveClass.find({
         courseId: { $in: courseIds },
         startDateTime: { $gte: startOfDay, $lt: endOfDay },
         status: { $in: ['scheduled', 'live'] },
         isActive: true
      })
         .populate('courseId', 'title bannerImage')
         .populate('centerId', 'name')
         .sort({ startDateTime: 1 });

      res.json({
         success: true,
         count: classes.length,
         data: classes
      });

   } catch (error) {
      console.error('Get Today Classes Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch today\'s classes',
         error: error.message
      });
   }
};

// @desc    Get upcoming live classes (Student)
// @route   GET /api/live-classes/upcoming
// @access  Private
exports.getUpcomingClasses = async (req, res) => {
   try {
      const now = new Date();
      const { page = 1, limit = 10 } = req.query;
      
      // Protect against large limits
      const safeLimit = Math.min(parseInt(limit) || 10, 100);
      const safePage = Math.max(parseInt(page) || 1, 1);
      const skip = (safePage - 1) * safeLimit;

      // Get student's enrollments
      const enrollments = await Enrollment.find({
         userId: req.user._id,
         status: { $in: ['active', 'pending'] }
      }).select('courseId');

      if (!enrollments.length) {
         return res.json({
            success: true,
            message: 'No enrollments found',
            data: []
         });
      }

      const courseIds = enrollments.map(e => e.courseId);

      const classes = await LiveClass.find({
         courseId: { $in: courseIds },
         startDateTime: { $gte: now },
         status: 'scheduled',
         isActive: true
      })
         .populate('courseId', 'title bannerImage')
         .populate('centerId', 'name')
         .sort({ startDateTime: 1 })
         .skip(skip)
         .limit(safeLimit);

      const total = await LiveClass.countDocuments({
         courseId: { $in: courseIds },
         startDateTime: { $gte: now },
         status: 'scheduled',
         isActive: true
      });

      res.json({
         success: true,
         count: classes.length,
         total,
         pages: Math.ceil(total / safeLimit),
         currentPage: safePage,
         data: classes
      });

   } catch (error) {
      console.error('Get Upcoming Classes Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch upcoming classes',
         error: error.message
      });
   }
};

// @desc    Start live class (Teacher/Admin) - Auto generates teacher token
// @route   PUT /api/live-classes/:id/start
// @access  Private/Admin
exports.startClass = async (req, res) => {
   try {
      const liveClass = await LiveClass.findById(req.params.id);

      if (!liveClass) {
         return res.status(404).json({
            success: false,
            message: 'Live class not found'
         });
      }

      if (liveClass.status !== 'scheduled') {
         return res.status(400).json({
            success: false,
            message: `Class cannot be started. Current status: ${liveClass.status}`
         });
      }

      // Validate time - allow start only 15 mins before scheduled
      const now = new Date();
      const allowedStart = new Date(liveClass.startDateTime.getTime() - (15 * 60 * 1000));

      if (now < allowedStart) {
         const minutesUntilStart = Math.round((liveClass.startDateTime - now) / (1000 * 60));
         return res.status(400).json({
            success: false,
            message: `Class can only be started 15 minutes before scheduled time. ${minutesUntilStart} minutes remaining.`
         });
      }

      // Update status to live
      liveClass.status = 'live';
      await liveClass.save();

      // Auto-generate teacher token
      const teacherToken = await hmsClient.generateToken(
         liveClass.roomId,
         req.user._id.toString(),
         'teacher'
      );

      res.json({
         success: true,
         message: 'Live class started successfully',
         token: teacherToken,
         roomId: liveClass.roomId,
         roomName: liveClass.roomName,
         data: liveClass
      });

   } catch (error) {
      console.error('Start Class Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to start class',
         error: error.message
      });
   }
};

// @desc    Cancel live class (Admin)
// @route   PUT /api/live-classes/:id/cancel
// @access  Private/Admin
exports.cancelClass = async (req, res) => {
   try {
      const liveClass = await LiveClass.findById(req.params.id);

      if (!liveClass) {
         return res.status(404).json({
            success: false,
            message: 'Live class not found'
         });
      }

      // Cannot cancel live classes
      if (liveClass.status === 'live') {
         return res.status(400).json({
            success: false,
            message: 'Cannot cancel a live class. Please end the session first.'
         });
      }

      liveClass.status = 'cancelled';
      await liveClass.save();

      res.json({
         success: true,
         message: 'Live class cancelled successfully',
         data: liveClass
      });

   } catch (error) {
      console.error('Cancel Class Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to cancel class',
         error: error.message
      });
   }
};

// @desc    Teacher join live class
// @route   GET /api/live-classes/:id/teacher-join
// @access  Private/Admin
exports.teacherJoin = async (req, res) => {
   try {
      const liveClass = await LiveClass.findById(req.params.id);

      if (!liveClass) {
         return res.status(404).json({
            success: false,
            message: 'Live class not found'
         });
      }

      if (!liveClass.isActive) {
         return res.status(400).json({
            success: false,
            message: 'This class is no longer available'
         });
      }

      if (liveClass.status === 'cancelled') {
         return res.status(400).json({
            success: false,
            message: 'This class has been cancelled'
         });
      }

      // Teacher join security validation
      if (req.user.role === 'center_admin') {
         if (!req.user.centerId || req.user.centerId.toString() !== liveClass.centerId.toString()) {
            return res.status(403).json({
               success: false,
               message: 'You can only join classes for your own center'
            });
         }
      }

      // Generate 100ms auth token for teacher role (with 1-hour expiration)
      const authToken = await hmsClient.generateToken(
         liveClass.roomId,
         req.user._id.toString(),
         'teacher'
      );

      res.json({
         success: true,
         message: 'Teacher join token generated successfully',
         data: {
            token: authToken,
            roomId: liveClass.roomId,
            roomName: liveClass.roomName,
            classTitle: liveClass.title,
            teacherName: liveClass.teacherName,
            startDateTime: liveClass.startDateTime,
            endDateTime: liveClass.endDateTime
         }
      });

   } catch (error) {
      console.error('Teacher Join Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to generate teacher join token',
         error: error.message
      });
   }
};

// @desc    Update class status (Admin)
// @route   PUT /api/live-classes/:id/status
// @access  Private/Admin
exports.updateClassStatus = async (req, res) => {
   try {
      const { status } = req.body;

      const liveClass = await LiveClass.findById(req.params.id);

      if (!liveClass) {
         return res.status(404).json({
            success: false,
            message: 'Live class not found'
         });
      }

      // State transition validation
      const validTransitions = {
         'scheduled': ['live', 'cancelled'],
         'live': ['completed'],
         'completed': [],
         'cancelled': []
      };

      const allowedStatuses = validTransitions[liveClass.status] || [];

      if (!allowedStatuses.includes(status)) {
         return res.status(400).json({
            success: false,
            message: `Invalid status transition from ${liveClass.status} to ${status}. Allowed: ${allowedStatuses.join(', ') || 'none'}`
         });
      }

      liveClass.status = status;
      await liveClass.save();

      res.json({
         success: true,
         message: 'Class status updated successfully',
         data: liveClass
      });

   } catch (error) {
      console.error('Update Class Status Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to update class status',
         error: error.message
      });
   }
};

// @desc    Get live class statistics (Admin)
// @route   GET /api/live-classes/stats
// @access  Private/Admin
exports.getStats = async (req, res) => {
   try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const stats = await LiveClass.aggregate([
         {
            $group: {
               _id: '$status',
               count: { $sum: 1 }
            }
         }
      ]);

      const todayClasses = await LiveClass.countDocuments({
         startDateTime: { $gte: startOfDay, $lt: endOfDay }
      });

      res.json({
         success: true,
         data: {
            byStatus: stats,
            todayClasses
         }
      });

   } catch (error) {
      console.error('Get Stats Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch statistics',
         error: error.message
      });
   }
};
```

### `controllers/orderController.js`

```javascript
const Order = require('../models/Order');
const Enrollment = require('../models/Enrollment');
const BookOrder = require('../models/BookOrder');

// @desc    Get my orders (Student)
// @route   GET /api/orders/my-orders
// @access  Private
exports.getMyOrders = async (req, res) => {
   try {
      const { orderType, status, page = 1, limit = 10 } = req.query;
      
      // Build query
      const query = { userId: req.user._id };
      
      if (orderType && ['COURSE', 'BOOK'].includes(orderType)) {
         query.orderType = orderType;
      }
      
      if (status) {
         // Check if it's payment status or order status
         if (['PENDING', 'PAID', 'FAILED', 'REFUNDED'].includes(status)) {
            query.paymentStatus = status;
         } else {
            query.orderStatus = status;
         }
      }
      
      // Get orders
      const orders = await Order.find(query)
         .populate('courseId', 'title slug bannerImage')
         .populate('bookId', 'title image discountedPrice')
         .sort({ createdAt: -1 })
         .limit(limit * 1)
         .skip((page - 1) * limit);
      
      const total = await Order.countDocuments(query);
      
      res.json({
         success: true,
         count: orders.length,
         total,
         pages: Math.ceil(total / limit),
         currentPage: page,
         data: orders
      });
      
   } catch (error) {
      console.error('Get My Orders Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch orders',
         error: error.message
      });
   }
};

// @desc    Get single order details (Student)
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderDetails = async (req, res) => {
   try {
      const order = await Order.findOne({
         _id: req.params.id,
         userId: req.user._id
      })
         .populate('courseId', 'title slug bannerImage fees')
         .populate('bookId', 'title image discountedPrice authorNames');
      
      if (!order) {
         return res.status(404).json({
            success: false,
            message: 'Order not found'
         });
      }
      
      res.json({
         success: true,
         data: order
      });
      
   } catch (error) {
      console.error('Get Order Details Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch order details',
         error: error.message
      });
   }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
   try {
      const { orderType, paymentStatus, orderStatus, page = 1, limit = 20 } = req.query;
      
      // Build query
      const query = {};
      
      if (orderType && ['COURSE', 'BOOK'].includes(orderType)) {
         query.orderType = orderType;
      }
      
      if (paymentStatus) {
         query.paymentStatus = paymentStatus;
      }
      
      if (orderStatus) {
         query.orderStatus = orderStatus;
      }
      
      // Get orders
      const orders = await Order.find(query)
         .populate('userId', 'name email mobile')
         .populate('courseId', 'title')
         .populate('bookId', 'title')
         .sort({ createdAt: -1 })
         .limit(limit * 1)
         .skip((page - 1) * limit);
      
      const total = await Order.countDocuments(query);
      
      // Get statistics
      const stats = await Order.aggregate([
         { $match: query },
         {
            $group: {
               _id: null,
               totalOrders: { $sum: 1 },
               totalRevenue: { $sum: '$finalAmount' },
               paidOrders: {
                  $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, 1, 0] }
               },
               pendingOrders: {
                  $sum: { $cond: [{ $eq: ['$paymentStatus', 'PENDING'] }, 1, 0] }
               }
            }
         }
      ]);
      
      res.json({
         success: true,
         count: orders.length,
         total,
         pages: Math.ceil(total / limit),
         currentPage: page,
         stats: stats[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            paidOrders: 0,
            pendingOrders: 0
         },
         data: orders
      });
      
   } catch (error) {
      console.error('Get All Orders Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch orders',
         error: error.message
      });
   }
};

// @desc    Update order status (Admin) - For BOOK orders
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
   try {
      const { orderStatus, courierName, trackingNumber } = req.body;
      
      // Validate order status
      const validStatuses = ['PLACED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'];
      if (!validStatuses.includes(orderStatus)) {
         return res.status(400).json({
            success: false,
            message: `Invalid order status. Must be one of: ${validStatuses.join(', ')}`
         });
      }
      
      const order = await Order.findById(req.params.id);
      
      if (!order) {
         return res.status(404).json({
            success: false,
            message: 'Order not found'
         });
      }
      
      // Only BOOK orders have orderStatus
      if (order.orderType !== 'BOOK') {
         return res.status(400).json({
            success: false,
            message: 'Order status can only be updated for book orders'
         });
      }
      
      // Update order status
      order.orderStatus = orderStatus;
      
      // Add tracking info if provided
      if (courierName) order.courierName = courierName;
      if (trackingNumber) order.trackingNumber = trackingNumber;
      
      // Update timestamps
      if (orderStatus === 'SHIPPED' && !order.shippedAt) {
         order.shippedAt = new Date();
      }
      
      if (orderStatus === 'DELIVERED' && !order.deliveredAt) {
         order.deliveredAt = new Date();
      }
      
      await order.save();
      
      res.json({
         success: true,
         message: 'Order status updated successfully',
         data: order
      });
      
   } catch (error) {
      console.error('Update Order Status Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to update order status',
         error: error.message
      });
   }
};

// @desc    Get order statistics (Admin)
// @route   GET /api/orders/stats
// @access  Private/Admin
exports.getOrderStats = async (req, res) => {
   try {
      const stats = await Order.aggregate([
         {
            $group: {
               _id: '$orderType',
               count: { $sum: 1 },
               totalRevenue: { $sum: '$finalAmount' },
               avgOrderValue: { $avg: '$finalAmount' }
            }
         }
      ]);
      
      const paymentStats = await Order.aggregate([
         {
            $group: {
               _id: '$paymentStatus',
               count: { $sum: 1 },
               totalAmount: { $sum: '$finalAmount' }
            }
         }
      ]);
      
      const orderStatusStats = await Order.aggregate([
         { $match: { orderType: 'BOOK' } },
         {
            $group: {
               _id: '$orderStatus',
               count: { $sum: 1 }
            }
         }
      ]);
      
      res.json({
         success: true,
         data: {
            byType: stats,
            byPaymentStatus: paymentStats,
            byOrderStatus: orderStatusStats
         }
      });
      
   } catch (error) {
      console.error('Get Order Stats Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch order statistics',
         error: error.message
      });
   }
};
```

### `controllers/paperController.js`

```javascript
const Paper = require('../models/Paper');

// @desc    Create paper
// @route   POST /api/papers
// @access  Private (Admin)
exports.createPaper = async (req, res) => {
  try {
    const { name, isActive } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Paper name is required'
      });
    }

    const paper = await Paper.create({
      name,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      message: 'Paper created successfully',
      data: paper
    });

  } catch (err) {
    console.error('Create Paper Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error creating paper',
      error: err.message
    });
  }
};

// @desc    Get all papers
// @route   GET /api/papers
// @access  Public
exports.getPapers = async (req, res) => {
  try {
    const papers = await Paper.find({ isActive: true }).sort({ name: 1 });

    res.json({
      success: true,
      count: papers.length,
      data: papers
    });

  } catch (err) {
    console.error('Get Papers Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching papers',
      error: err.message
    });
  }
};

// @desc    Update paper
// @route   PUT /api/papers/:id
// @access  Private (Admin)
exports.updatePaper = async (req, res) => {
  try {
    const paper = await Paper.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    res.json({
      success: true,
      message: 'Paper updated successfully',
      data: paper
    });

  } catch (err) {
    console.error('Update Paper Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating paper',
      error: err.message
    });
  }
};

// @desc    Delete paper
// @route   DELETE /api/papers/:id
// @access  Private (Admin)
exports.deletePaper = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    await Paper.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Paper deleted successfully'
    });

  } catch (err) {
    console.error('Delete Paper Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting paper',
      error: err.message
    });
  }
};
```

### `controllers/topStoryController.js`

```javascript
const TopStory = require('../models/TopStory');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

// @desc    Create top story
// @route   POST /api/top-stories
// @access  Private (Super Admin & Admin)
exports.createTopStory = async (req, res) => {
  try {
    const { title, description, authorName, date } = req.body;

    // Validate required thumbnail
    if (!req.files || !req.files['thumbnail']) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail image is required'
      });
    }

    // Upload thumbnail to Cloudinary
    const thumbnailResult = await uploadToCloudinary(
      req.files['thumbnail'][0],
      'top-stories/thumbnails'
    );

    const topStory = new TopStory({
      title,
      description,
      thumbnail: {
        url: thumbnailResult.url,
        publicId: thumbnailResult.public_id
      },
      authorName,
      date: date || new Date(),
      createdBy: req.user?._id
    });

    await topStory.save();

    res.status(201).json({
      success: true,
      message: 'Top story created successfully',
      data: topStory
    });
  } catch (error) {
    console.error('Create Top Story Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating top story',
      error: error.message
    });
  }
};

// @desc    Get all top stories
// @route   GET /api/top-stories
// @access  Public
exports.getTopStories = async (req, res) => {
  try {
    const { limit, page } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 0;

    let query = TopStory.find({ isActive: true }).sort({ createdAt: -1 });

    // Apply pagination if limit is provided
    if (limitNum > 0) {
      const skip = (pageNum - 1) * limitNum;
      query = query.skip(skip).limit(limitNum);
    }

    const topStories = await query;

    res.json({
      success: true,
      count: topStories.length,
      data: topStories
    });
  } catch (error) {
    console.error('Get Top Stories Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching top stories',
      error: error.message
    });
  }
};

// @desc    Get single top story
// @route   GET /api/top-stories/:id
// @access  Public
exports.getTopStory = async (req, res) => {
  try {
    const topStory = await TopStory.findById(req.params.id);

    if (!topStory || !topStory.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Top story not found'
      });
    }

    res.json({
      success: true,
      data: topStory
    });
  } catch (error) {
    console.error('Get Top Story Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching top story',
      error: error.message
    });
  }
};

// @desc    Update top story
// @route   PUT /api/top-stories/:id
// @access  Private (Super Admin & Admin)
exports.updateTopStory = async (req, res) => {
  try {
    const { title, description, authorName, date } = req.body;

    const topStory = await TopStory.findById(req.params.id);

    if (!topStory) {
      return res.status(404).json({
        success: false,
        message: 'Top story not found'
      });
    }

    // Update text fields
    if (title) topStory.title = title;
    if (description) topStory.description = description;
    if (authorName) topStory.authorName = authorName;
    if (date) topStory.date = date;

    // Upload new thumbnail if provided
    if (req.files && req.files['thumbnail']) {
      // Delete old image from Cloudinary
      if (topStory.thumbnail.publicId) {
        const cloudinary = require('cloudinary').v2;
        await cloudinary.uploader.destroy(topStory.thumbnail.publicId);
      }

      const thumbnailResult = await uploadToCloudinary(
        req.files['thumbnail'][0],
        'top-stories/thumbnails'
      );

      topStory.thumbnail = {
        url: thumbnailResult.url,
        publicId: thumbnailResult.public_id
      };
    }

    await topStory.save();

    res.json({
      success: true,
      message: 'Top story updated successfully',
      data: topStory
    });
  } catch (error) {
    console.error('Update Top Story Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating top story',
      error: error.message
    });
  }
};

// @desc    Delete top story (soft delete)
// @route   DELETE /api/top-stories/:id
// @access  Private (Super Admin & Admin)
exports.deleteTopStory = async (req, res) => {
  try {
    const topStory = await TopStory.findById(req.params.id);

    if (!topStory) {
      return res.status(404).json({
        success: false,
        message: 'Top story not found'
      });
    }

    // Soft delete
    topStory.isActive = false;
    await topStory.save();

    res.json({
      success: true,
      message: 'Top story deleted successfully',
      data: topStory
    });
  } catch (error) {
    console.error('Delete Top Story Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting top story',
      error: error.message
    });
  }
};
```

### `controllers/userController.js`

```javascript
const User = require('../models/User');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const { validate, validations } = require('../middleware/validation');

// @desc    Get User Profile
// @route   GET /api/user/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let profileData = {};

    // Fetch additional data based on role
    if (user.role === 'student') {
      const student = await Student.findOne({ userId: user._id });
      if (student) {
        profileData.student = student;
      }
    } else if (user.role === 'parent') {
      const parent = await Parent.findOne({ userId: user._id }).populate('studentId');
      if (parent) {
        profileData.parent = parent;
      }
    }

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        ...profileData
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get Complete Student Details
// @route   GET /api/user/student-details
// @access  Private (Student only)
exports.getStudentDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only students can access this endpoint
    if (user.role !== 'student') {
      return res.status(403).json({ 
        message: 'Only students can access this endpoint' 
      });
    }

    // Get complete student profile
    const student = await Student.findOne({ userId: user._id });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Get parent information if available
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

    // Get enrollment and course information
    const Enrollment = require('../models/Enrollment');
    const enrollments = await Enrollment.find({ studentId: student._id })
      .populate('courseId', 'name description')
      .select('-__v');

    res.json({
      success: true,
      student: {
        // User account details
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        // Student profile details
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
        // Parent account info (if added)
        parent: parentInfo,
        // Enrollment information
        enrollments: enrollments || [],
        totalEnrollments: enrollments?.length || 0
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update User Profile
// @route   PUT /api/user/profile
// @access  Private
exports.updateProfile = [
  validate(validations.updateProfile),
  async (req, res) => {
    try {
      const { name, email, mobile, parentName, parentMobile, parentEmail } = req.body;

      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update basic user fields
      if (name) user.name = name;
      if (email) user.email = email;
      if (mobile) user.mobile = mobile;

      await user.save();

      // Update student parent profile if this is a student
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

// @desc    Student Update Parent Details (Profile Update)
// @route   PUT /api/user/update-parent-details
// @access  Private (Student only)
exports.updateParentDetails = [
  validate(validations.updateParentDetails),
  async (req, res) => {
    try {
      const { parentName, parentMobile, parentEmail } = req.body;

      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Only students can update parent details
      if (user.role !== 'student') {
        return res.status(403).json({ 
          message: 'Only students can update parent details' 
        });
      }

      // Find student profile
      let studentProfile = await Student.findOne({ userId: user._id });

      if (!studentProfile) {
        return res.status(404).json({ message: 'Student profile not found' });
      }

      // Update parent details
      studentProfile.parentName = parentName;
      studentProfile.parentMobile = parentMobile;
      studentProfile.parentEmail = parentEmail;
      studentProfile.parentMobileVerified = false;
      studentProfile.parentEmailVerified = false;

      await studentProfile.save();

      // Create or update parent user account
      let parentUser = await User.findOne({
        $or: [
          { email: parentEmail.toLowerCase().trim() },
          { mobile: parentMobile.trim() }
        ],
        role: 'parent'
      });

      if (!parentUser) {
        // Create new parent user
        parentUser = await User.create({
          name: parentName,
          email: parentEmail,
          mobile: parentMobile,
          role: 'parent',
          isActive: true
        });

        // Link parent to student
        await Parent.create({
          userId: parentUser._id,
          studentId: studentProfile._id
        });

        console.log('✅ Parent account created and linked to student:', user.name);
      } else {
        // Update existing parent user
        parentUser.name = parentName;
        await parentUser.save();

        // Update or create parent link
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

        console.log('✅ Parent account updated and linked to student:', user.name);
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

// @desc    Change Password
// @route   PUT /api/user/change-password
// @access  Private
exports.changePassword = [
  validate(validations.changePassword),
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user._id).select('+password');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user has password (OTP users may not have one)
      if (!user.password) {
        return res.status(400).json({ 
          message: 'Cannot change password. This account uses OTP login.' 
        });
      }

      // Verify current password
      const isMatch = await user.matchPassword(currentPassword);

      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
];
```

### `models/Announcement.js`

```javascript
const mongoose = require("mongoose");

const AnnouncementSchema = new mongoose.Schema({

   title: {
      type: String,
      required: true,
      trim: true
   },

   description: {
      type: String,
      required: true
   },

   thumbnail: {
      url: String,
      public_id: String
   },

   pdf: {
      url: String,
      public_id: String,
      originalName: String
   },

   announcementType: {
      type: String,
      enum: ["general", "exam", "result", "important"],
      default: "general"
   },

   courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true
   },

   categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category"
   },

   centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center"
   },

   publishedAt: {
      type: Date,
      default: Date.now
   },

   createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
   },

   isActive: {
      type: Boolean,
      default: true
   }

}, {
   timestamps: true
});

// Index for efficient querying
AnnouncementSchema.index({ courseId: 1, publishedAt: -1 });
AnnouncementSchema.index({ centerId: 1, publishedAt: -1 });

module.exports = mongoose.model("Announcement", AnnouncementSchema);
```

### `models/AnnouncementRead.js`

```javascript
const mongoose = require("mongoose");

const AnnouncementReadSchema = new mongoose.Schema({

   announcementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Announcement",
      required: true
   },

   userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
   },

   readAt: {
      type: Date,
      default: Date.now
   }

}, {
   timestamps: true
});

// Unique compound index - prevents duplicate read records
AnnouncementReadSchema.index({
   announcementId: 1,
   userId: 1
}, {
   unique: true
});

module.exports = mongoose.model("AnnouncementRead", AnnouncementReadSchema);
```

### `models/Article.js`

```javascript
const mongoose = require('mongoose');
const slugify = require('slugify');

const ArticleSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Article title is required'],
    trim: true
  },
  slug: { 
    type: String,
    trim: true
  },

  description: {
    type: String,
    trim: true
  },
  
  content: {
    type: String,
    required: [true, 'Article content is required']
  },

  thumbnail: {
    url: String,
    public_id: String
  },

  images: [
    {
      url: String,
      public_id: String
    }
  ],

  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BlogCategory",
    required: [true, 'Category is required']
  },

  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  isActive: { 
    type: Boolean, 
    default: true 
  },

  views: { 
    type: Number, 
    default: 0 
  },

  readTime: { 
    type: Number // in minutes
  }
}, { timestamps: true });

// Indexes for performance
ArticleSchema.index({ categoryId: 1, createdAt: -1 });
ArticleSchema.index({ slug: 1 }, { unique: true });
ArticleSchema.index({ title: 'text', description: 'text' });
ArticleSchema.index({ isActive: 1, createdAt: -1 });

// Generate unique slug before saving
ArticleSchema.pre('save', async function() {
  if (this.isModified('title')) {
    let slug = slugify(this.title, { lower: true, strict: true });
    const count = await mongoose.models.Article.countDocuments({ slug: new RegExp(`^${slug}`, 'i') });
    this.slug = count ? `${slug}-${count + 1}` : slug;
  }
});

// Validate max 5 images
ArticleSchema.pre('save', async function() {
  if (this.images && this.images.length > 5) {
    throw new Error('Maximum 5 images allowed per article');
  }
});

// Increment views method (atomic operation to prevent race conditions)
ArticleSchema.methods.incrementViews = async function() {
  await mongoose.models.Article.findByIdAndUpdate(this._id, {
    $inc: { views: 1 }
  });
};

module.exports = mongoose.model("Article", ArticleSchema);
```

### `models/Blog.js`

```javascript
const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  languageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Language',
    required: true
  },
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  thumbnail: {
    url: String,
    public_id: String
  },
  images: [{
    url: String,
    public_id: String
  }],
  date: {
    type: Date
  },
  year: {
    type: Number
  },
  month: {
    type: Number,
    min: 1,
    max: 12
  },
  isActive: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Indexes for faster queries
blogSchema.index({ languageId: 1, paperId: 1 });
blogSchema.index({ year: 1, month: 1 });
blogSchema.index({ year: 1, month: 1, date: 1 });
blogSchema.index({ isActive: 1 });
blogSchema.index({ slug: 1 });

module.exports = mongoose.model('Blog', blogSchema);
```

### `models/BlogCategory.js`

```javascript
const mongoose = require('mongoose');
const slugify = require('slugify');

const BlogCategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Category name is required'],
    unique: true,
    trim: true
  },
  slug: { 
    type: String,
    trim: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }
}, { timestamps: true });

// Indexes for performance
BlogCategorySchema.index({ slug: 1 }, { unique: true });
BlogCategorySchema.index({ isActive: 1 });

// Generate unique slug before saving
BlogCategorySchema.pre('save', async function() {
  if (this.isModified('name')) {
    let slug = slugify(this.name, { lower: true, strict: true });
    const count = await mongoose.models.BlogCategory.countDocuments({ slug: new RegExp(`^${slug}`, 'i') });
    this.slug = count ? `${slug}-${count + 1}` : slug;
  }
});

module.exports = mongoose.model("BlogCategory", BlogCategorySchema);
```

### `models/BlogContent.js`

```javascript
const mongoose = require('mongoose');

const blogContentSchema = new mongoose.Schema({
  blogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  }
}, { timestamps: true });

// Index for faster queries
blogContentSchema.index({ blogId: 1, order: 1 });

module.exports = mongoose.model('BlogContent', blogContentSchema);
```

### `models/Book.js`

```javascript
const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  authorNames: [{
    type: String,
    required: [true, 'At least one author is required']
  }],
  subjects: [{
    type: String,
    required: [true, 'At least one subject is required']
  }],
  summary: {
    type: String,
    required: [true, 'Book summary is required'],
    maxlength: [2000, 'Summary cannot exceed 2000 characters']
  },
  image: {
    url: {
      type: String,
      required: [true, 'Book image is required']
    },
    publicId: {
      type: String
    }
  },
  fullPrice: {
    type: Number,
    required: [true, 'Full price is required'],
    min: [0, 'Price cannot be negative']
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  discountedPrice: {
    type: Number,
    required: [true, 'Discounted price is required'],
    min: [0, 'Discounted price cannot be negative']
  },
  
  // Stock management
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  
  inStock: {
    type: Boolean,
    default: true
  },
  
  // Delivery charge
  deliveryCharge: {
    type: Number,
    default: 0,
    min: [0, 'Delivery charge cannot be negative']
  },
  
  // Offer label for UI display
  offerText: {
    type: String,
    default: ''
  },
  
  // Coupon eligibility
  isCouponApplicable: {
    type: Boolean,
    default: true
  },
  
  isBestSeller: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for faster queries
BookSchema.index({ isActive: 1, isBestSeller: 1, createdAt: -1 });
BookSchema.index({ subjects: 1 });

module.exports = mongoose.model('Book', BookSchema);
```

### `models/BookOrder.js`

```javascript
const mongoose = require('mongoose');

const bookOrderItemSchema = new mongoose.Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  
  title: { type: String, required: true },
  image: { type: String, default: null },
  authorNames: [{ type: String }],
  subjects: [{ type: String }],
  
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  
  actualPrice: { type: Number, required: true },
  discountedPrice: { type: Number, required: true },
  deliveryCharge: { type: Number, default: 0 }
}, { _id: true });

const bookOrderSchema = new mongoose.Schema({
  // Order number (unique identifier)
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // User who placed the order
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Order items
  items: [bookOrderItemSchema],
  
  // Pricing
  totalItems: {
    type: Number,
    required: true
  },
  
  totalActualPrice: {
    type: Number,
    required: true
  },
  
  totalDiscountedPrice: {
    type: Number,
    required: true
  },
  
  totalDeliveryCharge: {
    type: Number,
    default: 0
  },
  
  // Coupon
  appliedCoupon: {
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    couponCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['PERCENTAGE', 'FLAT'], default: null }
  },
  
  // Final amount
  finalAmount: {
    type: Number,
    required: true
  },
  
  // Shipping Address
  shippingAddress: {
    fullName: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true },
    addressLine: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: { type: String, default: null }
  },
  
  // Payment Details
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  
  paymentMethod: {
    type: String,
    enum: ['RAZORPAY', 'COD'],
    default: 'RAZORPAY'
  },
  
  razorpayOrderId: { type: String, default: null },
  razorpayPaymentId: { type: String, default: null },
  razorpaySignature: { type: String, default: null },
  paidAt: { type: Date, default: null },
  
  // Order Status
  orderStatus: {
    type: String,
    enum: ['PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'],
    default: 'PLACED'
  },
  
  // Tracking & Documentation
  courierName: { type: String, default: null },
  trackingNumber: { type: String, default: null },
  shippedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  
  // Invoice
  invoiceUrl: { type: String, default: null },
  invoiceNumber: { type: String, default: null },
  
  // Notes
  customerNote: { type: String, default: null },
  adminNote: { type: String, default: null },
  
  // Metadata
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, default: null }
}, { 
  timestamps: true 
});

// Generate order number before saving
bookOrderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderNumber = `BK${year}${month}${random}`;
  }
  next();
});

// Indexes for faster queries
bookOrderSchema.index({ userId: 1, createdAt: -1 });
bookOrderSchema.index({ orderNumber: 1 });
bookOrderSchema.index({ paymentStatus: 1 });
bookOrderSchema.index({ orderStatus: 1 });

module.exports = mongoose.model('BookOrder', bookOrderSchema);
```

### `models/BookOverview.js`

```javascript
const mongoose = require('mongoose');

const BookOverviewSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  videoUrl: {
    type: String,
    required: [true, 'Video URL is required']
  },
  videoPublicId: {
    type: String,
    required: [true, 'Video Public ID is required']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for faster queries
BookOverviewSchema.index({ isActive: 1 });

module.exports = mongoose.model('BookOverview', BookOverviewSchema);
```

### `models/BookTopper.js`

```javascript
const mongoose = require('mongoose');

const BookTopperSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  videoUrl: {
    type: String,
    required: [true, 'Video URL is required']
  },
  videoPublicId: {
    type: String,
    required: [true, 'Video Public ID is required']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for faster queries
BookTopperSchema.index({ isActive: 1 });

module.exports = mongoose.model('BookTopper', BookTopperSchema);
```

### `models/Cart.js`

```javascript
const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  // Item Type: COURSE or BOOK
  itemType: {
    type: String,
    enum: ['COURSE', 'BOOK'],
    required: [true, 'Item type is required']
  },
  
  // Reference to the actual item
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Item ID is required'],
    refPath: 'itemType'
  },
  
  // For COURSE items (required only for courses)
  courseMode: {
    type: String,
    enum: ['online', 'offline'],
    default: undefined
  },
  
  // Quantity (for books, courses always 1)
  quantity: {
    type: Number,
    default: 1,
    min: [1, 'Quantity must be at least 1']
  },
  
  // Price snapshot at time of adding to cart
  actualPrice: {
    type: Number,
    required: [true, 'Actual price is required']
  },
  
  discountedPrice: {
    type: Number,
    required: [true, 'Discounted price is required']
  },
  
  // Offer text for UI display
  appliedOfferText: {
    type: String,
    default: ''
  },
  
  // Coupon eligibility flag
  isCouponApplicable: {
    type: Boolean,
    default: true
  },
  
  // Enhanced Item snapshot (preserve rich data at time of adding to cart)
  itemSnapshot: {
    title: { type: String, required: true },
    image: { type: String, default: null },
    
    // Book-specific fields
    authorNames: [{ type: String }],
    subjects: [{ type: String }],
    deliveryCharge: { type: Number, default: 0 },
    inStock: { type: Boolean, default: true },
    
    // Course-specific fields
    center: { type: String, default: null },
    category: { type: String, default: null },
    duration: { type: String, default: null },
    validity: { type: String, default: null },
    mode: { type: String, default: null }
  }
}, { _id: true });

const cartSchema = new mongoose.Schema({
  // User who owns this cart
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true // One cart per user
  },
  
  // Cart items
  items: [cartItemSchema],
  
  // Applied coupon
  appliedCoupon: {
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    couponCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['PERCENTAGE', 'FLAT'], default: null }
  },
  
  // Cart summary - Basic totals
  totalItems: {
    type: Number,
    default: 0
  },
  
  totalActualPrice: {
    type: Number,
    default: 0
  },
  
  totalDiscountedPrice: {
    type: Number,
    default: 0
  },
  
  totalItemDiscount: {
    type: Number,
    default: 0
  },
  
  // Separated totals for courses and books
  courseTotal: {
    actualPrice: { type: Number, default: 0 },
    discountedPrice: { type: Number, default: 0 }
  },
  
  bookTotal: {
    actualPrice: { type: Number, default: 0 },
    discountedPrice: { type: Number, default: 0 }
  },
  
  // Delivery charges (books only)
  deliveryCharge: {
    type: Number,
    default: 0
  },
  
  // Coupon discount
  couponDiscount: {
    type: Number,
    default: 0
  },
  
  // Final payable amount
  finalAmount: {
    type: Number,
    default: 0
  },
  
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Auto-calculate totals before saving
cartSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    // Calculate basic totals
    this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
    this.totalActualPrice = this.items.reduce((sum, item) => sum + (item.actualPrice * item.quantity), 0);
    this.totalDiscountedPrice = this.items.reduce((sum, item) => sum + (item.discountedPrice * item.quantity), 0);
    this.totalItemDiscount = this.totalActualPrice - this.totalDiscountedPrice;
    
    // Calculate separated totals for courses and books
    this.courseTotal = { actualPrice: 0, discountedPrice: 0 };
    this.bookTotal = { actualPrice: 0, discountedPrice: 0 };
    this.deliveryCharge = 0;
    
    this.items.forEach(item => {
      if (item.itemType === 'COURSE') {
        this.courseTotal.actualPrice += item.actualPrice * item.quantity;
        this.courseTotal.discountedPrice += item.discountedPrice * item.quantity;
      } else if (item.itemType === 'BOOK') {
        this.bookTotal.actualPrice += item.actualPrice * item.quantity;
        this.bookTotal.discountedPrice += item.discountedPrice * item.quantity;
        // Add delivery charge for books
        if (item.itemSnapshot && item.itemSnapshot.deliveryCharge) {
          this.deliveryCharge += item.itemSnapshot.deliveryCharge * item.quantity;
        }
      }
    });
    
    // Calculate final amount
    this.finalAmount = this.totalDiscountedPrice + this.deliveryCharge - this.couponDiscount;
    
  } else {
    this.totalItems = 0;
    this.totalActualPrice = 0;
    this.totalDiscountedPrice = 0;
    this.totalItemDiscount = 0;
    this.courseTotal = { actualPrice: 0, discountedPrice: 0 };
    this.bookTotal = { actualPrice: 0, discountedPrice: 0 };
    this.deliveryCharge = 0;
    this.couponDiscount = 0;
    this.finalAmount = 0;
    this.appliedCoupon = {
      couponId: null,
      couponCode: null,
      discountAmount: 0,
      discountType: null
    };
  }
  
  this.lastUpdated = Date.now();
  next();
});

// Indexes for faster queries
cartSchema.index({ userId: 1 });
cartSchema.index({ 'items.itemType': 1 });
cartSchema.index({ 'items.itemId': 1 });

module.exports = mongoose.model('Cart', cartSchema);
```

### `models/Center.js`

```javascript
const mongoose = require('mongoose');

const centerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  centerAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Center', centerSchema);
```

### `models/CenterData.js`

```javascript
const mongoose = require('mongoose');

const centerDataSchema = new mongoose.Schema({
  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  thumbnail: {
    url: String,
    public_id: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for efficient queries
centerDataSchema.index({ isActive: 1 });

module.exports = mongoose.model('CenterData', centerDataSchema);
```

### `models/Coupon.js`

```javascript
const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
   couponName: {
      type: String,
      required: [true, 'Coupon name is required'],
      trim: true
   },

   couponCode: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true
   },

   type: {
      type: String,
      enum: ['PERCENTAGE', 'FLAT'],
      required: [true, 'Coupon type is required']
   },

   // Discount value (percentage or flat amount)
   value: {
      type: Number,
      required: [true, 'Coupon value is required'],
      min: [0, 'Value cannot be negative']
   },

   // Category API relation
   // REQUIRED when applicableFor = 'COURSE' (coupon valid only for that category)
   // OPTIONAL when applicableFor = 'BOTH' (can apply to specific category or all)
   // NOT USED when applicableFor = 'BOOK' (valid for all books)
   categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
   },

   // Coupon banner image
   backgroundImage: {
      url: String,
      public_id: String
   },

   // Coupon validity
   validFrom: {
      type: Date,
      required: [true, 'Valid from date is required']
   },

   validTill: {
      type: Date,
      required: [true, 'Valid till date is required']
   },

   // Usage controls
   totalUsersLimit: {
      type: Number,
      default: null
   },

   usageLimitPerCustomer: {
      type: Number,
      default: 1
   },

   minimumQuantity: {
      type: Number,
      default: 1
   },

   minimumCartValue: {
      type: Number,
      default: 0
   },

   usedCount: {
      type: Number,
      default: 0
   },

   // Applicable for (Course, Book, or Both)
   // COURSE: Valid ONLY for specific category (categoryId REQUIRED)
   // BOOK: Valid for ALL books (categoryId NOT USED)
   // BOTH: Can be used for both courses and books (categoryId OPTIONAL)
   applicableFor: {
      type: String,
      enum: ['COURSE', 'BOOK', 'BOTH'],
      default: 'BOTH'
   },

   // Status
   status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
   },

   isDeleted: {
      type: Boolean,
      default: false
   },

   createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
   }
}, {
   timestamps: true
});

// Indexes for faster lookups
CouponSchema.index({ couponCode: 1, status: 1, isDeleted: 1 });
CouponSchema.index({ validTill: 1 });
CouponSchema.index({ categoryId: 1 });
CouponSchema.index({ type: 1 });

module.exports = mongoose.model('Coupon', CouponSchema);
```

### `models/CouponUsage.js`

```javascript
const mongoose = require('mongoose');

const CouponUsageSchema = new mongoose.Schema({
   couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      required: true
   },

   userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
   },

   orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
   },

   usedAt: {
      type: Date,
      default: Date.now
   }
}, {
   timestamps: true
});

// Indexes for fast lookups
CouponUsageSchema.index({ couponId: 1, userId: 1 });
CouponUsageSchema.index({ userId: 1 });
CouponUsageSchema.index({ couponId: 1 });

module.exports = mongoose.model('CouponUsage', CouponUsageSchema);
```

### `models/Employee.js`

```javascript
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permissions: [{
    type: String
  }],
  center: {
    type: String,
    enum: ['Hyderabad', 'New Delhi', 'Pune']
  }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
```

### `models/Enquiry.js`

```javascript
const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  phone: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    trim: true,
    lowercase: true
  },

  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center'
  },

  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },

  targetYear: {
    type: String,
    trim: true
  },

  expectation: {
    type: String,
    trim: true
  },

  status: {
    type: String,
    enum: ['new', 'contacted', 'converted', 'closed'],
    default: 'new'
  },

  notes: {
    type: String,
    trim: true
  },

  // Track who handled this enquiry
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Track enquiry source (which form was used)
  source: {
    type: String,
    enum: ['main', 'course', 'demo'],
    default: 'main'
  },

  // Spam prevention
  lastEnquiryAt: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

// Index for faster queries
enquirySchema.index({ phone: 1 });
enquirySchema.index({ status: 1 });
enquirySchema.index({ course: 1 });
enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ center: 1, category: 1 }); // For reporting/analytics

module.exports = mongoose.model('Enquiry', enquirySchema);
```

### `models/Faculty.js`

```javascript
const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true
  },
  image: {
    url: String,
    public_id: String
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  }
}, { timestamps: true });

// Index for efficient queries
facultySchema.index({ center: 1 });

module.exports = mongoose.model('Faculty', facultySchema);
```

### `models/FeaturedArticle.js`

```javascript
const mongoose = require('mongoose');

const FeaturedArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  mainImage: {
    url: {
      type: String,
      required: [true, 'Main image URL is required']
    },
    publicId: {
      type: String
    }
  },
  secondaryImage: {
    url: {
      type: String,
      required: [true, 'Secondary image URL is required']
    },
    publicId: {
      type: String
    }
  },
  authorName: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Index for faster queries
FeaturedArticleSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('FeaturedArticle', FeaturedArticleSchema);
```

### `models/Gallery.js`

```javascript
const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true
  },
  images: [{
    url: String,
    public_id: String
  }]
}, { timestamps: true });

// Ensure maximum 6 images validation
gallerySchema.path('images').validate(function(images) {
  return images.length <= 6;
}, 'Gallery cannot have more than 6 images');

// Index for efficient queries
gallerySchema.index({ center: 1 });

module.exports = mongoose.model('Gallery', gallerySchema);
```

### `models/HomePage.js`

```javascript
const mongoose = require('mongoose');

const homePageSchema = new mongoose.Schema({

  // SECTION 1: Toppers (Title & Subtitle only - toppers in separate collection)
  section1: {
    title: {
      type: String,
      trim: true
    },
    subTitle: {
      type: String,
      trim: true
    }
  },

  // SECTION 2: Learning Programs (Title only - cards in separate collection)
  section2: {
    title: {
      type: String,
      trim: true
    }
  },

  // SECTION 3: Videos (Legacy - can be deleted)
  section3: {
    type: mongoose.Schema.Types.Mixed,
    default: undefined
  }

}, { timestamps: true, strict: false });

module.exports = mongoose.model('HomePage', homePageSchema);
```

### `models/HomeSection4.js`

```javascript
const mongoose = require('mongoose');

const section4Schema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  images: [
    {
      type: String
    }
  ],
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for efficient queries
section4Schema.index({ order: 1 });
section4Schema.index({ isActive: 1 });

module.exports = mongoose.model('HomeSection4', section4Schema);
```

### `models/HomeTopper.js`

```javascript
const mongoose = require('mongoose');

const homeTopperSchema = new mongoose.Schema({
  image: {
    type: String,  // Cloudinary URL
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  rank: {
    type: String,
    required: true,
    trim: true  // e.g., "AIR 08"
  },
  description: {
    type: String,
    trim: true  // e.g., "GS Foundation Course 2025"
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for efficient queries
homeTopperSchema.index({ isActive: 1 });

module.exports = mongoose.model('HomeTopper', homeTopperSchema);
```

### `models/HomeVideo.js`

```javascript
const mongoose = require('mongoose');

const homeVideoSchema = new mongoose.Schema({
  videoUrl: {
    type: String,
    required: true,
    trim: true
  },
  videoThumbnail: {
    type: String, // URL only (NO file upload)
    required: true,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('HomeVideo', homeVideoSchema);
```

### `models/Language.js`

```javascript
const mongoose = require('mongoose');

const languageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Language', languageSchema);
```

### `models/LiveClass.js`

```javascript
const mongoose = require('mongoose');

const LiveClassSchema = new mongoose.Schema({
   // Class Information
   title: {
      type: String,
      required: [true, 'Class title is required'],
      trim: true
   },
   
   topic: {
      type: String,
      required: [true, 'Class topic is required'],
      trim: true
   },
   
   lectureTitle: {
      type: String,
      required: [true, 'Lecture title is required'],
      trim: true
   },
   
   subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true
   },
   
   // Schedule (Clean datetime approach)
   startDateTime: {
      type: Date,
      required: [true, 'Start date and time is required']
   },
   
   endDateTime: {
      type: Date,
      required: [true, 'End date and time is required']
   },
   
   durationInMinutes: {
      type: Number,
      required: [true, 'Duration is required']
   },
   
   // Thumbnail
   thumbnail: {
      url: String,
      public_id: String
   },
   
   // Relations
   courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required']
   },
   
   centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: [true, 'Center is required']
   },
   
   categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required']
   },
   
   // 100ms Room Details
   roomId: {
      type: String,
      required: [true, 'Room ID is required'],
      unique: true
   },
   
   roomName: {
      type: String,
      required: [true, 'Room name is required']
   },
   
   // Class Status
   status: {
      type: String,
      enum: ['scheduled', 'live', 'completed', 'cancelled'],
      default: 'scheduled'
   },
   
   // Teacher Information
   teacherName: {
      type: String,
      required: [true, 'Teacher name is required']
   },
   
   // Audit Fields
   createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required']
   },
   
   // Recording (Optional - for future)
   recording: {
      url: String,
      duration: Number,
      recordedAt: Date
   },
   
   // Metadata
   description: {
      type: String,
      default: ''
   },
   
   isActive: {
      type: Boolean,
      default: true
   }
}, {
   timestamps: true
});

// Essential indexes only
LiveClassSchema.index({ courseId: 1, startDateTime: 1 });
LiveClassSchema.index({ status: 1 });

module.exports = mongoose.model('LiveClass', LiveClassSchema);
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
    enum: ['student', 'parent', 'password_reset'],
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

### `models/Order.js`

```javascript
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
   userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
   },
   
   // Order Type: COURSE or BOOK
   orderType: {
      type: String,
      enum: ['COURSE', 'BOOK'],
      required: [true, 'Order type is required']
   },
   
   // For COURSE orders
   courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null
   },
   
   courseMode: {
      type: String,
      enum: ['online', 'offline', null],
      default: null
   },
   
   // For BOOK orders
   bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      default: null
   },
   
   quantity: {
      type: Number,
      default: 1,
      min: [1, 'Quantity must be at least 1']
   },
   
   // Pricing
   actualPrice: {
      type: Number,
      required: [true, 'Actual price is required']
   },
   
   discountAmount: {
      type: Number,
      default: 0
   },
   
   deliveryCharge: {
      type: Number,
      default: 0
   },
   
   finalAmount: {
      type: Number,
      required: [true, 'Final amount is required']
   },
   
   // Coupon
   couponCode: {
      type: String,
      default: null
   },
   
   // Payment Details
   paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING'
   },
   
   // Order Status (for BOOK orders)
   orderStatus: {
      type: String,
      enum: ['PLACED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'],
      default: 'PLACED'
   },
   
   // Razorpay Details
   razorpayOrderId: {
      type: String,
      required: [true, 'Razorpay order ID is required']
   },
   
   razorpayPaymentId: {
      type: String,
      default: null
   },
   
   razorpaySignature: {
      type: String,
      default: null
   },
   
   // Shipping Address (for BOOK orders only)
   shippingAddress: {
      fullName: String,
      mobile: String,
      email: String,
      addressLine: String,
      city: String,
      state: String,
      pincode: String,
      landmark: String
   },
   
   // Tracking & Documentation
   receiptNumber: {
      type: String,
      unique: true,
      sparse: true
   },
   
   receiptUrl: {
      type: String,
      default: null
   },
   
   invoiceUrl: {
      type: String,
      default: null
   },
   
   courierName: {
      type: String,
      default: null
   },
   
   trackingNumber: {
      type: String,
      default: null
   },
   
   shippedAt: {
      type: Date,
      default: null
   },
   
   deliveredAt: {
      type: Date,
      default: null
   },
   
   // Snapshot (preserve purchase-time data)
   itemSnapshot: {
      title: String,
      price: Number,
      image: String
   }
}, { 
   timestamps: true 
});

// Indexes for faster queries
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ orderType: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ orderStatus: 1 });
// Note: receiptNumber index is automatically created by unique: true

module.exports = mongoose.model('Order', OrderSchema);
```

### `models/Paper.js`

```javascript
const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Paper', paperSchema);
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

### `models/SuccessStory.js`

```javascript
const mongoose = require('mongoose');

const successStorySchema = new mongoose.Schema({
  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true
  },
  thumbnail: {
    url: String,
    public_id: String
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  rank: {
    type: String,
    required: true,
    trim: true
  }
}, { timestamps: true });

// Index for efficient queries
successStorySchema.index({ center: 1 });

module.exports = mongoose.model('SuccessStory', successStorySchema);
```

### `models/TopStory.js`

```javascript
const mongoose = require('mongoose');

const TopStorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  thumbnail: {
    url: {
      type: String,
      required: [true, 'Thumbnail URL is required']
    },
    publicId: {
      type: String
    }
  },
  authorName: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Index for faster queries
TopStorySchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('TopStory', TopStorySchema);
```

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

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

### `routes/adminEnquiryRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const {
  getEnquiries,
  getEnquiryById,
  updateEnquiry,
  getEnquiryStats
} = require('../controllers/enquiryController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles, ROLES } = require('../middleware/roleMiddleware');

// All enquiry admin routes require authentication
router.use(protect);

// ==========================================
// ADMIN ROUTES (Super Admin Only)
// ==========================================

// Get all enquiries (can filter by center)
router.get('/', allowRoles(ROLES.SUPER_ADMIN), getEnquiries);

// Get enquiry statistics
router.get('/stats', allowRoles(ROLES.SUPER_ADMIN), getEnquiryStats);

// Get single enquiry
router.get('/:id', allowRoles(ROLES.SUPER_ADMIN), getEnquiryById);

// Update enquiry status
router.put('/:id', allowRoles(ROLES.SUPER_ADMIN), updateEnquiry);

module.exports = router;
```

### `routes/adminRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const {
  createCenterAdmin,
  createEmployee,
  getUsers,
  updateUserStatus,
  getCenters,
  createCenter,
  updateCenter,
  deleteCenter,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles, ROLES } = require('../middleware/roleMiddleware');

// All admin routes require authentication
router.use(protect);

// ==========================================
// SUPER ADMIN ONLY ROUTES
// ==========================================

// Center Management
router.post('/create-center-admin', allowRoles(ROLES.SUPER_ADMIN), createCenterAdmin);
router.get('/centers', allowRoles(ROLES.SUPER_ADMIN), getCenters);
router.post('/centers', allowRoles(ROLES.SUPER_ADMIN), createCenter);
router.put('/centers/:id', allowRoles(ROLES.SUPER_ADMIN), updateCenter);
router.delete('/centers/:id', allowRoles(ROLES.SUPER_ADMIN), deleteCenter);

// Category Management
router.post('/categories', allowRoles(ROLES.SUPER_ADMIN), createCategory);
router.put('/categories/:id', allowRoles(ROLES.SUPER_ADMIN), updateCategory);
router.delete('/categories/:id', allowRoles(ROLES.SUPER_ADMIN), deleteCategory);

// ==========================================
// SUPER ADMIN & CENTER ADMIN ROUTES
// ==========================================
router.post('/create-employee', allowRoles(ROLES.SUPER_ADMIN, ROLES.CENTER_ADMIN), createEmployee);
router.get('/users', allowRoles(ROLES.SUPER_ADMIN, ROLES.CENTER_ADMIN), getUsers);
router.put('/user/:id/status', allowRoles(ROLES.SUPER_ADMIN, ROLES.CENTER_ADMIN), updateUserStatus);
router.get('/categories', allowRoles(ROLES.SUPER_ADMIN, ROLES.CENTER_ADMIN), getCategories);

module.exports = router;
```

### `routes/announcementRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const {
   createAnnouncement,
   getAllAnnouncements,
   getAnnouncementById,
   updateAnnouncement,
   deleteAnnouncement,
   getStudentAnnouncements,
   markAsRead,
   getUnreadCount
} = require('../controllers/announcementController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const upload = require('../middleware/upload');

// ========================================
// STUDENT ROUTES (No role restriction)
// ========================================

// Get announcements for enrolled students
router.get('/student', protect, getStudentAnnouncements);

// Get unread announcement count
router.get('/student/unread-count', protect, getUnreadCount);

// Mark announcement as read
router.post('/:id/read', protect, markAsRead);

// ========================================
// ADMIN/TEACHER ROUTES
// ========================================

// All admin routes require authentication + admin role
router.use(protect, allowRoles('super_admin', 'center_admin'));

// Create announcement (supports multipart/form-data with thumbnail & pdf)
router.post('/', upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), createAnnouncement);

// Get all announcements
router.get('/', getAllAnnouncements);

// Get single announcement
router.get('/:id', getAnnouncementById);

// Update announcement (supports multipart/form-data)
router.put('/:id', upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), updateAnnouncement);

// Delete announcement permanently
router.delete('/:id', deleteAnnouncement);

module.exports = router;
```

### `routes/authRoutes.js`

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
const { validate, validations } = require('../middleware/validation');

router.post('/login-super-admin', loginSuperAdmin);
router.post('/login', login);
router.post('/send-otp', ...sendOtp);
router.post('/verify-otp', ...verifyOtp);
router.post('/student-signup', validate(validations.studentSignup), studentSignup);
router.post('/verify-student-signup', validate(validations.verifyStudentSignup), verifyStudentSignup);
router.post('/parent-login-request', validate(validations.parentLoginRequest), parentLoginRequest);

module.exports = router;
```

### `routes/blogRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createBlog,
  getBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  getFiltersByLanguage,
  getFiltersByPaper,
  getBlogFilterOptions
} = require('../controllers/blogController');

const {
  createLanguage,
  getLanguages,
  updateLanguage,
  deleteLanguage
} = require('../controllers/languageController');

const {
  createPaper,
  getPapers,
  updatePaper,
  deletePaper
} = require('../controllers/paperController');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// ==============================
// LANGUAGE ROUTES
// ==============================
router.route('/languages')
  .get(getLanguages)
  .post(protect, authorize('super_admin'), createLanguage);

router.route('/languages/:id')
  .put(protect, authorize('super_admin'), updateLanguage)
  .delete(protect, authorize('super_admin'), deleteLanguage);

// ==============================
// PAPER ROUTES
// ==============================
router.route('/papers')
  .get(getPapers)
  .post(protect, authorize('super_admin'), createPaper);

router.route('/papers/:id')
  .put(protect, authorize('super_admin'), updatePaper)
  .delete(protect, authorize('super_admin'), deletePaper);

// ==============================
// BLOG ROUTES
// ==============================

// Public routes
router.get('/blogs', getBlogs);
router.get('/blogs/filter-options', getBlogFilterOptions);
router.get('/blogs/filters/language', getFiltersByLanguage);
router.get('/blogs/filters/paper', getFiltersByPaper);
router.get('/blogs/:id', getBlogById);

// Protected routes (Admin only)
router.post(
  '/blogs',
  protect,
  authorize('super_admin'),
  upload.fields([
    { name: 'thumbnail' },
    { name: 'images', maxCount: 20 }
  ]),
  createBlog
);

router.put(
  '/blogs/:id',
  protect,
  authorize('super_admin'),
  upload.fields([
    { name: 'thumbnail' },
    { name: 'images', maxCount: 20 }
  ]),
  updateBlog
);

router.delete(
  '/blogs/:id',
  protect,
  authorize('super_admin'),
  deleteBlog
);

module.exports = router;
```

### `routes/bookOverviewRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  getAllOverviews,
  getOverview,
  createOverview,
  updateOverview,
  deleteOverview
} = require('../controllers/bookOverviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getAllOverviews);
router.get('/:id', getOverview);

// Admin routes
router.post('/', protect, authorize('super_admin', 'admin'), upload.single('video'), createOverview);
router.put('/:id', protect, authorize('super_admin', 'admin'), upload.single('video'), updateOverview);
router.delete('/:id', protect, authorize('super_admin', 'admin'), deleteOverview);

module.exports = router;
```

### `routes/bookRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const {
  createBook,
  getBooks,
  getBook,
  getSampleBooks,
  updateBook,
  deleteBook
} = require('../controllers/bookController');
const { protect, authorize } = require('../middleware/authMiddleware');
const blogUpload = require('../middleware/blogUpload');

// Public routes
router.get('/', getBooks);
router.get('/sample', getSampleBooks);
router.get('/:id', getBook);

// Admin routes
router.post(
  '/',
  protect,
  authorize('super_admin', 'admin'),
  blogUpload.fields([{ name: 'image', maxCount: 1 }]),
  createBook
);

router.put(
  '/:id',
  protect,
  authorize('super_admin', 'admin'),
  blogUpload.fields([{ name: 'image', maxCount: 1 }]),
  updateBook
);

router.delete('/:id', protect, authorize('super_admin', 'admin'), deleteBook);

module.exports = router;
```

### `routes/bookTopperRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  getAllToppers,
  getTopper,
  createTopper,
  updateTopper,
  deleteTopper
} = require('../controllers/bookTopperController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getAllToppers);
router.get('/:id', getTopper);

// Admin routes
router.post('/', protect, authorize('super_admin', 'admin'), upload.single('video'), createTopper);
router.put('/:id', protect, authorize('super_admin', 'admin'), upload.single('video'), updateTopper);
router.delete('/:id', protect, authorize('super_admin', 'admin'), deleteTopper);

module.exports = router;
```

### `routes/cartRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  addToCart,
  getCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  getCartTotal,
  checkItemInCart,
  applyCoupon,
  removeCoupon
} = require('../controllers/cartController');

// ==========================================
// CART ROUTES (All require authentication)
// ==========================================

// Add item to cart (Course or Book)
router.post('/add', protect, addToCart);

// Get user's cart with all items
router.get('/', protect, getCart);

// Remove item from cart
router.delete('/remove/:itemId', protect, removeFromCart);

// Update item quantity in cart (only for books)
router.put('/update-quantity/:itemId', protect, updateQuantity);

// Clear entire cart
router.delete('/clear', protect, clearCart);

// Get cart total (price summary)
router.get('/total', protect, getCartTotal);

// Check if item is already in cart
router.get('/check/:itemType/:itemId', protect, checkItemInCart);

// Apply coupon to cart
router.post('/apply-coupon', protect, applyCoupon);

// Remove coupon from cart
router.delete('/remove-coupon', protect, removeCoupon);

module.exports = router;
```

### `routes/centerDataRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const { validate, validations } = require('../middleware/validation');
const {
  createCenter,
  getAllCenters,
  getCenterCompleteData,
  updateCenter,
  deleteCenter,
  updateGallery,
  deleteGalleryImage,
  createSuccessStory,
  updateSuccessStory,
  deleteSuccessStory,
  createFaculty,
  updateFaculty,
  deleteFaculty
} = require('../controllers/centerDataController');

// ==========================================
// PUBLIC ROUTES (No authentication needed)
// ==========================================

// Get all centers (list view)
router.get('/', getAllCenters);

// Get complete center data
router.get('/:id', getCenterCompleteData);

// ==========================================
// PROTECTED ROUTES (Authentication required)
// ==========================================

router.use(protect);

// ==========================================
// CENTER CRUD
// ==========================================

// Create center data - Super Admin only
router.post(
  '/',
  allowRoles('super_admin'),
  upload.fields([{ name: 'thumbnail', maxCount: 1 }]),
  validate(validations.createCenter),
  createCenter
);

// Update center data - Super Admin only
router.put(
  '/:id',
  allowRoles('super_admin'),
  upload.fields([{ name: 'thumbnail', maxCount: 1 }]),
  validate(validations.updateCenter),
  updateCenter
);

// Delete center data - Super Admin only
router.delete(
  '/:id',
  allowRoles('super_admin'),
  deleteCenter
);

// ==========================================
// GALLERY CRUD
// ==========================================

// Update gallery - Super Admin & Center Admin
router.post(
  '/:id/gallery',
  allowRoles('super_admin', 'center_admin'),
  upload.fields([{ name: 'images', maxCount: 6 }]),
  updateGallery
);

// Delete single gallery image
router.delete(
  '/:id/gallery/:imageId',
  allowRoles('super_admin', 'center_admin'),
  deleteGalleryImage
);

// ==========================================
// SUCCESS STORIES CRUD
// ==========================================

// Create success story
router.post(
  '/:id/success-stories',
  allowRoles('super_admin', 'center_admin', 'employee'),
  upload.fields([{ name: 'thumbnail', maxCount: 1 }]),
  validate(validations.createSuccessStory),
  createSuccessStory
);

// Update success story
router.put(
  '/:id/success-stories/:storyId',
  allowRoles('super_admin', 'center_admin', 'employee'),
  upload.fields([{ name: 'thumbnail', maxCount: 1 }]),
  validate(validations.updateSuccessStory),
  updateSuccessStory
);

// Delete success story
router.delete(
  '/:id/success-stories/:storyId',
  allowRoles('super_admin', 'center_admin', 'employee'),
  deleteSuccessStory
);

// ==========================================
// FACULTY CRUD
// ==========================================

// Create faculty
router.post(
  '/:id/faculty',
  allowRoles('super_admin', 'center_admin', 'employee'),
  upload.fields([{ name: 'image', maxCount: 1 }]),
  validate(validations.createFaculty),
  createFaculty
);

// Update faculty
router.put(
  '/:id/faculty/:facultyId',
  allowRoles('super_admin', 'center_admin', 'employee'),
  upload.fields([{ name: 'image', maxCount: 1 }]),
  validate(validations.updateFaculty),
  updateFaculty
);

// Delete faculty
router.delete(
  '/:id/faculty/:facultyId',
  allowRoles('super_admin', 'center_admin', 'employee'),
  deleteFaculty
);

module.exports = router;
```

### `routes/centerEnquiryRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const {
  getCenterEnquiries,
  getEnquiryById,
  getEnquiryStats
} = require('../controllers/enquiryController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles, ROLES } = require('../middleware/roleMiddleware');

// Protect all routes
router.use(protect);

// ==========================================
// CENTER ROUTES (Center Admin & Employee)
// ==========================================

// Get enquiries for their center only
router.get('/', allowRoles(ROLES.CENTER_ADMIN, ROLES.EMPLOYEE), getCenterEnquiries);

// Get single enquiry
router.get('/:id', allowRoles(ROLES.CENTER_ADMIN, ROLES.EMPLOYEE), getEnquiryById);

// Get statistics for their center
router.get('/stats/summary', allowRoles(ROLES.CENTER_ADMIN, ROLES.EMPLOYEE), getEnquiryStats);

module.exports = router;
```

### `routes/couponRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
   applyCoupon,
   createCoupon,
   getCoupons,
   getCouponById,
   updateCoupon,
   deleteCoupon,
   getCouponUsages,
   getPublicCoupons
} = require('../controllers/couponController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Configure multer for memory storage
const upload = multer({
   storage: multer.memoryStorage(),
   limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
   }
});

// ==========================================
// PUBLIC/USER ROUTES (No Auth Required)
// ==========================================
router.post('/apply', protect, applyCoupon);

// Public endpoint - List active coupons (no auth required)
router.get('/', getPublicCoupons);

// ==========================================
// ADMIN ROUTES (Auth Required)
// ==========================================
router.post(
   '/admin',
   protect,
   authorize('super_admin', 'admin'),
   upload.fields([{ name: 'backgroundImage', maxCount: 1 }]),
   createCoupon
);

router.get(
   '/admin',
   protect,
   authorize('super_admin', 'admin'),
   getCoupons
);

router.get(
   '/admin/:id',
   protect,
   authorize('super_admin', 'admin'),
   getCouponById
);

router.put(
   '/admin/:id',
   protect,
   authorize('super_admin', 'admin'),
   upload.fields([{ name: 'backgroundImage', maxCount: 1 }]),
   updateCoupon
);

router.delete(
   '/admin/:id',
   protect,
   authorize('super_admin', 'admin'),
   deleteCoupon
);

router.get(
   '/admin/:id/usages',
   protect,
   authorize('super_admin', 'admin'),
   getCouponUsages
);

module.exports = router;
```

### `routes/enquiryRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const {
  createEnquiry
} = require('../controllers/enquiryController');

// ==========================================
// PUBLIC ROUTES (No authentication needed)
// ==========================================

// Create enquiry (Book Demo)
router.post('/', createEnquiry);

module.exports = router;
```

### `routes/featuredArticleRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const {
  createFeaturedArticle,
  getFeaturedArticles,
  getFeaturedArticle,
  updateFeaturedArticle,
  deleteFeaturedArticle
} = require('../controllers/featuredArticleController');
const { protect, authorize } = require('../middleware/authMiddleware');
const blogUpload = require('../middleware/blogUpload');

// Get all featured articles (Public)
router.get('/', getFeaturedArticles);

// Get single featured article (Public)
router.get('/:id', getFeaturedArticle);

// Create featured article with image upload (Super Admin & Admin only)
router.post(
  '/',
  protect,
  authorize('super_admin', 'admin'),
  blogUpload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'secondaryImage', maxCount: 1 }
  ]),
  createFeaturedArticle
);

// Update featured article with image upload (Super Admin & Admin only)
router.put(
  '/:id',
  protect,
  authorize('super_admin', 'admin'),
  blogUpload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'secondaryImage', maxCount: 1 }
  ]),
  updateFeaturedArticle
);

// Delete featured article - Soft delete (Super Admin & Admin only)
router.delete('/:id', protect, authorize('super_admin', 'admin'), deleteFeaturedArticle);

module.exports = router;
```

### `routes/fixCouponRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const { protect, authorize } = require('../middleware/authMiddleware');

// @desc    Hard delete coupon by code (for fixing duplicate issues)
// @route   DELETE /api/coupons/fix-duplicate/:code
// @access  Private/Admin
router.delete('/fix-duplicate/:code', protect, authorize('admin'), async (req, res) => {
   try {
      const couponCode = req.params.code.toUpperCase();
      
      console.log('🔍 Searching for coupons with code:', couponCode);
      
      // Find ALL coupons with this code
      const coupons = await Coupon.find({ couponCode });
      
      if (coupons.length === 0) {
         return res.json({
            success: true,
            message: `No coupons found with code: ${couponCode}`,
            deletedCount: 0
         });
      }
      
      console.log(`📋 Found ${coupons.length} coupon(s)`);
      
      // Hard delete all
      const result = await Coupon.deleteMany({ couponCode });
      
      console.log(`✅ Deleted ${result.deletedCount} coupon(s)`);
      
      res.json({
         success: true,
         message: `Successfully deleted ${result.deletedCount} coupon(s)`,
         deletedCount: result.deletedCount,
         deletedCoupons: coupons.map(c => ({
            id: c._id,
            name: c.couponName,
            code: c.couponCode,
            isDeleted: c.isDeleted
         }))
      });
      
   } catch (error) {
      console.error('Error deleting coupon:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to delete coupon',
         error: error.message
      });
   }
});

module.exports = router;
```

### `routes/homePageRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  saveHomePage,
  getHomePage,
  deleteSection
} = require('../controllers/homePageController');

const {
  createSection4,
  getSection4,
  updateSection4,
  deleteSection4,
  reorderSection4
} = require('../controllers/homeSection4Controller');

const {
  addVideo,
  getVideos,
  updateVideo,
  deleteVideo
} = require('../controllers/homeVideoController');

const {
  createTopper,
  getToppers,
  updateTopper,
  deleteTopper
} = require('../controllers/homeTopperController');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// ==========================================
// HOME PAGE ROUTES
// ==========================================
router.get('/', getHomePage);
router.post(
  '/',
  protect,
  authorize('super_admin'),
  upload.any(),
  saveHomePage
);
router.delete(
  '/section/:sectionName',
  protect,
  authorize('super_admin'),
  deleteSection
);

// ==========================================
// TOPPERS ROUTES (Section 3)
// ==========================================
router.route('/toppers')
  .get(getToppers)
  .post(protect, authorize('super_admin'), upload.any(), createTopper);

router.route('/toppers/:id')
  .put(protect, authorize('super_admin'), upload.any(), updateTopper)
  .delete(protect, authorize('super_admin'), deleteTopper);

// ==========================================
// SECTION 2 ROUTES (Learning Programs)
// ==========================================
router.route('/section2')
  .get(getSection4)
  .post(protect, authorize('super_admin'), upload.any(), createSection4);

// Reorder route (must be before /:id route)
router.put(
  '/section2/reorder',
  protect,
  authorize('super_admin'),
  reorderSection4
);

router.route('/section2/:id')
  .put(protect, authorize('super_admin'), upload.any(), updateSection4)
  .delete(protect, authorize('super_admin'), deleteSection4);

// ==========================================
// HOME VIDEO ROUTES (Section 7)
// ==========================================
router.route('/videos')
  .get(getVideos)
  .post(protect, authorize('super_admin'), upload.any(), addVideo);

router.route('/videos/:id')
  .put(protect, authorize('super_admin'), upload.any(), updateVideo)
  .delete(protect, authorize('super_admin'), deleteVideo);

module.exports = router;
```

### `routes/homeVideoRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const {
  addVideo,
  getVideos,
  updateVideo,
  deleteVideo
} = require('../controllers/homeVideoController');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Public route
router.get('/', getVideos);

// Protected routes (Super Admin only)
router.post(
  '/',
  protect,
  allowRoles('super_admin'),
  upload.any(), // Accept FormData
  addVideo
);

router.put(
  '/:id',
  protect,
  allowRoles('super_admin'),
  upload.any(), // Accept FormData
  updateVideo
);

router.delete(
  '/:id',
  protect,
  allowRoles('super_admin'),
  deleteVideo
);

module.exports = router;
```

### `routes/liveClassRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const {
   createLiveClass,
   getAllLiveClasses,
   getLiveClassById,
   updateLiveClass,
   cancelClass,
   getTodayClasses,
   getUpcomingClasses,
   joinClass,
   teacherJoin,
   startClass,
   updateClassStatus,
   getStats
} = require('../controllers/liveClassController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const upload = require('../middleware/upload');

// ========================================
// STUDENT ROUTES (No role restriction)
// ========================================

// Get today's live classes
router.get('/today', protect, getTodayClasses);

// Get upcoming live classes
router.get('/upcoming', protect, getUpcomingClasses);

// Join live class (student) - MUST be before admin router.use()
router.get('/:id/join', protect, joinClass);

// ========================================
// ADMIN/TEACHER ROUTES
// ========================================

// All admin routes require authentication + admin role
router.use(protect, allowRoles('super_admin', 'center_admin'));

// Create live class (supports multipart/form-data with thumbnail)
router.post('/', upload.single('thumbnail'), createLiveClass);

// Get all live classes
router.get('/', getAllLiveClasses);

// Get statistics
router.get('/stats', getStats);

// SPECIFIC routes MUST come before GENERIC /:id routes
// Teacher join
router.get('/:id/teacher-join', teacherJoin);

// Start live class
router.put('/:id/start', startClass);

// Cancel live class
router.put('/:id/cancel', cancelClass);

// Update class status
router.put('/:id/status', updateClassStatus);

// GENERIC route - must be last
router.get('/:id', getLiveClassById);

// Update live class
router.put('/:id', updateLiveClass);

module.exports = router;
```

### `routes/orderRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const {
   getMyOrders,
   getOrderDetails,
   getAllOrders,
   updateOrderStatus,
   getOrderStats
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(protect);

// ========================================
// STUDENT ORDER ROUTES
// ========================================

// Get my orders (with optional filters)
router.get('/my-orders', getMyOrders);

// Get single order details
router.get('/:id', getOrderDetails);

// ========================================
// ADMIN ORDER ROUTES
// ========================================

// Get all orders (Admin only)
router.get('/', allowRoles('super_admin', 'center_admin'), getAllOrders);

// Get order statistics (Admin only)
router.get('/stats', allowRoles('super_admin', 'center_admin'), getOrderStats);

// Update order status (Admin only) - For BOOK orders
router.put('/:id/status', allowRoles('super_admin', 'center_admin'), updateOrderStatus);

module.exports = router;
```

### `routes/publicRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const Center = require('../models/Center');
const Category = require('../models/Category');

// ==========================================
// PUBLIC ROUTES (No authentication needed)
// ==========================================

// Get all centers
router.get('/centers', async (req, res) => {
  try {
    const centers = await Center.find({})
      .sort({ name: 1 })
      .select('name');
    
    res.json({
      success: true,
      count: centers.length,
      centers
    });
  } catch (error) {
    console.error('Get Centers Error:', error);
    res.status(500).json({
      message: 'Error fetching centers',
      error: error.message
    });
  }
});

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({})
      .sort({ name: 1 })
      .select('name categoryType');
    
    res.json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    console.error('Get Categories Error:', error);
    res.status(500).json({
      message: 'Error fetching categories',
      error: error.message
    });
  }
});

module.exports = router;
```

### `routes/topStoryRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const {
  createTopStory,
  getTopStories,
  getTopStory,
  updateTopStory,
  deleteTopStory
} = require('../controllers/topStoryController');
const { protect, authorize } = require('../middleware/authMiddleware');
const blogUpload = require('../middleware/blogUpload');

// Get all top stories (Public)
router.get('/', getTopStories);

// Get single top story (Public)
router.get('/:id', getTopStory);

// Create top story with image upload (Super Admin & Admin only)
router.post(
  '/',
  protect,
  authorize('super_admin', 'admin'),
  blogUpload.fields([
    { name: 'thumbnail', maxCount: 1 }
  ]),
  createTopStory
);

// Update top story with image upload (Super Admin & Admin only)
router.put(
  '/:id',
  protect,
  authorize('super_admin', 'admin'),
  blogUpload.fields([
    { name: 'thumbnail', maxCount: 1 }
  ]),
  updateTopStory
);

// Delete top story - Soft delete (Super Admin & Admin only)
router.delete('/:id', protect, authorize('super_admin', 'admin'), deleteTopStory);

module.exports = router;
```

### `routes/userRoutes.js`

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

// All user routes require authentication
router.use(protect);

router.get('/profile', getProfile);
router.get('/student-details', getStudentDetails);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.put('/update-parent-details', updateParentDetails);

module.exports = router;
```



