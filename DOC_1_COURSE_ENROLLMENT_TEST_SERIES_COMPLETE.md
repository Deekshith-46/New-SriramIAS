# Course, Enrollment, Payments & Test Series

> **Project:** Sriram-IAS Backend  
> **Volume:** `DOC_1_COURSE_ENROLLMENT_TEST_SERIES_COMPLETE.md`  
> **Files:** 21  
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

Course catalog, Razorpay enrollment, course subjects, and **Test Series** (`TestExam` / `TestResult`).

---

## 2. Files in this volume

- `controllers/courseController.js`
- `controllers/courseSubjectController.js`
- `controllers/enrollmentController.js`
- `controllers/paymentController.js`
- `controllers/testExamController.js`
- `controllers/testResultController.js`
- `models/Category.js`
- `models/Course.js`
- `models/CourseSubject.js`
- `models/Enrollment.js`
- `models/InstallmentPlan.js`
- `models/PaymentIntent.js`
- `models/TestExam.js`
- `models/TestResult.js`
- `models/Transaction.js`
- `routes/courseRoutes.js`
- `routes/courseSubjectRoutes.js`
- `routes/enrollmentRoutes.js`
- `routes/paymentRoutes.js`
- `routes/testExamRoutes.js`
- `routes/testResultRoutes.js`

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

### `controllers/courseController.js`

```javascript
const Course = require('../models/Course');
const Center = require('../models/Center');
const Category = require('../models/Category');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const cloudinary = require('../config/cloudinary');

// Helper function to delete old image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
    }
  }
};

// @desc    Create new course
// @route   POST /api/admin/course
// @access  Private (Super Admin, Center Admin)
exports.createCourse = async (req, res) => {
  try {
    const user = req.user;
    const {
      title,
      center,
      category,
      description,
      startDate,
      duration,
      batchStartDate,
      batchEndDate,
      accessValidityInDays,
      recordedContentValidityInDays,
      onlineActualPrice,
      onlineDiscountPercent,
      onlineOfferText,
      offlineActualPrice,
      offlineDiscountPercent,
      offlineOfferText,
      feesDescription,
      modes,
      keyHighlights,
      whyChoose,
      howItHelps
    } = req.body;

    // Validate required fields
    if (!title || !center || !category) {
      return res.status(400).json({ 
        message: 'Required fields missing: title, center, and category are required' 
      });
    }

    // Parse startDate if provided (handle both dates and text like "Admission open soon")
    let parsedStartDate = null;
    if (startDate) {
      // Try to parse as date first
      const dateObj = new Date(startDate);
      
      // If it's a valid date, store it
      if (!isNaN(dateObj.getTime())) {
        parsedStartDate = dateObj;
      } else {
        // If it's not a valid date, treat it as text (e.g., "Admission open soon")
        // Store as string in a separate field
        parsedStartDate = startDate; // Will be stored as string
      }
    }

    // Validate center exists
    const centerDoc = await Center.findById(center);
    
    if (!centerDoc) {
      return res.status(404).json({ message: 'Center not found' });
    }

    // Role-based access check with center admin validation
    if (user.role === 'center_admin') {
      // Check if user is actually the admin of this center
      if (!centerDoc.centerAdmin || !centerDoc.centerAdmin.equals(user._id)) {
        return res.status(403).json({ 
          message: 'Access denied. You are not the admin of this center.' 
        });
      }
    }

    // Validate banner image
    const files = req.files;
    
    if (!files || !files.banner) {
      return res.status(400).json({ message: 'Banner image is required' });
    }

    // Upload all files in PARALLEL for faster processing
    const uploadPromises = [];

    // Upload banner image (required)
    uploadPromises.push(
      uploadToCloudinary(files.banner[0], 'courses/banners')
        .then(result => ({ type: 'banner', result }))
    );

    // Upload highlight image (optional)
    if (files.highlight) {
      uploadPromises.push(
        uploadToCloudinary(files.highlight[0], 'courses/highlights')
          .then(result => ({ type: 'highlight', result }))
      );
    }

    // Upload section image (optional)
    if (files.section) {
      uploadPromises.push(
        uploadToCloudinary(files.section[0], 'courses/sections')
          .then(result => ({ type: 'section', result }))
      );
    }

    // Upload gallery images (optional)
    if (files.gallery) {
      files.gallery.forEach((file, index) => {
        uploadPromises.push(
          uploadToCloudinary(file, 'courses/gallery')
            .then(result => ({ type: 'gallery', index, result }))
        );
      });
    }

    // Upload promo video (optional)
    if (files.video) {
      uploadPromises.push(
        uploadToCloudinary(files.video[0], 'courses/videos')
          .then(result => ({ type: 'video', result }))
      );
    }

    // Upload brochure PDF (optional)
    if (files.brochure) {
      uploadPromises.push(
        uploadToCloudinary(files.brochure[0], 'courses/brochures', 'raw', 'pdf')
          .then(result => ({ type: 'brochure', result }))
      );
    }

    // Wait for all uploads to complete in parallel
    const uploadResults = await Promise.all(uploadPromises);

    // Process upload results
    let bannerImage = null;
    let highlightImage = null;
    let sectionImage = null;
    let galleryImages = [];
    let promoVideo = null;
    let brochure = null;

    for (const upload of uploadResults) {
      switch (upload.type) {
        case 'banner':
          bannerImage = { url: upload.result.url, public_id: upload.result.public_id };
          break;
        case 'highlight':
          highlightImage = { url: upload.result.url, public_id: upload.result.public_id };
          break;
        case 'section':
          sectionImage = { url: upload.result.url, public_id: upload.result.public_id };
          break;
        case 'gallery':
          galleryImages.push({ url: upload.result.url, public_id: upload.result.public_id });
          break;
        case 'video':
          promoVideo = { url: upload.result.url, public_id: upload.result.public_id };
          break;
        case 'brochure':
          brochure = { url: upload.result.url, public_id: upload.result.public_id };
          break;
      }
    }

    // Parse content sections with safe parsing
    console.log('🔍 RAW req.body.keyHighlights:', req.body.keyHighlights);
    console.log('🔍 Type:', typeof req.body.keyHighlights);
    
    let parsedKeyHighlights = {};
    if (req.body.keyHighlights) {
      try {
        parsedKeyHighlights = typeof req.body.keyHighlights === 'string' 
          ? JSON.parse(req.body.keyHighlights) 
          : req.body.keyHighlights;
        console.log('✅ Parsed keyHighlights:', parsedKeyHighlights);
      } catch (err) {
        console.error('❌ keyHighlights parse error:', err);
        console.error('❌ Raw value that failed:', req.body.keyHighlights);
      }
    } else {
      console.warn('⚠️  keyHighlights not found in req.body');
      console.log('📋 Available fields in req.body:', Object.keys(req.body));
    }

    let parsedWhyChoose = {};
    if (req.body.whyChoose) {
      try {
        parsedWhyChoose = typeof req.body.whyChoose === 'string' 
          ? JSON.parse(req.body.whyChoose) 
          : req.body.whyChoose;
      } catch (err) {
        console.error('❌ whyChoose parse error:', err);
      }
    }

    let parsedHowItHelps = {};
    if (req.body.howItHelps) {
      console.log('RAW howItHelps:', req.body.howItHelps);
      try {
        parsedHowItHelps = typeof req.body.howItHelps === 'string' 
          ? JSON.parse(req.body.howItHelps) 
          : req.body.howItHelps;
        console.log('PARSED howItHelps:', parsedHowItHelps);
      } catch (err) {
        console.error('❌ howItHelps parse error:', err);
      }
    }

    // Parse extra fields (category-specific data)
    let parsedExtraFields = {};
    if (req.body.extraFields) {
      try {
        parsedExtraFields = typeof req.body.extraFields === 'string'
          ? JSON.parse(req.body.extraFields)
          : req.body.extraFields;
      } catch (err) {
        console.error('❌ extraFields parse error:', err);
      }
    }

    // Calculate online fees
    const onlineActual = parseFloat(onlineActualPrice) || 0;
    const onlineDiscount = parseFloat(onlineDiscountPercent) || 0;
    const onlineHasDiscount = onlineDiscount > 0;
    const onlineDiscountedPrice = onlineHasDiscount
      ? onlineActual - (onlineActual * onlineDiscount) / 100
      : onlineActual;

    // Calculate offline fees
    const offlineActual = parseFloat(offlineActualPrice) || 0;
    const offlineDiscount = parseFloat(offlineDiscountPercent) || 0;
    const offlineHasDiscount = offlineDiscount > 0;
    const offlineDiscountedPrice = offlineHasDiscount
      ? offlineActual - (offlineActual * offlineDiscount) / 100
      : offlineActual;



    // Create course
    const course = await Course.create({
      title,
      center,
      category,
      description,
      startDate: parsedStartDate,
      duration,
      batchStartDate: batchStartDate ? new Date(batchStartDate) : null,
      batchEndDate: batchEndDate ? new Date(batchEndDate) : null,
      accessValidityInDays: accessValidityInDays ? parseInt(accessValidityInDays) : null,
      recordedContentValidityInDays: recordedContentValidityInDays ? parseInt(recordedContentValidityInDays) : null,
      fees: {
        online: {
          actualPrice: onlineActual,
          discountPercent: onlineDiscount,
          discountedPrice: Math.round(onlineDiscountedPrice),
          hasDiscount: onlineHasDiscount,
          offerText: onlineOfferText || ''
        },
        offline: {
          actualPrice: offlineActual,
          discountPercent: offlineDiscount,
          discountedPrice: Math.round(offlineDiscountedPrice),
          hasDiscount: offlineHasDiscount,
          offerText: offlineOfferText || ''
        },
        description: feesDescription || ''
      },
      modes: modes ? (typeof modes === 'string' ? JSON.parse(modes) : modes) : ['online', 'offline'],
      bannerImage: { url: bannerImage.url, public_id: bannerImage.public_id },
      highlightImage: highlightImage ? { url: highlightImage.url, public_id: highlightImage.public_id } : null,
      sectionImage: sectionImage ? { url: sectionImage.url, public_id: sectionImage.public_id } : null,
      galleryImages,
      promoVideo,
      brochure,
      keyHighlights: parsedKeyHighlights,
      whyChoose: parsedWhyChoose,
      howItHelps: parsedHowItHelps,
      extraFields: parsedExtraFields,
      createdBy: user._id
    });

    // Populate center and category before returning
    const populatedCourse = await Course.findById(course._id)
      .populate('center', 'name')
      .populate('category', 'name');

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course: populatedCourse
    });

  } catch (error) {
    console.error('Create Course Error:', error);
    res.status(500).json({ 
      message: 'Error creating course', 
      error: error.message 
    });
  }
};

// @desc    Get all courses (with filters)
// @route   GET /api/courses
// @access  Public
exports.getCourses = async (req, res) => {
  try {
    const { center, category, isActive, isFeatured, centerName, categoryName, page = 1, limit } = req.query;

    // Build filter
    const filter = {};
    
    // Support both ID-based and name-based filtering
    if (center) filter.center = center;
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isFeatured) filter.isFeatured = true;

    // Name-based center filter (optional)
    if (centerName) {
      const centers = await Center.find({ name: new RegExp(centerName, 'i') });
      if (centers.length > 0) {
        filter.center = { $in: centers.map(c => c._id) };
      } else {
        // No matching centers - return empty
        return res.json({
          success: true,
          count: 0,
          courses: [],
          message: `No courses found for center: ${centerName}`
        });
      }
    }

    // Name-based category filter (optional)
    if (categoryName && categoryName !== 'All') {
      const categories = await Category.find({ name: new RegExp(categoryName, 'i') });
      if (categories.length > 0) {
        filter.category = { $in: categories.map(c => c._id) };
      } else {
        // No matching categories - return empty
        return res.json({
          success: true,
          count: 0,
          courses: [],
          message: `No courses found for category: ${categoryName}`
        });
      }
    }
    // If categoryName is "All" or not provided, skip category filter

    // Get total count first
    const total = await Course.countDocuments(filter);
    
    // If limit is 'all' or not provided, return all courses
    let courses;
    if (limit === 'all' || limit === undefined) {
      courses = await Course.find(filter)
        .populate('center', 'name')
        .populate('category', 'name')
        .sort({ createdAt: -1 });
    } else {
      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      courses = await Course.find(filter)
        .populate('center', 'name')
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    res.json({
      success: true,
      count: courses.length,
      total,
      page: limit === 'all' || limit === undefined ? 1 : parseInt(page),
      pages: limit === 'all' || limit === undefined ? 1 : Math.ceil(total / parseInt(limit)),
      courses
    });

  } catch (error) {
    console.error('Get Courses Error:', error);
    res.status(500).json({ 
      message: 'Error fetching courses', 
      error: error.message 
    });
  }
};

// @desc    Get course titles only (for enquiry forms)
// @route   GET /api/courses/enquiry
// @access  Public
exports.getCoursesForEnquiry = async (req, res) => {
  try {
    const { centerName, categoryName } = req.query;

    // Build filter
    const filter = { isActive: true };

    // Name-based center filter
    if (centerName) {
      const centers = await Center.find({ name: new RegExp(centerName, 'i') });
      if (centers.length > 0) {
        filter.center = { $in: centers.map(c => c._id) };
      } else {
        // No matching centers - return empty
        return res.json({
          success: true,
          count: 0,
          courses: [],
          message: `No courses found for center: ${centerName}`
        });
      }
    }

    // Name-based category filter
    if (categoryName && categoryName !== 'All') {
      const categories = await Category.find({ name: new RegExp(categoryName, 'i') });
      if (categories.length > 0) {
        filter.category = { $in: categories.map(c => c._id) };
      } else {
        // No matching categories - return empty
        return res.json({
          success: true,
          count: 0,
          courses: [],
          message: `No courses found for category: ${categoryName}`
        });
      }
    }

    // Get only title and _id fields
    const courses = await Course.find(filter)
      .select('_id title')
      .sort({ title: 1 });

    res.json({
      success: true,
      count: courses.length,
      courses
    });

  } catch (error) {
    console.error('Get Courses for Enquiry Error:', error);
    res.status(500).json({ 
      message: 'Error fetching courses for enquiry', 
      error: error.message 
    });
  }
};

// @desc    Get single course by ID
// @route   POST /api/courses/find
// @access  Public
exports.getCourseById = async (req, res) => {
  try {
    const courseId = req.params.id || req.body.id;

    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }

    const course = await Course.findById(courseId)
      .populate('center', 'name')
      .populate('category', 'name');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({
      success: true,
      course
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching course',
      error: error.message
    });
  }
};

// @desc    Get single course by slug
// @route   GET /api/courses/slug/:slug
// @access  Public
exports.getCourseBySlug = async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug })
      .populate('center', 'name')
      .populate('category', 'name');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({
      success: true,
      course
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching course', 
      error: error.message 
    });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Super Admin, Center Admin)
exports.updateCourse = async (req, res) => {
  try {
    const user = req.user;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check access with proper center admin validation
    if (user.role === 'center_admin') {
      const centerDoc = await Center.findById(course.center);
      
      if (!centerDoc || !centerDoc.centerAdmin || !centerDoc.centerAdmin.equals(user._id)) {
        return res.status(403).json({ 
          message: 'Access denied. You can only edit courses for your center.' 
        });
      }
    }

    // ==============================
    // ✅ BUILD DYNAMIC UPDATE OBJECT
    // ==============================
    const updates = {};

    // 🟢 Basic fields
    if (req.body.title) updates.title = req.body.title;
    if (req.body.description) updates.description = req.body.description;
    if (req.body.duration) updates.duration = req.body.duration;
    if (req.body.startDate) {
      // Handle both dates and text like "Admission open soon"
      const dateObj = new Date(req.body.startDate);
      if (!isNaN(dateObj.getTime())) {
        updates.startDate = dateObj;
      } else {
        updates.startDate = req.body.startDate; // Store as text
      }
    }

    // 🟢 NEW: Batch scheduling fields
    if (req.body.batchStartDate) updates.batchStartDate = new Date(req.body.batchStartDate);
    if (req.body.batchEndDate) updates.batchEndDate = new Date(req.body.batchEndDate);

    // 🟢 NEW: Access validity fields
    if (req.body.accessValidityInDays) updates.accessValidityInDays = parseInt(req.body.accessValidityInDays);
    if (req.body.recordedContentValidityInDays) updates.recordedContentValidityInDays = parseInt(req.body.recordedContentValidityInDays);

    // 🟢 Fees with auto-calculation (IMPORTANT - nested update)
    if (req.body.onlineActualPrice !== undefined || req.body.onlineDiscountPercent !== undefined) {
      const onlineActual = parseFloat(req.body.onlineActualPrice) || course.fees.online.actualPrice;
      const onlineDiscount = parseFloat(req.body.onlineDiscountPercent) || 0;
      const onlineHasDiscount = onlineDiscount > 0;
      const onlineDiscountedPrice = onlineHasDiscount
        ? onlineActual - (onlineActual * onlineDiscount) / 100
        : onlineActual;

      updates['fees.online.actualPrice'] = onlineActual;
      updates['fees.online.discountPercent'] = onlineDiscount;
      updates['fees.online.discountedPrice'] = Math.round(onlineDiscountedPrice);
      updates['fees.online.hasDiscount'] = onlineHasDiscount;
      updates['fees.online.offerText'] = req.body.onlineOfferText || course.fees.online.offerText;
    }

    if (req.body.offlineActualPrice !== undefined || req.body.offlineDiscountPercent !== undefined) {
      const offlineActual = parseFloat(req.body.offlineActualPrice) || course.fees.offline.actualPrice;
      const offlineDiscount = parseFloat(req.body.offlineDiscountPercent) || 0;
      const offlineHasDiscount = offlineDiscount > 0;
      const offlineDiscountedPrice = offlineHasDiscount
        ? offlineActual - (offlineActual * offlineDiscount) / 100
        : offlineActual;

      updates['fees.offline.actualPrice'] = offlineActual;
      updates['fees.offline.discountPercent'] = offlineDiscount;
      updates['fees.offline.discountedPrice'] = Math.round(offlineDiscountedPrice);
      updates['fees.offline.hasDiscount'] = offlineHasDiscount;
      updates['fees.offline.offerText'] = req.body.offlineOfferText || course.fees.offline.offerText;
    }

    if (req.body.feesDescription !== undefined) {
      updates['fees.description'] = req.body.feesDescription;
    }

    // 🟢 Modes
    if (req.body.modes) {
      updates.modes = typeof req.body.modes === 'string' 
        ? JSON.parse(req.body.modes) 
        : req.body.modes;
    }

    // ==============================
    // ✅ JSON FIELDS (SAFE PARSE)
    // ==============================

    if (req.body.keyHighlights) {
      try {
        updates.keyHighlights = typeof req.body.keyHighlights === 'string'
          ? JSON.parse(req.body.keyHighlights)
          : req.body.keyHighlights;
      } catch (err) {
        console.error('❌ keyHighlights parse error:', err);
      }
    }

    if (req.body.whyChoose) {
      try {
        updates.whyChoose = typeof req.body.whyChoose === 'string'
          ? JSON.parse(req.body.whyChoose)
          : req.body.whyChoose;
      } catch (err) {
        console.error('❌ whyChoose parse error:', err);
      }
    }

    if (req.body.howItHelps) {
      try {
        updates.howItHelps = typeof req.body.howItHelps === 'string'
          ? JSON.parse(req.body.howItHelps)
          : req.body.howItHelps;
      } catch (err) {
        console.error('❌ howItHelps parse error:', err);
      }
    }

    // 🟢 EXTRA FIELDS (dynamic category-specific data)
    if (req.body.extraFields) {
      try {
        updates.extraFields = typeof req.body.extraFields === 'string'
          ? JSON.parse(req.body.extraFields)
          : req.body.extraFields;
      } catch (err) {
        console.error('❌ extraFields parse error:', err);
      }
    }



    // ==============================
    // ✅ FILE HANDLING (ONLY IF SENT)
    // ==============================

    if (req.files) {
      const files = req.files;

      // Banner
      if (files.banner) {
        await deleteFromCloudinary(course.bannerImage?.public_id);
        const result = await uploadToCloudinary(files.banner[0], 'courses/banners');
        updates.bannerImage = {
          url: result.url,
          public_id: result.public_id
        };
      }

      // Highlight
      if (files.highlight) {
        await deleteFromCloudinary(course.highlightImage?.public_id);
        const result = await uploadToCloudinary(files.highlight[0], 'courses/highlights');
        updates.highlightImage = {
          url: result.url,
          public_id: result.public_id
        };
      }

      // Section
      if (files.section) {
        await deleteFromCloudinary(course.sectionImage?.public_id);
        const result = await uploadToCloudinary(files.section[0], 'courses/sections');
        updates.sectionImage = {
          url: result.url,
          public_id: result.public_id
        };
      }

      // Gallery
      if (files.gallery) {
        // Delete old gallery images
        if (course.galleryImages && course.galleryImages.length > 0) {
          for (let img of course.galleryImages) {
            await deleteFromCloudinary(img.public_id);
          }
        }
        // Upload new gallery images
        const galleryResults = [];
        for (let file of files.gallery) {
          const result = await uploadToCloudinary(file, 'courses/gallery');
          galleryResults.push({
            url: result.url,
            public_id: result.public_id
          });
        }
        updates.galleryImages = galleryResults;
      }

      // Promo Video
      if (files.video) {
        await deleteFromCloudinary(course.promoVideo?.public_id);
        const result = await uploadToCloudinary(files.video[0], 'courses/videos');
        updates.promoVideo = {
          url: result.url,
          public_id: result.public_id
        };
      }

      // Brochure
      if (files.brochure) {
        await deleteFromCloudinary(course.brochure?.public_id);
        const result = await uploadToCloudinary(
          files.brochure[0],
          'courses/brochures',
          'raw',
          'pdf'
        );
        updates.brochure = {
          url: result.url,
          public_id: result.public_id
        };
      }
    }

    // ==============================
    // ✅ FINAL UPDATE (ONLY PROVIDED FIELDS)
    // ==============================

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('center', 'name')
      .populate('category', 'name');

    res.json({
      success: true,
      message: 'Course updated successfully',
      course: updatedCourse
    });

  } catch (error) {
    console.error('Update Course Error:', error);
    res.status(500).json({ 
      message: 'Error updating course', 
      error: error.message 
    });
  }
};

// @desc    Delete course
// @route   DELETE /api/admin/course/:id
// @access  Private (Super Admin only)
exports.deleteCourse = async (req, res) => {
  try {
    const user = req.user;
    
    // Only Super Admin can delete
    if (user.role !== 'super_admin') {
      return res.status(403).json({ 
        message: 'Access denied. Only Super Admin can delete courses.' 
      });
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Delete all associated images/videos from Cloudinary
    await deleteFromCloudinary(course.bannerImage?.public_id);
    await deleteFromCloudinary(course.highlightImage?.public_id);
    await deleteFromCloudinary(course.sectionImage?.public_id);
    
    if (course.galleryImages && course.galleryImages.length > 0) {
      for (let img of course.galleryImages) {
        await deleteFromCloudinary(img.public_id);
      }
    }
    
    await deleteFromCloudinary(course.promoVideo?.public_id);
    await deleteFromCloudinary(course.brochure?.public_id);

    // Delete course from database
    await Course.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Error deleting course', 
      error: error.message 
    });
  }
};

// @desc    Get all courses grouped by centers and categories
// @route   GET /api/courses/grouped
// @access  Public
exports.getCoursesGrouped = async (req, res) => {
  try {
    // Get all active courses with populated center and category
    const courses = await Course.find({ isActive: true })
      .populate('center', 'name')
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    // Group courses by center -> category
    const groupedData = {};

    courses.forEach(course => {
      const centerName = course.center?.name || 'Unknown';
      const categoryName = course.category?.name || 'Unknown';

      // Initialize center if not exists
      if (!groupedData[centerName]) {
        groupedData[centerName] = {};
      }

      // Initialize category if not exists
      if (!groupedData[centerName][categoryName]) {
        groupedData[centerName][categoryName] = [];
      }

      // Add course title to category array
      groupedData[centerName][categoryName].push({
        _id: course._id,
        title: course.title,
        slug: course.slug
      });
    });

    // Convert to array format
    const result = Object.keys(groupedData).map(centerName => ({
      [centerName]: Object.keys(groupedData[centerName]).map(categoryName => ({
        [categoryName]: groupedData[centerName][categoryName]
      }))
    }));

    res.json({
      success: true,
      count: courses.length,
      data: result
    });

  } catch (error) {
    console.error('Get Grouped Courses Error:', error);
    res.status(500).json({ 
      message: 'Error fetching grouped courses', 
      error: error.message 
    });
  }
};
```

