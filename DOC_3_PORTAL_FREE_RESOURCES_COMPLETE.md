# Portal UI & Free Resources CMS

> **Project:** Sriram-IAS Backend  
> **Volume:** `DOC_3_PORTAL_FREE_RESOURCES_COMPLETE.md`  
> **Files:** 40  
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

Student portal tabs (Current Affairs + Free Resources) and admin CMS at `/api/resources/*`.

---

## 2. Files in this volume

- `controllers/filterController.js`
- `controllers/mockTestController.js`
- `controllers/portalCurrentAffairsController.js`
- `controllers/portalFreeResourcesController.js`
- `controllers/questionController.js`
- `controllers/resourceCategoryController.js`
- `controllers/resourceController.js`
- `controllers/testAttemptController.js`
- `controllers/testCategoryController.js`
- `controllers/testContentController.js`
- `controllers/testPaperController.js`
- `controllers/testQuestionController.js`
- `models/Filter.js`
- `models/MockTest.js`
- `models/Question.js`
- `models/Resource.js`
- `models/ResourceCategory.js`
- `models/ResourceDownload.js`
- `models/ResourceViewHistory.js`
- `models/Result.js`
- `models/SubCategory.js`
- `models/TestAttempt.js`
- `models/TestCategory.js`
- `models/TestContent.js`
- `models/TestPaper.js`
- `models/TestQuestion.js`
- `routes/filterRoutes.js`
- `routes/mockTestRoutes.js`
- `routes/portalCurrentAffairsRoutes.js`
- `routes/portalFreeResourceRoutes.js`
- `routes/questionRoutes.js`
- `routes/resourceFileRoutes.js`
- `routes/resourceRoutes.js`
- `routes/testAttemptRoutes.js`
- `routes/testCategoryRoutes.js`
- `routes/testContentRoutes.js`
- `routes/testPaperRoutes.js`
- `routes/testQuestionRoutes.js`
- `services/currentAffairsService.js`
- `services/resourceService.js`

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

### `controllers/filterController.js`

```javascript
const Filter = require('../models/Filter');

// ==================== FILTER CONTROLLERS ====================

exports.createFilter = async (req, res) => {
  try {
    const { type, value, categoryId, subCategoryId } = req.body;

    // Check if filter already exists
    const existingFilter = await Filter.findOne({
      type,
      value,
      categoryId,
      subCategoryId: subCategoryId || null
    });

    if (existingFilter) {
      return res.status(400).json({
        success: false,
        message: 'Filter already exists for this category'
      });
    }

    const filter = new Filter({
      type,
      value,
      categoryId,
      subCategoryId: subCategoryId || null,
      centerId: req.user.center || null
    });

    await filter.save();

    res.status(201).json({
      success: true,
      message: 'Filter created successfully',
      data: filter
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Filter already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getFilters = async (req, res) => {
  try {
    const { type, categoryId, subCategoryId, isActive } = req.query;
    
    const filter = {};
    
    // Enforce center-based filtering for Center Admin
    if (req.user && req.user.role === 'center_admin') {
      filter.centerId = req.user.center;
    }
    
    if (type) filter.type = type;
    if (categoryId) filter.categoryId = categoryId;
    if (subCategoryId) filter.subCategoryId = subCategoryId;
    
    // Always filter active by default
    filter.isActive = isActive !== undefined ? isActive === 'true' : true;

    const filters = await Filter.find(filter)
      .populate('categoryId', 'name slug')
      .populate('subCategoryId', 'name')
      .sort({ type: 1, value: 1 });

    res.json({
      success: true,
      count: filters.length,
      data: filters
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getFiltersByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { type } = req.query;

    const filter = { categoryId };
    if (type) filter.type = type;

    const filters = await Filter.find(filter)
      .populate('subCategoryId', 'name')
      .sort({ type: 1, value: 1 });

    // Group by type
    const groupedFilters = filters.reduce((acc, filter) => {
      if (!acc[filter.type]) {
        acc[filter.type] = [];
      }
      acc[filter.type].push({
        _id: filter._id,
        value: filter.value,
        subCategoryId: filter.subCategoryId
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: groupedFilters
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateFilter = async (req, res) => {
  try {
    const { value, isActive } = req.body;
    const filter = await Filter.findById(req.params.id);

    if (!filter) {
      return res.status(404).json({
        success: false,
        message: 'Filter not found'
      });
    }

    filter.value = value || filter.value;
    filter.isActive = isActive !== undefined ? isActive : filter.isActive;

    await filter.save();

    res.json({
      success: true,
      message: 'Filter updated successfully',
      data: filter
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteFilter = async (req, res) => {
  try {
    const filter = await Filter.findById(req.params.id);

    if (!filter) {
      return res.status(404).json({
        success: false,
        message: 'Filter not found'
      });
    }

    await filter.deleteOne();

    res.json({
      success: true,
      message: 'Filter deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

### `controllers/mockTestController.js`

```javascript
const MockTest = require('../models/MockTest');
const Question = require('../models/Question');
const Result = require('../models/Result');
const { buildPaginationResponse } = require('../middleware/resourceMiddleware');

// ==================== MOCK TEST CONTROLLERS ====================

