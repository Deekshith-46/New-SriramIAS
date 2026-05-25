# Core Infrastructure — Server, Config, Middleware & Utils

> **Project:** Sriram-IAS Backend  
> **Volume:** `DOC_0_CORE_INFRASTRUCTURE_COMPLETE.md`  
> **Files:** 58  
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

Entry point, Express app wiring, shared middleware, utilities, root maintenance scripts, and scripts/ one-off migrations/seeds used by all modules.

---

## 2. Files in this volume

- `app.js`
- `config/cloudinary.js`
- `config/db.js`
- `config/hms.js`
- `config/razorpay.js`
- `fix-coupon-duplicate.js`
- `fix-coupon-indexes.js`
- `fix-filter-indexes.js`
- `middleware/accessMiddleware.js`
- `middleware/authMiddleware.js`
- `middleware/blogUpload.js`
- `middleware/optionalAuth.js`
- `middleware/resourceMiddleware.js`
- `middleware/roleMiddleware.js`
- `middleware/upload.js`
- `middleware/uploadAnswerWriting.js`
- `middleware/uploadRecordedLecture.js`
- `middleware/uploadResource.js`
- `middleware/validation.js`
- `migrate-course-fees.js`
- `scripts/addCategoryTypes.js`
- `scripts/assignCentersToUsers.js`
- `scripts/build-current-affairs-doc.js`
- `scripts/build-free-resources-doc.js`
- `scripts/build-lms-test-guide.js`
- `scripts/build-portal-free-resources-doc.js`
- `scripts/correctlyAssignCenters.js`
- `scripts/dropFeaturedArticleIndexes.js`
- `scripts/dropOldIndexes.js`
- `scripts/fixCenterAssignment.js`
- `scripts/mark-absent-attendance.js`
- `scripts/migrate-courses.js`
- `scripts/migrate-enrollments.js`
- `scripts/publish-lms-test.js`
- `scripts/seedData.js`
- `scripts/test-course-update.js`
- `server.js`
- `utils/answerWritingHelpers.js`
- `utils/answerWritingSeed.js`
- `utils/attendanceAccess.js`
- `utils/categorySlugFromTitle.js`
- `utils/courseAccess.js`
- `utils/courseProgressService.js`
- `utils/dnsIpv4.js`
- `utils/emailConfig.js`
- `utils/emailService.js`
- `utils/generateToken.js`
- `utils/lectureHelpers.js`
- `utils/lmsTestHelpers.js`
- `utils/lmsTestSeed.js`
- `utils/otpService.js`
- `utils/pagination.js`
- `utils/resourceConstants.js`
- `utils/resourcePortalCache.js`
- `utils/sanitizeText.js`
- `utils/studentEmail.js`
- `utils/testExamHelpers.js`
- `utils/uploadToCloudinary.js`

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

### `app.js`

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

### `config/cloudinary.js`

```javascript
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = cloudinary;
```

### `config/db.js`

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('Error: Set MONGO_URI or MONGODB_URI in your .env file');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    console.log('MongoDB Connected');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### `config/hms.js`

```javascript
const { JWTTokenBuilder } = require("@100mslive/server-sdk");
const axios = require('axios');

// 100ms API Base URL
const HMS_BASE_URL = 'https://api.100ms.live/v2';

// Initialize HMS Client
const hmsClient = {
   // Create a room
   createRoom: async (roomData) => {
      try {
         const response = await axios.post(
            `${HMS_BASE_URL}/rooms`,
            {
               name: roomData.name,
               description: roomData.description,
               template_id: roomData.template_id
            },
            {
               auth: {
                  username: process.env.HMS_ACCESS_KEY,
                  password: process.env.HMS_SECRET
               }
            }
         );
         return response.data;
      } catch (error) {
         console.error('HMS Create Room Error:', error.response?.data || error.message);
         throw error;
      }
   },

   // Generate auth token for joining room
   generateToken: async (roomId, userId, role) => {
      try {
         // FIX 9: Add token expiration (1 hour)
         const expirationTime = Math.floor(Date.now() / 1000) + (60 * 60);

         const tokenBuilder = new JWTTokenBuilder()
            .setAccessKey(process.env.HMS_ACCESS_KEY)
            .setSecret(process.env.HMS_SECRET)
            .setRoomId(roomId)
            .setUserId(userId)
            .setRole(role)
            .setType('app')
            .setVersion(2)
            .setExpiration(expirationTime);

         const token = tokenBuilder.build();
         return token;
      } catch (error) {
         console.error('HMS Token Generation Error:', error.message);
         throw error;
      }
   }
};

module.exports = hmsClient;
```

### `config/razorpay.js`

```javascript
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
   key_id: process.env.RAZORPAY_KEY_ID,
   key_secret: process.env.RAZORPAY_KEY_SECRET
});

module.exports = razorpay;
```

### `fix-coupon-duplicate.js`

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const Coupon = require('./models/Coupon');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
   .then(() => console.log('✅ MongoDB Connected'))
   .catch(err => {
      console.error('❌ MongoDB Connection Error:', err);
      process.exit(1);
   });

async function findAndDeleteCoupon() {
   try {
      const couponCode = 'BOOK100';
      
      console.log('\n🔍 Searching for coupon:', couponCode);
      
      // Find ALL coupons with this code (including soft-deleted)
      const coupons = await Coupon.find({ 
         couponCode: couponCode.toUpperCase() 
      });
      
      if (coupons.length === 0) {
         console.log('\n❌ No coupons found with code:', couponCode);
         console.log('✅ You can safely create a new coupon!');
         process.exit(0);
      }
      
      console.log(`\n📋 Found ${coupons.length} coupon(s):`);
      
      coupons.forEach((coupon, index) => {
         console.log(`\n--- Coupon ${index + 1} ---`);
         console.log('   ID:', coupon._id);
         console.log('   Name:', coupon.couponName);
         console.log('   Code:', coupon.couponCode);
         console.log('   Type:', coupon.type);
         console.log('   Value:', coupon.value);
         console.log('   applicableFor:', coupon.applicableFor);
         console.log('   Status:', coupon.status);
         console.log('   isDeleted:', coupon.isDeleted);
         console.log('   Created At:', coupon.createdAt);
      });
      
      console.log('\n⚠️  Action: HARD DELETING all coupons with this code...');
      
      // Hard delete all coupons with this code
      const result = await Coupon.deleteMany({ 
         couponCode: couponCode.toUpperCase() 
      });
      
      console.log(`\n✅ Successfully deleted ${result.deletedCount} coupon(s)!`);
      console.log('   You can now create a new coupon with code: BOOK100');
      console.log('\n💡 Tip: Use Postman to create the coupon now.');
      
      process.exit(0);
      
   } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.error(error);
      process.exit(1);
   }
}

findAndDeleteCoupon();
```

### `fix-coupon-indexes.js`

```javascript
/**
 * Fix Duplicate Key Error on Coupons Collection
 * 
 * Problem: Old index 'code_1' exists from previous schema
 * Solution: Drop old index and rebuild new indexes
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const fixCouponIndexes = async () => {
   try {
      console.log('🔧 Fixing coupon indexes...\n');

      await connectDB();

      const db = mongoose.connection.db;
      const collection = db.collection('coupons');

      // Step 1: Get all existing indexes
      console.log('📋 Current indexes:');
      const indexes = await collection.indexes();
      indexes.forEach((idx, i) => {
         console.log(`   ${i + 1}. ${idx.name}: ${JSON.stringify(idx.key)}`);
      });

      // Step 2: Drop old 'code_1' index if exists
      const oldIndexExists = indexes.some(idx => idx.name === 'code_1');
      
      if (oldIndexExists) {
         console.log('\n❌ Dropping old index: code_1');
         await collection.dropIndex('code_1');
         console.log('✅ Old index dropped successfully');
      } else {
         console.log('\n✅ Old index code_1 not found (already dropped)');
      }

      // Step 3: Drop old 'expiryDate_1' index if exists
      const oldExpiryIndex = indexes.some(idx => idx.name === 'expiryDate_1');
      if (oldExpiryIndex) {
         console.log('❌ Dropping old index: expiryDate_1');
         await collection.dropIndex('expiryDate_1');
         console.log('✅ Old expiryDate_1 index dropped');
      }

      // Step 4: Check for documents with null/missing couponCode
      console.log('\n🔍 Checking for documents with missing couponCode...');
      const docsWithNullCode = await collection.countDocuments({
         $or: [
            { couponCode: null },
            { couponCode: { $exists: false } }
         ]
      });

      if (docsWithNullCode > 0) {
         console.log(`⚠️  Found ${docsWithNullCode} documents with missing couponCode`);
         console.log('🗑️  Deleting these old documents automatically...\n');
         
         // Show sample documents before deletion
         const samples = await collection.find({
            $or: [
               { couponCode: null },
               { couponCode: { $exists: false } }
            ]
         }).limit(5).toArray();

         console.log('Documents to be deleted:');
         samples.forEach((doc, i) => {
            console.log(`   ${i + 1}. _id: ${doc._id}`);
            console.log(`      code: ${doc.code || 'null'}`);
            console.log(`      couponName: ${doc.couponName || 'N/A'}`);
         });

         // Delete old documents with missing couponCode
         const deleteResult = await collection.deleteMany({
            $or: [
               { couponCode: null },
               { couponCode: { $exists: false } }
            ]
         });

         console.log(`\n✅ Deleted ${deleteResult.deletedCount} old documents`);
      } else {
         console.log('✅ All documents have valid couponCode');
      }

      // Step 5: Rebuild indexes from schema
      console.log('\n🔄 Rebuilding indexes from schema...');
      const Coupon = require('./models/Coupon');
      await Coupon.syncIndexes();
      console.log('✅ Indexes rebuilt successfully');

      // Step 6: Verify new indexes
      console.log('\n✅ New indexes:');
      const newIndexes = await collection.indexes();
      newIndexes.forEach((idx, i) => {
         console.log(`   ${i + 1}. ${idx.name}: ${JSON.stringify(idx.key)}`);
      });

      console.log('\n✅ Coupon indexes fixed successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. If you have old documents with null couponCode, delete them manually');
      console.log('   2. Restart your Node.js server');
      console.log('   3. Try creating a coupon again');

      process.exit(0);

   } catch (error) {
      console.error('❌ Error fixing indexes:', error.message);
      process.exit(1);
   }
};

fixCouponIndexes();
```

### `fix-filter-indexes.js`

```javascript
require('dotenv').config();
const mongoose = require('mongoose');

async function fixFilterIndexes() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI not found in .env file');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const collection = mongoose.connection.collection('filters');

    // Get all existing indexes
    const indexes = await collection.indexes();
    console.log('\n📋 Existing indexes:');
    indexes.forEach((idx, i) => {
      console.log(`${i + 1}. ${JSON.stringify(idx)}`);
    });

    // Drop all indexes except _id_
    for (const idx of indexes) {
      if (idx.name !== '_id_') {
        console.log(`\n🗑️  Dropping index: ${idx.name}`);
        await collection.dropIndex(idx.name);
      }
    }

    console.log('\n✅ All old indexes dropped');

    // Create new compound unique index
    console.log('\n📝 Creating new compound unique index...');
    await collection.createIndex(
      { type: 1, value: 1, categoryId: 1, subCategoryId: 1 },
      { 
        unique: true, 
        sparse: true,
        name: 'type_1_value_1_categoryId_1_subCategoryId_1'
      }
    );

    console.log('✅ New index created successfully');

    // Verify indexes
    const newIndexes = await collection.indexes();
    console.log('\n📋 New indexes:');
    newIndexes.forEach((idx, i) => {
      console.log(`${i + 1}. ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n🎉 Filter indexes fixed successfully!');
    console.log('You can now create filters with different subCategoryIds');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixFilterIndexes();
```

### `middleware/accessMiddleware.js`

```javascript
const Enrollment = require('../models/Enrollment');

// Middleware to check course access for enrolled students
const checkCourseAccess = async (req, res, next) => {
  try {
    const enrollmentId = req.params.enrollmentId || req.params.id;
    const userId = req.user._id;

    if (!enrollmentId) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment ID required'
      });
    }

    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      userId: userId,
      isDeleted: false
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check if access has expired
    if (enrollment.accessEndDate && new Date(enrollment.accessEndDate) < new Date()) {
      // Update enrollment status if not already expired
      if (enrollment.accessStatus !== 'EXPIRED') {
        enrollment.accessStatus = 'EXPIRED';
        enrollment.enrollmentStatus = enrollment.enrollmentStatus === 'ACTIVE' ? 'COMPLETED' : enrollment.enrollmentStatus;
        enrollment.courseCompletionStatus = 'COMPLETED';
        enrollment.expiredAt = enrollment.accessEndDate;
        await enrollment.save();
      }

      return res.status(403).json({
        success: false,
        message: 'Course access expired',
        expiredAt: enrollment.accessEndDate
      });
    }

    // Check if enrollment is active
    if (enrollment.enrollmentStatus === 'CANCELLED') {
      return res.status(403).json({
        success: false,
        message: 'Enrollment has been cancelled'
      });
    }

    if (enrollment.enrollmentStatus === 'PENDING') {
      return res.status(403).json({
        success: false,
        message: 'Enrollment is pending payment'
      });
    }

    // Attach enrollment to request for further use
    req.enrollment = enrollment;
    next();

  } catch (error) {
    console.error('checkCourseAccess middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Middleware to check if user is enrolled in a course
const checkEnrollment = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    const userId = req.user._id;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID required'
      });
    }

    const enrollment = await Enrollment.findOne({
      courseId: courseId,
      userId: userId,
      isDeleted: false,
      enrollmentStatus: { $in: ['ACTIVE', 'COMPLETED'] }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    // Check access expiry
    if (enrollment.accessEndDate && new Date(enrollment.accessEndDate) < new Date()) {
      if (enrollment.accessStatus !== 'EXPIRED') {
        enrollment.accessStatus = 'EXPIRED';
        enrollment.enrollmentStatus = enrollment.enrollmentStatus === 'ACTIVE' ? 'COMPLETED' : enrollment.enrollmentStatus;
        enrollment.courseCompletionStatus = 'COMPLETED';
        enrollment.expiredAt = enrollment.accessEndDate;
        await enrollment.save();
      }

      return res.status(403).json({
        success: false,
        message: 'Course access expired',
        expiredAt: enrollment.accessEndDate
      });
    }

    req.enrollment = enrollment;
    next();

  } catch (error) {
    console.error('checkEnrollment middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  checkCourseAccess,
  checkEnrollment
};
```

### `middleware/authMiddleware.js`

```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (!req.user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Authorize specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
```

### `middleware/blogUpload.js`

```javascript
const multer = require('multer');

// Store in memory (for Cloudinary upload)
const storage = multer.memoryStorage();

// File filter for blog images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, AVIF, and GIF images allowed.'), false);
  }
};

const blogUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per image
    maxCount: 6 // 1 thumbnail + 5 article images
  }
});

module.exports = blogUpload;
```

### `middleware/optionalAuth.js`

```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/** Attach req.user when Bearer token is valid; continue as guest otherwise. */
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.isActive) {
      req.user = user;
    }
  } catch (_err) {
    // ignore invalid token for public portal reads
  }

  next();
};

