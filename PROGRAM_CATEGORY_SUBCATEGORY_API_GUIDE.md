# Academic ERP API Guide — Program → Category → SubCategory

**Base URL:** `http://localhost:5000`  
**Auth:** Super Admin (`Bearer` token from `POST /api/auth/login-super-admin` or Admin Access login with `roleCode: SUPER_ADMIN`)

## Table of contents

1. [Hierarchy & rules](#hierarchy)
2. [Authentication](#authentication)
3. [Programs API](#1-programs)
4. [Categories API](#2-categories-academic)
5. [SubCategories API](#3-subcategories)
6. [Course integration](#4-course-integration-phase-2)
7. [Frontend dropdown chaining](#7-frontend-dropdown-chaining)
8. [Complete source code](#10-complete-source-code)

Postman: **`PROGRAM_CATEGORY_SUBCATEGORY_POSTMAN_COLLECTION.json`**

---

## Hierarchy

```text
Center
  → Program          (many-to-many with centers)
    → Category       (scoped: one center + one program)
      → SubCategory  (scoped: center + program + category)
        → Course     (phase 2 — optional fields added on Course model)
```

**Rules**

- Store **ObjectId references**, not display names alone.
- **Hard delete:** `DELETE` permanently removes the record from the database.
- **Status toggle:** use `PATCH .../status/:id` with `ACTIVE` / `INACTIVE` to hide without deleting.
- **Backend validates** center ↔ program ↔ category chain (do not trust frontend only).
- **`linkedCourses`** on program list is computed via aggregation (not stored).

**Collections**

| API resource | Mongoose model        | Collection              |
|-------------|------------------------|-------------------------|
| Program     | `Program`              | `programs`              |
| Category    | `AcademicCategory`     | `academiccategories`    |
| SubCategory | `AcademicSubCategory`  | `academicsubcategories` |

Legacy global categories (old course dropdown) remain at **`GET /api/legacy-categories`** (public).

---

## Authentication

```http
POST /api/auth/login-super-admin
Content-Type: application/json

{
  "email": "admin@sriram.com",
  "password": "admin123"
}
```

Use `token` as:

```http
Authorization: Bearer <token>
```

All endpoints in this guide require Super Admin unless noted.

---

## 1. Programs

### 1.1 Create program

```http
POST /api/programs
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**

```json
{
  "programName": "UPSC Complete Program",
  "centers": ["CENTER_OBJECT_ID_1", "CENTER_OBJECT_ID_2"],
  "status": "ACTIVE"
}
```

**Response `201`**

```json
{
  "success": true,
  "message": "Program created successfully",
  "data": {
    "_id": "...",
    "programId": "PRG001",
    "programName": "UPSC Complete Program",
    "centers": [
      { "_id": "...", "centerName": "Delhi Center" },
      { "_id": "...", "centerName": "Mumbai Center" }
    ],
    "linkedCourses": 0,
    "status": "ACTIVE",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 1.2 List programs

```http
GET /api/programs?search=upsc&center=CENTER_ID&status=ACTIVE&page=1&limit=10
```

| Query     | Description                                      |
|-----------|--------------------------------------------------|
| `search`  | **Program name:** contains term anywhere (e.g. `UPSC`). **Center name/code/state:** must *start with* term (so `De` does not match Hy**de**rabad). **City:** starts with term or word after space (e.g. `Delhi` matches `New Delhi`). No match → empty list. |
| `center`  | Filter programs that include this center id      |
| `status`  | `ACTIVE` \| `INACTIVE`                           |
| `page`    | Default `1`                                      |
| `limit`   | Default `10`, max `100`                          |

**Response**

```json
{
  "success": true,
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "count": 1,
  "data": [
    {
      "_id": "...",
      "programId": "PRG001",
      "programName": "UPSC Complete Program",
      "centers": [
        { "_id": "...", "centerName": "Delhi Center" }
      ],
      "linkedCourses": 3,
      "status": "ACTIVE"
    }
  ]
}
```

`linkedCourses` = count of `Course` documents where `program` equals this program `_id`.

---

### 1.3 Get program by id

```http
GET /api/programs/:id
```

---

### 1.4 Update program

```http
PUT /api/programs/:id
```

**Body (partial)**

```json
{
  "programName": "UPSC Complete Program 2026",
  "centers": ["CENTER_ID_1"],
  "status": "ACTIVE"
}
```

---

### 1.5 Patch program status

```http
PATCH /api/programs/status/:id
Content-Type: application/json

{ "status": "INACTIVE" }
```

---

### 1.6 Delete program (hard delete)

```http
DELETE /api/programs/:id
```

Permanently removes the program document.

---

### 1.7 Programs by center (dropdown)

```http
GET /api/programs/by-center/:centerId
```

Returns only **ACTIVE** programs linked to the center.

**Response**

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "...",
      "programId": "PRG001",
      "programName": "UPSC Complete Program"
    }
  ]
}
```

**Query used**

```javascript
Program.find({ centers: centerId, status: 'ACTIVE' })
```

---

## 2. Categories (academic)

Scoped to **one center** and **one program**.

### 2.1 UI flow

1. Select **Center** → `GET /api/programs/by-center/:centerId`
2. Select **Program**
3. Enter **Category name** → `POST /api/categories`

---

### 2.2 Create category

```http
POST /api/categories
```

**Body**

```json
{
  "centerId": "CENTER_OBJECT_ID",
  "programId": "PROGRAM_OBJECT_ID",
  "categoryName": "UPSC",
  "status": "ACTIVE"
}
```

**Backend validation**

- Center exists and is active.
- Program exists and is active.
- `program.centers` must include `centerId`.

**Failure example**

```json
{
  "success": false,
  "message": "Selected program is not available for the selected center"
}
```

---

### 2.3 List categories

```http
GET /api/categories?search=upsc&center=CENTER_ID&program=PROGRAM_ID&status=ACTIVE&page=1&limit=10
```

Populates **center** and **program** in each row.

---

### 2.4 Filter categories (dropdown)

```http
GET /api/categories/filter?centerId=CENTER_ID&programId=PROGRAM_ID
```

**Response**

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "...",
      "categoryId": "CAT001",
      "categoryName": "UPSC"
    }
  ]
}
```

---

### 2.5 Get / update / status / delete

| Method | Path                              | Notes              |
|--------|-----------------------------------|--------------------|
| GET    | `/api/categories/:id`             | Detail + counts    |
| PUT    | `/api/categories/:id`             | Re-validates chain |
| PATCH  | `/api/categories/status/:id`      | `{ "status": "..." }` |
| DELETE | `/api/categories/:id`             | Hard delete        |

---

## 3. SubCategories

### 3.1 Dropdown chain (center → program → category → subcategory)

Use these APIs **in order** for dependent dropdowns:

| Step | Select | API |
|------|--------|-----|
| 1 | Center | (from center list / `GET /api/admin/centers/dropdown`) |
| 2 | Program | `GET /api/programs/by-center/:centerId` |
| 3 | Category | `GET /api/categories/filter?centerId=&programId=` |
| 4 | SubCategory | `GET /api/sub-categories/filter?centerId=&programId=&categoryId=` |

**Step 4 — filter subcategories**

```http
GET /api/sub-categories/filter?centerId=CENTER_ID&programId=PROGRAM_ID&categoryId=CATEGORY_ID
```

**Response**

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "...",
      "subCategoryId": "SUB001",
      "subCategoryName": "Foundation"
    }
  ]
}
```

Backend validates that the category belongs to the selected center and program (same rule as create).

---

### 3.2 UI flow (create form)

1. **Center** → `GET /api/programs/by-center/:centerId`
2. **Program** → `GET /api/categories/filter?centerId=&programId=`
3. **Category** → `GET /api/sub-categories/filter?centerId=&programId=&categoryId=`
4. Enter name → `POST /api/sub-categories`

---

### 3.3 Create subcategory

```http
POST /api/sub-categories
```

**Body**

```json
{
  "centerId": "CENTER_OBJECT_ID",
  "programId": "PROGRAM_OBJECT_ID",
  "categoryId": "CATEGORY_OBJECT_ID",
  "subCategoryName": "Foundation",
  "status": "ACTIVE"
}
```

**Backend validation**

```javascript
const category = await AcademicCategory.findOne({
  _id: categoryId,
  centerId,
  programId,
  status: 'ACTIVE'
});
```

If missing → `400` `Invalid category selection for the selected center and program`.

Also validates program includes center.

---

### 3.4 List subcategories (admin table + search)

```http
GET /api/sub-categories?search=foundation&center=CENTER_ID&program=PROGRAM_ID&category=CATEGORY_ID&status=ACTIVE&page=1&limit=10
```

| Query | Description |
|-------|-------------|
| `search` | Matches **subCategoryName** or **subCategoryId** (case-insensitive, contains). Example: `Foundation`, `SUB001`. |
| `subCategoryName` | Alias for `search` (same behavior). |
| `center` | Filter by center ObjectId |
| `program` | Filter by program ObjectId |
| `category` | Filter by category ObjectId |
| `status` | `ACTIVE` \| `INACTIVE` |
| `page` | Default `1` |
| `limit` | Default `10`, max `100` |
| `sortBy` | `createdAt` \| `subCategoryName` \| `subCategoryId` \| `status` |
| `sortOrder` | `asc` \| `desc` |

**Examples**

```http
GET /api/sub-categories?search=Foundation
GET /api/sub-categories?search=SUB
GET /api/sub-categories?subCategoryName=Optional
```

---

### 3.5 CRUD remainder

| Method | Path                                   |
|--------|----------------------------------------|
| GET    | `/api/sub-categories/filter`           | Dropdown: `centerId`, `programId`, `categoryId` |
| GET    | `/api/sub-categories/:id`              |
| PUT    | `/api/sub-categories/:id`              |
| PATCH  | `/api/sub-categories/status/:id`       |
| DELETE | `/api/sub-categories/:id`              |

---

## 4. Course integration

`POST /api/courses` now **requires** the academic hierarchy (`centerId`, `programId`, `categoryId`, `subCategoryId`) and validates the chain on the server.

Full course + cascading UI docs: **`COURSE_SYSTEM_API_GUIDE.md`**  
Postman: **`COURSE_ERP_POSTMAN_COLLECTION.json`**

`Course` model refs:

```javascript
program: ObjectId → Program
academicCategory: ObjectId → AcademicCategory
academicSubCategory: ObjectId → AcademicSubCategory
```

Target shape:

```text
Course → center + program + academicCategory + academicSubCategory
```

Legacy `category` (global `Category` model) remains for existing courses.

---

## 5. ID formats

| Entity      | Field           | Example  |
|------------|-----------------|----------|
| Program    | `programId`     | `PRG001` |
| Category   | `categoryId`    | `CAT001` |
| SubCategory| `subCategoryId` | `SUB001` |

Auto-generated on create (sequential per prefix).

---

## 6. Status values

| Value      | Meaning                          |
|-----------|-----------------------------------|
| `ACTIVE`  | Visible in dropdowns / lists      |
| `INACTIVE`| Hidden from dropdowns / filters (use PATCH status, not DELETE) |

---

## 7. Frontend dropdown chaining

**Category form**

```javascript
async function onCenterChange(centerId) {
  const res = await fetch(`/api/programs/by-center/${centerId}`, { headers: auth });
  // populate program dropdown
}
```

**SubCategory form**

```javascript
async function onCenterChange(centerId) { /* fetch programs */ }

async function onProgramChange(centerId, programId) {
  const res = await fetch(
    `/api/categories/filter?centerId=${centerId}&programId=${programId}`,
    { headers: auth }
  );
  // populate category dropdown
}

async function onCategoryChange(centerId, programId, categoryId) {
  const res = await fetch(
    `/api/sub-categories/filter?centerId=${centerId}&programId=${programId}&categoryId=${categoryId}`,
    { headers: auth }
  );
  // populate subcategory dropdown
}
```

---

## 8. Error codes

| HTTP | When |
|------|------|
| 400  | Invalid hierarchy, duplicate name, bad body |
| 401  | Missing/invalid token |
| 403  | Not Super Admin |
| 404  | Entity not found |
| 500  | Server error |

---

## 9. File map (implementation)

| File | Purpose |
|------|---------|
| `models/Program.js` | Program schema |
| `models/AcademicCategory.js` | Center+program category |
| `models/AcademicSubCategory.js` | Full chain subcategory |
| `models/Course.js` | Optional `program`, `academicCategory`, `academicSubCategory` refs |
| `utils/academicIdGenerator.js` | PRG/CAT/SUB ids |
| `utils/academicHierarchyHelpers.js` | Validation helpers |
| `middleware/requireSuperAdmin.js` | Super Admin guard |
| `controllers/programController.js` | Program APIs + aggregation search |
| `controllers/academicCategoryController.js` | Category APIs |
| `controllers/academicSubCategoryController.js` | SubCategory APIs + filter + search |
| `routes/programRoutes.js` | `/api/programs` |
| `routes/academicCategoryRoutes.js` | `/api/categories` |
| `routes/academicSubCategoryRoutes.js` | `/api/sub-categories` |
| `app.js` | Route registration |

---

## 10. Complete source code

Full implementation as deployed in the project (copy reference — edit files in repo, not this guide).

### 10.1 API routes summary

| Method | Path | Controller |
|--------|------|------------|
| POST | `/api/programs` | `createProgram` |
| GET | `/api/programs` | `getPrograms` (search + pagination) |
| GET | `/api/programs/by-center/:centerId` | `getProgramsByCenter` |
| GET | `/api/programs/:id` | `getProgramById` |
| PUT | `/api/programs/:id` | `updateProgram` |
| PATCH | `/api/programs/status/:id` | `updateProgramStatus` |
| DELETE | `/api/programs/:id` | `deleteProgram` (hard delete) |
| POST | `/api/categories` | `createCategory` |
| GET | `/api/categories` | `getCategories` |
| GET | `/api/categories/filter` | `getCategoriesFilter` |
| GET | `/api/categories/:id` | `getCategoryById` |
| PUT | `/api/categories/:id` | `updateCategory` |
| PATCH | `/api/categories/status/:id` | `updateCategoryStatus` |
| DELETE | `/api/categories/:id` | `deleteCategory` (hard delete) |
| POST | `/api/sub-categories` | `createSubCategory` |
| GET | `/api/sub-categories` | `getSubCategories` (search) |
| GET | `/api/sub-categories/filter` | `getSubCategoriesFilter` |
| GET | `/api/sub-categories/:id` | `getSubCategoryById` |
| PUT | `/api/sub-categories/:id` | `updateSubCategory` |
| PATCH | `/api/sub-categories/status/:id` | `updateSubCategoryStatus` |
| DELETE | `/api/sub-categories/:id` | `deleteSubCategory` (hard delete) |

All routes use `protect` + `requireSuperAdmin`.

---

### 10.2 `app.js` — route registration

```javascript
const programRoutes = require('./routes/programRoutes');
const academicCategoryRoutes = require('./routes/academicCategoryRoutes');
const academicSubCategoryRoutes = require('./routes/academicSubCategoryRoutes');

// Academic ERP hierarchy (Center → Program → Category → SubCategory)
app.use('/api/programs', programRoutes);
app.use('/api/categories', academicCategoryRoutes);
app.use('/api/sub-categories', academicSubCategoryRoutes);

app.use('/api', publicRoutes); // includes GET /api/legacy-categories
```

---

### 10.3 `models/Program.js`

```javascript
const mongoose = require('mongoose');

const programSchema = new mongoose.Schema(
  {
    programId: {
      type: String,
      unique: true,
      trim: true
    },
    programName: {
      type: String,
      required: true,
      trim: true
    },
    centers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Center',
        required: true
      }
    ],
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminAccess'
    }
  },
  { timestamps: true }
);

programSchema.index({ programName: 1 });
programSchema.index({ centers: 1, status: 1 });

module.exports = mongoose.model('Program', programSchema);
```

---

### 10.4 `models/AcademicCategory.js`

```javascript
const mongoose = require('mongoose');

const academicCategorySchema = new mongoose.Schema(
  {
    categoryId: {
      type: String,
      unique: true,
      trim: true
    },
    categoryName: {
      type: String,
      required: true,
      trim: true
    },
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: true
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
    }
  },
  { timestamps: true }
);