exports.createMockTest = async (req, res) => {
  try {
    const {
      title,
      description,
      categoryId,
      subCategoryId,
      subjectId,
      paperId,
      yearId,
      duration,
      passingMarks,
      questions
    } = req.body;

    // Validate questions array
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one question is required'
      });
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.options || q.options.length !== 4 || !q.correctAnswer) {
        return res.status(400).json({
          success: false,
          message: `Question ${i + 1} is invalid. Must have question text, 4 options, and correct answer`
        });
      }
    }

    // Step 1: Save questions to Question collection
    const createdQuestions = await Question.insertMany(
      questions.map(q => ({
        ...q,
        createdBy: req.user._id
      }))
    );

    // Step 2: Extract question IDs
    const questionIds = createdQuestions.map(q => q._id);

    // Step 3: Create mock test with question IDs
    const mockTest = new MockTest({
      title,
      description,
      categoryId,
      subCategoryId: subCategoryId || null,
      subjectId: subjectId || null,
      paperId: paperId || null,
      yearId: yearId || null,
      questionIds,
      duration,
      passingMarks: passingMarks || null,
      createdBy: req.user._id,
      centerId: req.user.center || null
    });

    await mockTest.save();

    // Step 4: Return with populated questions for API consistency
    const populatedTest = await MockTest.findById(mockTest._id)
      .populate('questionIds')
      .populate('categoryId', 'name')
      .populate('subCategoryId', 'name');

    res.status(201).json({
      success: true,
      message: 'Mock test created successfully',
      data: {
        ...populatedTest.toObject(),
        questions: populatedTest.questionIds,
        questionIds: undefined
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMockTests = async (req, res) => {
  try {
    const { 
      categoryId, 
      subCategoryId, 
      subjectId, 
      paperId, 
      yearId, 
      isActive,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};

    // Enforce center-based filtering for Center Admin
    if (req.user && req.user.role === 'center_admin') {
      filter.centerId = req.user.center;
    }

    // Apply module-specific filters
    if (categoryId) filter.categoryId = categoryId;
    if (subCategoryId) filter.subCategoryId = subCategoryId;
    if (subjectId) filter.subjectId = subjectId;
    if (paperId) filter.paperId = paperId;
    if (yearId) filter.yearId = yearId;
    
    // Always filter active by default
    filter.isActive = isActive !== undefined ? isActive === 'true' : true;

    // Search by title or description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [mockTests, total] = await Promise.all([
      MockTest.find(filter)
        .populate('categoryId', 'name')
        .populate('subCategoryId', 'name')
        .populate('subjectId', 'value type')
        .populate('paperId', 'value type')
        .populate('yearId', 'value type')
        .select('-questionIds') // Don't send questions in list view
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      MockTest.countDocuments(filter)
    ]);

    res.json(buildPaginationResponse(mockTests, total, parseInt(page), parseInt(limit)));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMockTestById = async (req, res) => {
  try {
    const { includeQuestions } = req.query;
    
    // Always populate questions by default
    let query = MockTest.findById(req.params.id)
      .populate('categoryId', 'name')
      .populate('subCategoryId', 'name')
      .populate('questionIds');

    const mockTest = await query;

    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }

    // Transform response to show 'questions' instead of 'questionIds'
    const responseData = mockTest.toObject();
    
    // SECURITY: Filter questions based on user role
    if (mockTest.questionIds && Array.isArray(mockTest.questionIds)) {
      responseData.questions = mockTest.questionIds.map(q => {
        // Base fields everyone can see
        const questionObj = {
          _id: q._id,
          question: q.question,
          options: q.options,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          isActive: q.isActive,
          createdBy: q.createdBy,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt,
          __v: q.__v
        };

        // ONLY admins can see correctAnswer and explanation
        const isAdmin = req.user && (req.user.role === 'super_admin' || req.user.role === 'center_admin');
        
        if (isAdmin) {
          questionObj.correctAnswer = q.correctAnswer;
          questionObj.explanation = q.explanation;
        }

        return questionObj;
      });
    }
    
    delete responseData.questionIds;

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateMockTest = async (req, res) => {
  try {
    const mockTest = await MockTest.findById(req.params.id);

    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }

    const updates = {
      title: req.body.title || mockTest.title,
      description: req.body.description || mockTest.description,
      // Module-specific filter IDs
      subjectId: req.body.subjectId !== undefined ? req.body.subjectId : mockTest.subjectId,
      paperId: req.body.paperId !== undefined ? req.body.paperId : mockTest.paperId,
      yearId: req.body.yearId !== undefined ? req.body.yearId : mockTest.yearId,
      duration: req.body.duration || mockTest.duration,
      passingMarks: req.body.passingMarks || mockTest.passingMarks,
      isActive: req.body.isActive !== undefined ? req.body.isActive : mockTest.isActive
    };

    // Update questions if provided
    if (req.body.questions && Array.isArray(req.body.questions)) {
      const questions = req.body.questions;
      
      // Validate each question
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question || !q.options || q.options.length !== 4 || !q.correctAnswer) {
          return res.status(400).json({
            success: false,
            message: `Question ${i + 1} is invalid. Must have question text, 4 options, and correct answer`
          });
        }
      }

      updates.questions = questions;
    }

    Object.assign(mockTest, updates);
    await mockTest.save();

    res.json({
      success: true,
      message: 'Mock test updated successfully',
      data: mockTest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteMockTest = async (req, res) => {
  try {
    const mockTest = await MockTest.findById(req.params.id);

    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }

    // Check if test has results
    const results = await Result.countDocuments({ testId: req.params.id });
    if (results > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete mock test. It has associated results.'
      });
    }

    await mockTest.deleteOne();

    res.json({
      success: true,
      message: 'Mock test deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== QUESTION MANAGEMENT ====================

exports.addQuestion = async (req, res) => {
  try {
    const { id: testId } = req.params;
    const questionData = req.body;

    // Validate question
    if (!questionData.question || !questionData.options || questionData.options.length !== 4 || !questionData.correctAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question. Must have question text, 4 options, and correct answer'
      });
    }

    // Check if mock test exists
    const mockTest = await MockTest.findById(testId);
    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }

    // Create question
    const question = new Question({
      ...questionData,
      createdBy: req.user._id
    });

    await question.save();

    // Add question ID to mock test
    mockTest.questionIds.push(question._id);
    await mockTest.save();

    res.status(201).json({
      success: true,
      message: 'Question added successfully',
      data: question
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.addQuestions = async (req, res) => {
  try {
    const { id: testId } = req.params;
    const { questions } = req.body;

    // Validate questions array
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Questions array is required'
      });
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.options || q.options.length !== 4 || !q.correctAnswer) {
        return res.status(400).json({
          success: false,
          message: `Question ${i + 1} is invalid. Must have question text, 4 options, and correct answer`
        });
      }
    }

    // Check if mock test exists
    const mockTest = await MockTest.findById(testId);
    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }

    // Create questions
    const createdQuestions = await Question.insertMany(
      questions.map(q => ({
        ...q,
        createdBy: req.user._id
      }))
    );

    // Add question IDs to mock test
    const questionIds = createdQuestions.map(q => q._id);
    mockTest.questionIds.push(...questionIds);
    await mockTest.save();

    res.status(201).json({
      success: true,
      message: `${createdQuestions.length} questions added successfully`,
      data: createdQuestions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.removeQuestion = async (req, res) => {
  try {
    const { id: testId, questionId } = req.params;

    // Check if mock test exists
    const mockTest = await MockTest.findById(testId);
    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }

    // Remove question ID from mock test
    mockTest.questionIds = mockTest.questionIds.filter(
      qId => qId.toString() !== questionId
    );
    await mockTest.save();

    // Optionally delete the question itself
    await Question.findByIdAndDelete(questionId);

    res.json({
      success: true,
      message: 'Question removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== TEST ATTEMPT & EVALUATION ====================

exports.attemptTest = async (req, res) => {
  try {
    // Get testId from URL params instead of body
    const testId = req.params.id;
    const { answers, timeTaken, startedAt } = req.body;

    // SECURITY CHECK 1: Validate answers format
    if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Answers are required in format { questionId: selectedAnswer }'
      });
    }

    // SECURITY CHECK 2: Prevent multiple attempts
    const existingResult = await Result.findOne({
      userId: req.user._id,
      testId
    });

    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: 'You have already attempted this test. Multiple attempts are not allowed.'
      });
    }

    // SECURITY CHECK 3: Get the mock test with questions
    const mockTest = await MockTest.findById(testId)
      .populate('questionIds');
    
    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }

    // SECURITY CHECK 4: Verify test is active
    if (!mockTest.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This test is no longer active'
      });
    }

    // SECURITY CHECK 5: Validate that all question IDs belong to this test
    const submittedQuestionIds = Object.keys(answers);
    const testQuestionIds = mockTest.questionIds.map(q => q._id.toString());
    
    const invalidQuestions = submittedQuestionIds.filter(
      qId => !testQuestionIds.includes(qId)
    );

    if (invalidQuestions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question IDs detected'
      });
    }

    // SECURITY CHECK 6: Evaluate answers with case-insensitive comparison
    let score = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let skippedQuestions = 0;

    const evaluatedAnswers = mockTest.questionIds.map(question => {
      const selectedAnswer = answers[question._id.toString()];
      
      // Skipped question
      if (!selectedAnswer || selectedAnswer.trim() === '') {
        skippedQuestions++;
        return {
          questionId: question._id,
          selectedAnswer: null,
          isCorrect: false,
          marksObtained: 0
        };
      }

      // Case-insensitive comparison to avoid mismatch issues
      const isCorrect = selectedAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
      let marksObtained = 0;
      
      if (isCorrect) {
        marksObtained = question.marks || 1;
        score += marksObtained;
        correctAnswers++;
      } else {
        marksObtained = -(question.negativeMarks || 0);
        score += marksObtained; // Could be negative
        wrongAnswers++;
      }

      return {
        questionId: question._id,
        selectedAnswer: selectedAnswer.trim(),
        isCorrect,
        marksObtained
      };
    });

    // SECURITY CHECK 7: Calculate percentage safely
    const percentage = mockTest.totalMarks > 0 
      ? parseFloat(((score / mockTest.totalMarks) * 100).toFixed(2)) 
      : 0.00;

    // SECURITY CHECK 8: Determine pass/fail
    const passed = mockTest.passingMarks ? score >= mockTest.passingMarks : null;

    // Create result record
    const result = new Result({
      userId: req.user._id,
      testId,
      answers: evaluatedAnswers,
      score,
      totalMarks: mockTest.totalMarks,
      correctAnswers,
      wrongAnswers,
      skippedQuestions,
      percentage,
      passed,
      timeTaken: timeTaken || null,
      startedAt: startedAt || new Date(),
      completedAt: new Date()
    });

    await result.save();

    // Return immediate results
    res.status(201).json({
      success: true,
      message: 'Test submitted successfully',
      data: {
        resultId: result._id,
        score,
        totalMarks: mockTest.totalMarks,
        correctAnswers,
        wrongAnswers,
        skippedQuestions,
        percentage,
        passed
      }
    });
  } catch (error) {
    console.error('Error in attemptTest:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getUserResults = async (req, res) => {
  try {
    const results = await Result.find({ userId: req.user._id })
      .populate('testId', 'title subject paper year')
      .sort({ completedAt: -1 });

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getResultById = async (req, res) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate('testId', 'title subject paper year questions')
      .populate('userId', 'name email');

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    // Check if user is authorized to view this result
    if (req.user.role === 'student' && result.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this result'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

### `controllers/portalCurrentAffairsController.js`

```javascript
const currentAffairsService = require('../services/currentAffairsService');

const getRequestUserId = (user) => user?._id || user?.id || null;

exports.getFilters = async (req, res) => {
  try {
    const data = await currentAffairsService.getCurrentAffairsFilters();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Current affairs filters error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getResources = async (req, res) => {
  try {
    const data = await currentAffairsService.getCurrentAffairsResources(req.query);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Current affairs resources error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await currentAffairsService.getCurrentAffairsById(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('Current affairs detail error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.viewResource = async (req, res) => {
  try {
    const data = await currentAffairsService.trackCurrentAffairsView(
      req.params.id,
      getRequestUserId(req.user)
    );
    if (!data) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('Current affairs view error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.downloadResource = async (req, res) => {
  try {
    const data = await currentAffairsService.recordCurrentAffairsDownload(
      req.params.id,
      getRequestUserId(req.user)
    );
    if (!data) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.json({ success: true, message: 'Download tracked', data });
  } catch (error) {
    console.error('Current affairs download error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/portalFreeResourcesController.js`

```javascript
const resourceService = require('../services/resourceService');
const { MODULE_TYPES } = require('../utils/resourceConstants');

const getRequestUserId = (user) => user?._id || user?.id || null;

exports.getFilters = async (req, res) => {
  try {
    const data = await resourceService.getFreeResourcesFilters(req.query);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Free resources filters error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getDynamicFilters = async (req, res) => {
  try {
    const { typeId } = req.query;
    if (!typeId) {
      return res.status(400).json({
        success: false,
        message: 'typeId query parameter is required (categoryId: NCERT, PYQ, etc.)'
      });
    }

    const data = await resourceService.getFreeResourcesDynamicFilters(typeId);
    if (data === null) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Free resources dynamic filters error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getResources = async (req, res) => {
  try {
    const result = await resourceService.getFreeResourcesResources(req.query);

    if (result?.error === 'typeId is required (this is the categoryId)') {
      return res.status(400).json({ success: false, message: result.error });
    }
    if (result?.error) {
      return res.status(404).json({ success: false, message: result.error });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Free resources list error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await resourceService.getFreeResourceById(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('Free resource detail error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.viewResource = async (req, res) => {
  try {
    const data = await resourceService.trackResourceView(
      req.params.id,
      MODULE_TYPES.FREE_RESOURCES,
      getRequestUserId(req.user)
    );
    if (!data) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('Free resource view error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.downloadResource = async (req, res) => {
  try {
    const data = await resourceService.recordResourceDownload(
      req.params.id,
      MODULE_TYPES.FREE_RESOURCES,
      getRequestUserId(req.user)
    );
    if (!data) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.json({ success: true, message: 'Download tracked', data });
  } catch (error) {
    console.error('Free resource download error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/questionController.js`

```javascript
const Question = require('../models/Question');

// ==================== QUESTION CONTROLLERS ====================

exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const {
      question,
      options,
      correctAnswer,
      explanation,
      marks,
      negativeMarks,
      isActive
    } = req.body;

    // Find question
    const existingQuestion = await Question.findById(req.params.id);
    if (!existingQuestion) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Validate options if provided
    if (options && options.length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Must have exactly 4 options'
      });
    }

    // Validate correctAnswer matches one of the options
    if (correctAnswer && options && !options.includes(correctAnswer)) {
      return res.status(400).json({
        success: false,
        message: 'Correct answer must match one of the options'
      });
    }

    // Update question
    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      {
        question: question || existingQuestion.question,
        options: options || existingQuestion.options,
        correctAnswer: correctAnswer || existingQuestion.correctAnswer,
        explanation: explanation !== undefined ? explanation : existingQuestion.explanation,
        marks: marks !== undefined ? marks : existingQuestion.marks,
        negativeMarks: negativeMarks !== undefined ? negativeMarks : existingQuestion.negativeMarks,
        isActive: isActive !== undefined ? isActive : existingQuestion.isActive
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Question updated successfully',
      data: updatedQuestion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    await question.deleteOne();

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

### `controllers/resourceCategoryController.js`

```javascript
const ResourceCategory = require('../models/ResourceCategory');
const SubCategory = require('../models/SubCategory');
const Filter = require('../models/Filter');
const Resource = require('../models/Resource');
const MockTest = require('../models/MockTest');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const { paginate, buildPaginationResponse } = require('../middleware/resourceMiddleware');

// ==================== CATEGORY CONTROLLERS ====================

exports.createCategory = async (req, res) => {
  try {
    const { name, description, moduleType } = req.body;

    let thumbnailData = {};
    if (req.file) {
      const result = await uploadToCloudinary(req.file, 'resources/categories');
      thumbnailData = {
        url: result.url,
        public_id: result.public_id
      };
    }

    const category = new ResourceCategory({
      name,
      description,
      moduleType: moduleType || 'FREE_RESOURCES',
      thumbnail: thumbnailData,
      createdBy: req.user._id,
      centerId: req.user.center || null
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = {};
    
    // Enforce center-based filtering for Center Admin
    if (req.user && req.user.role === 'center_admin') {
      filter.centerId = req.user.center;
    }
    
    // Always filter active by default unless specified
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    } else {
      filter.isActive = true;
    }

    const categories = await ResourceCategory.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const category = await ResourceCategory.findById(req.params.id);
    
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name, description, isActive, moduleType } = req.body;
    const category = await ResourceCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    let thumbnailData = category.thumbnail;
    if (req.file) {
      const result = await uploadToCloudinary(req.file, 'resources/categories');
      thumbnailData = {
        url: result.url,
        public_id: result.public_id
      };
    }

    category.name = name || category.name;
    category.description = description || category.description;
    if (moduleType) category.moduleType = moduleType;
    category.thumbnail = thumbnailData;
    category.isActive = isActive !== undefined ? isActive : category.isActive;
    // Update centerId if admin changes (Super Admin only)
    if (req.user.role === 'super_admin' && req.body.centerId) {
      category.centerId = req.body.centerId;
    }

    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await ResourceCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has subcategories or resources
    const subCategories = await SubCategory.countDocuments({ categoryId: req.params.id });
    const resources = await Resource.countDocuments({ categoryId: req.params.id });
    const mockTests = await MockTest.countDocuments({ categoryId: req.params.id });

    if (subCategories > 0 || resources > 0 || mockTests > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category. It has associated subcategories, resources, or mock tests.'
      });
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== SUBCATEGORY CONTROLLERS ====================

exports.createSubCategory = async (req, res) => {
  try {
    const { name, categoryId, description } = req.body;

    // Check if category exists
    const category = await ResourceCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    let thumbnailData = {};
    if (req.file) {
      const result = await uploadToCloudinary(req.file, 'resources/subcategories');
      thumbnailData = {
        url: result.url,
        public_id: result.public_id
      };
    }

    const subCategory = new SubCategory({
      name,
      categoryId,
      description,
      thumbnail: thumbnailData
    });

    await subCategory.save();

    res.status(201).json({
      success: true,
      message: 'SubCategory created successfully',
      data: subCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getSubCategories = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { isActive } = req.query;
    
    const filter = {};
    if (categoryId) {
      filter.categoryId = categoryId;
    }
    
    // Always filter active by default
    filter.isActive = isActive !== undefined ? isActive === 'true' : true;

    const subCategories = await SubCategory.find(filter)
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: subCategories.length,
      data: subCategories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateSubCategory = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const subCategory = await SubCategory.findById(req.params.id);

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: 'SubCategory not found'
      });
    }

    let thumbnailData = subCategory.thumbnail;
    if (req.file) {
      const result = await uploadToCloudinary(req.file, 'resources/subcategories');
      thumbnailData = {
        url: result.url,
        public_id: result.public_id
      };
    }

    subCategory.name = name || subCategory.name;
    subCategory.description = description || subCategory.description;
    subCategory.thumbnail = thumbnailData;
    subCategory.isActive = isActive !== undefined ? isActive : subCategory.isActive;

    await subCategory.save();

    res.json({
      success: true,
      message: 'SubCategory updated successfully',
      data: subCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteSubCategory = async (req, res) => {
  try {
    const subCategory = await SubCategory.findById(req.params.id);

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: 'SubCategory not found'
      });
    }

    // Check if subcategory has resources or mock tests
    const resources = await Resource.countDocuments({ subCategoryId: req.params.id });
    const mockTests = await MockTest.countDocuments({ subCategoryId: req.params.id });

    if (resources > 0 || mockTests > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete subcategory. It has associated resources or mock tests.'
      });
    }

    await subCategory.deleteOne();

    res.json({
      success: true,
      message: 'SubCategory deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

### `controllers/resourceController.js`

```javascript
const Resource = require('../models/Resource');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const cloudinary = require('../config/cloudinary');
const { paginate, buildPaginationResponse } = require('../middleware/resourceMiddleware');

// ==================== RESOURCE CONTROLLERS ====================

exports.createResource = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      categoryId, 
      subCategoryId, 
      subjectId, 
      classId, 
      paperId, 
      yearId,
      monthId,
      typeId,
      resourceType,
      fileSize,
      fileType
    } = req.body;

    // Validate required fields
    if (!title || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Title and categoryId are required'
      });
    }

    // Validate file
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        message: 'File is required'
      });
    }

    // Module-specific validation
    const ResourceCategory = require('../models/ResourceCategory');
    const category = await ResourceCategory.findById(categoryId);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Validate filter combinations based on category
    const categoryName = category.name.toLowerCase();
    const isCurrentAffairs = category.moduleType === 'CURRENT_AFFAIRS';

    if (isCurrentAffairs) {
      if (!yearId) {
        return res.status(400).json({
          success: false,
          message: 'Current affairs resources require yearId'
        });
      }
    } else if (categoryName.includes('ncert')) {
      // NCERT should only have subjectId and classId
      if (paperId || yearId) {
        return res.status(400).json({
          success: false,
          message: 'NCERT resources should not have paperId or yearId'
        });
      }
    } else if (categoryName.includes('previous year') || categoryName.includes('pyq')) {
      // PYQ should have subCategoryId, paperId, and yearId
      if (!subCategoryId) {
        return res.status(400).json({
          success: false,
          message: 'PYQ resources require subCategoryId (Prelims/Mains)'
        });
      }
      if (!paperId || !yearId) {
        return res.status(400).json({
          success: false,
          message: 'PYQ resources require paperId and yearId'
        });
      }
      if (subjectId || classId) {
        return res.status(400).json({
          success: false,
          message: 'PYQ resources should not have subjectId or classId'
        });
      }
    } else if (categoryName.includes('study material')) {
      // Study Material should only have subCategoryId
      if (subjectId || classId || paperId || yearId) {
        return res.status(400).json({
          success: false,
          message: 'Study materials should only have subCategoryId'
        });
      }
    }

    // Upload file to Cloudinary (PDFs use 'raw' resource type)
    const fileResult = await uploadToCloudinary(
      req.files.file[0],
      'resources/files',
      'raw',
      'pdf'
    );

    let thumbnailData = {};
    if (req.files.thumbnail) {
      const thumbnailResult = await uploadToCloudinary(
        req.files.thumbnail[0],
        'resources/thumbnails'
      );
      thumbnailData = {
        url: thumbnailResult.url,
        public_id: thumbnailResult.public_id
      };
    }

    const resource = new Resource({
      title,
      description,
      categoryId,
      subCategoryId: subCategoryId || null,
      // Module-specific filter IDs
      subjectId: subjectId || null,  // For NCERT
      classId: classId || null,       // For NCERT
      paperId: paperId || null,       // For PYQ
      yearId: yearId || null,         // For PYQ / Current Affairs
      monthId: monthId || null,
      currentAffairsTypeId: typeId || null,
      resourceType: resourceType || 'PDF',
      fileUrl: {
        url: fileResult.url,
        public_id: fileResult.public_id
      },
      thumbnail: thumbnailData,
      fileSize: fileSize || null,
      fileType: fileType || 'pdf',
      createdBy: req.user._id,
      centerId: req.user.center || null
    });

    await resource.save();

    res.status(201).json({
      success: true,
      message: 'Resource created successfully',
      data: resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getResources = async (req, res) => {
  try {
    const { 
      categoryId, 
      subCategoryId, 
      subjectId, 
      classId, 
      paperId, 
      yearId,
      isActive,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};

    // Enforce center-based filtering for Center Admin
    if (req.user && req.user.role === 'center_admin') {
      filter.centerId = req.user.center;
    }

    // Apply module-specific filters
    if (categoryId) filter.categoryId = categoryId;
    if (subCategoryId) filter.subCategoryId = subCategoryId;
    if (subjectId) filter.subjectId = subjectId;  // NCERT
    if (classId) filter.classId = classId;         // NCERT
    if (paperId) filter.paperId = paperId;         // PYQ
    if (yearId) filter.yearId = yearId;            // PYQ
    
    // Always filter active by default
    filter.isActive = isActive !== undefined ? isActive === 'true' : true;

    // Search by title or description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [resources, total] = await Promise.all([
      Resource.find(filter)
        .populate('categoryId', 'name slug')
        .populate('subCategoryId', 'name')
        .populate('subjectId', 'value type')
        .populate('classId', 'value type')
        .populate('paperId', 'value type')
        .populate('yearId', 'value type')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Resource.countDocuments(filter)
    ]);

    res.json(buildPaginationResponse(resources, total, parseInt(page), parseInt(limit)));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('categoryId', 'name slug')
      .populate('subCategoryId', 'name');

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Increment download count
    resource.downloads += 1;
    await resource.save();

    res.json({
      success: true,
      data: resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    const updates = {
      title: req.body.title || resource.title,
      description: req.body.description || resource.description,
      // Module-specific filter IDs
      subjectId: req.body.subjectId !== undefined ? req.body.subjectId : resource.subjectId,
      classId: req.body.classId !== undefined ? req.body.classId : resource.classId,
      paperId: req.body.paperId !== undefined ? req.body.paperId : resource.paperId,
      yearId: req.body.yearId !== undefined ? req.body.yearId : resource.yearId,
      monthId: req.body.monthId !== undefined ? req.body.monthId : resource.monthId,
      currentAffairsTypeId:
        req.body.typeId !== undefined ? req.body.typeId : resource.currentAffairsTypeId,
      resourceType: req.body.resourceType || resource.resourceType,
      fileSize: req.body.fileSize || resource.fileSize,
      fileType: req.body.fileType || resource.fileType,
      isActive: req.body.isActive !== undefined ? req.body.isActive : resource.isActive
    };

    // Upload new file if provided
    if (req.files && req.files.file) {
      // Delete old file from Cloudinary
      if (resource.fileUrl && resource.fileUrl.public_id) {
        await cloudinary.uploader.destroy(resource.fileUrl.public_id, {
          resource_type: 'raw'
        });
      }

      const fileResult = await uploadToCloudinary(
        req.files.file[0],
        'resources/files',
        'raw',
        'pdf'
      );
      updates.fileUrl = {
        url: fileResult.url,
        public_id: fileResult.public_id
      };
    }

    // Upload new thumbnail if provided
    if (req.files && req.files.thumbnail) {
      if (resource.thumbnail && resource.thumbnail.public_id) {
        await cloudinary.uploader.destroy(resource.thumbnail.public_id);
      }

      const thumbnailResult = await uploadToCloudinary(
        req.files.thumbnail[0],
        'resources/thumbnails'
      );
      updates.thumbnail = {
        url: thumbnailResult.url,
        public_id: thumbnailResult.public_id
      };
    }

    Object.assign(resource, updates);
    await resource.save();

    res.json({
      success: true,
      message: 'Resource updated successfully',
      data: resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Delete files from Cloudinary
    if (resource.fileUrl && resource.fileUrl.public_id) {
      await cloudinary.uploader.destroy(resource.fileUrl.public_id, {
        resource_type: 'raw'
      });
    }

    if (resource.thumbnail && resource.thumbnail.public_id) {
      await cloudinary.uploader.destroy(resource.thumbnail.public_id);
    }

    await resource.deleteOne();

    res.json({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

### `controllers/testAttemptController.js`

```javascript
const TestAttempt = require('../models/TestAttempt');
const TestPaper = require('../models/TestPaper');
const TestQuestion = require('../models/TestQuestion');
const mongoose = require('mongoose');

// @desc    Submit test attempt
// @route   POST /api/test-attempts/:paperId
// @access  Private (Student)
exports.submitAttempt = async (req, res) => {
  try {
    const { paperId } = req.params;
    const { answers, timeTaken } = req.body;
    const studentId = req.user.id;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Answers are required'
      });
    }

    // Check if student already attempted this paper
    const existingAttempt = await TestAttempt.findOne({
      studentId,
      paperId
    });

    if (existingAttempt) {
      return res.status(400).json({
        success: false,
        message: 'You have already attempted this test'
      });
    }

    // Verify paper exists
    const paper = await TestPaper.findById(paperId);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Get all questions for this paper
    const questions = await TestQuestion.find({ paperId });

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No questions found for this paper'
      });
    }

    // Calculate score
    let score = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;

    const processedAnswers = answers.map(answer => {
      const question = questions.find(q => q._id.toString() === answer.questionId);
      
      if (!question) return answer;

      const isCorrect = question.correctAnswer === answer.selectedOption;
      
      if (isCorrect) {
        score += question.marks || 1;
        correctAnswers++;
      } else {
        wrongAnswers++;
        // Deduct negative marks if applicable
        if (paper.negativeMarks > 0) {
          score -= paper.negativeMarks;
        }
      }

      return answer;
    });

    const unattempted = questions.length - answers.length;

    // Fix score precision
    score = parseFloat(score.toFixed(2));

    // Create attempt
    const attempt = await TestAttempt.create({
      studentId,
      paperId,
      answers: processedAnswers,
      score: Math.max(0, score), // Score cannot be negative
      totalQuestions: questions.length,
      correctAnswers,
      wrongAnswers,
      unattempted,
      timeTaken: timeTaken || 0
    });

    res.status(201).json({
      success: true,
      message: 'Test submitted successfully',
      data: {
        attemptId: attempt._id,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        correctAnswers: attempt.correctAnswers,
        wrongAnswers: attempt.wrongAnswers,
        unattempted: attempt.unattempted
      }
    });
  } catch (error) {
    console.error('Submit Attempt Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting test',
      error: error.message
    });
  }
};

