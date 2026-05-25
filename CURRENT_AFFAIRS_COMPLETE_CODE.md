# Current Affairs — Complete Code & API Guide

> **Project:** Sriram-IAS  
> **Module:** Free Resources → **Current Affairs** tab  
> **moduleType:** `CURRENT_AFFAIRS` on `ResourceCategory`  
> **Same `Resource` table** as NCERT/PYQ (no separate Current Affairs table)

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

```text
Student UI tabs:
  ├── Current Affairs     → moduleType: CURRENT_AFFAIRS
  └── Free Resources      → moduleType: FREE_RESOURCES (NCERT, PYQ, etc.)

Admin CMS:     /api/resources/*  (create category, filters, upload PDFs)
Student read:  /api/portal/free-resources/*
```

### Current Affairs filters (portal)

| UI filter | Filter.type in DB | Resource field |
|-----------|-------------------|----------------|
| Year | YEAR | yearId |
| Month | MONTH | monthId |
| Type (Daily / Magazine / Infographic) | CURRENT_AFFAIRS_TYPE | currentAffairsTypeId (API: typeId) |

### resourceType on uploads

`PDF` | `ARTICLE` | `MAGAZINE` | `INFOGRAPHIC` | `VIDEO` (default PDF)

---

## 2. Data Model

```text
ResourceCategory { name, moduleType: "CURRENT_AFFAIRS", thumbnail }
       ↓
Filter { type: YEAR | MONTH | CURRENT_AFFAIRS_TYPE, value, categoryId }
       ↓
Resource { title, fileUrl, categoryId, yearId, monthId, currentAffairsTypeId, resourceType }
```

---

## 3. Admin CMS Flow

### Step 1 — Create category

```http
POST /api/resources/categories
Authorization: Bearer {{adminToken}}
Content-Type: multipart/form-data

name=Daily Current Affairs
moduleType=CURRENT_AFFAIRS
description=Daily updates
thumbnail=<file optional>
```

### Step 2 — Create filters

```http
POST /api/resources/filters
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

```json
{ "type": "YEAR", "value": "2026", "categoryId": "{{categoryId}}" }
{ "type": "MONTH", "value": "May", "categoryId": "{{categoryId}}" }
{ "type": "CURRENT_AFFAIRS_TYPE", "value": "Daily Current Affairs", "categoryId": "{{categoryId}}" }
```

### Step 3 — Upload PDF resource

```http
POST /api/resources/files
Authorization: Bearer {{adminToken}}
multipart: file, title, categoryId, yearId, monthId, typeId, resourceType=PDF
```

(`typeId` is stored as `currentAffairsTypeId`.)

**Validation:** `yearId` is required when category `moduleType === CURRENT_AFFAIRS`.

---

## 4. Portal / Student APIs

| Method | Endpoint |
|--------|----------|
| GET | `/api/portal/free-resources/home` → `currentAffairs[]` |
| GET | `/api/portal/free-resources/categories?moduleType=CURRENT_AFFAIRS` |
| GET | `/api/portal/free-resources/filters?moduleType=CURRENT_AFFAIRS` |
| GET | `/api/portal/free-resources/resources?moduleType=CURRENT_AFFAIRS&yearId=&monthId=&typeId=` |
| GET | `/api/portal/free-resources/resources/:id` |
| GET | `/api/portal/free-resources/resources/:id/view` |
| GET | `/api/portal/free-resources/resources/:id/download` |

### Filters response

```json
{
  "success": true,
  "data": {
    "years": [{ "_id": "", "value": "2026", "type": "YEAR" }],
    "months": [{ "_id": "", "value": "May", "type": "MONTH" }],
    "types": [{ "_id": "", "value": "Daily Current Affairs", "type": "CURRENT_AFFAIRS_TYPE" }]
  }
}
```

### List response (cards)

```json
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
```

---

## 5. Filter Types

Enum on `Filter` model:

```text
SUBJECT | CLASS | PAPER | YEAR | MONTH | CURRENT_AFFAIRS_TYPE
```

Current Affairs uses: **YEAR**, **MONTH**, **CURRENT_AFFAIRS_TYPE**

---

## 6. Constants

## 7. Models

## 8. Controllers & Services

## 9. Routes

### 6. Constants

**File:** `utils/resourceConstants.js`

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
  STUDY_MATERIAL: 'study material'
};

module.exports = {
  MODULE_TYPES,
  RESOURCE_TYPES,
  FILTER_TYPES,
  CATEGORY_NAME_HINTS
};

```