### `controllers/courseSubjectController.js`

```javascript
const CourseSubject = require('../models/CourseSubject');
const Course = require('../models/Course');
const RecordedLecture = require('../models/RecordedLecture');
const LectureProgress = require('../models/LectureProgress');
const {
  assertEnrollmentAccess,
  getCourseForAdmin
} = require('../utils/courseAccess');
const { NOT_DELETED, sanitizeLectureForStudent, withLectureTitles } = require('../utils/lectureHelpers');

const formatSubject = (subject) => {
  if (!subject) return subject;
  if (typeof subject.toObject === 'function') {
    return subject.toObject();
  }
  const { description, order, __v, ...rest } = subject;
  return rest;
};

const formatSubjects = (subjects) => subjects.map(formatSubject);

exports.createSubject = async (req, res) => {
  try {
    const { courseId, title } = req.body;

    if (!courseId || !title?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'courseId and title are required'
      });
    }

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const subject = await CourseSubject.create({
      courseId,
      title: title.trim(),
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: formatSubject(subject) });
  } catch (error) {
    console.error('Create Subject Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubjectsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const subjects = await CourseSubject.find({ courseId, isActive: true, ...NOT_DELETED })
      .sort({ order: 1, createdAt: 1 });

    res.json({ success: true, count: subjects.length, data: formatSubjects(subjects) });
  } catch (error) {
    console.error('Get Subjects Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubjectsGrouped = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const course = await Course.findById(courseId).select('title').lean();
    const courseTitle = course?.title ?? '';

    const subjects = await CourseSubject.find({ courseId, isActive: true, ...NOT_DELETED })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const subjectIds = subjects.map((s) => s._id);
    const lectures = subjectIds.length
      ? await RecordedLecture.find({
          courseId,
          subjectId: { $in: subjectIds },
          isPublished: true,
          ...NOT_DELETED
        })
          .select('subjectId lectureTitle lectureDescription thumbnail video order isPreviewFree')
          .sort({ order: 1, createdAt: 1 })
          .lean()
      : [];

    const lectureIds = lectures.map((l) => l._id);
    const progressList = lectureIds.length
      ? await LectureProgress.find({
          userId: req.user._id,
          lectureId: { $in: lectureIds }
        }).lean()
      : [];

    const progressMap = new Map(
      progressList.map((p) => [p.lectureId.toString(), p])
    );

    const lecturesBySubject = new Map();
    for (const lecture of lectures) {
      const key = lecture.subjectId.toString();
      const progress = progressMap.get(lecture._id.toString());
      const entry = {
        ...withLectureTitles(lecture, {
          courseTitle,
          subjectTitle: subjects.find((s) => s._id.toString() === key)?.title ?? ''
        }, { forStudent: true }),
        progressPercent: progress?.progressPercent ?? 0,
        isCompleted: progress?.isCompleted ?? false
      };
      if (!lecturesBySubject.has(key)) lecturesBySubject.set(key, []);
      lecturesBySubject.get(key).push(entry);
    }

    const data = subjects.map((subject) => ({
      subject: formatSubject(subject),
      lectures: lecturesBySubject.get(subject._id.toString()) || []
    }));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('Get Grouped Subjects Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubjectsByCourseAdmin = async (req, res) => {
  try {
    const { courseId } = req.params;
    const includeDeleted = req.query.includeDeleted === 'true';

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const filter = { courseId };
    if (!includeDeleted) Object.assign(filter, NOT_DELETED);

    const subjects = await CourseSubject.find(filter).sort({ order: 1, createdAt: 1 });

    res.json({ success: true, count: subjects.length, data: formatSubjects(subjects) });
  } catch (error) {
    console.error('Admin Get Subjects Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const subject = await CourseSubject.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const course = await getCourseForAdmin(req, res, subject.courseId);
    if (!course) return;

    const { title } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'title is required'
      });
    }

    subject.title = title.trim();

    await subject.save();

    res.json({ success: true, data: formatSubject(subject) });
  } catch (error) {
    console.error('Update Subject Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const subject = await CourseSubject.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const course = await getCourseForAdmin(req, res, subject.courseId);
    if (!course) return;

    const now = new Date();
    subject.isDeleted = true;
    subject.deletedAt = now;
    subject.isActive = false;
    await subject.save();

    await RecordedLecture.updateMany(
      { subjectId: subject._id, ...NOT_DELETED },
      { $set: { isDeleted: true, deletedAt: now, isPublished: false } }
    );

    res.json({
      success: true,
      message: 'Subject and its lectures soft-deleted successfully'
    });
  } catch (error) {
    console.error('Delete Subject Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.reorderSubjects = async (req, res) => {
  try {
    const { courseId, items } = req.body;

    if (!courseId || !Array.isArray(items) || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'courseId and items array are required'
      });
    }

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: item.id, courseId, ...NOT_DELETED },
        update: { $set: { order: item.order } }
      }
    }));

    await CourseSubject.bulkWrite(bulkOps);

    const subjects = await CourseSubject.find({ courseId, ...NOT_DELETED })
      .sort({ order: 1, createdAt: 1 });

    res.json({ success: true, data: formatSubjects(subjects) });
  } catch (error) {
    console.error('Reorder Subjects Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/enrollmentController.js`