// @desc    Get result for a specific paper
// @route   GET /api/test-results/:paperId
// @access  Private (Student)
exports.getResult = async (req, res) => {
  try {
    const { paperId } = req.params;
    const studentId = req.user.id;

    // Get student's attempt
    const attempt = await TestAttempt.findOne({
      studentId,
      paperId
    }).populate('paperId', 'title totalMarks negativeMarks');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'No attempt found for this paper'
      });
    }

    // Calculate rank
    const rankData = await TestAttempt.aggregate([
      { $match: { paperId: attempt.paperId._id } },
      {
        $group: {
          _id: '$studentId',
          maxScore: { $max: '$score' }
        }
      },
      { $sort: { maxScore: -1 } }
    ]);

    const rank = rankData.findIndex(r => r._id.toString() === studentId) + 1;

    res.status(200).json({
      success: true,
      data: {
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        correctAnswers: attempt.correctAnswers,
        wrongAnswers: attempt.wrongAnswers,
        unattempted: attempt.unattempted,
        rank,
        totalParticipants: rankData.length,
        submittedAt: attempt.submittedAt
      }
    });
  } catch (error) {
    console.error('Get Result Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching result',
      error: error.message
    });
  }
};

// @desc    Get detailed review of test attempt (with all question details)
// @route   GET /api/test-attempts/review/:paperId
// @access  Private (Student)
exports.getDetailedReview = async (req, res) => {
  try {
    const { paperId } = req.params;
    const studentId = req.user.id;

    // Get student's attempt
    const attempt = await TestAttempt.findOne({
      studentId,
      paperId
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'No attempt found for this paper'
      });
    }

    // Get all questions for this paper with full details
    const questions = await TestQuestion.find({ paperId }).sort({ questionNumber: 1 });

    // Create a map of student's answers
    const studentAnswersMap = {};
    attempt.answers.forEach(answer => {
      studentAnswersMap[answer.questionId.toString()] = answer.selectedOption;
    });

    // Build detailed review for each question
    const detailedReview = questions.map(question => {
      const selectedOption = studentAnswersMap[question._id.toString()];
      const isAnswered = selectedOption !== undefined;
      const isCorrect = isAnswered && question.correctAnswer === selectedOption;

      return {
        questionId: question._id,
        questionNumber: question.questionNumber,
        question: question.question,
        options: question.options,
        marks: question.marks,
        selectedOption: isAnswered ? selectedOption : null,
        selectedOptionText: isAnswered ? question.options[selectedOption] : 'Not Answered',
        correctAnswer: question.correctAnswer,
        correctOptionText: question.options[question.correctAnswer],
        isCorrect: isCorrect,
        isAnswered: isAnswered,
        explanation: question.explanation
      };
    });

    // Get paper details for negative marks calculation
    const paper = await TestPaper.findById(paperId);

    // Recalculate marks with paper's negative marks
    const finalReview = detailedReview.map(item => {
      let marksAwarded = 0;
      if (item.isCorrect) {
        marksAwarded = item.marks;
      } else if (item.isAnswered && paper && paper.negativeMarks > 0) {
        marksAwarded = -paper.negativeMarks;
      }
      
      return {
        ...item,
        marksAwarded: parseFloat(marksAwarded.toFixed(2))
      };
    });

    res.status(200).json({
      success: true,
      data: {
        paperId: paper._id,
        paperTitle: paper.title,
        totalQuestions: attempt.totalQuestions,
        correctAnswers: attempt.correctAnswers,
        wrongAnswers: attempt.wrongAnswers,
        unattempted: attempt.unattempted,
        score: attempt.score,
        timeTaken: attempt.timeTaken,
        submittedAt: attempt.submittedAt,
        questions: finalReview
      }
    });
  } catch (error) {
    console.error('Get Detailed Review Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching detailed review',
      error: error.message
    });
  }
};