---

### 7.1 ResourceCategory

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

---

### 7.2 Filter

**File:** `models/Filter.js`

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

---

### 7.3 Resource

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

---

### 7.4 ResourceDownload

**File:** `models/ResourceDownload.js`

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

---

### 7.5 ResourceViewHistory

**File:** `models/ResourceViewHistory.js`

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

---

### 8.1 filterController

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

### 8.2 resourceCategoryController (moduleType)

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

---

### 8.3 resourceController (CA validation)

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

---

### 8.4 resourceService (CA logic)

**File:** `services/resourceService.js`

```javascript
const ResourceCategory = require('../models/ResourceCategory');
const SubCategory = require('../models/SubCategory');
const Filter = require('../models/Filter');
const Resource = require('../models/Resource');
const ResourceDownload = require('../models/ResourceDownload');
const ResourceViewHistory = require('../models/ResourceViewHistory');
const {
  MODULE_TYPES,
  FILTER_TYPES,
  CATEGORY_NAME_HINTS
} = require('../utils/resourceConstants');
const cache = require('../utils/resourcePortalCache');

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
  return 'GENERIC';
};

const formatFilterOption = (f) => ({
  _id: f._id,
  value: f.value,
  type: f.type
});

const formatPortalCategory = (cat) => ({
  _id: cat._id,
  name: cat.name,
  description: cat.description,
  moduleType: cat.moduleType || MODULE_TYPES.FREE_RESOURCES,
  thumbnail: cat.thumbnail?.url || null
});

const formatPortalResourceCard = (doc) => ({
  _id: doc._id,
  title: doc.title,
  description: doc.description,
  resourceType: doc.resourceType || 'PDF',
  pdfUrl: doc.fileUrl?.url || null,
  thumbnail: doc.thumbnail?.url || null,
  downloads: doc.downloads || 0,
  categoryId: doc.categoryId?._id || doc.categoryId,
  categoryName: doc.categoryId?.name || null,
  subCategoryId: doc.subCategoryId?._id || doc.subCategoryId || null,
  subCategoryName: doc.subCategoryId?.name || null,
  filters: {
    subject: doc.subjectId?.value || null,
    class: doc.classId?.value || null,
    paper: doc.paperId?.value || null,
    year: doc.yearId?.value || null,
    month: doc.monthId?.value || null,
    type: doc.currentAffairsTypeId?.value || null
  },
  createdAt: doc.createdAt
});

const formatPortalResourceDetail = (doc) => ({
  ...formatPortalResourceCard(doc),
  fileType: doc.fileType,
  fileSize: doc.fileSize
});

const activeCategoryFilter = () => ({ isActive: true });

const getPortalHome = async () => {
  const cacheKey = cache.buildKey('portal:home', {});
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const categories = await ResourceCategory.find(activeCategoryFilter())
    .select('name description moduleType thumbnail')
    .sort({ createdAt: -1 })
    .lean();

  const payload = {
    currentAffairs: categories
      .filter((c) => c.moduleType === MODULE_TYPES.CURRENT_AFFAIRS)
      .map(formatPortalCategory),
    freeResources: categories
      .filter((c) => c.moduleType === MODULE_TYPES.FREE_RESOURCES)
      .map(formatPortalCategory)
  };

  cache.set(cacheKey, payload);
  return payload;
};

const getPortalCategories = async ({ moduleType } = {}) => {
  const cacheKey = cache.buildKey('portal:categories', { moduleType: moduleType || 'all' });
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const filter = activeCategoryFilter();
  if (moduleType) filter.moduleType = moduleType;

  const categories = await ResourceCategory.find(filter)
    .select('name description moduleType thumbnail')
    .sort({ createdAt: -1 })
    .lean();

  const formatted = categories.map(formatPortalCategory);

  const payload = moduleType
    ? { categories: formatted }
    : {
        currentAffairs: formatted.filter((c) => c.moduleType === MODULE_TYPES.CURRENT_AFFAIRS),
        freeResources: formatted.filter((c) => c.moduleType === MODULE_TYPES.FREE_RESOURCES)
      };

  cache.set(cacheKey, payload);
  return payload;
};

const groupFiltersByType = (filters) =>
  filters.reduce((acc, f) => {
    if (!acc[f.type]) acc[f.type] = [];
    acc[f.type].push(formatFilterOption(f));
    return acc;
  }, {});

const getPortalFilters = async ({ moduleType, categoryId, subCategoryId } = {}) => {
  const cacheKey = cache.buildKey('portal:filters', { moduleType, categoryId, subCategoryId });
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let category = null;
  if (categoryId) {
    category = await ResourceCategory.findOne({ _id: categoryId, ...activeCategoryFilter() }).lean();
    if (!category) return null;
  }

  const resolvedModuleType = moduleType || category?.moduleType;
  const filterQuery = { isActive: true };
  if (categoryId) filterQuery.categoryId = categoryId;
  if (subCategoryId) filterQuery.subCategoryId = subCategoryId;

  const filters = await Filter.find(filterQuery).sort({ type: 1, value: 1 }).lean();
  const grouped = groupFiltersByType(filters);

  let payload;

  if (resolvedModuleType === MODULE_TYPES.CURRENT_AFFAIRS || getCategoryKind(category) === 'CURRENT_AFFAIRS') {
    payload = {
      years: grouped[FILTER_TYPES.YEAR] || [],
      months: grouped[FILTER_TYPES.MONTH] || [],
      types: grouped[FILTER_TYPES.CURRENT_AFFAIRS_TYPE] || []
    };
  } else if (category) {
    const kind = getCategoryKind(category);
    if (kind === 'NCERT') {
      payload = {
        subjects: grouped[FILTER_TYPES.SUBJECT] || [],
        classes: grouped[FILTER_TYPES.CLASS] || []
      };
    } else if (kind === 'PYQ') {
      const subCategories = await SubCategory.find({
        categoryId: category._id,
        isActive: true
      })
        .select('name')
        .sort({ name: 1 })
        .lean();
      payload = {
        subCategories,
        papers: grouped[FILTER_TYPES.PAPER] || [],
        years: grouped[FILTER_TYPES.YEAR] || []
      };
    } else if (kind === 'STUDY_MATERIAL') {
      const subCategories = await SubCategory.find({
        categoryId: category._id,
        isActive: true
      })
        .select('name')
        .sort({ name: 1 })
        .lean();
      payload = { subCategories };
    } else {
      payload = {
        subjects: grouped[FILTER_TYPES.SUBJECT] || [],
        classes: grouped[FILTER_TYPES.CLASS] || [],
        papers: grouped[FILTER_TYPES.PAPER] || [],
        years: grouped[FILTER_TYPES.YEAR] || []
      };
    }
  } else {
    payload = grouped;
  }

  cache.set(cacheKey, payload);
  return payload;
};

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
    const cats = await ResourceCategory.find({
      moduleType,
      ...activeCategoryFilter()
    }).select('_id');
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

const getPortalResources = async (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 12, 1), 50);
  const skip = (page - 1) * limit;

  const cacheKey = cache.buildKey('portal:resources', { ...query, page, limit });
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const filter = await buildPortalResourceQuery(query);

  const [resources, total, filterMeta] = await Promise.all([
    Resource.find(filter)
      .populate('categoryId', 'name moduleType')
      .populate('subCategoryId', 'name')
      .populate('subjectId', 'value type')
      .populate('classId', 'value type')
      .populate('paperId', 'value type')
      .populate('yearId', 'value type')
      .populate('monthId', 'value type')
      .populate('currentAffairsTypeId', 'value type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Resource.countDocuments(filter),
    getPortalFilters({
      moduleType: query.moduleType,
      categoryId: query.categoryId,
      subCategoryId: query.subCategoryId
    })
  ]);

  const payload = {
    filters: filterMeta || {},
    resources: resources.map(formatPortalResourceCard),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1
    }
  };

  cache.set(cacheKey, payload);
  return payload;
};

const getNCERTResources = (query) =>
  getPortalResources({ ...query, categoryId: query.categoryId });

const getPYQResources = (query) =>
  getPortalResources({ ...query, categoryId: query.categoryId });

const getCurrentAffairsResources = (query) =>
  getPortalResources({ ...query, moduleType: MODULE_TYPES.CURRENT_AFFAIRS });

const getStudyMaterials = (query) =>
  getPortalResources({ ...query, categoryId: query.categoryId });

const getPortalResourceById = async (id, { trackView = false, userId = null } = {}) => {
  const resource = await Resource.findOne({ _id: id, isActive: true })
    .populate('categoryId', 'name moduleType')
    .populate('subCategoryId', 'name')
    .populate('subjectId', 'value type')
    .populate('classId', 'value type')
    .populate('paperId', 'value type')
    .populate('yearId', 'value type')
    .populate('monthId', 'value type')
    .populate('currentAffairsTypeId', 'value type')
    .lean();

  if (!resource) return null;

  if (trackView) {
    await ResourceViewHistory.create({ userId, resourceId: id });
  }

  return formatPortalResourceDetail(resource);
};

const recordResourceDownload = async (id, userId = null) => {
  const resource = await Resource.findOneAndUpdate(
    { _id: id, isActive: true },
    { $inc: { downloads: 1 } },
    { new: true }
  )
    .select('fileUrl downloads title')
    .lean();

  if (!resource) return null;

  await ResourceDownload.create({ userId, resourceId: id });
  cache.invalidatePrefix('portal:resources');
  cache.invalidatePrefix('portal:home');

  return resource;
};

module.exports = {
  getCategoryKind,
  formatPortalCategory,
  formatPortalResourceCard,
  getPortalHome,
  getPortalCategories,
  getPortalFilters,
  buildPortalResourceQuery,
  getPortalResources,
  getNCERTResources,
  getPYQResources,
  getCurrentAffairsResources,
  getStudyMaterials,
  getPortalResourceById,
  recordResourceDownload
};

```