```javascript
const Razorpay = require('razorpay');
const crypto   = require('crypto');
const Course          = require('../models/Course');
const Enrollment      = require('../models/Enrollment');
const Transaction     = require('../models/Transaction');
const InstallmentPlan = require('../models/InstallmentPlan');
const Coupon          = require('../models/Coupon');
const PaymentIntent   = require('../models/PaymentIntent');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ─── helpers ────────────────────────────────────────────────────────────────

async function resolveFees(course, learningMode) {
  return learningMode === 'online' ? course.fees.online : course.fees.offline;
}

async function applyCoupon(code, baseFees, userId) {
  if (!code) return { discount: 0, coupon: null };
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  if (!coupon || coupon.category !== 'COURSE') throw new Error('Invalid or inapplicable coupon');
  if (coupon.expiryDate < new Date())              throw new Error('Coupon has expired');
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new Error('Coupon usage limit reached');
  if (coupon.isNewUserOnly) {
    const existing = await Enrollment.countDocuments({ userId });
    if (existing > 0) throw new Error('This coupon is only for new students');
  }
  const discount = coupon.type === 'PERCENT'
    ? Math.round((baseFees * coupon.value) / 100)
    : coupon.value;
  return { discount, coupon };
}

function createReceiptNumber(centerName = 'SRM') {
  const prefix = centerName
    ? centerName.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() || 'SRM'
    : 'SRM';
  const now = new Date();
  return `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getTime()).slice(-6)}`;
}

function createInvoiceNumber(centerName = 'SRM') {
  const prefix = centerName
    ? centerName.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() || 'SRM'
    : 'SRM';
  const now = new Date();
  return `${prefix}-INV-${now.getFullYear()}-${String(Math.floor(Math.random() * 900000 + 100000))}`;
}

function parseDurationToDays(duration) {
  if (!duration || typeof duration !== 'string') return null;
  const normalized = duration.trim().toLowerCase();
  const match = normalized.match(/(\d+)\s*(year|years|month|months|day|days)/);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  if (unit.startsWith('year')) return value * 365;
  if (unit.startsWith('month')) return Math.round(value * 30.4375);
  if (unit.startsWith('day')) return value;
  return null;
}

function calculateAccessWindow(course, startDate = new Date()) {
  const accessStartDate = startDate;
  let accessEndDate = null;

  if (typeof course.accessValidityInDays === 'number' && course.accessValidityInDays > 0) {
    accessEndDate = new Date(accessStartDate);
    accessEndDate.setDate(accessEndDate.getDate() + course.accessValidityInDays);
  } else if (course.batchEndDate) {
    accessEndDate = new Date(course.batchEndDate);
  } else if (course.startDate && course.duration) {
    const days = parseDurationToDays(course.duration);
    if (days) {
      accessEndDate = new Date(course.startDate instanceof Date ? course.startDate : new Date(course.startDate));
      accessEndDate.setDate(accessEndDate.getDate() + days);
    }
  }

  return {
    accessStartDate,
    accessEndDate,
    expiredAt: accessEndDate ? new Date(accessEndDate) : null
  };
}

function refreshExpiredEnrollment(enrollment) {
  if (!enrollment || !enrollment.accessEndDate) return enrollment;
  if (new Date(enrollment.accessEndDate) < new Date() && enrollment.accessStatus !== 'EXPIRED') {
    enrollment.accessStatus = 'EXPIRED';
    enrollment.enrollmentStatus = enrollment.enrollmentStatus === 'ACTIVE' ? 'COMPLETED' : enrollment.enrollmentStatus;
    enrollment.courseCompletionStatus = 'COMPLETED';
    enrollment.expiredAt = enrollment.accessEndDate;
  }
  return enrollment;
}

function buildCourseSnapshot(course) {
  return {
    title: course.title,
    slug: course.slug,
    centerName: course.center?.name || '',
    fees: {
      online: course.fees?.online || 0,
      offline: course.fees?.offline || 0
    },
    installmentPlans: course.installmentPlans || {
      online: { enabled: false, installments: [] },
      offline: { enabled: false, installments: [] }
    },
    modes: course.modes || [],
    batchStartDate: course.batchStartDate || null,
    batchEndDate: course.batchEndDate || null,
    accessValidityInDays: course.accessValidityInDays || null,
    recordedContentValidityInDays: course.recordedContentValidityInDays || null
  };
}

function getEnrollmentQuery(userId, courseId) {
  return {
    userId,
    courseId,
    isDeleted: false,
    enrollmentStatus: { $ne: 'CANCELLED' }
  };
}

async function settleEnrollment(enrollment, amountPaid, installmentNo = null) {
  enrollment.paidAmount   += amountPaid;
  enrollment.pendingAmount = Math.max(0, enrollment.totalFees - enrollment.paidAmount);

  if (enrollment.enrollmentStatus === 'PENDING') {
    enrollment.enrollmentStatus = 'ACTIVE';
    enrollment.accessStatus     = 'GRANTED';
    enrollment.joinedAt         = new Date();
  }

  if (enrollment.pendingAmount === 0 && enrollment.courseCompletionStatus === 'NOT_STARTED') {
    enrollment.courseCompletionStatus = 'IN_PROGRESS';
  }

  await enrollment.save();

  // Mark installment paid if applicable
  if (installmentNo !== null) {
    await InstallmentPlan.findOneAndUpdate(
      { enrollmentId: enrollment._id, 'installments.installmentNo': installmentNo },
      { $set: { 'installments.$.status': 'PAID', 'installments.$.paidAt': new Date() } }
    );
  }
}

// ─── 1. INITIATE ONLINE PAYMENT ─────────────────────────────────────────────
// POST /api/enrollments/initiate
exports.initiateOnlinePayment = async (req, res) => {
  try {
    const { courseId, learningMode, admissionType, couponCode, idempotencyKey } = req.body;

    const course = await Course.findById(courseId).populate('center', 'name');
    if (!course || !course.isActive) return res.status(404).json({ success: false, message: 'Course not found' });

    const existingEnrollment = await Enrollment.findOne(getEnrollmentQuery(req.user._id, courseId));
    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'An active or completed enrollment already exists for this course'
      });
    }

    if (idempotencyKey) {
      const existingIntent = await PaymentIntent.findOne({ userId: req.user._id, idempotencyKey });
      if (existingIntent) {
        if (existingIntent.status === 'PENDING' && existingIntent.expiresAt > new Date()) {
          return res.json({
            success: true,
            data: {
              razorpayOrderId: existingIntent.razorpayOrderId,
              amount: existingIntent.chargeAmount,
              currency: existingIntent.currency,
              meta: existingIntent.meta
            }
          });
        }
        if (existingIntent.status === 'CAPTURED') {
          return res.status(400).json({
            success: false,
            message: 'Payment already completed for this request'
          });
        }
      }
    }

    const baseFees = await resolveFees(course, learningMode);
    const { discount } = await applyCoupon(couponCode, baseFees, req.user._id).catch(e =>
      res.status(400).json({ success: false, message: e.message })
    );
    if (res.headersSent) return;

    const totalFees = Math.max(0, baseFees - (discount || 0));

    let chargeNow = totalFees;
    let installmentPlan = null;

    if (admissionType === 'installment') {
      // Get installment plan for the selected learning mode
      const plan = course.installmentPlans?.[learningMode];
      
      if (!plan || !plan.enabled || !plan.installments || plan.installments.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: `Installment plan not available for ${learningMode} mode` 
        });
      }

      // Get first installment
      const firstInstallment = plan.installments[0];
      
      if (!firstInstallment || firstInstallment.amount <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid installment plan configuration' 
        });
      }

      chargeNow = firstInstallment.amount;
      installmentPlan = plan;
    }

    if (chargeNow <= 0) return res.status(400).json({ success: false, message: 'Invalid fee amount' });

    const rzpOrder = await razorpay.orders.create({
      amount:   chargeNow * 100,
      currency: 'INR',
      receipt:  `enroll_${Date.now()}`
    });

    const paymentIntent = await PaymentIntent.create({
      userId: req.user._id,
      courseId,
      centerId: course.center,
      learningMode,
      admissionType,
      couponCode: couponCode || null,
      discount: discount || 0,
      totalFees,
      chargeAmount: chargeNow,
      currency: 'INR',
      razorpayOrderId: rzpOrder.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      idempotencyKey: idempotencyKey || null,
      meta: { 
        courseId, 
        learningMode, 
        admissionType, 
        couponCode, 
        totalFees, 
        discount: discount || 0,
        installmentPlan: installmentPlan || null
      }
    });

    res.json({
      success: true,
      data: {
        razorpayOrderId: rzpOrder.id,
        amount:          chargeNow,
        currency:        'INR',
        meta: paymentIntent.meta
      }
    });
  } catch (err) {
    console.error('initiateOnlinePayment:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 2. VERIFY ONLINE PAYMENT & CREATE ENROLLMENT ───────────────────────────
// POST /api/enrollments/verify
exports.verifyOnlinePayment = async (req, res) => {
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      courseId, learningMode, admissionType, installmentMonths, couponCode
    } = req.body;

    const paymentIntent = await PaymentIntent.findOne({ razorpayOrderId: razorpay_order_id });
    if (!paymentIntent) {
      return res.status(404).json({ success: false, message: 'Payment intent not found' });
    }

    if (paymentIntent.status === 'CAPTURED') {
      return res.status(400).json({ success: false, message: 'Payment already processed' });
    }

    if (paymentIntent.expiresAt < new Date()) {
      paymentIntent.status = 'EXPIRED';
      await paymentIntent.save();
      return res.status(400).json({ success: false, message: 'Payment intent has expired' });
    }

    if (paymentIntent.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied for this payment intent' });
    }

    if (await Transaction.findOne({ razorpayPaymentId: razorpay_payment_id })) {
      return res.status(400).json({ success: false, message: 'Payment already processed' });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const course = await Course.findById(courseId).populate('center', 'name');
    if (!course || !course.isActive) return res.status(404).json({ success: false, message: 'Course not found' });

    const baseFees = await resolveFees(course, learningMode);
    const { discount, coupon } = await applyCoupon(couponCode || paymentIntent.couponCode, baseFees, req.user._id).catch(e =>
      res.status(400).json({ success: false, message: e.message })
    );
    if (res.headersSent) return;

    const totalFees = Math.max(0, baseFees - discount);
    const chargeNow = admissionType === 'installment' ? paymentIntent.chargeAmount : totalFees;

    const rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
    if (rzpOrder.amount !== chargeNow * 100) {
      return res.status(400).json({ success: false, message: 'Amount mismatch — possible tampering' });
    }

    const existingEnrollment = await Enrollment.findOne(getEnrollmentQuery(req.user._id, courseId));
    if (existingEnrollment) {
      return res.status(400).json({ success: false, message: 'An active or completed enrollment already exists for this course' });
    }

    const accessWindow = calculateAccessWindow(course, new Date());

    const enrollment = await Enrollment.create({
      userId:           req.user._id,
      courseId,
      centerId:         course.center,
      paymentIntentId:  paymentIntent._id,
      courseSnapshot:   buildCourseSnapshot(course),
      learningMode,
      admissionType,
      totalFees,
      paidAmount:       0,
      pendingAmount:    totalFees,
      currency:         'INR',
      couponCode:       couponCode || paymentIntent.couponCode || null,
      discount,
      courseCompletionStatus: 'IN_PROGRESS',
      enrollmentStatus:       'ACTIVE',
      accessStatus:           'GRANTED',
      joinedAt:               accessWindow.accessStartDate,
      accessStartDate:        accessWindow.accessStartDate,
      accessEndDate:          accessWindow.accessEndDate,
      expiredAt:              accessWindow.expiredAt,
      razorpayOrderId:        razorpay_order_id
    });

    await Transaction.create({
      enrollmentId:      enrollment._id,
      amount:            chargeNow,
      currency:          'INR',
      gatewayAmount:     chargeNow,
      settlementStatus:  'SETTLED',
      paymentMode:       'card',
      paymentChannel:    'online',
      paymentStatus:     'SUCCESS',
      razorpayOrderId:   razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      invoiceNumber:     createInvoiceNumber(course.center?.name),
      receiptNumber:     createReceiptNumber(course.center?.name),
      idempotencyKey:    paymentIntent.idempotencyKey,
      installmentNo:     admissionType === 'installment' ? 1 : null
    });

    if (admissionType === 'installment') {
      const schedule = buildInstallmentSchedule(totalFees, months);
      schedule[0].status = 'PAID';
      schedule[0].paidAt = new Date();
      await InstallmentPlan.create({ enrollmentId: enrollment._id, installments: schedule });
    }

    paymentIntent.status = 'CAPTURED';
    await paymentIntent.save();

    await settleEnrollment(enrollment, chargeNow, admissionType === 'installment' ? 1 : null);

    if (coupon) await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });

    res.json({ success: true, message: 'Enrollment successful', data: enrollment });
  } catch (err) {
    console.error('verifyOnlinePayment:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 3. OFFLINE / CASH ADMISSION (Admin only) ───────────────────────────────
// POST /api/enrollments/offline
exports.createOfflineEnrollment = async (req, res) => {
  try {
    const {
      userId, courseId, learningMode, admissionType,
      installmentMonths, couponCode, amountPaid, paymentMode, remarks
    } = req.body;

    const course = await Course.findById(courseId).populate('center', 'name');
    if (!course || !course.isActive) return res.status(404).json({ success: false, message: 'Course not found' });

    if (req.user.role === 'center_admin' && course.center.toString() !== req.user.center?.toString())
      return res.status(403).json({ success: false, message: 'You can only enroll students into your center' });

    const existingEnrollment = await Enrollment.findOne(getEnrollmentQuery(userId, courseId));
    if (existingEnrollment) {
      return res.status(400).json({ success: false, message: 'An active or completed enrollment already exists for this course' });
    }

    const baseFees = await resolveFees(course, learningMode);
    let discount = 0, couponDoc = null;
    if (couponCode) {
      const result = await applyCoupon(couponCode, baseFees, userId).catch(e =>
        res.status(400).json({ success: false, message: e.message })
      );
      if (res.headersSent) return;
      discount  = result.discount;
      couponDoc = result.coupon;
    }
    const totalFees = Math.max(0, baseFees - discount);

    const accessWindow = calculateAccessWindow(course, new Date());

    const enrollmentData = {
      userId,
      courseId,
      centerId:      course.center,
      courseSnapshot: buildCourseSnapshot(course),
      learningMode,
      admissionType,
      totalFees,
      paidAmount:    0,
      pendingAmount: totalFees,
      currency:      'INR',
      couponCode:    couponCode || null,
      discount,
      courseCompletionStatus: amountPaid > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
      enrollmentStatus: amountPaid > 0 ? 'ACTIVE' : 'PENDING',
      accessStatus: amountPaid > 0 ? 'GRANTED' : 'RESTRICTED',
      joinedAt: amountPaid > 0 ? accessWindow.accessStartDate : null,
      accessStartDate: amountPaid > 0 ? accessWindow.accessStartDate : null,
      accessEndDate: amountPaid > 0 ? accessWindow.accessEndDate : null,
      expiredAt: amountPaid > 0 ? accessWindow.expiredAt : null
    };

    const enrollment = await Enrollment.create(enrollmentData);

    if (admissionType === 'installment') {
      const months = installmentMonths || course.installmentOptions?.[0]?.months || 3;
      const schedule = buildInstallmentSchedule(totalFees, months);
      await InstallmentPlan.create({ enrollmentId: enrollment._id, installments: schedule });
    }

    if (amountPaid > 0) {
      await Transaction.create({
        enrollmentId:   enrollment._id,
        amount:         amountPaid,
        currency:       'INR',
        settlementStatus: 'SETTLED',
        paymentMode:    paymentMode || 'cash',
        paymentChannel: 'offline',
        paymentStatus:  'SUCCESS',
        collectedBy:    req.user._id,
        receiptNumber:  createReceiptNumber(course.center?.name),
        invoiceNumber:  createInvoiceNumber(course.center?.name),
        remarks,
        installmentNo:  admissionType === 'installment' ? 1 : null
      });
      await settleEnrollment(enrollment, amountPaid, admissionType === 'installment' ? 1 : null);
    }

    if (couponDoc) await Coupon.findByIdAndUpdate(couponDoc._id, { $inc: { usedCount: 1 } });

    res.status(201).json({ success: true, message: 'Offline enrollment created', data: enrollment });
  } catch (err) {
    console.error('createOfflineEnrollment:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Razorpay webhook endpoint ───────────────────────────────────────────────
// POST /api/enrollments/webhook
exports.handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing Razorpay signature' });
    }

    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid Razorpay signature' });
    }

    const { event, payload } = req.body;
    const payment = payload?.payment?.entity;
    const order = payload?.order?.entity;
    const razorpayOrderId = payment?.order_id || order?.id;

    if (!razorpayOrderId) {
      return res.status(400).json({ success: false, message: 'Missing order id' });
    }

    const paymentIntent = await PaymentIntent.findOne({ razorpayOrderId });
    if (!paymentIntent) {
      return res.status(200).json({ success: true, message: 'No matching payment intent' });
    }

    if (event === 'payment.captured') {
      if (paymentIntent.status !== 'CAPTURED') {
        paymentIntent.status = 'CAPTURED';
        await paymentIntent.save();
      }

      const existingEnrollment = await Enrollment.findOne({ paymentIntentId: paymentIntent._id, isDeleted: false });
      if (!existingEnrollment) {
        const course = await Course.findById(paymentIntent.courseId).populate('center', 'name');
        if (course && course.isActive) {
          const accessWindow = calculateAccessWindow(course, new Date());
          const enrollment = await Enrollment.create({
            userId: req.body?.userId || paymentIntent.userId,
            courseId: paymentIntent.courseId,
            centerId: course.center,
            paymentIntentId: paymentIntent._id,
            courseSnapshot: buildCourseSnapshot(course),
            learningMode: paymentIntent.learningMode,
            admissionType: paymentIntent.admissionType,
            totalFees: paymentIntent.totalFees,
            paidAmount: 0,
            pendingAmount: paymentIntent.totalFees,
            currency: paymentIntent.currency,
            couponCode: paymentIntent.couponCode || null,
            discount: paymentIntent.discount,
            courseCompletionStatus: 'IN_PROGRESS',
            enrollmentStatus: 'ACTIVE',
            accessStatus: 'GRANTED',
            joinedAt: accessWindow.accessStartDate,
            accessStartDate: accessWindow.accessStartDate,
            accessEndDate: accessWindow.accessEndDate,
            expiredAt: accessWindow.expiredAt,
            razorpayOrderId: paymentIntent.razorpayOrderId
          });

          await Transaction.create({
            enrollmentId: enrollment._id,
            amount: payment ? payment.amount / 100 : paymentIntent.chargeAmount,
            currency: paymentIntent.currency,
            gatewayAmount: payment ? payment.amount / 100 : paymentIntent.chargeAmount,
            settlementStatus: 'SETTLED',
            paymentMode: 'card',
            paymentChannel: 'online',
            paymentStatus: 'SUCCESS',
            razorpayOrderId: paymentIntent.razorpayOrderId,
            razorpayPaymentId: payment?.id || null,
            razorpaySignature: signature,
            invoiceNumber: createInvoiceNumber(course.center?.name),
            receiptNumber: createReceiptNumber(course.center?.name),
            installmentNo: paymentIntent.admissionType === 'installment' ? 1 : null
          });

          if (paymentIntent.admissionType === 'installment') {
            const schedule = buildInstallmentSchedule(paymentIntent.totalFees, paymentIntent.installmentMonths || 1);
            schedule[0].status = 'PAID';
            schedule[0].paidAt = new Date();
            await InstallmentPlan.create({ enrollmentId: enrollment._id, installments: schedule });
          }

          await settleEnrollment(enrollment, payment ? payment.amount / 100 : paymentIntent.chargeAmount, paymentIntent.admissionType === 'installment' ? 1 : null);
        }
      }
    } else if (event === 'payment.failed') {
      paymentIntent.status = 'FAILED';
      await paymentIntent.save();
    } else if (event === 'order.expired') {
      paymentIntent.status = 'EXPIRED';
      await paymentIntent.save();
    }

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    console.error('handleRazorpayWebhook:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 4. PAY INSTALLMENT — ONLINE (initiate) ─────────────────────────────────
// POST /api/enrollments/:id/installment/initiate
exports.initiateInstallmentPayment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    if (enrollment.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });

    if (enrollment.accessEndDate && new Date(enrollment.accessEndDate) < new Date()) {
      return res.status(403).json({ success: false, message: 'Course access expired' });
    }

    const plan = await InstallmentPlan.findOne({ enrollmentId: enrollment._id });
    if (!plan) return res.status(400).json({ success: false, message: 'No installment plan found' });

    const next = plan.installments.find(i => i.status === 'PENDING' || i.status === 'OVERDUE');
    if (!next) return res.status(400).json({ success: false, message: 'All installments are paid' });

    const rzpOrder = await razorpay.orders.create({
      amount:   next.amount * 100,
      currency: 'INR',
      receipt:  `inst_${enrollment._id}_${next.installmentNo}`
    });

    res.json({
      success: true,
      data: {
        razorpayOrderId: rzpOrder.id,
        amount:          next.amount,
        installmentNo:   next.installmentNo
      }
    });
  } catch (err) {
    console.error('initiateInstallmentPayment:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 5. PAY INSTALLMENT — ONLINE (verify) ───────────────────────────────────
// POST /api/enrollments/:id/installment/verify
exports.verifyInstallmentPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, installmentNo } = req.body;

    if (await Transaction.findOne({ razorpayPaymentId: razorpay_payment_id }))
      return res.status(400).json({ success: false, message: 'Payment already processed' });

    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    if (enrollment.accessEndDate && new Date(enrollment.accessEndDate) < new Date()) {
      return res.status(403).json({ success: false, message: 'Course access expired' });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (expected !== razorpay_signature)
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });

    const plan = await InstallmentPlan.findOne({ enrollmentId: enrollment._id });
    const inst = plan?.installments.find(i => i.installmentNo === installmentNo);
    if (!inst) return res.status(400).json({ success: false, message: 'Installment not found' });
    if (inst.status === 'PAID') return res.status(400).json({ success: false, message: 'Installment already paid' });

    await Transaction.create({
      enrollmentId:      enrollment._id,
      amount:            inst.amount,
      paymentMode:       'card',
      paymentChannel:    'online',
      paymentStatus:     'SUCCESS',
      razorpayOrderId:   razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      installmentNo
    });

    await settleEnrollment(enrollment, inst.amount, installmentNo);

    res.json({ success: true, message: 'Installment paid successfully', data: enrollment });
  } catch (err) {
    console.error('verifyInstallmentPayment:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 6. PAY INSTALLMENT — OFFLINE (Admin) ───────────────────────────────────
// POST /api/enrollments/:id/installment/offline
exports.payInstallmentOffline = async (req, res) => {
  try {
    const { installmentNo, paymentMode, remarks } = req.body;

    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    if (enrollment.accessEndDate && new Date(enrollment.accessEndDate) < new Date()) {
      return res.status(403).json({ success: false, message: 'Course access expired' });
    }

    if (req.user.role === 'center_admin' && enrollment.centerId.toString() !== req.user.center?.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });

    const plan = await InstallmentPlan.findOne({ enrollmentId: enrollment._id });
    const inst = plan?.installments.find(i => i.installmentNo === installmentNo);
    if (!inst) return res.status(400).json({ success: false, message: 'Installment not found' });
    if (inst.status === 'PAID') return res.status(400).json({ success: false, message: 'Already paid' });

    const receiptNumber = `RCP-${Date.now()}`;
    await Transaction.create({
      enrollmentId:   enrollment._id,
      amount:         inst.amount,
      paymentMode:    paymentMode || 'cash',
      paymentChannel: 'offline',
      paymentStatus:  'SUCCESS',
      collectedBy:    req.user._id,
      receiptNumber,
      remarks,
      installmentNo
    });

    await settleEnrollment(enrollment, inst.amount, installmentNo);

    res.json({ success: true, message: 'Installment recorded', data: enrollment });
  } catch (err) {
    console.error('payInstallmentOffline:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 7. STUDENT DASHBOARD ───────────────────────────────────────────────────
// GET /api/enrollments/my
exports.getMyEnrollments = async (req, res) => {
  try {
    await Enrollment.updateMany(
      {
        userId: req.user._id,
        accessEndDate: { $lt: new Date() },
        accessStatus: { $ne: 'EXPIRED' }
      },
      [
        {
          $set: {
            accessStatus: 'EXPIRED',
            enrollmentStatus: 'COMPLETED',
            courseCompletionStatus: 'COMPLETED',
            expiredAt: '$accessEndDate'
          }
        }
      ]
    );

    const enrollments = await Enrollment.find({ userId: req.user._id })
      .populate('courseId', 'title slug bannerImage fees')
      .populate('centerId', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: enrollments.length, data: enrollments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/enrollments/:id/transactions
exports.getMyTransactions = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    if (enrollment.userId.toString() !== req.user._id.toString() &&
        !['super_admin', 'center_admin'].includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Access denied' });

    refreshExpiredEnrollment(enrollment);
    if (enrollment.isModified()) await enrollment.save();

    const transactions = await Transaction.find({ enrollmentId: req.params.id })
      .populate('collectedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/enrollments/:id/installments
exports.getInstallmentPlan = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    if (enrollment.userId.toString() !== req.user._id.toString() &&
        !['super_admin', 'center_admin'].includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Access denied' });

    refreshExpiredEnrollment(enrollment);
    if (enrollment.isModified()) await enrollment.save();

    const plan = await InstallmentPlan.findOne({ enrollmentId: req.params.id });
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 8. ADMIN — ALL ENROLLMENTS ─────────────────────────────────────────────
// GET /api/enrollments  (super_admin = all, center_admin = their center)
exports.getAllEnrollments = async (req, res) => {
  try {
    const { status, courseId, page = 1, limit = 20 } = req.query;
    const query = {};

    if (req.user.role === 'center_admin') query.centerId = req.user.center;
    if (status)   query.enrollmentStatus = status;
    if (courseId) query.courseId = courseId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [enrollments, total] = await Promise.all([
      Enrollment.find(query)
        .populate('userId',   'name email mobile')
        .populate('courseId', 'title')
        .populate('centerId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Enrollment.countDocuments(query)
    ]);

    res.json({ success: true, total, page: parseInt(page), data: enrollments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 9. ADMIN — UPDATE ENROLLMENT STATUS ────────────────────────────────────
// PUT /api/enrollments/:id/status
exports.updateEnrollmentStatus = async (req, res) => {
  try {
    const { enrollmentStatus, accessStatus } = req.body;
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });

    if (req.user.role === 'center_admin' && enrollment.centerId.toString() !== req.user.center?.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });

    if (enrollmentStatus) enrollment.enrollmentStatus = enrollmentStatus;
    if (accessStatus)     enrollment.accessStatus     = accessStatus;
    await enrollment.save();

    res.json({ success: true, data: enrollment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 10. INTERNAL EXPIRY HANDLER ───────────────────────────────────────────
exports.expireEnrollments = async () => {
  try {
    const today = new Date();
    await Enrollment.updateMany(
      {
        accessEndDate: { $lt: today },
        accessStatus: { $ne: 'EXPIRED' }
      },
      [
        {
          $set: {
            accessStatus: 'EXPIRED',
            enrollmentStatus: 'COMPLETED',
            courseCompletionStatus: 'COMPLETED',
            expiredAt: '$accessEndDate'
          }
        }
      ]
    );
  } catch (err) {
    console.error('expireEnrollments:', err);
  }
};

// ─── 11. CRON — MARK OVERDUE INSTALLMENTS ───────────────────────────────────
// Called by a cron job or scheduled task: POST /api/enrollments/cron/mark-overdue
exports.markOverdueInstallments = async (req, res) => {
  try {
    const today = new Date();
    const overdueResult = await InstallmentPlan.updateMany(
      { 'installments.status': 'PENDING', 'installments.dueDate': { $lt: today } },
      { $set: { 'installments.$[elem].status': 'OVERDUE' } },
      { arrayFilters: [{ 'elem.status': 'PENDING', 'elem.dueDate': { $lt: today } }] }
    );

    const overdueThreshold = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000);
    const overduePlans = await InstallmentPlan.find({
      'installments.status': 'OVERDUE',
      'installments.dueDate': { $lt: overdueThreshold }
    });

    const enrollmentIds = overduePlans.map(plan => plan.enrollmentId);
    let restrictedResult = { modifiedCount: 0 };

    if (enrollmentIds.length > 0) {
      restrictedResult = await Enrollment.updateMany(
        { _id: { $in: enrollmentIds }, accessStatus: 'GRANTED' },
        { $set: { accessStatus: 'RESTRICTED' } }
      );
    }

    res.json({
      success: true,
      message: 'Overdue installments updated',
      overdueMarked: overdueResult.modifiedCount,
      accessRestricted: restrictedResult.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
```

