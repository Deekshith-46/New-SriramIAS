# My Courses LMS — Recordings, Tests, Answer Writing

> **Project:** Sriram-IAS Backend  
> **Volume:** `DOC_2_MY_COURSES_LMS_COMPLETE.md`  
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

Enrolled-student learning: recordings, progress, LMS tests, bookmarks, attendance, answer writing.

---

## 2. Files in this volume

- `controllers/answerWritingCategoryController.js`
- `controllers/answerWritingQuestionController.js`
- `controllers/answerWritingSubmissionController.js`
- `controllers/courseProgressController.js`
- `controllers/lectureAnswerController.js`
- `controllers/lectureNoteController.js`
- `controllers/lectureProgressController.js`
- `controllers/lectureQuizAttemptController.js`
- `controllers/lmsBookmarkController.js`
- `controllers/lmsTestAttemptController.js`
- `controllers/lmsTestCategoryController.js`
- `controllers/lmsTestController.js`
- `controllers/lmsTestQuestionController.js`
- `controllers/recordedLectureController.js`
- `controllers/studentAttendanceController.js`
- `models/AnswerWritingCategory.js`
- `models/AnswerWritingQuestion.js`
- `models/AnswerWritingSubmission.js`
- `models/CourseProgress.js`
- `models/LectureAnswer.js`
- `models/LectureNote.js`
- `models/LectureProgress.js`
- `models/LectureQuizAttempt.js`
- `models/LmsBookmark.js`
- `models/LmsTest.js`
- `models/LmsTestAttempt.js`
- `models/LmsTestCategory.js`
- `models/LmsTestQuestion.js`
- `models/RecordedLecture.js`
- `models/StudentAttendance.js`
- `routes/answerWritingRoutes.js`
- `routes/attendanceRoutes.js`
- `routes/courseProgressRoutes.js`
- `routes/lectureAnswerRoutes.js`
- `routes/lectureNoteRoutes.js`
- `routes/lectureProgressRoutes.js`
- `routes/lectureQuizAttemptRoutes.js`
- `routes/lmsBookmarkRoutes.js`
- `routes/lmsTestRoutes.js`
- `routes/recordedLectureRoutes.js`

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

### `controllers/answerWritingCategoryController.js`