---

### 8.5 portalFreeResourceController

**File:** `controllers/portalFreeResourceController.js`

```javascript
const resourceService = require('../services/resourceService');

const getRequestUserId = (user) => user?._id || user?.id || null;

exports.getPortalHome = async (req, res) => {
  try {
    const data = await resourceService.getPortalHome();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Portal free resources home error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getPortalCategories = async (req, res) => {
  try {
    const data = await resourceService.getPortalCategories({
      moduleType: req.query.moduleType
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Portal free resources categories error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getPortalFilters = async (req, res) => {
  try {
    const { moduleType, categoryId, subCategoryId } = req.query;

    if (!moduleType && !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'moduleType or categoryId query parameter is required'
      });
    }

    const data = await resourceService.getPortalFilters({
      moduleType,
      categoryId,
      subCategoryId
    });

    if (data === null) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Portal free resources filters error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getPortalResources = async (req, res) => {
  try {
    const data = await resourceService.getPortalResources(req.query);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('Portal free resources list error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getPortalResourceById = async (req, res) => {
  try {
    const data = await resourceService.getPortalResourceById(req.params.id, {
      trackView: false,
      userId: getRequestUserId(req.user)
    });

    if (!data) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Portal free resource detail error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.viewPortalResource = async (req, res) => {
  try {
    const data = await resourceService.getPortalResourceById(req.params.id, {
      trackView: true,
      userId: getRequestUserId(req.user)
    });

    if (!data || !data.pdfUrl) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    res.json({
      success: true,
      message: 'Open pdfUrl in browser or embedded viewer',
      data: {
        ...data,
        viewUrl: data.pdfUrl
      }
    });
  } catch (error) {
    console.error('Portal free resource view error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.downloadPortalResource = async (req, res) => {
  try {
    const resource = await resourceService.recordResourceDownload(
      req.params.id,
      getRequestUserId(req.user)
    );

    if (!resource?.fileUrl?.url) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    res.json({
      success: true,
      message: 'Download tracked',
      data: {
        _id: resource._id,
        title: resource.title,
        downloadUrl: resource.fileUrl.url,
        downloads: resource.downloads
      }
    });
  } catch (error) {
    console.error('Portal free resource download error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

```