### `controllers/paymentController.js`

```javascript
const razorpay = require('../config/razorpay');
const Course = require('../models/Course');
const Book = require('../models/Book');
const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const Enrollment = require('../models/Enrollment');
const BookOrder = require('../models/BookOrder');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');

// @desc    Create Razorpay Order
// @route   POST /api/payments/create-order
// @access  Private (Authenticated users)
exports.createOrder = async (req, res) => {
   try {
      const { courseId, couponCode, enrolledMode } = req.body;

      // Validate required fields
      if (!courseId || !enrolledMode) {
         return res.status(400).json({
            success: false,
            message: 'Course ID and enrolled mode are required'
         });
      }

      // Fetch course
      const course = await Course.findById(courseId).populate('center');
      if (!course) {
         return res.status(404).json({
            success: false,
            message: 'Course not found'
         });
      }

      // Check if course is active
      if (!course.isActive) {
         return res.status(400).json({
            success: false,
            message: 'Course is not available for enrollment'
         });
      }

      // Check already enrolled
      const existingEnrollment = await Enrollment.findOne({
         userId: req.user._id,
         courseId,
         status: { $in: ['active', 'completed'] }
      });

      if (existingEnrollment) {
         return res.status(400).json({
            success: false,
            message: 'Already enrolled in this course'
         });
      }

      // Get price based on mode
      let actualPrice, priceDetails;
      if (enrolledMode === 'online') {
         actualPrice = course.fees.online.discountedPrice;
         priceDetails = course.fees.online;
      } else if (enrolledMode === 'offline') {
         actualPrice = course.fees.offline.discountedPrice;
         priceDetails = course.fees.offline;
      } else {
         return res.status(400).json({
            success: false,
            message: 'Invalid enrolled mode. Use "online" or "offline"'
         });
      }

      let finalPrice = actualPrice;
      let discountAmount = 0;
      let appliedCoupon = null;

      // Apply coupon if provided
      if (couponCode) {
         const coupon = await Coupon.findOne({
            couponCode: couponCode.toUpperCase(),
            status: 'ACTIVE',
            isDeleted: false
         });

         if (!coupon) {
            return res.status(400).json({
               success: false,
               message: 'Invalid coupon code'
            });
         }

         // Applicable for validation
         if (coupon.applicableFor !== 'BOTH' && coupon.applicableFor !== 'COURSE') {
            return res.status(400).json({
               success: false,
               message: 'This coupon is not applicable for courses'
            });
         }

         // COURSE coupons MUST have categoryId (specific category only)
         if (coupon.applicableFor === 'COURSE' && !coupon.categoryId) {
            return res.status(400).json({
               success: false,
               message: 'Invalid coupon configuration: Course coupons require a category'
            });
         }

         // Check validity
         const now = new Date();
         if (now < coupon.validFrom || now > coupon.validTill) {
            return res.status(400).json({
               success: false,
               message: 'Coupon has expired or not yet active'
            });
         }

         // Category validation (required for COURSE coupons, optional for BOTH)
         if (coupon.categoryId && course.category.toString() !== coupon.categoryId.toString()) {
            return res.status(400).json({
               success: false,
               message: 'This coupon is not valid for this course category'
            });
         }

         // Check minimum cart value
         if (actualPrice < coupon.minimumCartValue) {
            return res.status(400).json({
               success: false,
               message: `Minimum cart value ₹${coupon.minimumCartValue} required`
            });
         }

         // Check usage limits
         if (coupon.totalUsersLimit && coupon.usedCount >= coupon.totalUsersLimit) {
            return res.status(400).json({
               success: false,
               message: 'Coupon usage limit reached'
            });
         }

         const userUsage = await CouponUsage.countDocuments({
            couponId: coupon._id,
            userId: req.user._id
         });

         if (userUsage >= coupon.usageLimitPerCustomer) {
            return res.status(400).json({
               success: false,
               message: 'You have already used this coupon maximum times allowed'
            });
         }

         // Calculate discount
         if (coupon.type === 'PERCENTAGE') {
            discountAmount = (actualPrice * coupon.value) / 100;
         } else if (coupon.type === 'FLAT') {
            discountAmount = coupon.value;
         }

         finalPrice = Math.max(0, actualPrice - discountAmount);
         appliedCoupon = coupon;
      }

      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
         amount: finalPrice * 100, // Convert to paise
         currency: 'INR',
         receipt: `receipt_${Date.now()}`,
         notes: {
            courseId: courseId,
            userId: req.user._id.toString(),
            enrolledMode: enrolledMode,
            couponCode: couponCode || 'none'
         }
      });

      res.json({
         success: true,
         data: {
            razorpayOrderId: razorpayOrder.id,
            amount: finalPrice,
            actualPrice: actualPrice,
            discountAmount: discountAmount,
            currency: 'INR',
            key: process.env.RAZORPAY_KEY_ID,
            course: {
               title: course.title,
               mode: enrolledMode
            },
            coupon: appliedCoupon ? {
               code: appliedCoupon.couponCode,
               type: appliedCoupon.type,
               value: appliedCoupon.value
            } : null
         }
      });

   } catch (error) {
      console.error('Create Order Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to create payment order',
         error: error.message
      });
   }
};

// @desc    Verify Payment and Create Enrollment
// @route   POST /api/payments/verify
// @access  Private (Authenticated users)
exports.verifyPayment = async (req, res) => {
   try {
      const {
         razorpay_order_id,
         razorpay_payment_id,
         razorpay_signature,
         courseId,
         couponCode,
         enrolledMode
      } = req.body;

      // Verify required fields
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
         return res.status(400).json({
            success: false,
            message: 'Payment details are required'
         });
      }

      // Verify signature
      const generatedSignature = crypto
         .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
         .update(razorpay_order_id + '|' + razorpay_payment_id)
         .digest('hex');

      if (generatedSignature !== razorpay_signature) {
         return res.status(400).json({
            success: false,
            message: 'Payment verification failed. Invalid signature.'
         });
      }

      // Fetch course
      const course = await Course.findById(courseId).populate('center category');
      if (!course) {
         return res.status(404).json({
            success: false,
            message: 'Course not found'
         });
      }

      // Calculate price AGAIN (never trust frontend)
      let actualPrice, finalPrice, discountAmount = 0;
      
      if (enrolledMode === 'online') {
         actualPrice = course.fees.online.discountedPrice;
      } else {
         actualPrice = course.fees.offline.discountedPrice;
      }

      finalPrice = actualPrice;

      // Apply coupon AGAIN if provided
      let appliedCoupon = null;
      if (couponCode) {
         appliedCoupon = await Coupon.findOne({
            couponCode: couponCode.toUpperCase(),
            status: 'ACTIVE',
            isDeleted: false
         });

         if (appliedCoupon) {
            if (appliedCoupon.type === 'PERCENTAGE') {
               discountAmount = (actualPrice * appliedCoupon.value) / 100;
            } else if (appliedCoupon.type === 'FLAT') {
               discountAmount = appliedCoupon.value;
            }
            finalPrice = Math.max(0, actualPrice - discountAmount);
         }
      }

      // Fetch Razorpay order to verify amount
      const order = await razorpay.orders.fetch(razorpay_order_id);
      
      if (order.amount !== finalPrice * 100) {
         return res.status(400).json({
            success: false,
            message: 'Payment amount mismatch. Possible tampering detected.'
         });
      }

      // Generate receipt number
      const receiptNumber = `RCPT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Calculate access validity
      const enrolledAt = new Date();
      let accessValidTill = null;
      if (course.accessValidityInDays) {
         accessValidTill = new Date(
            enrolledAt.getTime() + course.accessValidityInDays * 24 * 60 * 60 * 1000
         );
      }

      // Create enrollment
      const enrollment = await Enrollment.create({
         userId: req.user._id,
         courseId,
         centerId: course.center._id,
         paymentType: 'full',
         courseMode: enrolledMode,
         status: 'active',
         totalFees: actualPrice,
         discount: discountAmount,
         couponCode: couponCode || null,
         amountPaid: finalPrice,
         amountDue: 0,
         installments: [
            {
               installmentNo: 1,
               amount: finalPrice,
               dueDate: enrolledAt,
               status: 'paid',
               paidAt: enrolledAt,
               razorpayOrderId: razorpay_order_id,
               razorpayPaymentId: razorpay_payment_id
            }
         ],
         courseSnapshot: {
            title: course.title,
            slug: course.slug,
            totalFees: actualPrice,
            centerName: course.center.name,
            categoryName: course.category?.name || ''
         },
         enrolledAt: enrolledAt,
         accessValidTill: accessValidTill,
         receiptNumber: receiptNumber,
         razorpayPaymentId: razorpay_payment_id,
         razorpayOrderId: razorpay_order_id,
         razorpaySignature: razorpay_signature
      });

      // Track coupon usage
      if (appliedCoupon) {
         await CouponUsage.create({
            couponId: appliedCoupon._id,
            userId: req.user._id,
            orderId: enrollment._id
         });

         // Increment coupon used count
         appliedCoupon.usedCount += 1;
         await appliedCoupon.save();
      }

      // Generate receipt PDF
      const receiptUrl = await generateReceiptPDF(enrollment, course, req.user);

      // Update enrollment with receipt URL
      enrollment.receiptUrl = receiptUrl;
      await enrollment.save();

      res.json({
         success: true,
         message: 'Payment successful! Enrollment completed.',
         data: {
            enrollment: {
               id: enrollment._id,
               receiptNumber: enrollment.receiptNumber,
               receiptUrl: enrollment.receiptUrl,
               courseTitle: course.title,
               enrolledMode: enrolledMode,
               amountPaid: finalPrice,
               accessValidTill: accessValidTill
            }
         }
      });

   } catch (error) {
      console.error('Verify Payment Error:', error);
      res.status(500).json({
         success: false,
         message: 'Payment verification failed',
         error: error.message
      });
   }
};