academicCategorySchema.index(
  { centerId: 1, programId: 1, categoryName: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);
academicCategorySchema.index({ centerId: 1, programId: 1, status: 1 });

module.exports = mongoose.model('AcademicCategory', academicCategorySchema);
```

---

### 10.5 `models/AcademicSubCategory.js`

```javascript
const mongoose = require('mongoose');

const academicSubCategorySchema = new mongoose.Schema(
  {
    subCategoryId: {
      type: String,
      unique: true,
      trim: true
    },
    subCategoryName: {
      type: String,
      required: true,
      trim: true
    },
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: true
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicCategory',
      required: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
    }
  },
  { timestamps: true }
);

academicSubCategorySchema.index(
  { centerId: 1, programId: 1, categoryId: 1, subCategoryName: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);
academicSubCategorySchema.index({ centerId: 1, programId: 1, categoryId: 1, status: 1 });

module.exports = mongoose.model('AcademicSubCategory', academicSubCategorySchema);
```

---

### 10.6 `models/Course.js` — academic ERP fields (excerpt)

```javascript
  /** Academic ERP hierarchy (optional until course module migration) */
  program: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    default: null
  },
  academicCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicCategory',
    default: null
  },
  academicSubCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSubCategory',
    default: null
  },
```

---

### 10.7 `utils/academicIdGenerator.js`

```javascript
const mongoose = require('mongoose');