module.exports = optionalAuth;
```

### `middleware/resourceMiddleware.js`

```javascript
/**
 * Middleware to add center-based filtering for Center Admins
 * Super Admin sees all data, Center Admin sees only their center's data
 */
const filterByCenter = (req, res, next) => {
  // Initialize query filter object if not exists
  if (!req.queryFilter) {
    req.queryFilter = {};
  }

  // If user is Center Admin, filter by their center
  if (req.user && req.user.role === 'center_admin') {
    if (req.user.center) {
      req.queryFilter.centerId = req.user.center;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Center Admin must be assigned to a center'
      });
    }
  }

  // Super Admin sees all data (no filter added)
  next();
};

/**
 * Middleware for pagination, sorting, and search
 * Adds standardized pagination to all list endpoints
 */
const paginate = (req, res, next) => {
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  req.pagination = {
    page,
    limit,
    skip
  };

  // Sorting
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  req.sort = {
    [sortBy]: sortOrder
  };

  // Search
  if (req.query.search) {
    req.search = req.query.search.trim();
  }

  next();
};

/**
 * Helper function to build pagination response
 */
const buildPaginationResponse = (data, total, page, limit) => {
  return {
    success: true,
    count: data.length,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
    data
  };
};

module.exports = {
  filterByCenter,
  paginate,
  buildPaginationResponse
};
```

### `middleware/roleMiddleware.js`

```javascript
// Role-based access control middleware

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  CENTER_ADMIN: 'center_admin',
  EMPLOYEE: 'employee',
  STUDENT: 'student',
  PARENT: 'parent'
};

// Check if user has required role(s)
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Check if user belongs to specific location (for center admins and employees)
const checkLocation = (req, res, next) => {
  if (req.user.role === ROLES.SUPER_ADMIN) {
    return next(); // Super admin can access all locations
  }

  const requestedLocation = req.params.location || req.body.location;
  
  if (requestedLocation && req.user.location !== requestedLocation) {
    return res.status(403).json({ 
      message: 'Access denied. You can only access your assigned location.' 
    });
  }

  next();
};

module.exports = {
  ROLES,
  allowRoles,
  checkLocation
};
```

### `middleware/upload.js`

```javascript
const multer = require('multer');

// Store in memory (for Cloudinary upload)
const storage = multer.memoryStorage();

// File filter (images + videos + PDF only)
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'video/mp4',
    'application/pdf'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, AVIF, GIF, MP4, and PDF allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = upload;
```

### `middleware/uploadAnswerWriting.js`

```javascript
const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
  }
};

const uploadAnswerWriting = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }
});

module.exports = uploadAnswerWriting;
```

### `middleware/uploadRecordedLecture.js`

```javascript
const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'video/mp4',
    'application/pdf'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, MP4 videos, and PDFs are allowed.'), false);
  }
};

const uploadRecordedLecture = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024
  }
});

module.exports = uploadRecordedLecture;
```

### `middleware/uploadResource.js`

```javascript
const multer = require('multer');

// Store in memory (for Cloudinary upload)
const storage = multer.memoryStorage();

// File filter for PDF files only
const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// File filter for images only
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image type. Only JPEG, PNG, WebP, AVIF, and GIF allowed.'), false);
  }
};

// Upload middleware for PDF files
const uploadPDF = multer({
  storage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for PDFs
  }
});

// Upload middleware for image files
const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for images
  }
});

// Combined upload for resources (PDF + optional image)
const uploadResource = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and image files allowed.'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

module.exports = {
  uploadPDF,
  uploadImage,
  uploadResource
};
```

### `middleware/validation.js`

```javascript
const Joi = require('joi');
const { isGmailAddress, normalizeEmail } = require('../utils/studentEmail');

const studentGmailEmail = Joi.string()
  .email()
  .custom((value, helpers) => {
    const normalized = normalizeEmail(value);
    if (!isGmailAddress(normalized)) {
      return helpers.error('any.invalid');
    }
    return normalized;
  })
  .messages({
    'any.invalid': 'Student email must be a Gmail address (e.g. name@gmail.com)'
  });

// Validation schemas
const validations = {
  // Super Admin Login
  superAdminLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  // Regular Login (Center Admin & Employee)
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  // Send OTP (Gmail enforced for student login in controller when role is student)
  sendOtp: Joi.object({
    mobile: Joi.string()
      .pattern(/^[6-9]\d{9}$/)
      .messages({ 'string.pattern.base': 'Invalid Indian mobile number' }),
    email: Joi.string().email(),
  }).or('mobile', 'email').messages({
    'object.missing': 'Either mobile or email is required'
  }),

  // Verify OTP
  verifyOtp: Joi.object({
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/),
    email: Joi.string().email(),
    userId: Joi.string(),
    otp: Joi.string().length(6).pattern(/^\d{6}$/).required()
      .messages({ 
        'string.length': 'OTP must be 6 digits',
        'string.pattern.base': 'OTP must contain only numbers'
      })
  }).or('mobile', 'email', 'userId').messages({
    'object.missing': 'Either mobile, email, or userId is required'
  }),

  // Student Signup (email must be @gmail.com when provided)
  studentSignup: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/)
      .messages({ 'string.pattern.base': 'Invalid Indian mobile number' }),
    email: studentGmailEmail
  }).or('mobile', 'email').messages({
    'object.missing': 'Either mobile or email is required'
  }),

  // Verify Student Signup OTP
  verifyStudentSignup: Joi.object({
    userId: Joi.string().required()
      .messages({ 'any.required': 'User ID is required' }),
    otp: Joi.string().length(6).pattern(/^\d{6}$/).required()
      .messages({ 
        'string.length': 'OTP must be 6 digits',
        'string.pattern.base': 'OTP must contain only numbers'
      })
  }),

  // Parent Login Request
  parentLoginRequest: Joi.object({
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/)
      .messages({ 'string.pattern.base': 'Invalid parent mobile number' }),
    email: Joi.string().email()
  }).or('mobile', 'email').messages({
    'object.missing': 'Either mobile or email is required'
  }),

  // Create Center Admin
  createCenterAdmin: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
      .messages({ 'string.min': 'Password must be at least 8 characters' }),
    location: Joi.string().valid('Hyderabad', 'New Delhi', 'Pune').required()
  }),

  // Create Employee
  createEmployee: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
      .messages({ 'string.min': 'Password must be at least 8 characters' }),
    permissions: Joi.array().items(Joi.string()),
    center: Joi.string().valid('Hyderabad', 'New Delhi', 'Pune')
  }),

  // Update User Status
  updateUserStatus: Joi.object({
    isActive: Joi.boolean().required()
  }),

  // Update Profile
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

  // Change Password
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
      .messages({ 'string.min': 'New password must be at least 8 characters' })
  }),

  // Update Parent Details (Student)
  updateParentDetails: Joi.object({
    parentName: Joi.string().min(2).max(100).required()
      .messages({
        'string.min': 'Parent name must be at least 2 characters',
        'any.required': 'Parent name is required'
      }),
    parentMobile: Joi.string().pattern(/^[6-9]\d{9}$/).required()
      .messages({
        'string.pattern.base': 'Invalid Indian mobile number',
        'any.required': 'Parent mobile is required'
      }),
    parentEmail: Joi.string().email().required()
      .messages({
        'string.email': 'Invalid email address',
        'any.required': 'Parent email is required'
      })
  }),

  // Center Data Management
  createCenter: Joi.object({
    centerId: Joi.string().required()
      .messages({
        'any.required': 'Center ID is required'
      }),
    title: Joi.string().min(2).max(100).required().trim()
      .messages({
        'string.min': 'Title must be at least 2 characters',
        'string.max': 'Title cannot exceed 100 characters',
        'any.required': 'Title is required'
      }),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).required()
      .messages({
        'string.pattern.base': 'Invalid Indian mobile number'
      }),
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Invalid email address',
        'any.required': 'Email is required'
      })
  }),

  updateCenter: Joi.object({
    title: Joi.string().min(2).max(100).trim(),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/),
    email: Joi.string().email()
  }).min(1),

  createSuccessStory: Joi.object({
    name: Joi.string().min(2).max(100).required().trim()
      .messages({
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot exceed 100 characters',
        'any.required': 'Name is required'
      }),
    rank: Joi.string().min(1).max(50).required().trim()
      .messages({
        'string.min': 'Rank is required',
        'string.max': 'Rank cannot exceed 50 characters',
        'any.required': 'Rank is required'
      })
  }),

  updateSuccessStory: Joi.object({
    name: Joi.string().min(2).max(100).trim(),
    rank: Joi.string().min(1).max(50).trim()
  }).min(1),

  createFaculty: Joi.object({
    name: Joi.string().min(2).max(100).required().trim()
      .messages({
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot exceed 100 characters',
        'any.required': 'Name is required'
      }),
    title: Joi.string().min(2).max(100).required().trim()
      .messages({
        'string.min': 'Title must be at least 2 characters',
        'string.max': 'Title cannot exceed 100 characters',
        'any.required': 'Title is required'
      }),
    description: Joi.string().min(10).max(2000).required().trim()
      .messages({
        'string.min': 'Description must be at least 10 characters',
        'string.max': 'Description cannot exceed 2000 characters',
        'any.required': 'Description is required'
      })
  }),

  updateFaculty: Joi.object({
    name: Joi.string().min(2).max(100).trim(),
    title: Joi.string().min(2).max(100).trim(),
    description: Joi.string().min(10).max(2000).trim()
  }).min(1)
};

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: details
      });
    }

    // Replace req.body with validated/sanitized data
    req.body = value;
    next();
  };
};