// @desc    Generate Receipt PDF
// @route   Internal helper
async function generateReceiptPDF(enrollment, course, user) {
   return new Promise(async (resolve, reject) => {
      try {
         const doc = new PDFDocument();
         const fileName = `receipt_${enrollment.receiptNumber}.pdf`;
         const filePath = path.join(__dirname, '../temp', fileName);

         // Create temp directory if it doesn't exist
         const tempDir = path.join(__dirname, '../temp');
         if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
         }

         const stream = fs.createWriteStream(filePath);
         doc.pipe(stream);

         // Receipt Header
         doc.fontSize(24).text('PAYMENT RECEIPT', { align: 'center' });
         doc.moveDown();

         // Receipt Details
         doc.fontSize(12);
         doc.text(`Receipt Number: ${enrollment.receiptNumber}`);
         doc.text(`Date: ${new Date(enrollment.enrolledAt).toLocaleDateString('en-IN')}`);
         doc.moveDown();

         // Student Details
         doc.fontSize(14).text('Student Details', { underline: true });
         doc.fontSize(12);
         doc.text(`Name: ${user.name}`);
         doc.text(`Email: ${user.email || 'N/A'}`);
         doc.text(`Mobile: ${user.mobile || 'N/A'}`);
         doc.moveDown();

         // Course Details
         doc.fontSize(14).text('Course Details', { underline: true });
         doc.fontSize(12);
         doc.text(`Course: ${course.title}`);
         doc.text(`Mode: ${enrollment.courseMode.toUpperCase()}`);
         doc.text(`Center: ${course.center?.name || 'N/A'}`);
         doc.moveDown();

         // Payment Details
         doc.fontSize(14).text('Payment Details', { underline: true });
         doc.fontSize(12);
         doc.text(`Actual Price: ₹${enrollment.totalFees.toLocaleString('en-IN')}`);
         
         if (enrollment.discount > 0) {
            doc.text(`Discount: -₹${enrollment.discount.toLocaleString('en-IN')}`);
            if (enrollment.couponCode) {
               doc.text(`Coupon: ${enrollment.couponCode}`);
            }
         }
         
         doc.fontSize(16).text(`Amount Paid: ₹${enrollment.amountPaid.toLocaleString('en-IN')}`, { bold: true });
         doc.moveDown();

         // Transaction Details
         doc.fontSize(12);
         doc.text(`Payment ID: ${enrollment.razorpayPaymentId}`);
         doc.text(`Order ID: ${enrollment.razorpayOrderId}`);
         doc.text(`Status: PAID`);
         doc.moveDown();

         // Access Validity
         if (enrollment.accessValidTill) {
            doc.text(`Access Valid Till: ${new Date(enrollment.accessValidTill).toLocaleDateString('en-IN')}`);
         }

         // Footer
         doc.moveDown(2);
         doc.fontSize(10).text('Thank you for your enrollment!', { align: 'center' });
         doc.text('This is a computer-generated receipt.', { align: 'center' });

         doc.end();

         stream.on('finish', async () => {
            // Upload to Cloudinary
            try {
               const result = await cloudinary.uploader.upload(filePath, {
                  folder: 'receipts',
                  resource_type: 'raw',
                  format: 'pdf'
               });

               // Delete local file
               fs.unlinkSync(filePath);

               resolve(result.secure_url);
            } catch (uploadError) {
               reject(uploadError);
            }
         });

         stream.on('error', (error) => {
            reject(error);
         });

      } catch (error) {
         reject(error);
      }
   });
}

// @desc    Get User Enrollments
// @route   GET /api/payments/my-enrollments
// @access  Private (Authenticated users)
exports.getMyEnrollments = async (req, res) => {
   try {
      const enrollments = await Enrollment.find({ userId: req.user._id })
         .populate('courseId', 'title slug bannerImage fees')
         .populate('centerId', 'name')
         .sort({ enrolledAt: -1 });

      res.json({
         success: true,
         count: enrollments.length,
         data: enrollments
      });

   } catch (error) {
      console.error('Get Enrollments Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch enrollments',
         error: error.message
      });
   }
};

// @desc    Check Course Access
// @route   GET /api/payments/check-access/:courseId
// @access  Private (Authenticated users)
exports.checkCourseAccess = async (req, res) => {
   try {
      const { courseId } = req.params;

      const enrollment = await Enrollment.findOne({
         userId: req.user._id,
         courseId,
         status: { $in: ['active', 'completed'] }
      }).populate('courseId', 'title');

      if (!enrollment) {
         return res.json({
            success: true,
            hasAccess: false,
            message: 'No active enrollment found'
         });
      }

      // Check if access has expired
      const now = new Date();
      const hasExpired = enrollment.accessValidTill && now > enrollment.accessValidTill;

      if (hasExpired) {
         return res.json({
            success: true,
            hasAccess: false,
            message: 'Course access has expired',
            accessValidTill: enrollment.accessValidTill
         });
      }

      res.json({
         success: true,
         hasAccess: true,
         enrollment: {
            id: enrollment._id,
            status: enrollment.status,
            enrolledAt: enrollment.enrolledAt,
            accessValidTill: enrollment.accessValidTill,
            receiptNumber: enrollment.receiptNumber,
            receiptUrl: enrollment.receiptUrl
         }
      });

   } catch (error) {
      console.error('Check Access Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to check access',
         error: error.message
      });
   }
};

// ========================================
// BOOK PAYMENT FUNCTIONS
// ========================================