// @desc    Get top performers for a paper
// @route   GET /api/test-top-performers/:paperId
// @access  Public
exports.getTopPerformers = async (req, res) => {
  try {
    const { paperId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const topPerformers = await TestAttempt.aggregate([
      { $match: { paperId: new mongoose.Types.ObjectId(paperId) } },
      {
        $group: {
          _id: '$studentId',
          maxScore: { $max: '$score' },
          attemptData: { $first: '$$ROOT' }
        }
      },
      { $sort: { maxScore: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $project: {
          studentName: '$student.name',
          studentEmail: '$student.email',
          profileImage: '$student.profileImage',
          score: '$maxScore',
          correctAnswers: '$attemptData.correctAnswers',
          wrongAnswers: '$attemptData.wrongAnswers',
          submittedAt: '$attemptData.submittedAt'
        }
      }
    ]);

    // Add rank manually
    const rankedPerformers = topPerformers.map((performer, index) => ({
      rank: index + 1,
      studentName: performer.studentName,
      studentEmail: performer.studentEmail,
      profileImage: performer.profileImage,
      score: performer.score,
      correctAnswers: performer.correctAnswers,
      wrongAnswers: performer.wrongAnswers,
      submittedAt: performer.submittedAt
    }));

    res.status(200).json({
      success: true,
      count: rankedPerformers.length,
      data: rankedPerformers
    });
  } catch (error) {
    console.error('Get Top Performers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching top performers',
      error: error.message
    });
  }
};

// @desc    Get all attempts by student
// @route   GET /api/test-attempts/my-attempts
// @access  Private (Student)
exports.getMyAttempts = async (req, res) => {
  try {
    const studentId = req.user.id;

    const attempts = await TestAttempt.find({ studentId })
      .populate('paperId', 'title date totalMarks')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts
    });
  } catch (error) {
    console.error('Get My Attempts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attempts',
      error: error.message
    });
  }
};
```

### `controllers/testCategoryController.js`

```javascript
const TestCategory = require('../models/TestCategory');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const cloudinary = require('../config/cloudinary');

// @desc    Create category
// @route   POST /api/test-categories
// @access  Private (Super Admin, Center Admin)
exports.createCategory = async (req, res) => {
  try {
    const { name, type, description } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name and type are required'
      });
    }

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if category already exists
    const existingCategory = await TestCategory.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists with this name'
      });
    }

    const categoryData = {
      name,
      slug,
      type,
      description
    };

    // Upload image if provided
    if (req.file) {
      const imageResult = await uploadToCloudinary(req.file, 'test-categories');
      categoryData.image = {
        url: imageResult.url,
        public_id: imageResult.public_id
      };
    }

    const category = await TestCategory.create(categoryData);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Create Category Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error.message
    });
  }
};

// @desc    Get all categories
// @route   GET /api/test-categories
// @access  Public
exports.getAllCategories = async (req, res) => {
  try {
    const { type, status } = req.query;
    
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const categories = await TestCategory.find(filter)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Get Categories Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// @desc    Get single category
// @route   GET /api/test-categories/:id
// @access  Public
exports.getCategory = async (req, res) => {
  try {
    const category = await TestCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Get Category Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error.message
    });
  }
};

// @desc    Update category
// @route   PUT /api/test-categories/:id
// @access  Private (Super Admin, Center Admin)
exports.updateCategory = async (req, res) => {
  try {
    const category = await TestCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const updates = { ...req.body };

    // Update slug if name changes
    if (updates.name) {
      updates.slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    // Upload new image if provided
    if (req.file) {
      // Delete old image
      if (category.image && category.image.public_id) {
        await cloudinary.uploader.destroy(category.image.public_id);
      }
      
      const imageResult = await uploadToCloudinary(req.file, 'test-categories');
      updates.image = {
        url: imageResult.url,
        public_id: imageResult.public_id
      };
    }

    const updatedCategory = await TestCategory.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory
    });
  } catch (error) {
    console.error('Update Category Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error.message
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/test-categories/:id
// @access  Private (Super Admin, Center Admin)
exports.deleteCategory = async (req, res) => {
  try {
    const category = await TestCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Delete image from Cloudinary
    if (category.image && category.image.public_id) {
      await cloudinary.uploader.destroy(category.image.public_id);
    }

    await TestCategory.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete Category Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error.message
    });
  }
};
```

### `controllers/testContentController.js`

```javascript
const TestContent = require('../models/TestContent');
const TestCategory = require('../models/TestCategory');
const cloudinary = require('../config/cloudinary');
const mongoose = require('mongoose');

// @desc    Create content
// @route   POST /api/test-contents
// @access  Private (Super Admin, Center Admin)
exports.createContent = async (req, res) => {
  try {
    const { categoryId, title, year, month, description } = req.body;

    if (!categoryId || !title || !year) {
      return res.status(400).json({
        success: false,
        message: 'Category ID, title, and year are required'
      });
    }

    // Verify category exists
    const category = await TestCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Verify category is CONTENT type
    if (category.type !== 'CONTENT') {
      return res.status(400).json({
        success: false,
        message: 'This category is not for content upload'
      });
    }

    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'PDF file is required'
      });
    }

    // Upload PDF to Cloudinary
    const fileResult = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      {
        resource_type: 'raw',
        folder: 'test-contents',
        format: 'pdf'
      }
    );

    const content = await TestContent.create({
      categoryId,
      title,
      year,
      month,
      description,
      file: {
        url: fileResult.secure_url,
        public_id: fileResult.public_id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Content uploaded successfully',
      data: content
    });
  } catch (error) {
    console.error('Create Content Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading content',
      error: error.message
    });
  }
};

// @desc    Get all contents
// @route   GET /api/test-contents
// @access  Public
exports.getAllContents = async (req, res) => {
  try {
    const { categoryId, year, month } = req.query;
    
    const filter = { isActive: true };
    if (categoryId) filter.categoryId = categoryId;
    if (year) filter.year = parseInt(year);
    if (month) filter.month = parseInt(month);

    const contents = await TestContent.find(filter)
      .populate('categoryId', 'name slug type')
      .sort({ year: -1, month: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: contents.length,
      data: contents
    });
  } catch (error) {
    console.error('Get Contents Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contents',
      error: error.message
    });
  }
};

// @desc    Get content filters (years and months)
// @route   GET /api/test-contents/filters
// @access  Public
exports.getContentFilters = async (req, res) => {
  try {
    const { categoryId } = req.query;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'categoryId is required'
      });
    }

    const result = await TestContent.aggregate([
      {
        $match: {
          categoryId: new mongoose.Types.ObjectId(categoryId),
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          years: { $addToSet: "$year" },
          months: { $addToSet: "$month" }
        }
      }
    ]);

    let data = result[0] || { years: [], months: [] };

    // Sort years descending
    data.years.sort((a, b) => b - a);
    
    // Sort months descending and filter out null/undefined
    data.months = data.months.filter(m => m !== null && m !== undefined);
    data.months.sort((a, b) => b - a);

    // Convert month number → name
    const monthNames = [
      "", "January", "February", "March", "April",
      "May", "June", "July", "August",
      "September", "October", "November", "December"
    ];

    const formattedMonths = data.months.map(m => ({
      value: m,
      label: monthNames[m]
    }));

    res.json({
      success: true,
      years: data.years,
      months: formattedMonths
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// @desc    Get single content
// @route   GET /api/test-contents/:id
// @access  Public
exports.getContent = async (req, res) => {
  try {
    const content = await TestContent.findById(req.params.id)
      .populate('categoryId', 'name slug type');

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Get Content Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching content',
      error: error.message
    });
  }
};

// @desc    Update content
// @route   PUT /api/test-contents/:id
// @access  Private (Super Admin, Center Admin)
exports.updateContent = async (req, res) => {
  try {
    const content = await TestContent.findById(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    const updates = { ...req.body };

    // Upload new file if provided
    if (req.file) {
      // Delete old file
      if (content.file && content.file.public_id) {
        await cloudinary.uploader.destroy(content.file.public_id, {
          resource_type: 'raw'
        });
      }
      
      const fileResult = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
        {
          resource_type: 'raw',
          folder: 'test-contents',
          format: 'pdf'
        }
      );
      
      updates.file = {
        url: fileResult.secure_url,
        public_id: fileResult.public_id
      };
    }

    const updatedContent = await TestContent.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Content updated successfully',
      data: updatedContent
    });
  } catch (error) {
    console.error('Update Content Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating content',
      error: error.message
    });
  }
};

// @desc    Delete content
// @route   DELETE /api/test-contents/:id
// @access  Private (Super Admin, Center Admin)
exports.deleteContent = async (req, res) => {
  try {
    const content = await TestContent.findById(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Delete file from Cloudinary
    if (content.file && content.file.public_id) {
      await cloudinary.uploader.destroy(content.file.public_id, {
        resource_type: 'raw'
      });
    }

    await TestContent.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    console.error('Delete Content Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting content',
      error: error.message
    });
  }
};
```

### `controllers/testPaperController.js`

```javascript
const TestPaper = require('../models/TestPaper');
const TestCategory = require('../models/TestCategory');
const TestQuestion = require('../models/TestQuestion');
const TestAttempt = require('../models/TestAttempt');
const mongoose = require('mongoose');

// @desc    Create paper
// @route   POST /api/test-papers
// @access  Private (Super Admin, Center Admin)
exports.createPaper = async (req, res) => {
  try {
    const { categoryId, title, mainsCategory, year, month, date, duration, totalMarks, negativeMarks, description } = req.body;

    if (!categoryId || !title || !year || !date) {
      return res.status(400).json({
        success: false,
        message: 'Category ID, title, year, and date are required'
      });
    }

    // Verify category exists
    const category = await TestCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Verify category is EXAM type
    if (category.type !== 'EXAM') {
      return res.status(400).json({
        success: false,
        message: 'This category is not for exams'
      });
    }

    const paper = await TestPaper.create({
      categoryId,
      title,
      mainsCategory,
      year,
      month,
      date,
      duration,
      totalMarks,
      negativeMarks,
      description
    });

    res.status(201).json({
      success: true,
      message: 'Paper created successfully',
      data: paper
    });
  } catch (error) {
    console.error('Create Paper Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating paper',
      error: error.message
    });
  }
};

// @desc    Get paper filters (mainsCategory, years, and months)
// @route   GET /api/test-papers/filters
// @access  Public
exports.getPaperFilters = async (req, res) => {
  try {
    const { categoryId } = req.query;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'categoryId is required'
      });
    }

    const result = await TestPaper.aggregate([
      {
        $match: {
          categoryId: new mongoose.Types.ObjectId(categoryId),
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          mainsCategories: { $addToSet: "$mainsCategory" },
          years: { $addToSet: "$year" },
          months: { $addToSet: "$month" }
        }
      }
    ]);

    let data = result[0] || { mainsCategories: [], years: [], months: [] };

    // Sort years descending
    data.years.sort((a, b) => b - a);
    
    // Sort months descending and filter out null/undefined/empty
    data.months = data.months.filter(m => m !== null && m !== undefined && m !== '');
    data.months.sort((a, b) => b - a);

    // Sort mainsCategories
    data.mainsCategories.sort();

    // Convert month number → name
    const monthNames = [
      "", "January", "February", "March", "April",
      "May", "June", "July", "August",
      "September", "October", "November", "December"
    ];

    const formattedMonths = data.months.map(m => ({
      value: m,
      label: monthNames[parseInt(m)] || m
    }));

    res.json({
      success: true,
      mainsCategories: data.mainsCategories,
      years: data.years,
      months: formattedMonths
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// @desc    Get all papers
// @route   GET /api/test-papers
// @access  Public
exports.getAllPapers = async (req, res) => {
  try {
    const { categoryId, year, month, mainsCategory } = req.query;
    
    const filter = { isActive: true };
    if (categoryId) filter.categoryId = categoryId;
    if (year) filter.year = parseInt(year);
    if (month) filter.month = month;
    if (mainsCategory) filter.mainsCategory = mainsCategory;

    const papers = await TestPaper.find(filter)
      .populate('categoryId', 'name slug type')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: papers.length,
      data: papers
    });
  } catch (error) {
    console.error('Get Papers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching papers',
      error: error.message
    });
  }
};