const parseNumericSuffix = (value, prefix) => {
  if (!value || typeof value !== 'string') return 0;
  const match = value.match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
  return match ? parseInt(match[1], 10) : 0;
};

const generateSequentialId = async (Model, field, prefix, pad = 3) => {
  const latest = await Model.findOne({
    [field]: new RegExp(`^${prefix}\\d+$`, 'i')
  })
    .sort({ [field]: -1 })
    .select(field)
    .lean();

  const next = parseNumericSuffix(latest?.[field], prefix) + 1;
  return `${prefix}${String(next).padStart(pad, '0')}`;
};

const generateProgramId = () => generateSequentialId(require('../models/Program'), 'programId', 'PRG');
const generateAcademicCategoryId = () =>
  generateSequentialId(require('../models/AcademicCategory'), 'categoryId', 'CAT');
const generateAcademicSubCategoryId = () =>
  generateSequentialId(require('../models/AcademicSubCategory'), 'subCategoryId', 'SUB');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

module.exports = {
  generateProgramId,
  generateAcademicCategoryId,
  generateAcademicSubCategoryId,
  isValidObjectId
};
```

---

### 10.8 `utils/academicHierarchyHelpers.js`

```javascript
const mongoose = require('mongoose');
const Center = require('../models/Center');
const Program = require('../models/Program');
const AcademicCategory = require('../models/AcademicCategory');
const AcademicSubCategory = require('../models/AcademicSubCategory');
const { isValidObjectId } = require('./academicIdGenerator');