// @desc    Create Book Order (Razorpay)
// @route   POST /api/payments/book/create-order
// @access  Private (Authenticated users)
exports.createBookOrder = async (req, res) => {
   try {
      const { bookId, couponCode, quantity, shippingAddress } = req.body;

      // Validate required fields
      if (!bookId || !shippingAddress) {
         return res.status(400).json({
            success: false,
            message: 'Book ID and shipping address are required'
         });
      }

      // Validate shipping address
      if (!shippingAddress.fullName || !shippingAddress.mobile || 
          !shippingAddress.addressLine || !shippingAddress.city || 
          !shippingAddress.state || !shippingAddress.pincode) {
         return res.status(400).json({
            success: false,
            message: 'Complete shipping address is required'
         });
      }

      // Fetch book
      const book = await Book.findById(bookId);
      if (!book) {
         return res.status(404).json({
            success: false,
            message: 'Book not found'
         });
      }

      // Check if book is active
      if (!book.isActive) {
         return res.status(400).json({
            success: false,
            message: 'Book is not available for purchase'
         });
      }

      const bookQty = quantity || 1;
      const actualPrice = book.discountedPrice * bookQty;
      const deliveryCharge = 50; // Fixed delivery charge

      let finalPrice = actualPrice + deliveryCharge;
      let discountAmount = 0;
      let appliedCoupon = null;

      // Apply coupon if provided
      if (couponCode) {
         const coupon = await Coupon.findOne({
            couponCode: couponCode.toUpperCase(),
            status: 'ACTIVE',
            isDeleted: false
         });

         if (!coupon) {
            return res.status(400).json({
               success: false,
               message: 'Invalid coupon code'
            });
         }

         // Check applicableFor (COURSE/BOOK/BOTH)
         if (coupon.applicableFor !== 'BOTH' && coupon.applicableFor !== 'BOOK') {
            return res.status(400).json({
               success: false,
               message: 'This coupon is not applicable for books'
            });
         }

         // Check validity
         const now = new Date();
         if (now < coupon.validFrom || now > coupon.validTill) {
            return res.status(400).json({
               success: false,
               message: 'Coupon has expired or not yet active'
            });
         }

         // Check minimum cart value
         if (actualPrice < coupon.minimumCartValue) {
            return res.status(400).json({
               success: false,
               message: `Minimum cart value ₹${coupon.minimumCartValue} required`
            });
         }

         // Check usage limits
         if (coupon.totalUsersLimit && coupon.usedCount >= coupon.totalUsersLimit) {
            return res.status(400).json({
               success: false,
               message: 'Coupon usage limit reached'
            });
         }

         const userUsage = await CouponUsage.countDocuments({
            couponId: coupon._id,
            userId: req.user._id
         });

         if (userUsage >= coupon.usageLimitPerCustomer) {
            return res.status(400).json({
               success: false,
               message: 'You have already used this coupon maximum times allowed'
            });
         }

         // Calculate discount
         if (coupon.type === 'PERCENTAGE') {
            discountAmount = (actualPrice * coupon.value) / 100;
         } else if (coupon.type === 'FLAT') {
            discountAmount = coupon.value;
         }

         finalPrice = Math.max(0, actualPrice - discountAmount + deliveryCharge);
         appliedCoupon = coupon;
      }

      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
         amount: finalPrice * 100, // Convert to paise
         currency: 'INR',
         receipt: `book_receipt_${Date.now()}`,
         notes: {
            bookId: bookId,
            userId: req.user._id.toString(),
            quantity: bookQty.toString(),
            couponCode: couponCode || 'none'
         }
      });

      res.json({
         success: true,
         data: {
            razorpayOrderId: razorpayOrder.id,
            amount: finalPrice,
            actualPrice: actualPrice,
            deliveryCharge: deliveryCharge,
            discountAmount: discountAmount,
            currency: 'INR',
            key: process.env.RAZORPAY_KEY_ID,
            book: {
               title: book.title,
               quantity: bookQty
            },
            coupon: appliedCoupon ? {
               code: appliedCoupon.couponCode,
               type: appliedCoupon.type,
               value: appliedCoupon.value
            } : null
         }
      });

   } catch (error) {
      console.error('Create Book Order Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to create book order',
         error: error.message
      });
   }
};