// @desc    Get single paper with questions
// @route   GET /api/test-papers/:id
// @access  Public
exports.getPaper = async (req, res) => {
  try {
    const paper = await TestPaper.findById(req.params.id)
      .populate('categoryId', 'name slug type');

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Get questions for this paper
    const questions = await TestQuestion.find({ paperId: req.params.id })
      .select('-correctAnswer') // Don't send correct answers to students
      .sort({ questionNumber: 1 });

    res.status(200).json({
      success: true,
      data: {
        ...paper.toObject(),
        questions
      }
    });
  } catch (error) {
    console.error('Get Paper Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching paper',
      error: error.message
    });
  }
};

// @desc    Update paper
// @route   PUT /api/test-papers/:id
// @access  Private (Super Admin, Center Admin)
exports.updatePaper = async (req, res) => {
  try {
    const paper = await TestPaper.findById(req.params.id);

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    const updatedPaper = await TestPaper.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Paper updated successfully',
      data: updatedPaper
    });
  } catch (error) {
    console.error('Update Paper Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating paper',
      error: error.message
    });
  }
};

// @desc    Delete paper
// @route   DELETE /api/test-papers/:id
// @access  Private (Super Admin, Center Admin)
exports.deletePaper = async (req, res) => {
  try {
    const paper = await TestPaper.findById(req.params.id);

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Delete all questions for this paper
    await TestQuestion.deleteMany({ paperId: req.params.id });

    // Delete all attempts for this paper
    await TestAttempt.deleteMany({ paperId: req.params.id });

    // Delete paper
    await TestPaper.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Paper and all related data deleted successfully'
    });
  } catch (error) {
    console.error('Delete Paper Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting paper',
      error: error.message
    });
  }
};
```

### `controllers/testQuestionController.js`

```javascript
const TestQuestion = require('../models/TestQuestion');
const TestPaper = require('../models/TestPaper');

// @desc    Create single question
// @route   POST /api/test-questions
// @access  Private (Super Admin, Center Admin)
exports.createQuestion = async (req, res) => {
  try {
    const { paperId, questionNumber, question, options, correctAnswer, explanation, marks } = req.body;

    if (!paperId || !question || !options || correctAnswer === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Paper ID, question, options, and correctAnswer are required'
      });
    }

    // Validate options length
    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Must have exactly 4 options'
      });
    }

    // Validate correctAnswer range
    if (correctAnswer < 0 || correctAnswer > 3) {
      return res.status(400).json({
        success: false,
        message: 'correctAnswer must be between 0 and 3'
      });
    }

    // Verify paper exists
    const paper = await TestPaper.findById(paperId);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Check if question number already exists
    const existingQuestion = await TestQuestion.findOne({
      paperId,
      questionNumber
    });

    if (existingQuestion) {
      return res.status(400).json({
        success: false,
        message: `Question number ${questionNumber} already exists in this paper`
      });
    }

    const newQuestion = await TestQuestion.create({
      paperId,
      questionNumber,
      question,
      options,
      correctAnswer,
      explanation: explanation || '',
      marks: marks || 1
    });

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: newQuestion
    });
  } catch (error) {
    console.error('Create Question Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating question',
      error: error.message
    });
  }
};

// @desc    Bulk create questions
// @route   POST /api/test-questions/bulk
// @access  Private (Super Admin, Center Admin)
exports.bulkCreateQuestions = async (req, res) => {
  try {
    const { paperId, questions } = req.body;

    if (!paperId || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Paper ID and questions array are required'
      });
    }

    // Verify paper exists
    const paper = await TestPaper.findById(paperId);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Add paperId and questionNumber to each question
    const questionsWithData = questions.map((q, index) => ({
      paperId,
      questionNumber: q.questionNumber || index + 1,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      marks: q.marks || 1
    }));

    // Insert all questions
    const createdQuestions = await TestQuestion.insertMany(questionsWithData);

    res.status(201).json({
      success: true,
      message: `${createdQuestions.length} questions created successfully`,
      count: createdQuestions.length,
      data: createdQuestions
    });
  } catch (error) {
    console.error('Bulk Create Questions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating questions',
      error: error.message
    });
  }
};

// @desc    Get questions for a paper (with correct answers - for admin)
// @route   GET /api/test-questions/paper/:paperId
// @access  Private (Super Admin, Center Admin)
exports.getQuestionsByPaper = async (req, res) => {
  try {
    const questions = await TestQuestion.find({ paperId: req.params.paperId })
      .sort({ questionNumber: 1 });

    res.status(200).json({
      success: true,
      count: questions.length,
      data: questions
    });
  } catch (error) {
    console.error('Get Questions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message
    });
  }
};

// @desc    Get questions for a paper (without correct answers - for students)
// @route   GET /api/test-questions/view/:paperId
// @access  Private (Student)
exports.getQuestionsForStudent = async (req, res) => {
  try {
    const questions = await TestQuestion.find({ paperId: req.params.paperId })
      .select('-correctAnswer -explanation') // Exclude correct answers and explanations
      .sort({ questionNumber: 1 });

    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No questions found for this paper'
      });
    }

    res.status(200).json({
      success: true,
      count: questions.length,
      data: questions
    });
  } catch (error) {
    console.error('Get Questions for Student Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message
    });
  }
};

// @desc    Update question
// @route   PUT /api/test-questions/:id
// @access  Private (Super Admin, Center Admin)
exports.updateQuestion = async (req, res) => {
  try {
    const question = await TestQuestion.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const updatedQuestion = await TestQuestion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      data: updatedQuestion
    });
  } catch (error) {
    console.error('Update Question Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating question',
      error: error.message
    });
  }
};

// @desc    Delete question
// @route   DELETE /api/test-questions/:id
// @access  Private (Super Admin, Center Admin)
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await TestQuestion.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    await TestQuestion.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Delete Question Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting question',
      error: error.message
    });
  }
};
```

### `models/Filter.js`

```javascript
const mongoose = require('mongoose');

const filterSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['SUBJECT', 'CLASS', 'PAPER', 'YEAR', 'MONTH', 'CURRENT_AFFAIRS_TYPE']
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResourceCategory',
    required: true
  },
  subCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    default: null
  }
}, { timestamps: true });

// Compound unique index to prevent duplicate filters
filterSchema.index(
  { type: 1, value: 1, categoryId: 1, subCategoryId: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('Filter', filterSchema);
```

### `models/MockTest.js`

```javascript
const mongoose = require('mongoose');

const mockTestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResourceCategory',
    required: true
  },
  subCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory'
  },
  // Module-specific filter references
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Filter',
    default: null
  },
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Filter',
    default: null
  },
  yearId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Filter',
    default: null
  },
  // Normalized question references
  questionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  totalMarks: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  passingMarks: Number,
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    default: null
  }
}, { timestamps: true });

// Calculate total marks from referenced questions before saving
mockTestSchema.pre('save', async function() {
  if (this.questionIds && this.questionIds.length > 0) {
    const Question = mongoose.model('Question');
    const questions = await Question.find({ _id: { $in: this.questionIds } });
    this.totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
  }
});

module.exports = mongoose.model('MockTest', mockTestSchema);
```

### `models/Question.js`

```javascript
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length === 4;
      },
      message: 'Must have exactly 4 options'
    }
  },
  correctAnswer: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    trim: true
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
questionSchema.index({ isActive: 1 });
questionSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Question', questionSchema);
```

### `models/Resource.js`

```javascript
const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  fileUrl: {
    url: String,
    public_id: String
  },
  thumbnail: {
    url: String,
    public_id: String
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResourceCategory',
    required: true
  },
  subCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    default: null
  },
  // Module-specific filter references (only applicable filters used per module)
  // NCERT: subjectId + classId
  // PYQ: paperId + yearId
  // Study Material: none (only categoryId + subCategoryId)
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Filter',
    default: null
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Filter',
    default: null
  },
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Filter',
    default: null
  },
  yearId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Filter',
    default: null
  },
  monthId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Filter',
    default: null
  },
  currentAffairsTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Filter',
    default: null
  },
  resourceType: {
    type: String,
    enum: ['PDF', 'ARTICLE', 'MAGAZINE', 'INFOGRAPHIC', 'VIDEO'],
    default: 'PDF'
  },
  // Metadata
  fileSize: String,
  fileType: String,
  downloads: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    default: null
  }
}, { timestamps: true });

// Indexes for faster queries (module-specific)
resourceSchema.index({ categoryId: 1, subjectId: 1, classId: 1 }); // NCERT
resourceSchema.index({ categoryId: 1, subCategoryId: 1, paperId: 1, yearId: 1 }); // PYQ
resourceSchema.index({ categoryId: 1, yearId: 1, monthId: 1, currentAffairsTypeId: 1 }); // Current Affairs

module.exports = mongoose.model('Resource', resourceSchema);
```

### `models/ResourceCategory.js`

```javascript
const mongoose = require('mongoose');

const resourceCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  thumbnail: {
    url: String,
    public_id: String
  },
  description: String,
  moduleType: {
    type: String,
    enum: ['CURRENT_AFFAIRS', 'FREE_RESOURCES'],
    default: 'FREE_RESOURCES',
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('ResourceCategory', resourceCategorySchema);
```

### `models/ResourceDownload.js`

```javascript
const mongoose = require('mongoose');

const resourceDownloadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
      index: true
    },
    downloadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

resourceDownloadSchema.index({ resourceId: 1, downloadedAt: -1 });
resourceDownloadSchema.index({ userId: 1, resourceId: 1 });

module.exports = mongoose.model('ResourceDownload', resourceDownloadSchema);
```

### `models/ResourceViewHistory.js`

```javascript
const mongoose = require('mongoose');

const resourceViewHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
      index: true
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

resourceViewHistorySchema.index({ userId: 1, viewedAt: -1 });
resourceViewHistorySchema.index({ resourceId: 1, viewedAt: -1 });

module.exports = mongoose.model('ResourceViewHistory', resourceViewHistorySchema);
```

### `models/Result.js`

```javascript
const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MockTest',
    required: true
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    selectedAnswer: String,
    isCorrect: Boolean,
    marksObtained: {
      type: Number,
      default: 0
    }
  }],
  score: {
    type: Number,
    required: true
  },
  totalMarks: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  wrongAnswers: {
    type: Number,
    default: 0
  },
  skippedQuestions: {
    type: Number,
    default: 0
  },
  percentage: Number,
  passed: Boolean,
  timeTaken: Number, // in seconds
  startedAt: Date,
  completedAt: Date
}, { timestamps: true });

// Calculate percentage before saving - using async/await pattern
resultSchema.pre('save', async function() {
  if (this.score !== undefined && this.totalMarks && this.totalMarks > 0) {
    this.percentage = parseFloat(((this.score / this.totalMarks) * 100).toFixed(2));
  }
});