module.exports = {
  validations,
  validate
};
```

### `migrate-course-fees.js`

```javascript
/**
 * Migrate Course Fees to New Structure
 * 
 * Old structure:
 * fees: {
 *   online: 100000,
 *   offline: 150000
 * }
 * 
 * New structure:
 * fees: {
 *   online: {
 *     actualPrice: 100000,
 *     discountPercent: 0,
 *     discountedPrice: 100000,
 *     hasDiscount: false,
 *     offerText: ''
 *   },
 *   offline: { ... }
 * }
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const migrateCourseFees = async () => {
   try {
      console.log('🔧 Migrating course fees structure...\n');

      await connectDB();

      const Course = require('./models/Course');

      // Find all courses with old fee structure
      const coursesWithOldFees = await Course.find({
         $or: [
            { 'fees.online': { $type: 'number' } },
            { 'fees.offline': { $type: 'number' } }
         ]
      });

      console.log(`📋 Found ${coursesWithOldFees.length} courses with old fee structure\n`);

      if (coursesWithOldFees.length === 0) {
         console.log('✅ All courses already have new fee structure. No migration needed.');
         process.exit(0);
      }

      let migratedCount = 0;
      let skippedCount = 0;

      for (const course of coursesWithOldFees) {
         try {
            const oldOnline = course.fees.online;
            const oldOffline = course.fees.offline;

            // Check if already migrated (skip if new structure)
            if (typeof oldOnline === 'object' && oldOnline.actualPrice !== undefined) {
               console.log(`⏭️  Skipped: ${course.title} (already migrated)`);
               skippedCount++;
               continue;
            }

            // Get old values (handle if they're numbers or already objects)
            const onlineActualPrice = typeof oldOnline === 'number' ? oldOnline : 0;
            const offlineActualPrice = typeof oldOffline === 'number' ? oldOffline : 0;

            // Update to new structure
            course.fees = {
               online: {
                  actualPrice: onlineActualPrice,
                  discountPercent: 0,
                  discountedPrice: onlineActualPrice,
                  hasDiscount: false,
                  offerText: ''
               },
               offline: {
                  actualPrice: offlineActualPrice,
                  discountPercent: 0,
                  discountedPrice: offlineActualPrice,
                  hasDiscount: false,
                  offerText: ''
               },
               description: course.fees.description || ''
            };

            await course.save();
            
            console.log(`✅ Migrated: ${course.title}`);
            console.log(`   Online: ₹${onlineActualPrice} → New structure`);
            console.log(`   Offline: ₹${offlineActualPrice} → New structure\n`);
            
            migratedCount++;
         } catch (error) {
            console.error(`❌ Error migrating course ${course.title}:`, error.message);
         }
      }

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 Migration Complete!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ Migrated: ${migratedCount} courses`);
      console.log(`⏭️  Skipped: ${skippedCount} courses`);
      console.log(`📊 Total processed: ${coursesWithOldFees.length} courses`);
      console.log('\n📝 Next steps:');
      console.log('   1. Restart your Node.js server');
      console.log('   2. Test course creation with new fee fields');
      console.log('   3. Verify existing courses display correctly');

      process.exit(0);

   } catch (error) {
      console.error('❌ Migration error:', error.message);
      process.exit(1);
   }
};

migrateCourseFees();
```

### `scripts/addCategoryTypes.js`

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

// Mapping of category names to category types
const categoryTypeMapping = {
  'GS Foundation': 'gs_foundation',
  'Mentorship': 'mentorship',
  'Optional': 'optional',
  'Test Series': 'test_series',
  'CSAT': 'csat',
  'Enrichment': 'enrichment'
};

async function updateCategories() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Update each category with its type
    for (const [name, type] of Object.entries(categoryTypeMapping)) {
      const category = await Category.findOne({ name });
      
      if (category) {
        // Only update if categoryType doesn't exist or is different
        if (category.categoryType !== type) {
          category.categoryType = type;
          await category.save();
          console.log(`✅ Updated "${name}" -> ${type}`);
        } else {
          console.log(`⏭️  "${name}" already has type: ${type}`);
        }
      } else {
        console.log(`⚠️  Category "${name}" not found - skipping`);
      }
    }

    // Show all categories with their types
    console.log('\n📊 Final Category State:');
    const allCategories = await Category.find({}, 'name categoryType');
    allCategories.forEach(cat => {
      console.log(`  - ${cat.name}: ${cat.categoryType || 'NOT SET'}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Migration complete');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

updateCategories();
```

### `scripts/assignCentersToUsers.js`

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Center = require('../models/Center');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

async function assignCentersToUsers() {
  try {
    console.log('\n🔍 Starting center assignment...\n');

    // Get all centers
    const centers = await Center.find();
    console.log(`📍 Found ${centers.length} centers:`, centers.map(c => c.name));

    // Get all center_admin and employee users
    const users = await User.find({ 
      role: { $in: ['center_admin', 'employee'] }
    });

    console.log(`\n👥 Found ${users.length} users that need center assignment\n`);

    if (users.length === 0) {
      console.log('✅ No users need center assignment');
      process.exit(0);
    }

    // Show users without center
    const usersWithoutCenter = users.filter(u => !u.center);
    console.log(`⚠️  ${usersWithoutCenter.length} users without center:\n`);
    
    usersWithoutCenter.forEach(user => {
      console.log(`- ${user.name} (${user.email || user.mobile}) - Role: ${user.role}`);
    });

    console.log('\n💡 To assign centers, you need to:');
    console.log('1. Use the admin dashboard to assign centers to users');
    console.log('2. OR update users manually in database');
    console.log('3. OR use the update user API\n');

    // Example: Assign first center to first user without center (for testing)
    if (usersWithoutCenter.length > 0 && centers.length > 0) {
      console.log('\n🧪 Demo: Assigning first center to first user...\n');
      
      const user = usersWithoutCenter[0];
      const center = centers[0];
      
      user.center = center._id;
      await user.save();
      
      console.log(`✅ Assigned "${center.name}" to "${user.name}"`);
      console.log(`   User ID: ${user._id}`);
      console.log(`   Center ID: ${center._id}\n`);
    }

    console.log('✅ Center assignment complete!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

assignCentersToUsers();
```

### `scripts/build-current-affairs-doc.js`

```javascript
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const header = `# Current Affairs — Complete Code & API Guide

> **Project:** Sriram-IAS  
> **Module:** Free Resources → **Current Affairs** tab  
> **moduleType:** \`CURRENT_AFFAIRS\` on \`ResourceCategory\`  
> **Same \`Resource\` table** as NCERT/PYQ (no separate Current Affairs table)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Model](#2-data-model)
3. [Admin CMS Flow](#3-admin-cms-flow)
4. [Portal / Student APIs](#4-portal--student-apis)
5. [Filter Types](#5-filter-types)
6. [Constants](#6-constants)
7. [Models](#7-models)
8. [Controllers & Services](#8-controllers--services)
9. [Routes](#9-routes)
10. [Postman Examples](#10-postman-examples)

---

## 1. Overview

\`\`\`text
Student UI tabs:
  ├── Current Affairs     → moduleType: CURRENT_AFFAIRS
  └── Free Resources      → moduleType: FREE_RESOURCES (NCERT, PYQ, etc.)

Admin CMS:     /api/resources/*  (create category, filters, upload PDFs)
Student read:  /api/portal/free-resources/*
\`\`\`

### Current Affairs filters (portal)

| UI filter | Filter.type in DB | Resource field |
|-----------|-------------------|----------------|
| Year | YEAR | yearId |
| Month | MONTH | monthId |
| Type (Daily / Magazine / Infographic) | CURRENT_AFFAIRS_TYPE | currentAffairsTypeId (API: typeId) |

### resourceType on uploads

\`PDF\` | \`ARTICLE\` | \`MAGAZINE\` | \`INFOGRAPHIC\` | \`VIDEO\` (default PDF)

---

## 2. Data Model

\`\`\`text
ResourceCategory { name, moduleType: "CURRENT_AFFAIRS", thumbnail }
       ↓
Filter { type: YEAR | MONTH | CURRENT_AFFAIRS_TYPE, value, categoryId }
       ↓
Resource { title, fileUrl, categoryId, yearId, monthId, currentAffairsTypeId, resourceType }
\`\`\`

---

## 3. Admin CMS Flow

### Step 1 — Create category

\`\`\`http
POST /api/resources/categories
Authorization: Bearer {{adminToken}}
Content-Type: multipart/form-data

name=Daily Current Affairs
moduleType=CURRENT_AFFAIRS
description=Daily updates
thumbnail=<file optional>
\`\`\`

### Step 2 — Create filters

\`\`\`http
POST /api/resources/filters
Authorization: Bearer {{adminToken}}
Content-Type: application/json
\`\`\`

\`\`\`json
{ "type": "YEAR", "value": "2026", "categoryId": "{{categoryId}}" }
{ "type": "MONTH", "value": "May", "categoryId": "{{categoryId}}" }
{ "type": "CURRENT_AFFAIRS_TYPE", "value": "Daily Current Affairs", "categoryId": "{{categoryId}}" }
\`\`\`

### Step 3 — Upload PDF resource

\`\`\`http
POST /api/resources/files
Authorization: Bearer {{adminToken}}
multipart: file, title, categoryId, yearId, monthId, typeId, resourceType=PDF
\`\`\`

(\`typeId\` is stored as \`currentAffairsTypeId\`.)

**Validation:** \`yearId\` is required when category \`moduleType === CURRENT_AFFAIRS\`.

---

## 4. Portal / Student APIs

| Method | Endpoint |
|--------|----------|
| GET | \`/api/portal/free-resources/home\` → \`currentAffairs[]\` |
| GET | \`/api/portal/free-resources/categories?moduleType=CURRENT_AFFAIRS\` |
| GET | \`/api/portal/free-resources/filters?moduleType=CURRENT_AFFAIRS\` |
| GET | \`/api/portal/free-resources/resources?moduleType=CURRENT_AFFAIRS&yearId=&monthId=&typeId=\` |
| GET | \`/api/portal/free-resources/resources/:id\` |
| GET | \`/api/portal/free-resources/resources/:id/view\` |
| GET | \`/api/portal/free-resources/resources/:id/download\` |

### Filters response

\`\`\`json
{
  "success": true,
  "data": {
    "years": [{ "_id": "", "value": "2026", "type": "YEAR" }],
    "months": [{ "_id": "", "value": "May", "type": "MONTH" }],
    "types": [{ "_id": "", "value": "Daily Current Affairs", "type": "CURRENT_AFFAIRS_TYPE" }]
  }
}
\`\`\`

### List response (cards)

\`\`\`json
{
  "success": true,
  "filters": { "years": [], "months": [], "types": [] },
  "resources": [
    {
      "_id": "",
      "title": "April Current Affairs 2026",
      "resourceType": "PDF",
      "pdfUrl": "https://...",
      "filters": { "year": "2026", "month": "April", "type": "Daily Current Affairs" }
    }
  ],
  "pagination": { "total": 1, "page": 1, "limit": 12 }
}
\`\`\`

---

## 5. Filter Types

Enum on \`Filter\` model:

\`\`\`text
SUBJECT | CLASS | PAPER | YEAR | MONTH | CURRENT_AFFAIRS_TYPE
\`\`\`

Current Affairs uses: **YEAR**, **MONTH**, **CURRENT_AFFAIRS_TYPE**

---

`;

const codeFiles = [
  ['6. Constants', 'utils/resourceConstants.js'],
  ['7.1 ResourceCategory', 'models/ResourceCategory.js'],
  ['7.2 Filter', 'models/Filter.js'],
  ['7.3 Resource', 'models/Resource.js'],
  ['7.4 ResourceDownload', 'models/ResourceDownload.js'],
  ['7.5 ResourceViewHistory', 'models/ResourceViewHistory.js'],
  ['8.1 filterController', 'controllers/filterController.js'],
  ['8.2 resourceCategoryController (moduleType)', 'controllers/resourceCategoryController.js'],
  ['8.3 resourceController (CA validation)', 'controllers/resourceController.js'],
  ['8.4 resourceService (CA logic)', 'services/resourceService.js'],
  ['8.5 portalFreeResourceController', 'controllers/portalFreeResourceController.js'],
  ['9.1 filterRoutes', 'routes/filterRoutes.js'],
  ['9.2 portalFreeResourceRoutes', 'routes/portalFreeResourceRoutes.js'],
  ['9.3 resourceRoutes (categories)', 'routes/resourceRoutes.js'],
  ['9.4 resourceFileRoutes', 'routes/resourceFileRoutes.js']
];

let md = header;
md += '## 6. Constants\n\n';
md += '## 7. Models\n\n';
md += '## 8. Controllers & Services\n\n';
md += '## 9. Routes\n\n';

for (const [title, rel] of codeFiles) {
  const code = read(rel);
  md += `### ${title}\n\n**File:** \`${rel}\`\n\n\`\`\`javascript\n${code}\n\`\`\`\n\n---\n\n`;
}

const postmanSnippet = read('PORTAL_FREE_RESOURCES_POSTMAN_COLLECTION.json');
const postman = JSON.parse(postmanSnippet);
const portalFolder = postman.item.find((i) => i.name.includes('Portal'));
const caRequests = portalFolder?.item?.filter((r) =>
  /Current Affairs|CURRENT_AFFAIRS/i.test(r.name)
) || [];

md += `## 10. Postman Examples\n\nImport \`PORTAL_FREE_RESOURCES_POSTMAN_COLLECTION.json\`.\n\nCurrent Affairs requests in collection:\n\n`;
for (const r of caRequests) {
  md += `- **${r.name}**\n`;
}

md += `\n\`\`\`json\n${JSON.stringify(caRequests, null, 2)}\n\`\`\`\n`;

md += `\n---\n\n## app.js registration\n\n\`\`\`javascript\napp.use('/api/resources', resourceRoutes);\napp.use('/api/resources/filters', filterRoutes);\napp.use('/api/resources/files', resourceFileRoutes);\napp.use('/api/portal/free-resources', portalFreeResourceRoutes);\n\`\`\`\n`;

const out = path.join(root, 'CURRENT_AFFAIRS_COMPLETE_CODE.md');
fs.writeFileSync(out, md);
console.log('Written:', out, md.length, 'chars');
```

### `scripts/build-free-resources-doc.js`

```javascript
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const appSnippet = [
  '// Free Resources CMS routes (from app.js)',
  "app.use('/api/resources', resourceRoutes);",
  "app.use('/api/resources/filters', filterRoutes);",
  "app.use('/api/resources/files', resourceFileRoutes);",
  "app.use('/api/resources/mock-tests', mockTestRoutes);",
  "app.use('/api/resources/questions', questionRoutes);"
].join('\n');

const header = `# Free Resources — Complete Code & API Guide

> **Project:** Sriram-IAS  
> **Base URL:** \`http://localhost:5000\`  
> **UI:** Sidebar → **Free Resources**

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [API Endpoints](#2-api-endpoints)
3. [Module Filter Rules](#3-module-filter-rules)
4. [Route Registration](#4-route-registration)
5. [Models](#5-models)
6. [Middleware](#6-middleware)
7. [Routes](#7-routes)
8. [Controllers](#8-controllers)

---

## 1. System Overview

\`\`\`text
Free Resources
├── Categories & SubCategories     → /api/resources
├── Dynamic Filters                → /api/resources/filters
├── PDF / Study files              → /api/resources/files
├── Mock Tests                     → /api/resources/mock-tests
└── Question maintenance           → /api/resources/questions
\`\`\`

| Module | Category name contains | Required filters on file upload |
|--------|------------------------|----------------------------------|
| NCERT | \`ncert\` | \`subjectId\`, \`classId\` |
| PYQ | \`previous year\` or \`pyq\` | \`subCategoryId\`, \`paperId\`, \`yearId\` |
| Study Material | \`study material\` | \`subCategoryId\` only |

**Filter types:** \`SUBJECT\`, \`CLASS\`, \`PAPER\`, \`YEAR\`

---

## 2. API Endpoints

### Categories — \`/api/resources\`

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | \`/categories\` | Public |
| GET | \`/categories/:id\` | Public |
| POST | \`/categories\` | Admin + thumbnail |
| PUT | \`/categories/:id\` | Admin |
| DELETE | \`/categories/:id\` | Admin |

### SubCategories — \`/api/resources\`

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | \`/subcategories\` | Public |
| GET | \`/subcategories/category/:categoryId\` | Public |
| POST | \`/subcategories\` | Admin |
| PUT | \`/subcategories/:id\` | Admin |
| DELETE | \`/subcategories/:id\` | Admin |

### Filters — \`/api/resources/filters\`

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | \`/\` | Public |
| GET | \`/category/:categoryId\` | Public (grouped) |
| POST | \`/\` | Admin |
| PUT | \`/:id\` | Admin |
| DELETE | \`/:id\` | Admin |

### Files — \`/api/resources/files\`

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | \`/?categoryId=&subjectId=&page=1\` | Public |
| GET | \`/:id\` | Public (increments downloads) |
| POST | \`/\` | Admin multipart: \`file\`, optional \`thumbnail\` |
| PUT | \`/:id\` | Admin |
| DELETE | \`/:id\` | Admin |

### Mock Tests — \`/api/resources/mock-tests\`

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | \`/\` | Public |
| GET | \`/:id\` | Public |
| POST | \`/\` | Admin |
| PUT | \`/:id\` | Admin |
| DELETE | \`/:id\` | Admin |
| POST | \`/:id/attempt\` | Student (one attempt) |
| GET | \`/results\` | Logged in |
| GET | \`/results/:id\` | Logged in |
| POST | \`/:id/add-question\` | Admin |
| POST | \`/:id/add-questions\` | Admin |
| DELETE | \`/:id/question/:questionId\` | Admin |

### Questions — \`/api/resources/questions\`

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | \`/:id\` | Admin |
| PUT/PATCH | \`/:id\` | Admin |
| DELETE | \`/:id\` | Admin |

---

## 3. Module Filter Rules

Validated in \`controllers/resourceController.js\` when creating a file resource.

---

`;

const files = [
  ['5.1 ResourceCategory', 'models/ResourceCategory.js'],
  ['5.2 SubCategory', 'models/SubCategory.js'],
  ['5.3 Filter', 'models/Filter.js'],
  ['5.4 Resource', 'models/Resource.js'],
  ['5.5 MockTest', 'models/MockTest.js'],
  ['5.6 Question', 'models/Question.js'],
  ['5.7 Result', 'models/Result.js'],
  ['6.1 resourceMiddleware', 'middleware/resourceMiddleware.js'],
  ['6.2 uploadResource', 'middleware/uploadResource.js'],
  ['7.1 resourceRoutes', 'routes/resourceRoutes.js'],
  ['7.2 resourceFileRoutes', 'routes/resourceFileRoutes.js'],
  ['7.3 filterRoutes', 'routes/filterRoutes.js'],
  ['7.4 mockTestRoutes', 'routes/mockTestRoutes.js'],
  ['7.5 questionRoutes', 'routes/questionRoutes.js'],
  ['8.1 resourceCategoryController', 'controllers/resourceCategoryController.js'],
  ['8.2 resourceController', 'controllers/resourceController.js'],
  ['8.3 filterController', 'controllers/filterController.js'],
  ['8.4 mockTestController', 'controllers/mockTestController.js'],
  ['8.5 questionController', 'controllers/questionController.js']
];

let md = header;
md += '## 4. Route Registration\n\n**File:** `app.js`\n\n```javascript\n' + appSnippet + '\n```\n\n---\n\n';
md += '## 5. Models\n\n';

for (const [title, rel] of files) {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  const section = rel.startsWith('models/') ? '' : rel.startsWith('middleware/') ? '## 6. Middleware\n\n' : rel.startsWith('routes/') ? '## 7. Routes\n\n' : '## 8. Controllers\n\n';
  if (section && !md.includes(section.trim())) {
    // only add section header once - skip complex logic, use title prefix
  }
  md += `### ${title}\n\n**File:** \`${rel}\`\n\n\`\`\`javascript\n${code}\n\`\`\`\n\n---\n\n`;
}

const out = path.join(root, 'FREE_RESOURCES_COMPLETE_CODE.md');
fs.writeFileSync(out, md);
console.log('Written:', out, md.length, 'characters');
```

### `scripts/build-lms-test-guide.js`

```javascript
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const header = `# LMS Tests — API Guide & Complete Source Code

**Base URL:** \`http://localhost:5000\`  
**Postman:** [\`LMS_TEST_POSTMAN_COLLECTION.json\`](../LMS_TEST_POSTMAN_COLLECTION.json)  
**Auth:** \`Authorization: Bearer <JWT_TOKEN>\`

---

## Production improvements (v2)

| Fix | Details |
|-----|---------|
| Route order | Static routes (\`/attempts/*\`, \`/questions/*\`) before \`/:id\` |
| Question snapshot | Frozen in \`LmsTestAttempt.questionSnapshot\` on start — admin edits do not change scored results |
| Soft delete | \`isDeleted\` on \`LmsTest\` + \`LmsTestQuestion\` |
| DELETE test | \`DELETE /api/tests/:id\` — soft-deletes test + questions; attempts kept |
| 4 options | Schema enforces exactly 4 options |
| correctAnswer | Validated 0–3 and against options length |
| maxAttempts | On \`LmsTest\` (default 1) |
| shuffleQuestions / shuffleOptions | Optional per test |
| subjectId | Optional link to \`CourseSubject\` |
| questionImage | Optional on questions |
| Reorder | \`PUT /api/tests/questions/reorder\` |
| Pagination | \`GET /api/tests/attempts/me/list?page=1&limit=20\` |
| Indexes | \`userId + submittedAt\` on attempts |
| Category seed | On server startup (\`utils/lmsTestSeed.js\`) |
| Input sanitize | \`utils/sanitizeText.js\` on question/explanation |

---

## Quick start

1. Import Postman collection.
2. \`GET /api/tests/categories\` → weekly / daily / monthly IDs.
3. Admin: \`POST /api/tests\` → \`POST /api/tests/questions\` (×N) → \`PATCH /api/tests/:id/publish\`.
4. Student: list → start → submit → result.

---

## API reference

### Categories

| Method | Path | Access |
|--------|------|--------|
| GET | \`/api/tests/categories\` | Public |
| POST | \`/api/tests/categories\` | Admin |

### Tests

| Method | Path | Access |
|--------|------|--------|
| POST | \`/api/tests\` | Admin |
| PUT | \`/api/tests/:id\` | Admin |
| DELETE | \`/api/tests/:id\` | Admin (soft) |
| PATCH | \`/api/tests/:id/publish\` | Admin |
| GET | \`/api/tests/course/:courseId/category/:categoryId\` | Student |
| GET | \`/api/tests/course/:courseId/category/:categoryId/admin\` | Admin |
| GET | \`/api/tests/:id/start\` | Student |
| POST | \`/api/tests/:id/submit\` | Student |

### Questions

| Method | Path | Access |
|--------|------|--------|
| POST | \`/api/tests/questions\` | Admin |
| PUT | \`/api/tests/questions/reorder\` | Admin |
| GET | \`/api/tests/questions/test/:testId\` | Admin |
| PUT | \`/api/tests/questions/:id\` | Admin |
| DELETE | \`/api/tests/questions/:id\` | Admin (soft) |

### Attempts

| Method | Path | Access |
|--------|------|--------|
| GET | \`/api/tests/attempts/:attemptId\` | Student |
| GET | \`/api/test-attempts/:attemptId\` | Student (alias) |
| GET | \`/api/tests/attempts/me/list?page=1&limit=20\` | Student |

---

## Security

- \`correctAnswer\` / \`explanation\` never in \`GET .../start\`
- Scoring uses \`questionSnapshot\` only
- Enrollment via \`assertEnrollmentAccess\`
- Server timer: \`durationInMinutes * 60 + 30s\` grace

---

## Create test body (example)

\`\`\`json
{
  "courseId": "COURSE_ID",
  "categoryId": "CATEGORY_ID",
  "subjectId": "SUBJECT_ID_OPTIONAL",
  "title": "Geography Test 1",
  "durationInMinutes": 60,
  "passMarks": 40,
  "negativeMarkPerWrongAnswer": 0.33,
  "maxAttempts": 1,
  "shuffleQuestions": false,
  "shuffleOptions": false
}
\`\`\`

## Reorder questions

\`\`\`json
PUT /api/tests/questions/reorder
{
  "testId": "TEST_ID",
  "orders": [
    { "questionId": "Q1", "order": 0 },
    { "questionId": "Q2", "order": 1 }
  ]
}
\`\`\`

---

# Complete source code

`;

const files = [
  'models/LmsTestCategory.js',
  'models/LmsTest.js',
  'models/LmsTestQuestion.js',
  'models/LmsTestAttempt.js',
  'utils/sanitizeText.js',
  'utils/lmsTestSeed.js',
  'utils/lmsTestHelpers.js',
  'controllers/lmsTestCategoryController.js',
  'controllers/lmsTestController.js',
  'controllers/lmsTestQuestionController.js',
  'controllers/lmsTestAttemptController.js',
  'routes/lmsTestRoutes.js'
];

let body = '';
for (const f of files) {
  const content = fs.readFileSync(path.join(root, f), 'utf8');
  body += `\n---\n\n## \`${f}\`\n\n\`\`\`javascript\n${content}\`\`\`\n`;
}

const footer = `
---

## \`server.js\` additions

\`\`\`javascript
const { seedLmsTestCategories } = require('./utils/lmsTestSeed');

seedLmsTestCategories().catch((err) => {
  console.error('LMS test category seed failed:', err.message);
});
\`\`\`

## \`app.js\` registration

\`\`\`javascript
const lmsTestRoutes = require('./routes/lmsTestRoutes');
app.use('/api/tests', lmsTestRoutes);
\`\`\`

## \`routes/testAttemptRoutes.js\` (result alias)

\`\`\`javascript
const { getAttemptResult } = require('../controllers/lmsTestAttemptController');
router.get('/:attemptId', protect, getAttemptResult);
\`\`\`

Place before \`router.post('/:paperId', ...)\` for legacy paper routes.
`;

const out = path.join(root, 'LMS_TEST_API_GUIDE.md');
fs.writeFileSync(out, header + body + footer);
console.log('Wrote', out, '-', (header + body + footer).split('\n').length, 'lines');
```

### `scripts/build-portal-free-resources-doc.js`

```javascript
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const header = `# Portal Free Resources — Complete Code & API Guide

> **Project:** Sriram-IAS  
> **Base URL:** \`http://localhost:5000\`  
> **CMS (unchanged):** \`/api/resources/*\`  
> **Portal (new):** \`/api/portal/free-resources/*\`

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Portal API Endpoints](#2-portal-api-endpoints)
3. [Request Examples](#3-request-examples)
4. [Route Registration](#4-route-registration)
5. [Constants & Cache](#5-constants--cache)
6. [Models](#6-models)
7. [Middleware](#7-middleware)
8. [Service Layer](#8-service-layer)
9. [Portal Controller](#9-portal-controller)
10. [Portal Routes](#10-portal-routes)
11. [CMS Field Updates](#11-cms-field-updates)

---

## 1. Architecture

\`\`\`text
Admin CMS          →  /api/resources/*        (existing CRUD — not rewritten)
Student / Website  →  /api/portal/free-resources/*   (UI-optimized reads)
Mobile / Parent    →  same portal APIs

Shared tables: ResourceCategory, SubCategory, Filter, Resource, MockTest, Question, Result
New analytics:  ResourceDownload, ResourceViewHistory
Service layer:  services/resourceService.js
Cache:          utils/resourcePortalCache.js (in-memory; Redis-ready)
\`\`\`

| ResourceCategory | moduleType |
|------------------|------------|
| NCERT, PYQ, Study Material | FREE_RESOURCES |
| Daily CA, Monthly Magazine | CURRENT_AFFAIRS |

---

## 2. Portal API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/api/portal/free-resources/home\` | Dashboard category cards |
| GET | \`/api/portal/free-resources/categories\` | Grouped categories |
| GET | \`/api/portal/free-resources/filters\` | UI filter dropdowns |
| GET | \`/api/portal/free-resources/resources\` | List + filters + pagination |
| GET | \`/api/portal/free-resources/resources/:id\` | Detail |
| GET | \`/api/portal/free-resources/resources/:id/view\` | View PDF + history |
| GET | \`/api/portal/free-resources/resources/:id/download\` | Download + analytics |

Optional: \`Authorization: Bearer <token>\` for logged-in download/view tracking.

---

## 3. Request Examples

### Home

\`\`\`http
GET /api/portal/free-resources/home
\`\`\`

### Current affairs filters

\`\`\`http
GET /api/portal/free-resources/filters?moduleType=CURRENT_AFFAIRS
\`\`\`

Response shape: \`{ years, months, types }\`

### NCERT resources

\`\`\`http
GET /api/portal/free-resources/resources?categoryId=NCERT_ID&subjectId=...&classId=...&page=1&limit=12
\`\`\`

### Current affairs resources

\`\`\`http
GET /api/portal/free-resources/resources?moduleType=CURRENT_AFFAIRS&yearId=...&monthId=...&typeId=...
\`\`\`

### PYQ resources

\`\`\`http
GET /api/portal/free-resources/resources?categoryId=PYQ_ID&subCategoryId=...&paperId=...&yearId=...
\`\`\`

### Admin CMS (category)

\`\`\`json
{ "name": "Daily Current Affairs", "moduleType": "CURRENT_AFFAIRS" }
\`\`\`

### Admin CMS (resource upload fields)

\`\`\`json
{ "resourceType": "PDF", "monthId": "...", "typeId": "..." }
\`\`\`

(\`typeId\` → \`currentAffairsTypeId\` in database.)

---

`;

const files = [
  ['6.1 ResourceCategory (updated)', 'models/ResourceCategory.js'],
  ['6.2 Filter (updated)', 'models/Filter.js'],
  ['6.3 Resource (updated)', 'models/Resource.js'],
  ['6.4 ResourceDownload', 'models/ResourceDownload.js'],
  ['6.5 ResourceViewHistory', 'models/ResourceViewHistory.js'],
  ['5.1 resourceConstants', 'utils/resourceConstants.js'],
  ['5.2 resourcePortalCache', 'utils/resourcePortalCache.js'],
  ['7.1 optionalAuth', 'middleware/optionalAuth.js'],
  ['8.1 resourceService', 'services/resourceService.js'],
  ['9.1 portalFreeResourceController', 'controllers/portalFreeResourceController.js'],
  ['10.1 portalFreeResourceRoutes', 'routes/portalFreeResourceRoutes.js']
];

const appPortalSnippet = `const portalFreeResourceRoutes = require('./routes/portalFreeResourceRoutes');

// ... existing CMS routes ...
app.use('/api/resources', resourceRoutes);
app.use('/api/resources/filters', filterRoutes);
app.use('/api/resources/files', resourceFileRoutes);
app.use('/api/resources/mock-tests', mockTestRoutes);
app.use('/api/resources/questions', questionRoutes);

// Student / website / mobile — UI-optimized read APIs
app.use('/api/portal/free-resources', portalFreeResourceRoutes);`;

const cmsSnippets = `### resourceCategoryController.js (create)

\`\`\`javascript
const { name, description, moduleType } = req.body;

const category = new ResourceCategory({
  name,
  description,
  moduleType: moduleType || 'FREE_RESOURCES',
  thumbnail: thumbnailData,
  createdBy: req.user._id,
  centerId: req.user.center || null
});
\`\`\`

### resourceController.js (create — new fields)

\`\`\`javascript
monthId,
typeId,          // saved as currentAffairsTypeId
resourceType,

// In Resource.create payload:
monthId: monthId || null,
currentAffairsTypeId: typeId || null,
resourceType: resourceType || 'PDF',
\`\`\`

### resourceController.js (current affairs validation)

\`\`\`javascript
const isCurrentAffairs = category.moduleType === 'CURRENT_AFFAIRS';

if (isCurrentAffairs) {
  if (!yearId) {
    return res.status(400).json({
      success: false,
      message: 'Current affairs resources require yearId'
    });
  }
}
\`\`\`
`;

let md = header;
md += '## 4. Route Registration\n\n**File:** `app.js`\n\n```javascript\n' + appPortalSnippet + '\n```\n\n---\n\n';
md += '## 5. Constants & Cache\n\n';

for (const [title, rel] of files) {
  if (!rel.startsWith('models/') && !rel.startsWith('utils/')) continue;
  if (rel.startsWith('models/')) {
    md += '## 6. Models\n\n';
  }
  const code = read(rel);
  md += `### ${title}\n\n**File:** \`${rel}\`\n\n\`\`\`javascript\n${code}\n\`\`\`\n\n---\n\n`;
}

// Rebuild sections 5-10 cleanly
md = header;
md += '## 4. Route Registration\n\n**File:** `app.js`\n\n```javascript\n' + appPortalSnippet + '\n```\n\n---\n\n';

const sections = [
  ['## 5. Constants & Cache', ['utils/resourceConstants.js', 'utils/resourcePortalCache.js']],
  ['## 6. Models', [
    'models/ResourceCategory.js',
    'models/Filter.js',
    'models/Resource.js',
    'models/ResourceDownload.js',
    'models/ResourceViewHistory.js'
  ]],
  ['## 7. Middleware', ['middleware/optionalAuth.js']],
  ['## 8. Service Layer', ['services/resourceService.js']],
  ['## 9. Portal Controller', ['controllers/portalFreeResourceController.js']],
  ['## 10. Portal Routes', ['routes/portalFreeResourceRoutes.js']]
];

for (const [sectionTitle, paths] of sections) {
  md += `${sectionTitle}\n\n`;
  for (const rel of paths) {
    const code = read(rel);
    md += `### \`${rel}\`\n\n\`\`\`javascript\n${code}\n\`\`\`\n\n`;
  }
  md += '---\n\n';
}

md += '## 11. CMS Field Updates\n\n' + cmsSnippets;
md += '\n## Future-ready (not implemented)\n\n- `ResourceBookmark`\n- Redis (replace `resourcePortalCache`)\n- Portal mock-test routes\n';

const out = path.join(root, 'PORTAL_FREE_RESOURCES_API_GUIDE.md');
fs.writeFileSync(out, md);
console.log('Written:', out, md.length, 'chars');
```

### `scripts/correctlyAssignCenters.js`

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Center = require('../models/Center');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

async function correctlyAssignCenters() {
  try {
    console.log('\n🔍 Correctly assigning centers to admins...\n');

    // Get all centers
    const centers = await Center.find();
    const centerMap = {};
    centers.forEach(center => {
      centerMap[center.name.toLowerCase()] = center._id;
    });

    console.log('📍 Centers available:');
    centers.forEach(center => {
      console.log(`   - ${center.name} (${center._id})`);
    });

    // Get all center_admin users
    const admins = await User.find({ role: 'center_admin' });

    console.log(`\n👥 Fixing ${admins.length} center admins:\n`);

    for (const admin of admins) {
      console.log(`Admin: ${admin.name}`);
      console.log(`  Email: ${admin.email}`);
      
      // Extract center name from admin name or email
      let centerName = null;
      
      // Try to match from name (e.g., "Hyderabad Admin" -> "hyderabad")
      const nameMatch = admin.name.toLowerCase().match(/(hyderabad|delhi|pune)/);
      if (nameMatch) {
        centerName = nameMatch[1];
      }
      
      // Try to match from email (e.g., "hyderabad@gmail.com" -> "hyderabad")
      if (!centerName && admin.email) {
        const emailMatch = admin.email.toLowerCase().match(/(hyderabad|delhi|pune)/);
        if (emailMatch) {
          centerName = emailMatch[1];
        }
      }

      if (centerName && centerMap[centerName]) {
        admin.center = centerMap[centerName];
        await admin.save();
        
        const matchedCenter = centers.find(c => c._id.toString() === centerMap[centerName].toString());
        console.log(`  ✅ Assigned to: ${matchedCenter.name}`);
      } else {
        console.log(`  ⚠️  Could not determine center from name/email`);
        console.log(`  💡 Please assign manually using:`);
        console.log(`     db.users.updateOne(`);
        console.log(`       { _id: ObjectId("${admin._id}") },`);
        console.log(`       { $set: { center: ObjectId("CENTER_ID") } }`);
        console.log(`     )`);
      }
      console.log('');
    }

    // Get all employee users
    const employees = await User.find({ role: 'employee' });
    
    if (employees.length > 0) {
      console.log(`\n👨‍🏫 Employees (${employees.length}):`);
      for (const emp of employees) {
        console.log(`\nEmployee: ${emp.name}`);
        console.log(`  Email: ${emp.email}`);
        console.log(`  💡 Employees need manual assignment: Choose which center they work at`);
        console.log(`     db.users.updateOne(`);
        console.log(`       { _id: ObjectId("${emp._id}") },`);
        console.log(`       { $set: { center: ObjectId("CENTER_ID") } }`);
        console.log(`     )`);
      }
    }

    console.log('\n✅ Center assignment complete!\n');
    console.log('📋 Center IDs for manual assignment:');
    centers.forEach(center => {
      console.log(`   ${center.name}: ${center._id}`);
    });
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

correctlyAssignCenters();
```

### `scripts/dropFeaturedArticleIndexes.js`

```javascript
const mongoose = require('mongoose');
const FeaturedArticle = require('../models/FeaturedArticle');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

async function dropOldIndexes() {
  try {
    console.log('\n🧹 Cleaning up old FeaturedArticle indexes...\n');

    // Show current indexes
    console.log('📝 FeaturedArticle Collection:');
    const indexes = await FeaturedArticle.collection.indexes();
    console.log('   Current indexes:', indexes.map(i => i.name).join(', '));
    
    // Drop the old articleId index
    try {
      await FeaturedArticle.collection.dropIndex('articleId_1');
      console.log('   ✅ Dropped old "articleId_1" index');
    } catch (err) {
      if (err.code === 27) {
        console.log('   ⚠️  "articleId_1" index does not exist (already removed)');
      } else {
        throw err;
      }
    }

    // Drop the old order index if it exists
    try {
      await FeaturedArticle.collection.dropIndex('order_1');
      console.log('   ✅ Dropped old "order_1" index');
    } catch (err) {
      if (err.code === 27) {
        console.log('   ⚠️  "order_1" index does not exist (already removed)');
      } else {
        throw err;
      }
    }

    // Drop the old compound index with articleId
    try {
      await FeaturedArticle.collection.dropIndex('articleId_1_isActive_1');
      console.log('   ✅ Dropped old "articleId_1_isActive_1" index');
    } catch (err) {
      if (err.code === 27) {
        console.log('   ⚠️  "articleId_1_isActive_1" index does not exist (already removed)');
      } else {
        throw err;
      }
    }

    // Show final indexes
    console.log('\n✅ Final indexes:');
    console.log('   FeaturedArticle:', (await FeaturedArticle.collection.indexes()).map(i => i.name).join(', '));

    console.log('\n✨ Index cleanup complete! You can now create featured articles.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning indexes:', error);
    process.exit(1);
  }
}

dropOldIndexes();
```

### `scripts/dropOldIndexes.js`

```javascript
const mongoose = require('mongoose');
const Center = require('../models/Center');
const Category = require('../models/Category');
const Course = require('../models/Course');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

async function dropIndexes() {
  try {
    console.log('\n🧹 Cleaning up old indexes...\n');

    // Drop all indexes from Center collection (except _id)
    console.log('📍 Center Collection:');
    const centerIndexes = await Center.collection.indexes();
    console.log('   Current indexes:', centerIndexes.map(i => i.name).join(', '));
    
    // Drop the old location index
    try {
      await Center.collection.dropIndex('location_1');
      console.log('   ✅ Dropped old "location_1" index');
    } catch (err) {
      if (err.code === 27) {
        console.log('   ⚠️  "location_1" index does not exist (already removed)');
      } else {
        throw err;
      }
    }

    // Drop all indexes from Category collection (except _id)
    console.log('\n📚 Category Collection:');
    const categoryIndexes = await Category.collection.indexes();
    console.log('   Current indexes:', categoryIndexes.map(i => i.name).join(', '));
    
    // Drop old indexes if they exist
    try {
      await Category.collection.dropIndex('displayOrder_1');
      console.log('   ✅ Dropped old "displayOrder_1" index');
    } catch (err) {
      if (err.code === 27) {
        console.log('   ⚠️  "displayOrder_1" index does not exist (already removed)');
      } else {
        throw err;
      }
    }

    try {
      await Category.collection.dropIndex('isActive_1');
      console.log('   ✅ Dropped old "isActive_1" index');
    } catch (err) {
      if (err.code === 27) {
        console.log('   ⚠️  "isActive_1" index does not exist (already removed)');
      } else {
        throw err;
      }
    }

    // Show final indexes
    console.log('\n✅ Final indexes:');
    console.log('   Centers:', (await Center.collection.indexes()).map(i => i.name).join(', '));
    console.log('   Categories:', (await Category.collection.indexes()).map(i => i.name).join(', '));

    console.log('\n✨ Index cleanup complete! You can now create centers and categories.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning indexes:', error);
    process.exit(1);
  }
}

dropIndexes();
```

### `scripts/fixCenterAssignment.js`

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Center = require('../models/Center');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

async function fixCenterAssignment() {
  try {
    console.log('\n🔍 Checking users and centers...\n');

    // Get all centers
    const centers = await Center.find();
    console.log(`📍 Available Centers (${centers.length}):`);
    centers.forEach((center, index) => {
      console.log(`   ${index + 1}. ${center.name} (ID: ${center._id})`);
    });

    // Get all center_admin and employee users
    const users = await User.find({ 
      role: { $in: ['center_admin', 'employee'] }
    });

    console.log(`\n👥 Users (${users.length}):\n`);

    let updatedCount = 0;

    for (const user of users) {
      console.log(`User: ${user.name}`);
      console.log(`  Email: ${user.email || 'N/A'}`);
      console.log(`  Mobile: ${user.mobile || 'N/A'}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Center: ${user.center ? '✅ Assigned' : '❌ NOT ASSIGNED'}`);
      
      if (user.center) {
        // Show assigned center details
        const assignedCenter = centers.find(c => c._id.toString() === user.center.toString());
        if (assignedCenter) {
          console.log(`  Assigned Center: ${assignedCenter.name}`);
        }
      } else {
        console.log(`  ⚠️  This user needs a center assignment!`);
        
        // Auto-assign first center for testing
        if (centers.length > 0) {
          const firstCenter = centers[0];
          user.center = firstCenter._id;
          await user.save();
          console.log(`  ✅ Auto-assigned to: ${firstCenter.name}`);
          updatedCount++;
        }
      }
      console.log('');
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total users checked: ${users.length}`);
    console.log(`   Users updated: ${updatedCount}`);
    console.log(`   Users already assigned: ${users.length - updatedCount}`);

    console.log('\n💡 To manually assign centers:');
    console.log('   1. Use the admin dashboard');
    console.log('   2. OR run this MongoDB command:');
    console.log('      db.users.updateOne(');
    console.log('        { _id: ObjectId("USER_ID") },');
    console.log('        { $set: { center: ObjectId("CENTER_ID") } }');
    console.log('      )\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixCenterAssignment();
```

### `scripts/mark-absent-attendance.js`

```javascript
/**
 * Mark students absent for today if they have no attendance record.
 * Run daily via cron, e.g. 11:59 PM:
 *   node scripts/mark-absent-attendance.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Enrollment = require('../models/Enrollment');
const StudentAttendance = require('../models/StudentAttendance');
const { startOfDay } = require('../utils/attendanceAccess');
const { ACTIVE_ENROLLMENT_STATUSES } = require('../utils/courseAccess');

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

const main = async () => {
  if (!mongoUri) {
    console.error('Set MONGO_URI or MONGODB_URI');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  const today = startOfDay();

  const enrollments = await Enrollment.find({
    status: { $in: ACTIVE_ENROLLMENT_STATUSES },
    isDeleted: false,
    accessBlocked: { $ne: true }
  })
    .select('userId courseId centerId')
    .lean();

  const seen = new Set();
  let created = 0;

  for (const enr of enrollments) {
    const key = enr.userId.toString();
    if (seen.has(key)) continue;
    seen.add(key);

    const exists = await StudentAttendance.findOne({
      studentId: enr.userId,
      attendanceDate: today
    });

    if (exists) continue;

    await StudentAttendance.create({
      studentId: enr.userId,
      courseId: enr.courseId,
      centerId: enr.centerId,
      attendanceDate: today,
      attendanceStatus: 'absent',
      notes: 'Auto-marked absent'
    });
    created += 1;
  }

  console.log(`Absent marked for ${created} student(s) on ${today.toISOString().slice(0, 10)}`);
  await mongoose.disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### `scripts/migrate-courses.js`

```javascript
const mongoose = require('mongoose');
const Course = require('../models/Course');

async function migrateCourses() {
  try {
    console.log('Starting course migration...');

    const courses = await Course.find();
    console.log(`Found ${courses.length} courses to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const course of courses) {
      let needsUpdate = false;

      // Convert startDate and duration to batchStartDate, batchEndDate, accessValidityInDays
      if (course.startDate && course.duration && !course.batchStartDate) {
        const startDate = course.startDate instanceof Date ? course.startDate : new Date(course.startDate);

        // Parse duration to days
        const durationMatch = course.duration.match(/(\d+)\s*(year|years|month|months|day|days)/i);
        let validityDays = 365; // Default 1 year

        if (durationMatch) {
          const value = parseInt(durationMatch[1], 10);
          const unit = durationMatch[2].toLowerCase();

          if (unit.startsWith('year')) {
            validityDays = value * 365;
          } else if (unit.startsWith('month')) {
            validityDays = Math.round(value * 30.4375); // Average month
          } else if (unit.startsWith('day')) {
            validityDays = value;
          }
        }

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + validityDays);

        course.batchStartDate = startDate;
        course.batchEndDate = endDate;
        course.accessValidityInDays = validityDays;

        needsUpdate = true;
        console.log(`Migrating course "${course.title}": startDate=${startDate.toISOString()} -> batchStartDate, validity=${validityDays} days`);
      }

      // Set default access validity if not set
      if (!course.accessValidityInDays) {
        course.accessValidityInDays = 365; // Default 1 year
        needsUpdate = true;
        console.log(`Setting default access validity for course "${course.title}": 365 days`);
      }

      if (needsUpdate) {
        await course.save();
        migrated++;
      } else {
        skipped++;
      }
    }

    console.log(`Migration completed: ${migrated} courses migrated, ${skipped} courses skipped`);

    // Optional: Remove old fields after verification
    // Uncomment the following lines after verifying migration is successful
    /*
    console.log('Removing old fields...');
    await Course.updateMany(
      { startDate: { $exists: true }, batchStartDate: { $exists: true } },
      { $unset: { startDate: 1, duration: 1 } }
    );
    console.log('Old fields removed');
    */

  } catch (error) {
    console.error('Course migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  require('dotenv').config();
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sriram-ias')
    .then(() => {
      console.log('Connected to MongoDB');
      return migrateCourses();
    })
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateCourses };
```

### `scripts/migrate-enrollments.js`

```javascript
const mongoose = require('mongoose');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

async function migrateEnrollments() {
  try {
    console.log('Starting enrollment migration...');

    const enrollments = await Enrollment.find().populate('courseId');
    console.log(`Found ${enrollments.length} enrollments to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const enrollment of enrollments) {
      let needsUpdate = false;

      // Calculate access dates if not set
      if (!enrollment.accessStartDate || !enrollment.accessEndDate) {
        // Use joinedAt as access start, fallback to createdAt
        const accessStartDate = enrollment.joinedAt || enrollment.createdAt || new Date();

        let accessEndDate = null;

        if (enrollment.courseId) {
          // Use course's access validity
          const validityDays = enrollment.courseId.accessValidityInDays || 365;
          accessEndDate = new Date(accessStartDate);
          accessEndDate.setDate(accessEndDate.getDate() + validityDays);
        } else {
          // Fallback: assume 1 year
          accessEndDate = new Date(accessStartDate);
          accessEndDate.setFullYear(accessEndDate.getFullYear() + 1);
        }

        enrollment.accessStartDate = accessStartDate;
        enrollment.accessEndDate = accessEndDate;
        enrollment.expiredAt = accessEndDate;

        // Set access status based on current date
        const now = new Date();
        if (accessEndDate < now) {
          enrollment.accessStatus = 'EXPIRED';
          enrollment.enrollmentStatus = enrollment.enrollmentStatus === 'ACTIVE' ? 'COMPLETED' : enrollment.enrollmentStatus;
        } else {
          enrollment.accessStatus = 'GRANTED';
          if (enrollment.enrollmentStatus === 'PENDING') {
            enrollment.enrollmentStatus = 'ACTIVE';
          }
        }

        needsUpdate = true;
        console.log(`Migrating enrollment for course "${enrollment.courseId?.title || 'Unknown'}": access from ${accessStartDate.toISOString()} to ${accessEndDate.toISOString()}`);
      }

      // Update courseSnapshot if not complete
      if (enrollment.courseId && (!enrollment.courseSnapshot || !enrollment.courseSnapshot.fees)) {
        enrollment.courseSnapshot = {
          title: enrollment.courseId.title,
          slug: enrollment.courseId.slug,
          centerName: enrollment.courseId.center?.name || 'Unknown',
          fees: enrollment.courseId.fees,
          installmentEnabled: enrollment.courseId.installmentEnabled,
          installmentOptions: enrollment.courseId.installmentOptions,
          modes: enrollment.courseId.modes,
          batchStartDate: enrollment.courseId.batchStartDate,
          batchEndDate: enrollment.courseId.batchEndDate,
          accessValidityInDays: enrollment.courseId.accessValidityInDays
        };

        needsUpdate = true;
        console.log(`Updated course snapshot for enrollment in "${enrollment.courseId.title}"`);
      }

      if (needsUpdate) {
        await enrollment.save();
        migrated++;
      } else {
        skipped++;
      }
    }

    console.log(`Migration completed: ${migrated} enrollments migrated, ${skipped} enrollments skipped`);

  } catch (error) {
    console.error('Enrollment migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  require('dotenv').config();
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sriram-ias')
    .then(() => {
      console.log('Connected to MongoDB');
      return migrateEnrollments();
    })
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateEnrollments };
```

### `scripts/publish-lms-test.js`

```javascript
/**
 * Sync question counts/marks and publish LMS test(s) so students can see them.
 *
 * Usage:
 *   node scripts/publish-lms-test.js <testId>
 *   node scripts/publish-lms-test.js --course <courseId> [--category <categoryId>]
 *   node scripts/publish-lms-test.js --all-unpublished
 */
require('dotenv').config();
const mongoose = require('mongoose');
const LmsTest = require('../models/LmsTest');
const { NOT_DELETED, syncTestTotals } = require('../utils/lmsTestHelpers');

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

const connect = async () => {
  if (!mongoUri) {
    console.error('Set MONGO_URI or MONGODB_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
  console.log('MongoDB connected');
};

const publishOne = async (testId) => {
  const test = await LmsTest.findOne({ _id: testId, ...NOT_DELETED });
  if (!test) {
    console.log(`Skip ${testId}: test not found or deleted`);
    return false;
  }

  const totals = await syncTestTotals(test._id);
  if (totals.totalQuestions < 1) {
    console.log(`Skip ${testId} (${test.title}): no questions`);
    return false;
  }

  test.isPublished = true;
  await test.save();

  console.log(
    `Published ${testId} — "${test.title}" | questions: ${totals.totalQuestions}, marks: ${totals.totalMarks}`
  );
  return true;
};

const main = async () => {
  const args = process.argv.slice(2);

  await connect();

  try {
    if (args[0] === '--all-unpublished') {
      const tests = await LmsTest.find({ isPublished: false, ...NOT_DELETED }).lean();
      let count = 0;
      for (const t of tests) {
        if (await publishOne(t._id)) count += 1;
      }
      console.log(`Done. Published ${count} of ${tests.length} unpublished test(s).`);
    } else if (args[0] === '--course') {
      const courseId = args[1];
      const categoryIdx = args.indexOf('--category');
      const categoryId = categoryIdx >= 0 ? args[categoryIdx + 1] : null;

      if (!courseId) {
        console.error('Usage: node scripts/publish-lms-test.js --course <courseId> [--category <categoryId>]');
        process.exit(1);
      }

      const filter = { courseId, isPublished: false, ...NOT_DELETED };
      if (categoryId) filter.categoryId = categoryId;

      const tests = await LmsTest.find(filter).lean();
      let count = 0;
      for (const t of tests) {
        if (await publishOne(t._id)) count += 1;
      }
      console.log(`Done. Published ${count} test(s) for course ${courseId}.`);
    } else if (args[0]) {
      const ok = await publishOne(args[0]);
      if (!ok) process.exit(1);
    } else {
      console.log(`
Usage:
  node scripts/publish-lms-test.js <testId>
  node scripts/publish-lms-test.js --course <courseId> [--category <categoryId>]
  node scripts/publish-lms-test.js --all-unpublished
`);
      process.exit(1);
    }
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### `scripts/seedData.js`

```javascript
const mongoose = require('mongoose');
const Center = require('../models/Center');
const Category = require('../models/Category');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

async function seedData() {
  try {
    console.log('\n🌱 Seeding database...\n');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await Center.deleteMany({});
    // await Category.deleteMany({});

    // Create Centers
    console.log('📍 Creating Centers...');
    const centers = await Center.insertMany([
      { name: 'Delhi' },
      { name: 'Hyderabad' },
      { name: 'Pune' }
    ]);
    console.log('✅ Centers created:', centers.length);

    // Create Categories
    console.log('\n📚 Creating Categories...');
    const categories = await Category.insertMany([
      { name: 'GS Foundation' },
      { name: 'Optional Subjects' },
      { name: 'Test Series' },
      { name: 'Crash Courses' },
      { name: 'Interview Guidance' }
    ]);
    console.log('✅ Categories created:', categories.length);

    console.log('\n✅ Database seeded successfully!\n');
    console.log('Centers:');
    centers.forEach(c => console.log(`  - ${c.name} (${c._id})`));
    console.log('\nCategories:');
    categories.forEach(c => console.log(`  - ${c.name} (${c._id})`));
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
```

### `scripts/test-course-update.js`

```javascript
const mongoose = require('mongoose');
const Course = require('./models/Course');

// Test script to verify course update functionality
async function testCourseUpdate() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sriram-ias');
    console.log('Connected to MongoDB');

    // Find a test course
    const course = await Course.findOne().limit(1);
    if (!course) {
      console.log('No courses found to test with');
      return;
    }

    console.log('Testing course update for:', course.title);
    console.log('Original values:');
    console.log('- batchStartDate:', course.batchStartDate);
    console.log('- batchEndDate:', course.batchEndDate);
    console.log('- accessValidityInDays:', course.accessValidityInDays);
    console.log('- recordedContentValidityInDays:', course.recordedContentValidityInDays);

    // Test update
    const updateData = {
      batchStartDate: new Date('2026-06-01T00:00:00Z'),
      batchEndDate: new Date('2027-06-01T00:00:00Z'),
      accessValidityInDays: 730,
      recordedContentValidityInDays: 365
    };

    const updatedCourse = await Course.findByIdAndUpdate(
      course._id,
      updateData,
      { new: true }
    );

    console.log('\nUpdated values:');
    console.log('- batchStartDate:', updatedCourse.batchStartDate);
    console.log('- batchEndDate:', updatedCourse.batchEndDate);
    console.log('- accessValidityInDays:', updatedCourse.accessValidityInDays);
    console.log('- recordedContentValidityInDays:', updatedCourse.recordedContentValidityInDays);

    console.log('\n✅ Course update test passed!');

  } catch (error) {
    console.error('❌ Course update test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run test if called directly
if (require.main === module) {
  require('dotenv').config();
  testCourseUpdate();
}

module.exports = { testCourseUpdate };
```

### `server.js`

```javascript
const { preferIpv4Dns } = require('./utils/dnsIpv4');
preferIpv4Dns();

const app = require('./app');
const { getTransporter, isEmailConfigured } = require('./utils/emailService');
const { seedLmsTestCategories } = require('./utils/lmsTestSeed');
const { seedAnswerWritingCategories } = require('./utils/answerWritingSeed');

if (isEmailConfigured()) {
  getTransporter().catch(() => {});
} else {
  console.warn('⚠️  EMAIL_USER / EMAIL_PASS not set — OTP emails will not be sent.');
}

seedLmsTestCategories().catch((err) => {
  console.error('LMS test category seed failed:', err.message);
});

seedAnswerWritingCategories().catch((err) => {
  console.error('Answer writing category seed failed:', err.message);
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 Sriram IAS Backend Server               ║
║   📍 Port: ${PORT}                            ║
║   🌍 Environment: ${process.env.NODE_ENV || 'development'}              ║
║   📧 Email: ${isEmailConfigured() ? 'Gmail SMTP configured' : 'not configured'}        ║
╚═══════════════════════════════════════════════╝
  `);
});

process.on('unhandledRejection', (err) => {
  console.error(`❌ Error: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});
```

### `utils/answerWritingHelpers.js`

```javascript
const Course = require('../models/Course');
const CourseSubject = require('../models/CourseSubject');
const AnswerWritingQuestion = require('../models/AnswerWritingQuestion');
const { getCourseForAdmin } = require('./courseAccess');

const QUESTION_RELATION_POPULATE = [
  { path: 'courseId', select: 'title' },
  { path: 'subjectId', select: 'title' },
  { path: 'categoryId', select: 'title slug' }
];

const EVALUATOR_ROLES = ['super_admin', 'center_admin', 'employee'];

const normalizeStatusFilter = (status) => {
  if (!status) return null;
  const s = String(status).toLowerCase();
  if (['upcoming', 'completed', 'submitted', 'evaluated'].includes(s)) return s;
  return null;
};

const filterQuestionsByStatus = (rows, statusFilter) => {
  if (!statusFilter) return rows;
  if (statusFilter === 'upcoming') {
    return rows.filter((row) => row.displayStatus === 'upcoming');
  }
  if (statusFilter === 'completed') {
    return rows.filter((row) => ['submitted', 'evaluated'].includes(row.displayStatus));
  }
  return rows.filter((row) => row.displayStatus === statusFilter);
};

const STUDENT_STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' }
];

const resolveDisplayStatus = (submission) => {
  if (!submission) return 'upcoming';
  if (submission.submissionStatus === 'evaluated') return 'evaluated';
  return 'submitted';
};

const getRequestUserId = (user) => user?._id || user?.id;

const isEvaluator = (role) => EVALUATOR_ROLES.includes(role);

const assertEvaluatorCourseAccess = async (req, res, courseId) => {
  const course = await getCourseForAdmin(req, res, courseId);
  return course;
};

const assertSubjectBelongsToCourse = async (courseId, subjectId) => {
  return CourseSubject.findOne({
    _id: subjectId,
    courseId,
    isDeleted: false
  }).lean();
};

const findQuestionWithRelations = (id) =>
  AnswerWritingQuestion.findById(id).populate(QUESTION_RELATION_POPULATE).lean();

const uploadAnswerFile = async (file, folder, uploadToCloudinary) => {
  if (!file) return null;
  const isPdf = file.mimetype === 'application/pdf';
  return uploadToCloudinary(
    file,
    folder,
    isPdf ? 'raw' : 'image',
    isPdf ? 'pdf' : null
  );
};

module.exports = {
  EVALUATOR_ROLES,
  normalizeStatusFilter,
  filterQuestionsByStatus,
  STUDENT_STATUS_OPTIONS,
  resolveDisplayStatus,
  getRequestUserId,
  isEvaluator,
  assertEvaluatorCourseAccess,
  assertSubjectBelongsToCourse,
  QUESTION_RELATION_POPULATE,
  findQuestionWithRelations,
  uploadAnswerFile
};
```

### `utils/answerWritingSeed.js`

```javascript
const AnswerWritingCategory = require('../models/AnswerWritingCategory');

const DEFAULT_CATEGORIES = [
  { title: 'Daily', slug: 'daily' },
  { title: 'Weekly', slug: 'weekly' },
  { title: 'Monthly', slug: 'monthly' }
];

const seedAnswerWritingCategories = async () => {
  for (const cat of DEFAULT_CATEGORIES) {
    await AnswerWritingCategory.findOneAndUpdate(
      { slug: cat.slug },
      { $setOnInsert: cat },
      { upsert: true }
    );
  }
  console.log('✅ Answer writing categories seeded (daily, weekly, monthly)');
};

module.exports = { seedAnswerWritingCategories, DEFAULT_CATEGORIES };
```

### `utils/attendanceAccess.js`

```javascript
const Enrollment = require('../models/Enrollment');
const Parent = require('../models/Parent');
const Student = require('../models/Student');
const Employee = require('../models/Employee');
const Center = require('../models/Center');
const { ACTIVE_ENROLLMENT_STATUSES, isEnrollmentAccessValid } = require('./courseAccess');

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const getMonthRange = (year, month) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
};

const getPrimaryEnrollment = async (studentUserId, courseId = null) => {
  const filter = {
    userId: studentUserId,
    status: { $in: ACTIVE_ENROLLMENT_STATUSES },
    isDeleted: false,
    accessBlocked: { $ne: true }
  };

  if (courseId) filter.courseId = courseId;

  const enrollment = await Enrollment.findOne(filter).sort({ createdAt: -1 }).lean();

  if (!enrollment || !isEnrollmentAccessValid(enrollment)) return null;
  return enrollment;
};

const getParentStudentUserId = async (parentUserId) => {
  const link = await Parent.findOne({ userId: parentUserId }).lean();
  if (!link?.studentId) return null;

  const studentRef = link.studentId;
  if (studentRef.userId) {
    return studentRef.userId;
  }

  const studentProfile = await Student.findById(studentRef).lean();
  return studentProfile?.userId ?? null;
};

const getEmployeeCenterIds = async (employeeUserId) => {
  const employee = await Employee.findOne({ userId: employeeUserId }).lean();
  if (!employee?.center) return [];

  const centers = await Center.find({ name: employee.center }).select('_id').lean();
  return centers.map((c) => c._id.toString());
};

const studentHasEnrollmentInCenters = async (studentUserId, centerIds) => {
  if (!centerIds.length) return false;

  const count = await Enrollment.countDocuments({
    userId: studentUserId,
    centerId: { $in: centerIds },
    status: { $in: ACTIVE_ENROLLMENT_STATUSES },
    isDeleted: false
  });

  return count > 0;
};

const getRequestUserId = (user) => user?._id || user?.id;

const resolveTargetStudentId = async (req) => {
  const userId = getRequestUserId(req.user);
  if (!userId) {
    return { error: 'Authenticated user id not found' };
  }

  const { role } = req.user;
  const queryStudentId = req.query?.studentId || req.body?.studentId;

  if (role === 'student') {
    return userId.toString();
  }

  if (role === 'parent') {
    const childUserId = await getParentStudentUserId(userId);
    if (!childUserId) {
      return { error: 'No linked student found for this parent account' };
    }
    if (queryStudentId && queryStudentId.toString() !== childUserId.toString()) {
      return { error: 'Access denied for this student' };
    }
    return childUserId.toString();
  }

  if (!queryStudentId) {
    return { error: 'studentId query parameter is required' };
  }

  return queryStudentId.toString();
};

const assertCanViewStudentAttendance = async (req, res, studentUserId) => {
  if (!studentUserId) {
    res.status(400).json({ success: false, message: 'Invalid studentId' });
    return false;
  }

  const { role, center } = req.user;
  const userId = getRequestUserId(req.user);

  if (role === 'student') {
    if (userId.toString() !== studentUserId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return false;
    }
    return true;
  }

  if (role === 'parent') {
    const childUserId = await getParentStudentUserId(userId);
    if (!childUserId || childUserId.toString() !== studentUserId.toString()) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return false;
    }
    return true;
  }

  if (role === 'super_admin') {
    return true;
  }

  if (role === 'center_admin') {
    if (!center) {
      res.status(403).json({ success: false, message: 'Center not assigned to your account' });
      return false;
    }
    const ok = await studentHasEnrollmentInCenters(studentUserId, [center.toString()]);
    if (!ok) {
      res.status(403).json({ success: false, message: 'Access denied for this student' });
      return false;
    }
    return true;
  }

  if (role === 'employee') {
    const centerIds = await getEmployeeCenterIds(userId);
    const ok = await studentHasEnrollmentInCenters(studentUserId, centerIds);
    if (!ok) {
      res.status(403).json({ success: false, message: 'Access denied for this student' });
      return false;
    }
    return true;
  }

  res.status(403).json({ success: false, message: 'Access denied' });
  return false;
};

const formatTimeLabel = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

module.exports = {
  startOfDay,
  endOfDay,
  getMonthRange,
  getPrimaryEnrollment,
  getParentStudentUserId,
  resolveTargetStudentId,
  assertCanViewStudentAttendance,
  formatTimeLabel
};
```

### `utils/categorySlugFromTitle.js`

```javascript
const slugify = require('slugify');

const PERIOD_SLUGS = ['daily', 'weekly', 'monthly'];

function baseSlugFromTitle(title) {
  if (!title || typeof title !== 'string') return null;
  const slug = slugify(title.trim(), { lower: true, strict: true });
  return slug || null;
}

/** Derive daily | weekly | monthly slug from a category title (LMS test categories). */
function slugFromCategoryTitle(title) {
  if (!title || typeof title !== 'string') return null;

  const normalized = title.trim().toLowerCase();
  if (PERIOD_SLUGS.includes(normalized)) return normalized;

  for (const slug of PERIOD_SLUGS) {
    if (normalized.includes(slug)) return slug;
  }

  return null;
}

async function uniqueSlugForModel(Model, title, excludeId = null) {
  const base = baseSlugFromTitle(title);
  if (!base) return null;

  let candidate = base;
  let suffix = 1;

  while (true) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Model.exists(query);
    if (!exists) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

module.exports = {
  PERIOD_SLUGS,
  baseSlugFromTitle,
  slugFromCategoryTitle,
  uniqueSlugForModel
};
```

### `utils/courseAccess.js`

```javascript
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

const ACTIVE_ENROLLMENT_STATUSES = ['active', 'pending'];

const getActiveEnrollment = async (userId, courseId) => {
  return Enrollment.findOne({
    userId,
    courseId,
    status: { $in: ACTIVE_ENROLLMENT_STATUSES },
    isDeleted: false,
    accessBlocked: { $ne: true }
  });
};

const isEnrollmentAccessValid = (enrollment) => {
  if (!enrollment) return false;

  const now = new Date();
  if (enrollment.accessEndsAt && now > enrollment.accessEndsAt) return false;
  if (enrollment.validUntil && now > enrollment.validUntil) return false;

  return true;
};

const assertEnrollmentAccess = async (req, res, courseId) => {
  const enrollment = await getActiveEnrollment(req.user._id, courseId);

  if (!enrollment || !isEnrollmentAccessValid(enrollment)) {
    res.status(403).json({
      success: false,
      message: 'Access denied. You are not enrolled in this course or access has expired.'
    });
    return null;
  }

  return enrollment;
};

const getCourseForAdmin = async (req, res, courseId) => {
  const course = await Course.findById(courseId);

  if (!course) {
    res.status(404).json({ success: false, message: 'Course not found' });
    return null;
  }

  if (req.user.role === 'center_admin') {
    const userCenter = req.user.center?.toString();
    const courseCenter = course.center?.toString();

    if (!userCenter || userCenter !== courseCenter) {
      res.status(403).json({
        success: false,
        message: 'You can only manage content for your own center courses'
      });
      return null;
    }
  }

  return course;
};

const parseJsonField = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

module.exports = {
  ACTIVE_ENROLLMENT_STATUSES,
  getActiveEnrollment,
  isEnrollmentAccessValid,
  assertEnrollmentAccess,
  getCourseForAdmin,
  parseJsonField
};
```

### `utils/courseProgressService.js`

```javascript
const CourseProgress = require('../models/CourseProgress');
const CourseSubject = require('../models/CourseSubject');
const RecordedLecture = require('../models/RecordedLecture');
const LectureProgress = require('../models/LectureProgress');
const { NOT_DELETED } = require('./lectureHelpers');

const syncCourseProgress = async (userId, courseId, lastOpenedLectureId = null) => {
  const lectureFilter = {
    courseId,
    isPublished: true,
    ...NOT_DELETED
  };

  const totalLectures = await RecordedLecture.countDocuments(lectureFilter);

  const publishedLectures = await RecordedLecture.find(lectureFilter).select('_id subjectId').lean();
  const publishedIds = publishedLectures.map((l) => l._id);

  const completedLectures = publishedIds.length
    ? await LectureProgress.countDocuments({
        userId,
        lectureId: { $in: publishedIds },
        isCompleted: true
      })
    : 0;

  const subjects = await CourseSubject.find({
    courseId,
    isActive: true,
    ...NOT_DELETED
  }).select('_id').lean();

  const totalSubjects = subjects.length;
  let completedSubjects = 0;

  for (const subject of subjects) {
    const subjectLectureIds = publishedLectures
      .filter((l) => l.subjectId.toString() === subject._id.toString())
      .map((l) => l._id);

    if (!subjectLectureIds.length) continue;

    const subjectCompleted = await LectureProgress.countDocuments({
      userId,
      lectureId: { $in: subjectLectureIds },
      isCompleted: true
    });

    if (subjectCompleted === subjectLectureIds.length) {
      completedSubjects += 1;
    }
  }

  const progressPercent = totalLectures > 0
    ? Math.min(100, Math.round((completedLectures / totalLectures) * 100))
    : 0;

  const update = {
    completedLectures,
    totalLectures,
    progressPercent,
    completedSubjects,
    totalSubjects,
    lastWatchedAt: new Date()
  };

  if (lastOpenedLectureId) {
    update.lastOpenedLectureId = lastOpenedLectureId;
  }

  return CourseProgress.findOneAndUpdate(
    { userId, courseId },
    update,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

module.exports = { syncCourseProgress };
```

### `utils/dnsIpv4.js`

```javascript
const dns = require('dns');

const preferIpv4Dns = () => {
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
};

module.exports = { preferIpv4Dns };
```

### `utils/emailConfig.js`

```javascript
const trimEnvValue = (value) => {
  if (value == null || value === '') return '';
  let v = String(value).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
};

const getEmailHost = () => trimEnvValue(process.env.EMAIL_HOST) || 'smtp.gmail.com';

const getEmailPort = () => Number(trimEnvValue(process.env.EMAIL_PORT)) || 587;

const getEmailUser = () => trimEnvValue(process.env.EMAIL_USER);

const getEmailPass = () => trimEnvValue(process.env.EMAIL_PASS).replace(/\s+/g, '');

const isEmailConfigured = () => Boolean(getEmailUser() && getEmailPass());

const assertEmailConfigured = () => {
  if (!isEmailConfigured()) {
    const err = new Error(
      'Email is not configured. Set EMAIL_USER and EMAIL_PASS (Gmail App Password) in .env or Render Environment.'
    );
    err.statusCode = 503;
    throw err;
  }
};

module.exports = {
  getEmailHost,
  getEmailPort,
  getEmailUser,
  getEmailPass,
  isEmailConfigured,
  assertEmailConfigured
};
```

### `utils/emailService.js`

```javascript
const dns = require('dns').promises;
const nodemailer = require('nodemailer');
const {
  getEmailHost,
  getEmailPort,
  getEmailUser,
  getEmailPass,
  isEmailConfigured
} = require('./emailConfig');

let transporter = null;

const resetTransporter = () => {
  transporter = null;
};

const createTransporter = async () => {
  const host = getEmailHost();
  const port = getEmailPort();
  const user = getEmailUser();
  const pass = getEmailPass();

  let smtpHost = host;
  try {
    const addresses = await dns.resolve4(host);
    if (addresses?.length) {
      smtpHost = addresses[0];
    }
  } catch {
    // use hostname if resolve fails (e.g. local dev)
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    tls: host !== smtpHost ? { servername: host, minVersion: 'TLSv1.2' } : { minVersion: 'TLSv1.2' },
    pool: true,
    maxConnections: 1,
    maxMessages: 100,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000
  });
};

const getTransporter = async () => {
  if (!isEmailConfigured()) {
    throw new Error('EMAIL_USER and EMAIL_PASS are not set');
  }
  if (!transporter) {
    transporter = await createTransporter();
    transporter.verify().then(() => {
      console.log('✅ Gmail SMTP ready:', getEmailUser());
    }).catch((err) => {
      console.error('❌ Gmail SMTP verify failed:', err.message);
    });
  }
  return transporter;
};

const generateOTPEmailHTML = (otp, userName, userType = 'student') => {
  const userTypeLabel = userType === 'parent' ? 'Parent' : 'Student';
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Sriram IAS OTP</title></head>
<body style="font-family:Segoe UI,sans-serif;background:#f5f5f5;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <h2 style="color:#667eea">Sriram IAS</h2>
    <p>Hello ${userName || 'User'},</p>
    <p>Your OTP to verify your ${userTypeLabel} account:</p>
    <p style="font-size:36px;font-weight:bold;letter-spacing:6px;color:#667eea">${otp}</p>
    <p style="color:#666">Valid for 5 minutes. Do not share this code.</p>
  </div>
</body>
</html>`;
};

const sendOTPEmail = async (to, otp, userName, userType = 'student') => {
  const transport = await getTransporter();
  const info = await transport.sendMail({
    from: `"Sriram IAS" <${getEmailUser()}>`,
    to,
    subject: 'Your OTP Code - Sriram IAS',
    html: generateOTPEmailHTML(otp, userName, userType),
    text: `Sriram IAS\n\nHello ${userName || 'User'},\n\nYour OTP: ${otp}\nValid for 5 minutes.\n`
  });
  console.log(`✅ OTP email sent to ${to}`, info.messageId);
  return info;
};

module.exports = {
  sendOTPEmail,
  getTransporter,
  isEmailConfigured,
  resetTransporter
};
```

### `utils/generateToken.js`

```javascript
const jwt = require('jsonwebtoken');

// Generate JWT Token
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

### `utils/lectureHelpers.js`

```javascript
const cloudinary = require('../config/cloudinary');

const NOT_DELETED = { isDeleted: false };

const stripQuizAnswers = (lecture) => {
  const doc = lecture.toObject ? lecture.toObject() : { ...lecture };
  if (Array.isArray(doc.topicQuiz)) {
    doc.topicQuiz = doc.topicQuiz.map((q) => ({
      question: q.question,
      options: q.options
    }));
  }
  return doc;
};

const sanitizeLectureForStudent = (lecture) => {
  const doc = stripQuizAnswers(lecture);

  if (doc.thumbnail) {
    doc.thumbnail = { url: doc.thumbnail.url || null };
  }

  if (doc.video) {
    doc.video = {
      url: doc.video.url || null,
      duration: doc.video.duration || 0
    };
  }

  if (doc.cheatSheet?.pdf) {
    doc.cheatSheet = {
      ...doc.cheatSheet,
      pdf: { url: doc.cheatSheet.pdf.url || null }
    };
  }

  delete doc.order;
  delete doc.isPreviewFree;

  return doc;
};

const formatLecture = (lecture) => {
  if (!lecture) return lecture;
  const doc = lecture.toObject ? lecture.toObject() : { ...lecture };
  delete doc.order;
  delete doc.isPreviewFree;
  delete doc.__v;
  return doc;
};

const formatLectures = (lectures) => lectures.map(formatLecture);

const withLectureTitles = (lecture, titles, { forStudent = false } = {}) => {
  const base = forStudent ? sanitizeLectureForStudent(lecture) : formatLecture(lecture);
  return {
    ...base,
    courseTitle: titles?.courseTitle ?? '',
    subjectTitle: titles?.subjectTitle ?? ''
  };
};

const withLectureTitlesList = (lectures, titles, options = {}) =>
  lectures.map((lecture) => withLectureTitles(lecture, titles, options));

const validateTopicQuiz = (quiz) => {
  if (!Array.isArray(quiz)) {
    return 'topicQuiz must be an array';
  }

  for (let i = 0; i < quiz.length; i++) {
    const q = quiz[i];
    if (!q?.question?.trim()) {
      return `Question ${i + 1}: question is required`;
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      return `Question ${i + 1}: exactly 4 options are required`;
    }
    if (q.options.some((opt) => !String(opt).trim())) {
      return `Question ${i + 1}: all options must be non-empty`;
    }
    const correct = Number(q.correctAnswer);
    if (!Number.isInteger(correct) || correct < 0 || correct > 3) {
      return `Question ${i + 1}: correctAnswer must be 0–3`;
    }
  }

  return null;
};

const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error('Cloudinary delete error:', error.message);
  }
};

const cleanupUploads = async (uploads) => {
  if (!uploads) return;
  if (uploads.thumbnail?.public_id) {
    await deleteFromCloudinary(uploads.thumbnail.public_id, 'image');
  }
  if (uploads.video?.public_id) {
    await deleteFromCloudinary(uploads.video.public_id, 'video');
  }
  if (uploads.cheatSheetPdf?.public_id) {
    await deleteFromCloudinary(uploads.cheatSheetPdf.public_id, 'raw');
  }
};

const getVideoDurationFromUpload = (videoUpload) => {
  if (!videoUpload) return 0;
  const duration = Number(videoUpload.duration);
  return Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0;
};

module.exports = {
  NOT_DELETED,
  stripQuizAnswers,
  sanitizeLectureForStudent,
  formatLecture,
  formatLectures,
  withLectureTitles,
  withLectureTitlesList,
  validateTopicQuiz,
  deleteFromCloudinary,
  cleanupUploads,
  getVideoDurationFromUpload
};
```

### `utils/lmsTestHelpers.js`

```javascript
const LmsTest = require('../models/LmsTest');
const LmsTestQuestion = require('../models/LmsTestQuestion');

const NOT_DELETED = { isDeleted: false };

const DEFAULT_CATEGORIES = [
  { title: 'Weekly Test', slug: 'weekly' },
  { title: 'Daily Test', slug: 'daily' },
  { title: 'Monthly Test', slug: 'monthly' }
];

const shuffleArray = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const buildSnapshotFromQuestion = (q) => ({
  questionId: q._id,
  question: q.question,
  options: [...q.options],
  correctAnswer: q.correctAnswer,
  explanation: q.explanation || '',
  marks: q.marks ?? 1,
  negativeMarks: q.negativeMarks ?? 0,
  questionImage: q.questionImage?.url
    ? { url: q.questionImage.url, public_id: q.questionImage.public_id }
    : undefined
});

/** Apply option shuffle; returns new snapshot rows with remapped correctAnswer */
const applyOptionShuffle = (snapshots) =>
  snapshots.map((snap) => {
    const indexed = snap.options.map((text, idx) => ({ text, idx }));
    const shuffled = shuffleArray(indexed);
    const newOptions = shuffled.map((o) => o.text);
    const newCorrect = shuffled.findIndex((o) => o.idx === snap.correctAnswer);
    return { ...snap, options: newOptions, correctAnswer: newCorrect };
  });

const buildQuestionSnapshot = (questions, test) => {
  let rows = questions.map(buildSnapshotFromQuestion);
  if (test.shuffleQuestions) {
    rows = shuffleArray(rows);
  }
  if (test.shuffleOptions) {
    rows = applyOptionShuffle(rows);
  }
  return rows;
};

const sanitizeQuestionForAttempt = (snap) => ({
  _id: snap.questionId,
  question: snap.question,
  options: snap.options,
  marks: snap.marks,
  questionImage: snap.questionImage?.url ? { url: snap.questionImage.url } : undefined
});

const isTestWithinSchedule = (test) => {
  const now = new Date();
  if (test.startDateTime && now < new Date(test.startDateTime)) {
    return { ok: false, message: 'Test has not started yet' };
  }
  if (test.endDateTime && now > new Date(test.endDateTime)) {
    return { ok: false, message: 'Test has ended' };
  }
  return { ok: true };
};

const syncTestTotals = async (testId) => {
  const questions = await LmsTestQuestion.find({ testId, ...NOT_DELETED }).lean();
  const totalQuestions = questions.length;
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  await LmsTest.findByIdAndUpdate(testId, { totalQuestions, totalMarks });
  return { totalQuestions, totalMarks };
};

const scoreAnswers = (snapshotQuestions, answerPayload, test) => {
  const answerMap = new Map(
    (answerPayload || []).map((a) => [String(a.questionId), a.selectedOption])
  );

  const gradedAnswers = [];
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let unanswered = 0;
  let obtainedMarks = 0;
  const totalMarks = snapshotQuestions.reduce((s, q) => s + (q.marks || 0), 0);
  const defaultNegative = test.negativeMarkPerWrongAnswer || 0;

  for (const q of snapshotQuestions) {
    const qid = String(q.questionId);
    const hasSelection =
      answerMap.has(qid) && answerMap.get(qid) !== null && answerMap.get(qid) !== undefined;
    const selectedOption = hasSelection ? Number(answerMap.get(qid)) : null;

    if (!hasSelection) {
      unanswered += 1;
      gradedAnswers.push({
        questionId: q.questionId,
        selectedOption: null,
        isCorrect: false,
        obtainedMarks: 0
      });
      continue;
    }

    const isCorrect = selectedOption === q.correctAnswer;
    let marksForQuestion = 0;

    if (isCorrect) {
      correctAnswers += 1;
      marksForQuestion = q.marks || 0;
    } else {
      wrongAnswers += 1;
      const neg = q.negativeMarks > 0 ? q.negativeMarks : defaultNegative;
      marksForQuestion = neg > 0 ? -neg : 0;
    }

    obtainedMarks += marksForQuestion;
    gradedAnswers.push({
      questionId: q.questionId,
      selectedOption,
      isCorrect,
      obtainedMarks: marksForQuestion
    });
  }

  obtainedMarks = Math.max(0, obtainedMarks);
  const percentage =
    totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 10000) / 100 : 0;
  const isPassed = obtainedMarks >= (test.passMarks || 0);

  return {
    gradedAnswers,
    totalQuestions: snapshotQuestions.length,
    correctAnswers,
    wrongAnswers,
    unanswered,
    obtainedMarks,
    totalMarks,
    percentage,
    isPassed,
    score: obtainedMarks
  };
};

const formatQuestionForReview = (snap, answerRow) => ({
  _id: snap.questionId,
  question: snap.question,
  options: snap.options,
  correctAnswer: snap.correctAnswer,
  explanation: snap.explanation,
  marks: snap.marks,
  negativeMarks: snap.negativeMarks,
  questionImage: snap.questionImage,
  selectedOption: answerRow?.selectedOption ?? null,
  isCorrect: answerRow?.isCorrect ?? false,
  obtainedMarks: answerRow?.obtainedMarks ?? 0
});

module.exports = {
  NOT_DELETED,
  DEFAULT_CATEGORIES,
  shuffleArray,
  buildQuestionSnapshot,
  sanitizeQuestionForAttempt,
  isTestWithinSchedule,
  syncTestTotals,
  scoreAnswers,
  formatQuestionForReview
};
```

### `utils/lmsTestSeed.js`

```javascript
const LmsTestCategory = require('../models/LmsTestCategory');
const { DEFAULT_CATEGORIES } = require('./lmsTestHelpers');

const seedLmsTestCategories = async () => {
  for (const cat of DEFAULT_CATEGORIES) {
    await LmsTestCategory.findOneAndUpdate(
      { slug: cat.slug },
      { $setOnInsert: cat },
      { upsert: true }
    );
  }
  console.log('✅ LMS test categories seeded (weekly, daily, monthly)');
};

module.exports = { seedLmsTestCategories };
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

### `utils/pagination.js`

```javascript
const getPagination = (query, defaultLimit = 20, maxLimit = 50) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const paginatedResponse = (data, total, page, limit) => ({
  success: true,
  count: data.length,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit) || 1,
  data
});

module.exports = { getPagination, paginatedResponse };
```

### `utils/resourceConstants.js`

```javascript
const MODULE_TYPES = {
  CURRENT_AFFAIRS: 'CURRENT_AFFAIRS',
  FREE_RESOURCES: 'FREE_RESOURCES'
};

const RESOURCE_TYPES = ['PDF', 'ARTICLE', 'MAGAZINE', 'INFOGRAPHIC', 'VIDEO'];

const FILTER_TYPES = {
  SUBJECT: 'SUBJECT',
  CLASS: 'CLASS',
  PAPER: 'PAPER',
  YEAR: 'YEAR',
  MONTH: 'MONTH',
  CURRENT_AFFAIRS_TYPE: 'CURRENT_AFFAIRS_TYPE'
};

const CATEGORY_NAME_HINTS = {
  NCERT: 'ncert',
  PYQ: ['previous year', 'pyq'],
  STUDY_MATERIAL: 'study material',
  MOCK_TEST: ['mock test', 'mock tests', 'free mock']
};

const FREE_RESOURCE_FILTER_KEYS = {
  NCERT: ['SUBJECT', 'CLASS'],
  PYQ: ['SUB_CATEGORY', 'PAPER', 'YEAR'],
  STUDY_MATERIAL: ['SUB_CATEGORY'],
  MOCK_TEST: ['SUB_CATEGORY'],
  GENERIC: ['SUBJECT', 'CLASS']
};

module.exports = {
  MODULE_TYPES,
  RESOURCE_TYPES,
  FILTER_TYPES,
  CATEGORY_NAME_HINTS,
  FREE_RESOURCE_FILTER_KEYS
};
```

### `utils/resourcePortalCache.js`

```javascript
/**
 * Lightweight in-memory cache for portal read APIs.
 * Swap with Redis later without changing portal controllers.
 */
const store = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000;

const buildKey = (prefix, parts = {}) => {
  const sorted = Object.keys(parts)
    .sort()
    .map((k) => `${k}=${parts[k] ?? ''}`)
    .join('&');
  return `${prefix}:${sorted}`;
};

const get = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
};

const set = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const invalidatePrefix = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(`${prefix}:`)) store.delete(key);
  }
};

module.exports = {
  buildKey,
  get,
  set,
  invalidatePrefix,
  DEFAULT_TTL_MS
};
```

### `utils/sanitizeText.js`

```javascript
/** Strip script tags and trim user HTML/text input */
const sanitizeText = (value) => {
  if (value == null || typeof value !== 'string') return value;
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
};

const sanitizeOptionalText = (value) => {
  if (value == null || value === '') return value;
  return sanitizeText(value);
};

module.exports = { sanitizeText, sanitizeOptionalText };
```

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

### `utils/testExamHelpers.js`

```javascript
const NOT_DELETED = { isDeleted: false };

const resolveExamEndDate = (exam) => {
  if (exam.examEndDate) return new Date(exam.examEndDate);
  const end = new Date(exam.examDate);
  end.setHours(23, 59, 59, 999);
  return end;
};

/** UPCOMING | LIVE | COMPLETED — based on exam window */
const resolveExamScheduleStatus = (exam, now = new Date()) => {
  const start = new Date(exam.examDate);
  const end = resolveExamEndDate(exam);

  if (now < start) return 'UPCOMING';
  if (now > end) return 'COMPLETED';
  return 'LIVE';
};

const isExamWindowOpen = (exam, now = new Date()) => {
  const status = resolveExamScheduleStatus(exam, now);
  return status === 'LIVE';
};

const sumQuestionMarks = (questions = []) =>
  questions.reduce((sum, q) => sum + (q.marks ?? 1), 0);

const syncExamTotals = (questions, explicitTotalMarks) => {
  const computed = sumQuestionMarks(questions);
  return explicitTotalMarks > 0 ? explicitTotalMarks : computed;
};

const validateQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length < 1) {
    return 'At least one question is required';
  }

  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    if (!q?.question?.trim()) return `Question ${i + 1}: text is required`;
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return `Question ${i + 1}: at least two options are required`;
    }
    const correct = Number(q.correctAnswer);
    if (!Number.isInteger(correct) || correct < 0 || correct >= q.options.length) {
      return `Question ${i + 1}: correctAnswer must be a valid option index`;
    }
  }

  return null;
};

const sanitizeQuestionForStudent = (q) => ({
  _id: q._id,
  question: q.question,
  options: q.options,
  marks: q.marks ?? 1
});

const sanitizeExamForStudent = (exam) => ({
  _id: exam._id,
  course: exam.course,
  subject: exam.subject,
  title: exam.title,
  description: exam.description,
  examDate: exam.examDate,
  examEndDate: exam.examEndDate,
  durationInMinutes: exam.durationInMinutes,
  totalMarks: exam.totalMarks,
  passMarks: exam.passMarks,
  negativeMarks: exam.negativeMarks,
  maxAttempts: exam.maxAttempts,
  scheduleStatus: resolveExamScheduleStatus(exam),
  questions: (exam.questions || []).map(sanitizeQuestionForStudent)
});

const formatScheduleItem = (exam, attemptCount = 0) => ({
  _id: exam._id,
  title: exam.title,
  description: exam.description,
  examDate: exam.examDate,
  examEndDate: exam.examEndDate,
  durationInMinutes: exam.durationInMinutes,
  totalMarks: exam.totalMarks,
  passMarks: exam.passMarks,
  maxAttempts: exam.maxAttempts,
  scheduleStatus: resolveExamScheduleStatus(exam),
  attemptCount,
  attemptsRemaining: Math.max(0, (exam.maxAttempts || 1) - attemptCount),
  subject: exam.subject
    ? {
        _id: exam.subject._id,
        title: exam.subject.title
      }
    : null
});

const normalizeAnswerPayload = (questions, answersPayload) => {
  if (!Array.isArray(answersPayload)) return new Map();

  const map = new Map();

  if (answersPayload.length && typeof answersPayload[0] === 'object') {
    for (const row of answersPayload) {
      if (row?.questionId === undefined || row?.questionId === null) continue;
      const selected =
        row.selectedOption === null || row.selectedOption === undefined
          ? null
          : Number(row.selectedOption);
      map.set(String(row.questionId), selected);
    }
    return map;
  }

  questions.forEach((q, index) => {
    const raw = answersPayload[index];
    if (raw === undefined || raw === null) return;
    map.set(String(q._id), Number(raw));
  });

  return map;
};

const scoreTestExam = (exam, answerMap) => {
  const resultAnswers = [];
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let skippedAnswers = 0;
  let score = 0;

  const defaultNegative = exam.negativeMarks ?? 0;
  const totalMarks = exam.totalMarks || sumQuestionMarks(exam.questions);

  for (const question of exam.questions) {
    const qid = String(question._id);
    const hasSelection = answerMap.has(qid) && answerMap.get(qid) !== null;
    const selectedOption = hasSelection ? answerMap.get(qid) : null;

    if (!hasSelection) {
      skippedAnswers += 1;
      resultAnswers.push({
        questionId: question._id,
        selectedOption: null,
        isCorrect: false,
        obtainedMarks: 0
      });
      continue;
    }

    const isCorrect = selectedOption === question.correctAnswer;
    let obtainedMarks = 0;

    if (isCorrect) {
      correctAnswers += 1;
      obtainedMarks = question.marks ?? 1;
    } else {
      wrongAnswers += 1;
      const neg =
        question.negativeMarks > 0 ? question.negativeMarks : defaultNegative;
      obtainedMarks = neg > 0 ? -neg : 0;
    }

    score += obtainedMarks;
    resultAnswers.push({
      questionId: question._id,
      selectedOption,
      isCorrect,
      obtainedMarks
    });
  }

  score = Math.max(0, Math.round(score * 100) / 100);
  const percentage =
    totalMarks > 0 ? Math.round((score / totalMarks) * 10000) / 100 : 0;
  const resultStatus = score >= (exam.passMarks || 0) ? 'PASS' : 'FAIL';

  return {
    answers: resultAnswers,
    totalQuestions: exam.questions.length,
    correctAnswers,
    wrongAnswers,
    skippedAnswers,
    score,
    totalMarks,
    percentage,
    resultStatus
  };
};

const formatResultSummary = (result) => ({
  _id: result._id,
  testExam: result.testExam,
  course: result.course,
  totalQuestions: result.totalQuestions,
  correctAnswers: result.correctAnswers,
  wrongAnswers: result.wrongAnswers,
  skippedAnswers: result.skippedAnswers,
  score: result.score,
  totalMarks: result.totalMarks,
  percentage: result.percentage,
  resultStatus: result.resultStatus,
  attemptNumber: result.attemptNumber,
  timeTakenInSeconds: result.timeTakenInSeconds,
  submittedAt: result.submittedAt,
  createdAt: result.createdAt
});

module.exports = {
  NOT_DELETED,
  resolveExamEndDate,
  resolveExamScheduleStatus,
  isExamWindowOpen,
  sumQuestionMarks,
  syncExamTotals,
  validateQuestions,
  sanitizeQuestionForStudent,
  sanitizeExamForStudent,
  formatScheduleItem,
  normalizeAnswerPayload,
  scoreTestExam,
  formatResultSummary
};
```

### `utils/uploadToCloudinary.js`

```javascript
const cloudinary = require('../config/cloudinary');

const uploadToCloudinary = async (file, folder = 'courses', resourceType = 'auto', format = null) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: folder,
      resource_type: resourceType // 'auto' for images/videos, 'raw' for PDFs
    };

    // Add format if specified (e.g., 'pdf' for brochures)
    if (format) {
      uploadOptions.format = format;
    }

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            duration: result.duration ? Math.round(result.duration) : 0,
            bytes: result.bytes
          });
        }
      }
    ).end(file.buffer);
  });
};

module.exports = uploadToCloudinary;
```