// @desc    Verify Book Payment and Create Order
// @route   POST /api/payments/book/verify
// @access  Private (Authenticated users)
exports.verifyBookPayment = async (req, res) => {
   try {
      const {
         razorpay_order_id,
         razorpay_payment_id,
         razorpay_signature,
         bookId,
         couponCode,
         quantity,
         shippingAddress
      } = req.body;

      // Verify required fields
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
         return res.status(400).json({
            success: false,
            message: 'Payment details are required'
         });
      }

      // Verify signature
      const generatedSignature = crypto
         .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
         .update(razorpay_order_id + '|' + razorpay_payment_id)
         .digest('hex');

      if (generatedSignature !== razorpay_signature) {
         return res.status(400).json({
            success: false,
            message: 'Payment verification failed. Invalid signature.'
         });
      }

      // Fetch book
      const book = await Book.findById(bookId);
      if (!book) {
         return res.status(404).json({
            success: false,
            message: 'Book not found'
         });
      }

      // Calculate price AGAIN (never trust frontend)
      const bookQty = quantity || 1;
      const actualPrice = book.discountedPrice * bookQty;
      const deliveryCharge = 50;
      let finalPrice = actualPrice + deliveryCharge;
      let discountAmount = 0;

      // Apply coupon AGAIN if provided
      let appliedCoupon = null;
      if (couponCode) {
         appliedCoupon = await Coupon.findOne({
            couponCode: couponCode.toUpperCase(),
            status: 'ACTIVE',
            isDeleted: false
         });

         if (appliedCoupon) {
            // Verify applicableFor
            if (appliedCoupon.applicableFor === 'COURSE') {
               return res.status(400).json({
                  success: false,
                  message: 'This coupon is not applicable for books'
               });
            }

            if (appliedCoupon.type === 'PERCENTAGE') {
               discountAmount = (actualPrice * appliedCoupon.value) / 100;
            } else if (appliedCoupon.type === 'FLAT') {
               discountAmount = appliedCoupon.value;
            }
            finalPrice = Math.max(0, actualPrice - discountAmount + deliveryCharge);
         }
      }

      // Fetch Razorpay order to verify amount
      const order = await razorpay.orders.fetch(razorpay_order_id);
      
      if (order.amount !== finalPrice * 100) {
         return res.status(400).json({
            success: false,
            message: 'Payment amount mismatch. Possible tampering detected.'
         });
      }

      // Generate receipt number
      const receiptNumber = `BOOK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create book order
      const bookOrder = await BookOrder.create({
         userId: req.user._id,
         bookId,
         quantity: bookQty,
         actualPrice: actualPrice,
         couponCode: couponCode || null,
         discountAmount: discountAmount,
         finalAmount: finalPrice,
         deliveryCharge: deliveryCharge,
         paymentStatus: 'PAID',
         orderStatus: 'PLACED',
         razorpayPaymentId: razorpay_payment_id,
         razorpayOrderId: razorpay_order_id,
         razorpaySignature: razorpay_signature,
         shippingAddress: {
            fullName: shippingAddress.fullName,
            mobile: shippingAddress.mobile,
            email: shippingAddress.email || '',
            addressLine: shippingAddress.addressLine,
            city: shippingAddress.city,
            state: shippingAddress.state,
            pincode: shippingAddress.pincode,
            landmark: shippingAddress.landmark || ''
         },
         receiptNumber: receiptNumber,
         bookSnapshot: {
            title: book.title,
            authorNames: book.authorNames,
            price: book.discountedPrice
         }
      });

      // Track coupon usage
      if (appliedCoupon) {
         await CouponUsage.create({
            couponId: appliedCoupon._id,
            userId: req.user._id,
            orderId: bookOrder._id
         });

         // Increment coupon used count
         appliedCoupon.usedCount += 1;
         await appliedCoupon.save();
      }

      // Generate Invoice PDF
      const invoiceUrl = await generateInvoicePDF(bookOrder, book, req.user);

      // Update order with invoice URL
      bookOrder.invoiceUrl = invoiceUrl;
      await bookOrder.save();

      res.json({
         success: true,
         message: 'Book order placed successfully!',
         data: {
            order: {
               id: bookOrder._id,
               receiptNumber: bookOrder.receiptNumber,
               invoiceUrl: bookOrder.invoiceUrl,
               bookTitle: book.title,
               quantity: bookQty,
               totalAmount: finalPrice,
               orderStatus: bookOrder.orderStatus,
               estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')
            }
         }
      });

   } catch (error) {
      console.error('Verify Book Payment Error:', error);
      res.status(500).json({
         success: false,
         message: 'Book payment verification failed',
         error: error.message
      });
   }
};

// @desc    Get User Book Orders
// @route   GET /api/payments/book/my-orders
// @access  Private (Authenticated users)
exports.getMyBookOrders = async (req, res) => {
   try {
      const orders = await BookOrder.find({ userId: req.user._id })
         .populate('bookId', 'title image discountedPrice')
         .sort({ createdAt: -1 });

      res.json({
         success: true,
         count: orders.length,
         data: orders
      });

   } catch (error) {
      console.error('Get Book Orders Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch book orders',
         error: error.message
      });
   }
};

// @desc    Generate Invoice PDF for Book Order
// @route   Internal helper
async function generateInvoicePDF(bookOrder, book, user) {
   return new Promise(async (resolve, reject) => {
      try {
         const doc = new PDFDocument();
         const fileName = `invoice_${bookOrder.receiptNumber}.pdf`;
         const filePath = path.join(__dirname, '../temp', fileName);

         // Create temp directory if it doesn't exist
         const tempDir = path.join(__dirname, '../temp');
         if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
         }

         const stream = fs.createWriteStream(filePath);
         doc.pipe(stream);

         // Invoice Header
         doc.fontSize(24).text('BOOK PURCHASE INVOICE', { align: 'center' });
         doc.moveDown();

         // Invoice Details
         doc.fontSize(12);
         doc.text(`Invoice Number: ${bookOrder.receiptNumber}`);
         doc.text(`Date: ${new Date(bookOrder.createdAt).toLocaleDateString('en-IN')}`);
         doc.moveDown();

         // Customer Details
         doc.fontSize(14).text('Customer Details', { underline: true });
         doc.fontSize(12);
         doc.text(`Name: ${bookOrder.shippingAddress.fullName}`);
         doc.text(`Mobile: ${bookOrder.shippingAddress.mobile}`);
         if (bookOrder.shippingAddress.email) {
            doc.text(`Email: ${bookOrder.shippingAddress.email}`);
         }
         doc.moveDown();

         // Shipping Address
         doc.fontSize(14).text('Shipping Address', { underline: true });
         doc.fontSize(12);
         doc.text(bookOrder.shippingAddress.addressLine);
         doc.text(`${bookOrder.shippingAddress.city}, ${bookOrder.shippingAddress.state} - ${bookOrder.shippingAddress.pincode}`);
         if (bookOrder.shippingAddress.landmark) {
            doc.text(`Landmark: ${bookOrder.shippingAddress.landmark}`);
         }
         doc.moveDown();

         // Book Details
         doc.fontSize(14).text('Book Details', { underline: true });
         doc.fontSize(12);
         doc.text(`Title: ${book.title}`);
         doc.text(`Author(s): ${book.authorNames.join(', ')}`);
         doc.text(`Quantity: ${bookOrder.quantity}`);
         doc.moveDown();

         // Payment Details
         doc.fontSize(14).text('Payment Details', { underline: true });
         doc.fontSize(12);
         doc.text(`Book Price: ₹${bookOrder.actualPrice.toLocaleString('en-IN')}`);
         
         if (bookOrder.discountAmount > 0) {
            doc.text(`Discount: -₹${bookOrder.discountAmount.toLocaleString('en-IN')}`);
            if (bookOrder.couponCode) {
               doc.text(`Coupon: ${bookOrder.couponCode}`);
            }
         }
         
         doc.text(`Delivery Charge: ₹${bookOrder.deliveryCharge.toLocaleString('en-IN')}`);
         doc.fontSize(16).text(`Total Amount: ₹${bookOrder.finalAmount.toLocaleString('en-IN')}`, { bold: true });
         doc.moveDown();

         // Transaction Details
         doc.fontSize(12);
         doc.text(`Payment ID: ${bookOrder.razorpayPaymentId}`);
         doc.text(`Order ID: ${bookOrder.razorpayOrderId}`);
         doc.text(`Payment Status: PAID`);
         doc.text(`Order Status: ${bookOrder.orderStatus}`);
         doc.moveDown();

         // Estimated Delivery
         const estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
         doc.text(`Estimated Delivery: ${estimatedDelivery.toLocaleDateString('en-IN')}`);

         // Footer
         doc.moveDown(2);
         doc.fontSize(10).text('Thank you for your purchase!', { align: 'center' });
         doc.text('This is a computer-generated invoice.', { align: 'center' });

         doc.end();

         stream.on('finish', async () => {
            // Upload to Cloudinary
            try {
               const result = await cloudinary.uploader.upload(filePath, {
                  folder: 'invoices',
                  resource_type: 'raw',
                  format: 'pdf'
               });

               // Delete local file
               fs.unlinkSync(filePath);

               resolve(result.secure_url);
            } catch (uploadError) {
               reject(uploadError);
            }
         });

         stream.on('error', (error) => {
            reject(error);
         });

      } catch (error) {
         reject(error);
      }
   });
}
```

### `controllers/testExamController.js`

```javascript
const TestExam = require('../models/TestExam');
const TestResult = require('../models/TestResult');
const { assertEnrollmentAccess, getCourseForAdmin } = require('../utils/courseAccess');
const { assertSubjectBelongsToCourse } = require('../utils/answerWritingHelpers');
const {
  NOT_DELETED,
  validateQuestions,
  syncExamTotals,
  sanitizeExamForStudent,
  formatScheduleItem,
  isExamWindowOpen,
  resolveExamScheduleStatus
} = require('../utils/testExamHelpers');

const findActiveExam = (id) =>
  TestExam.findOne({ _id: id, ...NOT_DELETED, isActive: true });

const resolveCourseId = (body) => body.course || body.courseId;
const resolveSubjectId = (body) => body.subject || body.subjectId;

const buildExamPayload = async (body, { isUpdate = false } = {}) => {
  const course = resolveCourseId(body);
  const subject = resolveSubjectId(body);

  if (!isUpdate && (!course || !subject)) {
    return { error: 'course and subject are required' };
  }

  if (subject && course) {
    const subjectDoc = await assertSubjectBelongsToCourse(course, subject);
    if (!subjectDoc) {
      return { error: 'Subject does not belong to this course' };
    }
  }

  const payload = {};

  if (course) payload.course = course;
  if (subject) payload.subject = subject;
  if (body.title !== undefined) payload.title = String(body.title).trim();
  if (body.description !== undefined) payload.description = body.description;
  if (body.examDate !== undefined) payload.examDate = body.examDate;
  if (body.examEndDate !== undefined) payload.examEndDate = body.examEndDate || null;
  if (body.durationInMinutes !== undefined) payload.durationInMinutes = body.durationInMinutes;
  if (body.passMarks !== undefined) payload.passMarks = body.passMarks;
  if (body.negativeMarks !== undefined) payload.negativeMarks = body.negativeMarks;
  if (body.maxAttempts !== undefined) payload.maxAttempts = body.maxAttempts;
  if (body.isPublished !== undefined) payload.isPublished = body.isPublished;
  if (body.isActive !== undefined) payload.isActive = body.isActive;

  if (body.questions !== undefined) {
    const validationError = validateQuestions(body.questions);
    if (validationError) return { error: validationError };
    payload.questions = body.questions;
    payload.totalMarks = syncExamTotals(body.questions, body.totalMarks);
  } else if (body.totalMarks !== undefined) {
    payload.totalMarks = body.totalMarks;
  }

  return { payload, course, subject };
};

exports.createTestExam = async (req, res) => {
  try {
    const built = await buildExamPayload(req.body);
    if (built.error) {
      return res.status(400).json({ success: false, message: built.error });
    }

    const course = await getCourseForAdmin(req, res, built.course);
    if (!course) return;

    const exam = await TestExam.create({
      ...built.payload,
      createdBy: req.user._id
    });

    const populated = await TestExam.findById(exam._id)
      .populate('subject', 'title')
      .populate('course', 'title');

    res.status(201).json({
      success: true,
      message: 'Test exam created',
      data: populated
    });
  } catch (error) {
    console.error('Create test exam error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateTestExam = async (req, res) => {
  try {
    const exam = await findActiveExam(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Test exam not found' });
    }

    const course = await getCourseForAdmin(req, res, exam.course);
    if (!course) return;

    const built = await buildExamPayload(
      { ...req.body, course: resolveCourseId(req.body) || exam.course },
      { isUpdate: true }
    );
    if (built.error) {
      return res.status(400).json({ success: false, message: built.error });
    }

    Object.assign(exam, built.payload);
    await exam.save();

    const populated = await TestExam.findById(exam._id)
      .populate('subject', 'title')
      .populate('course', 'title');

    res.json({
      success: true,
      message: 'Test exam updated',
      data: populated
    });
  } catch (error) {
    console.error('Update test exam error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteTestExam = async (req, res) => {
  try {
    const exam = await findActiveExam(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Test exam not found' });
    }

    const course = await getCourseForAdmin(req, res, exam.course);
    if (!course) return;

    exam.isDeleted = true;
    exam.isPublished = false;
    exam.isActive = false;
    await exam.save();

    res.json({
      success: true,
      message: 'Test exam deleted. Past results are preserved.'
    });
  } catch (error) {
    console.error('Delete test exam error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCourseTestExamsAdmin = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const exams = await TestExam.find({ course: courseId, ...NOT_DELETED })
      .populate('subject', 'title')
      .sort({ examDate: 1 })
      .lean();

    res.json({
      success: true,
      count: exams.length,
      data: exams.map((exam) => ({
        ...exam,
        scheduleStatus: resolveExamScheduleStatus(exam)
      }))
    });
  } catch (error) {
    console.error('Admin course test exams error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCourseTestSchedule = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const exams = await TestExam.find({
      course: courseId,
      isPublished: true,
      isActive: true,
      ...NOT_DELETED
    })
      .populate('subject', 'title')
      .sort({ examDate: 1 })
      .lean();

    const examIds = exams.map((e) => e._id);
    const attemptCounts = await TestResult.aggregate([
      {
        $match: {
          student: req.user._id,
          testExam: { $in: examIds }
        }
      },
      { $group: { _id: '$testExam', count: { $sum: 1 } } }
    ]);

    const countMap = new Map(attemptCounts.map((row) => [String(row._id), row.count]));

    res.json({
      success: true,
      count: exams.length,
      data: exams.map((exam) =>
        formatScheduleItem(exam, countMap.get(String(exam._id)) || 0)
      )
    });
  } catch (error) {
    console.error('Course test schedule error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTestExamAdmin = async (req, res) => {
  try {
    const exam = await TestExam.findOne({ _id: req.params.id, ...NOT_DELETED })
      .populate('subject', 'title')
      .populate('course', 'title');

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Test exam not found' });
    }

    const course = await getCourseForAdmin(req, res, exam.course._id || exam.course);
    if (!course) return;

    res.json({
      success: true,
      data: {
        ...exam.toObject(),
        scheduleStatus: resolveExamScheduleStatus(exam)
      }
    });
  } catch (error) {
    console.error('Get test exam admin error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.startTestExam = async (req, res) => {
  try {
    const exam = await TestExam.findOne({
      _id: req.params.id,
      isPublished: true,
      isActive: true,
      ...NOT_DELETED
    })
      .populate('subject', 'title')
      .lean();

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Test exam not found or not published'
      });
    }

    const enrollment = await assertEnrollmentAccess(req, res, exam.course);
    if (!enrollment) return;

    if (!isExamWindowOpen(exam)) {
      return res.status(403).json({
        success: false,
        message:
          resolveExamScheduleStatus(exam) === 'UPCOMING'
            ? 'This test is not available yet'
            : 'This test window has ended',
        scheduleStatus: resolveExamScheduleStatus(exam)
      });
    }

    const attemptCount = await TestResult.countDocuments({
      student: req.user._id,
      testExam: exam._id
    });

    if (attemptCount >= (exam.maxAttempts || 1)) {
      return res.status(400).json({
        success: false,
        message: `Maximum attempts (${exam.maxAttempts}) reached for this test`
      });
    }

    if (!exam.questions?.length) {
      return res.status(400).json({
        success: false,
        message: 'Test exam has no questions yet'
      });
    }

    res.json({
      success: true,
      message: 'Test ready to start',
      data: {
        ...sanitizeExamForStudent(exam),
        attemptNumber: attemptCount + 1,
        attemptsRemaining: (exam.maxAttempts || 1) - attemptCount
      }
    });
  } catch (error) {
    console.error('Start test exam error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/testResultController.js`

```javascript
const TestExam = require('../models/TestExam');
const TestResult = require('../models/TestResult');
const { assertEnrollmentAccess } = require('../utils/courseAccess');
const {
  NOT_DELETED,
  isExamWindowOpen,
  resolveExamScheduleStatus,
  normalizeAnswerPayload,
  scoreTestExam,
  formatResultSummary
} = require('../utils/testExamHelpers');

exports.submitTest = async (req, res) => {
  try {
    const { testExamId, answers, timeTakenInSeconds } = req.body;

    if (!testExamId) {
      return res.status(400).json({
        success: false,
        message: 'testExamId is required'
      });
    }

    const exam = await TestExam.findOne({
      _id: testExamId,
      isPublished: true,
      isActive: true,
      ...NOT_DELETED
    }).lean();

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Test exam not found or not published'
      });
    }

    const enrollment = await assertEnrollmentAccess(req, res, exam.course);
    if (!enrollment) return;

    if (!isExamWindowOpen(exam)) {
      return res.status(403).json({
        success: false,
        message:
          resolveExamScheduleStatus(exam) === 'UPCOMING'
            ? 'This test is not available yet'
            : 'This test window has ended',
        scheduleStatus: resolveExamScheduleStatus(exam)
      });
    }

    const previousAttempts = await TestResult.countDocuments({
      student: req.user._id,
      testExam: exam._id
    });

    if (previousAttempts >= (exam.maxAttempts || 1)) {
      return res.status(400).json({
        success: false,
        message: `Maximum attempts (${exam.maxAttempts}) reached for this test`
      });
    }

    if (!exam.questions?.length) {
      return res.status(400).json({
        success: false,
        message: 'Test exam has no questions'
      });
    }

    const answerMap = normalizeAnswerPayload(exam.questions, answers);
    const scored = scoreTestExam(exam, answerMap);

    const elapsed = Number(timeTakenInSeconds);
    const timeTaken = Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
    const maxSeconds = (exam.durationInMinutes || 60) * 60;

    if (timeTaken > maxSeconds + 30) {
      return res.status(400).json({
        success: false,
        message: 'Time limit exceeded for this test',
        allowedSeconds: maxSeconds
      });
    }

    const result = await TestResult.create({
      student: req.user._id,
      course: exam.course,
      testExam: exam._id,
      answers: scored.answers,
      totalQuestions: scored.totalQuestions,
      correctAnswers: scored.correctAnswers,
      wrongAnswers: scored.wrongAnswers,
      skippedAnswers: scored.skippedAnswers,
      score: scored.score,
      totalMarks: scored.totalMarks,
      percentage: scored.percentage,
      resultStatus: scored.resultStatus,
      attemptNumber: previousAttempts + 1,
      timeTakenInSeconds: timeTaken,
      submittedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Test submitted successfully',
      data: formatResultSummary(result)
    });
  } catch (error) {
    console.error('Submit test exam error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getResultById = async (req, res) => {
  try {
    const result = await TestResult.findById(req.params.id)
      .populate('testExam', 'title examDate passMarks totalMarks')
      .populate('course', 'title')
      .lean();

    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    if (String(result.student) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const exam = await TestExam.findById(result.testExam._id || result.testExam).lean();
    const answerMap = new Map(
      (result.answers || []).map((a) => [String(a.questionId), a])
    );

    const review = (exam?.questions || []).map((q) => {
      const row = answerMap.get(String(q._id));
      return {
        _id: q._id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        marks: q.marks,
        selectedOption: row?.selectedOption ?? null,
        isCorrect: row?.isCorrect ?? false,
        obtainedMarks: row?.obtainedMarks ?? 0
      };
    });

    res.json({
      success: true,
      data: {
        ...formatResultSummary(result),
        testTitle: exam?.title,
        review
      }
    });
  } catch (error) {
    console.error('Get test result error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getMyResultsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const results = await TestResult.find({
      student: req.user._id,
      course: courseId
    })
      .populate('testExam', 'title examDate subject')
      .sort({ submittedAt: -1 })
      .lean();

    res.json({
      success: true,
      count: results.length,
      data: results.map((row) => ({
        ...formatResultSummary(row),
        testExam: row.testExam
          ? {
              _id: row.testExam._id,
              title: row.testExam.title,
              examDate: row.testExam.examDate
            }
          : null
      }))
    });
  } catch (error) {
    console.error('Course result history error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getMyResults = async (req, res) => {
  try {
    const results = await TestResult.find({ student: req.user._id })
      .populate('testExam', 'title examDate')
      .populate('course', 'title')
      .sort({ submittedAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      count: results.length,
      data: results.map((row) => ({
        ...formatResultSummary(row),
        testExam: row.testExam,
        course: row.course
      }))
    });
  } catch (error) {
    console.error('My test results error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getResultsByTestExam = async (req, res) => {
  try {
    const exam = await TestExam.findOne({ _id: req.params.testExamId, ...NOT_DELETED });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Test exam not found' });
    }

    const results = await TestResult.find({
      student: req.user._id,
      testExam: exam._id
    })
      .sort({ attemptNumber: -1 })
      .lean();

    res.json({
      success: true,
      count: results.length,
      data: results.map(formatResultSummary)
    });
  } catch (error) {
    console.error('Results by test exam error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `models/Category.js`

```javascript
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
```

### `models/Course.js`

```javascript
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  slug: {
    type: String,
    unique: true,
    sparse: true, // Allows null values but ensures uniqueness when present
    trim: true
  },
  
  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true
  },
  
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  
  description: String,
  
  batchStartDate: {
    type: Date,
    default: null
  },
  batchEndDate: {
    type: Date,
    default: null
  },
  duration: String, // "1 Year", "2 Years", "6 Months"
  accessValidityInDays: {
    type: Number,
    default: null
  },
  recordedContentValidityInDays: {
    type: Number,
    default: null
  },
  
  // Fees with auto-calculated pricing
  fees: {
    online: {
      actualPrice: { type: Number, default: 0 },
      discountPercent: { type: Number, default: 0 },
      discountedPrice: { type: Number, default: 0 },
      hasDiscount: { type: Boolean, default: false },
      offerText: { type: String, default: '' }
    },
    offline: {
      actualPrice: { type: Number, default: 0 },
      discountPercent: { type: Number, default: 0 },
      discountedPrice: { type: Number, default: 0 },
      hasDiscount: { type: Boolean, default: false },
      offerText: { type: String, default: '' }
    },
    description: String
  },
  
  modes: [{
    type: String,
    enum: ['online', 'offline', 'hybrid']
  }],
  
  // Media (Cloudinary URLs)
  bannerImage: {
    url: { type: String, required: true },
    public_id: { type: String, required: true }
  },
  highlightImage: {
    url: String,
    public_id: String
  },
  sectionImage: {
    url: String,
    public_id: String
  },
  
  galleryImages: [{
    url: String,
    public_id: String
  }],
  
  promoVideo: {
    url: String,
    public_id: String
  },
  
  // Content Sections
  keyHighlights: {
    keyTitle: String,
    keyHighlightTexts: [String]
  },
  
  whyChoose: {
    whyChooseTitle: String,
    whyChooseItems: [{
      whyChooseText: String,
      whyChooseContent: String
    }]
  },
  
  howItHelps: {
    howItHelpsTitle: String,
    howItHelpsTexts: [String]
  },
  
  // Extra Fields (Flexible content for category-specific data)
  extraFields: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Additional Info
  brochure: {
    url: String,
    public_id: String
  },
  features: [String],
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
  
}, { timestamps: true });

// Generate slug from title before saving
courseSchema.pre('save', async function() {
  if (this.title && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();
  }
});

// Index for faster queries
courseSchema.index({ center: 1, category: 1 });
courseSchema.index({ isActive: 1 });

module.exports = mongoose.model('Course', courseSchema);
```

### `models/CourseSubject.js`

```javascript
const mongoose = require('mongoose');

const courseSubjectSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

const subjectResponseTransform = (_doc, ret) => {
  delete ret.description;
  delete ret.order;
  delete ret.__v;
  return ret;
};

courseSubjectSchema.set('toJSON', { transform: subjectResponseTransform });
courseSubjectSchema.set('toObject', { transform: subjectResponseTransform });

courseSubjectSchema.index({ courseId: 1, order: 1 });

module.exports = mongoose.model('CourseSubject', courseSubjectSchema);
```

### `models/Enrollment.js`

```javascript
const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true,
    index: true
  },
  
  // Industry Standard Naming
  paymentType: {
    type: String,
    enum: ['full', 'installment'],
    default: 'full'
  },
  courseMode: {
    type: String,
    enum: ['online', 'offline'],
    required: true
  },
  
  // Single Status Field (Simplified)
  status: {
    type: String,
    enum: ['pending', 'active', 'overdue', 'completed', 'expired', 'cancelled'],
    default: 'pending',
    index: true
  },
  accessBlocked: { type: Boolean, default: false },
  
  // Financial Tracking
  totalFees: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  couponCode: { type: String },
  amountPaid: { type: Number, default: 0 },
  amountDue: { type: Number, default: 0 },
  
  // Installments (Embedded in Enrollment - Industry Standard)
  installments: [
    {
      installmentNo: { type: Number, required: true },
      amount: { type: Number, required: true },
      dueDate: { type: Date, required: true },
      status: {
        type: String,
        enum: ['pending', 'paid', 'overdue', 'cancelled'],
        default: 'pending'
      },
      paidAt: { type: Date },
      transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String }
    }
  ],
  
  // Course Snapshot (Preserve purchase-time data)
  courseSnapshot: {
    title: { type: String },
    slug: { type: String },
    totalFees: { type: Number },
    onlineFees: { type: Number },
    offlineFees: { type: Number },
    centerName: { type: String },
    centerCity: { type: String },
    categoryName: { type: String },
    validityMonths: { type: Number },
    batchStartDate: { type: Date },
    batchEndDate: { type: Date },
    installmentPlans: {
      online: {
        enabled: Boolean,
        installments: [{
          installmentNo: Number,
          amount: Number,
          dueAfterDays: Number
        }]
      },
      offline: {
        enabled: Boolean,
        installments: [{
          installmentNo: Number,
          amount: Number,
          dueAfterDays: Number
        }]
      }
    }
  },
  
  // Coupon Snapshot (Preserve discount data)
  couponSnapshot: {
    code: { type: String },
    discountType: { type: String },
    discountValue: { type: Number },
    maxDiscount: { type: Number }
  },
  
  // Access Validity
  validFrom: { type: Date, default: Date.now },
  validUntil: { type: Date },
  accessEndsAt: { type: Date }, // Computed and stored at enrollment
  
  // Refund Architecture
  refundStatus: {
    type: String,
    enum: ['none', 'partial', 'full'],
    default: 'none'
  },
  refundAmount: { type: Number, default: 0 },
  refundDate: { type: Date },
  
  // Financial Audit Fields
  currency: { type: String, default: 'INR' },
  paymentGateway: { type: String, default: 'RAZORPAY' },
  invoiceNumber: { type: String },
  receiptNumber: { type: String },
  
  // Course Progress
  courseCompletionStatus: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  
  // Legacy fields (for backward compatibility)
  razorpayOrderId: { type: String, default: null },
  
  // Soft Delete (Financial data should NEVER be hard deleted)
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Indexes for Performance
// Prevent duplicate active enrollments for same user + course
enrollmentSchema.index(
  { userId: 1, courseId: 1, isDeleted: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: { $in: ['pending', 'active', 'overdue'] }
    }
  }
);

