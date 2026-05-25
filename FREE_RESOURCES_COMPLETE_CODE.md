# Free Resources — Complete Code & API Guide

> **Project:** Sriram-IAS  
> **Base URL:** `http://localhost:5000`  
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

```text
Free Resources
├── Categories & SubCategories     → /api/resources
├── Dynamic Filters                → /api/resources/filters
├── PDF / Study files              → /api/resources/files
├── Mock Tests                     → /api/resources/mock-tests
└── Question maintenance           → /api/resources/questions
```

| Module | Category name contains | Required filters on file upload |
|--------|------------------------|----------------------------------|
| NCERT | `ncert` | `subjectId`, `classId` |
| PYQ | `previous year` or `pyq` | `subCategoryId`, `paperId`, `yearId` |
| Study Material | `study material` | `subCategoryId` only |

**Filter types:** `SUBJECT`, `CLASS`, `PAPER`, `YEAR`

---

## 2. API Endpoints

### Categories — `/api/resources`

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/categories` | Public |
| GET | `/categories/:id` | Public |
| POST | `/categories` | Admin + thumbnail |
| PUT | `/categories/:id` | Admin |
| DELETE | `/categories/:id` | Admin |

### SubCategories — `/api/resources`

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/subcategories` | Public |
| GET | `/subcategories/category/:categoryId` | Public |
| POST | `/subcategories` | Admin |
| PUT | `/subcategories/:id` | Admin |
| DELETE | `/subcategories/:id` | Admin |

### Filters — `/api/resources/filters`

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/` | Public |
| GET | `/category/:categoryId` | Public (grouped) |
| POST | `/` | Admin |
| PUT | `/:id` | Admin |
| DELETE | `/:id` | Admin |

### Files — `/api/resources/files`

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/?categoryId=&subjectId=&page=1` | Public |
| GET | `/:id` | Public (increments downloads) |
| POST | `/` | Admin multipart: `file`, optional `thumbnail` |
| PUT | `/:id` | Admin |
| DELETE | `/:id` | Admin |

### Mock Tests — `/api/resources/mock-tests`

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/` | Public |
| GET | `/:id` | Public |
| POST | `/` | Admin |
| PUT | `/:id` | Admin |
| DELETE | `/:id` | Admin |
| POST | `/:id/attempt` | Student (one attempt) |
| GET | `/results` | Logged in |
| GET | `/results/:id` | Logged in |
| POST | `/:id/add-question` | Admin |
| POST | `/:id/add-questions` | Admin |
| DELETE | `/:id/question/:questionId` | Admin |

### Questions — `/api/resources/questions`

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/:id` | Admin |
| PUT/PATCH | `/:id` | Admin |
| DELETE | `/:id` | Admin |

---

## 3. Module Filter Rules

Validated in `controllers/resourceController.js` when creating a file resource.

---

## 4. Route Registration

**File:** `app.js`

```javascript
// Free Resources CMS routes (from app.js)
app.use('/api/resources', resourceRoutes);
app.use('/api/resources/filters', filterRoutes);
app.use('/api/resources/files', resourceFileRoutes);
app.use('/api/resources/mock-tests', mockTestRoutes);
app.use('/api/resources/questions', questionRoutes);
```

---

## 5. Models

### 5.1 ResourceCategory

**File:** `models/ResourceCategory.js`

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

---

### 5.2 SubCategory

**File:** `models/SubCategory.js`

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

---

### 5.3 Filter

**File:** `models/Filter.js`

```javascript
const mongoose = require('mongoose');

const filterSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['SUBJECT', 'CLASS', 'PAPER', 'YEAR']
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

---

### 5.4 Resource

**File:** `models/Resource.js`

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

module.exports = mongoose.model('Resource', resourceSchema);

```

---

### 5.5 MockTest

**File:** `models/MockTest.js`

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

---

### 5.6 Question

**File:** `models/Question.js`

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

---

### 5.7 Result

**File:** `models/Result.js`

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

---

### 6.1 resourceMiddleware

**File:** `middleware/resourceMiddleware.js`

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

---

### 6.2 uploadResource

**File:** `middleware/uploadResource.js`

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

---

### 7.1 resourceRoutes

**File:** `routes/resourceRoutes.js`

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

---

### 7.2 resourceFileRoutes

**File:** `routes/resourceFileRoutes.js`

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

---

### 7.3 filterRoutes

**File:** `routes/filterRoutes.js`

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

---

### 7.4 mockTestRoutes

**File:** `routes/mockTestRoutes.js`

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

---

### 7.5 questionRoutes

**File:** `routes/questionRoutes.js`

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

---

### 8.1 resourceCategoryController

**File:** `controllers/resourceCategoryController.js`

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
    const { name, description } = req.body;

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
    const { name, description, isActive } = req.body;
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

---

### 8.2 resourceController

**File:** `controllers/resourceController.js`

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
    
    if (categoryName.includes('ncert')) {
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
      yearId: yearId || null,         // For PYQ
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

---

### 8.3 filterController

**File:** `controllers/filterController.js`

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

---

### 8.4 mockTestController

**File:** `controllers/mockTestController.js`

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

---

### 8.5 questionController

**File:** `controllers/questionController.js`

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

---

