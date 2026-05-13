# 📚 Complete Book System - Full Code & API Documentation

## Overview

Complete book commerce system with auto-calculated pricing, image uploads, overview videos, topper testimonial videos, and best-seller filtering.

---

## 📑 Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Models (Complete Code)](#2-models-complete-code)
3. [Controllers (Complete Code)](#3-controllers-complete-code)
4. [Routes (Complete Code)](#4-routes-complete-code)
5. [API Endpoints](#5-api-endpoints)
6. [Step-by-Step API Testing](#6-step-by-step-api-testing)
7. [Frontend Integration](#7-frontend-integration)

---

## 1. System Architecture

### Book System Components

```text
Books
   ↓
   ├─ Book Model (with pricing)
   ├─ Book Controller (CRUD operations)
   └─ Book Routes (Public + Admin)
   
Book Overview Videos
   ↓
   ├─ BookOverview Model
   ├─ BookOverview Controller
   └─ BookOverview Routes
   
Book Topper Videos
   ↓
   ├─ BookTopper Model
   ├─ BookTopper Controller
   └─ BookTopper Routes
```

### Pricing Flow

```text
Admin Input:
   - fullPrice: ₹1000
   - discountPercent: 20%
   ↓
Backend Auto-Calculation:
   - discountedPrice = ₹800
   ↓
Frontend Display:
   - Show: ₹1000 (strikethrough)
   - Show: ₹800 (final price)
   - Show: 20% OFF badge
```

---

## 2. Models (Complete Code)

### 2.1 Book Model

**File:** `models/Book.js`

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

---

### 2.2 Book Overview Model

**File:** `models/BookOverview.js`

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

---

### 2.3 Book Topper Model

**File:** `models/BookTopper.js`

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

---

## 3. Controllers (Complete Code)

### 3.1 Book Controller

**File:** `controllers/bookController.js`

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

    // Filter by subject
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

---

### 3.2 Book Overview Controller

**File:** `controllers/bookOverviewController.js`

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

---

### 3.3 Book Topper Controller

**File:** `controllers/bookTopperController.js`

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

---

## 4. Routes (Complete Code)

### 4.1 Book Routes

**File:** `routes/bookRoutes.js`

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

---

### 4.2 Book Overview Routes

**File:** `routes/bookOverviewRoutes.js`

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

---

### 4.3 Book Topper Routes

**File:** `routes/bookTopperRoutes.js`

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

---

## 5. API Endpoints

### Base URLs:
- Books: `http://localhost:5000/api/books`
- Overview Videos: `http://localhost:5000/api/overviews`
- Topper Videos: `http://localhost:5000/api/toppers`

### Books API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **GET** | `/api/books` | Public | Get all books (with filters) |
| **GET** | `/api/books/sample` | Public | Get sample books (latest 10) |
| **GET** | `/api/books/:id` | Public | Get single book |
| **POST** | `/api/books` | ✅ Admin | Create new book |
| **PUT** | `/api/books/:id` | ✅ Admin | Update book |
| **DELETE** | `/api/books/:id` | ✅ Admin | Delete book (soft) |

### Overview Videos API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **GET** | `/api/overviews` | Public | Get all overview videos |
| **GET** | `/api/overviews/:id` | Public | Get single overview video |
| **POST** | `/api/overviews` | ✅ Admin | Create overview video |
| **PUT** | `/api/overviews/:id` | ✅ Admin | Update overview video |
| **DELETE** | `/api/overviews/:id` | ✅ Admin | Delete overview video |

### Topper Videos API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **GET** | `/api/toppers` | Public | Get all topper videos |
| **GET** | `/api/toppers/:id` | Public | Get single topper video |
| **POST** | `/api/toppers` | ✅ Admin | Create topper video |
| **PUT** | `/api/toppers/:id` | ✅ Admin | Update topper video |
| **DELETE** | `/api/toppers/:id` | ✅ Admin | Delete topper video |

---

## 6. Step-by-Step API Testing

### Test 1: Create Book (Admin Only)

```bash
POST http://localhost:5000/api/books
Authorization: Bearer ADMIN_TOKEN
Content-Type: multipart/form-data
```

**Form Data:**
```
title: "Indian Polity for UPSC"
authorNames: ["M. Laxmikanth"]
subjects: ["Polity", "GS Paper 2"]
summary: "Complete guide to Indian Polity for UPSC Prelims and Mains"
fullPrice: 1200
discountPercent: 20
isBestSeller: true
image: <FILE> (Book cover image)
```

**Expected Response (201):**
```json
{
   "success": true,
   "message": "Book created successfully",
   "data": {
      "_id": "BOOK_ID",
      "title": "Indian Polity for UPSC",
      "authorNames": ["M. Laxmikanth"],
      "subjects": ["Polity", "GS Paper 2"],
      "summary": "Complete guide to Indian Polity for UPSC Prelims and Mains",
      "image": {
         "url": "https://res.cloudinary.com/.../book-cover.jpg",
         "publicId": "books/covers/xyz123"
      },
      "fullPrice": 1200,
      "discountPercent": 20,
      "discountedPrice": 960,
      "isBestSeller": true,
      "isActive": true,
      "createdAt": "2026-05-12T10:00:00.000Z",
      "updatedAt": "2026-05-12T10:00:00.000Z"
   }
}
```

---

### Test 2: Get All Books (Public)

```bash
GET http://localhost:5000/api/books
```

**Expected Response (200):**
```json
{
   "success": true,
   "count": 5,
   "data": [
      {
         "_id": "...",
         "title": "Indian Polity for UPSC",
         "authorNames": ["M. Laxmikanth"],
         "subjects": ["Polity", "GS Paper 2"],
         "summary": "...",
         "image": { "url": "...", "publicId": "..." },
         "fullPrice": 1200,
         "discountPercent": 20,
         "discountedPrice": 960,
         "isBestSeller": true,
         "isActive": true
      }
   ]
}
```

---

### Test 3: Filter Best Sellers

```bash
GET http://localhost:5000/api/books?isBestSeller=true
```

**Expected Response (200):**
```json
{
   "success": true,
   "count": 3,
   "data": [/* Only best sellers */]
}
```

---

### Test 4: Filter by Subject

```bash
GET http://localhost:5000/api/books?subject=Polity
```

**Expected Response (200):**
```json
{
   "success": true,
   "count": 2,
   "data": [/* Books with Polity subject */]
}
```

---

### Test 5: Get Sample Books (Carousel)

```bash
GET http://localhost:5000/api/books/sample
```

**Expected Response (200):**
```json
{
   "success": true,
   "count": 10,
   "data": [
      {
         "_id": "...",
         "title": "Indian Polity for UPSC",
         "image": { "url": "..." },
         "discountedPrice": 960,
         "fullPrice": 1200,
         "discountPercent": 20,
         "subjects": ["Polity", "GS Paper 2"]
      }
   ]
}
```

---

### Test 6: Get Single Book

```bash
GET http://localhost:5000/api/books/BOOK_ID
```

**Expected Response (200):**
```json
{
   "success": true,
   "data": {
      "_id": "BOOK_ID",
      "title": "Indian Polity for UPSC",
      "authorNames": ["M. Laxmikanth"],
      "subjects": ["Polity", "GS Paper 2"],
      "summary": "Complete guide...",
      "image": { "url": "...", "publicId": "..." },
      "fullPrice": 1200,
      "discountPercent": 20,
      "discountedPrice": 960,
      "isBestSeller": true,
      "isActive": true
   }
}
```

---

### Test 7: Update Book

```bash
PUT http://localhost:5000/api/books/BOOK_ID
Authorization: Bearer ADMIN_TOKEN
Content-Type: multipart/form-data
```

**Form Data:**
```
title: "Indian Polity for UPSC 2026"
discountPercent: 30
image: <NEW_FILE> (Optional - new cover image)
```

**Expected Response (200):**
```json
{
   "success": true,
   "message": "Book updated successfully",
   "data": {
      "_id": "BOOK_ID",
      "title": "Indian Polity for UPSC 2026",
      "fullPrice": 1200,
      "discountPercent": 30,
      "discountedPrice": 840,
      // ... other fields
   }
}
```

---

### Test 8: Delete Book (Soft Delete)

```bash
DELETE http://localhost:5000/api/books/BOOK_ID
Authorization: Bearer ADMIN_TOKEN
```

**Expected Response (200):**
```json
{
   "success": true,
   "message": "Book deleted successfully",
   "data": {
      "_id": "BOOK_ID",
      "isActive": false,
      // ... other fields
   }
}
```

---

### Test 9: Create Overview Video

```bash
POST http://localhost:5000/api/overviews
Authorization: Bearer ADMIN_TOKEN
Content-Type: multipart/form-data
```

**Form Data:**
```
title: "Indian Polity Book Overview"
video: <FILE> (MP4 video file)
```

**Expected Response (201):**
```json
{
   "success": true,
   "message": "Overview video created successfully",
   "data": {
      "_id": "OVERVIEW_ID",
      "title": "Indian Polity Book Overview",
      "videoUrl": "https://res.cloudinary.com/.../overview.mp4",
      "videoPublicId": "books/overviews/abc456",
      "isActive": true,
      "createdAt": "2026-05-12T10:30:00.000Z"
   }
}
```

---

### Test 10: Get All Overview Videos

```bash
GET http://localhost:5000/api/overviews
```

**Expected Response (200):**
```json
{
   "success": true,
   "count": 3,
   "data": [
      {
         "_id": "...",
         "title": "Indian Polity Book Overview",
         "videoUrl": "https://res.cloudinary.com/.../overview.mp4",
         "videoPublicId": "books/overviews/abc456",
         "isActive": true
      }
   ]
}
```

---

### Test 11: Create Topper Video

```bash
POST http://localhost:5000/api/toppers
Authorization: Bearer ADMIN_TOKEN
Content-Type: multipart/form-data
```

**Form Data:**
```
title: "AIR 1 - Priya Sharma's Success Story"
video: <FILE> (MP4 video file)
```

**Expected Response (201):**
```json
{
   "success": true,
   "message": "Topper video created successfully",
   "data": {
      "_id": "TOPPER_ID",
      "title": "AIR 1 - Priya Sharma's Success Story",
      "videoUrl": "https://res.cloudinary.com/.../topper.mp4",
      "videoPublicId": "books/toppers/xyz789",
      "isActive": true,
      "createdAt": "2026-05-12T11:00:00.000Z"
   }
}
```

---

### Test 12: Get All Topper Videos

```bash
GET http://localhost:5000/api/toppers
```

**Expected Response (200):**
```json
{
   "success": true,
   "count": 5,
   "data": [
      {
         "_id": "...",
         "title": "AIR 1 - Priya Sharma's Success Story",
         "videoUrl": "https://res.cloudinary.com/.../topper.mp4",
         "videoPublicId": "books/toppers/xyz789",
         "isActive": true
      }
   ]
}
```

---

## 7. Frontend Integration

### 7.1 Display Books with Pricing

```javascript
const BookCard = ({ book }) => {
   const hasDiscount = book.discountPercent > 0;

   return (
      <div className="book-card">
         <img src={book.image.url} alt={book.title} />
         
         {hasDiscount && (
            <span className="discount-badge">
               {book.discountPercent}% OFF
            </span>
         )}
         
         <h3>{book.title}</h3>
         <p className="authors">
            By {book.authorNames.join(', ')}
         </p>
         
         <div className="pricing">
            {hasDiscount && (
               <span className="original-price">
                  ₹{book.fullPrice.toLocaleString()}
               </span>
            )}
            <span className="final-price">
               ₹{book.discountedPrice.toLocaleString()}
            </span>
         </div>
         
         <button className="buy-now-btn">
            Buy Now
         </button>
      </div>
   );
};
```

---

### 7.2 Book Video Gallery (Overview + Toppers)

```javascript
const BookVideoGallery = () => {
   const [overviews, setOverviews] = useState([]);
   const [toppers, setToppers] = useState([]);

   useEffect(() => {
      fetchVideos();
   }, []);

   const fetchVideos = async () => {
      try {
         const [overviewRes, topperRes] = await Promise.all([
            axios.get('http://localhost:5000/api/overviews'),
            axios.get('http://localhost:5000/api/toppers')
         ]);

         setOverviews(overviewRes.data.data);
         setToppers(topperRes.data.data);
      } catch (error) {
         console.error('Failed to fetch videos:', error);
      }
   };

   return (
      <div className="video-gallery">
         <section>
            <h2>Book Overview Videos</h2>
            <div className="video-grid">
               {overviews.map(video => (
                  <div key={video._id} className="video-card">
                     <video controls>
                        <source src={video.videoUrl} type="video/mp4" />
                     </video>
                     <h3>{video.title}</h3>
                  </div>
               ))}
            </div>
         </section>

         <section>
            <h2>Topper Success Stories</h2>
            <div className="video-grid">
               {toppers.map(video => (
                  <div key={video._id} className="video-card">
                     <video controls>
                        <source src={video.videoUrl} type="video/mp4" />
                     </video>
                     <h3>{video.title}</h3>
                  </div>
               ))}
            </div>
         </section>
      </div>
   );
};
```

---

### 7.3 Book Listing with Filters

```javascript
const BookListing = () => {
   const [books, setBooks] = useState([]);
   const [filters, setFilters] = useState({
      isBestSeller: false,
      subject: ''
   });

   useEffect(() => {
      fetchBooks();
   }, [filters]);

   const fetchBooks = async () => {
      try {
         const params = {};
         if (filters.isBestSeller) params.isBestSeller = 'true';
         if (filters.subject) params.subject = filters.subject;

         const response = await axios.get('http://localhost:5000/api/books', { params });
         setBooks(response.data.data);
      } catch (error) {
         console.error('Failed to fetch books:', error);
      }
   };

   return (
      <div className="book-listing">
         <div className="filters">
            <label>
               <input
                  type="checkbox"
                  checked={filters.isBestSeller}
                  onChange={(e) => setFilters({
                     ...filters,
                     isBestSeller: e.target.checked
                  })}
               />
               Best Sellers Only
            </label>

            <select
               value={filters.subject}
               onChange={(e) => setFilters({
                  ...filters,
                  subject: e.target.value
               })}
            >
               <option value="">All Subjects</option>
               <option value="Polity">Polity</option>
               <option value="History">History</option>
               <option value="Geography">Geography</option>
            </select>
         </div>

         <div className="books-grid">
            {books.map(book => (
               <BookCard key={book._id} book={book} />
            ))}
         </div>
      </div>
   );
};
```

---

## 8. Pricing Calculation Logic

### Backend Auto-Calculation

```javascript
// When creating or updating book:
const fullPrice = 1200;
const discountPercent = 20;

// Auto-calculate discounted price
const discountedPrice = Math.round(
   fullPrice - (fullPrice * discountPercent / 100)
);

// Result: discountedPrice = 960
```

### Frontend Display Logic

```javascript
// If discount exists
if (book.discountPercent > 0) {
   // Show: ₹1200 (strikethrough)
   // Show: ₹960 (final price)
   // Show: 20% OFF badge
} else {
   // Show: ₹1200 (only price)
   // No badge
}
```

---

## 9. Cloudinary Upload Structure

```text
Cloudinary Folders:
   books/
      ├── covers/        # Book cover images
      ├── overviews/     # Overview videos
      └── toppers/       # Topper testimonial videos
```

---

**Last Updated:** May 12, 2026  
**Version:** 1.0  
**Status:** Production Ready ✅