// Common query indexes
enrollmentSchema.index({ centerId: 1, status: 1 });
enrollmentSchema.index({ userId: 1, status: 1 });
enrollmentSchema.index({ courseId: 1, status: 1 });
enrollmentSchema.index({ status: 1, isDeleted: 1 });
enrollmentSchema.index({ accessEndsAt: 1 });
enrollmentSchema.index({ 'installments.status': 1 });
enrollmentSchema.index({ 'installments.dueDate': 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
```

### `models/InstallmentPlan.js`

```javascript
const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
  enrollmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true,
    unique: true
  },
  installments: [
    {
      installmentNo: { type: Number, required: true },
      amount:        { type: Number, required: true },
      dueDate:       { type: Date,   required: true },
      status: {
        type: String,
        enum: ['PENDING', 'PAID', 'OVERDUE'],
        default: 'PENDING'
      },
      paidAt: { type: Date, default: null },
      razorpayOrderId: { type: String, default: null },
      razorpayPaymentId: { type: String, default: null }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('InstallmentPlan', installmentSchema);
```

### `models/PaymentIntent.js`

```javascript
const mongoose = require('mongoose');

const paymentIntentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true
  },
  learningMode: {
    type: String,
    enum: ['online', 'offline'],
    required: true
  },
  admissionType: {
    type: String,
    enum: ['full', 'installment'],
    required: true
  },
  installmentMonths: {
    type: Number,
    default: 1
  },
  couponCode: {
    type: String,
    default: null
  },
  discount: {
    type: Number,
    default: 0
  },
  totalFees: {
    type: Number,
    required: true
  },
  chargeAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'CAPTURED', 'FAILED', 'EXPIRED'],
    default: 'PENDING'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  idempotencyKey: {
    type: String,
    default: null
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

paymentIntentSchema.index({ userId: 1, courseId: 1, status: 1 });
paymentIntentSchema.index({ idempotencyKey: 1, userId: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $exists: true, $ne: null } } });

module.exports = mongoose.model('PaymentIntent', paymentIntentSchema);
```

### `models/TestExam.js`

```javascript
const mongoose = require('mongoose');

const testExamQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true
    },
    options: {
      type: [String],
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 2,
        message: 'At least two options are required'
      }
    },
    correctAnswer: {
      type: Number,
      required: true,
      min: 0
    },
    explanation: {
      type: String,
      default: ''
    },
    marks: {
      type: Number,
      default: 1,
      min: 0
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: true }
);

const testExamSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseSubject',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    examDate: {
      type: Date,
      required: true
    },
    examEndDate: {
      type: Date,
      default: null
    },
    durationInMinutes: {
      type: Number,
      default: 60,
      min: 1
    },
    totalMarks: {
      type: Number,
      default: 0,
      min: 0
    },
    passMarks: {
      type: Number,
      default: 40,
      min: 0
    },
    negativeMarks: {
      type: Number,
      default: 0.25,
      min: 0
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: 1
    },
    questions: [testExamQuestionSchema],
    isPublished: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

testExamSchema.index({ course: 1, examDate: 1, isDeleted: 1 });
testExamSchema.index({ course: 1, isPublished: 1, isActive: 1, isDeleted: 1 });

module.exports = mongoose.model('TestExam', testExamSchema);
```

### `models/TestResult.js`

```javascript
const mongoose = require('mongoose');

const testResultAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    selectedOption: {
      type: Number,
      default: null
    },
    isCorrect: {
      type: Boolean,
      default: false
    },
    obtainedMarks: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const testResultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true
    },
    testExam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestExam',
      required: true,
      index: true
    },
    answers: [testResultAnswerSchema],
    totalQuestions: {
      type: Number,
      default: 0
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    wrongAnswers: {
      type: Number,
      default: 0
    },
    skippedAnswers: {
      type: Number,
      default: 0
    },
    score: {
      type: Number,
      default: 0
    },
    totalMarks: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    resultStatus: {
      type: String,
      enum: ['PASS', 'FAIL'],
      required: true
    },
    attemptNumber: {
      type: Number,
      default: 1,
      min: 1
    },
    timeTakenInSeconds: {
      type: Number,
      default: 0
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

testResultSchema.index({ student: 1, testExam: 1, createdAt: -1 });
testResultSchema.index({ student: 1, course: 1, createdAt: -1 });

module.exports = mongoose.model('TestResult', testResultSchema);
```

### `models/Transaction.js`

```javascript
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  enrollmentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Enrollment', 
    required: true,
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  courseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true,
    index: true 
  },
  centerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Center',
    index: true 
  },
  installmentId: { type: mongoose.Schema.Types.ObjectId }, // Reference to specific installment
  
  // Payment Type
  paymentType: { 
    type: String, 
    enum: ['full', 'installment'], 
    required: true 
  },
  installmentNo: { type: Number }, // For installment payments
  
  // Amount Details
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  
  // Payment Status (Track ALL attempts)
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'success', 'failed', 'cancelled', 'refunded'], 
    default: 'pending',
    index: true 
  },
  
  // Payment Mode
  paymentMode: { 
    type: String, 
    enum: ['online', 'offline', 'mixed'], 
    required: true 
  },
  
  // Gateway Details
  paymentGateway: { type: String, default: 'RAZORPAY' },
  gatewayTransactionId: { type: String },
  
  // Razorpay Fields
  razorpayOrderId: { type: String, required: true, index: true },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  
  // Offline Payment Fields
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'netbanking', 'wallet'] 
  },
  chequeNumber: { type: String },
  bankReferenceNumber: { type: String },
  
  // Financial Audit
  invoiceNumber: { type: String, index: true },
  receiptNumber: { type: String },
  
  // Refund Fields
  refundAmount: { type: Number, default: 0 },
  refundDate: { type: Date },
  refundId: { type: String }, // Gateway refund ID
  refundReason: { type: String },
  refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Payment Expiry (For pending orders)
  paymentExpiresAt: { type: Date, index: true },
  
  // Error Tracking (For failed payments)
  errorCode: { type: String },
  errorMessage: { type: String },
  failureReason: { type: String },
  
  // Metadata
  description: { type: String },
  notes: { type: Map, of: String },
  metadata: { type: Map, of: String },
  
  // Payment Attempt Details
  attemptNumber: { type: Number, default: 1 },
  isRetry: { type: Boolean, default: false },
  previousTransactionId: { type: mongoose.Schema.Types.ObjectId },
  
  // Verification
  isVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  verifiedBy: { type: String }, // 'webhook' | 'api' | 'manual'
  
  // Legacy fields
  orderNumber: { type: String },
  enrollmentNumber: { type: String },
  
  // Status
  isActive: { type: Boolean, default: true },
  remarks: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Performance Indexes
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ courseId: 1, createdAt: -1 });
transactionSchema.index({ paymentStatus: 1, createdAt: -1 });
transactionSchema.index({ centerId: 1, createdAt: -1 });
transactionSchema.index({ paymentType: 1, paymentStatus: 1 });
transactionSchema.index({ paymentExpiresAt: 1 });
transactionSchema.index({ invoiceNumber: 1 }, { sparse: true });
transactionSchema.index({ razorpayPaymentId: 1 }, { sparse: true });

module.exports = mongoose.model('Transaction', transactionSchema);
```

### `routes/courseRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const {
  createCourse,
  getCourses,
  getCoursesForEnquiry,
  getCourseById,
  getCourseBySlug,
  updateCourse,
  deleteCourse,
  getCoursesGrouped
} = require('../controllers/courseController');

// ==========================================
// PUBLIC ROUTES (No authentication needed)
// ==========================================
router.get('/', getCourses);
router.get('/enquiry', getCoursesForEnquiry);
router.get('/grouped', getCoursesGrouped);
router.get('/slug/:slug', getCourseBySlug);
router.get('/:id', getCourseById);
router.post('/find', getCourseById);

// ==========================================
// ADMIN ROUTES (Protected)
// ==========================================

// Create course - Super Admin & Center Admin
router.post(
  '/',
  protect,
  allowRoles('super_admin', 'center_admin'),
  upload.fields([
    { name: 'banner', maxCount: 1 },
    { name: 'highlight', maxCount: 1 },
    { name: 'section', maxCount: 1 },
    { name: 'gallery', maxCount: 5 },
    { name: 'video', maxCount: 1 },
    { name: 'brochure', maxCount: 1 }
  ]),
  createCourse
);

// Update course - Super Admin & Center Admin
router.put(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  upload.fields([
    { name: 'banner', maxCount: 1 },
    { name: 'highlight', maxCount: 1 },
    { name: 'section', maxCount: 1 },
    { name: 'gallery', maxCount: 5 },
    { name: 'video', maxCount: 1 },
    { name: 'brochure', maxCount: 1 }
  ]),
  updateCourse
);

// Delete course - Super Admin only
router.delete(
  '/:id',
  protect,
  allowRoles('super_admin'),
  deleteCourse
);

module.exports = router;
```

### `routes/courseSubjectRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const {
  createSubject,
  getSubjectsByCourse,
  getSubjectsGrouped,
  getSubjectsByCourseAdmin,
  updateSubject,
  deleteSubject,
  reorderSubjects
} = require('../controllers/courseSubjectController');

router.use(protect);

router.get('/course/:courseId/grouped', getSubjectsGrouped);
router.get('/course/:courseId', getSubjectsByCourse);

router.use(allowRoles('super_admin', 'center_admin'));

router.post('/', createSubject);
router.put('/reorder', reorderSubjects);
router.get('/admin/course/:courseId', getSubjectsByCourseAdmin);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

module.exports = router;
```

### `routes/enrollmentRoutes.js`

```javascript
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/enrollmentController');

const adminRoles  = ['super_admin', 'center_admin'];
const staffRoles  = ['super_admin', 'center_admin', 'employee'];

// ── Online enrollment flow ──────────────────────────────────────────────────
router.post('/initiate',  protect, ctrl.initiateOnlinePayment);
router.post('/verify',    protect, ctrl.verifyOnlinePayment);
router.post('/webhook',   ctrl.handleRazorpayWebhook);

// ── Offline / cash admission (admin/staff only) ─────────────────────────────
router.post('/offline',   protect, authorize(...staffRoles), ctrl.createOfflineEnrollment);

// ── Installment payments ────────────────────────────────────────────────────
router.post('/:id/installment/initiate', protect, ctrl.initiateInstallmentPayment);
router.post('/:id/installment/verify',   protect, ctrl.verifyInstallmentPayment);
router.post('/:id/installment/offline',  protect, authorize(...staffRoles), ctrl.payInstallmentOffline);

// ── Student dashboard ───────────────────────────────────────────────────────
router.get('/my',                    protect, ctrl.getMyEnrollments);
router.get('/:id/transactions',      protect, ctrl.getMyTransactions);
router.get('/:id/installments',      protect, ctrl.getInstallmentPlan);

// ── Admin ───────────────────────────────────────────────────────────────────
router.get('/',          protect, authorize(...adminRoles), ctrl.getAllEnrollments);
router.put('/:id/status', protect, authorize(...adminRoles), ctrl.updateEnrollmentStatus);

// ── Cron (internal — protect with super_admin) ──────────────────────────────
router.post('/cron/mark-overdue', protect, authorize('super_admin'), ctrl.markOverdueInstallments);

module.exports = router;
```

### `routes/paymentRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const {
   createOrder,
   verifyPayment,
   getMyEnrollments,
   checkCourseAccess,
   createBookOrder,
   verifyBookPayment,
   getMyBookOrders
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// All payment routes require authentication
router.use(protect);

// ========================================
// COURSE PAYMENT ROUTES
// ========================================

// Create Razorpay order for course
router.post('/course/create-order', createOrder);

// Verify course payment and create enrollment
router.post('/course/verify', verifyPayment);

// Get user's course enrollments
router.get('/course/my-enrollments', getMyEnrollments);

// Check course access
router.get('/course/check-access/:courseId', checkCourseAccess);

// ========================================
// BOOK PAYMENT ROUTES
// ========================================

// Create Razorpay order for book
router.post('/book/create-order', createBookOrder);

// Verify book payment and create order
router.post('/book/verify', verifyBookPayment);

// Get user's book orders
router.get('/book/my-orders', getMyBookOrders);

module.exports = router;
```

### `routes/testExamRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createTestExam,
  updateTestExam,
  deleteTestExam,
  getCourseTestExamsAdmin,
  getCourseTestSchedule,
  getTestExamAdmin,
  startTestExam
} = require('../controllers/testExamController');

const admin = authorize('super_admin', 'center_admin', 'employee');

router.post('/', protect, admin, createTestExam);
router.put('/:id', protect, admin, updateTestExam);
router.delete('/:id', protect, admin, deleteTestExam);

router.get('/course/:courseId/admin', protect, admin, getCourseTestExamsAdmin);
router.get('/course/:courseId', protect, getCourseTestSchedule);

router.get('/:id/admin', protect, admin, getTestExamAdmin);
router.get('/:id/start', protect, startTestExam);

module.exports = router;
```

### `routes/testResultRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  submitTest,
  getResultById,
  getMyResultsByCourse,
  getMyResults,
  getResultsByTestExam
} = require('../controllers/testResultController');

router.post('/submit', protect, submitTest);

router.get('/me', protect, getMyResults);
router.get('/me/course/:courseId', protect, getMyResultsByCourse);
router.get('/test-exam/:testExamId', protect, getResultsByTestExam);
router.get('/:id', protect, getResultById);

module.exports = router;
```