const ACTIVE_CENTER_FILTER = { isDeleted: false, status: 'ACTIVE' };

const toObjectId = (id) => {
  if (!isValidObjectId(id)) return null;
  return new mongoose.Types.ObjectId(id);
};

const findActiveCenter = async (centerId) => {
  const oid = toObjectId(centerId);
  if (!oid) return null;
  return Center.findOne({ _id: oid, ...ACTIVE_CENTER_FILTER }).lean();
};

const findActiveProgram = async (programId) => {
  const oid = toObjectId(programId);
  if (!oid) return null;
  return Program.findOne({ _id: oid, status: 'ACTIVE' }).lean();
};

const programIncludesCenter = (program, centerId) => {
  if (!program?.centers?.length) return false;
  const target = String(centerId);
  return program.centers.some((c) => String(c) === target);
};

const validateProgramCenterLink = async (programId, centerId) => {
  const [center, program] = await Promise.all([
    findActiveCenter(centerId),
    findActiveProgram(programId)
  ]);

  if (!center) {
    return { ok: false, status: 400, message: 'Invalid or inactive center' };
  }
  if (!program) {
    return { ok: false, status: 400, message: 'Invalid or inactive program' };
  }
  if (!programIncludesCenter(program, centerId)) {
    return {
      ok: false,
      status: 400,
      message: 'Selected program is not available for the selected center'
    };
  }

  return { ok: true, center, program };
};

const validateCategoryForHierarchy = async ({ centerId, programId, categoryId }) => {
  const linkCheck = await validateProgramCenterLink(programId, centerId);
  if (!linkCheck.ok) return linkCheck;

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
      message: 'Invalid category selection for the selected center and program'
    };
  }

  return { ok: true, ...linkCheck, category };
};

const getCreatedByFromRequest = (req) => req.adminAccess?._id || req.user?._id || null;

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = {
  ACTIVE_CENTER_FILTER,
  toObjectId,
  findActiveCenter,
  findActiveProgram,
  programIncludesCenter,
  validateProgramCenterLink,
  validateCategoryForHierarchy,
  getCreatedByFromRequest,
  escapeRegex,
  AcademicCategory,
  AcademicSubCategory,
  Program,
  Center
};
```

---

### 10.9 `middleware/requireSuperAdmin.js`

```javascript
const { isSuperAdminRequest } = require('../utils/permissionHelpers');