module.exports = mongoose.model('Result', resultSchema);
```

### `models/SubCategory.js`

```javascript
const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResourceCategory',
    required: true
  },
  thumbnail: {
    url: String,
    public_id: String
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Compound index to prevent duplicate subcategory names within same category
subCategorySchema.index({ name: 1, categoryId: 1 }, { unique: true });

module.exports = mongoose.model('SubCategory', subCategorySchema);
```

### `models/TestAttempt.js`

```javascript
const mongoose = require('mongoose');

const testAttemptSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestPaper',
    required: true
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestQuestion',
      required: true
    },
    selectedOption: {
      type: Number,
      required: true
    }
  }],
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  wrongAnswers: {
    type: Number,
    default: 0
  },
  unattempted: {
    type: Number,
    default: 0
  },
  timeTaken: {
    type: Number, // in seconds
    default: 0
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound index to prevent duplicate attempts
testAttemptSchema.index({ studentId: 1, paperId: 1 }, { unique: true });
testAttemptSchema.index({ paperId: 1 });
testAttemptSchema.index({ studentId: 1 });
testAttemptSchema.index({ score: -1 });

module.exports = mongoose.model('TestAttempt', testAttemptSchema);
```

### `models/TestCategory.js`

```javascript
const mongoose = require('mongoose');

const testCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['CONTENT', 'EXAM']
  },
  image: {
    url: String,
    public_id: String
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  description: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// Index for efficient queries
testCategorySchema.index({ slug: 1 });
testCategorySchema.index({ type: 1 });
testCategorySchema.index({ status: 1 });

module.exports = mongoose.model('TestCategory', testCategorySchema);
```

### `models/TestContent.js`

```javascript
const mongoose = require('mongoose');

const testContentSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestCategory',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    min: 1,
    max: 12
  },
  file: {
    url: {
      type: String,
      required: true
    },
    public_id: {
      type: String,
      required: true
    }
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for efficient queries
testContentSchema.index({ categoryId: 1 });
testContentSchema.index({ year: 1 });
testContentSchema.index({ isActive: 1 });

module.exports = mongoose.model('TestContent', testContentSchema);
```

### `models/TestPaper.js`

```javascript
const mongoose = require('mongoose');

const testPaperSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestCategory',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  mainsCategory: {
    type: String,
    enum: ['Mains', 'Prelims', 'Both'],
    default: 'Both'
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },
  totalMarks: {
    type: Number,
    default: 0
  },
  negativeMarks: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for efficient queries
testPaperSchema.index({ categoryId: 1 });
testPaperSchema.index({ date: 1 });
testPaperSchema.index({ isActive: 1 });

module.exports = mongoose.model('TestPaper', testPaperSchema);
```

### `models/TestQuestion.js`

```javascript
const mongoose = require('mongoose');

const testQuestionSchema = new mongoose.Schema({
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestPaper',
    required: true
  },
  questionNumber: {
    type: Number,
    required: true
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length === 4;
      },
      message: 'Must have exactly 4 options'
    }
  },
  correctAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  explanation: {
    type: String,
    trim: true
  },
  marks: {
    type: Number,
    default: 1,
    min: 0
  }
}, { timestamps: true });

// Compound index to ensure unique question numbers per paper
testQuestionSchema.index({ paperId: 1, questionNumber: 1 }, { unique: true });
testQuestionSchema.index({ paperId: 1 });

module.exports = mongoose.model('TestQuestion', testQuestionSchema);
```

### `routes/filterRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { paginate } = require('../middleware/resourceMiddleware');

const {
  createFilter,
  getFilters,
  getFiltersByCategory,
  updateFilter,
  deleteFilter
} = require('../controllers/filterController');

// ==================== FILTER ROUTES ====================

// Public routes
router.get('/', paginate, getFilters);
router.get('/category/:categoryId', getFiltersByCategory);

// Protected routes (Admin only)
router.post('/',
  protect,
  authorize('super_admin', 'center_admin'),
  createFilter
);

router.put('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  updateFilter
);

router.delete('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  deleteFilter
);

module.exports = router;
```

### `routes/mockTestRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { paginate } = require('../middleware/resourceMiddleware');

const {
  createMockTest,
  getMockTests,
  getMockTestById,
  updateMockTest,
  deleteMockTest,
  attemptTest,
  getUserResults,
  getResultById,
  addQuestion,
  addQuestions,
  removeQuestion
} = require('../controllers/mockTestController');

// ==================== MOCK TEST ROUTES ====================

// Public routes
router.get('/', paginate, getMockTests);

// SPECIFIC routes MUST come before PARAMETERIZED routes
router.post('/:id/attempt',
  protect,
  authorize('student', 'parent'),
  attemptTest
);

router.get('/results',
  protect,
  getUserResults
);

router.get('/results/:id',
  protect,
  getResultById
);

// PARAMETERIZED routes (come AFTER specific routes)
router.get('/:id', getMockTestById);

// Protected routes (Admin only)
router.post('/',
  protect,
  authorize('super_admin', 'center_admin'),
  createMockTest
);

router.put('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  updateMockTest
);

router.delete('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  deleteMockTest
);

// Question management routes (Admin only)
router.post('/:id/add-question',
  protect,
  authorize('super_admin', 'center_admin'),
  addQuestion
);

router.post('/:id/add-questions',
  protect,
  authorize('super_admin', 'center_admin'),
  addQuestions
);

router.delete('/:id/question/:questionId',
  protect,
  authorize('super_admin', 'center_admin'),
  removeQuestion
);

module.exports = router;
```

### `routes/portalCurrentAffairsRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const optionalAuth = require('../middleware/optionalAuth');
const {
  getFilters,
  getResources,
  getById,
  viewResource,
  downloadResource
} = require('../controllers/portalCurrentAffairsController');

router.use(optionalAuth);

router.get('/filters', getFilters);
router.get('/resources', getResources);
router.get('/:id/view', viewResource);
router.get('/:id/download', downloadResource);
router.get('/:id', getById);

module.exports = router;
```

### `routes/portalFreeResourceRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const optionalAuth = require('../middleware/optionalAuth');
const {
  getFilters,
  getDynamicFilters,
  getResources,
  getById,
  viewResource,
  downloadResource
} = require('../controllers/portalFreeResourcesController');

router.use(optionalAuth);

router.get('/filters', getFilters);
router.get('/dynamic-filters', getDynamicFilters);
router.get('/resources', getResources);

router.get('/:id/view', viewResource);
router.get('/:id/download', downloadResource);
router.get('/:id', getById);

module.exports = router;
```

### `routes/questionRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

const {
  updateQuestion,
  deleteQuestion,
  getQuestionById
} = require('../controllers/questionController');

// ==================== QUESTION ROUTES ====================

// Get question by ID (Admin only)
router.get('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  getQuestionById
);

// Update question (Admin only)
router.put('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  updateQuestion
);

// Delete question (Admin only)
router.delete('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  deleteQuestion
);

// Patch/Update specific fields (Admin only)
router.patch('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  updateQuestion
);

module.exports = router;
```

### `routes/resourceFileRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { uploadResource } = require('../middleware/uploadResource');
const { protect, authorize } = require('../middleware/authMiddleware');
const { paginate } = require('../middleware/resourceMiddleware');

const {
  createResource,
  getResources,
  getResourceById,
  updateResource,
  deleteResource
} = require('../controllers/resourceController');

// ==================== RESOURCE ROUTES ====================
    
// Public routes
router.get('/', paginate, getResources);
router.get('/:id', getResourceById);

// Protected routes (Admin only)
router.post('/',
  protect,
  authorize('super_admin', 'center_admin'),
  uploadResource.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  createResource
);

router.put('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  uploadResource.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  updateResource
);

router.delete('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  deleteResource
);

module.exports = router;
```

### `routes/resourceRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/authMiddleware');
const { filterByCenter, paginate } = require('../middleware/resourceMiddleware');

const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  createSubCategory,
  getSubCategories,
  updateSubCategory,
  deleteSubCategory
} = require('../controllers/resourceCategoryController');

// ==================== CATEGORY ROUTES ====================

// Public routes
router.get('/categories', paginate, getCategories);
router.get('/categories/:id', getCategoryById);

// Protected routes (Admin only)
router.post('/categories', 
  protect, 
  authorize('super_admin', 'center_admin'),
  upload.single('thumbnail'),
  createCategory
);

router.put('/categories/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  upload.single('thumbnail'),
  updateCategory
);

router.delete('/categories/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  deleteCategory
);

// ==================== SUBCATEGORY ROUTES ====================

// Public routes
router.get('/subcategories', paginate, getSubCategories);
router.get('/subcategories/category/:categoryId', getSubCategories);

// Protected routes (Admin only)
router.post('/subcategories',
  protect,
  authorize('super_admin', 'center_admin'),
  upload.single('thumbnail'),
  createSubCategory
);

router.put('/subcategories/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  upload.single('thumbnail'),
  updateSubCategory
);

router.delete('/subcategories/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  deleteSubCategory
);

module.exports = router;
```

### `routes/testAttemptRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  submitAttempt,
  getResult,
  getDetailedReview,
  getTopPerformers,
  getMyAttempts
} = require('../controllers/testAttemptController');
const { getAttemptResult } = require('../controllers/lmsTestAttemptController');

// Public routes
router.get('/top-performers/:paperId', getTopPerformers);

// LMS course test result (My Courses → Tests)
router.get('/:attemptId', protect, getAttemptResult);

// Protected routes (Student)
router.post(
  '/:paperId',
  protect,
  submitAttempt
);

router.get(
  '/result/:paperId',
  protect,
  getResult
);

router.get(
  '/review/:paperId',
  protect,
  getDetailedReview
);

router.get(
  '/my-attempts',
  protect,
  getMyAttempts
);