```javascript
const AnswerWritingCategory = require('../models/AnswerWritingCategory');
const AnswerWritingQuestion = require('../models/AnswerWritingQuestion');
const { uniqueSlugForModel } = require('../utils/categorySlugFromTitle');

exports.getCategories = async (req, res) => {
  try {
    const categories = await AnswerWritingCategory.find().sort({ slug: 1 }).lean();
    res.json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    console.error('Get answer writing categories error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const category = await AnswerWritingCategory.findById(req.params.id).lean();
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Get answer writing category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const nextSlug = await uniqueSlugForModel(AnswerWritingCategory, title);
    if (!nextSlug) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const category = await AnswerWritingCategory.create({
      title: title.trim(),
      slug: nextSlug
    });

    res.status(201).json({ success: true, message: 'Category created', data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category slug already exists' });
    }
    console.error('Create answer writing category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await AnswerWritingCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { title } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const trimmedTitle = title.trim();
    const nextSlug = await uniqueSlugForModel(AnswerWritingCategory, trimmedTitle, category._id);
    if (!nextSlug) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    category.title = trimmedTitle;

    if (category.slug !== nextSlug) {
      const inUse = await AnswerWritingQuestion.countDocuments({ categoryId: category._id });
      if (!inUse) {
        category.slug = nextSlug;
      }
    }
    await category.save();

    res.json({ success: true, message: 'Category updated', data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category slug already exists' });
    }
    console.error('Update answer writing category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await AnswerWritingCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const questionsCount = await AnswerWritingQuestion.countDocuments({ categoryId: category._id });
    if (questionsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${questionsCount} question(s) still use it. Delete questions first.`
      });
    }

    await AnswerWritingCategory.deleteOne({ _id: category._id });

    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error('Delete answer writing category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/answerWritingQuestionController.js`

```javascript
const AnswerWritingQuestion = require('../models/AnswerWritingQuestion');
const AnswerWritingSubmission = require('../models/AnswerWritingSubmission');
const AnswerWritingCategory = require('../models/AnswerWritingCategory');
const CourseSubject = require('../models/CourseSubject');
const {
  normalizeStatusFilter,
  filterQuestionsByStatus,
  STUDENT_STATUS_OPTIONS,
  resolveDisplayStatus,
  getRequestUserId,
  isEvaluator,
  assertSubjectBelongsToCourse,
  findQuestionWithRelations,
  QUESTION_RELATION_POPULATE,
  uploadAnswerFile
} = require('../utils/answerWritingHelpers');
const { getCourseForAdmin, assertEnrollmentAccess } = require('../utils/courseAccess');
const { sanitizeText } = require('../utils/sanitizeText');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

exports.createQuestion = async (req, res) => {
  try {
    const { courseId, subjectId, categoryId, title, question, isPublished } = req.body;

    if (!courseId || !subjectId || !categoryId || !title || !question) {
      return res.status(400).json({
        success: false,
        message: 'courseId, subjectId, categoryId, title, and question are required'
      });
    }

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const subject = await assertSubjectBelongsToCourse(courseId, subjectId);
    if (!subject) {
      return res.status(400).json({ success: false, message: 'Invalid subject for this course' });
    }

    const category = await AnswerWritingCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    let questionPaperPdf;
    if (req.files?.questionPaperPdf?.[0]) {
      const uploaded = await uploadAnswerFile(
        req.files.questionPaperPdf[0],
        'answer-writing/questions',
        uploadToCloudinary
      );
      questionPaperPdf = { url: uploaded.url, public_id: uploaded.public_id };
    }

    const doc = await AnswerWritingQuestion.create({
      courseId,
      subjectId,
      categoryId,
      title: sanitizeText(title),
      question: sanitizeText(question),
      questionPaperPdf,
      isPublished: isPublished !== undefined ? isPublished === 'true' || isPublished === true : true,
      createdBy: req.user._id
    });

    const data = await findQuestionWithRelations(doc._id);

    res.status(201).json({ success: true, message: 'Question created', data });
  } catch (error) {
    console.error('Create answer writing question error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getStudentFilters = async (req, res) => {
  try {
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId query parameter is required' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const publishedQuestions = await AnswerWritingQuestion.find({
      courseId,
      isPublished: true
    })
      .select('subjectId categoryId')
      .lean();

    const subjectIds = [...new Set(publishedQuestions.map((q) => String(q.subjectId)))];
    const categoryIds = [...new Set(publishedQuestions.map((q) => String(q.categoryId)))];

    const [subjects, categories] = await Promise.all([
      subjectIds.length
        ? CourseSubject.find({
            _id: { $in: subjectIds },
            courseId,
            isActive: true,
            isDeleted: false
          })
            .select('title')
            .sort({ order: 1, createdAt: 1 })
            .lean()
        : [],
      categoryIds.length
        ? AnswerWritingCategory.find({ _id: { $in: categoryIds } })
            .select('title slug')
            .sort({ title: 1 })
            .lean()
        : []
    ]);

    res.json({
      success: true,
      data: {
        subjects,
        categories,
        statuses: STUDENT_STATUS_OPTIONS
      }
    });
  } catch (error) {
    console.error('Get answer writing student filters error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const { courseId, subjectId, categoryId, status } = req.query;
    const statusFilter = normalizeStatusFilter(status);
    const studentUserId = getRequestUserId(req.user);
    const adminView = isEvaluator(req.user.role);

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId query parameter is required' });
    }

    if (adminView) {
      const course = await getCourseForAdmin(req, res, courseId);
      if (!course) return;
    } else {
      const enrollment = await assertEnrollmentAccess(req, res, courseId);
      if (!enrollment) return;
    }

    const filter = { courseId };
    if (subjectId) filter.subjectId = subjectId;
    if (categoryId) filter.categoryId = categoryId;
    if (!adminView) filter.isPublished = true;

    const questions = await AnswerWritingQuestion.find(filter)
      .populate(QUESTION_RELATION_POPULATE)
      .sort({ createdAt: -1 })
      .lean();

    let submissionMap = new Map();
    if (!adminView && studentUserId) {
      const submissions = await AnswerWritingSubmission.find({
        studentId: studentUserId,
        questionId: { $in: questions.map((q) => q._id) }
      }).lean();
      submissionMap = new Map(submissions.map((s) => [String(s.questionId), s]));
    }

    let data = questions.map((q) => {
      const submission = submissionMap.get(String(q._id));
      const displayStatus = resolveDisplayStatus(submission);
      return {
        ...q,
        displayStatus,
        submissionId: submission?._id ?? null,
        submission: submission
          ? {
              _id: submission._id,
              submissionStatus: submission.submissionStatus,
              marks: submission.marks,
              evaluatedAt: submission.evaluatedAt
            }
          : null
      };
    });

    if (!adminView) {
      data = filterQuestionsByStatus(data, statusFilter);
    } else if (statusFilter) {
      data = filterQuestionsByStatus(data, statusFilter);
    }

    res.json({
      success: true,
      count: data.length,
      data,
      filters: {
        courseId,
        subjectId: subjectId || null,
        categoryId: categoryId || null,
        status: statusFilter || null
      }
    });
  } catch (error) {
    console.error('Get answer writing questions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getQuestionById = async (req, res) => {
  try {
    const question = await AnswerWritingQuestion.findById(req.params.id)
      .populate(QUESTION_RELATION_POPULATE)
      .lean();

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const adminView = isEvaluator(req.user.role);

    if (adminView) {
      const course = await getCourseForAdmin(req, res, question.courseId);
      if (!course) return;
    } else {
      if (!question.isPublished) {
        return res.status(404).json({ success: false, message: 'Question not found' });
      }
      const enrollment = await assertEnrollmentAccess(req, res, question.courseId);
      if (!enrollment) return;
    }

    let submission = null;
    const studentUserId = getRequestUserId(req.user);
    if (!adminView && studentUserId) {
      submission = await AnswerWritingSubmission.findOne({
        studentId: studentUserId,
        questionId: question._id
      }).lean();
    }

    res.json({
      success: true,
      data: {
        ...question,
        displayStatus: resolveDisplayStatus(submission),
        submission
      }
    });
  } catch (error) {
    console.error('Get answer writing question error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const question = await AnswerWritingQuestion.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const course = await getCourseForAdmin(req, res, question.courseId);
    if (!course) return;

    const { subjectId, categoryId, title, question: questionText, isPublished } = req.body;

    if (subjectId) {
      const subject = await assertSubjectBelongsToCourse(question.courseId, subjectId);
      if (!subject) {
        return res.status(400).json({ success: false, message: 'Invalid subject for this course' });
      }
      question.subjectId = subjectId;
    }

    if (categoryId) {
      const category = await AnswerWritingCategory.findById(categoryId);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      question.categoryId = categoryId;
    }

    if (title) question.title = sanitizeText(title);
    if (questionText) question.question = sanitizeText(questionText);

    if (isPublished !== undefined) {
      question.isPublished = isPublished === 'true' || isPublished === true;
    }

    if (req.files?.questionPaperPdf?.[0]) {
      const uploaded = await uploadAnswerFile(
        req.files.questionPaperPdf[0],
        'answer-writing/questions',
        uploadToCloudinary
      );
      question.questionPaperPdf = { url: uploaded.url, public_id: uploaded.public_id };
    }

    await question.save();

    const data = await findQuestionWithRelations(question._id);

    res.json({ success: true, message: 'Question updated', data });
  } catch (error) {
    console.error('Update answer writing question error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await AnswerWritingQuestion.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const course = await getCourseForAdmin(req, res, question.courseId);
    if (!course) return;

    const submissionsDeleted = await AnswerWritingSubmission.deleteMany({ questionId: question._id });
    await AnswerWritingQuestion.deleteOne({ _id: question._id });

    res.json({
      success: true,
      message: 'Question deleted permanently',
      submissionsDeleted: submissionsDeleted.deletedCount
    });
  } catch (error) {
    console.error('Delete answer writing question error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/answerWritingSubmissionController.js`

```javascript
const AnswerWritingQuestion = require('../models/AnswerWritingQuestion');
const AnswerWritingSubmission = require('../models/AnswerWritingSubmission');
const {
  normalizeStatusFilter,
  getRequestUserId,
  isEvaluator,
  assertEvaluatorCourseAccess,
  uploadAnswerFile
} = require('../utils/answerWritingHelpers');
const { assertEnrollmentAccess } = require('../utils/courseAccess');
const { sanitizeText, sanitizeOptionalText } = require('../utils/sanitizeText');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

exports.submitAnswer = async (req, res) => {
  try {
    const studentUserId = getRequestUserId(req.user);
    const { questionId, answerType, answerText } = req.body;

    if (!questionId || !answerType) {
      return res.status(400).json({
        success: false,
        message: 'questionId and answerType are required'
      });
    }

    if (!['text', 'file'].includes(answerType)) {
      return res.status(400).json({ success: false, message: 'answerType must be text or file' });
    }

    const question = await AnswerWritingQuestion.findOne({
      _id: questionId,
      isPublished: true
    });

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, question.courseId);
    if (!enrollment) return;

    const existing = await AnswerWritingSubmission.findOne({
      studentId: studentUserId,
      questionId
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an answer for this question'
      });
    }

    let payload = {
      studentId: studentUserId,
      questionId,
      courseId: question.courseId,
      answerType,
      submissionStatus: 'submitted'
    };

    if (answerType === 'text') {
      const text = sanitizeOptionalText(answerText);
      if (!text) {
        return res.status(400).json({ success: false, message: 'answerText is required for text answers' });
      }
      payload.answerText = text;
    } else {
      const file = req.files?.answerFile?.[0];
      if (!file) {
        return res.status(400).json({ success: false, message: 'answerFile is required for file answers' });
      }
      const uploaded = await uploadAnswerFile(
        file,
        'answer-writing/submissions',
        uploadToCloudinary
      );
      payload.answerFile = { url: uploaded.url, public_id: uploaded.public_id };
    }

    const submission = await AnswerWritingSubmission.create(payload);

    res.status(201).json({
      success: true,
      message: 'Answer submitted successfully',
      data: submission
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Submission already exists for this question' });
    }
    console.error('Submit answer writing error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getMySubmissions = async (req, res) => {
  try {
    const studentUserId = getRequestUserId(req.user);
    const statusFilter = normalizeStatusFilter(req.query.status);

    const filter = { studentId: studentUserId };
    if (statusFilter === 'submitted') filter.submissionStatus = 'submitted';
    if (statusFilter === 'evaluated') filter.submissionStatus = 'evaluated';

    const submissions = await AnswerWritingSubmission.find(filter)
      .populate({
        path: 'questionId',
        select: 'title question subjectId categoryId courseId questionPaperPdf',
        populate: [
          { path: 'subjectId', select: 'title' },
          { path: 'categoryId', select: 'title slug' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: submissions.length, data: submissions });
  } catch (error) {
    console.error('Get my submissions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubmissionById = async (req, res) => {
  try {
    const submission = await AnswerWritingSubmission.findById(req.params.id)
      .populate({
        path: 'questionId',
        populate: [
          { path: 'subjectId', select: 'title' },
          { path: 'categoryId', select: 'title slug' }
        ]
      })
      .populate('evaluatedBy', 'name email role')
      .lean();

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const userId = getRequestUserId(req.user);

    if (req.user.role === 'student') {
      if (submission.studentId.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (isEvaluator(req.user.role)) {
      const course = await assertEvaluatorCourseAccess(req, res, submission.courseId);
      if (!course) return;
    } else {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: submission });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getEvaluatorSubmissions = async (req, res) => {
  try {
    if (!isEvaluator(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Evaluator access only' });
    }

    const { courseId, subjectId, categoryId, status } = req.query;
    const statusFilter = normalizeStatusFilter(status) || 'submitted';

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId query parameter is required' });
    }

    const course = await assertEvaluatorCourseAccess(req, res, courseId);
    if (!course) return;

    const questionFilter = { courseId };
    if (subjectId) questionFilter.subjectId = subjectId;
    if (categoryId) questionFilter.categoryId = categoryId;

    const questions = await AnswerWritingQuestion.find(questionFilter).select('_id').lean();
    const questionIds = questions.map((q) => q._id);

    const submissionFilter = { questionId: { $in: questionIds } };
    if (statusFilter === 'submitted') submissionFilter.submissionStatus = 'submitted';
    if (statusFilter === 'evaluated') submissionFilter.submissionStatus = 'evaluated';

    const submissions = await AnswerWritingSubmission.find(submissionFilter)
      .populate('studentId', 'name email mobile')
      .populate({
        path: 'questionId',
        select: 'title question subjectId categoryId',
        populate: [
          { path: 'subjectId', select: 'title' },
          { path: 'categoryId', select: 'title slug' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: submissions.length, data: submissions });
  } catch (error) {
    console.error('Evaluator submissions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.evaluateSubmission = async (req, res) => {
  try {
    if (!isEvaluator(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Evaluator access only' });
    }

    const submission = await AnswerWritingSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const course = await assertEvaluatorCourseAccess(req, res, submission.courseId);
    if (!course) return;

    const {
      evaluatedAnswerType,
      evaluatedAnswerText,
      feedback,
      evaluatorFeedback,
      marks: marksRaw
    } = req.body;

    if (!evaluatedAnswerType) {
      return res.status(400).json({
        success: false,
        message: 'evaluatedAnswerType is required (text or file)'
      });
    }

    if (!['text', 'file'].includes(evaluatedAnswerType)) {
      return res.status(400).json({
        success: false,
        message: 'evaluatedAnswerType must be text or file'
      });
    }

    const marks = marksRaw !== undefined ? Number(marksRaw) : submission.marks;
    if (Number.isNaN(marks) || marks < 0) {
      return res.status(400).json({ success: false, message: 'marks must be a valid number >= 0' });
    }

    const remarks = sanitizeOptionalText(feedback || evaluatorFeedback);

    if (evaluatedAnswerType === 'text') {
      const text = sanitizeOptionalText(evaluatedAnswerText);
      if (!text) {
        return res.status(400).json({
          success: false,
          message: 'evaluatedAnswerText is required when evaluatedAnswerType is text'
        });
      }
      submission.evaluatedAnswerType = 'text';
      submission.evaluatedAnswerText = text;
      submission.evaluatedAnswerFile = undefined;
    } else {
      const file = req.files?.evaluatedAnswerFile?.[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'evaluatedAnswerFile is required when evaluatedAnswerType is file'
        });
      }
      const uploaded = await uploadAnswerFile(
        file,
        'answer-writing/evaluated',
        uploadToCloudinary
      );
      submission.evaluatedAnswerType = 'file';
      submission.evaluatedAnswerText = '';
      submission.evaluatedAnswerFile = { url: uploaded.url, public_id: uploaded.public_id };
    }

    submission.submissionStatus = 'evaluated';
    submission.evaluatorFeedback = remarks;
    submission.marks = marks;
    submission.evaluatedBy = req.user._id;
    submission.evaluatedAt = new Date();
    await submission.save();

    res.json({
      success: true,
      message: 'Evaluation completed',
      data: submission
    });
  } catch (error) {
    console.error('Evaluate submission error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/courseProgressController.js`

```javascript
const CourseProgress = require('../models/CourseProgress');
const RecordedLecture = require('../models/RecordedLecture');
const { assertEnrollmentAccess } = require('../utils/courseAccess');
const { syncCourseProgress } = require('../utils/courseProgressService');
const { NOT_DELETED } = require('../utils/lectureHelpers');

exports.getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    let progress = await CourseProgress.findOne({
      userId: req.user._id,
      courseId
    }).populate('lastOpenedLectureId', 'lectureTitle thumbnail subjectId');

    if (!progress) {
      progress = await syncCourseProgress(req.user._id, courseId);
      progress = await CourseProgress.findById(progress._id)
        .populate('lastOpenedLectureId', 'lectureTitle thumbnail subjectId');
    }

    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Get Course Progress Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateLastOpened = async (req, res) => {
  try {
    const { courseId, lectureId } = req.body;

    if (!courseId || !lectureId) {
      return res.status(400).json({
        success: false,
        message: 'courseId and lectureId are required'
      });
    }

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const lecture = await RecordedLecture.findOne({
      _id: lectureId,
      courseId,
      isPublished: true,
      ...NOT_DELETED
    });

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const progress = await syncCourseProgress(req.user._id, courseId, lectureId);

    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Update Last Opened Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/lectureAnswerController.js`

```javascript
const RecordedLecture = require('../models/RecordedLecture');
const LectureAnswer = require('../models/LectureAnswer');
const { assertEnrollmentAccess } = require('../utils/courseAccess');

exports.saveAnswer = async (req, res) => {
  try {
    const { lectureId, answerText } = req.body;

    if (!lectureId) {
      return res.status(400).json({ success: false, message: 'lectureId is required' });
    }

    const lecture = await RecordedLecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const answer = await LectureAnswer.findOneAndUpdate(
      { userId: req.user._id, lectureId },
      {
        courseId: lecture.courseId,
        answerText: answerText ?? ''
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: answer });
  } catch (error) {
    console.error('Save Answer Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getAnswer = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await RecordedLecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const answer = await LectureAnswer.findOne({
      userId: req.user._id,
      lectureId
    });

    res.json({
      success: true,
      data: answer || { lectureId, answerText: '' },
      mainsQuestion: lecture.mainsQuestion || null
    });
  } catch (error) {
    console.error('Get Answer Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/lectureNoteController.js`

```javascript
const RecordedLecture = require('../models/RecordedLecture');
const LectureNote = require('../models/LectureNote');
const { assertEnrollmentAccess } = require('../utils/courseAccess');
const { NOT_DELETED } = require('../utils/lectureHelpers');

const getLectureWithAccess = async (req, res, lectureId) => {
  const lecture = await RecordedLecture.findOne({
    _id: lectureId,
    isPublished: true,
    ...NOT_DELETED
  });
  if (!lecture) {
    res.status(404).json({ success: false, message: 'Lecture not found' });
    return null;
  }

  if (!lecture.isPreviewFree) {
    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return null;
  }

  return lecture;
};

exports.saveNote = async (req, res) => {
  try {
    const { lectureId, noteText } = req.body;

    if (!lectureId) {
      return res.status(400).json({ success: false, message: 'lectureId is required' });
    }

    const lecture = await getLectureWithAccess(req, res, lectureId);
    if (!lecture) return;

    const note = await LectureNote.findOneAndUpdate(
      { userId: req.user._id, lectureId },
      { noteText: noteText ?? '' },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: note });
  } catch (error) {
    console.error('Save Note Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getNote = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await getLectureWithAccess(req, res, lectureId);
    if (!lecture) return;

    const note = await LectureNote.findOne({
      userId: req.user._id,
      lectureId
    });

    res.json({
      success: true,
      data: note || { lectureId, noteText: '' }
    });
  } catch (error) {
    console.error('Get Note Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/lectureProgressController.js`

```javascript
const RecordedLecture = require('../models/RecordedLecture');
const LectureProgress = require('../models/LectureProgress');
const { assertEnrollmentAccess } = require('../utils/courseAccess');
const { syncCourseProgress } = require('../utils/courseProgressService');
const { NOT_DELETED } = require('../utils/lectureHelpers');

exports.updateProgress = async (req, res) => {
  try {
    const { lectureId, watchedDuration } = req.body;

    if (!lectureId || watchedDuration === undefined) {
      return res.status(400).json({
        success: false,
        message: 'lectureId and watchedDuration are required'
      });
    }

    const lecture = await RecordedLecture.findOne({
      _id: lectureId,
      isPublished: true,
      ...NOT_DELETED
    });
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const serverDuration = lecture.video?.duration || 0;
    const totalDuration = serverDuration;
    const watched = totalDuration > 0
      ? Math.min(totalDuration, Math.max(0, Number(watchedDuration)))
      : Math.max(0, Number(watchedDuration));

    let progressPercent = 0;
    if (totalDuration > 0) {
      progressPercent = Math.min(100, Math.round((watched / totalDuration) * 100));
    }

    const isCompleted = totalDuration > 0 && watched >= totalDuration * 0.9;

    const progress = await LectureProgress.findOneAndUpdate(
      { userId: req.user._id, lectureId },
      {
        courseId: lecture.courseId,
        watchedDuration: watched,
        totalDuration,
        progressPercent,
        isCompleted,
        lastWatchedAt: new Date()
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const courseProgress = await syncCourseProgress(
      req.user._id,
      lecture.courseId,
      lectureId
    );

    res.json({ success: true, data: progress, courseProgress });
  } catch (error) {
    console.error('Update Progress Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getProgress = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await RecordedLecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const progress = await LectureProgress.findOne({
      userId: req.user._id,
      lectureId
    });

    res.json({
      success: true,
      data: progress || {
        lectureId,
        watchedDuration: 0,
        totalDuration: lecture.video?.duration || 0,
        progressPercent: 0,
        isCompleted: false
      }
    });
  } catch (error) {
    console.error('Get Progress Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/lectureQuizAttemptController.js`

```javascript
const RecordedLecture = require('../models/RecordedLecture');
const LectureQuizAttempt = require('../models/LectureQuizAttempt');
const { assertEnrollmentAccess } = require('../utils/courseAccess');

exports.submitQuizAttempt = async (req, res) => {
  try {
    const { lectureId, answers } = req.body;

    if (!lectureId || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'lectureId and answers array are required'
      });
    }

    const lecture = await RecordedLecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const questions = lecture.topicQuiz || [];
    if (!questions.length) {
      return res.status(400).json({ success: false, message: 'This lecture has no quiz' });
    }

    const evaluatedAnswers = answers.map((answer) => {
      const question = questions[answer.questionIndex];
      const isCorrect = question
        ? Number(answer.selectedOption) === Number(question.correctAnswer)
        : false;

      return {
        questionIndex: answer.questionIndex,
        selectedOption: answer.selectedOption,
        isCorrect
      };
    });

    const score = evaluatedAnswers.filter((a) => a.isCorrect).length;
    const totalQuestions = questions.length;

    const attempt = await LectureQuizAttempt.create({
      userId: req.user._id,
      lectureId,
      courseId: lecture.courseId,
      answers: evaluatedAnswers,
      score,
      totalQuestions
    });

    const explanations = questions.map((q, index) => ({
      questionIndex: index,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      isCorrect: evaluatedAnswers.find((a) => a.questionIndex === index)?.isCorrect ?? false
    }));

    res.status(201).json({
      success: true,
      data: {
        attemptId: attempt._id,
        score,
        totalQuestions,
        percentage: Math.round((score / totalQuestions) * 100),
        explanations
      }
    });
  } catch (error) {
    console.error('Submit Quiz Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getQuizAttempts = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await RecordedLecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const attempts = await LectureQuizAttempt.find({
      userId: req.user._id,
      lectureId
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: attempts.length, data: attempts });
  } catch (error) {
    console.error('Get Quiz Attempts Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/lmsBookmarkController.js`

```javascript
const LmsBookmark = require('../models/LmsBookmark');
const RecordedLecture = require('../models/RecordedLecture');
const LmsTest = require('../models/LmsTest');
const LmsTestCategory = require('../models/LmsTestCategory');
const { assertEnrollmentAccess } = require('../utils/courseAccess');
const { NOT_DELETED } = require('../utils/lmsTestHelpers');

const resolveRecording = async (referenceId) => {
  const lecture = await RecordedLecture.findOne({
    _id: referenceId,
    isDeleted: false,
    isPublished: true
  }).lean();

  if (!lecture) return null;

  return {
    courseId: lecture.courseId,
    title: lecture.lectureTitle,
    thumbnail: lecture.thumbnail?.url ? lecture.thumbnail : {},
    metadata: {
      subjectId: lecture.subjectId,
      durationSeconds: lecture.video?.duration ?? null,
      isPreviewFree: lecture.isPreviewFree ?? false
    }
  };
};

const resolveTest = async (referenceId) => {
  const test = await LmsTest.findOne({
    _id: referenceId,
    ...NOT_DELETED,
    isPublished: true
  }).lean();

  if (!test) return null;

  let categorySlug = null;
  let categoryTitle = null;
  if (test.categoryId) {
    const category = await LmsTestCategory.findById(test.categoryId).lean();
    categorySlug = category?.slug ?? null;
    categoryTitle = category?.title ?? null;
  }

  return {
    courseId: test.courseId,
    title: test.title,
    thumbnail: {},
    metadata: {
      categoryId: test.categoryId,
      categorySlug,
      categoryTitle,
      durationInMinutes: test.durationInMinutes,
      totalQuestions: test.totalQuestions,
      passMarks: test.passMarks
    }
  };
};

exports.toggleBookmark = async (req, res) => {
  try {
    const { bookmarkType, referenceId } = req.body;

    if (!bookmarkType || !referenceId) {
      return res.status(400).json({
        success: false,
        message: 'bookmarkType and referenceId are required'
      });
    }

    let resolved = null;

    if (bookmarkType === 'recording') {
      resolved = await resolveRecording(referenceId);
      if (!resolved) {
        return res.status(404).json({ success: false, message: 'Lecture not found' });
      }
    } else if (bookmarkType === 'test') {
      resolved = await resolveTest(referenceId);
      if (!resolved) {
        return res.status(404).json({ success: false, message: 'Test not found' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid bookmark type' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, resolved.courseId);
    if (!enrollment) return;

    const existing = await LmsBookmark.findOne({
      userId: req.user._id,
      bookmarkType,
      referenceId
    });

    if (existing) {
      await LmsBookmark.deleteOne({ _id: existing._id });
      return res.json({
        success: true,
        bookmarked: false,
        message: 'Bookmark removed'
      });
    }

    const bookmark = await LmsBookmark.create({
      userId: req.user._id,
      courseId: resolved.courseId,
      bookmarkType,
      referenceId,
      title: resolved.title,
      thumbnail: resolved.thumbnail,
      metadata: resolved.metadata
    });

    res.status(201).json({
      success: true,
      bookmarked: true,
      message: 'Bookmarked successfully',
      data: bookmark
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Bookmark already exists'
      });
    }
    console.error('Toggle bookmark error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getAllBookmarks = async (req, res) => {
  try {
    const bookmarks = await LmsBookmark.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: bookmarks.length,
      data: bookmarks
    });
  } catch (error) {
    console.error('Get all bookmarks error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getRecordingBookmarks = async (req, res) => {
  try {
    const bookmarks = await LmsBookmark.find({
      userId: req.user._id,
      bookmarkType: 'recording'
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: bookmarks.length,
      data: bookmarks
    });
  } catch (error) {
    console.error('Get recording bookmarks error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTestBookmarks = async (req, res) => {
  try {
    const bookmarks = await LmsBookmark.find({
      userId: req.user._id,
      bookmarkType: 'test'
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: bookmarks.length,
      data: bookmarks
    });
  } catch (error) {
    console.error('Get test bookmarks error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getBookmarkStatus = async (req, res) => {
  try {
    const { bookmarkType, referenceId } = req.query;

    if (!bookmarkType || !referenceId) {
      return res.status(400).json({
        success: false,
        message: 'bookmarkType and referenceId query params are required'
      });
    }

    const bookmark = await LmsBookmark.findOne({
      userId: req.user._id,
      bookmarkType,
      referenceId
    }).lean();

    res.json({
      success: true,
      bookmarked: Boolean(bookmark),
      bookmarkId: bookmark?._id ?? null
    });
  } catch (error) {
    console.error('Get bookmark status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/lmsTestAttemptController.js`

```javascript
const LmsTestAttempt = require('../models/LmsTestAttempt');
const LmsTest = require('../models/LmsTest');
const { formatQuestionForReview, NOT_DELETED } = require('../utils/lmsTestHelpers');
const { getPagination, paginatedResponse } = require('../utils/pagination');

exports.getAttemptResult = async (req, res) => {
  try {
    const attempt = await LmsTestAttempt.findById(req.params.attemptId).lean();

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (String(attempt.userId) !== String(req.user._id)) {
      const isAdmin = ['super_admin', 'center_admin', 'employee'].includes(req.user.role);
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    if (attempt.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Test not submitted yet'
      });
    }

    const test = await LmsTest.findOne({ _id: attempt.testId, ...NOT_DELETED }).lean();

    const snapshot = attempt.questionSnapshot || [];
    const answerMap = new Map(
      (attempt.answers || []).map((a) => [String(a.questionId), a])
    );

    res.json({
      success: true,
      data: {
        attempt: {
          _id: attempt._id,
          testId: attempt.testId,
          courseId: attempt.courseId,
          score: attempt.obtainedMarks,
          percentage: attempt.percentage,
          correctAnswers: attempt.correctAnswers,
          wrongAnswers: attempt.wrongAnswers,
          unanswered: attempt.unanswered,
          obtainedMarks: attempt.obtainedMarks,
          totalMarks: attempt.totalMarks,
          isPassed: attempt.isPassed,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          timeTakenInSeconds: attempt.timeTakenInSeconds
        },
        test: test
          ? {
              _id: test._id,
              title: test.title,
              durationInMinutes: test.durationInMinutes,
              passMarks: test.passMarks
            }
          : { title: 'Test (removed)' },
        questions: snapshot.map((snap) =>
          formatQuestionForReview(snap, answerMap.get(String(snap.questionId)))
        )
      }
    });
  } catch (error) {
    console.error('Get LMS test attempt error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getMyAttempts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, 20, 50);

    const filter = { userId: req.user._id, status: 'submitted' };
    if (req.query.courseId) filter.courseId = req.query.courseId;
    if (req.query.testId) filter.testId = req.query.testId;

    const [attempts, total] = await Promise.all([
      LmsTestAttempt.find(filter)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('testId', 'title categoryId durationInMinutes')
        .lean(),
      LmsTestAttempt.countDocuments(filter)
    ]);

    res.json(paginatedResponse(attempts, total, page, limit));
  } catch (error) {
    console.error('Get my LMS attempts error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/lmsTestCategoryController.js`

```javascript
const LmsTestCategory = require('../models/LmsTestCategory');
const LmsTest = require('../models/LmsTest');
const { NOT_DELETED } = require('../utils/lmsTestHelpers');
const { PERIOD_SLUGS, slugFromCategoryTitle } = require('../utils/categorySlugFromTitle');

const CORE_SLUGS = PERIOD_SLUGS;

exports.getCategories = async (req, res) => {
  try {
    const categories = await LmsTestCategory.find().sort({ slug: 1 }).lean();

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Get LMS test categories error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const nextSlug = slugFromCategoryTitle(title);
    if (!nextSlug) {
      return res.status(400).json({
        success: false,
        message: 'title must include daily, weekly, or monthly'
      });
    }

    const category = await LmsTestCategory.create({ title: title.trim(), slug: nextSlug });

    res.status(201).json({
      success: true,
      message: 'Test category created',
      data: category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category slug already exists' });
    }
    console.error('Create LMS test category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await LmsTestCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { title } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const nextSlug = slugFromCategoryTitle(title);
    if (!nextSlug) {
      return res.status(400).json({
        success: false,
        message: 'title must include daily, weekly, or monthly'
      });
    }

    if (category.slug !== nextSlug) {
      const inUse = await LmsTest.countDocuments({
        categoryId: category._id,
        ...NOT_DELETED
      });
      if (inUse > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change category period while tests use this category'
        });
      }
      category.slug = nextSlug;
    }

    category.title = title.trim();
    await category.save();

    res.json({
      success: true,
      message: 'Category updated',
      data: category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category slug already exists' });
    }
    console.error('Update LMS test category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await LmsTestCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (CORE_SLUGS.includes(category.slug)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete core categories (weekly, daily, monthly). Update title only.'
      });
    }

    const testsCount = await LmsTest.countDocuments({
      categoryId: category._id,
      ...NOT_DELETED
    });

    if (testsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${testsCount} test(s) still use it`
      });
    }

    await LmsTestCategory.deleteOne({ _id: category._id });

    res.json({
      success: true,
      message: 'Category deleted'
    });
  } catch (error) {
    console.error('Delete LMS test category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/lmsTestController.js`

```javascript
const LmsTest = require('../models/LmsTest');
const LmsTestCategory = require('../models/LmsTestCategory');
const LmsTestQuestion = require('../models/LmsTestQuestion');
const LmsTestAttempt = require('../models/LmsTestAttempt');
const { assertEnrollmentAccess, getCourseForAdmin } = require('../utils/courseAccess');
const { sanitizeOptionalText } = require('../utils/sanitizeText');
const {
  NOT_DELETED,
  sanitizeQuestionForAttempt,
  isTestWithinSchedule,
  scoreAnswers,
  buildQuestionSnapshot,
  syncTestTotals
} = require('../utils/lmsTestHelpers');

const findActiveTest = async (id) => LmsTest.findOne({ _id: id, ...NOT_DELETED });

const formatTestListItem = (test) => ({
  _id: test._id,
  courseId: test.courseId,
  categoryId: test.categoryId,
  title: test.title,
  durationInMinutes: test.durationInMinutes,
  totalQuestions: test.totalQuestions,
  totalMarks: test.totalMarks,
  passMarks: test.passMarks,
  maxAttempts: test.maxAttempts,
  startDateTime: test.startDateTime,
  endDateTime: test.endDateTime,
  isPublished: test.isPublished
});

const formatTestResponse = (test) => {
  const doc = test?.toObject ? test.toObject() : { ...test };
  return {
    _id: doc._id,
    courseId: doc.courseId,
    categoryId: doc.categoryId,
    title: doc.title,
    durationInMinutes: doc.durationInMinutes,
    totalQuestions: doc.totalQuestions,
    totalMarks: doc.totalMarks,
    passMarks: doc.passMarks,
    negativeMarkPerWrongAnswer: doc.negativeMarkPerWrongAnswer,
    maxAttempts: doc.maxAttempts,
    shuffleQuestions: doc.shuffleQuestions,
    shuffleOptions: doc.shuffleOptions,
    instructions: doc.instructions,
    startDateTime: doc.startDateTime,
    endDateTime: doc.endDateTime,
    isPublished: doc.isPublished,
    isDeleted: doc.isDeleted,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

exports.createTest = async (req, res) => {
  try {
    const {
      courseId,
      categoryId,
      title,
      durationInMinutes,
      passMarks,
      negativeMarkPerWrongAnswer,
      maxAttempts,
      shuffleQuestions,
      shuffleOptions,
      instructions,
      startDateTime,
      endDateTime,
      isPublished
    } = req.body;

    if (!courseId || !categoryId || !title || !durationInMinutes) {
      return res.status(400).json({
        success: false,
        message: 'courseId, categoryId, title, and durationInMinutes are required'
      });
    }

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const category = await LmsTestCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Test category not found' });
    }

    const test = await LmsTest.create({
      courseId,
      categoryId,
      title,
      durationInMinutes,
      passMarks,
      negativeMarkPerWrongAnswer,
      maxAttempts: maxAttempts ?? 1,
      shuffleQuestions: shuffleQuestions ?? false,
      shuffleOptions: shuffleOptions ?? false,
      instructions: sanitizeOptionalText(instructions) || '',
      startDateTime,
      endDateTime,
      isPublished: isPublished ?? false,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Test created',
      data: formatTestResponse(test)
    });
  } catch (error) {
    console.error('Create LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    const updates = { ...req.body };
    delete updates.courseId;
    delete updates.createdBy;
    delete updates.subjectId;
    delete updates.description;
    if (updates.instructions) updates.instructions = sanitizeOptionalText(updates.instructions);

    const updated = await LmsTest.findByIdAndUpdate(test._id, updates, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      message: 'Test updated',
      data: formatTestResponse(updated)
    });
  } catch (error) {
    console.error('Update LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    test.isDeleted = true;
    test.isPublished = false;
    await test.save();

    await LmsTestQuestion.updateMany({ testId: test._id }, { $set: { isDeleted: true } });

    res.json({
      success: true,
      message: 'Test deleted (soft). Questions soft-deleted. Attempts preserved for audit.'
    });
  } catch (error) {
    console.error('Delete LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.publishTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    const totals = await syncTestTotals(test._id);
    if (totals.totalQuestions < 1) {
      return res.status(400).json({
        success: false,
        message: 'Add at least one question before publishing'
      });
    }

    test.isPublished = true;
    await test.save();

    const refreshed = await findActiveTest(test._id);

    res.json({
      success: true,
      message: 'Test published',
      data: formatTestResponse(refreshed || test),
      testTotals: totals
    });
  } catch (error) {
    console.error('Publish LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTestsByCourseAndCategory = async (req, res) => {
  try {
    const { courseId, categoryId } = req.params;

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const tests = await LmsTest.find({
      courseId,
      categoryId,
      isPublished: true,
      ...NOT_DELETED
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: tests.length,
      data: tests.map(formatTestListItem)
    });
  } catch (error) {
    console.error('Get LMS tests by category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTestsByCourseAndCategoryAdmin = async (req, res) => {
  try {
    const { courseId, categoryId } = req.params;

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const tests = await LmsTest.find({ courseId, categoryId, ...NOT_DELETED })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: tests.length,
      data: tests.map(formatTestResponse)
    });
  } catch (error) {
    console.error('Admin get LMS tests error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.startTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.id);
    if (!test || !test.isPublished) {
      return res.status(404).json({ success: false, message: 'Test not found or not published' });
    }

    const schedule = isTestWithinSchedule(test);
    if (!schedule.ok) {
      return res.status(403).json({ success: false, message: schedule.message });
    }

    const enrollment = await assertEnrollmentAccess(req, res, test.courseId);
    if (!enrollment) return;

    const submittedCount = await LmsTestAttempt.countDocuments({
      userId: req.user._id,
      testId: test._id,
      status: 'submitted'
    });

    if (submittedCount >= (test.maxAttempts || 1)) {
      return res.status(400).json({
        success: false,
        message: `Maximum attempts (${test.maxAttempts}) reached for this test`
      });
    }

    let attempt = await LmsTestAttempt.findOne({
      userId: req.user._id,
      testId: test._id,
      status: 'in_progress'
    });

    if (attempt?.questionSnapshot?.length) {
      return res.json({
        success: true,
        attemptId: attempt._id,
        startedAt: attempt.startedAt,
        durationInMinutes: test.durationInMinutes,
        test: formatTestListItem(test),
        questions: attempt.questionSnapshot.map(sanitizeQuestionForAttempt)
      });
    }

    const questions = await LmsTestQuestion.find({ testId: test._id, ...NOT_DELETED })
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    if (!questions.length) {
      return res.status(400).json({ success: false, message: 'Test has no questions yet' });
    }

    const snapshot = buildQuestionSnapshot(questions, test);

    if (!attempt) {
      attempt = await LmsTestAttempt.create({
        userId: req.user._id,
        courseId: test.courseId,
        testId: test._id,
        questionSnapshot: snapshot,
        answers: [],
        startedAt: new Date(),
        status: 'in_progress'
      });
    } else {
      attempt.questionSnapshot = snapshot;
      await attempt.save();
    }

    res.json({
      success: true,
      attemptId: attempt._id,
      startedAt: attempt.startedAt,
      durationInMinutes: test.durationInMinutes,
      test: formatTestListItem(test),
      questions: snapshot.map(sanitizeQuestionForAttempt)
    });
  } catch (error) {
    console.error('Start LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.submitTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.id);
    if (!test || !test.isPublished) {
      return res.status(404).json({ success: false, message: 'Test not found or not published' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, test.courseId);
    if (!enrollment) return;

    const attempt = await LmsTestAttempt.findOne({
      userId: req.user._id,
      testId: test._id,
      status: 'in_progress'
    });

    if (!attempt) {
      return res.status(400).json({
        success: false,
        message: 'No active attempt found. Call GET /api/tests/:id/start first'
      });
    }

    if (!attempt.questionSnapshot?.length) {
      return res.status(400).json({
        success: false,
        message: 'Attempt has no question snapshot. Restart the test.'
      });
    }

    const now = new Date();
    const allowedSeconds = test.durationInMinutes * 60;
    const elapsed = Math.floor((now - attempt.startedAt) / 1000);

    if (elapsed > allowedSeconds + 30) {
      return res.status(400).json({
        success: false,
        message: 'Time limit exceeded. Test auto-closed.',
        allowedSeconds
      });
    }

    const result = scoreAnswers(attempt.questionSnapshot, req.body.answers, test);

    attempt.answers = result.gradedAnswers;
    attempt.totalQuestions = result.totalQuestions;
    attempt.correctAnswers = result.correctAnswers;
    attempt.wrongAnswers = result.wrongAnswers;
    attempt.unanswered = result.unanswered;
    attempt.obtainedMarks = result.obtainedMarks;
    attempt.totalMarks = result.totalMarks;
    attempt.percentage = result.percentage;
    attempt.isPassed = result.isPassed;
    attempt.submittedAt = now;
    attempt.timeTakenInSeconds = elapsed;
    attempt.status = 'submitted';
    await attempt.save();

    res.json({
      success: true,
      attemptId: attempt._id,
      score: result.score,
      percentage: result.percentage,
      correctAnswers: result.correctAnswers,
      wrongAnswers: result.wrongAnswers,
      unanswered: result.unanswered,
      obtainedMarks: result.obtainedMarks,
      totalMarks: result.totalMarks,
      isPassed: result.isPassed,
      timeTakenInSeconds: elapsed
    });
  } catch (error) {
    console.error('Submit LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/lmsTestQuestionController.js`

```javascript
const LmsTest = require('../models/LmsTest');
const LmsTestQuestion = require('../models/LmsTestQuestion');
const { getCourseForAdmin } = require('../utils/courseAccess');
const { NOT_DELETED, syncTestTotals } = require('../utils/lmsTestHelpers');
const { sanitizeText, sanitizeOptionalText } = require('../utils/sanitizeText');

const QUESTION_SORT = { createdAt: 1, _id: 1 };

const findActiveTest = async (testId) =>
  LmsTest.findOne({ _id: testId, ...NOT_DELETED });

const parseOptions = (options) => {
  const optionList = Array.isArray(options) ? options : JSON.parse(options);
  if (optionList.length !== 4) {
    return { error: 'Exactly 4 options are required' };
  }
  return { optionList: optionList.map((o) => sanitizeText(o)) };
};

const normalizeQuestionInput = (raw, indexLabel = '') => {
  const prefix = indexLabel ? `${indexLabel}: ` : '';

  if (!raw.question || raw.options === undefined || raw.correctAnswer === undefined) {
    return {
      error: `${prefix}question, options, and correctAnswer are required`
    };
  }

  const parsed = parseOptions(raw.options);
  if (parsed.error) {
    return { error: `${prefix}${parsed.error}` };
  }

  const correctIdx = Number(raw.correctAnswer);
  if (correctIdx < 0 || correctIdx >= 4) {
    return {
      error: `${prefix}correctAnswer must be between 0 and 3`
    };
  }

  return {
    data: {
      question: sanitizeText(raw.question),
      options: parsed.optionList,
      correctAnswer: correctIdx,
      explanation: sanitizeOptionalText(raw.explanation) || '',
      marks: raw.marks ?? 1,
      negativeMarks: raw.negativeMarks ?? 0,
      questionImage: raw.questionImage || undefined
    }
  };
};

const assertTestAccess = async (req, res, testId) => {
  const test = await findActiveTest(testId);
  if (!test) {
    res.status(404).json({ success: false, message: 'Test not found' });
    return null;
  }
  const course = await getCourseForAdmin(req, res, test.courseId);
  if (!course) return null;
  return test;
};

exports.createQuestion = async (req, res) => {
  try {
    const { testId } = req.body;
    if (!testId) {
      return res.status(400).json({ success: false, message: 'testId is required' });
    }

    const test = await assertTestAccess(req, res, testId);
    if (!test) return;

    const normalized = normalizeQuestionInput(req.body);
    if (normalized.error) {
      return res.status(400).json({ success: false, message: normalized.error });
    }

    const doc = await LmsTestQuestion.create({
      testId,
      ...normalized.data
    });

    const totals = await syncTestTotals(testId);

    res.status(201).json({
      success: true,
      message: 'Question added',
      data: doc,
      testTotals: totals
    });
  } catch (error) {
    console.error('Create LMS test question error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createQuestionsBulk = async (req, res) => {
  try {
    const { testId, questions } = req.body;

    if (!testId) {
      return res.status(400).json({ success: false, message: 'testId is required' });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'questions must be a non-empty array'
      });
    }

    const test = await assertTestAccess(req, res, testId);
    if (!test) return;

    const docsToInsert = [];
    for (let i = 0; i < questions.length; i += 1) {
      const normalized = normalizeQuestionInput(questions[i], `questions[${i}]`);
      if (normalized.error) {
        return res.status(400).json({ success: false, message: normalized.error });
      }
      docsToInsert.push({ testId, ...normalized.data });
    }

    const created = await LmsTestQuestion.insertMany(docsToInsert);
    const totals = await syncTestTotals(testId);

    res.status(201).json({
      success: true,
      message: `${created.length} question(s) added`,
      count: created.length,
      data: created,
      testTotals: totals
    });
  } catch (error) {
    console.error('Bulk create LMS test questions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getQuestionsByTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    const questions = await LmsTestQuestion.find({ testId: test._id, ...NOT_DELETED })
      .sort(QUESTION_SORT)
      .lean();

    res.json({
      success: true,
      count: questions.length,
      data: questions
    });
  } catch (error) {
    console.error('Get LMS test questions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const QUESTION_UPDATE_FIELDS = [
  'question',
  'options',
  'correctAnswer',
  'explanation',
  'marks',
  'negativeMarks',
  'questionImage'
];

exports.updateQuestion = async (req, res) => {
  try {
    const question = await LmsTestQuestion.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const test = await findActiveTest(question.testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    const updates = {};
    for (const key of QUESTION_UPDATE_FIELDS) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          'Provide at least one field to update: question, options, correctAnswer, explanation, marks, negativeMarks, questionImage'
      });
    }

    if (updates.question) updates.question = sanitizeText(updates.question);
    if (updates.explanation !== undefined) {
      updates.explanation = sanitizeOptionalText(updates.explanation) || '';
    }

    if (updates.options !== undefined) {
      const parsed = parseOptions(updates.options);
      if (parsed.error) {
        return res.status(400).json({ success: false, message: parsed.error });
      }
      updates.options = parsed.optionList;
    }

    const optionCount = updates.options ? updates.options.length : question.options.length;
    if (updates.correctAnswer !== undefined) {
      const correctIdx = Number(updates.correctAnswer);
      if (correctIdx < 0 || correctIdx >= optionCount) {
        return res.status(400).json({
          success: false,
          message: `correctAnswer must be between 0 and ${optionCount - 1}`
        });
      }
      updates.correctAnswer = correctIdx;
    } else if (updates.options) {
      if (question.correctAnswer >= updates.options.length) {
        return res.status(400).json({
          success: false,
          message: 'Update correctAnswer when changing options'
        });
      }
    }

    const updated = await LmsTestQuestion.findByIdAndUpdate(question._id, updates, {
      new: true,
      runValidators: true
    });

    const totals = await syncTestTotals(question.testId);

    res.json({
      success: true,
      message: 'Question updated',
      data: updated,
      testTotals: totals
    });
  } catch (error) {
    console.error('Update LMS test question error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await LmsTestQuestion.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const test = await findActiveTest(question.testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    await LmsTestQuestion.deleteOne({ _id: question._id });

    const totals = await syncTestTotals(question.testId);

    res.json({
      success: true,
      message: 'Question deleted',
      testTotals: totals
    });
  } catch (error) {
    console.error('Delete LMS test question error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/recordedLectureController.js`

```javascript
const RecordedLecture = require('../models/RecordedLecture');
const CourseSubject = require('../models/CourseSubject');
const Course = require('../models/Course');
const LectureProgress = require('../models/LectureProgress');
const LectureNote = require('../models/LectureNote');
const LectureQuizAttempt = require('../models/LectureQuizAttempt');
const LectureAnswer = require('../models/LectureAnswer');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const {
  assertEnrollmentAccess,
  getCourseForAdmin,
  parseJsonField
} = require('../utils/courseAccess');
const {
  NOT_DELETED,
  sanitizeLectureForStudent,
  validateTopicQuiz,
  deleteFromCloudinary,
  cleanupUploads,
  getVideoDurationFromUpload,
  formatLecture,
  formatLectures,
  withLectureTitles,
  withLectureTitlesList
} = require('../utils/lectureHelpers');

const getLectureTitleContext = async (subjectId, courseDoc = null) => {
  const subject = await CourseSubject.findOne({ _id: subjectId, ...NOT_DELETED }).lean();
  if (!subject) return null;

  let courseTitle = courseDoc?.title;
  if (!courseTitle) {
    const course = await Course.findById(subject.courseId).select('title').lean();
    courseTitle = course?.title ?? '';
  }

  return {
    courseId: subject.courseId,
    courseTitle,
    subjectId: subject._id,
    subjectTitle: subject.title
  };
};

const getNextLectureOrder = async (subjectId) => {
  const last = await RecordedLecture.findOne({ subjectId, ...NOT_DELETED })
    .sort({ order: -1 })
    .select('order')
    .lean();
  return (last?.order ?? -1) + 1;
};

const uploadLectureFiles = async (files) => {
  const uploads = {};

  if (files?.thumbnail?.[0]) {
    uploads.thumbnail = await uploadToCloudinary(
      files.thumbnail[0],
      'courses/recorded/thumbnails',
      'image'
    );
  }

  if (files?.video?.[0]) {
    uploads.video = await uploadToCloudinary(
      files.video[0],
      'courses/recorded/videos',
      'video'
    );
  }

  if (files?.cheatSheetPdf?.[0]) {
    uploads.cheatSheetPdf = await uploadToCloudinary(
      files.cheatSheetPdf[0],
      'courses/recorded/cheat-sheets',
      'raw',
      'pdf'
    );
  }

  return uploads;
};

const applyPublishState = (lecture, isPublished) => {
  lecture.isPublished = isPublished;
  if (isPublished && !lecture.publishedAt) {
    lecture.publishedAt = new Date();
  }
};

exports.createLecture = async (req, res) => {
  let uploads = null;

  try {
    const {
      courseId,
      subjectId,
      lectureTitle,
      lectureDescription,
      isPublished
    } = req.body;

    if (!courseId || !subjectId || !lectureTitle) {
      return res.status(400).json({
        success: false,
        message: 'courseId, subjectId, and lectureTitle are required'
      });
    }

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const subject = await CourseSubject.findOne({ _id: subjectId, courseId, ...NOT_DELETED });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found for this course' });
    }

    const topicQuiz = parseJsonField(req.body.topicQuiz) || [];
    const quizError = validateTopicQuiz(topicQuiz);
    if (quizError) {
      return res.status(400).json({ success: false, message: quizError });
    }

    uploads = await uploadLectureFiles(req.files);
    const cheatSheet = parseJsonField(req.body.cheatSheet) || {};
    const mainsQuestion = parseJsonField(req.body.mainsQuestion) || {};

    if (uploads.cheatSheetPdf) {
      cheatSheet.pdf = {
        url: uploads.cheatSheetPdf.url,
        public_id: uploads.cheatSheetPdf.public_id
      };
    }

    const published = isPublished !== false && isPublished !== 'false';
    const nextOrder = await getNextLectureOrder(subjectId);

    const lecture = await RecordedLecture.create({
      courseId,
      subjectId,
      lectureTitle,
      lectureDescription,
      order: nextOrder,
      thumbnail: uploads.thumbnail || undefined,
      video: uploads.video
        ? {
            url: uploads.video.url,
            public_id: uploads.video.public_id,
            duration: getVideoDurationFromUpload(uploads.video)
          }
        : undefined,
      cheatSheet: Object.keys(cheatSheet).length ? cheatSheet : undefined,
      topicQuiz,
      mainsQuestion: Object.keys(mainsQuestion).length ? mainsQuestion : undefined,
      isPreviewFree: false,
      isPublished: published,
      publishedAt: published ? new Date() : null,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: withLectureTitles(lecture, {
        courseTitle: course.title,
        subjectTitle: subject.title
      })
    });
  } catch (error) {
    await cleanupUploads(uploads);
    console.error('Create Lecture Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLecturesBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { page, limit, skip } = getPagination(req.query);

    const titles = await getLectureTitleContext(subjectId);
    if (!titles) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, titles.courseId);
    if (!enrollment) return;

    const filter = { subjectId, isPublished: true, ...NOT_DELETED };
    const total = await RecordedLecture.countDocuments(filter);

    const lectures = await RecordedLecture.find(filter)
      .sort({ order: 1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

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

    const data = lectures.map((lecture) => {
      const progress = progressMap.get(lecture._id.toString());
      return {
        ...withLectureTitles(lecture, titles, { forStudent: true }),
        progressPercent: progress?.progressPercent ?? 0,
        isCompleted: progress?.isCompleted ?? false
      };
    });

    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    console.error('Get Lectures Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLecturesBySubjectAdmin = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const includeDeleted = req.query.includeDeleted === 'true';

    const subject = await CourseSubject.findById(subjectId);
    if (!subject || (!includeDeleted && subject.isDeleted)) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const course = await getCourseForAdmin(req, res, subject.courseId);
    if (!course) return;

    const filter = { subjectId };
    if (!includeDeleted) Object.assign(filter, NOT_DELETED);

    const lectures = await RecordedLecture.find(filter).sort({ order: 1, createdAt: 1 });
    const titles = {
      courseTitle: course.title,
      subjectTitle: subject.title
    };

    res.json({
      success: true,
      count: lectures.length,
      data: withLectureTitlesList(lectures, titles)
    });
  } catch (error) {
    console.error('Admin Get Lectures Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLectureById = async (req, res) => {
  try {
    const lecture = await RecordedLecture.findById(req.params.id);
    if (!lecture || lecture.isDeleted) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    if (!lecture.isPublished && !['super_admin', 'center_admin'].includes(req.user.role)) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const isAdmin = ['super_admin', 'center_admin'].includes(req.user.role);

    if (!isAdmin) {
      if (!lecture.isPreviewFree) {
        const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
        if (!enrollment) return;
      }

      const titles = await getLectureTitleContext(lecture.subjectId);
      return res.json({
        success: true,
        data: withLectureTitles(lecture, titles, { forStudent: true })
      });
    }

    const course = await getCourseForAdmin(req, res, lecture.courseId);
    if (!course) return;

    const titles = await getLectureTitleContext(lecture.subjectId, course);
    res.json({ success: true, data: withLectureTitles(lecture, titles) });
  } catch (error) {
    console.error('Get Lecture Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateLecture = async (req, res) => {
  let uploads = null;
  const oldAssets = { thumbnail: null, video: null, cheatSheetPdf: null };

  try {
    const lecture = await RecordedLecture.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const course = await getCourseForAdmin(req, res, lecture.courseId);
    if (!course) return;

    const topicQuiz = parseJsonField(req.body.topicQuiz);
    if (topicQuiz) {
      const quizError = validateTopicQuiz(topicQuiz);
      if (quizError) {
        return res.status(400).json({ success: false, message: quizError });
      }
      lecture.topicQuiz = topicQuiz;
    }

    uploads = await uploadLectureFiles(req.files);

    if (uploads.thumbnail) {
      oldAssets.thumbnail = lecture.thumbnail?.public_id;
      lecture.thumbnail = uploads.thumbnail;
    }

    if (uploads.video) {
      oldAssets.video = lecture.video?.public_id;
      lecture.video = {
        url: uploads.video.url,
        public_id: uploads.video.public_id,
        duration: getVideoDurationFromUpload(uploads.video) || lecture.video?.duration || 0
      };
    }

    const cheatSheet = parseJsonField(req.body.cheatSheet);
    if (cheatSheet) {
      if (uploads.cheatSheetPdf) {
        oldAssets.cheatSheetPdf = lecture.cheatSheet?.pdf?.public_id;
        cheatSheet.pdf = {
          url: uploads.cheatSheetPdf.url,
          public_id: uploads.cheatSheetPdf.public_id
        };
      }
      lecture.cheatSheet = cheatSheet;
    } else if (uploads.cheatSheetPdf) {
      oldAssets.cheatSheetPdf = lecture.cheatSheet?.pdf?.public_id;
      lecture.cheatSheet = {
        ...(lecture.cheatSheet?.toObject?.() || lecture.cheatSheet || {}),
        pdf: {
          url: uploads.cheatSheetPdf.url,
          public_id: uploads.cheatSheetPdf.public_id
        }
      };
    }

    const mainsQuestion = parseJsonField(req.body.mainsQuestion);
    if (mainsQuestion) lecture.mainsQuestion = mainsQuestion;

    const fields = ['lectureTitle', 'lectureDescription', 'subjectId'];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        lecture[field] = req.body[field];
      }
    }

    if (req.body.isPublished !== undefined) {
      const published = req.body.isPublished === true || req.body.isPublished === 'true';
      applyPublishState(lecture, published);
    }

    await lecture.save();

    if (oldAssets.thumbnail) await deleteFromCloudinary(oldAssets.thumbnail, 'image');
    if (oldAssets.video) await deleteFromCloudinary(oldAssets.video, 'video');
    if (oldAssets.cheatSheetPdf) await deleteFromCloudinary(oldAssets.cheatSheetPdf, 'raw');

    const subject = await CourseSubject.findOne({ _id: lecture.subjectId, ...NOT_DELETED }).lean();
    res.json({
      success: true,
      data: withLectureTitles(lecture, {
        courseTitle: course.title,
        subjectTitle: subject?.title ?? ''
      })
    });
  } catch (error) {
    await cleanupUploads(uploads);
    console.error('Update Lecture Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteLecture = async (req, res) => {
  try {
    const lecture = await RecordedLecture.findById(req.params.id);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const course = await getCourseForAdmin(req, res, lecture.courseId);
    if (!course) return;

    const lectureId = lecture._id;

    await Promise.all([
      deleteFromCloudinary(lecture.thumbnail?.public_id, 'image'),
      deleteFromCloudinary(lecture.video?.public_id, 'video'),
      deleteFromCloudinary(lecture.cheatSheet?.pdf?.public_id, 'raw'),
      LectureNote.deleteMany({ lectureId }),
      LectureProgress.deleteMany({ lectureId }),
      LectureQuizAttempt.deleteMany({ lectureId }),
      LectureAnswer.deleteMany({ lectureId })
    ]);

    await RecordedLecture.deleteOne({ _id: lectureId });

    res.json({
      success: true,
      message: 'Lecture and related data permanently deleted'
    });
  } catch (error) {
    console.error('Delete Lecture Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.reorderLectures = async (req, res) => {
  try {
    const { subjectId, items } = req.body;

    if (!subjectId || !Array.isArray(items) || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'subjectId and items array are required'
      });
    }

    const subject = await CourseSubject.findOne({ _id: subjectId, ...NOT_DELETED });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const course = await getCourseForAdmin(req, res, subject.courseId);
    if (!course) return;

    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: item.id, subjectId, ...NOT_DELETED },
        update: { $set: { order: item.order } }
      }
    }));

    await RecordedLecture.bulkWrite(bulkOps);

    const lectures = await RecordedLecture.find({ subjectId, ...NOT_DELETED })
      .sort({ order: 1, createdAt: 1 });

    res.json({
      success: true,
      data: withLectureTitlesList(lectures, {
        courseTitle: course.title,
        subjectTitle: subject.title
      })
    });
  } catch (error) {
    console.error('Reorder Lectures Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `controllers/studentAttendanceController.js`

```javascript
const StudentAttendance = require('../models/StudentAttendance');
const {
  startOfDay,
  getMonthRange,
  getPrimaryEnrollment,
  resolveTargetStudentId,
  assertCanViewStudentAttendance,
  formatTimeLabel
} = require('../utils/attendanceAccess');

const ATTENDED_STATUSES = ['present', 'half_day'];
const MISSED_STATUSES = ['absent', 'leave'];

const buildStats = (records) => {
  let classesAttended = 0;
  let classesMissed = 0;

  for (const row of records) {
    if (ATTENDED_STATUSES.includes(row.attendanceStatus)) classesAttended += 1;
    if (MISSED_STATUSES.includes(row.attendanceStatus)) classesMissed += 1;
  }

  const totalClasses = records.length;
  const attendancePercentage =
    totalClasses > 0 ? Math.round((classesAttended / totalClasses) * 100) : 0;

  return {
    attendancePercentage,
    classesAttended,
    classesMissed,
    totalClasses
  };
};

const getStudentUserId = (req) => req.user?._id || req.user?.id;

const getEnrollmentContext = async (req, res, courseId = null) => {
  const studentUserId = getStudentUserId(req);
  if (!studentUserId) {
    res.status(401).json({ success: false, message: 'Authenticated user id not found' });
    return null;
  }

  const enrollment = await getPrimaryEnrollment(studentUserId, courseId);
  if (!enrollment) {
    res.status(403).json({
      success: false,
      message: 'No active course enrollment found for attendance'
    });
    return null;
  }
  return enrollment;
};

exports.checkIn = async (req, res) => {
  try {
    const today = startOfDay();
    const { courseId } = req.body || {};

    const enrollment = await getEnrollmentContext(req, res, courseId || null);
    if (!enrollment) return;

    const studentUserId = getStudentUserId(req);

    let attendance = await StudentAttendance.findOne({
      studentId: studentUserId,
      attendanceDate: today
    });

    if (attendance?.isCheckInDone) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in today'
      });
    }

    if (attendance?.attendanceStatus === 'leave') {
      return res.status(400).json({
        success: false,
        message: 'Leave already applied for today'
      });
    }

    if (!attendance) {
      attendance = await StudentAttendance.create({
        studentId: studentUserId,
        courseId: enrollment.courseId,
        centerId: enrollment.centerId,
        attendanceDate: today,
        checkInTime: new Date(),
        isCheckInDone: true,
        attendanceStatus: 'present'
      });
    } else {
      attendance.checkInTime = new Date();
      attendance.isCheckInDone = true;
      attendance.attendanceStatus = 'present';
      await attendance.save();
    }

    res.json({
      success: true,
      message: 'Check-In successful',
      data: attendance
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Attendance already exists for today' });
    }
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const today = startOfDay();

    const studentUserId = getStudentUserId(req);

    const attendance = await StudentAttendance.findOne({
      studentId: studentUserId,
      attendanceDate: today
    });

    if (!attendance || !attendance.isCheckInDone) {
      return res.status(404).json({
        success: false,
        message: 'Check-In first'
      });
    }

    if (attendance.isCheckOutDone) {
      return res.status(400).json({
        success: false,
        message: 'Already checked out'
      });
    }

    attendance.checkOutTime = new Date();
    attendance.isCheckOutDone = true;

    if (attendance.checkInTime) {
      const durationMs = attendance.checkOutTime - attendance.checkInTime;
      attendance.totalDurationInMinutes = Math.max(0, Math.floor(durationMs / 1000 / 60));
    }

    await attendance.save();

    res.json({
      success: true,
      message: 'Check-Out successful',
      data: attendance
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.applyLeave = async (req, res) => {
  try {
    const today = startOfDay();
    const reason = (req.body?.reason || '').trim();

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Leave reason is required'
      });
    }

    const enrollment = await getEnrollmentContext(req, res, req.body?.courseId || null);
    if (!enrollment) return;

    const studentUserId = getStudentUserId(req);

    const existing = await StudentAttendance.findOne({
      studentId: studentUserId,
      attendanceDate: today
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already exists for today'
      });
    }

    const attendance = await StudentAttendance.create({
      studentId: studentUserId,
      courseId: enrollment.courseId,
      centerId: enrollment.centerId,
      attendanceDate: today,
      attendanceStatus: 'leave',
      leaveReason: reason
    });

    res.status(201).json({
      success: true,
      message: 'Leave applied successfully',
      data: attendance
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Attendance already exists for today' });
    }
    console.error('Apply leave error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getAttendanceStats = async (req, res) => {
  try {
    const resolved = await resolveTargetStudentId(req);
    if (typeof resolved !== 'string') {
      return res.status(400).json({
        success: false,
        message: resolved?.error || 'Invalid studentId'
      });
    }

    const allowed = await assertCanViewStudentAttendance(req, res, resolved);
    if (!allowed) return;

    const allRecords = await StudentAttendance.find({ studentId: resolved })
      .sort({ attendanceDate: -1 })
      .lean();

    const overall = buildStats(allRecords);

    const now = new Date();
    const { start, end } = getMonthRange(
      Number(req.query.year) || now.getFullYear(),
      Number(req.query.month) || now.getMonth() + 1
    );

    const monthRecords = allRecords.filter((r) => {
      const d = new Date(r.attendanceDate);
      return d >= start && d <= end;
    });

    const monthStats = buildStats(monthRecords);

    res.json({
      success: true,
      data: {
        ...overall,
        currentMonthPercentage: monthStats.attendancePercentage,
        currentMonthAttended: monthStats.classesAttended,
        currentMonthMissed: monthStats.classesMissed,
        currentMonthTotal: monthStats.totalClasses
      }
    });
  } catch (error) {
    console.error('Attendance stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getAttendanceList = async (req, res) => {
  try {
    const resolved = await resolveTargetStudentId(req);
    if (typeof resolved !== 'string') {
      return res.status(400).json({
        success: false,
        message: resolved?.error || 'Invalid studentId'
      });
    }

    const allowed = await assertCanViewStudentAttendance(req, res, resolved);
    if (!allowed) return;

    const filter = { studentId: resolved };

    if (req.query.month && req.query.year) {
      const { start, end } = getMonthRange(Number(req.query.year), Number(req.query.month));
      filter.attendanceDate = { $gte: start, $lte: end };
    }

    const records = await StudentAttendance.find(filter)
      .sort({ attendanceDate: -1 })
      .lean();

    const data = records.map((row) => ({
      _id: row._id,
      date: row.attendanceDate.toISOString().slice(0, 10),
      attendanceStatus: row.attendanceStatus,
      checkInTime: formatTimeLabel(row.checkInTime),
      checkOutTime: formatTimeLabel(row.checkOutTime),
      reason:
        row.attendanceStatus === 'leave'
          ? row.leaveReason || '-'
          : row.attendanceStatus === 'absent'
            ? row.notes || 'Absent'
            : '-',
      totalDurationInMinutes: row.totalDurationInMinutes,
      isCheckInDone: row.isCheckInDone,
      isCheckOutDone: row.isCheckOutDone
    }));

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Attendance list error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTodayStatus = async (req, res) => {
  try {
    const resolved = await resolveTargetStudentId(req);
    if (typeof resolved !== 'string') {
      return res.status(400).json({
        success: false,
        message: resolved?.error || 'Invalid studentId'
      });
    }

    const allowed = await assertCanViewStudentAttendance(req, res, resolved);
    if (!allowed) return;

    const today = startOfDay();
    const attendance = await StudentAttendance.findOne({
      studentId: resolved,
      attendanceDate: today
    }).lean();

    res.json({
      success: true,
      data: {
        hasAttendance: Boolean(attendance),
        isCheckInDone: attendance?.isCheckInDone ?? false,
        isCheckOutDone: attendance?.isCheckOutDone ?? false,
        attendanceStatus: attendance?.attendanceStatus ?? null,
        attendance
      }
    });
  } catch (error) {
    console.error('Today attendance status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### `models/AnswerWritingCategory.js`

```javascript
const mongoose = require('mongoose');

const answerWritingCategorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AnswerWritingCategory', answerWritingCategorySchema);
```

### `models/AnswerWritingQuestion.js`

```javascript
const mongoose = require('mongoose');

const answerWritingQuestionSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseSubject',
      required: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnswerWritingCategory',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    question: {
      type: String,
      required: true
    },
    questionPaperPdf: {
      url: String,
      public_id: String
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

answerWritingQuestionSchema.index({ courseId: 1, subjectId: 1, categoryId: 1 });
answerWritingQuestionSchema.index({ courseId: 1, isPublished: 1 });

module.exports = mongoose.model('AnswerWritingQuestion', answerWritingQuestionSchema);
```

### `models/AnswerWritingSubmission.js`

```javascript
const mongoose = require('mongoose');

const answerWritingSubmissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnswerWritingQuestion',
      required: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    answerType: {
      type: String,
      enum: ['text', 'file'],
      required: true
    },
    answerText: {
      type: String,
      default: ''
    },
    answerFile: {
      url: String,
      public_id: String
    },
    submissionStatus: {
      type: String,
      enum: ['submitted', 'evaluated'],
      default: 'submitted'
    },
    evaluatorFeedback: {
      type: String,
      default: ''
    },
    evaluatedAnswerType: {
      type: String,
      enum: ['text', 'file'],
      default: null
    },
    evaluatedAnswerText: {
      type: String,
      default: ''
    },
    evaluatedAnswerFile: {
      url: String,
      public_id: String
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    evaluatedAt: Date,
    marks: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

answerWritingSubmissionSchema.index({ studentId: 1, questionId: 1 }, { unique: true });
answerWritingSubmissionSchema.index({ submissionStatus: 1, createdAt: -1 });
answerWritingSubmissionSchema.index({ courseId: 1, submissionStatus: 1 });

module.exports = mongoose.model('AnswerWritingSubmission', answerWritingSubmissionSchema);
```

### `models/CourseProgress.js`

```javascript
const mongoose = require('mongoose');

const courseProgressSchema = new mongoose.Schema({
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
  completedLectures: {
    type: Number,
    default: 0
  },
  totalLectures: {
    type: Number,
    default: 0
  },
  progressPercent: {
    type: Number,
    default: 0
  },
  completedSubjects: {
    type: Number,
    default: 0
  },
  totalSubjects: {
    type: Number,
    default: 0
  },
  lastOpenedLectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecordedLecture',
    default: null
  },
  lastWatchedAt: Date
}, { timestamps: true });

courseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('CourseProgress', courseProgressSchema);
```

### `models/LectureAnswer.js`

```javascript
const mongoose = require('mongoose');

const lectureAnswerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecordedLecture',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  answerText: {
    type: String,
    default: ''
  }
}, { timestamps: true });

lectureAnswerSchema.index({ userId: 1, lectureId: 1 }, { unique: true });

module.exports = mongoose.model('LectureAnswer', lectureAnswerSchema);
```

### `models/LectureNote.js`

```javascript
const mongoose = require('mongoose');

const lectureNoteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecordedLecture',
    required: true
  },
  noteText: {
    type: String,
    default: '',
    maxlength: 20000
  }
}, { timestamps: true });

lectureNoteSchema.index({ userId: 1, lectureId: 1 }, { unique: true });

module.exports = mongoose.model('LectureNote', lectureNoteSchema);
```

### `models/LectureProgress.js`

```javascript
const mongoose = require('mongoose');

const lectureProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecordedLecture',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  watchedDuration: {
    type: Number,
    default: 0
  },
  totalDuration: {
    type: Number,
    default: 0
  },
  progressPercent: {
    type: Number,
    default: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  lastWatchedAt: Date
}, { timestamps: true });

lectureProgressSchema.index({ userId: 1, lectureId: 1 }, { unique: true });
lectureProgressSchema.index({ userId: 1, courseId: 1 });

module.exports = mongoose.model('LectureProgress', lectureProgressSchema);
```

### `models/LectureQuizAttempt.js`

```javascript
const mongoose = require('mongoose');

const lectureQuizAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecordedLecture',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  answers: [{
    questionIndex: Number,
    selectedOption: Number,
    isCorrect: Boolean
  }],
  score: Number,
  totalQuestions: Number
}, { timestamps: true });

lectureQuizAttemptSchema.index({ userId: 1, lectureId: 1, createdAt: -1 });

module.exports = mongoose.model('LectureQuizAttempt', lectureQuizAttemptSchema);
```

### `models/LmsBookmark.js`

```javascript
const mongoose = require('mongoose');

const lmsBookmarkSchema = new mongoose.Schema(
  {
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
    bookmarkType: {
      type: String,
      enum: ['recording', 'test'],
      required: true
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    thumbnail: {
      url: String,
      public_id: String
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

lmsBookmarkSchema.index({ userId: 1, bookmarkType: 1, createdAt: -1 });
lmsBookmarkSchema.index({ userId: 1, referenceId: 1, bookmarkType: 1 }, { unique: true });

module.exports = mongoose.model('LmsBookmark', lmsBookmarkSchema);
```

### `models/LmsTest.js`

```javascript
const mongoose = require('mongoose');

const lmsTestSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsTestCategory',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    durationInMinutes: {
      type: Number,
      required: true,
      min: 1
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    totalMarks: {
      type: Number,
      default: 0
    },
    passMarks: {
      type: Number,
      default: 0
    },
    negativeMarkPerWrongAnswer: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: 1
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    shuffleOptions: {
      type: Boolean,
      default: false
    },
    instructions: {
      type: String,
      default: ''
    },
    startDateTime: Date,
    endDateTime: Date,
    isPublished: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

lmsTestSchema.index({ courseId: 1, categoryId: 1, isDeleted: 1 });
lmsTestSchema.index({ courseId: 1, isPublished: 1, isDeleted: 1 });

module.exports = mongoose.model('LmsTest', lmsTestSchema);
```

### `models/LmsTestAttempt.js`

```javascript
const mongoose = require('mongoose');

const questionSnapshotSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsTestQuestion',
      required: true
    },
    question: String,
    options: [String],
    correctAnswer: Number,
    explanation: String,
    marks: Number,
    negativeMarks: Number,
    questionImage: {
      url: String,
      public_id: String
    }
  },
  { _id: false }
);

const lmsTestAttemptSchema = new mongoose.Schema(
  {
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
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsTest',
      required: true
    },
    questionSnapshot: [questionSnapshotSchema],
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'LmsTestQuestion'
        },
        selectedOption: Number,
        isCorrect: Boolean,
        obtainedMarks: Number
      }
    ],
    totalQuestions: Number,
    correctAnswers: Number,
    wrongAnswers: Number,
    unanswered: Number,
    obtainedMarks: Number,
    totalMarks: Number,
    percentage: Number,
    isPassed: Boolean,
    startedAt: Date,
    submittedAt: Date,
    timeTakenInSeconds: Number,
    status: {
      type: String,
      enum: ['in_progress', 'submitted'],
      default: 'in_progress'
    }
  },
  { timestamps: true }
);

lmsTestAttemptSchema.index({ userId: 1, testId: 1 });
lmsTestAttemptSchema.index({ userId: 1, submittedAt: -1 });
lmsTestAttemptSchema.index({ testId: 1, status: 1 });

module.exports = mongoose.model('LmsTestAttempt', lmsTestAttemptSchema);
```

### `models/LmsTestCategory.js`

```javascript
const mongoose = require('mongoose');

const lmsTestCategorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      enum: ['weekly', 'daily', 'monthly'],
      required: true,
      unique: true,
      lowercase: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('LmsTestCategory', lmsTestCategorySchema);
```

### `models/LmsTestQuestion.js`

```javascript
const mongoose = require('mongoose');

const lmsTestQuestionSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsTest',
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
        validator: (arr) => Array.isArray(arr) && arr.length === 4,
        message: 'Exactly 4 options are required'
      }
    },
    correctAnswer: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
      validate: {
        validator: function (v) {
          return Array.isArray(this.options) && v >= 0 && v < this.options.length;
        },
        message: 'correctAnswer must be a valid option index (0–3)'
      }
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
    },
    questionImage: {
      url: String,
      public_id: String
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

lmsTestQuestionSchema.index({ testId: 1, createdAt: 1 });
lmsTestQuestionSchema.index({ testId: 1, isDeleted: 1 });

module.exports = mongoose.model('LmsTestQuestion', lmsTestQuestionSchema);
```

### `models/RecordedLecture.js`

```javascript
const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    validate: {
      validator: (v) => Array.isArray(v) && v.length === 4 && v.every((o) => String(o).trim()),
      message: 'Each quiz question must have exactly 4 non-empty options'
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
    default: ''
  }
}, { _id: false });

const cheatSheetSchema = new mongoose.Schema({
  title: String,
  paragraph: String,
  pdf: {
    url: String,
    public_id: String
  }
}, { _id: false });

const mainsQuestionSchema = new mongoose.Schema({
  question: String
}, { _id: false });

const recordedLectureSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseSubject',
    required: true,
    index: true
  },
  lectureTitle: {
    type: String,
    required: true,
    trim: true
  },
  lectureDescription: {
    type: String,
    default: ''
  },
  thumbnail: {
    url: String,
    public_id: String
  },
  video: {
    url: String,
    public_id: String,
    duration: Number
  },
  order: {
    type: Number,
    default: 0
  },
  cheatSheet: cheatSheetSchema,
  topicQuiz: [quizQuestionSchema],
  mainsQuestion: mainsQuestionSchema,
  isPreviewFree: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  publishedAt: {
    type: Date,
    default: null
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

recordedLectureSchema.index({ courseId: 1, subjectId: 1, order: 1 });

module.exports = mongoose.model('RecordedLecture', recordedLectureSchema);
```

### `models/StudentAttendance.js`

```javascript
const mongoose = require('mongoose');

const studentAttendanceSchema = new mongoose.Schema(
  {
    studentId: {
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
    attendanceDate: {
      type: Date,
      required: true
    },
    checkInTime: Date,
    checkOutTime: Date,
    attendanceStatus: {
      type: String,
      enum: ['present', 'absent', 'leave', 'half_day'],
      default: 'present'
    },
    leaveReason: {
      type: String,
      default: ''
    },
    totalDurationInMinutes: {
      type: Number,
      default: 0
    },
    isCheckInDone: {
      type: Boolean,
      default: false
    },
    isCheckOutDone: {
      type: Boolean,
      default: false
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

studentAttendanceSchema.index({ studentId: 1, attendanceDate: 1 }, { unique: true });
studentAttendanceSchema.index({ centerId: 1, attendanceDate: 1 });
studentAttendanceSchema.index({ courseId: 1, attendanceDate: 1 });

module.exports = mongoose.model('StudentAttendance', studentAttendanceSchema);
```

### `routes/answerWritingRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const uploadAnswerWriting = require('../middleware/uploadAnswerWriting');
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/answerWritingCategoryController');
const {
  createQuestion,
  getStudentFilters,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion
} = require('../controllers/answerWritingQuestionController');
const {
  submitAnswer,
  getMySubmissions,
  getSubmissionById,
  getEvaluatorSubmissions,
  evaluateSubmission
} = require('../controllers/answerWritingSubmissionController');

const admin = authorize('super_admin', 'center_admin', 'employee');
const studentOnly = authorize('student');
const evaluator = authorize('super_admin', 'center_admin', 'employee');

const questionUpload = uploadAnswerWriting.fields([{ name: 'questionPaperPdf', maxCount: 1 }]);
const submissionUpload = uploadAnswerWriting.fields([{ name: 'answerFile', maxCount: 1 }]);
const evaluateUpload = uploadAnswerWriting.fields([{ name: 'evaluatedAnswerFile', maxCount: 1 }]);

router.get('/categories', getCategories);
router.post('/categories', protect, admin, createCategory);
router.get('/categories/:id', protect, admin, getCategoryById);
router.put('/categories/:id', protect, admin, updateCategory);
router.delete('/categories/:id', protect, admin, deleteCategory);

router.get('/student/filters', protect, studentOnly, getStudentFilters);
router.post('/questions', protect, admin, questionUpload, createQuestion);
router.get('/questions', protect, getQuestions);
router.put('/questions/:id', protect, admin, questionUpload, updateQuestion);
router.delete('/questions/:id', protect, admin, deleteQuestion);
router.get('/questions/:id', protect, getQuestionById);

router.get('/my-submissions', protect, studentOnly, getMySubmissions);
router.post('/submissions', protect, studentOnly, submissionUpload, submitAnswer);

router.get('/evaluator/submissions', protect, evaluator, getEvaluatorSubmissions);
router.put('/submissions/:id/evaluate', protect, evaluator, evaluateUpload, evaluateSubmission);
router.get('/submissions/:id', protect, getSubmissionById);

module.exports = router;
```

### `routes/attendanceRoutes.js`

```javascript
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
```

### `routes/courseProgressRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getCourseProgress,
  updateLastOpened
} = require('../controllers/courseProgressController');

router.use(protect);

router.post('/last-opened', updateLastOpened);
router.get('/:courseId', getCourseProgress);

module.exports = router;
```

### `routes/lectureAnswerRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { saveAnswer, getAnswer } = require('../controllers/lectureAnswerController');

router.use(protect);

router.post('/', saveAnswer);
router.get('/:lectureId', getAnswer);

module.exports = router;
```

### `routes/lectureNoteRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { saveNote, getNote } = require('../controllers/lectureNoteController');

router.use(protect);

router.post('/', saveNote);
router.get('/:lectureId', getNote);

module.exports = router;
```

### `routes/lectureProgressRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { updateProgress, getProgress } = require('../controllers/lectureProgressController');

router.use(protect);

router.post('/', updateProgress);
router.get('/:lectureId', getProgress);

module.exports = router;
```

### `routes/lectureQuizAttemptRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  submitQuizAttempt,
  getQuizAttempts
} = require('../controllers/lectureQuizAttemptController');

router.use(protect);

router.post('/', submitQuizAttempt);
router.get('/:lectureId', getQuizAttempts);

module.exports = router;
```

### `routes/lmsBookmarkRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  toggleBookmark,
  getAllBookmarks,
  getRecordingBookmarks,
  getTestBookmarks,
  getBookmarkStatus
} = require('../controllers/lmsBookmarkController');

router.use(protect);

router.post('/toggle', toggleBookmark);
router.get('/status', getBookmarkStatus);
router.get('/recordings', getRecordingBookmarks);
router.get('/tests', getTestBookmarks);
router.get('/', getAllBookmarks);

module.exports = router;
```

### `routes/lmsTestRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/lmsTestCategoryController');
const {
  createTest,
  updateTest,
  deleteTest,
  publishTest,
  getTestsByCourseAndCategory,
  getTestsByCourseAndCategoryAdmin,
  startTest,
  submitTest
} = require('../controllers/lmsTestController');
const {
  createQuestion,
  createQuestionsBulk,
  getQuestionsByTest,
  updateQuestion,
  deleteQuestion
} = require('../controllers/lmsTestQuestionController');
const {
  getAttemptResult,
  getMyAttempts
} = require('../controllers/lmsTestAttemptController');

const admin = authorize('super_admin', 'center_admin', 'employee');

// Static routes first (avoid /:id capturing "attempts", "questions", etc.)
router.get('/categories', getCategories);
router.post('/categories', protect, admin, createCategory);
router.put('/categories/:id', protect, admin, updateCategory);
router.delete('/categories/:id', protect, admin, deleteCategory);

router.get('/attempts/me/list', protect, getMyAttempts);
router.get('/attempts/:attemptId', protect, getAttemptResult);

router.post('/questions/bulk', protect, admin, createQuestionsBulk);
router.post('/questions', protect, admin, createQuestion);
router.get('/questions/test/:testId', protect, admin, getQuestionsByTest);
router.put('/questions/:id', protect, admin, updateQuestion);
router.delete('/questions/:id', protect, admin, deleteQuestion);

router.get(
  '/course/:courseId/category/:categoryId',
  protect,
  getTestsByCourseAndCategory
);
router.get(
  '/course/:courseId/category/:categoryId/admin',
  protect,
  admin,
  getTestsByCourseAndCategoryAdmin
);

router.post('/', protect, admin, createTest);
router.put('/:id', protect, admin, updateTest);
router.delete('/:id', protect, admin, deleteTest);
router.patch('/:id/publish', protect, admin, publishTest);

router.get('/:id/start', protect, startTest);
router.post('/:id/submit', protect, submitTest);

module.exports = router;
```

### `routes/recordedLectureRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const uploadRecordedLecture = require('../middleware/uploadRecordedLecture');
const {
  createLecture,
  getLecturesBySubject,
  getLecturesBySubjectAdmin,
  getLectureById,
  updateLecture,
  deleteLecture,
  reorderLectures
} = require('../controllers/recordedLectureController');

const adminOnly = allowRoles('super_admin', 'center_admin');

const lectureUpload = uploadRecordedLecture.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'cheatSheetPdf', maxCount: 1 }
]);

router.use(protect);

router.get('/subject/:subjectId', getLecturesBySubject);

router.post('/', adminOnly, lectureUpload, createLecture);
router.put('/reorder', adminOnly, reorderLectures);
router.get('/admin/subject/:subjectId', adminOnly, getLecturesBySubjectAdmin);
router.put('/:id', adminOnly, lectureUpload, updateLecture);
router.delete('/:id', adminOnly, deleteLecture);

router.get('/:id', getLectureById);

module.exports = router;
```