---

### 9.1 filterRoutes

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

### 9.2 portalFreeResourceRoutes

**File:** `routes/portalFreeResourceRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const optionalAuth = require('../middleware/optionalAuth');
const {
  getPortalHome,
  getPortalCategories,
  getPortalFilters,
  getPortalResources,
  getPortalResourceById,
  viewPortalResource,
  downloadPortalResource
} = require('../controllers/portalFreeResourceController');

router.use(optionalAuth);

router.get('/home', getPortalHome);
router.get('/categories', getPortalCategories);
router.get('/filters', getPortalFilters);
router.get('/resources', getPortalResources);

router.get('/resources/:id/view', viewPortalResource);
router.get('/resources/:id/download', downloadPortalResource);
router.get('/resources/:id', getPortalResourceById);

module.exports = router;

```

---

### 9.3 resourceRoutes (categories)

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

### 9.4 resourceFileRoutes

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

## 10. Postman Examples

Import `PORTAL_FREE_RESOURCES_POSTMAN_COLLECTION.json`.

Current Affairs requests in collection:

- **Categories (CURRENT_AFFAIRS)**
- **Filters — Current Affairs**
- **Resources — Current Affairs**

```json
[
  {
    "name": "Categories (CURRENT_AFFAIRS)",
    "request": {
      "method": "GET",
      "url": {
        "raw": "{{baseUrl}}/api/portal/free-resources/categories?moduleType=CURRENT_AFFAIRS",
        "host": [
          "{{baseUrl}}"
        ],
        "path": [
          "api",
          "portal",
          "free-resources",
          "categories"
        ],
        "query": [
          {
            "key": "moduleType",
            "value": "CURRENT_AFFAIRS"
          }
        ]
      }
    }
  },
  {
    "name": "Filters — Current Affairs",
    "request": {
      "method": "GET",
      "url": {
        "raw": "{{baseUrl}}/api/portal/free-resources/filters?moduleType=CURRENT_AFFAIRS",
        "host": [
          "{{baseUrl}}"
        ],
        "path": [
          "api",
          "portal",
          "free-resources",
          "filters"
        ],
        "query": [
          {
            "key": "moduleType",
            "value": "CURRENT_AFFAIRS"
          }
        ]
      }
    }
  },
  {
    "name": "Resources — Current Affairs",
    "request": {
      "method": "GET",
      "url": {
        "raw": "{{baseUrl}}/api/portal/free-resources/resources?moduleType=CURRENT_AFFAIRS&yearId={{yearId}}&monthId={{monthId}}&typeId={{typeId}}&page=1&limit=12",
        "host": [
          "{{baseUrl}}"
        ],
        "path": [
          "api",
          "portal",
          "free-resources",
          "resources"
        ],
        "query": [
          {
            "key": "moduleType",
            "value": "CURRENT_AFFAIRS"
          },
          {
            "key": "yearId",
            "value": "{{yearId}}"
          },
          {
            "key": "monthId",
            "value": "{{monthId}}"
          },
          {
            "key": "typeId",
            "value": "{{typeId}}"
          },
          {
            "key": "page",
            "value": "1"
          },
          {
            "key": "limit",
            "value": "12"
          }
        ]
      }
    }
  }
]
```

---

## app.js registration

```javascript
app.use('/api/resources', resourceRoutes);
app.use('/api/resources/filters', filterRoutes);
app.use('/api/resources/files', resourceFileRoutes);
app.use('/api/portal/free-resources', portalFreeResourceRoutes);
```