/**
 * Allows legacy User (role super_admin) or AdminAccess (roleCode SUPER_ADMIN).
 * Must run after protect.
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user && !req.adminAccess) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  if (!isSuperAdminRequest(req)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super Admin only.'
    });
  }

  next();
};

module.exports = { requireSuperAdmin };
```

---

### 10.10 `routes/programRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const {
  createProgram,
  getPrograms,
  getProgramById,
  getProgramsByCenter,
  updateProgram,
  updateProgramStatus,
  deleteProgram
} = require('../controllers/programController');

router.use(protect, requireSuperAdmin);

router.get('/by-center/:centerId', getProgramsByCenter);
router.patch('/status/:id', updateProgramStatus);

router.post('/', createProgram);
router.get('/', getPrograms);
router.get('/:id', getProgramById);
router.put('/:id', updateProgram);
router.delete('/:id', deleteProgram);

module.exports = router;
```

---

### 10.11 `routes/academicCategoryRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const {
  createCategory,
  getCategories,
  getCategoriesFilter,
  getCategoryById,
  updateCategory,
  updateCategoryStatus,
  deleteCategory
} = require('../controllers/academicCategoryController');

router.use(protect, requireSuperAdmin);

router.get('/filter', getCategoriesFilter);
router.patch('/status/:id', updateCategoryStatus);

router.post('/', createCategory);
router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
```

---

### 10.12 `routes/academicSubCategoryRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const {
  createSubCategory,
  getSubCategories,
  getSubCategoriesFilter,
  getSubCategoryById,
  updateSubCategory,
  updateSubCategoryStatus,
  deleteSubCategory
} = require('../controllers/academicSubCategoryController');

router.use(protect, requireSuperAdmin);

router.get('/filter', getSubCategoriesFilter);
router.patch('/status/:id', updateSubCategoryStatus);

router.post('/', createSubCategory);
router.get('/', getSubCategories);
router.get('/:id', getSubCategoryById);
router.put('/:id', updateSubCategory);
router.delete('/:id', deleteSubCategory);

module.exports = router;
```

---

### 10.13 `controllers/programController.js` (complete)

```javascript
const mongoose = require('mongoose');
const Program = require('../models/Program');
const Course = require('../models/Course');
const Center = require('../models/Center');
const {
  ACTIVE_CENTER_FILTER,
  findActiveCenter,
  getCreatedByFromRequest,
  escapeRegex
} = require('../utils/academicHierarchyHelpers');
const { generateProgramId, isValidObjectId } = require('../utils/academicIdGenerator');

const formatProgramListItem = (doc, linkedCourses = 0) => ({
  _id: doc._id,
  programId: doc.programId,
  programName: doc.programName,
  centers: (doc.centers || []).map((c) => ({
    _id: c._id || c,
    centerName: c.centerName || c.name
  })),
  linkedCourses,
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const validateCentersInput = async (centerIds) => {
  if (!Array.isArray(centerIds) || centerIds.length === 0) {
    return { ok: false, message: 'At least one center is required' };
  }

  const unique = [...new Set(centerIds.map(String))];
  for (const id of unique) {
    if (!isValidObjectId(id)) {
      return { ok: false, message: 'Invalid center id in centers array' };
    }
  }

  const centers = await Center.find({
    _id: { $in: unique },
    ...ACTIVE_CENTER_FILTER
  }).select('_id centerName');

  if (centers.length !== unique.length) {
    return { ok: false, message: 'One or more centers are invalid or inactive' };
  }

  return { ok: true, centers: centers.map((c) => c._id) };
};

const buildProgramBaseMatch = ({ center, status }) => {
  const match = {};

  if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
    match.status = status;
  }

  if (center && isValidObjectId(center)) {
    match.centers = new mongoose.Types.ObjectId(center);
  }

  return match;
};

/**
 * Search rules:
 * - programName: contains term anywhere (e.g. "UPSC" in "2 years UPSC Complete Program")
 * - centerName / centerCode / state: must START with term (avoids "De" matching Hy**de**rabad)
 * - city: starts with term OR word after space (e.g. "Delhi" in "New Delhi")
 */
const buildProgramSearchMatch = (searchTerm) => {
  const term = escapeRegex(String(searchTerm).trim());
  if (!term) return null;

  const centerStartsWith = `^${term}`;
  const cityOrWordStart = `(^|\\s)${term}`;

  return {
    $or: [
      { programName: { $regex: term, $options: 'i' } },
      { 'centerDocs.centerName': { $regex: centerStartsWith, $options: 'i' } },
      { 'centerDocs.name': { $regex: centerStartsWith, $options: 'i' } },
      { 'centerDocs.centerCode': { $regex: centerStartsWith, $options: 'i' } },
      { 'centerDocs.state': { $regex: centerStartsWith, $options: 'i' } },
      { 'centerDocs.city': { $regex: cityOrWordStart, $options: 'i' } }
    ]
  };
};

const buildProgramListPipeline = ({ search = '', center, status, sort, skip, limit }) => {
  const pipeline = [];
  const baseMatch = buildProgramBaseMatch({ center, status });

  if (Object.keys(baseMatch).length) {
    pipeline.push({ $match: baseMatch });
  }

  pipeline.push({
    $lookup: {
      from: 'centers',
      localField: 'centers',
      foreignField: '_id',
      as: 'centerDocs'
    }
  });

  const searchMatch = buildProgramSearchMatch(search);
  if (searchMatch) {
    pipeline.push({ $match: searchMatch });
  }

  pipeline.push({ $sort: sort });

  if (typeof skip === 'number' && skip > 0) {
    pipeline.push({ $skip: skip });
  }
  if (typeof limit === 'number' && limit > 0) {
    pipeline.push({ $limit: limit });
  }

  return pipeline;
};

const buildProgramCountPipeline = ({ search = '', center, status }) => {
  const pipeline = [];
  const baseMatch = buildProgramBaseMatch({ center, status });

  if (Object.keys(baseMatch).length) {
    pipeline.push({ $match: baseMatch });
  }

  pipeline.push({
    $lookup: {
      from: 'centers',
      localField: 'centers',
      foreignField: '_id',
      as: 'centerDocs'
    }
  });

  const searchMatch = buildProgramSearchMatch(search);
  if (searchMatch) {
    pipeline.push({ $match: searchMatch });
  }

  pipeline.push({ $count: 'total' });
  return pipeline;
};

const mapProgramFromAggregation = (doc) => {
  const centers = (doc.centerDocs || []).map((c) => ({
    _id: c._id,
    centerName: c.centerName || c.name
  }));

  return formatProgramListItem({ ...doc, centers });
};

const attachLinkedCourseCounts = async (programs) => {
  if (!programs.length) return [];

  const ids = programs.map((p) => p._id);
  const counts = await Course.aggregate([
    { $match: { program: { $in: ids } } },
    { $group: { _id: '$program', count: { $sum: 1 } } }
  ]);

  const countMap = new Map(counts.map((row) => [String(row._id), row.count]));

  return programs.map((p) => {
    const linkedCourses = countMap.get(String(p._id)) || 0;
    if (p.programId && p.programName && Array.isArray(p.centers)) {
      return { ...p, linkedCourses };
    }
    return formatProgramListItem(p, linkedCourses);
  });
};