module.exports = router;
```

### `routes/testCategoryRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const {
  createCategory,
  getAllCategories,
  getCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/testCategoryController');

// Public routes
router.get('/', getAllCategories);
router.get('/:id', getCategory);

// Protected routes (Admin only)
router.post(
  '/',
  protect,
  allowRoles('super_admin', 'center_admin'),
  upload.single('image'),
  createCategory
);

router.put(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  upload.single('image'),
  updateCategory
);

router.delete(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  deleteCategory
);

module.exports = router;
```

### `routes/testContentRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const {
  createContent,
  getAllContents,
  getContentFilters,
  getContent,
  updateContent,
  deleteContent
} = require('../controllers/testContentController');

// Public routes
router.get('/filters', getContentFilters);
router.get('/', getAllContents);
router.get('/:id', getContent);

// Protected routes (Admin only)
router.post(
  '/',
  protect,
  allowRoles('super_admin', 'center_admin'),
  upload.single('file'),
  createContent
);

router.put(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  upload.single('file'),
  updateContent
);

router.delete(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  deleteContent
);

module.exports = router;
```

### `routes/testPaperRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const {
  createPaper,
  getPaperFilters,
  getAllPapers,
  getPaper,
  updatePaper,
  deletePaper
} = require('../controllers/testPaperController');

// Public routes
router.get('/filters', getPaperFilters);
router.get('/', getAllPapers);
router.get('/:id', getPaper);

// Protected routes (Admin only)
router.post(
  '/',
  protect,
  allowRoles('super_admin', 'center_admin'),
  createPaper
);

router.put(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  updatePaper
);

router.delete(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  deletePaper
);

module.exports = router;
```

### `routes/testQuestionRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const {
  createQuestion,
  bulkCreateQuestions,
  getQuestionsByPaper,
  getQuestionsForStudent,
  updateQuestion,
  deleteQuestion
} = require('../controllers/testQuestionController');

// Public routes
// None - all question routes require authentication

// Protected routes (Admin only - with correct answers)
router.get(
  '/paper/:paperId',
  protect,
  allowRoles('super_admin', 'center_admin'),
  getQuestionsByPaper
);

// Protected routes (Student only - without correct answers)
router.get(
  '/view/:paperId',
  protect,
  getQuestionsForStudent
);

// Protected routes (Admin only - CRUD operations)
router.post(
  '/',
  protect,
  allowRoles('super_admin', 'center_admin'),
  createQuestion
);

router.post(
  '/bulk',
  protect,
  allowRoles('super_admin', 'center_admin'),
  bulkCreateQuestions
);

router.put(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  updateQuestion
);

router.delete(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  deleteQuestion
);

module.exports = router;
```

### `services/currentAffairsService.js`

```javascript
const mongoose = require('mongoose');
const TestCategory = require('../models/TestCategory');
const TestContent = require('../models/TestContent');
const TestPaper = require('../models/TestPaper');
const ResourceViewHistory = require('../models/ResourceViewHistory');
const ResourceDownload = require('../models/ResourceDownload');
const cache = require('../utils/resourcePortalCache');

const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const monthLabel = (month) => {
  if (month === null || month === undefined || month === '') return null;
  const asNum = parseInt(month, 10);
  if (!Number.isNaN(asNum) && asNum >= 1 && asNum <= 12) return MONTH_NAMES[asNum];
  return String(month);
};

const resolveMonthNumber = (input) => {
  if (input === null || input === undefined || input === '') return null;
  const asNum = parseInt(input, 10);
  if (!Number.isNaN(asNum) && asNum >= 1 && asNum <= 12) return asNum;
  const idx = MONTH_NAMES.findIndex(
    (name, i) => i > 0 && name.toLowerCase() === String(input).trim().toLowerCase()
  );
  return idx > 0 ? idx : null;
};

const formatTypeOption = (cat) => ({
  _id: cat._id,
  name: cat.name,
  slug: cat.slug,
  categoryType: cat.type,
  image: cat.image?.url || null
});

const formatContentCard = (doc) => ({
  _id: doc._id,
  itemType: 'content',
  title: doc.title,
  pdfUrl: doc.file?.url || null,
  year: doc.year,
  month: monthLabel(doc.month),
  monthValue: doc.month ?? null,
  type: doc.categoryId?.name || null,
  typeId: doc.categoryId?._id || doc.categoryId,
  description: doc.description || ''
});

const formatPaperCard = (doc) => ({
  _id: doc._id,
  itemType: 'exam',
  title: doc.title,
  pdfUrl: null,
  year: doc.year,
  month: monthLabel(doc.month),
  monthValue: doc.month ?? null,
  type: doc.categoryId?.name || null,
  typeId: doc.categoryId?._id || doc.categoryId,
  duration: doc.duration,
  totalMarks: doc.totalMarks,
  date: doc.date,
  description: doc.description || ''
});

const getCurrentAffairsFilters = async () => {
  const cacheKey = cache.buildKey('portal:ca:filters', {});
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const categories = await TestCategory.find({ status: 'ACTIVE' }).sort({ name: 1 }).lean();

  const [contentYears, paperYears, contentMonths, papers] = await Promise.all([
    TestContent.distinct('year', { isActive: true }),
    TestPaper.distinct('year', { isActive: true }),
    TestContent.distinct('month', { isActive: true, month: { $ne: null } }),
    TestPaper.find({ isActive: true }).select('month').lean()
  ]);

  const yearSet = new Set([...contentYears, ...paperYears]);
  const years = [...yearSet]
    .sort((a, b) => b - a)
    .map((y) => ({ _id: String(y), value: String(y) }));

  const monthSet = new Set();
  contentMonths.forEach((m) => {
    if (m !== null && m !== undefined) monthSet.add(resolveMonthNumber(m));
  });
  papers.forEach((p) => {
    if (p.month !== null && p.month !== undefined && p.month !== '') {
      const resolved = resolveMonthNumber(p.month);
      if (resolved) monthSet.add(resolved);
    }
  });

  const months = [...monthSet]
    .filter(Boolean)
    .sort((a, b) => b - a)
    .map((m) => ({
      _id: String(m),
      value: String(m),
      label: MONTH_NAMES[m]
    }));

  const payload = {
    years,
    months,
    types: categories.map(formatTypeOption)
  };

  cache.set(cacheKey, payload);
  return payload;
};

const buildContentFilter = (query, categoryId) => {
  const filter = { isActive: true };
  if (categoryId) filter.categoryId = categoryId;

  const year = query.yearId || query.year;
  if (year) filter.year = parseInt(year, 10);

  const monthNum = resolveMonthNumber(query.monthId || query.month);
  if (monthNum) filter.month = monthNum;

  return filter;
};

const buildPaperFilter = (query, categoryId) => {
  const filter = { isActive: true };
  if (categoryId) filter.categoryId = categoryId;

  const year = query.yearId || query.year;
  if (year) filter.year = parseInt(year, 10);

  const monthInput = query.monthId || query.month;
  if (monthInput !== undefined && monthInput !== '') {
    const monthNum = resolveMonthNumber(monthInput);
    if (monthNum) {
      filter.$or = [{ month: String(monthNum) }, { month: monthNum }];
    } else {
      filter.month = String(monthInput);
    }
  }

  return filter;
};

const getCurrentAffairsResources = async (query = {}) => {
  const cacheKey = cache.buildKey('portal:ca:resources', query);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const categoryId = query.typeId || query.categoryId;
  let category = null;

  if (categoryId) {
    category = await TestCategory.findOne({ _id: categoryId, status: 'ACTIVE' }).lean();
    if (!category) return [];
  }

  const data = [];

  const loadContent = !category || category.type === 'CONTENT';
  const loadPapers = !category || category.type === 'EXAM';

  if (loadContent) {
    const contents = await TestContent.find(buildContentFilter(query, categoryId))
      .populate('categoryId', 'name slug type')
      .sort({ year: -1, month: -1, createdAt: -1 })
      .lean();
    data.push(...contents.map(formatContentCard));
  }

  if (loadPapers) {
    const papers = await TestPaper.find(buildPaperFilter(query, categoryId))
      .populate('categoryId', 'name slug type')
      .sort({ date: -1 })
      .lean();
    data.push(...papers.map(formatPaperCard));
  }

  if (!categoryId) {
    data.sort((a, b) => (b.year || 0) - (a.year || 0));
  }

  cache.set(cacheKey, data);
  return data;
};

const findItemById = async (id) => {
  const content = await TestContent.findOne({ _id: id, isActive: true })
    .populate('categoryId', 'name slug type')
    .lean();
  if (content) {
    return { itemType: 'content', raw: content, formatted: formatContentCard(content) };
  }

  const paper = await TestPaper.findOne({ _id: id, isActive: true })
    .populate('categoryId', 'name slug type')
    .lean();
  if (paper) {
    return { itemType: 'exam', raw: paper, formatted: formatPaperCard(paper) };
  }

  return null;
};

const getCurrentAffairsById = async (id) => {
  const found = await findItemById(id);
  return found?.formatted || null;
};

const trackCurrentAffairsView = async (id, userId = null) => {
  const found = await findItemById(id);
  if (!found) return null;

  if (found.itemType === 'content') {
    await ResourceViewHistory.create({ userId, resourceId: id });
    return { ...found.formatted, viewUrl: found.formatted.pdfUrl };
  }

  return {
    ...found.formatted,
    viewUrl: null,
    message: 'Exam papers open via test attempt flow, not PDF view'
  };
};

const recordCurrentAffairsDownload = async (id, userId = null) => {
  const found = await findItemById(id);
  if (!found || found.itemType !== 'content') return null;

  await ResourceDownload.create({ userId, resourceId: id });

  return {
    _id: found.raw._id,
    title: found.raw.title,
    downloadUrl: found.raw.file?.url || null
  };
};

module.exports = {
  getCurrentAffairsFilters,
  getCurrentAffairsResources,
  getCurrentAffairsById,
  trackCurrentAffairsView,
  recordCurrentAffairsDownload
};
```

### `services/resourceService.js`

```javascript
const mongoose = require('mongoose');
const ResourceCategory = require('../models/ResourceCategory');
const SubCategory = require('../models/SubCategory');
const Filter = require('../models/Filter');
const Resource = require('../models/Resource');
const MockTest = require('../models/MockTest');
const ResourceDownload = require('../models/ResourceDownload');
const ResourceViewHistory = require('../models/ResourceViewHistory');
const {
  MODULE_TYPES,
  FILTER_TYPES,
  CATEGORY_NAME_HINTS,
  FREE_RESOURCE_FILTER_KEYS
} = require('../utils/resourceConstants');
const cache = require('../utils/resourcePortalCache');

const RESOURCE_POPULATE = [
  { path: 'categoryId', select: 'name moduleType' },
  { path: 'subCategoryId', select: 'name' },
  { path: 'subjectId', select: 'value type' },
  { path: 'classId', select: 'value type' },
  { path: 'paperId', select: 'value type' },
  { path: 'yearId', select: 'value type' },
  { path: 'monthId', select: 'value type' },
  { path: 'currentAffairsTypeId', select: 'value type' }
];

const matchesName = (name, hint) => {
  const n = (name || '').toLowerCase();
  if (Array.isArray(hint)) return hint.some((h) => n.includes(h));
  return n.includes(hint);
};

const getCategoryKind = (category) => {
  if (!category) return 'GENERIC';
  if (category.moduleType === MODULE_TYPES.CURRENT_AFFAIRS) return 'CURRENT_AFFAIRS';
  if (matchesName(category.name, CATEGORY_NAME_HINTS.NCERT)) return 'NCERT';
  if (matchesName(category.name, CATEGORY_NAME_HINTS.PYQ)) return 'PYQ';
  if (matchesName(category.name, CATEGORY_NAME_HINTS.STUDY_MATERIAL)) return 'STUDY_MATERIAL';
  if (matchesName(category.name, CATEGORY_NAME_HINTS.MOCK_TEST)) return 'MOCK_TEST';
  return 'GENERIC';
};

const activeCategoryFilter = () => ({ isActive: true });

/** Legacy CMS categories omit moduleType; treat as Free Resources unless tagged Current Affairs */
const freeResourcesCategoryQuery = () => ({
  ...activeCategoryFilter(),
  moduleType: { $ne: MODULE_TYPES.CURRENT_AFFAIRS }
});

const isFreeResourcesCategory = (category) =>
  Boolean(category?.isActive && category.moduleType !== MODULE_TYPES.CURRENT_AFFAIRS);

const findFreeResourcesCategory = (typeId) =>
  ResourceCategory.findOne({ _id: typeId, ...freeResourcesCategoryQuery() }).lean();

/** NCERT Books category — used for top-level subject/class filters on the portal tab */
const findNcertCategory = async (prefetchedTypes = []) => {
  const fromList = prefetchedTypes.find((c) => getCategoryKind(c) === 'NCERT');
  if (fromList) return fromList;

  return ResourceCategory.findOne({
    ...freeResourcesCategoryQuery(),
    name: { $regex: /ncert/i }
  })
    .select('_id name thumbnail moduleType')
    .lean();
};

const formatFilterOption = (f) => ({
  _id: f._id,
  value: f.value,
  type: f.type
});

const dedupeFilters = (filters) => {
  const seen = new Set();
  return filters.filter((f) => {
    const key = `${f.type}:${f.value}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getCategoryIdsByModule = async (moduleType) => {
  const cats = await ResourceCategory.find({ moduleType, ...activeCategoryFilter() })
    .select('_id')
    .lean();
  return cats.map((c) => c._id);
};

const resolveFilterRef = async ({ filterType, idParam, valueParam, categoryIds }) => {
  const raw = idParam ?? valueParam;
  if (raw === undefined || raw === null || raw === '') return null;

  const query = {
    type: filterType,
    categoryId: { $in: categoryIds },
    isActive: true
  };

  if (mongoose.Types.ObjectId.isValid(String(raw))) {
    const byId = await Filter.findOne({ ...query, _id: raw }).select('_id').lean();
    if (byId) return byId._id;
  }

  const byValue = await Filter.findOne({
    ...query,
    value: { $regex: new RegExp(`^${String(raw).trim()}$`, 'i') }
  })
    .select('_id')
    .lean();

  return byValue?._id || null;
};

const groupFiltersByType = (filters) =>
  filters.reduce((acc, f) => {
    if (!acc[f.type]) acc[f.type] = [];
    acc[f.type].push(formatFilterOption(f));
    return acc;
  }, {});

const formatCurrentAffairsCard = (doc) => ({
  _id: doc._id,
  title: doc.title,
  pdfUrl: doc.fileUrl?.url || null,
  thumbnail: doc.thumbnail?.url || null,
  year: doc.yearId?.value || null,
  month: doc.monthId?.value || null,
  type: doc.currentAffairsTypeId?.value || null,
  downloads: doc.downloads || 0
});

const formatFreeResourceCard = (doc) => ({
  _id: doc._id,
  itemType: 'file',
  title: doc.title,
  pdfUrl: doc.fileUrl?.url || null,
  thumbnail: doc.thumbnail?.url || null,
  subject: doc.subjectId?.value || null,
  class: doc.classId?.value || null,
  type: doc.categoryId?.name || null,
  subCategory: doc.subCategoryId?.name || null,
  paper: doc.paperId?.value || null,
  year: doc.yearId?.value || null,
  downloads: doc.downloads || 0
});

const formatMockTestCard = (doc) => ({
  _id: doc._id,
  itemType: 'mock_test',
  title: doc.title,
  pdfUrl: null,
  thumbnail: null,
  subject: doc.subjectId?.value || null,
  class: null,
  type: doc.categoryId?.name || null,
  subCategory: doc.subCategoryId?.name || null,
  paper: doc.paperId?.value || null,
  year: doc.yearId?.value || null,
  duration: doc.duration,
  totalMarks: doc.totalMarks,
  passingMarks: doc.passingMarks,
  questionCount: doc.questionIds?.length || 0,
  downloads: 0
});

const formatResourceDetail = (doc, formatter) => ({
  ...formatter(doc),
  description: doc.description,
  resourceType: doc.resourceType || 'PDF',
  fileType: doc.fileType,
  fileSize: doc.fileSize,
  categoryId: doc.categoryId?._id || doc.categoryId
});

// ——— Current Affairs (portal tab) ———

const getCurrentAffairsFilters = async () => {
  const cacheKey = cache.buildKey('portal:ca:filters', {});
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const categoryIds = await getCategoryIdsByModule(MODULE_TYPES.CURRENT_AFFAIRS);
  const filters = dedupeFilters(
    await Filter.find({ categoryId: { $in: categoryIds }, isActive: true })
      .sort({ type: 1, value: 1 })
      .lean()
  );
  const grouped = groupFiltersByType(filters);

  const payload = {
    years: grouped[FILTER_TYPES.YEAR] || [],
    months: grouped[FILTER_TYPES.MONTH] || [],
    types: grouped[FILTER_TYPES.CURRENT_AFFAIRS_TYPE] || []
  };

  cache.set(cacheKey, payload);
  return payload;
};

const buildCurrentAffairsResourceFilter = async (query = {}) => {
  const categoryIds = await getCategoryIdsByModule(MODULE_TYPES.CURRENT_AFFAIRS);
  const filter = { isActive: true, categoryId: { $in: categoryIds } };

  const yearId = await resolveFilterRef({
    filterType: FILTER_TYPES.YEAR,
    idParam: query.yearId,
    valueParam: query.year,
    categoryIds
  });
  const monthId = await resolveFilterRef({
    filterType: FILTER_TYPES.MONTH,
    idParam: query.monthId,
    valueParam: query.month,
    categoryIds
  });
  const typeId = await resolveFilterRef({
    filterType: FILTER_TYPES.CURRENT_AFFAIRS_TYPE,
    idParam: query.typeId,
    valueParam: query.type,
    categoryIds
  });

  if (yearId) filter.yearId = yearId;
  if (monthId) filter.monthId = monthId;
  if (typeId) filter.currentAffairsTypeId = typeId;

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } }
    ];
  }

  return filter;
};

const getCurrentAffairsResources = async (query = {}) => {
  const cacheKey = cache.buildKey('portal:ca:resources', query);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const filter = await buildCurrentAffairsResourceFilter(query);
  const resources = await Resource.find(filter)
    .populate(RESOURCE_POPULATE)
    .sort({ createdAt: -1 })
    .lean();

  const data = resources.map(formatCurrentAffairsCard);
  cache.set(cacheKey, data);
  return data;
};

// ——— Free Resources (portal tab) ———

const loadSubjectClassFilters = async (category) => {
  if (!category) return { subjects: [], classes: [] };

  const filters = await Filter.find({
    categoryId: category._id,
    isActive: true,
    type: { $in: [FILTER_TYPES.SUBJECT, FILTER_TYPES.CLASS] }
  })
    .sort({ type: 1, value: 1 })
    .lean();

  const grouped = groupFiltersByType(filters);
  return {
    subjects: grouped[FILTER_TYPES.SUBJECT] || [],
    classes: grouped[FILTER_TYPES.CLASS] || []
  };
};

const getFreeResourcesFilters = async (query = {}) => {
  const cacheKey = cache.buildKey('portal:fr:filters:v2', query);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const types = await ResourceCategory.find(freeResourcesCategoryQuery())
    .select('name thumbnail moduleType')
    .sort({ name: 1 })
    .lean();

  let subjectClassSource = await findNcertCategory(types);
  if (query.typeId) {
    const selected = await findFreeResourcesCategory(query.typeId);
    if (selected && getCategoryKind(selected) === 'NCERT') {
      subjectClassSource = selected;
    }
  }

  const { subjects, classes } = await loadSubjectClassFilters(subjectClassSource);
  const ncertCategory = await findNcertCategory(types);

  const payload = {
    subjects,
    classes,
    ncertTypeId: ncertCategory?._id || null,
    types: types.map((c) => ({
      _id: c._id,
      name: c.name,
      thumbnail: c.thumbnail?.url || null,
      kind: getCategoryKind(c)
    }))
  };

  cache.set(cacheKey, payload);
  return payload;
};

const getFreeResourcesDynamicFilters = async (typeId) => {
  if (!typeId) return { error: 'typeId is required (categoryId)' };

  const cacheKey = cache.buildKey('portal:fr:dynamic-filters', { typeId });
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const category = await findFreeResourcesCategory(typeId);
  if (!category) return null;

  const kind = getCategoryKind(category);
  const filterKeys = FREE_RESOURCE_FILTER_KEYS[kind] || FREE_RESOURCE_FILTER_KEYS.GENERIC;

  const filters = await Filter.find({ categoryId: category._id, isActive: true })
    .sort({ type: 1, value: 1 })
    .lean();
  const grouped = groupFiltersByType(filters);

  const subCategories = filterKeys.includes('SUB_CATEGORY')
    ? await SubCategory.find({ categoryId: category._id, isActive: true })
        .select('name')
        .sort({ name: 1 })
        .lean()
    : [];

  const payload = {
    typeId: category._id,
    typeName: category.name,
    kind,
    filters: filterKeys,
    subjects: grouped[FILTER_TYPES.SUBJECT] || [],
    classes: grouped[FILTER_TYPES.CLASS] || [],
    subCategories: subCategories.map((s) => ({ _id: s._id, name: s.name })),
    papers: grouped[FILTER_TYPES.PAPER] || [],
    years: grouped[FILTER_TYPES.YEAR] || []
  };

  cache.set(cacheKey, payload);
  return payload;
};

const buildFreeResourcesResourceFilter = async (query = {}) => {
  const typeId = query.typeId;
  if (!typeId) return { error: 'typeId is required (this is the categoryId)' };

  const category = await findFreeResourcesCategory(typeId);
  if (!category) return null;

  const filter = { isActive: true, categoryId: category._id };
  const kind = getCategoryKind(category);

  if (query.subjectId) filter.subjectId = query.subjectId;
  if (query.classId) filter.classId = query.classId;
  if (query.subCategoryId) filter.subCategoryId = query.subCategoryId;
  if (query.paperId) filter.paperId = query.paperId;
  if (query.yearId) filter.yearId = query.yearId;

  if (kind === 'PYQ' && !query.subCategoryId && !query.paperId && !query.yearId) {
    // allow list without sub-filters
  }

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } }
    ];
  }

  return { filter, category, kind };
};

const getFreeResourcesResources = async (query = {}) => {
  const built = await buildFreeResourcesResourceFilter(query);
  if (!built) return { error: 'Invalid typeId (category not found)' };
  if (built.error) return built;

  const cacheKey = cache.buildKey('portal:fr:resources', query);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let data;

  if (built.kind === 'MOCK_TEST') {
    const mockFilter = { isActive: true, categoryId: built.category._id };
    if (query.subCategoryId) mockFilter.subCategoryId = query.subCategoryId;
    if (query.paperId) mockFilter.paperId = query.paperId;
    if (query.yearId) mockFilter.yearId = query.yearId;
    if (query.search) {
      mockFilter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } }
      ];
    }

    const mockTests = await MockTest.find(mockFilter)
      .populate('categoryId', 'name moduleType')
      .populate('subCategoryId', 'name')
      .populate('subjectId', 'value type')
      .populate('paperId', 'value type')
      .populate('yearId', 'value type')
      .select('title description duration totalMarks passingMarks questionIds categoryId subCategoryId subjectId paperId yearId createdAt')
      .sort({ createdAt: -1 })
      .lean();

    data = mockTests.map(formatMockTestCard);
  } else {
    const resources = await Resource.find(built.filter)
      .populate(RESOURCE_POPULATE)
      .sort({ createdAt: -1 })
      .lean();

    data = resources.map(formatFreeResourceCard);
  }

  cache.set(cacheKey, data);
  return data;
};

// ——— Shared detail / view / download ———

const getResourceByModule = async (id, moduleType, formatter) => {
  const resource = await Resource.findOne({ _id: id, isActive: true })
    .populate(RESOURCE_POPULATE)
    .lean();

  if (!resource?.categoryId) return null;

  if (moduleType === MODULE_TYPES.CURRENT_AFFAIRS) {
    if (resource.categoryId.moduleType !== MODULE_TYPES.CURRENT_AFFAIRS) return null;
  } else if (!isFreeResourcesCategory(resource.categoryId)) {
    return null;
  }

  return formatResourceDetail(resource, formatter);
};

const getMockTestDetail = async (id) => {
  const mockTest = await MockTest.findOne({ _id: id, isActive: true })
    .populate('categoryId', 'name moduleType isActive')
    .populate('subCategoryId', 'name')
    .populate('subjectId', 'value type')
    .populate('paperId', 'value type')
    .populate('yearId', 'value type')
    .populate('questionIds')
    .lean();

  if (!mockTest?.categoryId || !isFreeResourcesCategory(mockTest.categoryId)) return null;

  return {
    ...formatMockTestCard(mockTest),
    description: mockTest.description,
    resourceType: 'MOCK_TEST',
    categoryId: mockTest.categoryId._id,
    questions: (mockTest.questionIds || []).map((q) => ({
      _id: q._id,
      question: q.question,
      options: q.options,
      marks: q.marks,
      negativeMarks: q.negativeMarks
    }))
  };
};

const getCurrentAffairsById = (id) =>
  getResourceByModule(id, MODULE_TYPES.CURRENT_AFFAIRS, formatCurrentAffairsCard);

const getFreeResourceById = async (id) => {
  const file = await getResourceByModule(id, MODULE_TYPES.FREE_RESOURCES, formatFreeResourceCard);
  if (file) return file;
  return getMockTestDetail(id);
};

const trackResourceView = async (id, moduleType, userId = null) => {
  let detail;
  if (moduleType === MODULE_TYPES.CURRENT_AFFAIRS) {
    detail = await getResourceByModule(id, moduleType, formatCurrentAffairsCard);
  } else {
    detail = await getFreeResourceById(id);
  }
  if (!detail) return null;
  if (detail.itemType !== 'mock_test') {
    await ResourceViewHistory.create({ userId, resourceId: id });
  }
  return {
    ...detail,
    viewUrl: detail.itemType === 'mock_test' ? null : detail.pdfUrl
  };
};

const recordResourceDownload = async (id, moduleType, userId = null) => {
  const resource = await Resource.findOne({ _id: id, isActive: true })
    .populate('categoryId', 'moduleType')
    .lean();

  if (!resource?.categoryId) return null;
  if (moduleType === MODULE_TYPES.CURRENT_AFFAIRS) {
    if (resource.categoryId.moduleType !== MODULE_TYPES.CURRENT_AFFAIRS) return null;
  } else if (!isFreeResourcesCategory(resource.categoryId)) {
    return null;
  }

  const updated = await Resource.findOneAndUpdate(
    { _id: id },
    { $inc: { downloads: 1 } },
    { new: true }
  )
    .select('title fileUrl downloads')
    .lean();

  await ResourceDownload.create({ userId, resourceId: id });
  cache.invalidatePrefix('portal:ca:');
  cache.invalidatePrefix('portal:fr:');

  return {
    _id: updated._id,
    title: updated.title,
    downloadUrl: updated.fileUrl?.url || null,
    downloads: updated.downloads
  };
};

// ——— CMS helpers (unchanged) ———

const buildPortalResourceQuery = async (query = {}) => {
  const {
    moduleType,
    categoryId,
    subCategoryId,
    subjectId,
    classId,
    paperId,
    yearId,
    monthId,
    typeId,
    search,
    resourceType
  } = query;

  const filter = { isActive: true };

  if (categoryId) {
    filter.categoryId = categoryId;
  } else if (moduleType) {
    const cats = await ResourceCategory.find({ moduleType, ...activeCategoryFilter() }).select('_id');
    filter.categoryId = { $in: cats.map((c) => c._id) };
  }

  if (subCategoryId) filter.subCategoryId = subCategoryId;
  if (subjectId) filter.subjectId = subjectId;
  if (classId) filter.classId = classId;
  if (paperId) filter.paperId = paperId;
  if (yearId) filter.yearId = yearId;
  if (monthId) filter.monthId = monthId;
  if (typeId) filter.currentAffairsTypeId = typeId;
  if (resourceType) filter.resourceType = resourceType;

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  return filter;
};

module.exports = {
  getCategoryKind,
  getCurrentAffairsFilters,
  getCurrentAffairsResources,
  getCurrentAffairsById,
  getFreeResourcesFilters,
  getFreeResourcesDynamicFilters,
  getFreeResourcesResources,
  getFreeResourceById,
  trackResourceView,
  recordResourceDownload,
  buildPortalResourceQuery,
  MODULE_TYPES
};
```



