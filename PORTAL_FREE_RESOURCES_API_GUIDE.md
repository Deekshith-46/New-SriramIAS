# Portal Free Resources — Complete Code & API Guide

> **Project:** Sriram-IAS  
> **Base URL:** `http://localhost:5000`  
> **CMS (unchanged):** `/api/resources/*`  
> **Portal (new):** `/api/portal/free-resources/*`

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

```text
Admin CMS          →  /api/resources/*        (existing CRUD — not rewritten)
Student / Website  →  /api/portal/free-resources/*   (UI-optimized reads)
Mobile / Parent    →  same portal APIs

Shared tables: ResourceCategory, SubCategory, Filter, Resource, MockTest, Question, Result
New analytics:  ResourceDownload, ResourceViewHistory
Service layer:  services/resourceService.js
Cache:          utils/resourcePortalCache.js (in-memory; Redis-ready)
```

| ResourceCategory | moduleType |
|------------------|------------|
| NCERT, PYQ, Study Material | FREE_RESOURCES |
| Daily CA, Monthly Magazine | CURRENT_AFFAIRS |

---

## 2. Portal API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/portal/free-resources/home` | Dashboard category cards |
| GET | `/api/portal/free-resources/categories` | Grouped categories |
| GET | `/api/portal/free-resources/filters` | UI filter dropdowns |
| GET | `/api/portal/free-resources/resources` | List + filters + pagination |
| GET | `/api/portal/free-resources/resources/:id` | Detail |
| GET | `/api/portal/free-resources/resources/:id/view` | View PDF + history |
| GET | `/api/portal/free-resources/resources/:id/download` | Download + analytics |

Optional: `Authorization: Bearer <token>` for logged-in download/view tracking.

---

## 3. Request Examples

### Home

```http
GET /api/portal/free-resources/home
```

### Current affairs filters

```http
GET /api/portal/free-resources/filters?moduleType=CURRENT_AFFAIRS
```

Response shape: `{ years, months, types }`

### NCERT resources

```http
GET /api/portal/free-resources/resources?categoryId=NCERT_ID&subjectId=...&classId=...&page=1&limit=12
```

### Current affairs resources

```http
GET /api/portal/free-resources/resources?moduleType=CURRENT_AFFAIRS&yearId=...&monthId=...&typeId=...
```

### PYQ resources

```http
GET /api/portal/free-resources/resources?categoryId=PYQ_ID&subCategoryId=...&paperId=...&yearId=...
```

### Admin CMS (category)

```json
{ "name": "Daily Current Affairs", "moduleType": "CURRENT_AFFAIRS" }
```

### Admin CMS (resource upload fields)

```json
{ "resourceType": "PDF", "monthId": "...", "typeId": "..." }
```

(`typeId` → `currentAffairsTypeId` in database.)

---

## 4. Route Registration

**File:** `app.js`

```javascript
const portalFreeResourceRoutes = require('./routes/portalFreeResourceRoutes');

// ... existing CMS routes ...
app.use('/api/resources', resourceRoutes);
app.use('/api/resources/filters', filterRoutes);
app.use('/api/resources/files', resourceFileRoutes);
app.use('/api/resources/mock-tests', mockTestRoutes);
app.use('/api/resources/questions', questionRoutes);

// Student / website / mobile — UI-optimized read APIs
app.use('/api/portal/free-resources', portalFreeResourceRoutes);
```

---

## 5. Constants & Cache

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
  STUDY_MATERIAL: 'study material'
};

module.exports = {
  MODULE_TYPES,
  RESOURCE_TYPES,
  FILTER_TYPES,
  CATEGORY_NAME_HINTS
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

---

## 6. Models

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

---

## 7. Middleware

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

---

## 8. Service Layer

### `services/resourceService.js`

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

## 9. Portal Controller

### `controllers/portalFreeResourceController.js`

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

## 10. Portal Routes

### `routes/portalFreeResourceRoutes.js`

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

## 11. CMS Field Updates

### resourceCategoryController.js (create)

```javascript
const { name, description, moduleType } = req.body;

const category = new ResourceCategory({
  name,
  description,
  moduleType: moduleType || 'FREE_RESOURCES',
  thumbnail: thumbnailData,
  createdBy: req.user._id,
  centerId: req.user.center || null
});
```

### resourceController.js (create — new fields)

```javascript
monthId,
typeId,          // saved as currentAffairsTypeId
resourceType,

// In Resource.create payload:
monthId: monthId || null,
currentAffairsTypeId: typeId || null,
resourceType: resourceType || 'PDF',
```

### resourceController.js (current affairs validation)

```javascript
const isCurrentAffairs = category.moduleType === 'CURRENT_AFFAIRS';

if (isCurrentAffairs) {
  if (!yearId) {
    return res.status(400).json({
      success: false,
      message: 'Current affairs resources require yearId'
    });
  }
}
```

## Future-ready (not implemented)

- `ResourceBookmark`
- Redis (replace `resourcePortalCache`)
- Portal mock-test routes