exports.createProgram = async (req, res) => {
  try {
    const { programName, centers, status = 'ACTIVE' } = req.body;

    if (!programName?.trim()) {
      return res.status(400).json({ success: false, message: 'Program name is required' });
    }

    const centerCheck = await validateCentersInput(centers);
    if (!centerCheck.ok) {
      return res.status(400).json({ success: false, message: centerCheck.message });
    }

    const program = await Program.create({
      programId: await generateProgramId(),
      programName: programName.trim(),
      centers: centerCheck.centers,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      createdBy: getCreatedByFromRequest(req)
    });

    const populated = await Program.findById(program._id).populate('centers', 'centerName name');

    res.status(201).json({
      success: true,
      message: 'Program created successfully',
      data: formatProgramListItem(populated.toObject(), 0)
    });
  } catch (error) {
    console.error('Create program error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getPrograms = async (req, res) => {
  try {
    const {
      search = '',
      center,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    const allowedSort = ['createdAt', 'programName', 'programId', 'status'];
    sort[allowedSort.includes(sortBy) ? sortBy : 'createdAt'] = sortOrder === 'asc' ? 1 : -1;

    const listPipeline = buildProgramListPipeline({
      search,
      center,
      status,
      sort,
      skip,
      limit: limitNum
    });
    const countPipeline = buildProgramCountPipeline({ search, center, status });

    const [programs, countResult] = await Promise.all([
      Program.aggregate(listPipeline),
      Program.aggregate(countPipeline)
    ]);

    const total = countResult[0]?.total ?? 0;
    const data = await attachLinkedCourseCounts(
      programs.map((doc) => mapProgramFromAggregation(doc))
    );

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 0,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getProgramById = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id).populate('centers', 'centerName name centerCode city');

    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }

    const [formatted] = await attachLinkedCourseCounts([program.toObject()]);

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Get program by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getProgramsByCenter = async (req, res) => {
  try {
    const { centerId } = req.params;
    const center = await findActiveCenter(centerId);
    if (!center) {
      return res.status(404).json({ success: false, message: 'Center not found' });
    }

    const programs = await Program.find({
      centers: centerId,
      status: 'ACTIVE'
    })
      .select('_id programId programName')
      .sort({ programName: 1 })
      .lean();

    res.json({
      success: true,
      count: programs.length,
      data: programs
    });
  } catch (error) {
    console.error('Get programs by center error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }

    if (req.body.programName !== undefined) {
      if (!String(req.body.programName).trim()) {
        return res.status(400).json({ success: false, message: 'Program name cannot be empty' });
      }
      program.programName = String(req.body.programName).trim();
    }

    if (req.body.centers !== undefined) {
      const centerCheck = await validateCentersInput(req.body.centers);
      if (!centerCheck.ok) {
        return res.status(400).json({ success: false, message: centerCheck.message });
      }
      program.centers = centerCheck.centers;
    }

    if (req.body.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
      }
      program.status = req.body.status;
    }

    await program.save();
    const populated = await Program.findById(program._id).populate('centers', 'centerName name');
    const [data] = await attachLinkedCourseCounts([populated.toObject()]);

    res.json({
      success: true,
      message: 'Program updated successfully',
      data
    });
  } catch (error) {
    console.error('Update program error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateProgramStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
    }

    const program = await Program.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('centers', 'centerName name');

    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }

    const [data] = await attachLinkedCourseCounts([program.toObject()]);

    res.json({
      success: true,
      message: 'Program status updated',
      data
    });
  } catch (error) {
    console.error('Update program status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteProgram = async (req, res) => {
  try {
    const program = await Program.findByIdAndDelete(req.params.id);

    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }

    res.json({
      success: true,
      message: 'Program deleted successfully',
      data: { _id: program._id }
    });
  } catch (error) {
    console.error('Delete program error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

---

### 10.14 `controllers/academicCategoryController.js` (complete)

```javascript
const mongoose = require('mongoose');
const AcademicCategory = require('../models/AcademicCategory');
const AcademicSubCategory = require('../models/AcademicSubCategory');
const Course = require('../models/Course');
const { validateProgramCenterLink, escapeRegex } = require('../utils/academicHierarchyHelpers');
const { generateAcademicCategoryId, isValidObjectId } = require('../utils/academicIdGenerator');

const formatCategory = (doc, extras = {}) => ({
  _id: doc._id,
  categoryId: doc.categoryId,
  categoryName: doc.categoryName,
  centerId: doc.centerId?._id || doc.centerId,
  centerName: doc.centerId?.centerName || doc.centerId?.name,
  programId: doc.programId?._id || doc.programId,
  programName: doc.programId?.programName,
  status: doc.status,
  linkedSubCategories: extras.linkedSubCategories ?? 0,
  linkedCourses: extras.linkedCourses ?? 0,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildCategoryListQuery = ({ search = '', center, program, status }) => {
  const query = {};

  if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
    query.status = status;
  }
  if (center && isValidObjectId(center)) {
    query.centerId = new mongoose.Types.ObjectId(center);
  }
  if (program && isValidObjectId(program)) {
    query.programId = new mongoose.Types.ObjectId(program);
  }

  const trimmed = String(search).trim();
  if (trimmed) {
    query.categoryName = new RegExp(escapeRegex(trimmed), 'i');
  }

  return query;
};

exports.createCategory = async (req, res) => {
  try {
    const { centerId, programId, categoryName, status = 'ACTIVE' } = req.body;

    if (!categoryName?.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const validation = await validateProgramCenterLink(programId, centerId);
    if (!validation.ok) {
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    const category = await AcademicCategory.create({
      categoryId: await generateAcademicCategoryId(),
      categoryName: categoryName.trim(),
      centerId,
      programId,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    const populated = await AcademicCategory.findById(category._id)
      .populate('centerId', 'centerName name')
      .populate('programId', 'programName programId');

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: formatCategory(populated.toObject())
    });
  } catch (error) {
    console.error('Create academic category error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists for this center and program'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const {
      search = '',
      center,
      program,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = buildCategoryListQuery({ search, center, program, status });
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    const allowedSort = ['createdAt', 'categoryName', 'categoryId', 'status'];
    sort[allowedSort.includes(sortBy) ? sortBy : 'createdAt'] = sortOrder === 'asc' ? 1 : -1;

    const [categories, total] = await Promise.all([
      AcademicCategory.find(query)
        .populate('centerId', 'centerName name')
        .populate('programId', 'programName programId')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AcademicCategory.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 0,
      count: categories.length,
      data: categories.map((c) => formatCategory(c))
    });
  } catch (error) {
    console.error('Get academic categories error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCategoriesFilter = async (req, res) => {
  try {
    const { centerId, programId } = req.query;

    if (!centerId || !programId) {
      return res.status(400).json({
        success: false,
        message: 'centerId and programId query parameters are required'
      });
    }

    const validation = await validateProgramCenterLink(programId, centerId);
    if (!validation.ok) {
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    const categories = await AcademicCategory.find({
      centerId,
      programId,
      status: 'ACTIVE'
    })
      .select('_id categoryId categoryName')
      .sort({ categoryName: 1 })
      .lean();

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Filter academic categories error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const category = await AcademicCategory.findById(req.params.id)
      .populate('centerId', 'centerName name centerCode')
      .populate('programId', 'programName programId');

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const [subCount, courseCount] = await Promise.all([
      AcademicSubCategory.countDocuments({ categoryId: category._id, status: 'ACTIVE' }),
      Course.countDocuments({ academicCategory: category._id })
    ]);

    res.json({
      success: true,
      data: formatCategory(category.toObject(), {
        linkedSubCategories: subCount,
        linkedCourses: courseCount
      })
    });
  } catch (error) {
    console.error('Get academic category by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await AcademicCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const nextCenterId = req.body.centerId ?? category.centerId;
    const nextProgramId = req.body.programId ?? category.programId;

    if (req.body.centerId !== undefined || req.body.programId !== undefined) {
      const validation = await validateProgramCenterLink(nextProgramId, nextCenterId);
      if (!validation.ok) {
        return res.status(validation.status).json({ success: false, message: validation.message });
      }
      category.centerId = nextCenterId;
      category.programId = nextProgramId;
    }

    if (req.body.categoryName !== undefined) {
      if (!String(req.body.categoryName).trim()) {
        return res.status(400).json({ success: false, message: 'Category name cannot be empty' });
      }
      category.categoryName = String(req.body.categoryName).trim();
    }

    if (req.body.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
      }
      category.status = req.body.status;
    }

    await category.save();

    const populated = await AcademicCategory.findById(category._id)
      .populate('centerId', 'centerName name')
      .populate('programId', 'programName programId');

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: formatCategory(populated.toObject())
    });
  } catch (error) {
    console.error('Update academic category error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists for this center and program'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateCategoryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
    }

    const category = await AcademicCategory.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('centerId', 'centerName name')
      .populate('programId', 'programName programId');

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({
      success: true,
      message: 'Category status updated',
      data: formatCategory(category.toObject())
    });
  } catch (error) {
    console.error('Update academic category status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await AcademicCategory.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully',
      data: { _id: category._id }
    });
  } catch (error) {
    console.error('Delete academic category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

---

### 10.15 `controllers/academicSubCategoryController.js` (complete)

```javascript
const mongoose = require('mongoose');
const AcademicSubCategory = require('../models/AcademicSubCategory');
const Course = require('../models/Course');
const { validateCategoryForHierarchy, escapeRegex } = require('../utils/academicHierarchyHelpers');
const { generateAcademicSubCategoryId, isValidObjectId } = require('../utils/academicIdGenerator');

const formatSubCategory = (doc, extras = {}) => ({
  _id: doc._id,
  subCategoryId: doc.subCategoryId,
  subCategoryName: doc.subCategoryName,
  centerId: doc.centerId?._id || doc.centerId,
  centerName: doc.centerId?.centerName || doc.centerId?.name,
  programId: doc.programId?._id || doc.programId,
  programName: doc.programId?.programName,
  categoryId: doc.categoryId?._id || doc.categoryId,
  categoryName: doc.categoryId?.categoryName,
  status: doc.status,
  linkedCourses: extras.linkedCourses ?? 0,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const resolveSubCategorySearchTerm = (query = {}) => {
  const raw = query.search ?? query.subCategoryName ?? '';
  const value = Array.isArray(raw) ? raw[0] : raw;
  return String(value ?? '').trim();
};

const buildSubCategoryListQuery = ({ search = '', center, program, category, status }) => {
  const query = {};

  if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
    query.status = status;
  }
  if (center && isValidObjectId(center)) {
    query.centerId = new mongoose.Types.ObjectId(center);
  }
  if (program && isValidObjectId(program)) {
    query.programId = new mongoose.Types.ObjectId(program);
  }
  if (category && isValidObjectId(category)) {
    query.categoryId = new mongoose.Types.ObjectId(category);
  }

  const trimmed = String(search).trim();
  if (trimmed) {
    const term = escapeRegex(trimmed);
    query.$or = [
      { subCategoryName: { $regex: term, $options: 'i' } },
      { subCategoryId: { $regex: term, $options: 'i' } }
    ];
  }

  return query;
};

exports.createSubCategory = async (req, res) => {
  try {
    const { centerId, programId, categoryId, subCategoryName, status = 'ACTIVE' } = req.body;

    if (!subCategoryName?.trim()) {
      return res.status(400).json({ success: false, message: 'SubCategory name is required' });
    }

    const validation = await validateCategoryForHierarchy({ centerId, programId, categoryId });
    if (!validation.ok) {
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    const subCategory = await AcademicSubCategory.create({
      subCategoryId: await generateAcademicSubCategoryId(),
      subCategoryName: subCategoryName.trim(),
      centerId,
      programId,
      categoryId,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    const populated = await AcademicSubCategory.findById(subCategory._id)
      .populate('centerId', 'centerName name')
      .populate('programId', 'programName programId')
      .populate('categoryId', 'categoryName categoryId');

    res.status(201).json({
      success: true,
      message: 'SubCategory created successfully',
      data: formatSubCategory(populated.toObject())
    });
  } catch (error) {
    console.error('Create academic subcategory error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'SubCategory name already exists for this category'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubCategories = async (req, res) => {
  try {
    const search = resolveSubCategorySearchTerm(req.query);
    const {
      center,
      program,
      category,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = buildSubCategoryListQuery({ search, center, program, category, status });
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    const allowedSort = ['createdAt', 'subCategoryName', 'subCategoryId', 'status'];
    sort[allowedSort.includes(sortBy) ? sortBy : 'createdAt'] = sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      AcademicSubCategory.find(query)
        .populate('centerId', 'centerName name')
        .populate('programId', 'programName programId')
        .populate('categoryId', 'categoryName categoryId')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AcademicSubCategory.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 0,
      count: items.length,
      data: items.map((row) => formatSubCategory(row))
    });
  } catch (error) {
    console.error('Get academic subcategories error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Dropdown: subcategories for center + program + category (same chain as create form). */
exports.getSubCategoriesFilter = async (req, res) => {
  try {
    const { centerId, programId, categoryId } = req.query;

    if (!centerId || !programId || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'centerId, programId, and categoryId query parameters are required'
      });
    }

    const validation = await validateCategoryForHierarchy({ centerId, programId, categoryId });
    if (!validation.ok) {
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    const subCategories = await AcademicSubCategory.find({
      centerId,
      programId,
      categoryId,
      status: 'ACTIVE'
    })
      .select('_id subCategoryId subCategoryName')
      .sort({ subCategoryName: 1 })
      .lean();

    res.json({
      success: true,
      count: subCategories.length,
      data: subCategories
    });
  } catch (error) {
    console.error('Filter academic subcategories error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubCategoryById = async (req, res) => {
  try {
    const subCategory = await AcademicSubCategory.findById(req.params.id)
      .populate('centerId', 'centerName name centerCode')
      .populate('programId', 'programName programId')
      .populate('categoryId', 'categoryName categoryId');

    if (!subCategory) {
      return res.status(404).json({ success: false, message: 'SubCategory not found' });
    }

    const linkedCourses = await Course.countDocuments({ academicSubCategory: subCategory._id });

    res.json({
      success: true,
      data: formatSubCategory(subCategory.toObject(), { linkedCourses })
    });
  } catch (error) {
    console.error('Get academic subcategory by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateSubCategory = async (req, res) => {
  try {
    const subCategory = await AcademicSubCategory.findById(req.params.id);
    if (!subCategory) {
      return res.status(404).json({ success: false, message: 'SubCategory not found' });
    }

    const nextCenterId = req.body.centerId ?? subCategory.centerId;
    const nextProgramId = req.body.programId ?? subCategory.programId;
    const nextCategoryId = req.body.categoryId ?? subCategory.categoryId;

    if (
      req.body.centerId !== undefined ||
      req.body.programId !== undefined ||
      req.body.categoryId !== undefined
    ) {
      const validation = await validateCategoryForHierarchy({
        centerId: nextCenterId,
        programId: nextProgramId,
        categoryId: nextCategoryId
      });
      if (!validation.ok) {
        return res.status(validation.status).json({ success: false, message: validation.message });
      }
      subCategory.centerId = nextCenterId;
      subCategory.programId = nextProgramId;
      subCategory.categoryId = nextCategoryId;
    }

    if (req.body.subCategoryName !== undefined) {
      if (!String(req.body.subCategoryName).trim()) {
        return res.status(400).json({ success: false, message: 'SubCategory name cannot be empty' });
      }
      subCategory.subCategoryName = String(req.body.subCategoryName).trim();
    }

    if (req.body.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
      }
      subCategory.status = req.body.status;
    }

    await subCategory.save();

    const populated = await AcademicSubCategory.findById(subCategory._id)
      .populate('centerId', 'centerName name')
      .populate('programId', 'programName programId')
      .populate('categoryId', 'categoryName categoryId');

    res.json({
      success: true,
      message: 'SubCategory updated successfully',
      data: formatSubCategory(populated.toObject())
    });
  } catch (error) {
    console.error('Update academic subcategory error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'SubCategory name already exists for this category'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateSubCategoryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
    }

    const subCategory = await AcademicSubCategory.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('centerId', 'centerName name')
      .populate('programId', 'programName programId')
      .populate('categoryId', 'categoryName categoryId');

    if (!subCategory) {
      return res.status(404).json({ success: false, message: 'SubCategory not found' });
    }

    res.json({
      success: true,
      message: 'SubCategory status updated',
      data: formatSubCategory(subCategory.toObject())
    });
  } catch (error) {
    console.error('Update academic subcategory status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteSubCategory = async (req, res) => {
  try {
    const subCategory = await AcademicSubCategory.findByIdAndDelete(req.params.id);

    if (!subCategory) {
      return res.status(404).json({ success: false, message: 'SubCategory not found' });
    }

    res.json({
      success: true,
      message: 'SubCategory deleted successfully',
      data: { _id: subCategory._id }
    });
  } catch (error) {
    console.error('Delete academic subcategory error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

---

Postman collection: **`PROGRAM_CATEGORY_SUBCATEGORY_POSTMAN_COLLECTION.json`**
