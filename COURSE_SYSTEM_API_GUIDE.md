    # 📚 Complete Course System API Documentation

    ## Overview

    Production-grade course management system with Cloudinary media uploads, category/center relations, installment plans, and enrollment tracking.

    ---

    ## 📑 Table of Contents

    1. [Model Schema](#model-schema)
    2. [API Endpoints](#api-endpoints)
    3. [Academic ERP — Cascading Dropdowns & Course Hierarchy](#academic-erp--cascading-dropdowns--course-hierarchy)
    4. [Complete Source Code — Course Creation](#complete-source-code--course-creation)
    5. [Step-by-Step API Testing](#step-by-step-api-testing)
    6. [Public vs Admin Routes](#public-vs-admin-routes)
    7. [Frontend Integration](#frontend-integration)

    ---

    ## 📊 Model Schema

    ### Course Model

    **File:** `models/Course.js`

    ```javascript
    {
    // Basic Info
    title: String (required),
    slug: String (auto-generated, unique),
    center: ObjectId (ref: Center, required),
    category: ObjectId (ref: Category, required),
    description: String,
    
    // Dates & Duration
    batchStartDate: Date,
    batchEndDate: Date,
    duration: String,                    // "1 Year", "6 Months"
    accessValidityInDays: Number,
    recordedContentValidityInDays: Number,
    
    // Fees with Auto-Calculated Pricing
    fees: {
        online: {
            actualPrice: Number,           // Required: ₹100,000
            discountPercent: Number,       // Optional: 20
            discountedPrice: Number,       // Auto-calculated: ₹80,000
            hasDiscount: Boolean,          // Auto-calculated: true
            offerText: String              // Optional: "Summer Offer"
        },
        offline: {
            actualPrice: Number,
            discountPercent: Number,
            discountedPrice: Number,
            hasDiscount: Boolean,
            offerText: String
        },
        description: String
    },
    
    // Modes
    modes: ['online', 'offline', 'hybrid'],
    
    // Media (Cloudinary)
    bannerImage: {                       // Required
        url: String,
        public_id: String
    },
    highlightImage: {                    // Optional
        url: String,
        public_id: String
    },
    sectionImage: {                      // Optional
        url: String,
        public_id: String
    },
    galleryImages: [{                    // Optional, max 5
        url: String,
        public_id: String
    }],
    promoVideo: {                        // Optional
        url: String,
        public_id: String
    },
    brochure: {                          // Optional (PDF)
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
    
    // Extra Fields (Flexible)
    extraFields: Mixed,                  // Category-specific data
    
    // Additional
    features: [String],
    isActive: Boolean (default: true),
    isFeatured: Boolean (default: false),
    createdBy: ObjectId (ref: User)
    }
    ```

    **Indexes:**
    - `{ center: 1, category: 1 }`
    - `{ isActive: 1 }`

    ---

    ## 🔌 API Endpoints

    ### Base URL: `http://localhost:5000/api/courses`

    ### Public Routes (No Auth Required)

    | Method | Endpoint | Description |
    |--------|----------|-------------|
    | **GET** | `/api/courses` | Get all courses (with filters) |
    | **GET** | `/api/courses/enquiry` | Get course titles for enquiry forms |
    | **GET** | `/api/courses/grouped` | Get courses grouped by center/category |
    | **GET** | `/api/courses/slug/:slug` | Get course by slug |
    | **GET** | `/api/courses/:id` | Get course by ID |
    | **POST** | `/api/courses/find` | Get course by ID (POST method) |

    ### Admin Routes (Auth Required)

    | Method | Endpoint | Access | Content-Type | Description |
    |--------|----------|--------|--------------|-------------|
    | **POST** | `/api/courses` | Super Admin, Center Admin | multipart/form-data | Create course |
    | **PUT** | `/api/courses/:id` | Super Admin, Center Admin | multipart/form-data | Update course |
    | **DELETE** | `/api/courses/:id` | Super Admin only | JSON | Delete course |

    ---

    ## Academic ERP — Cascading Dropdowns & Course Hierarchy

    Courses are linked to the academic hierarchy (see also `PROGRAM_CATEGORY_SUBCATEGORY_API_GUIDE.md`):

    ```text
    Center → Program → Category → SubCategory → Course
    ```

    ### Dropdown APIs (call in order)

    | Step | User selects | API |
    |------|--------------|-----|
    | 1 | Center | (center list / `GET /api/admin/centers/dropdown`) |
    | 2 | Program | `GET /api/programs/by-center/:centerId` |
    | 3 | Category | `GET /api/categories/filter?centerId=&programId=` |
    | 4 | SubCategory | `GET /api/sub-categories/filter?centerId=&programId=&categoryId=` |

    ### Frontend handlers (Formik example)

    ```javascript
    const handleCenterChange = async (centerId) => {
      formik.setFieldValue('centerId', centerId);
      formik.setFieldValue('programId', '');
      formik.setFieldValue('categoryId', '');
      formik.setFieldValue('subCategoryId', '');
      const { data } = await axios.get(`/api/programs/by-center/${centerId}`, { headers: auth });
      setPrograms(data.data);
      setCategories([]);
      setSubCategories([]);
    };

    const handleProgramChange = async (programId) => {
      formik.setFieldValue('programId', programId);
      formik.setFieldValue('categoryId', '');
      formik.setFieldValue('subCategoryId', '');
      const { data } = await axios.get('/api/categories/filter', {
        headers: auth,
        params: { centerId: formik.values.centerId, programId }
      });
      setCategories(data.data);
      setSubCategories([]);
    };

    const handleCategoryChange = async (categoryId) => {
      formik.setFieldValue('categoryId', categoryId);
      formik.setFieldValue('subCategoryId', '');
      const { data } = await axios.get('/api/sub-categories/filter', {
        headers: auth,
        params: {
          centerId: formik.values.centerId,
          programId: formik.values.programId,
          categoryId
        }
      });
      setSubCategories(data.data);
    };
    ```

    ### Required fields on `POST /api/courses`

    | Field | Type | Notes |
    |-------|------|-------|
    | `courseName` | string | Or legacy `title` (both synced) |
    | `centerId` | ObjectId | Or `center` |
    | `programId` | ObjectId | Or `program` |
    | `categoryId` | ObjectId | Academic category → `academicCategory` in DB |
    | `subCategoryId` | ObjectId | → `academicSubCategory` in DB |
    | `banner` | file | Required (multipart) |

    ### Backend hierarchy validation (before save)

    ```javascript
    // utils/courseHierarchyValidation.js
    // 1. Program must include centerId in program.centers[]
    // 2. Category must match centerId + programId
    // 3. SubCategory must match centerId + programId + categoryId
    ```

    ### New Course schema fields (ERP + CMS)

    ```javascript
    courseId: 'CRS001',              // auto-generated
    courseName: String,              // synced with title
    program: ObjectId → Program,
    academicCategory: ObjectId → AcademicCategory,
    academicSubCategory: ObjectId → AcademicSubCategory,
    courseOverview: String,
    keyFeatures: [{ image: String, points: [String] }],   // Cloudinary URLs
    whyChooseSection: {
      title, subtitle,
      featureCards: [{ image, featureTitle, displayOrder, featureDescription, highlightOnWebsite }]
    },
    helpSections: [{ video, image1, image2 }],
    status: 'ACTIVE' | 'INACTIVE',   // syncs isActive
    ```

    Legacy fields (`keyHighlights`, `whyChoose`, `howItHelps`, `fees`, `bannerImage`, etc.) still supported.

    ### List / search (`GET /api/courses`)

    | Query | Description |
    |-------|-------------|
    | `search` | `courseName`, `title`, or `courseId` (contains, case-insensitive) |
    | `centerId` or `center` | Filter by center |
    | `programId` | Filter by program |
    | `categoryId` | Filter by academic category |
    | `subCategoryId` | Filter by subcategory |
    | `status` | `ACTIVE` \| `INACTIVE` |
    | `isActive` | Legacy boolean (`true` / `false`) |

    ### Delete

    `DELETE /api/courses/:id` — **hard delete** (removes DB row + Cloudinary assets). Super Admin only.

    ### Related files added/updated

    | File | Purpose |
    |------|---------|
    | `utils/courseHierarchyValidation.js` | Chain validation |
    | `utils/courseIdGenerator.js` | `CRS001` ids |
    | `utils/coursePayloadHelpers.js` | Body parsing + populate paths |
    | `models/Course.js` | ERP + CMS fields |
    | `controllers/courseController.js` | Create/update/list with hierarchy |

    Postman: **`COURSE_ERP_POSTMAN_COLLECTION.json`**

    ---

    ## Complete Source Code — Course Creation

    **Endpoint:** `POST /api/courses`  
    **Auth:** Super Admin or Center Admin JWT  
    **Content-Type:** `multipart/form-data` (required for banner + optional media)

    ### File structure

    ```txt
    app.js                          → app.use('/api/courses', courseRoutes)
    models/Course.js                → Course schema + slug pre-save
    routes/courseRoutes.js          → POST / with protect + upload.fields
    controllers/courseController.js → createCourse
    middleware/upload.js            → multer memory storage
    utils/uploadToCloudinary.js     → Cloudinary upload_stream
    config/cloudinary.js            → Cloudinary env config
    ```

    ### `app.js` (route mount)

    ```javascript
    const courseRoutes = require('./routes/courseRoutes');
    // ...
    app.use('/api/courses', courseRoutes);
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

    ### `utils/uploadToCloudinary.js`

    ```javascript
    const cloudinary = require('../config/cloudinary');

    const uploadToCloudinary = async (file, folder = 'courses', resourceType = 'auto', format = null) => {
      return new Promise((resolve, reject) => {
        const uploadOptions = {
          folder: folder,
          resource_type: resourceType
        };

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

    ### `middleware/upload.js`

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
        cb(new Error('Invalid file type. Only JPEG, PNG, WebP, AVIF, GIF, MP4, and PDF allowed.'), false);
      }
    };

    const upload = multer({
      storage,
      fileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024
      }
    });

    module.exports = upload;
    ```

    ### `models/Course.js` (complete)

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
        sparse: true,
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

      batchStartDate: { type: Date, default: null },
      batchEndDate: { type: Date, default: null },
      duration: String,
      accessValidityInDays: { type: Number, default: null },
      recordedContentValidityInDays: { type: Number, default: null },

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

      bannerImage: {
        url: { type: String, required: true },
        public_id: { type: String, required: true }
      },
      highlightImage: { url: String, public_id: String },
      sectionImage: { url: String, public_id: String },
      galleryImages: [{ url: String, public_id: String }],
      promoVideo: { url: String, public_id: String },
      brochure: { url: String, public_id: String },

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

      extraFields: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },

      features: [String],

      isActive: { type: Boolean, default: true },
      isFeatured: { type: Boolean, default: false },

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }

    }, { timestamps: true });

    courseSchema.pre('save', async function() {
      if (this.title && !this.slug) {
        this.slug = this.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') + '-' + Date.now();
      }
    });

    courseSchema.index({ center: 1, category: 1 });
    courseSchema.index({ isActive: 1 });

    module.exports = mongoose.model('Course', courseSchema);
    ```

    ### `routes/courseRoutes.js` (create route)

    ```javascript
    const express = require('express');
    const router = express.Router();
    const upload = require('../middleware/upload');
    const { protect } = require('../middleware/authMiddleware');
    const { allowRoles } = require('../middleware/roleMiddleware');
    const { createCourse } = require('../controllers/courseController');

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

    module.exports = router;
    ```

    ### `controllers/courseController.js` — `createCourse` (complete)

    ```javascript
    const Course = require('../models/Course');
    const Center = require('../models/Center');
    const Category = require('../models/Category');
    const uploadToCloudinary = require('../utils/uploadToCloudinary');

    // @desc    Create new course
    // @route   POST /api/courses
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
          modes
        } = req.body;

        if (!title || !center || !category) {
          return res.status(400).json({
            message: 'Required fields missing: title, center, and category are required'
          });
        }

        let parsedStartDate = null;
        if (startDate) {
          const dateObj = new Date(startDate);
          parsedStartDate = !isNaN(dateObj.getTime()) ? dateObj : startDate;
        }

        const centerDoc = await Center.findById(center);
        if (!centerDoc) {
          return res.status(404).json({ message: 'Center not found' });
        }

        if (user.role === 'center_admin') {
          if (!centerDoc.centerAdmin || !centerDoc.centerAdmin.equals(user._id)) {
            return res.status(403).json({
              message: 'Access denied. You are not the admin of this center.'
            });
          }
        }

        const files = req.files;
        if (!files || !files.banner) {
          return res.status(400).json({ message: 'Banner image is required' });
        }

        const uploadPromises = [];
        uploadPromises.push(
          uploadToCloudinary(files.banner[0], 'courses/banners').then((result) => ({
            type: 'banner',
            result
          }))
        );
        if (files.highlight) {
          uploadPromises.push(
            uploadToCloudinary(files.highlight[0], 'courses/highlights').then((result) => ({
              type: 'highlight',
              result
            }))
          );
        }
        if (files.section) {
          uploadPromises.push(
            uploadToCloudinary(files.section[0], 'courses/sections').then((result) => ({
              type: 'section',
              result
            }))
          );
        }
        if (files.gallery) {
          files.gallery.forEach((file) => {
            uploadPromises.push(
              uploadToCloudinary(file, 'courses/gallery').then((result) => ({
                type: 'gallery',
                result
              }))
            );
          });
        }
        if (files.video) {
          uploadPromises.push(
            uploadToCloudinary(files.video[0], 'courses/videos').then((result) => ({
              type: 'video',
              result
            }))
          );
        }
        if (files.brochure) {
          uploadPromises.push(
            uploadToCloudinary(files.brochure[0], 'courses/brochures', 'raw', 'pdf').then(
              (result) => ({ type: 'brochure', result })
            )
          );
        }

        const uploadResults = await Promise.all(uploadPromises);

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

        const parseJsonField = (value) => {
          if (!value) return {};
          try {
            return typeof value === 'string' ? JSON.parse(value) : value;
          } catch {
            return {};
          }
        };

        const parsedKeyHighlights = parseJsonField(req.body.keyHighlights);
        const parsedWhyChoose = parseJsonField(req.body.whyChoose);
        const parsedHowItHelps = parseJsonField(req.body.howItHelps);
        const parsedExtraFields = parseJsonField(req.body.extraFields);

        const onlineActual = parseFloat(onlineActualPrice) || 0;
        const onlineDiscount = parseFloat(onlineDiscountPercent) || 0;
        const onlineHasDiscount = onlineDiscount > 0;
        const onlineDiscountedPrice = onlineHasDiscount
          ? onlineActual - (onlineActual * onlineDiscount) / 100
          : onlineActual;

        const offlineActual = parseFloat(offlineActualPrice) || 0;
        const offlineDiscount = parseFloat(offlineDiscountPercent) || 0;
        const offlineHasDiscount = offlineDiscount > 0;
        const offlineDiscountedPrice = offlineHasDiscount
          ? offlineActual - (offlineActual * offlineDiscount) / 100
          : offlineActual;

        const course = await Course.create({
          title,
          center,
          category,
          description,
          startDate: parsedStartDate,
          duration,
          batchStartDate: batchStartDate ? new Date(batchStartDate) : null,
          batchEndDate: batchEndDate ? new Date(batchEndDate) : null,
          accessValidityInDays: accessValidityInDays ? parseInt(accessValidityInDays, 10) : null,
          recordedContentValidityInDays: recordedContentValidityInDays
            ? parseInt(recordedContentValidityInDays, 10)
            : null,
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
          highlightImage: highlightImage
            ? { url: highlightImage.url, public_id: highlightImage.public_id }
            : null,
          sectionImage: sectionImage
            ? { url: sectionImage.url, public_id: sectionImage.public_id }
            : null,
          galleryImages,
          promoVideo,
          brochure,
          keyHighlights: parsedKeyHighlights,
          whyChoose: parsedWhyChoose,
          howItHelps: parsedHowItHelps,
          extraFields: parsedExtraFields,
          createdBy: user._id
        });

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
    ```

    ### Create flow (summary)

    ```txt
    1. JWT protect + role check (super_admin | center_admin)
    2. Validate title, center, category + banner file
    3. Center admin: must own that center
    4. Parallel Cloudinary uploads (banner required)
    5. Parse JSON strings: keyHighlights, whyChoose, howItHelps, extraFields, modes
    6. Auto-calculate online/offline discountedPrice + hasDiscount
    7. Course.create() → slug auto-generated on save
    8. Return populated course (center + category names)
    ```

    ### Required `.env` variables

    ```env
    CLOUDINARY_CLOUD_NAME=your_cloud_name
    CLOUDINARY_API_KEY=your_api_key
    CLOUDINARY_API_SECRET=your_api_secret
    JWT_SECRET=your_jwt_secret
    ```

    ### Multipart field names (must match exactly)

    | Form field | Required | Max |
    |------------|----------|-----|
    | `banner` | Yes | 1 |
    | `highlight` | No | 1 |
    | `section` | No | 1 |
    | `gallery` | No | 5 |
    | `video` | No | 1 |
    | `brochure` | No | 1 (PDF) |

    > **Note:** `startDate` is accepted in the controller body but is not in the Course schema — use `batchStartDate` / `batchEndDate` for stored dates. For full course CRUD source, see also `DOC_1_COURSE_ENROLLMENT_TEST_SERIES_COMPLETE.md`.

    ---

    ## 🧪 Step-by-Step API Testing

    ### Prerequisites

    1. **Get Authentication Token (for admin routes):**
    ```bash
    POST http://localhost:5000/api/auth/login
    Body: { "email": "admin@example.com", "password": "yourpassword" }
    ```
    Save the `token` from response.

    2. **Get Center ID:**
    ```bash
    GET http://localhost:5000/api/centers
    ```
    Save a center `_id`.

    3. **Get Category ID:**
    ```bash
    GET http://localhost:5000/api/categories
    ```
    Save a category `_id`.

    ---

    ### Test 1: Create Course (Admin Only)

    ```bash
    POST http://localhost:5000/api/courses
    Authorization: Bearer YOUR_TOKEN
    Content-Type: multipart/form-data
    ```

    **Form Data:**
    ```
    title: UPSC GS Foundation Course
    center: YOUR_CENTER_ID
    category: YOUR_CATEGORY_ID
    description: Comprehensive GS Foundation course for UPSC CSE
    duration: 2 Years
    batchStartDate: 2026-06-01
    batchEndDate: 2028-06-01
    accessValidityInDays: 730
    recordedContentValidityInDays: 365

    // Fee Structure (NEW)
    onlineActualPrice: 150000
    onlineDiscountPercent: 20
    onlineOfferText: Summer Sale 2026
    offlineActualPrice: 200000
    offlineDiscountPercent: 0
    offlineOfferText:
    feesDescription: Installment options available
    modes: ["online", "offline"]

    keyHighlights: {
    "keyTitle": "Key Highlights",
    "keyHighlightTexts": [
        "Live Interactive Classes",
        "Recorded Backup Sessions",
        "Personal Mentorship",
        "Daily Current Affairs"
    ]
    }

    whyChoose: {
    "whyChooseTitle": "Why Choose Us",
    "whyChooseItems": [
        {
            "whyChooseText": "Expert Faculty",
            "whyChooseContent": "Learn from retired IAS officers"
        },
        {
            "whyChooseText": "Proven Results",
            "whyChooseContent": "500+ selections in last 5 years"
        }
    ]
    }

    howItHelps: {
    "howItHelpsTitle": "How It Helps",
    "howItHelpsTexts": [
        "Complete syllabus coverage",
        "Answer writing practice",
        "Mock interviews"
    ]
    }

    features: ["Live Classes", "Recorded Videos", "Test Series", "Mentorship"]
    isFeatured: true
    isActive: true

    // Files (Required & Optional)
    banner: [Select Image File]          // REQUIRED
    highlight: [Select Image File]       // Optional
    section: [Select Image File]         // Optional
    gallery: [Select up to 5 Images]     // Optional
    video: [Select Video File]           // Optional
    brochure: [Select PDF File]          // Optional
    ```

    **Expected Response (201):**
    ```json
    {
    "success": true,
    "message": "Course created successfully",
    "course": {
        "_id": "course_id_here",
        "title": "UPSC GS Foundation Course",
        "slug": "upsc-gs-foundation-course-1234567890",
        "center": "...",
        "category": "...",
        "bannerImage": {
            "url": "https://res.cloudinary.com/.../banner.jpg",
            "public_id": "courses/banners/xyz123"
        },
        "fees": {
            "online": {
                "actualPrice": 150000,
                "discountPercent": 20,
                "discountedPrice": 120000,
                "hasDiscount": true,
                "offerText": "Summer Sale 2026"
            },
            "offline": {
                "actualPrice": 200000,
                "discountPercent": 0,
                "discountedPrice": 200000,
                "hasDiscount": false,
                "offerText": ""
            },
            "description": "Installment options available"
        },
        ...
    }
    }
    ```

    **✅ Save the course `_id` for next tests.**

    ---

    ### Test 2: Get All Courses (Public)

    ```bash
    GET http://localhost:5000/api/courses
    ```

    **Expected Response (200):**
    ```json
    {
    "success": true,
    "count": 5,
    "data": [
        {
            "_id": "...",
            "title": "UPSC GS Foundation Course",
            "slug": "...",
            "center": {
                "_id": "...",
                "name": "Pune Center"
            },
            "category": {
                "_id": "...",
                "name": "GS Foundation"
            },
            "bannerImage": {
                "url": "https://res.cloudinary.com/...",
                "public_id": "..."
            },
            "fees": {
                "online": 150000,
                "offline": 200000
            },
            "isActive": true,
            "isFeatured": true
        }
    ]
    }
    ```

    ---

    ### Test 3: Filter Courses by Center & Category

    ```bash
    GET http://localhost:5000/api/courses?centerName=Pune&categoryName=GS Foundation
    ```

    **Query Parameters:**
    | Parameter | Type | Description |
    |-----------|------|-------------|
    | `centerName` | String | Filter by center name (case-insensitive) |
    | `categoryName` | String | Filter by category name (case-insensitive) |
    | `isActive` | Boolean | Filter by active status |

    ---

    ### Test 4: Get Courses for Enquiry Form (Public)

    ```bash
    GET http://localhost:5000/api/courses/enquiry?centerName=Pune&categoryName=GS Foundation
    ```

    **Expected Response (200):**
    ```json
    {
    "success": true,
    "count": 3,
    "courses": [
        {
            "_id": "course_id_1",
            "title": "UPSC GS Foundation Course"
        },
        {
            "_id": "course_id_2",
            "title": "UPSC Optional Geography"
        },
        {
            "_id": "course_id_3",
            "title": "UPSC Test Series"
        }
    ]
    }
    ```

    **Purpose:** Returns only `_id` and `title` for dropdown in enquiry forms.

    ---

    ### Test 5: Get Courses Grouped (Public)

    ```bash
    GET http://localhost:5000/api/courses/grouped
    ```

    **Expected Response (200):**
    ```json
    {
    "success": true,
    "data": {
        "Pune Center": {
            "GS Foundation": [
                { "_id": "...", "title": "UPSC GS Foundation" },
                { "_id": "...", "title": "GS Foundation Test Series" }
            ],
            "Optional Subjects": [
                { "_id": "...", "title": "Geography Optional" }
            ]
        },
        "Delhi Center": {
            "GS Foundation": [
                { "_id": "...", "title": "UPSC GS Foundation" }
            ]
        }
    }
    }
    ```

    ---

    ### Test 6: Get Single Course by ID (Public)

    ```bash
    GET http://localhost:5000/api/courses/COURSE_ID
    ```

    **Expected Response (200):**
    ```json
    {
    "success": true,
    "data": {
        "_id": "...",
        "title": "UPSC GS Foundation Course",
        "slug": "upsc-gs-foundation-course-1234567890",
        "center": {
            "_id": "...",
            "name": "Pune Center",
            "address": "Pune, Maharashtra"
        },
        "category": {
            "_id": "...",
            "name": "GS Foundation"
        },
        "description": "Comprehensive GS Foundation course...",
        "batchStartDate": "2026-06-01T00:00:00.000Z",
        "batchEndDate": "2028-06-01T00:00:00.000Z",
        "duration": "2 Years",
        "accessValidityInDays": 730,
        "recordedContentValidityInDays": 365,
        "fees": {
            "online": 150000,
            "offline": 200000,
            "description": "Installment options available"
        },
        "modes": ["online", "offline"],
        "bannerImage": {
            "url": "https://res.cloudinary.com/...",
            "public_id": "courses/banners/xyz123"
        },
        "highlightImage": { ... },
        "sectionImage": { ... },
        "galleryImages": [
            { "url": "...", "public_id": "..." },
            { "url": "...", "public_id": "..." }
        ],
        "promoVideo": { ... },
        "brochure": { ... },
        "keyHighlights": {
            "keyTitle": "Key Highlights",
            "keyHighlightTexts": [
                "Live Interactive Classes",
                "Recorded Backup Sessions"
            ]
        },
        "whyChoose": {
            "whyChooseTitle": "Why Choose Us",
            "whyChooseItems": [
                {
                "whyChooseText": "Expert Faculty",
                "whyChooseContent": "Learn from retired IAS officers"
                }
            ]
        },
        "howItHelps": {
            "howItHelpsTitle": "How It Helps",
            "howItHelpsTexts": [
                "Complete syllabus coverage",
                "Answer writing practice"
            ]
        },
        "features": ["Live Classes", "Recorded Videos"],
        "isActive": true,
        "isFeatured": true,
        "createdAt": "...",
        "updatedAt": "..."
    }
    }
    ```

    ---

    ### Test 7: Get Course by Slug (Public)

    ```bash
    GET http://localhost:5000/api/courses/slug/upsc-gs-foundation-course-1234567890
    ```

    **Expected Response (200):** Same as Test 6

    **Purpose:** SEO-friendly URLs for frontend routing.

    ---

    ### Test 8: Update Course (Admin Only)

    ```bash
    PUT http://localhost:5000/api/courses/COURSE_ID
    Authorization: Bearer YOUR_TOKEN
    Content-Type: multipart/form-data
    ```

    **Form Data (Partial Update - only send fields you want to update):**
    ```
    title: UPSC GS Foundation Course 2026
    onlineFees: 160000
    offlineFees: 210000
    isFeatured: true

    // Optional: Replace images
    banner: [New Image File]        // Replaces old banner
    highlight: [New Image File]     // Replaces old highlight

    // Optional: Add new gallery images
    gallery: [New Image 1, New Image 2]

    keyHighlights: {
    "keyTitle": "Updated Highlights",
    "keyHighlightTexts": [
        "New Feature 1",
        "New Feature 2"
    ]
    }
    ```

    **Expected Response (200):**
    ```json
    {
    "success": true,
    "message": "Course updated successfully",
    "data": {
        "_id": "...",
        "title": "UPSC GS Foundation Course 2026",
        "fees": {
            "online": 160000,
            "offline": 210000
        },
        ...
    }
    }
    ```

    ---

    ### Test 9: Delete Course (Super Admin Only)

    ```bash
    DELETE http://localhost:5000/api/courses/COURSE_ID
    Authorization: Bearer YOUR_TOKEN
    ```

    **Expected Response (200):**
    ```json
    {
    "success": true,
    "message": "Course deleted successfully"
    }
    ```

    **⚠️ Note:** Only `super_admin` can delete courses. `center_admin` cannot delete.

    ---

    ### Test 10: Create Course with All Media (Complete Example)

    ```bash
    POST http://localhost:5000/api/courses
    Authorization: Bearer YOUR_TOKEN
    Content-Type: multipart/form-data
    ```

    **Form Data:**
    ```
    title: Complete UPSC Preparation
    center: CENTER_ID
    category: CATEGORY_ID
    description: All-in-one UPSC preparation course
    duration: 3 Years
    batchStartDate: 2026-07-01
    batchEndDate: 2029-07-01
    onlineFees: 250000
    offlineFees: 350000
    modes: ["online", "offline", "hybrid"]

    keyHighlights: {
    "keyTitle": "What You Get",
    "keyHighlightTexts": [
        "Prelims + Mains + Interview",
        "Optional Subject Included",
        "Daily Current Affairs",
        "Weekly Test Series",
        "Personal Mentorship"
    ]
    }

    whyChoose: {
    "whyChooseTitle": "Our Advantages",
    "whyChooseItems": [
        {
            "whyChooseText": "Top Faculty",
            "whyChooseContent": "Ex-IAS, retired professors"
        },
        {
            "whyChooseText": "Success Rate",
            "whyChooseContent": "30% selection rate"
        },
        {
            "whyChooseText": "Study Material",
            "whyChooseContent": "Comprehensive printed + digital notes"
        }
    ]
    }

    howItHelps: {
    "howItHelpsTitle": "Student Benefits",
    "howItHelpsTexts": [
        "Structured learning path",
        "Regular assessments",
        "Doubt clearing sessions",
        "Interview guidance"
    ]
    }

    features: ["Live Classes", "Recorded Videos", "Test Series", "Mentorship", "Study Material", "Interview Prep"]
    isFeatured: true
    isActive: true

    // Files
    banner: [High-quality banner image]
    highlight: [Highlight section image]
    section: [Section header image]
    gallery: [Campus photo 1, Campus photo 2, Classroom photo, Library photo]
    video: [Promotional video MP4]
    brochure: [Course brochure PDF]
    ```

    ---

    ## 🔄 Public vs Admin Routes

    ### Public Routes (No Token Needed)

    ✅ **Anyone can access these:**

    ```bash
    # Get all courses
    GET /api/courses

    # Filter courses
    GET /api/courses?centerName=Pune&categoryName=GS Foundation

    # Get for enquiry dropdown
    GET /api/courses/enquiry?centerName=Pune

    # Get grouped by center/category
    GET /api/courses/grouped

    # Get by ID
    GET /api/courses/COURSE_ID

    # Get by slug
    GET /api/courses/slug/course-slug-here

    # Find by ID (POST)
    POST /api/courses/find
    Body: { "courseId": "COURSE_ID" }
    ```

    ### Admin Routes (Token Required)

    🔒 **Only Super Admin & Center Admin:**

    ```bash
    # Create course
    POST /api/courses
    Headers: Authorization: Bearer TOKEN
    Content-Type: multipart/form-data

    # Update course
    PUT /api/courses/COURSE_ID
    Headers: Authorization: Bearer TOKEN
    Content-Type: multipart/form-data

    # Delete course (Super Admin only)
    DELETE /api/courses/COURSE_ID
    Headers: Authorization: Bearer TOKEN
    ```

    ---

    ## 💻 Frontend Integration

    ### 1. Create Course (React + Axios)

    ```javascript
    const createCourse = async (formData) => {
    try {
        const response = await axios.post(
            'http://localhost:5000/api/courses',
            formData,
            {
                headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
                }
            }
        );
        
        console.log('Course created:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating course:', error.response.data);
        throw error;
    }
    };

    // Usage
    const formData = new FormData();
    formData.append('title', 'UPSC GS Foundation');
    formData.append('center', centerId);
    formData.append('category', categoryId);
    formData.append('onlineFees', 150000);
    formData.append('banner', bannerFile);
    formData.append('keyHighlights', JSON.stringify({
    keyTitle: 'Highlights',
    keyHighlightTexts: ['Live Classes', 'Recorded Videos']
    }));

    await createCourse(formData);
    ```

    ### 2. Get Courses (Public)

    ```javascript
    const getCourses = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        
        if (filters.centerName) params.append('centerName', filters.centerName);
        if (filters.categoryName) params.append('categoryName', filters.categoryName);
        
        const response = await axios.get(
            `http://localhost:5000/api/courses?${params}`
        );
        
        return response.data.data;
    } catch (error) {
        console.error('Error fetching courses:', error);
        throw error;
    }
    };

    // Usage
    const courses = await getCourses({
    centerName: 'Pune',
    categoryName: 'GS Foundation'
    });
    ```

    ### 3. Get Courses for Enquiry Dropdown

    ```javascript
    const getCoursesForEnquiry = async (centerName, categoryName) => {
    try {
        const params = new URLSearchParams();
        
        if (centerName) params.append('centerName', centerName);
        if (categoryName && categoryName !== 'All') {
            params.append('categoryName', categoryName);
        }
        
        const response = await axios.get(
            `http://localhost:5000/api/courses/enquiry?${params}`
        );
        
        return response.data.courses;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
    };

    // Usage
    const courseOptions = await getCoursesForEnquiry('Pune', 'GS Foundation');
    // Returns: [{ _id: "...", title: "..." }, ...]
    ```

    ### 4. Get Single Course

    ```javascript
    const getCourseById = async (courseId) => {
    try {
        const response = await axios.get(
            `http://localhost:5000/api/courses/${courseId}`
        );
        
        return response.data.data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
    };
    ```

    ---

    ## 📝 Important Notes

    ### File Upload Limits
    - **Banner Image:** Required (1 file)
    - **Highlight Image:** Optional (1 file)
    - **Section Image:** Optional (1 file)
    - **Gallery Images:** Optional (max 5 files)
    - **Promo Video:** Optional (1 file)
    - **Brochure PDF:** Optional (1 file)

    ### Role-Based Access
    - **Super Admin:** Can create, update, delete ANY course
    - **Center Admin:** Can only create/update courses for THEIR center
    - **Public:** Can view all active courses

    ### Auto-Generated Fields
    - **slug:** Automatically generated from title + timestamp
    - **createdAt/updatedAt:** Automatically managed by Mongoose

    ### Cloudinary Uploads
    All media files are uploaded to Cloudinary in the following folders:
    - `courses/banners/` - Banner images
    - `courses/highlights/` - Highlight images
    - `courses/sections/` - Section images
    - `courses/gallery/` - Gallery images
    - `courses/videos/` - Promo videos
    - `courses/brochures/` - PDF brochures

    ### 💰 Auto-Calculated Pricing System

    **IMPORTANT:** Backend always calculates `discountedPrice`. Never trust frontend calculations!

    #### CREATE API - Fee Fields:
    ```
    onlineActualPrice: 100000        // Required
    onlineDiscountPercent: 20        // Optional (0 = no discount)
    onlineOfferText: Summer Sale     // Optional

    offlineActualPrice: 150000
    offlineDiscountPercent: 0
    offlineOfferText:
    ```

    #### Backend Auto-Calculates:
    ```json
    {
    "fees": {
        "online": {
            "actualPrice": 100000,
            "discountPercent": 20,
            "discountedPrice": 80000,      // ✅ Auto-calculated
            "hasDiscount": true,            // ✅ Auto-calculated
            "offerText": "Summer Sale"
        },
        "offline": {
            "actualPrice": 150000,
            "discountPercent": 0,
            "discountedPrice": 150000,     // ✅ Same as actual (no discount)
            "hasDiscount": false,           // ✅ Auto-calculated
            "offerText": ""
        }
    }
    }
    ```

    #### Frontend Display Logic:
    ```javascript
    // Always show this price
    ₹{course.fees.online.discountedPrice}

    // Show discount badge only if hasDiscount is true
    {course.fees.online.hasDiscount && (
    <>
        <span>{course.fees.online.discountPercent}% OFF</span>
        <del>₹{course.fees.online.actualPrice}</del>
    </>
    )}

    // Show offer text if exists
    {course.fees.online.offerText && (
    <p>{course.fees.online.offerText}</p>
    )}
    ```

    #### CASE 1: With Discount
    **Admin Input:**
    ```
    onlineActualPrice: 100000
    onlineDiscountPercent: 20
    ```

    **Frontend Shows:**
    ```
    ₹80,000   ₹1,00,000
    20% OFF - Summer Sale
    ```

    #### CASE 2: No Discount
    **Admin Input:**
    ```
    onlineActualPrice: 100000
    onlineDiscountPercent: 0
    ```

    **Frontend Shows:**
    ```
    ₹1,00,000
    ```
    (NO strike price, NO OFF badge)

    ---

    ## 🎯 Common Use Cases

    ### 1. Course Listing Page (Public)
    ```bash
    GET /api/courses?isActive=true
    ```

    ### 2. Course Detail Page (Public)
    ```bash
    GET /api/courses/COURSE_ID
    ```

    ### 3. Enquiry Form Dropdown (Public)
    ```bash
    GET /api/courses/enquiry?centerName=Pune&categoryName=GS Foundation
    ```

    ### 4. Admin Course Management
    ```bash
    # Create
    POST /api/courses (with token + files)

    # Update
    PUT /api/courses/COURSE_ID (with token + files)

    # Delete
    DELETE /api/courses/COURSE_ID (with token, super_admin only)
    ```

    ### 5. Center Dashboard (Grouped View)
    ```bash
    GET /api/courses/grouped
    ```

    ---

    ## 🚀 Quick Testing Checklist

    - [ ] Create course with all fields and files ✅
    - [ ] Get all courses (public) ✅
    - [ ] Filter by center & category ✅
    - [ ] Get courses for enquiry form ✅
    - [ ] Get single course by ID ✅
    - [ ] Get course by slug ✅
    - [ ] Update course (partial update) ✅
    - [ ] Update course (replace images) ✅
    - [ ] Delete course (super_admin only) ✅
    - [ ] Get grouped courses ✅

    ---

    ---

    ## Complete Source Code — Academic ERP Course Updates

    ### `utils/courseHierarchyValidation.js`

    ```javascript
    const Program = require('../models/Program');
    const AcademicCategory = require('../models/AcademicCategory');
    const AcademicSubCategory = require('../models/AcademicSubCategory');
    const { findActiveCenter } = require('./academicHierarchyHelpers');
    const { isValidObjectId } = require('./courseIdGenerator');

    const validateCourseHierarchy = async ({
      centerId,
      programId,
      categoryId,
      subCategoryId
    }) => {
      if (!isValidObjectId(centerId)) {
        return { ok: false, status: 400, message: 'Invalid centerId' };
      }
      if (!isValidObjectId(programId)) {
        return { ok: false, status: 400, message: 'Invalid programId' };
      }
      if (!isValidObjectId(categoryId)) {
        return { ok: false, status: 400, message: 'Invalid categoryId' };
      }
      if (!isValidObjectId(subCategoryId)) {
        return { ok: false, status: 400, message: 'Invalid subCategoryId' };
      }

      const center = await findActiveCenter(centerId);
      if (!center) {
        return { ok: false, status: 400, message: 'Invalid or inactive center' };
      }

      const program = await Program.findOne({ _id: programId, status: 'ACTIVE' }).lean();
      if (!program) {
        return { ok: false, status: 400, message: 'Invalid or inactive program' };
      }

      const programHasCenter = (program.centers || []).some(
        (c) => String(c) === String(centerId)
      );
      if (!programHasCenter) {
        return {
          ok: false,
          status: 400,
          message: 'Selected program is not available for the selected center'
        };
      }

      const category = await AcademicCategory.findOne({
        _id: categoryId,
        centerId,
        programId,
        status: 'ACTIVE'
      }).lean();

      if (!category) {
        return {
          ok: false,
          status: 400,
          message: 'Invalid category for the selected center and program'
        };
      }

      const subCategory = await AcademicSubCategory.findOne({
        _id: subCategoryId,
        centerId,
        programId,
        categoryId,
        status: 'ACTIVE'
      }).lean();

      if (!subCategory) {
        return {
          ok: false,
          status: 400,
          message: 'Invalid subCategory for the selected center, program, and category'
        };
      }

      return { ok: true, center, program, category, subCategory };
    };

    module.exports = { validateCourseHierarchy };
    ```

    ### `utils/courseIdGenerator.js`

    ```javascript
    const mongoose = require('mongoose');
    const Course = require('../models/Course');

    const parseNumericSuffix = (value, prefix) => {
      if (!value || typeof value !== 'string') return 0;
      const match = value.match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
      return match ? parseInt(match[1], 10) : 0;
    };

    const generateCourseId = async () => {
      const latest = await Course.findOne({ courseId: /^CRS\d+$/i })
        .sort({ courseId: -1 })
        .select('courseId')
        .lean();
      const next = parseNumericSuffix(latest?.courseId, 'CRS') + 1;
      return `CRS${String(next).padStart(3, '0')}`;
    };

    const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

    module.exports = { generateCourseId, isValidObjectId };
    ```

    ### `utils/coursePayloadHelpers.js`

    ```javascript
    const safeParseJson = (value, fallback = null) => {
      if (value === undefined || value === null || value === '') return fallback;
      if (typeof value === 'object') return value;
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    };

    const resolveCourseName = (body) => {
      const name = body.courseName || body.title;
      return name?.trim() || '';
    };

    const resolveCenterId = (body) => body.centerId || body.center || null;
    const resolveProgramId = (body) => body.programId || body.program || null;
    const resolveCategoryId = (body) => body.categoryId || body.academicCategory || null;
    const resolveSubCategoryId = (body) => body.subCategoryId || body.academicSubCategory || null;

    const resolveCourseStatus = (body) => {
      if (body.status === 'INACTIVE') return 'INACTIVE';
      if (body.status === 'ACTIVE') return 'ACTIVE';
      if (body.isActive === false || body.isActive === 'false') return 'INACTIVE';
      return 'ACTIVE';
    };

    const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const courseListPopulate = [
      { path: 'center', select: 'centerName name city' },
      { path: 'program', select: 'programId programName' },
      { path: 'academicCategory', select: 'categoryId categoryName' },
      { path: 'academicSubCategory', select: 'subCategoryId subCategoryName' },
      { path: 'category', select: 'name' }
    ];

    module.exports = {
      safeParseJson,
      resolveCourseName,
      resolveCenterId,
      resolveProgramId,
      resolveCategoryId,
      resolveSubCategoryId,
      resolveCourseStatus,
      escapeRegex,
      courseListPopulate
    };
    ```

    ### `createCourse` — hierarchy block (excerpt from `controllers/courseController.js`)

    ```javascript
    const courseName = resolveCourseName(req.body);
    const centerId = resolveCenterId(req.body);
    const programId = resolveProgramId(req.body);
    const categoryId = resolveCategoryId(req.body);
    const subCategoryId = resolveSubCategoryId(req.body);

    const hierarchy = await validateCourseHierarchy({
      centerId,
      programId,
      categoryId,
      subCategoryId
    });
    if (!hierarchy.ok) {
      return res.status(hierarchy.status).json({ success: false, message: hierarchy.message });
    }

    const course = await Course.create({
      courseId: await generateCourseId(),
      courseName,
      title: courseName,
      center: centerId,
      program: programId,
      academicCategory: categoryId,
      academicSubCategory: subCategoryId,
      courseOverview: req.body.courseOverview || req.body.description || '',
      keyFeatures: safeParseJson(req.body.keyFeatures, []),
      whyChooseSection: safeParseJson(req.body.whyChooseSection, {}),
      helpSections: safeParseJson(req.body.helpSections, []),
      status: resolveCourseStatus(req.body),
      // ... fees, media, legacy sections ...
    });
    ```

    ### Sample `multipart/form-data` body (create)

    ```text
    courseName: GS Foundation Batch 2026
    centerId: <CENTER_OBJECT_ID>
    programId: <PROGRAM_OBJECT_ID>
    categoryId: <ACADEMIC_CATEGORY_OBJECT_ID>
    subCategoryId: <ACADEMIC_SUBCATEGORY_OBJECT_ID>
    courseOverview: Complete UPSC foundation course
    status: ACTIVE
    keyFeatures: [{"image":"https://res.cloudinary.com/.../f1.png","points":["Daily tests","Mentorship"]}]
    whyChooseSection: {"title":"Why Us","subtitle":"Best faculty","featureCards":[]}
    helpSections: [{"video":"https://...mp4","image1":"https://...jpg","image2":""}]
    onlineActualPrice: 50000
    onlineDiscountPercent: 10
    banner: <FILE>
    ```

    ---

    **Last Updated:** May 26, 2026  
    **Version:** 2.0 (Academic ERP hierarchy + CMS fields + cascading dropdowns)  
    **Status:** Production Ready ✅
