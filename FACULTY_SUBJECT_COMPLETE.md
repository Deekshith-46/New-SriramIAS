# Faculty Subject Module — Complete Code & API Guide

> **Project:** Sriram-IAS  
> **Single reference** for Faculty Subject base layer + **LIVE_CLASS CMS** (folders, live classes, recurrence, schedule conflicts).  
> **Base URL:** `http://localhost:5000`  
> **Auth:** Super Admin JWT on all routes below.

**Postman collections:**

- `BATCH_FACULTY_SUBJECT_POSTMAN_COLLECTION.json` — Faculty Subject CRUD
- `FACULTY_SUBJECT_CMS_POSTMAN_COLLECTION.json` — Folders + Live Classes

**Design spec (architecture detail):** `FACULTY_SUBJECT_CMS_DESIGN.md`

---

## Table of contents

1. [System overview](#1-system-overview)
2. [File map](#2-file-map)
3. [Architecture](#3-architecture)
4. [Authentication](#4-authentication)
5. [Prerequisites](#5-prerequisites)
6. [API endpoints](#6-api-endpoints)
7. [API testing — step by step](#7-api-testing--step-by-step)
8. [Complete source code](#8-complete-source-code)
9. [Error responses](#9-error-responses)
10. [Postman collections](#10-postman-collections)
11. [Frontend integration](#11-frontend-integration)
12. [Quick reference](#12-quick-reference)

---

## 1. System overview

```text
Subject → Topic | Teacher
       ↓
FacultySubject  ← categories[] (ENUM flags)
       ↓
SubjectContentFolder  (per category: LIVE_CLASS, RECORDING, …)
       ↓
SubjectLiveClass  (LIVE_CLASS content — implemented)
       ↓
Batch.facultySubjects[] → BatchEnrollment
```

| Layer | Model | API prefix |
|-------|--------|------------|
| Faculty Subject | `FacultySubject` | `/api/faculty-subjects` |
| Content folders | `SubjectContentFolder` | `/api/faculty-subjects/content/folders`, `/api/folders` |
| Live classes (Academic CMS) | `SubjectLiveClass` | `/api/live-classes` |
| Legacy LMS (100ms) | `LiveClass` | `/api/lms/live-classes` |

### Category ENUM (`utils/batchFacultyConstants.js`)

| API value | UI label |
|-----------|----------|
| `LIVE_CLASS` | Live Class |
| `RECORDING` | Recording |
| `PRELIMS_TEST` | Prelims Test |
| `MAINS_ANSWER_WRITING` | Mains Answer Writing |
| `PDF` | PDF |

Legacy `TEST` in stored data is auto-mapped to `PRELIMS_TEST` on save via `normalizeFacultyCategories()`.

### FacultySubject fields

| Field | Description |
|-------|-------------|
| `facultySubjectId` | Display id (`FSU001`, …) |
| `subjectName` | UI display name |
| `subject` | Ref → `Subject` |
| `topics` | Ref[] → `Topic` |
| `teacher` | Ref → `Teacher` |
| `categories` | ENUM array (flags for enabled content modules) |
| `status` | `ACTIVE` / `INACTIVE` |

---

## 2. File map

| File | Purpose |
|------|---------|
| `models/FacultySubject.js` | Base schema + legacy category normalize |
| `controllers/facultySubjectController.js` | CRUD, create-form, dropdown, **content-tree** |
| `routes/facultySubjectRoutes.js` | Routes + folder create/update under faculty-subjects |
| `utils/batchFacultyConstants.js` | Category ENUM + `normalizeFacultyCategories` |
| `utils/batchFacultyHelpers.js` | `validateFacultySubjectPayload` |
| `models/SubjectContentFolder.js` | Folder schema (`FLD###`) |
| `models/SubjectLiveClass.js` | Live class schema (`LVC###`) |
| `controllers/subjectContentFolderController.js` | Folder CRUD + content-summary |
| `controllers/subjectLiveClassController.js` | Live class CRUD, create-form, dashboard, recurrence preview, duplicate |
| `routes/subjectContentFolderRoutes.js` | `/api/folders` |
| `routes/subjectLiveClassRoutes.js` | `/api/live-classes` |
| `utils/facultyContentConstants.js` | Publish/class/recurrence/timezone enums |
| `utils/facultyContentHelpers.js` | Live class + folder validation |
| `utils/cmsApiErrors.js` | Structured validation/conflict errors |
| `services/recurrenceEngine.js` | Session occurrence generation + preview |
| `services/scheduleConflictService.js` | Classroom + faculty clash + folder delete guard |
| `utils/contentIdGenerator.js` | `FSU###`, `FLD###`, `LVC###` |
| `middleware/superAdminAuth.js` | `protect` + `requireSuperAdmin` |
| `app.js` | Route mounts |

---

## 3. Architecture

### 3.1 Base layer

```text
1. GET /api/faculty-subjects/create-form
2. GET /api/faculty-subjects/create-form?subjectId=
3. POST /api/faculty-subjects  →  FSU001
4. GET /api/faculty-subjects/:id/content-tree  →  left nav by category
```

### 3.2 LIVE_CLASS CMS flow

```text
Faculty Subject  →  GET /api/faculty-subjects/dropdown?category=LIVE_CLASS
       ↓
Folder           →  POST /api/faculty-subjects/content/folders
                 →  GET /api/folders?facultySubjectId=&category=LIVE_CLASS
       ↓
Batch            →  GET /api/batches/dropdown?facultySubjectId=
Center           →  GET /api/centers/dropdown
Classroom        →  GET /api/classrooms/dropdown?centerId=
       ↓
Live Class       →  GET /api/live-classes/create-form
                 →  POST /api/live-classes/preview-recurrence
                 →  POST /api/live-classes
                 →  PATCH /api/live-classes/:id/publish-status
```

**Note:** Teacher is not sent on live class create. Faculty schedule clash detection uses `FacultySubject.teacher` from the selected faculty subject.

---

## 4. Authentication

```http
POST {{BASE_URL}}/api/auth/login-super-admin
Content-Type: application/json

{ "email": "<SUPER_ADMIN_EMAIL>", "password": "<SUPER_ADMIN_PASSWORD>" }
```

Use on every request:

```http
Authorization: Bearer {{SuperAdminToken}}
```

---

## 5. Prerequisites

1. Create **Subject**, **Topic(s)**, **Teacher** (teacher `subjects[]` must include subject).
2. Create **FacultySubject** with `categories` including `LIVE_CLASS`.
3. Create **Batch** with `facultySubjects[]` containing the faculty subject `_id`.
4. Have **Center** and **Classroom** for live class scheduling.

---

## 6. API endpoints

### 6.1 Faculty Subject

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/faculty-subjects/create-form` | Categories + subjects |
| GET | `/api/faculty-subjects/create-form?subjectId=` | Topics + teachers for subject |
| POST | `/api/faculty-subjects` | Create |
| GET | `/api/faculty-subjects` | List (search, filter, paginate) |
| GET | `/api/faculty-subjects/dropdown` | Lightweight list (`?category=LIVE_CLASS`) |
| GET | `/api/faculty-subjects/summary/:id` | Summary by `_id` or `FSU001` |
| GET | `/api/faculty-subjects/:id/content-tree` | Folders grouped by category |
| GET | `/api/faculty-subjects/:id` | Full detail |
| PUT | `/api/faculty-subjects/:id` | Update |
| PATCH | `/api/faculty-subjects/status/:id` | Activate / deactivate |
| DELETE | `/api/faculty-subjects/:id` | Soft delete |
| POST | `/api/faculty-subjects/content/folders` | Create folder |
| PUT | `/api/faculty-subjects/content/folders/:id` | Update folder |

### 6.2 Folders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/folders?facultySubjectId=&category=` | List folders |
| GET | `/api/folders/:id` | Get one |
| GET | `/api/folders/:id/content-summary` | Live class counts by publish status |
| PUT | `/api/folders/:id` | Update name / description / status |
| DELETE | `/api/folders/:id` | Soft delete (409 if live classes exist) |

### 6.3 Live classes (Academic CMS)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/live-classes/create-form` | Form defaults, enums, optional preloads |
| GET | `/api/live-classes/dashboard-summary` | Dashboard aggregate counts |
| POST | `/api/live-classes` | Create (default `DRAFT`) |
| GET | `/api/live-classes` | List with filters + search |
| GET | `/api/live-classes/:id` | Detail |
| PUT | `/api/live-classes/:id` | Update |
| PATCH | `/api/live-classes/:id/publish-status` | Draft / Publish / Unpublish |
| DELETE | `/api/live-classes/:id` | Soft delete |
| POST | `/api/live-classes/preview-recurrence` | Standalone recurrence preview |
| POST | `/api/live-classes/:id/preview-recurrence` | Preview for existing live class |
| POST | `/api/live-classes/:id/duplicate` | Clone as new `DRAFT` |

### 6.4 Supporting dropdowns (existing APIs)

| Method | Endpoint | Query |
|--------|----------|-------|
| GET | `/api/batches/dropdown` | `facultySubjectId` (optional) |
| GET | `/api/centers/dropdown` | — |
| GET | `/api/classrooms/dropdown` | `centerId` |

---

## 7. API testing — step by step

### 7.0 Login

```bash
curl -X POST "http://localhost:5000/api/auth/login-super-admin" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sriram.com","password":"admin123"}'
```

### 7.1 Faculty Subject base

| Step | Request | Notes |
|------|---------|-------|
| 1 | `GET /api/faculty-subjects/create-form` | Pick `subjectId` |
| 2 | `GET /api/faculty-subjects/create-form?subjectId=` | Pick `teacherId`, topic ids |
| 3 | `POST /api/faculty-subjects` | Include `"categories": ["LIVE_CLASS", "PRELIMS_TEST"]` |
| 4 | `GET /api/faculty-subjects/:id/content-tree` | Empty folder arrays until folders created |

**Create FacultySubject body:**

```json
{
  "subjectName": "Indian Polity – Live",
  "subjectId": "{{subjectId}}",
  "topicIds": ["{{topicId}}"],
  "teacherId": "{{teacherId}}",
  "categories": ["LIVE_CLASS"],
  "status": "ACTIVE"
}
```

### 7.2 Folders

```http
POST {{BASE_URL}}/api/faculty-subjects/content/folders
Authorization: Bearer {{SuperAdminToken}}
Content-Type: application/json
```

```json
{
  "facultySubjectId": "{{facultySubjectMongoId}}",
  "category": "LIVE_CLASS",
  "folderName": "Prelims Live Classes",
  "description": "Optional"
}
```

```http
GET {{BASE_URL}}/api/folders?facultySubjectId={{facultySubjectMongoId}}&category=LIVE_CLASS
GET {{BASE_URL}}/api/folders/{{folderId}}/content-summary
```

### 7.3 Live class

**Preview recurrence (standalone):**

```http
POST {{BASE_URL}}/api/live-classes/preview-recurrence
```

```json
{
  "scheduledDate": "2026-06-01",
  "startTime": "10:00",
  "durationMinutes": 90,
  "timezone": "Asia/Kolkata",
  "recurrence": {
    "enabled": true,
    "repeatType": "WEEKLY",
    "repeatEvery": 1,
    "startDate": "2026-06-01",
    "endDate": "2026-08-31",
    "weekdays": ["MON", "WED"]
  }
}
```

**Create live class:**

```json
{
  "facultySubjectId": "{{facultySubjectMongoId}}",
  "folderId": "{{folderMongoId}}",
  "batchId": "{{batchMongoId}}",
  "centerId": "{{centerMongoId}}",
  "classroomId": "{{classroomMongoId}}",
  "classTitle": "Indian Polity – Introduction",
  "scheduledDate": "2026-06-01",
  "startTime": "10:00",
  "durationHours": 1,
  "durationMinutes": 30,
  "timezone": "Asia/Kolkata",
  "attendanceEnabled": true,
  "publishStatus": "DRAFT"
}
```

| Step | Request | Expected |
|------|---------|----------|
| 5 | `GET /api/live-classes/create-form` | Enums + dependency flow |
| 6 | `POST /api/live-classes` | `201`, `liveClassId` `LVC001` |
| 7 | `GET /api/live-classes?facultySubjectId=&folderId=&search=` | Filtered list |
| 8 | `PATCH /api/live-classes/:id/publish-status` | `{ "publishStatus": "PUBLISHED" }` |
| 9 | `POST /api/live-classes/:id/duplicate` | New `DRAFT` copy |
| 10 | `DELETE /api/folders/:id` | `409` if live classes still in folder |

### 7.4 Schedule conflict tests

| Scenario | Status | errorCode (typical) |
|----------|--------|---------------------|
| Overlapping classroom booking | 409 | `CLASSROOM_SCHEDULE_CONFLICT` |
| Same teacher, overlapping time | 409 | `FACULTY_SCHEDULE_CONFLICT` |
| Delete folder with live classes | 409 | `FOLDER_HAS_CONTENT` |

### 7.5 Use in Batch

```json
{
  "batchName": "Mains GS Batch 1",
  "courseId": "{{courseId}}",
  "facultySubjects": ["{{facultySubjectMongoId}}"],
  "status": "UPCOMING"
}
```

---

## 8. Complete source code

> Auto-generated from disk. Regenerate: `node scripts/regenerate-faculty-subject-complete.js`

### 8.0 Source file index

| § | Path |
|---|------|
| 8.1 | `models/FacultySubject.js` (69 lines) |
| 8.2 | `utils/batchFacultyConstants.js` (42 lines) |
| 8.3 | `utils/batchFacultyHelpers.js` (268 lines) |
| 8.4 | `controllers/facultySubjectController.js` (500 lines) |
| 8.5 | `routes/facultySubjectRoutes.js` (35 lines) |
| 8.6 | `utils/facultyContentConstants.js` (35 lines) |
| 8.7 | `utils/cmsApiErrors.js` (132 lines) |
| 8.8 | `utils/contentIdGenerator.js` (56 lines) |
| 8.9 | `utils/facultyContentHelpers.js` (477 lines) |
| 8.10 | `models/SubjectContentFolder.js` (70 lines) |
| 8.11 | `models/SubjectLiveClass.js` (144 lines) |
| 8.12 | `services/recurrenceEngine.js` (272 lines) |
| 8.13 | `services/scheduleConflictService.js` (442 lines) |
| 8.14 | `controllers/subjectContentFolderController.js` (259 lines) |
| 8.15 | `controllers/subjectLiveClassController.js` (824 lines) |
| 8.16 | `routes/subjectContentFolderRoutes.js` (18 lines) |
| 8.17 | `routes/subjectLiveClassRoutes.js` (31 lines) |

### 8.1 `models/FacultySubject.js`

```javascript
const mongoose = require('mongoose');
const {
  FACULTY_CATEGORIES,
  normalizeFacultyCategories
} = require('../utils/batchFacultyConstants');

const facultySubjectSchema = new mongoose.Schema(
  {
    facultySubjectId: {
      type: String,
      unique: true,
      trim: true
    },
    subjectName: {
      type: String,
      required: true,
      trim: true
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    topics: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic'
      }
    ],
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true
    },
    categories: [
      {
        type: String,
        enum: FACULTY_CATEGORIES
      }
    ],
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

facultySubjectSchema.index({ subject: 1, teacher: 1, status: 1, isDeleted: 1 });
facultySubjectSchema.index({ subjectName: 1 });

facultySubjectSchema.pre('save', function normalizeLegacyCategories() {
  if (Array.isArray(this.categories) && this.categories.length) {
    this.categories = normalizeFacultyCategories(this.categories);
  }
});

module.exports = mongoose.model('FacultySubject', facultySubjectSchema);
```

### 8.2 `utils/batchFacultyConstants.js`

```javascript
const FACULTY_CATEGORIES = [
  'LIVE_CLASS',
  'RECORDING',
  'PRELIMS_TEST',
  'MAINS_ANSWER_WRITING',
  'PDF'
];

/** Legacy enum values stored before category split (TEST → PRELIMS_TEST). */
const LEGACY_FACULTY_CATEGORY_MAP = {
  TEST: 'PRELIMS_TEST'
};

const normalizeFacultyCategories = (categories = []) => {
  const normalized = categories
    .map((c) => {
      const upper = String(c || '').trim().toUpperCase();
      return LEGACY_FACULTY_CATEGORY_MAP[upper] || upper;
    })
    .filter((c) => FACULTY_CATEGORIES.includes(c));
  return [...new Set(normalized)];
};

const BATCH_STATUSES = [
  'ACTIVE',
  'UPCOMING',
  'INACTIVE',
  'COMPLETED',
  'ARCHIVED',
  'CANCELLED'
];

const FEE_CURRENCIES = ['INR', 'USD', 'EUR'];

module.exports = {
  FACULTY_CATEGORIES,
  LEGACY_FACULTY_CATEGORY_MAP,
  normalizeFacultyCategories,
  BATCH_STATUSES,
  FEE_CURRENCIES
};
```

### 8.3 `utils/batchFacultyHelpers.js`

```javascript
const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Teacher = require('../models/Teacher');
const FacultySubject = require('../models/FacultySubject');
const Course = require('../models/Course');
const { isValidObjectId } = require('./contentIdGenerator');
const { NOT_DELETED } = require('./contentMastersHelpers');
const {
  FACULTY_CATEGORIES,
  normalizeFacultyCategories,
  BATCH_STATUSES,
  FEE_CURRENCIES
} = require('./batchFacultyConstants');
const { safeParseJson } = require('./coursePayloadHelpers');

const parseObjectIdList = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  const parsed = safeParseJson(raw, null);
  if (Array.isArray(parsed)) return parsed.map(String);
  return [];
};

const parseBulletPoints = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((p) => String(p).trim()).filter(Boolean);
  }
  const parsed = safeParseJson(raw, null);
  if (Array.isArray(parsed)) {
    return parsed.map((p) => String(p).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);
  }
  return [];
};

const parseFees = (body) => {
  const raw = body.fees ?? safeParseJson(body.feesJson, {});
  const fees = typeof raw === 'object' && raw !== null ? raw : {};

  const currency = FEE_CURRENCIES.includes(fees.currency) ? fees.currency : 'INR';

  const toNum = (v) => {
    if (v === undefined || v === null || v === '') return 0;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  };

  const onlineAmount = toNum(fees.onlineAmount);
  const offlineAmount = toNum(fees.offlineAmount);
  const discountAmount = toNum(fees.discountAmount);

  if ([onlineAmount, offlineAmount, discountAmount].some((n) => Number.isNaN(n))) {
    return { ok: false, message: 'Fee amounts must be valid non-negative numbers' };
  }

  return {
    ok: true,
    value: {
      currency,
      onlineAmount,
      offlineAmount,
      discountAmount,
      onlineBulletPoints: parseBulletPoints(fees.onlineBulletPoints),
      offlineBulletPoints: parseBulletPoints(fees.offlineBulletPoints)
    }
  };
};

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const validateBatchDates = ({ commencementDate, batchStartDate, batchEndDate }) => {
  const comm = parseDate(commencementDate);
  const start = parseDate(batchStartDate);
  const end = parseDate(batchEndDate);

  if (comm && start && start < comm) {
    return { ok: false, message: 'batchStartDate must be on or after commencementDate' };
  }
  if (start && end && end <= start) {
    return { ok: false, message: 'batchEndDate must be after batchStartDate' };
  }
  return { ok: true, commencementDate: comm, batchStartDate: start, batchEndDate: end };
};

const validateDurationInMonths = (value) => {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: null };
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, message: 'durationInMonths must be a non-negative number' };
  }
  return { ok: true, value: Math.floor(n) };
};

const validateCategories = (categories) => {
  if (!Array.isArray(categories) || categories.length === 0) {
    return { ok: false, message: 'At least one category is required' };
  }
  const normalized = normalizeFacultyCategories(categories);
  if (!normalized.length) {
    return {
      ok: false,
      message: `Invalid categories. Allowed: ${FACULTY_CATEGORIES.join(', ')} (legacy TEST maps to PRELIMS_TEST)`
    };
  }
  return { ok: true, value: normalized };
};

const validateFacultySubjectPayload = async ({
  subjectName,
  subjectId,
  topicIds = [],
  teacherId,
  categories = []
}) => {
  if (!subjectName?.trim()) {
    return { ok: false, message: 'subjectName is required' };
  }
  if (!isValidObjectId(subjectId)) {
    return { ok: false, message: 'Invalid subject id' };
  }
  if (!isValidObjectId(teacherId)) {
    return { ok: false, message: 'Invalid teacher id' };
  }

  const subject = await Subject.findOne({
    _id: subjectId,
    status: 'ACTIVE',
    ...NOT_DELETED
  }).lean();
  if (!subject) {
    return { ok: false, message: 'Invalid or inactive subject' };
  }

  const teacher = await Teacher.findOne({
    _id: teacherId,
    status: 'ACTIVE',
    ...NOT_DELETED
  }).lean();
  if (!teacher) {
    return { ok: false, message: 'Invalid or inactive teacher' };
  }

  const topicIdList = parseObjectIdList(topicIds);
  if (topicIdList.length) {
    for (const tid of topicIdList) {
      if (!isValidObjectId(tid)) {
        return { ok: false, message: 'Invalid topic id in topics array' };
      }
    }
    const topics = await Topic.find({
      _id: { $in: topicIdList },
      subject: subject._id,
      status: 'ACTIVE',
      ...NOT_DELETED
    }).lean();
    if (topics.length !== topicIdList.length) {
      return {
        ok: false,
        message: 'One or more topics are invalid, inactive, or do not belong to the selected subject'
      };
    }
  }

  const cat = validateCategories(categories);
  if (!cat.ok) return cat;

  return {
    ok: true,
    subject,
    teacher,
    topics: topicIdList,
    categories: cat.value
  };
};

const validateFacultySubjectIds = async (ids) => {
  const list = parseObjectIdList(ids);
  if (!list.length) {
    return { ok: false, message: 'At least one faculty subject is required for the batch' };
  }
  for (const id of list) {
    if (!isValidObjectId(id)) {
      return { ok: false, message: 'Invalid facultySubject id in facultySubjects array' };
    }
  }
  const unique = [...new Set(list)];
  const rows = await FacultySubject.find({
    _id: { $in: unique },
    status: 'ACTIVE',
    ...NOT_DELETED
  }).lean();
  if (rows.length !== unique.length) {
    return {
      ok: false,
      message: 'One or more faculty subjects are invalid or inactive'
    };
  }
  return { ok: true, facultySubjects: rows.map((r) => r._id) };
};

const validateActiveCourse = async (courseId) => {
  if (!isValidObjectId(courseId)) {
    return { ok: false, message: 'Invalid course id' };
  }
  const course = await Course.findOne({
    _id: courseId,
    status: 'ACTIVE',
    ...NOT_DELETED
  }).lean();
  if (!course) {
    return { ok: false, message: 'Invalid or inactive course' };
  }
  return { ok: true, course };
};

const validateBatchStatus = (status, fallback = 'UPCOMING') => {
  if (status === undefined || status === null || status === '') {
    return { ok: true, value: fallback };
  }
  if (!BATCH_STATUSES.includes(status)) {
    return {
      ok: false,
      message: `status must be one of: ${BATCH_STATUSES.join(', ')}`
    };
  }
  return { ok: true, value: status };
};

const parseBannerImage = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'object' && raw !== null && raw.url) {
    return { url: String(raw.url), publicId: String(raw.publicId || '') };
  }
  const parsed = safeParseJson(raw, null);
  if (parsed && typeof parsed === 'object' && parsed.url) {
    return { url: String(parsed.url), publicId: String(parsed.publicId || '') };
  }
  return null;
};

module.exports = {
  parseObjectIdList,
  parseBulletPoints,
  parseFees,
  parseDate,
  parseBannerImage,
  validateBatchDates,
  validateDurationInMonths,
  validateFacultySubjectPayload,
  validateFacultySubjectIds,
  validateActiveCourse,
  validateBatchStatus,
  BATCH_STATUSES
};
```

### 8.4 `controllers/facultySubjectController.js`

```javascript
const mongoose = require('mongoose');
const FacultySubject = require('../models/FacultySubject');
const SubjectContentFolder = require('../models/SubjectContentFolder');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Teacher = require('../models/Teacher');
const { generateFacultySubjectId, isValidObjectId } = require('../utils/contentIdGenerator');
const {
  NOT_DELETED,
  escapeRegex,
  parsePagination,
  parseSort,
  findActiveSubject
} = require('../utils/contentMastersHelpers');
const { validateFacultySubjectPayload } = require('../utils/batchFacultyHelpers');
const {
  FACULTY_CATEGORIES,
  normalizeFacultyCategories
} = require('../utils/batchFacultyConstants');

const FACULTY_CATEGORY_LABELS = {
  LIVE_CLASS: 'Live Class',
  RECORDING: 'Recording',
  PRELIMS_TEST: 'Prelims Test',
  MAINS_ANSWER_WRITING: 'Mains Answer Writing',
  PDF: 'PDF'
};

/** Lightweight shape for dropdowns / batch subject picker */
const formatFacultySubjectSummary = (doc) => ({
  _id: doc._id,
  facultySubjectId: doc.facultySubjectId,
  subjectName: doc.subjectName,
  teacherName: doc.teacher?.teacherName || doc.teacherName || ''
});

const findFacultySubjectByRef = async (ref) => {
  if (!ref) return null;
  const base = { ...NOT_DELETED };
  if (isValidObjectId(ref)) {
    return FacultySubject.findOne({ _id: ref, ...base })
      .select('_id facultySubjectId subjectName teacher')
      .populate('teacher', 'teacherName')
      .lean();
  }
  return FacultySubject.findOne({ facultySubjectId: String(ref).trim(), ...base })
    .select('_id facultySubjectId subjectName teacher')
    .populate('teacher', 'teacherName')
    .lean();
};

const formatFacultySubject = (doc) => ({
  _id: doc._id,
  facultySubjectId: doc.facultySubjectId,
  subjectName: doc.subjectName,
  subject: doc.subject?._id || doc.subject,
  teacher: doc.teacher?._id || doc.teacher,
  teacherDetails: doc.teacher
    ? {
        _id: doc.teacher._id,
        teacherId: doc.teacher.teacherId,
        teacherName: doc.teacher.teacherName,
        centerId: doc.teacher.centerId
      }
    : undefined,
  topics: (doc.topics || []).map((t) => ({
    _id: t._id || t,
    topicId: t.topicId,
    topicName: t.topicName
  })),
  categories: normalizeFacultyCategories(doc.categories || []),
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildFacultySubjectQuery = ({ search = '', status, category }) => {
  const conditions = [{ ...NOT_DELETED }];

  if (status && ['ACTIVE', 'INACTIVE'].includes(String(status).toUpperCase())) {
    conditions.push({ status: String(status).toUpperCase() });
  }
  if (category) {
    conditions.push({ categories: String(category).trim().toUpperCase() });
  }

  const trimmed = String(search ?? '').trim();
  if (trimmed) {
    conditions.push({
      subjectName: { $regex: escapeRegex(trimmed), $options: 'i' }
    });
  }

  return conditions.length === 1 ? conditions[0] : { $and: conditions };
};

exports.createFacultySubject = async (req, res) => {
  try {
    const {
      subjectName,
      subjectId,
      topicIds = [],
      teacherId,
      categories = [],
      status = 'ACTIVE'
    } = req.body;

    const validation = await validateFacultySubjectPayload({
      subjectName,
      subjectId,
      topicIds,
      teacherId,
      categories
    });
    if (!validation.ok) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const fs = await FacultySubject.create({
      facultySubjectId: await generateFacultySubjectId(),
      subjectName: subjectName.trim(),
      subject: validation.subject._id,
      topics: validation.topics,
      teacher: validation.teacher._id,
      categories: validation.categories,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    const populated = await FacultySubject.findById(fs._id)
      .populate('subject', 'subjectId subjectName')
      .populate('topics', 'topicId topicName')
      .populate('teacher', 'teacherId teacherName centerId')
      .lean();

    res.status(201).json({
      success: true,
      message: 'FacultySubject created successfully',
      data: formatFacultySubject(populated)
    });
  } catch (error) {
    console.error('Create facultySubject error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getFacultySubjects = async (req, res) => {
  try {
    const query = buildFacultySubjectQuery({
      search: req.query.search ?? req.query.q ?? '',
      status: req.query.status,
      category: req.query.category
    });
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ['createdAt', 'subjectName', 'facultySubjectId', 'status']);

    const [rows, total] = await Promise.all([
      FacultySubject.find(query)
        .populate('subject', 'subjectId subjectName')
        .populate('topics', 'topicId topicName')
        .populate('teacher', 'teacherId teacherName centerId')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      FacultySubject.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map(formatFacultySubject)
    });
  } catch (error) {
    console.error('Get facultySubjects error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getFacultySubjectById = async (req, res) => {
  try {
    const doc = await FacultySubject.findOne({ _id: req.params.id, ...NOT_DELETED })
      .populate('subject', 'subjectId subjectName')
      .populate('topics', 'topicId topicName')
      .populate('teacher', 'teacherId teacherName centerId')
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: 'FacultySubject not found' });

    res.json({ success: true, data: formatFacultySubject(doc) });
  } catch (error) {
    console.error('Get facultySubject by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateFacultySubject = async (req, res) => {
  try {
    const existing = await FacultySubject.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!existing) return res.status(404).json({ success: false, message: 'FacultySubject not found' });

    const nextPayload = {
      subjectName: req.body.subjectName ?? existing.subjectName,
      subjectId: req.body.subjectId ?? existing.subject,
      topicIds: req.body.topicIds ?? existing.topics,
      teacherId: req.body.teacherId ?? existing.teacher,
      categories: req.body.categories ?? existing.categories
    };

    const validation = await validateFacultySubjectPayload(nextPayload);
    if (!validation.ok) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    if (req.body.subjectName !== undefined) existing.subjectName = nextPayload.subjectName.trim();
    if (req.body.subjectId !== undefined) existing.subject = validation.subject._id;
    if (req.body.topicIds !== undefined) existing.topics = validation.topics;
    if (req.body.teacherId !== undefined) existing.teacher = validation.teacher._id;
    if (req.body.categories !== undefined) existing.categories = validation.categories;
    if (req.body.status !== undefined) {
      existing.status = req.body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    }

    await existing.save();

    const populated = await FacultySubject.findById(existing._id)
      .populate('subject', 'subjectId subjectName')
      .populate('topics', 'topicId topicName')
      .populate('teacher', 'teacherId teacherName centerId')
      .lean();

    res.json({
      success: true,
      message: 'FacultySubject updated successfully',
      data: formatFacultySubject(populated)
    });
  } catch (error) {
    console.error('Update facultySubject error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateFacultySubjectStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be ACTIVE or INACTIVE' });
    }

    const doc = await FacultySubject.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { status },
      { new: true }
    )
      .populate('subject', 'subjectId subjectName')
      .populate('topics', 'topicId topicName')
      .populate('teacher', 'teacherId teacherName centerId')
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: 'FacultySubject not found' });
    res.json({ success: true, message: 'FacultySubject status updated', data: formatFacultySubject(doc) });
  } catch (error) {
    console.error('Update facultySubject status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Single endpoint for Faculty Subject create/edit form dropdowns.
 * Step 1: GET without subjectId → categories + subjects
 * Step 2: GET ?subjectId=... → also topics + teachers for that subject
 */
exports.getFacultySubjectCreateForm = async (req, res) => {
  try {
    const { subjectId, centerId } = req.query;

    const categories = FACULTY_CATEGORIES.map((value) => ({
      value,
      label: FACULTY_CATEGORY_LABELS[value] || value
    }));

    const subjects = await Subject.find({ status: 'ACTIVE', ...NOT_DELETED })
      .select('_id subjectId subjectName')
      .sort({ subjectName: 1 })
      .lean();

    const data = {
      categories,
      subjects,
      topics: [],
      teachers: [],
      selectedSubject: null
    };

    if (subjectId) {
      const subject = await findActiveSubject(subjectId);
      if (!subject) {
        return res.status(400).json({ success: false, message: 'Invalid or inactive subject' });
      }

      data.selectedSubject = {
        _id: subject._id,
        subjectId: subject.subjectId,
        subjectName: subject.subjectName
      };

      data.topics = await Topic.find({
        subject: subject._id,
        status: 'ACTIVE',
        ...NOT_DELETED
      })
        .select('_id topicId topicName')
        .sort({ topicName: 1 })
        .lean();

      const teacherQuery = {
        status: 'ACTIVE',
        ...NOT_DELETED,
        subjects: subject._id
      };
      if (centerId && isValidObjectId(centerId)) {
        teacherQuery.centerId = new mongoose.Types.ObjectId(centerId);
      }

      const teachers = await Teacher.find(teacherQuery)
        .select('_id teacherId teacherName centerId')
        .populate('centerId', 'centerName')
        .sort({ teacherName: 1 })
        .lean();

      data.teachers = teachers.map((t) => ({
        _id: t._id,
        teacherId: t.teacherId,
        teacherName: t.teacherName,
        centerId: t.centerId?._id || t.centerId,
        centerName: t.centerId?.centerName || ''
      }));
    }

    res.json({
      success: true,
      message: subjectId
        ? 'Form options loaded for selected subject (topics + teachers)'
        : 'Form options loaded (subjects + categories)',
      data
    });
  } catch (error) {
    console.error('Faculty subject create form error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getFacultySubjectsDropdown = async (req, res) => {
  try {
    const { category, search = '', status = 'ACTIVE', page = 1, limit = 100 } = req.query;

    const conditions = [{ ...NOT_DELETED }];

    if (status && ['ACTIVE', 'INACTIVE'].includes(String(status).toUpperCase())) {
      conditions.push({ status: String(status).toUpperCase() });
    } else {
      conditions.push({ status: 'ACTIVE' });
    }
    if (category) {
      conditions.push({ categories: String(category).trim().toUpperCase() });
    }

    const trimmed = String(search ?? '').trim();
    if (trimmed) {
      conditions.push({
        subjectName: { $regex: escapeRegex(trimmed), $options: 'i' }
      });
    }

    const filter = conditions.length === 1 ? conditions[0] : { $and: conditions };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
    const skip = (pageNum - 1) * limitNum;

    const [rows, total] = await Promise.all([
      FacultySubject.find(filter)
        .select('_id facultySubjectId subjectName teacher')
        .populate('teacher', 'teacherName')
        .sort({ subjectName: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      FacultySubject.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: rows.length,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 0,
      data: rows.map(formatFacultySubjectSummary)
    });
  } catch (error) {
    console.error('Get facultySubjects dropdown error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Single faculty subject — summary only (no topics / categories / nested details) */
exports.getFacultySubjectSummary = async (req, res) => {
  try {
    const doc = await findFacultySubjectByRef(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'FacultySubject not found' });
    }

    res.json({ success: true, data: formatFacultySubjectSummary(doc) });
  } catch (error) {
    console.error('Get facultySubject summary error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Left navigation content tree grouped by category */
exports.getContentTree = async (req, res) => {
  try {
    const ref = req.params.id;
    let facultySubject = null;

    if (isValidObjectId(ref)) {
      facultySubject = await FacultySubject.findOne({ _id: ref, ...NOT_DELETED }).lean();
    } else {
      facultySubject = await FacultySubject.findOne({
        facultySubjectId: String(ref).trim(),
        ...NOT_DELETED
      }).lean();
    }

    if (!facultySubject) {
      return res.status(404).json({ success: false, message: 'FacultySubject not found' });
    }

    const folders = await SubjectContentFolder.find({
      facultySubjectId: facultySubject._id,
      status: 'ACTIVE',
      ...NOT_DELETED
    })
      .select('_id folderId folderName category')
      .sort({ folderName: 1 })
      .lean();

    const tree = {};
    for (const category of FACULTY_CATEGORIES) {
      tree[category] = [];
    }

    for (const folder of folders) {
      if (!tree[folder.category]) tree[folder.category] = [];
      tree[folder.category].push({
        _id: folder._id,
        folderId: folder.folderId,
        folderName: folder.folderName
      });
    }

    res.json({
      success: true,
      facultySubjectId: facultySubject._id,
      subjectName: facultySubject.subjectName,
      categories: facultySubject.categories || [],
      data: tree
    });
  } catch (error) {
    console.error('Get content tree error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteFacultySubject = async (req, res) => {
  try {
    const doc = await FacultySubject.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      {
        isDeleted: true,
        deletedAt: new Date(),
        status: 'INACTIVE'
      },
      { new: true, runValidators: false }
    );

    if (!doc) return res.status(404).json({ success: false, message: 'FacultySubject not found' });

    res.json({ success: true, message: 'FacultySubject deleted successfully', data: { _id: doc._id } });
  } catch (error) {
    console.error('Delete facultySubject error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### 8.5 `routes/facultySubjectRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const {
  createFacultySubject,
  getFacultySubjects,
  getFacultySubjectCreateForm,
  getFacultySubjectsDropdown,
  getFacultySubjectSummary,
  getContentTree,
  getFacultySubjectById,
  updateFacultySubject,
  updateFacultySubjectStatus,
  deleteFacultySubject
} = require('../controllers/facultySubjectController');
const {
  createFolder,
  updateFolder
} = require('../controllers/subjectContentFolderController');

router.get('/create-form', getFacultySubjectCreateForm);
router.get('/dropdown', getFacultySubjectsDropdown);
router.get('/summary/:id', getFacultySubjectSummary);
router.get('/:id/content-tree', getContentTree);
router.post('/content/folders', createFolder);
router.put('/content/folders/:id', updateFolder);
router.patch('/status/:id', updateFacultySubjectStatus);

router.post('/', createFacultySubject);
router.get('/', getFacultySubjects);
router.get('/:id', getFacultySubjectById);
router.put('/:id', updateFacultySubject);
router.delete('/:id', deleteFacultySubject);

module.exports = router;
```

### 8.6 `utils/facultyContentConstants.js`

```javascript
const {
  FACULTY_CATEGORIES
} = require('./batchFacultyConstants');

const FOLDER_STATUSES = ['ACTIVE', 'INACTIVE'];

const PUBLISH_STATUSES = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'];

/** IANA timezone ids allowed on SubjectLiveClass */
const LIVE_CLASS_TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'UTC'
];

const CLASS_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];

const REPEAT_TYPES = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'];

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const MONTHLY_PATTERNS = ['SAME_DATE', 'FIRST_WEEKDAY', 'LAST_WEEKDAY'];

module.exports = {
  FACULTY_CATEGORIES,
  FOLDER_STATUSES,
  PUBLISH_STATUSES,
  LIVE_CLASS_TIMEZONES,
  CLASS_STATUSES,
  REPEAT_TYPES,
  WEEKDAYS,
  MONTHLY_PATTERNS
};
```

### 8.7 `utils/cmsApiErrors.js`

```javascript
/**
 * Structured API errors for Faculty Subject CMS (live classes, folders).
 * Keeps `message` for backward compatibility; adds errorCode, reason, field, suggestions.
 */

const fail = ({
  code,
  message,
  reason = null,
  field = null,
  details = null,
  suggestions = []
}) => ({
  ok: false,
  errorCode: code,
  message,
  reason: reason || message,
  field,
  details,
  suggestions: Array.isArray(suggestions) ? suggestions : [suggestions].filter(Boolean)
});

const toHttpBody = (payload, httpStatus) => {
  const body = {
    success: false,
    errorCode: payload.errorCode,
    message: payload.message,
    reason: payload.reason,
    httpStatus
  };
  if (payload.field) body.field = payload.field;
  if (payload.details) body.details = payload.details;
  if (payload.suggestions?.length) body.suggestions = payload.suggestions;

  // Legacy / conflict-specific top-level fields
  if (payload.conflictType) body.conflictType = payload.conflictType;
  if (payload.conflictWith) body.conflictWith = payload.conflictWith;
  if (payload.requestedSession) body.requestedSession = payload.requestedSession;
  if (payload.errors) body.errors = payload.errors;

  return body;
};

const sendError = (res, httpStatus, payload) => res.status(httpStatus).json(toHttpBody(payload, httpStatus));

const fromValidation = (result) => {
  if (result.ok) return null;
  return toHttpBody(
    {
      errorCode: result.errorCode || 'VALIDATION_ERROR',
      message: result.message,
      reason: result.reason || result.message,
      field: result.field || null,
      details: result.details || null,
      suggestions: result.suggestions || []
    },
    400
  );
};

const formatMinutes = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const sessionFromSlot = (slot) => ({
  date: slot.date,
  startTime: formatMinutes(slot.startMins),
  endTime: formatMinutes(slot.endMins)
});

const describeRecurrence = (recurrence) => {
  if (!recurrence?.enabled) {
    return { enabled: false, summary: 'Single session (no recurrence)' };
  }
  const end = recurrence.endDate
    ? new Date(recurrence.endDate).toISOString().slice(0, 10)
    : 'open-ended';
  const start = recurrence.startDate
    ? new Date(recurrence.startDate).toISOString().slice(0, 10)
    : null;
  let summary = `${recurrence.repeatType || 'DAILY'}`;
  if (recurrence.repeatEvery > 1) summary += ` every ${recurrence.repeatEvery}`;
  if (recurrence.repeatType === 'WEEKLY' && recurrence.weekdays?.length) {
    summary += ` on ${recurrence.weekdays.join(', ')}`;
  }
  if (recurrence.repeatType === 'MONTHLY' && recurrence.monthlyPattern) {
    summary += ` (${recurrence.monthlyPattern})`;
  }
  summary += ` from ${start || '?'} to ${end}`;
  return { enabled: true, summary, repeatType: recurrence.repeatType, startDate: start, endDate: end };
};

const buildScheduleConflictPayload = (check) => {
  const isClassroom = check.conflictType === 'CLASSROOM';
  return toHttpBody(
    {
      errorCode: check.errorCode,
      message: check.message,
      reason: check.reason,
      conflictType: check.conflictType,
      requestedSession: check.requestedSession,
      conflictWith: check.conflictingSession || check.conflictWith,
      details: check.details || null,
      suggestions: check.suggestions || []
    },
    409
  );
};

const sendValidationError = (res, result) => sendError(res, 400, fromValidation(result));
const sendScheduleConflictError = (res, check) =>
  res.status(409).json(buildScheduleConflictPayload(check));

const sendNotFound = (res, { code, message, reason, suggestions = [] }) =>
  sendError(res, 404, { errorCode: code, message, reason, suggestions });

module.exports = {
  fail,
  toHttpBody,
  sendError,
  fromValidation,
  sendValidationError,
  sendScheduleConflictError,
  sendNotFound,
  formatMinutes,
  sessionFromSlot,
  describeRecurrence,
  buildScheduleConflictPayload
};
```

### 8.8 `utils/contentIdGenerator.js`

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

const generateSubjectId = () => generateSequentialId(require('../models/Subject'), 'subjectId', 'SUB');
const generateTopicId = () => generateSequentialId(require('../models/Topic'), 'topicId', 'TOP');
const generateTeacherId = () => generateSequentialId(require('../models/Teacher'), 'teacherId', 'TCH');
const generateClassroomId = () =>
  generateSequentialId(require('../models/Classroom'), 'classroomId', 'CLS');
const generateFacultySubjectId = () =>
  generateSequentialId(require('../models/FacultySubject'), 'facultySubjectId', 'FSU');
const generateBatchId = () => generateSequentialId(require('../models/Batch'), 'batchId', 'BAT');
const generateAcademicStudentId = () =>
  generateSequentialId(require('../models/AcademicStudent'), 'studentId', 'STU');
const generateBatchEnrollmentId = () =>
  generateSequentialId(require('../models/BatchEnrollment'), 'enrollmentId', 'ENR');
const generateBatchTransferId = () =>
  generateSequentialId(require('../models/BatchTransfer'), 'transferId', 'BTR');
const generateSubjectContentFolderId = () =>
  generateSequentialId(require('../models/SubjectContentFolder'), 'folderId', 'FLD');
const generateSubjectLiveClassId = () =>
  generateSequentialId(require('../models/SubjectLiveClass'), 'liveClassId', 'LVC');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

module.exports = {
  generateSubjectId,
  generateTopicId,
  generateTeacherId,
  generateClassroomId,
  generateFacultySubjectId,
  generateBatchId,
  generateAcademicStudentId,
  generateBatchEnrollmentId,
  generateBatchTransferId,
  generateSubjectContentFolderId,
  generateSubjectLiveClassId,
  isValidObjectId
};
```

### 8.9 `utils/facultyContentHelpers.js`

```javascript
const FacultySubject = require('../models/FacultySubject');
const SubjectContentFolder = require('../models/SubjectContentFolder');
const Batch = require('../models/Batch');
const Course = require('../models/Course');
const Center = require('../models/Center');
const Classroom = require('../models/Classroom');
const { isValidObjectId } = require('./contentIdGenerator');
const { NOT_DELETED } = require('./contentMastersHelpers');
const { fail } = require('./cmsApiErrors');
const {
  FACULTY_CATEGORIES,
  FOLDER_STATUSES,
  PUBLISH_STATUSES,
  LIVE_CLASS_TIMEZONES,
  CLASS_STATUSES,
  REPEAT_TYPES,
  WEEKDAYS,
  MONTHLY_PATTERNS
} = require('./facultyContentConstants');

const normalizeCategory = (value) => String(value || '').trim().toUpperCase();

const validateCategory = (category) => {
  const upper = normalizeCategory(category);
  if (!FACULTY_CATEGORIES.includes(upper)) {
    return {
      ok: false,
      message: `Invalid category. Allowed: ${FACULTY_CATEGORIES.join(', ')}`
    };
  }
  return { ok: true, value: upper };
};

const findActiveFacultySubject = async (facultySubjectId) => {
  if (!isValidObjectId(facultySubjectId)) return null;
  return FacultySubject.findOne({
    _id: facultySubjectId,
    status: 'ACTIVE',
    ...NOT_DELETED
  }).lean();
};

const validateFacultySubjectHasCategory = (facultySubject, category) => {
  if (!facultySubject.categories?.includes(category)) {
    return {
      ok: false,
      message: `Faculty subject does not include category ${category}`
    };
  }
  return { ok: true };
};

const findActiveFolder = async (folderId, { facultySubjectId, category } = {}) => {
  if (!isValidObjectId(folderId)) return null;
  const query = { _id: folderId, status: 'ACTIVE', ...NOT_DELETED };
  if (facultySubjectId) query.facultySubjectId = facultySubjectId;
  if (category) query.category = category;
  return SubjectContentFolder.findOne(query).lean();
};

const validateBatchForLiveClass = async (batchId, { facultySubjectId, centerId } = {}) => {
  if (!isValidObjectId(batchId)) {
    return fail({
      code: 'INVALID_BATCH_ID',
      field: 'batchId',
      message: 'Invalid batch id',
      reason: 'batchId is missing or not a valid MongoDB ObjectId.',
      suggestions: ['Use an id from GET /api/batches/dropdown?facultySubjectId=...']
    });
  }

  const batch = await Batch.findOne({
    _id: batchId,
    status: { $in: ['ACTIVE', 'UPCOMING'] },
    ...NOT_DELETED
  }).lean();

  if (!batch) {
    return fail({
      code: 'BATCH_NOT_ACTIVE',
      field: 'batchId',
      message: 'Invalid or inactive batch',
      reason: 'Batch was not found, is deleted, or status is not ACTIVE/UPCOMING.',
      suggestions: ['Pick a batch from GET /api/batches/dropdown?facultySubjectId=...']
    });
  }

  if (facultySubjectId) {
    const linked = (batch.facultySubjects || []).some(
      (id) => String(id) === String(facultySubjectId)
    );
    if (!linked) {
      return fail({
        code: 'BATCH_NOT_LINKED_TO_FACULTY_SUBJECT',
        field: 'batchId',
        message: 'Selected batch is not linked to this faculty subject',
        reason: 'batch.facultySubjects[] does not include the selected facultySubjectId.',
        suggestions: [
          'Link this faculty subject to the batch in Batch ERP, or choose another batch from the dropdown.'
        ]
      });
    }
  }

  if (centerId && isValidObjectId(centerId)) {
    const course = await Course.findOne({ _id: batch.course, ...NOT_DELETED }).lean();
    if (course?.center && String(course.center) !== String(centerId)) {
      return fail({
        code: 'CENTER_BATCH_MISMATCH',
        field: 'centerId',
        message: 'Selected center does not match the batch course center',
        reason: 'The batch course is tied to a different center than centerId.',
        suggestions: [
          'Select the center that matches the batch course, or pick a batch under the selected center.'
        ]
      });
    }
  }

  return { ok: true, batch };
};

const validateCenterForLiveClass = async (centerId) => {
  if (!isValidObjectId(centerId)) {
    return fail({
      code: 'INVALID_CENTER_ID',
      field: 'centerId',
      message: 'Invalid center id',
      reason: 'centerId is missing or not a valid MongoDB ObjectId.',
      suggestions: ['Use an id from GET /api/centers/dropdown']
    });
  }

  const center = await Center.findOne({
    _id: centerId,
    ...NOT_DELETED
  }).lean();

  if (!center) {
    return fail({
      code: 'CENTER_NOT_FOUND',
      field: 'centerId',
      message: 'Invalid center',
      reason: 'Center was not found or is deleted.',
      suggestions: ['Use GET /api/centers/dropdown']
    });
  }

  return { ok: true, center };
};

const validateClassroomForLiveClass = async (classroomId, centerId, batchId) => {
  if (!isValidObjectId(classroomId)) {
    return fail({
      code: 'INVALID_CLASSROOM_ID',
      field: 'classroomId',
      message: 'Invalid classroom id',
      reason: 'classroomId is missing or not a valid MongoDB ObjectId.',
      suggestions: ['Use GET /api/classrooms/dropdown?centerId=...']
    });
  }

  const classroom = await Classroom.findOne({
    _id: classroomId,
    status: 'ACTIVE',
    ...NOT_DELETED
  }).lean();

  if (!classroom) {
    return fail({
      code: 'CLASSROOM_NOT_ACTIVE',
      field: 'classroomId',
      message: 'Invalid or inactive classroom',
      reason: 'Classroom was not found, is inactive, or is deleted.',
      suggestions: ['Use GET /api/classrooms/dropdown?centerId=...']
    });
  }

  if (centerId && String(classroom.center) !== String(centerId)) {
    return fail({
      code: 'CLASSROOM_CENTER_MISMATCH',
      field: 'classroomId',
      message: 'Classroom does not belong to the selected center',
      reason: 'classroom.center does not match the centerId on the request.',
      suggestions: ['Reload classrooms after selecting centerId.']
    });
  }

  if (batchId) {
    const batchCheck = await validateBatchForLiveClass(batchId, { centerId });
    if (!batchCheck.ok) return batchCheck;
  }

  return { ok: true, classroom };
};

const validateTimeString = (startTime) => {
  const value = String(startTime || '').trim();
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return fail({
      code: 'INVALID_START_TIME',
      field: 'startTime',
      message: 'startTime must be HH:mm or HH:mm:ss',
      reason: 'startTime format is invalid.',
      suggestions: ['Examples: "10:00:00" or "10:00"']
    });
  }
  return { ok: true, value: value.length === 5 ? `${value}:00` : value };
};

const validateRecurrence = (recurrence = {}) => {
  if (!recurrence || recurrence.enabled !== true) {
    return { ok: true, value: { enabled: false } };
  }

  const repeatType = String(recurrence.repeatType || '').toUpperCase();
  if (!REPEAT_TYPES.includes(repeatType)) {
    return fail({
      code: 'INVALID_REPEAT_TYPE',
      field: 'recurrence.repeatType',
      message: `repeatType must be one of: ${REPEAT_TYPES.join(', ')}`,
      reason: 'recurrence.repeatType is missing or not allowed.',
      suggestions: [`Allowed: ${REPEAT_TYPES.join(', ')}`]
    });
  }

  const normalized = {
    enabled: true,
    repeatType,
    repeatEvery: Math.max(1, Number(recurrence.repeatEvery) || 1),
    startDate: recurrence.startDate ? new Date(recurrence.startDate) : null,
    endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
    weekdays: Array.isArray(recurrence.weekdays)
      ? recurrence.weekdays.map((d) => String(d).toUpperCase()).filter((d) => WEEKDAYS.includes(d))
      : [],
    monthlyPattern: recurrence.monthlyPattern
      ? String(recurrence.monthlyPattern).toUpperCase()
      : null,
    excludedDates: Array.isArray(recurrence.excludedDates)
      ? recurrence.excludedDates.map((d) => new Date(d)).filter((d) => !Number.isNaN(d.getTime()))
      : [],
    paused: Boolean(recurrence.paused),
    pausedUntil: recurrence.pausedUntil ? new Date(recurrence.pausedUntil) : null,
    notes: String(recurrence.notes || '').trim()
  };

  if (repeatType === 'WEEKLY' && !normalized.weekdays.length) {
    return fail({
      code: 'RECURRENCE_WEEKDAYS_REQUIRED',
      field: 'recurrence.weekdays',
      message: 'weekdays required for WEEKLY recurrence',
      reason: 'When repeatType is WEEKLY, recurrence.weekdays must include at least one day.',
      suggestions: ['Example: ["MON", "WED", "FRI"]']
    });
  }

  if (repeatType === 'MONTHLY' && !MONTHLY_PATTERNS.includes(normalized.monthlyPattern)) {
    normalized.monthlyPattern = 'SAME_DATE';
  }

  if (normalized.endDate && normalized.startDate && normalized.endDate < normalized.startDate) {
    return fail({
      code: 'RECURRENCE_INVALID_DATE_RANGE',
      field: 'recurrence.endDate',
      message: 'recurrence endDate must be on or after startDate',
      reason: 'recurrence.endDate is before recurrence.startDate.',
      suggestions: ['Set endDate to the last day of the repeat window.']
    });
  }

  return { ok: true, value: normalized };
};

const validateLiveClassPayload = async (body, { partial = false } = {}) => {
  const errors = [];
  const missingFields = [];

  const requireField = (field, label) => {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missingFields.push(field);
      errors.push(`${label} is required`);
      return false;
    }
    return true;
  };

  if (!partial || body.facultySubjectId !== undefined) requireField('facultySubjectId', 'facultySubjectId');
  if (!partial || body.folderId !== undefined) requireField('folderId', 'folderId');
  if (!partial || body.batchId !== undefined) requireField('batchId', 'batchId');
  if (!partial || body.centerId !== undefined) requireField('centerId', 'centerId');
  if (!partial || body.classroomId !== undefined) requireField('classroomId', 'classroomId');
  if (!partial || body.classTitle !== undefined) requireField('classTitle', 'classTitle');
  if (!partial || body.scheduledDate !== undefined) requireField('scheduledDate', 'scheduledDate');
  if (!partial || body.startTime !== undefined) requireField('startTime', 'startTime');
  if (!partial || body.timezone !== undefined) requireField('timezone', 'timezone');

  if (errors.length) {
    return fail({
      code: 'VALIDATION_REQUIRED_FIELDS',
      message: errors.join('; '),
      reason: 'One or more required fields are missing for this live class request.',
      details: { missingFields },
      suggestions: partial
        ? ['Send only fields you want to change, but each sent relation id must remain valid.']
        : [
            'Required on create: facultySubjectId, folderId, batchId, centerId, classroomId, classTitle, scheduledDate, startTime, timezone'
          ]
    });
  }

  let facultySubject = null;
  let folder = null;

  if (body.facultySubjectId) {
    facultySubject = await findActiveFacultySubject(body.facultySubjectId);
    if (!facultySubject) {
      return fail({
        code: 'FACULTY_SUBJECT_NOT_ACTIVE',
        field: 'facultySubjectId',
        message: 'Invalid or inactive faculty subject',
        reason: 'Faculty subject was not found, is inactive, or is deleted.',
        suggestions: ['Use GET /api/faculty-subjects/dropdown?category=LIVE_CLASS']
      });
    }
  }

  if (body.folderId && facultySubject) {
    folder = await findActiveFolder(body.folderId, {
      facultySubjectId: facultySubject._id,
      category: 'LIVE_CLASS'
    });
    if (!folder) {
      return fail({
        code: 'FOLDER_INVALID_FOR_LIVE_CLASS',
        field: 'folderId',
        message: 'Invalid folder or folder does not belong to faculty subject LIVE_CLASS category',
        reason:
          'Folder must be ACTIVE, not deleted, and tied to the same facultySubjectId with category LIVE_CLASS.',
        suggestions: [
          'Use GET /api/folders?facultySubjectId=...&category=LIVE_CLASS',
          'Create a folder via POST /api/faculty-subjects/content/folders if none exist.'
        ]
      });
    }
  }

  if (body.batchId) {
    const batchCheck = await validateBatchForLiveClass(body.batchId, {
      facultySubjectId: facultySubject?._id,
      centerId: body.centerId
    });
    if (!batchCheck.ok) return batchCheck;
  }

  if (body.centerId) {
    const centerCheck = await validateCenterForLiveClass(body.centerId);
    if (!centerCheck.ok) return centerCheck;
  }

  if (body.classroomId) {
    const classroomCheck = await validateClassroomForLiveClass(
      body.classroomId,
      body.centerId,
      body.batchId
    );
    if (!classroomCheck.ok) return classroomCheck;
  }

  if (facultySubject && !facultySubject.teacher) {
    return fail({
      code: 'FACULTY_SUBJECT_NO_TEACHER',
      field: 'facultySubjectId',
      message: 'Faculty subject must have an assigned teacher for schedule validation',
      reason: 'Faculty schedule clash checks use the teacher on the faculty subject record.',
      suggestions: ['Assign a teacher to this faculty subject in Faculty Subject ERP.']
    });
  }

  const attendanceEnabled =
    body.attendanceEnabled !== undefined ? Boolean(body.attendanceEnabled) : true;

  let startTime = body.startTime;
  if (body.startTime !== undefined) {
    const timeCheck = validateTimeString(body.startTime);
    if (!timeCheck.ok) return timeCheck;
    startTime = timeCheck.value;
  }

  let timezone = body.timezone !== undefined ? String(body.timezone).trim() : 'Asia/Kolkata';
  if (body.timezone !== undefined && !LIVE_CLASS_TIMEZONES.includes(timezone)) {
    return fail({
      code: 'INVALID_TIMEZONE',
      field: 'timezone',
      message: `timezone must be one of: ${LIVE_CLASS_TIMEZONES.join(', ')}`,
      reason: 'timezone is not in the allowed list.',
      suggestions: ['Load allowed values from GET /api/live-classes/create-form → data.enums.timezones']
    });
  }

  let publishStatus = body.publishStatus || 'DRAFT';
  if (body.publishStatus !== undefined && !PUBLISH_STATUSES.includes(body.publishStatus)) {
    return fail({
      code: 'INVALID_PUBLISH_STATUS',
      field: 'publishStatus',
      message: `publishStatus must be one of: ${PUBLISH_STATUSES.join(', ')}`,
      reason: 'publishStatus is not DRAFT, PUBLISHED, or UNPUBLISHED.',
      suggestions: ['Use PATCH /api/live-classes/:id/publish-status to change publish state only.']
    });
  }

  let classStatus = body.classStatus || 'UPCOMING';
  if (body.classStatus !== undefined && !CLASS_STATUSES.includes(body.classStatus)) {
    return fail({
      code: 'INVALID_CLASS_STATUS',
      field: 'classStatus',
      message: `classStatus must be one of: ${CLASS_STATUSES.join(', ')}`,
      reason: 'classStatus is not a valid operational status.',
      suggestions: [`Allowed: ${CLASS_STATUSES.join(', ')}`]
    });
  }

  let recurrence = { enabled: false };
  if (body.recurrence !== undefined) {
    const recCheck = validateRecurrence(body.recurrence);
    if (!recCheck.ok) return recCheck;
    recurrence = recCheck.value;
  }

  return {
    ok: true,
    facultySubject,
    folder,
    startTime,
    timezone,
    publishStatus,
    classStatus,
    recurrence,
    attendanceEnabled
  };
};

const validateFolderPayload = async ({ facultySubjectId, category, folderName }) => {
  if (!folderName?.trim()) {
    return { ok: false, message: 'folderName is required' };
  }

  const cat = validateCategory(category);
  if (!cat.ok) return cat;

  const facultySubject = await findActiveFacultySubject(facultySubjectId);
  if (!facultySubject) {
    return { ok: false, message: 'Invalid or inactive faculty subject' };
  }

  const hasCat = validateFacultySubjectHasCategory(facultySubject, cat.value);
  if (!hasCat.ok) return hasCat;

  return { ok: true, facultySubject, category: cat.value };
};

module.exports = {
  FACULTY_CATEGORIES,
  FOLDER_STATUSES,
  PUBLISH_STATUSES,
  LIVE_CLASS_TIMEZONES,
  CLASS_STATUSES,
  validateCategory,
  findActiveFacultySubject,
  findActiveFolder,
  validateFolderPayload,
  validateLiveClassPayload,
  validateBatchForLiveClass,
  validateCenterForLiveClass,
  validateClassroomForLiveClass,
  validateRecurrence
};
```

### 8.10 `models/SubjectContentFolder.js`

```javascript
const mongoose = require('mongoose');
const {
  FACULTY_CATEGORIES,
  FOLDER_STATUSES
} = require('../utils/facultyContentConstants');

const subjectContentFolderSchema = new mongoose.Schema(
  {
    folderId: {
      type: String,
      unique: true,
      trim: true
    },
    facultySubjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FacultySubject',
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: FACULTY_CATEGORIES,
      required: true,
      index: true
    },
    folderName: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: FOLDER_STATUSES,
      default: 'ACTIVE'
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
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

subjectContentFolderSchema.index(
  { facultySubjectId: 1, category: 1, folderName: 1, isDeleted: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

module.exports = mongoose.model('SubjectContentFolder', subjectContentFolderSchema);
```

### 8.11 `models/SubjectLiveClass.js`

```javascript
const mongoose = require('mongoose');
const {
  PUBLISH_STATUSES,
  LIVE_CLASS_TIMEZONES,
  CLASS_STATUSES,
  REPEAT_TYPES,
  WEEKDAYS,
  MONTHLY_PATTERNS
} = require('../utils/facultyContentConstants');

const recurrenceSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    repeatType: {
      type: String,
      enum: [...REPEAT_TYPES, null],
      default: null
    },
    repeatEvery: { type: Number, default: 1, min: 1 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    weekdays: [{ type: String, enum: WEEKDAYS }],
    monthlyPattern: {
      type: String,
      enum: [...MONTHLY_PATTERNS, null],
      default: null
    },
    excludedDates: [{ type: Date }],
    paused: { type: Boolean, default: false },
    pausedUntil: { type: Date, default: null },
    notes: { type: String, default: '', trim: true }
  },
  { _id: false }
);

const subjectLiveClassSchema = new mongoose.Schema(
  {
    liveClassId: {
      type: String,
      unique: true,
      trim: true
    },
    facultySubjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FacultySubject',
      required: true,
      index: true
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubjectContentFolder',
      required: true,
      index: true
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
      index: true
    },
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: true,
      index: true
    },
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      required: true,
      index: true
    },
    classTitle: {
      type: String,
      required: true,
      trim: true
    },
    scheduledDate: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true,
      trim: true
    },
    durationHours: { type: Number, default: 0, min: 0 },
    durationMinutes: { type: Number, default: 0, min: 0, max: 59 },
    durationSeconds: { type: Number, default: 0, min: 0, max: 59 },
    timezone: {
      type: String,
      enum: LIVE_CLASS_TIMEZONES,
      required: true,
      default: 'Asia/Kolkata',
      trim: true
    },
    attendanceEnabled: {
      type: Boolean,
      default: true
    },
    publishStatus: {
      type: String,
      enum: PUBLISH_STATUSES,
      default: 'DRAFT',
      index: true
    },
    classStatus: {
      type: String,
      enum: CLASS_STATUSES,
      default: 'UPCOMING',
      index: true
    },
    recurrence: {
      type: recurrenceSchema,
      default: () => ({ enabled: false })
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
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

subjectLiveClassSchema.index({ facultySubjectId: 1, folderId: 1, publishStatus: 1, isDeleted: 1 });
subjectLiveClassSchema.index({ classTitle: 1 });

module.exports = mongoose.model('SubjectLiveClass', subjectLiveClassSchema);
```

### 8.12 `services/recurrenceEngine.js`

```javascript
const {
  REPEAT_TYPES,
  WEEKDAYS,
  MONTHLY_PATTERNS
} = require('../utils/facultyContentConstants');

const WEEKDAY_INDEX = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

const toDateOnly = (value) => {
  const d = value instanceof Date ? new Date(value) : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const sameDay = (a, b) =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

const addDays = (date, days) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

const isExcluded = (date, excludedDates = []) =>
  excludedDates.some((ex) => {
    const e = toDateOnly(ex);
    return e && sameDay(date, e);
  });

const isPausedOn = (date, recurrence) => {
  if (!recurrence?.paused) return false;
  if (!recurrence.pausedUntil) return true;
  const until = toDateOnly(recurrence.pausedUntil);
  return until ? date <= until : true;
};

const inRange = (date, start, end) => {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
};

const getWeekdayCode = (date) => {
  const codes = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return codes[date.getUTCDay()];
};

const getFirstWeekdayOfMonth = (year, month, weekdayCode) => {
  const target = WEEKDAY_INDEX[weekdayCode];
  const d = new Date(Date.UTC(year, month, 1));
  while (d.getUTCDay() !== target) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
};

const getLastWeekdayOfMonth = (year, month, weekdayCode) => {
  const target = WEEKDAY_INDEX[weekdayCode];
  const d = new Date(Date.UTC(year, month + 1, 0));
  while (d.getUTCDay() !== target) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d;
};

const buildOccurrence = (date, startTime) => ({
  date: date.toISOString().slice(0, 10),
  startTime: startTime || '00:00:00',
  weekday: getWeekdayCode(date)
});

const filterOccurrence = (date, recurrence, excludedDates) => {
  if (isExcluded(date, excludedDates)) return false;
  if (isPausedOn(date, recurrence)) return false;
  return true;
};

const generateDailyOccurrences = ({
  startDate,
  endDate,
  repeatEvery = 1,
  startTime,
  recurrence = {},
  excludedDates = [],
  maxOccurrences = 500
}) => {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  if (!start || !end || end < start) return [];

  const occurrences = [];
  let cursor = new Date(start);
  const step = Math.max(1, Number(repeatEvery) || 1);

  while (cursor <= end && occurrences.length < maxOccurrences) {
    if (inRange(cursor, start, end) && filterOccurrence(cursor, recurrence, excludedDates)) {
      occurrences.push(buildOccurrence(cursor, startTime));
    }
    cursor = addDays(cursor, step);
  }
  return occurrences;
};

const generateWeeklyOccurrences = ({
  startDate,
  endDate,
  weekdays = [],
  startTime,
  recurrence = {},
  excludedDates = [],
  maxOccurrences = 500
}) => {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  if (!start || !end || end < start) return [];

  const allowed = new Set(
    (weekdays.length ? weekdays : ['MON']).map((d) => String(d).toUpperCase())
  );

  const occurrences = [];
  let cursor = new Date(start);

  while (cursor <= end && occurrences.length < maxOccurrences) {
    if (allowed.has(getWeekdayCode(cursor)) && filterOccurrence(cursor, recurrence, excludedDates)) {
      occurrences.push(buildOccurrence(cursor, startTime));
    }
    cursor = addDays(cursor, 1);
  }
  return occurrences;
};

const generateMonthlyOccurrences = ({
  startDate,
  endDate,
  monthlyPattern = 'SAME_DATE',
  startTime,
  recurrence = {},
  excludedDates = [],
  maxOccurrences = 500
}) => {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  if (!start || !end || end < start) return [];

  const pattern = MONTHLY_PATTERNS.includes(monthlyPattern) ? monthlyPattern : 'SAME_DATE';
  const anchorDay = start.getUTCDate();
  const anchorWeekday = getWeekdayCode(start);
  const occurrences = [];

  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();

  while (occurrences.length < maxOccurrences) {
    let occ = null;

    if (pattern === 'SAME_DATE') {
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const day = Math.min(anchorDay, lastDay);
      occ = new Date(Date.UTC(year, month, day));
    } else if (pattern === 'FIRST_WEEKDAY') {
      occ = getFirstWeekdayOfMonth(year, month, anchorWeekday);
    } else if (pattern === 'LAST_WEEKDAY') {
      occ = getLastWeekdayOfMonth(year, month, anchorWeekday);
    }

    if (occ && occ >= start && occ <= end && filterOccurrence(occ, recurrence, excludedDates)) {
      occurrences.push(buildOccurrence(occ, startTime));
    }

    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    if (new Date(Date.UTC(year, month, 1)) > end) break;
  }

  return occurrences;
};

const generateCustomOccurrences = ({
  startDate,
  endDate,
  repeatEvery = 15,
  startTime,
  recurrence = {},
  excludedDates = [],
  maxOccurrences = 500
}) =>
  generateDailyOccurrences({
    startDate,
    endDate,
    repeatEvery,
    startTime,
    recurrence,
    excludedDates,
    maxOccurrences
  });

const generateRecurrenceOccurrences = (input = {}) => {
  const recurrence = input.recurrence || {};
  if (!recurrence.enabled) {
    const single = toDateOnly(input.scheduledDate || input.startDate);
    if (!single) return [];
    if (!filterOccurrence(single, recurrence, recurrence.excludedDates || [])) return [];
    return [buildOccurrence(single, input.startTime)];
  }

  const startDate = recurrence.startDate || input.scheduledDate;
  const endDate = recurrence.endDate;
  const repeatType = String(recurrence.repeatType || 'DAILY').toUpperCase();

  if (!REPEAT_TYPES.includes(repeatType)) {
    return [];
  }

  const base = {
    startDate,
    endDate,
    startTime: input.startTime,
    recurrence,
    excludedDates: recurrence.excludedDates || [],
    maxOccurrences: input.maxOccurrences || 500
  };

  switch (repeatType) {
    case 'DAILY':
      return generateDailyOccurrences({
        ...base,
        repeatEvery: recurrence.repeatEvery || 1
      });
    case 'WEEKLY':
      return generateWeeklyOccurrences({
        ...base,
        weekdays: recurrence.weekdays || []
      });
    case 'MONTHLY':
      return generateMonthlyOccurrences({
        ...base,
        monthlyPattern: recurrence.monthlyPattern || 'SAME_DATE'
      });
    case 'CUSTOM':
      return generateCustomOccurrences({
        ...base,
        repeatEvery: recurrence.repeatEvery || 1
      });
    default:
      return [];
  }
};

const previewRecurrence = (payload) => {
  const occurrences = generateRecurrenceOccurrences(payload);
  return {
    totalSessions: occurrences.length,
    occurrences
  };
};

module.exports = {
  generateDailyOccurrences,
  generateWeeklyOccurrences,
  generateMonthlyOccurrences,
  generateCustomOccurrences,
  generateRecurrenceOccurrences,
  previewRecurrence,
  WEEKDAYS
};
```

### 8.13 `services/scheduleConflictService.js`

```javascript
const mongoose = require('mongoose');
const SubjectLiveClass = require('../models/SubjectLiveClass');
const FacultySubject = require('../models/FacultySubject');
const { isValidObjectId } = require('../utils/contentIdGenerator');
const { NOT_DELETED } = require('../utils/contentMastersHelpers');
const { previewRecurrence } = require('./recurrenceEngine');
const { sessionFromSlot, describeRecurrence } = require('../utils/cmsApiErrors');

const ACTIVE_CLASS_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED'];

const parseTimeToMinutes = (timeStr) => {
  const parts = String(timeStr || '00:00:00').trim().split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  return h * 60 + m + Math.floor(s / 60);
};

const durationToMinutes = ({ durationHours = 0, durationMinutes = 0, durationSeconds = 0 }) =>
  (Number(durationHours) || 0) * 60 +
  (Number(durationMinutes) || 0) +
  Math.floor((Number(durationSeconds) || 0) / 60);

const toDateKey = (value) => {
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const slotsOverlap = (a, b) =>
  a.date === b.date && a.startMins < b.endMins && b.startMins < a.endMins;

const formatMinutes = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Expand a live class into bookable time slots (includes all recurrence occurrences).
 */
const expandSlotsForLiveClass = ({
  scheduledDate,
  startTime,
  durationHours = 0,
  durationMinutes = 0,
  durationSeconds = 0,
  recurrence
}) => {
  const duration = durationToMinutes({ durationHours, durationMinutes, durationSeconds });
  const normalizedStart = String(startTime || '00:00:00').trim();
  const anchorDate = toDateKey(scheduledDate);
  if (!anchorDate) return [];

  let occurrences;
  if (recurrence?.enabled) {
    const preview = previewRecurrence({
      scheduledDate: anchorDate,
      startTime: normalizedStart,
      recurrence
    });
    occurrences = preview.occurrences;
  } else {
    occurrences = [{ date: anchorDate, startTime: normalizedStart }];
  }

  return occurrences.map((occ) => {
    const startMins = parseTimeToMinutes(occ.startTime || normalizedStart);
    return {
      date: occ.date,
      startMins,
      endMins: startMins + duration
    };
  });
};

const findFirstOverlap = (requestedSlots, candidateSlots) => {
  for (const req of requestedSlots) {
    for (const cand of candidateSlots) {
      if (slotsOverlap(req, cand)) {
        return { requested: req, candidate: cand };
      }
    }
  }
  return null;
};

const getDateRangeFromSlots = (slots) => {
  const dates = slots.map((s) => s.date).filter(Boolean).sort();
  if (!dates.length) return { min: null, max: null };
  return {
    min: new Date(`${dates[0]}T00:00:00.000Z`),
    max: new Date(`${dates[dates.length - 1]}T23:59:59.999Z`)
  };
};

const buildLiveClassQueryBase = (excludeLiveClassId) => {
  const query = {
    ...NOT_DELETED,
    classStatus: { $in: ACTIVE_CLASS_STATUSES }
  };
  if (excludeLiveClassId && isValidObjectId(excludeLiveClassId)) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeLiveClassId) };
  }
  return query;
};

/**
 * Requirement 7 — classroom double-booking check.
 */
const checkClassroomAvailability = async ({
  classroomId,
  scheduledDate,
  startTime,
  durationHours,
  durationMinutes,
  durationSeconds,
  recurrence,
  excludeLiveClassId
}) => {
  if (!isValidObjectId(classroomId)) {
    return {
      ok: false,
      errorCode: 'INVALID_CLASSROOM_ID',
      message: 'Invalid classroom id',
      reason: 'classroomId is missing or not a valid MongoDB ObjectId.',
      field: 'classroomId',
      suggestions: ['Use an id from GET /api/classrooms/dropdown?centerId=...']
    };
  }

  const requestedSlots = expandSlotsForLiveClass({
    scheduledDate,
    startTime,
    durationHours,
    durationMinutes,
    durationSeconds,
    recurrence
  });

  if (!requestedSlots.length) {
    return {
      ok: false,
      errorCode: 'INVALID_SCHEDULE',
      message: 'Invalid schedule for availability check',
      reason: 'Could not build time slots from scheduledDate, startTime, duration, or recurrence.',
      field: 'scheduledDate',
      suggestions: [
        'Ensure scheduledDate and startTime are valid.',
        'If recurrence.enabled is true, set startDate and endDate on recurrence.'
      ]
    };
  }

  const { min, max } = getDateRangeFromSlots(requestedSlots);
  const candidates = await SubjectLiveClass.find({
    ...buildLiveClassQueryBase(excludeLiveClassId),
    classroomId,
    $or: [
      { scheduledDate: { $gte: min, $lte: max } },
      {
        'recurrence.enabled': true,
        'recurrence.endDate': { $gte: min },
        $or: [
          { 'recurrence.startDate': { $lte: max } },
          { 'recurrence.startDate': null, scheduledDate: { $lte: max } }
        ]
      }
    ]
  })
    .select(
      '_id liveClassId classTitle scheduledDate startTime durationHours durationMinutes durationSeconds recurrence classroomId'
    )
    .lean();

  for (const candidate of candidates) {
    const candidateSlots = expandSlotsForLiveClass(candidate);
    const overlap = findFirstOverlap(requestedSlots, candidateSlots);
    if (overlap) {
      const requestedSession = sessionFromSlot(overlap.requested);
      const conflictingSession = {
        liveClassId: candidate.liveClassId,
        classTitle: candidate.classTitle,
        ...sessionFromSlot(overlap.candidate),
        recurrence: describeRecurrence(candidate.recurrence)
      };
      const recurrenceNote = conflictingSession.recurrence.enabled
        ? ` The existing class repeats (${conflictingSession.recurrence.summary}), so other dates may also be blocked.`
        : '';

      return {
        ok: false,
        errorCode: 'CLASSROOM_SCHEDULE_CONFLICT',
        message: `Classroom is already booked on ${requestedSession.date} from ${requestedSession.startTime} to ${requestedSession.endTime} (conflicts with ${candidate.liveClassId})`,
        reason: `The selected classroom is already used by "${candidate.classTitle}" (${candidate.liveClassId}) at the same time on ${requestedSession.date}.${recurrenceNote}`,
        conflictType: 'CLASSROOM',
        requestedSession,
        conflictingSession,
        details: {
          classroomId: String(classroomId),
          firstConflictDate: requestedSession.date,
          existingClassMongoId: candidate._id ? String(candidate._id) : undefined
        },
        suggestions: [
          'Choose a different classroomId.',
          'Change startTime or duration so the slot does not overlap.',
          'Adjust recurrence (startDate/endDate, weekdays, or excludedDates).',
          'Update or delete the conflicting live class if it was created in error.',
          'Preview slots: POST /api/live-classes/preview-recurrence with the same schedule.'
        ]
      };
    }
  }

  return { ok: true };
};

/**
 * Requirement 8 — faculty (teacher) double-booking check via FacultySubject.teacher.
 */
const checkFacultyAvailability = async ({
  facultySubjectId,
  scheduledDate,
  startTime,
  durationHours,
  durationMinutes,
  durationSeconds,
  recurrence,
  excludeLiveClassId
}) => {
  if (!isValidObjectId(facultySubjectId)) {
    return {
      ok: false,
      errorCode: 'INVALID_FACULTY_SUBJECT_ID',
      message: 'Invalid faculty subject id',
      reason: 'facultySubjectId is missing or not a valid MongoDB ObjectId.',
      field: 'facultySubjectId',
      suggestions: ['Use an id from GET /api/faculty-subjects/dropdown?category=LIVE_CLASS']
    };
  }

  const facultySubject = await FacultySubject.findOne({
    _id: facultySubjectId,
    ...NOT_DELETED
  })
    .select('teacher subjectName')
    .lean();

  if (!facultySubject?.teacher) {
    return {
      ok: false,
      errorCode: 'FACULTY_SUBJECT_NO_TEACHER',
      message: 'Faculty subject or teacher not found',
      reason:
        'This faculty subject has no teacher assigned. Faculty clash checks require a teacher on the faculty subject.',
      field: 'facultySubjectId',
      suggestions: [
        'Assign a teacher on the faculty subject (Faculty Subject ERP), then retry.',
        'Pick a different facultySubjectId that has a teacher.'
      ]
    };
  }

  const teacherId = facultySubject.teacher;

  const requestedSlots = expandSlotsForLiveClass({
    scheduledDate,
    startTime,
    durationHours,
    durationMinutes,
    durationSeconds,
    recurrence
  });

  if (!requestedSlots.length) {
    return {
      ok: false,
      errorCode: 'INVALID_SCHEDULE',
      message: 'Invalid schedule for availability check',
      reason: 'Could not build time slots from scheduledDate, startTime, duration, or recurrence.',
      field: 'scheduledDate',
      suggestions: [
        'Ensure scheduledDate and startTime are valid.',
        'If recurrence.enabled is true, set startDate and endDate on recurrence.'
      ]
    };
  }

  const linkedSubjects = await FacultySubject.find({
    teacher: teacherId,
    ...NOT_DELETED
  })
    .select('_id')
    .lean();

  const facultySubjectIds = linkedSubjects.map((fs) => fs._id);
  if (!facultySubjectIds.length) {
    return { ok: true };
  }

  const { min, max } = getDateRangeFromSlots(requestedSlots);
  const candidates = await SubjectLiveClass.find({
    ...buildLiveClassQueryBase(excludeLiveClassId),
    facultySubjectId: { $in: facultySubjectIds },
    $or: [
      { scheduledDate: { $gte: min, $lte: max } },
      {
        'recurrence.enabled': true,
        'recurrence.endDate': { $gte: min },
        $or: [
          { 'recurrence.startDate': { $lte: max } },
          { 'recurrence.startDate': null, scheduledDate: { $lte: max } }
        ]
      }
    ]
  })
    .select(
      '_id liveClassId classTitle facultySubjectId scheduledDate startTime durationHours durationMinutes durationSeconds recurrence'
    )
    .populate('facultySubjectId', 'subjectName teacher')
    .lean();

  for (const candidate of candidates) {
    const candidateSlots = expandSlotsForLiveClass(candidate);
    const overlap = findFirstOverlap(requestedSlots, candidateSlots);
    if (overlap) {
      const fsName =
        candidate.facultySubjectId?.subjectName || facultySubject.subjectName || 'another subject';
      const requestedSession = sessionFromSlot(overlap.requested);
      const conflictingSession = {
        liveClassId: candidate.liveClassId,
        classTitle: candidate.classTitle,
        facultySubjectName: fsName,
        ...sessionFromSlot(overlap.candidate),
        recurrence: describeRecurrence(candidate.recurrence)
      };
      const recurrenceNote = conflictingSession.recurrence.enabled
        ? ` That class repeats (${conflictingSession.recurrence.summary}).`
        : '';

      return {
        ok: false,
        errorCode: 'FACULTY_SCHEDULE_CONFLICT',
        message: `Teacher is already scheduled on ${requestedSession.date} from ${requestedSession.startTime} to ${requestedSession.endTime} (conflicts with ${candidate.liveClassId})`,
        reason: `The teacher assigned to this faculty subject is already teaching "${candidate.classTitle}" (${fsName} / ${candidate.liveClassId}) at the same time on ${requestedSession.date}.${recurrenceNote}`,
        conflictType: 'FACULTY',
        requestedSession,
        conflictingSession,
        details: {
          facultySubjectId: String(facultySubjectId),
          facultySubjectName: facultySubject.subjectName,
          firstConflictDate: requestedSession.date
        },
        suggestions: [
          'Use a different faculty subject with another teacher.',
          'Change startTime or duration to avoid overlap.',
          'Adjust recurrence dates or excludedDates.',
          'Reschedule or delete the conflicting live class.',
          'Note: clash is based on FacultySubject.teacher, not a per-class teacher field.'
        ]
      };
    }
  }

  return { ok: true };
};

/**
 * Requirement 6 — block folder delete when live classes exist.
 */
const assertFolderCanBeDeleted = async (folderId) => {
  if (!isValidObjectId(folderId)) {
    return {
      ok: false,
      errorCode: 'INVALID_FOLDER_ID',
      message: 'Invalid folder id',
      reason: 'Folder id is missing or not a valid MongoDB ObjectId.',
      field: 'folderId'
    };
  }

  const count = await SubjectLiveClass.countDocuments({
    folderId,
    ...NOT_DELETED
  });

  if (count > 0) {
    return {
      ok: false,
      errorCode: 'FOLDER_HAS_LIVE_CLASSES',
      message: `Cannot delete folder: ${count} live class(es) still exist in this folder. Remove or move them first.`,
      reason: 'Folders with live classes cannot be deleted (REQ-6).',
      field: 'folderId',
      details: { liveClassCount: count },
      suggestions: [
        'Delete or move all live classes in this folder first.',
        'Use GET /api/live-classes?folderId=... to list classes in the folder.'
      ]
    };
  }

  return { ok: true };
};

const runScheduleConflictChecks = async (payload, excludeLiveClassId) => {
  const classroomCheck = await checkClassroomAvailability({
    classroomId: payload.classroomId,
    scheduledDate: payload.scheduledDate,
    startTime: payload.startTime,
    durationHours: payload.durationHours,
    durationMinutes: payload.durationMinutes,
    durationSeconds: payload.durationSeconds,
    recurrence: payload.recurrence,
    excludeLiveClassId
  });
  if (!classroomCheck.ok) return classroomCheck;

  const facultyCheck = await checkFacultyAvailability({
    facultySubjectId: payload.facultySubjectId,
    scheduledDate: payload.scheduledDate,
    startTime: payload.startTime,
    durationHours: payload.durationHours,
    durationMinutes: payload.durationMinutes,
    durationSeconds: payload.durationSeconds,
    recurrence: payload.recurrence,
    excludeLiveClassId
  });
  if (!facultyCheck.ok) return facultyCheck;

  return { ok: true };
};

module.exports = {
  expandSlotsForLiveClass,
  checkClassroomAvailability,
  checkFacultyAvailability,
  assertFolderCanBeDeleted,
  runScheduleConflictChecks,
  parseTimeToMinutes,
  durationToMinutes
};
```

### 8.14 `controllers/subjectContentFolderController.js`

```javascript
const SubjectContentFolder = require('../models/SubjectContentFolder');
const SubjectLiveClass = require('../models/SubjectLiveClass');
const { assertFolderCanBeDeleted } = require('../services/scheduleConflictService');
const {
  generateSubjectContentFolderId,
  isValidObjectId
} = require('../utils/contentIdGenerator');
const { NOT_DELETED, escapeRegex, parsePagination } = require('../utils/contentMastersHelpers');
const {
  validateFolderPayload,
  validateCategory
} = require('../utils/facultyContentHelpers');
const { sendValidationError, sendError } = require('../utils/cmsApiErrors');

const formatFolder = (doc) => ({
  _id: doc._id,
  folderId: doc.folderId,
  facultySubjectId: doc.facultySubjectId,
  category: doc.category,
  folderName: doc.folderName,
  description: doc.description || '',
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

exports.createFolder = async (req, res) => {
  try {
    const { facultySubjectId, category, folderName, description = '' } = req.body;

    const validation = await validateFolderPayload({ facultySubjectId, category, folderName });
    if (!validation.ok) {
      return sendValidationError(res, validation);
    }

    const duplicate = await SubjectContentFolder.findOne({
      facultySubjectId: validation.facultySubject._id,
      category: validation.category,
      folderName: folderName.trim(),
      ...NOT_DELETED
    }).lean();

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Folder with this name already exists for this category'
      });
    }

    const folder = await SubjectContentFolder.create({
      folderId: await generateSubjectContentFolderId(),
      facultySubjectId: validation.facultySubject._id,
      category: validation.category,
      folderName: folderName.trim(),
      description: String(description || '').trim(),
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null
    });

    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      data: formatFolder(folder.toObject())
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateFolder = async (req, res) => {
  try {
    const folder = await SubjectContentFolder.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    if (req.body.folderName !== undefined) {
      const nextName = String(req.body.folderName).trim();
      if (!nextName) {
        return res.status(400).json({ success: false, message: 'folderName cannot be empty' });
      }

      if (nextName !== folder.folderName) {
        const duplicate = await SubjectContentFolder.findOne({
          _id: { $ne: folder._id },
          facultySubjectId: folder.facultySubjectId,
          category: folder.category,
          folderName: nextName,
          ...NOT_DELETED
        }).lean();

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: 'Folder with this name already exists for this category'
          });
        }
      }

      folder.folderName = nextName;
    }

    if (req.body.description !== undefined) {
      folder.description = String(req.body.description || '').trim();
    }

    if (req.body.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'status must be ACTIVE or INACTIVE' });
      }
      folder.status = req.body.status;
    }

    folder.updatedBy = req.user?._id || null;
    await folder.save();

    res.json({
      success: true,
      message: 'Folder updated successfully',
      data: formatFolder(folder.toObject())
    });
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteFolder = async (req, res) => {
  try {
    const folder = await SubjectContentFolder.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    const canDelete = await assertFolderCanBeDeleted(folder._id);
    if (!canDelete.ok) {
      return sendError(res, 409, {
        errorCode: canDelete.errorCode,
        message: canDelete.message,
        reason: canDelete.reason,
        field: canDelete.field,
        details: canDelete.details,
        suggestions: canDelete.suggestions
      });
    }

    folder.isDeleted = true;
    folder.deletedAt = new Date();
    folder.status = 'INACTIVE';
    folder.updatedBy = req.user?._id || null;
    await folder.save();

    res.json({
      success: true,
      message: 'Folder deleted successfully',
      data: { _id: folder._id }
    });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.listFolders = async (req, res) => {
  try {
    const { facultySubjectId, category, search = '', status } = req.query;

    if (!facultySubjectId || !isValidObjectId(facultySubjectId)) {
      return res.status(400).json({ success: false, message: 'Valid facultySubjectId is required' });
    }

    const query = {
      facultySubjectId,
      ...NOT_DELETED
    };

    if (category) {
      const cat = validateCategory(category);
      if (!cat.ok) return res.status(400).json({ success: false, message: cat.message });
      query.category = cat.value;
    }

    if (status && ['ACTIVE', 'INACTIVE'].includes(String(status).toUpperCase())) {
      query.status = String(status).toUpperCase();
    }

    const trimmed = String(search).trim();
    if (trimmed) {
      query.folderName = { $regex: escapeRegex(trimmed), $options: 'i' };
    }

    const { page, limit, skip } = parsePagination(req.query);

    const [rows, total] = await Promise.all([
      SubjectContentFolder.find(query).sort({ folderName: 1 }).skip(skip).limit(limit).lean(),
      SubjectContentFolder.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map(formatFolder)
    });
  } catch (error) {
    console.error('List folders error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getFolderById = async (req, res) => {
  try {
    const folder = await SubjectContentFolder.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }
    res.json({ success: true, data: formatFolder(folder) });
  } catch (error) {
    console.error('Get folder error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getFolderContentSummary = async (req, res) => {
  try {
    const folder = await SubjectContentFolder.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    const baseMatch = { folderId: folder._id, ...NOT_DELETED };
    const [total, published, draft, unpublished] = await Promise.all([
      SubjectLiveClass.countDocuments(baseMatch),
      SubjectLiveClass.countDocuments({ ...baseMatch, publishStatus: 'PUBLISHED' }),
      SubjectLiveClass.countDocuments({ ...baseMatch, publishStatus: 'DRAFT' }),
      SubjectLiveClass.countDocuments({ ...baseMatch, publishStatus: 'UNPUBLISHED' })
    ]);

    res.json({
      success: true,
      data: {
        folderId: folder.folderId,
        folderName: folder.folderName,
        liveClassCount: total,
        publishedCount: published,
        draftCount: draft,
        unpublishedCount: unpublished
      }
    });
  } catch (error) {
    console.error('Folder content summary error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### 8.15 `controllers/subjectLiveClassController.js`

```javascript
const mongoose = require('mongoose');
const SubjectLiveClass = require('../models/SubjectLiveClass');
const SubjectContentFolder = require('../models/SubjectContentFolder');
const FacultySubject = require('../models/FacultySubject');
const {
  generateSubjectLiveClassId,
  isValidObjectId
} = require('../utils/contentIdGenerator');
const { NOT_DELETED, escapeRegex, parsePagination, parseSort } = require('../utils/contentMastersHelpers');
const Batch = require('../models/Batch');
const Center = require('../models/Center');
const Classroom = require('../models/Classroom');
const {
  validateLiveClassPayload,
  validateRecurrence,
  validateTimeString,
  PUBLISH_STATUSES,
  LIVE_CLASS_TIMEZONES,
  CLASS_STATUSES,
  REPEAT_TYPES,
  WEEKDAYS,
  MONTHLY_PATTERNS
} = require('../utils/facultyContentHelpers');
const { previewRecurrence } = require('../services/recurrenceEngine');
const { runScheduleConflictChecks } = require('../services/scheduleConflictService');
const {
  sendValidationError,
  sendScheduleConflictError,
  sendNotFound,
  fail
} = require('../utils/cmsApiErrors');

const formatLiveClass = (doc) => ({
  _id: doc._id,
  liveClassId: doc.liveClassId,
  facultySubjectId: doc.facultySubjectId,
  folderId: doc.folderId,
  batchId: doc.batchId,
  centerId: doc.centerId,
  classroomId: doc.classroomId,
  classTitle: doc.classTitle,
  scheduledDate: doc.scheduledDate,
  startTime: doc.startTime,
  durationHours: doc.durationHours ?? 0,
  durationMinutes: doc.durationMinutes ?? 0,
  durationSeconds: doc.durationSeconds ?? 0,
  timezone: doc.timezone,
  attendanceEnabled: doc.attendanceEnabled !== false,
  publishStatus: doc.publishStatus,
  classStatus: doc.classStatus,
  recurrence: doc.recurrence || { enabled: false },
  folderName: doc.folderName || doc.folder?.folderName || '',
  facultySubjectName: doc.facultySubjectName || doc.facultySubject?.subjectName || '',
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildListPipeline = ({
  facultySubjectId,
  folderId,
  publishStatus,
  classStatus,
  batchId,
  centerId,
  search = '',
  sort,
  skip,
  limit
}) => {
  const match = { isDeleted: false };

  if (facultySubjectId && isValidObjectId(facultySubjectId)) {
    match.facultySubjectId = new mongoose.Types.ObjectId(facultySubjectId);
  }
  if (folderId && isValidObjectId(folderId)) {
    match.folderId = new mongoose.Types.ObjectId(folderId);
  }
  if (publishStatus && PUBLISH_STATUSES.includes(publishStatus)) {
    match.publishStatus = publishStatus;
  }
  if (classStatus) match.classStatus = classStatus;
  if (batchId && isValidObjectId(batchId)) {
    match.batchId = new mongoose.Types.ObjectId(batchId);
  }
  if (centerId && isValidObjectId(centerId)) {
    match.centerId = new mongoose.Types.ObjectId(centerId);
  }

  const pipeline = [{ $match: match }];

  pipeline.push({
    $lookup: {
      from: 'subjectcontentfolders',
      localField: 'folderId',
      foreignField: '_id',
      as: 'folderDoc'
    }
  });
  pipeline.push({
    $lookup: {
      from: 'facultysubjects',
      localField: 'facultySubjectId',
      foreignField: '_id',
      as: 'facultySubjectDoc'
    }
  });
  pipeline.push({ $unwind: { path: '$folderDoc', preserveNullAndEmptyArrays: true } });
  pipeline.push({ $unwind: { path: '$facultySubjectDoc', preserveNullAndEmptyArrays: true } });

  const trimmed = String(search).trim();
  if (trimmed) {
    const term = escapeRegex(trimmed);
    pipeline.push({
      $match: {
        $or: [
          { classTitle: { $regex: term, $options: 'i' } },
          { 'folderDoc.folderName': { $regex: term, $options: 'i' } },
          { 'facultySubjectDoc.subjectName': { $regex: term, $options: 'i' } }
        ]
      }
    });
  }

  pipeline.push({
    $facet: {
      rows: [
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            liveClassId: 1,
            facultySubjectId: 1,
            folderId: 1,
            batchId: 1,
            centerId: 1,
            classroomId: 1,
            classTitle: 1,
            scheduledDate: 1,
            startTime: 1,
            durationHours: 1,
            durationMinutes: 1,
            durationSeconds: 1,
            timezone: 1,
            attendanceEnabled: 1,
            publishStatus: 1,
            classStatus: 1,
            recurrence: 1,
            createdAt: 1,
            updatedAt: 1,
            folderName: '$folderDoc.folderName',
            facultySubjectName: '$facultySubjectDoc.subjectName'
          }
        }
      ],
      total: [{ $count: 'count' }]
    }
  });

  return pipeline;
};

exports.createLiveClass = async (req, res) => {
  try {
    const validation = await validateLiveClassPayload(req.body);
    if (!validation.ok) {
      return sendValidationError(res, validation);
    }

    const scheduleCheck = await runScheduleConflictChecks({
      facultySubjectId: validation.facultySubject._id,
      classroomId: req.body.classroomId,
      scheduledDate: req.body.scheduledDate,
      startTime: validation.startTime,
      durationHours: req.body.durationHours,
      durationMinutes: req.body.durationMinutes,
      durationSeconds: req.body.durationSeconds,
      recurrence: validation.recurrence
    });
    if (!scheduleCheck.ok) {
      return sendScheduleConflictError(res, scheduleCheck);
    }

    const doc = await SubjectLiveClass.create({
      liveClassId: await generateSubjectLiveClassId(),
      facultySubjectId: validation.facultySubject._id,
      folderId: validation.folder._id,
      batchId: req.body.batchId,
      centerId: req.body.centerId,
      classroomId: req.body.classroomId,
      classTitle: String(req.body.classTitle).trim(),
      scheduledDate: new Date(req.body.scheduledDate),
      startTime: validation.startTime,
      durationHours: Number(req.body.durationHours) || 0,
      durationMinutes: Number(req.body.durationMinutes) || 0,
      durationSeconds: Number(req.body.durationSeconds) || 0,
      timezone: validation.timezone,
      attendanceEnabled: validation.attendanceEnabled,
      publishStatus: validation.publishStatus,
      classStatus: validation.classStatus,
      recurrence: validation.recurrence,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null
    });

    res.status(201).json({
      success: true,
      message: 'Live class created successfully',
      data: formatLiveClass(doc.toObject())
    });
  } catch (error) {
    console.error('Create live class error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLiveClasses = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ['createdAt', 'scheduledDate', 'classTitle', 'liveClassId']);

    const pipeline = buildListPipeline({
      facultySubjectId: req.query.facultySubjectId,
      folderId: req.query.folderId,
      publishStatus: req.query.publishStatus,
      classStatus: req.query.classStatus,
      batchId: req.query.batchId,
      centerId: req.query.centerId,
      search: req.query.search ?? '',
      sort,
      skip,
      limit
    });

    const [result] = await SubjectLiveClass.aggregate(pipeline);
    const rows = result?.rows || [];
    const total = result?.total?.[0]?.count || 0;

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map((row) => formatLiveClass({ ...row, _id: row._id }))
    });
  } catch (error) {
    console.error('List live classes error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLiveClassById = async (req, res) => {
  try {
    const doc = await SubjectLiveClass.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!doc) {
      return sendNotFound(res, {
        code: 'LIVE_CLASS_NOT_FOUND',
        message: 'Live class not found',
        reason: 'No active live class exists for this id (it may be deleted).',
        suggestions: ['Use GET /api/live-classes to list classes and copy the MongoDB _id.']
      });
    }

    const [folder, facultySubject] = await Promise.all([
      SubjectContentFolder.findById(doc.folderId).select('folderName').lean(),
      FacultySubject.findById(doc.facultySubjectId).select('subjectName').lean()
    ]);

    res.json({
      success: true,
      data: formatLiveClass({
        ...doc,
        folderName: folder?.folderName,
        facultySubjectName: facultySubject?.subjectName
      })
    });
  } catch (error) {
    console.error('Get live class error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateLiveClass = async (req, res) => {
  try {
    const existing = await SubjectLiveClass.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!existing) {
      return sendNotFound(res, {
        code: 'LIVE_CLASS_NOT_FOUND',
        message: 'Live class not found',
        reason: 'No active live class exists for this id (it may be deleted).',
        suggestions: ['Verify the id from GET /api/live-classes/:id or list endpoint.']
      });
    }

    const merged = {
      facultySubjectId: req.body.facultySubjectId ?? existing.facultySubjectId,
      folderId: req.body.folderId ?? existing.folderId,
      batchId: req.body.batchId ?? existing.batchId,
      centerId: req.body.centerId ?? existing.centerId,
      classroomId: req.body.classroomId ?? existing.classroomId,
      classTitle: req.body.classTitle ?? existing.classTitle,
      scheduledDate: req.body.scheduledDate ?? existing.scheduledDate,
      startTime: req.body.startTime ?? existing.startTime,
      timezone: req.body.timezone ?? existing.timezone,
      attendanceEnabled:
        req.body.attendanceEnabled !== undefined
          ? req.body.attendanceEnabled
          : existing.attendanceEnabled,
      publishStatus: req.body.publishStatus ?? existing.publishStatus,
      classStatus: req.body.classStatus ?? existing.classStatus,
      recurrence: req.body.recurrence ?? existing.recurrence
    };

    const validation = await validateLiveClassPayload(merged, { partial: true });
    if (!validation.ok) {
      return sendValidationError(res, validation);
    }

    const scheduleCheck = await runScheduleConflictChecks(
      {
        facultySubjectId: validation.facultySubject._id,
        classroomId: merged.classroomId,
        scheduledDate: merged.scheduledDate,
        startTime: validation.startTime,
        durationHours:
          req.body.durationHours !== undefined ? req.body.durationHours : existing.durationHours,
        durationMinutes:
          req.body.durationMinutes !== undefined
            ? req.body.durationMinutes
            : existing.durationMinutes,
        durationSeconds:
          req.body.durationSeconds !== undefined
            ? req.body.durationSeconds
            : existing.durationSeconds,
        recurrence: validation.recurrence
      },
      existing._id
    );
    if (!scheduleCheck.ok) {
      return sendScheduleConflictError(res, scheduleCheck);
    }

    if (req.body.classTitle !== undefined) existing.classTitle = String(req.body.classTitle).trim();
    if (req.body.scheduledDate !== undefined) existing.scheduledDate = new Date(req.body.scheduledDate);
    if (req.body.startTime !== undefined) existing.startTime = validation.startTime;
    if (req.body.durationHours !== undefined) existing.durationHours = Number(req.body.durationHours) || 0;
    if (req.body.durationMinutes !== undefined) existing.durationMinutes = Number(req.body.durationMinutes) || 0;
    if (req.body.durationSeconds !== undefined) existing.durationSeconds = Number(req.body.durationSeconds) || 0;
    if (req.body.timezone !== undefined) existing.timezone = validation.timezone;
    if (req.body.batchId !== undefined) existing.batchId = req.body.batchId;
    if (req.body.centerId !== undefined) existing.centerId = req.body.centerId;
    if (req.body.classroomId !== undefined) existing.classroomId = req.body.classroomId;
    if (req.body.attendanceEnabled !== undefined) {
      existing.attendanceEnabled = validation.attendanceEnabled;
    }
    if (req.body.folderId !== undefined) existing.folderId = validation.folder._id;
    if (req.body.facultySubjectId !== undefined) existing.facultySubjectId = validation.facultySubject._id;
    if (req.body.publishStatus !== undefined) existing.publishStatus = validation.publishStatus;
    if (req.body.classStatus !== undefined) existing.classStatus = validation.classStatus;
    if (req.body.recurrence !== undefined) existing.recurrence = validation.recurrence;

    existing.updatedBy = req.user?._id || null;
    await existing.save();

    res.json({
      success: true,
      message: 'Live class updated successfully',
      data: formatLiveClass(existing.toObject())
    });
  } catch (error) {
    console.error('Update live class error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updatePublishStatus = async (req, res) => {
  try {
    const { publishStatus } = req.body;
    if (!PUBLISH_STATUSES.includes(publishStatus)) {
      return sendValidationError(
        res,
        fail({
          code: 'INVALID_PUBLISH_STATUS',
          field: 'publishStatus',
          message: `publishStatus must be one of: ${PUBLISH_STATUSES.join(', ')}`,
          reason: 'publishStatus must be DRAFT, PUBLISHED, or UNPUBLISHED.',
          suggestions: [`Allowed: ${PUBLISH_STATUSES.join(', ')}`]
        })
      );
    }

    const doc = await SubjectLiveClass.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { publishStatus, updatedBy: req.user?._id || null },
      { new: true }
    ).lean();

    if (!doc) {
      return sendNotFound(res, {
        code: 'LIVE_CLASS_NOT_FOUND',
        message: 'Live class not found',
        reason: 'Cannot update publish status — live class not found or deleted.'
      });
    }

    res.json({
      success: true,
      message: `Live class ${publishStatus.toLowerCase()} successfully`,
      data: formatLiveClass(doc)
    });
  } catch (error) {
    console.error('Update publish status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const toPreviewDateString = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const runRecurrencePreview = ({ scheduledDate, startTime, recurrence, maxOccurrences }) => {
  const anchorDate = toPreviewDateString(scheduledDate);
  if (!anchorDate) {
    return {
      ok: false,
      error: fail({
        code: 'VALIDATION_REQUIRED_FIELDS',
        field: 'scheduledDate',
        message: 'scheduledDate is required',
        reason: 'Preview recurrence needs a valid anchor date.',
        suggestions: ['Use YYYY-MM-DD, e.g. "2026-05-29".']
      })
    };
  }

  const result = previewRecurrence({
    scheduledDate: anchorDate,
    startTime: startTime || '00:00:00',
    recurrence: recurrence || { enabled: false },
    maxOccurrences: maxOccurrences || 500
  });

  return { ok: true, ...result };
};

exports.previewRecurrence = async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { scheduledDate, startTime, recurrence, maxOccurrences } = body;

    let normalizedStart = startTime || '00:00:00';
    if (startTime !== undefined) {
      const timeCheck = validateTimeString(startTime);
      if (!timeCheck.ok) return sendValidationError(res, timeCheck);
      normalizedStart = timeCheck.value;
    }

    let normalizedRecurrence = recurrence || { enabled: false };
    if (recurrence !== undefined) {
      const recCheck = validateRecurrence(recurrence);
      if (!recCheck.ok) return sendValidationError(res, recCheck);
      normalizedRecurrence = recCheck.value;
    }

    const preview = runRecurrencePreview({
      scheduledDate,
      startTime: normalizedStart,
      recurrence: normalizedRecurrence,
      maxOccurrences
    });
    if (!preview.ok) return sendValidationError(res, preview.error);

    res.json({
      success: true,
      previewMode: 'STANDALONE',
      appliedInput: {
        scheduledDate: toPreviewDateString(scheduledDate),
        startTime: normalizedStart,
        recurrence: normalizedRecurrence
      },
      totalSessions: preview.totalSessions,
      occurrences: preview.occurrences
    });
  } catch (error) {
    console.error('Preview recurrence error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Preview recurrence for an existing live class. Body fields are optional overrides.
 */
exports.previewRecurrenceForLiveClass = async (req, res) => {
  try {
    const source = await SubjectLiveClass.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!source) {
      return sendNotFound(res, {
        code: 'LIVE_CLASS_NOT_FOUND',
        message: 'Live class not found',
        reason: 'Cannot preview recurrence — live class not found or deleted.',
        suggestions: ['Use GET /api/live-classes to find the MongoDB _id.']
      });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};

    const scheduledDate =
      body.scheduledDate !== undefined ? body.scheduledDate : source.scheduledDate;

    let startTime = body.startTime !== undefined ? body.startTime : source.startTime;
    if (body.startTime !== undefined) {
      const timeCheck = validateTimeString(body.startTime);
      if (!timeCheck.ok) return sendValidationError(res, timeCheck);
      startTime = timeCheck.value;
    } else if (startTime) {
      const timeCheck = validateTimeString(startTime);
      if (timeCheck.ok) startTime = timeCheck.value;
    }

    const recurrence =
      body.recurrence !== undefined
        ? { ...(source.recurrence || { enabled: false }), ...body.recurrence }
        : source.recurrence || { enabled: false };

    const recCheck = validateRecurrence(recurrence);
    if (!recCheck.ok) return sendValidationError(res, recCheck);

    const preview = runRecurrencePreview({
      scheduledDate,
      startTime,
      recurrence: recCheck.value,
      maxOccurrences: body.maxOccurrences
    });
    if (!preview.ok) return sendValidationError(res, preview.error);

    res.json({
      success: true,
      previewMode: 'LIVE_CLASS',
      _id: source._id,
      liveClassId: source.liveClassId,
      sourceLiveClassId: source._id,
      classTitle: source.classTitle,
      appliedInput: {
        scheduledDate: toPreviewDateString(scheduledDate),
        startTime,
        recurrence: recCheck.value
      },
      overridesFromBody: {
        scheduledDate: body.scheduledDate !== undefined,
        startTime: body.startTime !== undefined,
        recurrence: body.recurrence !== undefined,
        maxOccurrences: body.maxOccurrences !== undefined
      },
      totalSessions: preview.totalSessions,
      occurrences: preview.occurrences
    });
  } catch (error) {
    console.error('Preview recurrence for live class error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const buildDuplicateClassTitle = (sourceTitle, overrideTitle) => {
  const custom = String(overrideTitle || '').trim();
  if (custom) return custom;

  const base = String(sourceTitle || 'Live Class').trim();
  if (/\(copy\)\s*$/i.test(base)) return base;
  return `${base} (Copy)`;
};

exports.duplicateLiveClass = async (req, res) => {
  try {
    const source = await SubjectLiveClass.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!source) {
      return sendNotFound(res, {
        code: 'LIVE_CLASS_NOT_FOUND',
        message: 'Live class not found',
        reason: 'Cannot duplicate — source live class not found or deleted.'
      });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};

    const clone = {
      liveClassId: await generateSubjectLiveClassId(),
      facultySubjectId: source.facultySubjectId,
      folderId: source.folderId,
      batchId: source.batchId,
      centerId: source.centerId,
      classroomId: source.classroomId,
      classTitle: buildDuplicateClassTitle(source.classTitle, body.classTitle),
      scheduledDate: source.scheduledDate,
      startTime: source.startTime,
      durationHours: source.durationHours ?? 0,
      durationMinutes: source.durationMinutes ?? 0,
      durationSeconds: source.durationSeconds ?? 0,
      timezone: source.timezone,
      attendanceEnabled: source.attendanceEnabled !== false,
      publishStatus: 'DRAFT',
      classStatus: 'UPCOMING',
      recurrence: source.recurrence || { enabled: false },
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null
    };

    const doc = await SubjectLiveClass.create(clone);

    res.status(201).json({
      success: true,
      message: 'Live class duplicated as draft',
      data: formatLiveClass(doc.toObject())
    });
  } catch (error) {
    console.error('Duplicate live class error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLiveClassDashboardSummary = async (req, res) => {
  try {
    const match = { ...NOT_DELETED };
    const { facultySubjectId, folderId, batchId, centerId } = req.query;

    if (facultySubjectId && isValidObjectId(facultySubjectId)) {
      match.facultySubjectId = new mongoose.Types.ObjectId(facultySubjectId);
    }
    if (folderId && isValidObjectId(folderId)) {
      match.folderId = new mongoose.Types.ObjectId(folderId);
    }
    if (batchId && isValidObjectId(batchId)) {
      match.batchId = new mongoose.Types.ObjectId(batchId);
    }
    if (centerId && isValidObjectId(centerId)) {
      match.centerId = new mongoose.Types.ObjectId(centerId);
    }

    const [totalClasses, draftClasses, publishedClasses, unpublishedClasses, upcomingClasses, ongoingClasses, completedClasses, cancelledClasses] =
      await Promise.all([
        SubjectLiveClass.countDocuments(match),
        SubjectLiveClass.countDocuments({ ...match, publishStatus: 'DRAFT' }),
        SubjectLiveClass.countDocuments({ ...match, publishStatus: 'PUBLISHED' }),
        SubjectLiveClass.countDocuments({ ...match, publishStatus: 'UNPUBLISHED' }),
        SubjectLiveClass.countDocuments({ ...match, classStatus: 'UPCOMING' }),
        SubjectLiveClass.countDocuments({ ...match, classStatus: 'ONGOING' }),
        SubjectLiveClass.countDocuments({ ...match, classStatus: 'COMPLETED' }),
        SubjectLiveClass.countDocuments({ ...match, classStatus: 'CANCELLED' })
      ]);

    res.json({
      success: true,
      data: {
        totalClasses,
        draftClasses,
        publishedClasses,
        unpublishedClasses,
        upcomingClasses,
        ongoingClasses,
        completedClasses,
        cancelledClasses
      }
    });
  } catch (error) {
    console.error('Live class dashboard summary error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const CMS_DEPENDENCY_FLOW = [
  { step: 1, field: 'facultySubjectId', api: 'GET /api/faculty-subjects/dropdown?category=LIVE_CLASS' },
  { step: 2, field: 'folderId', api: 'GET /api/folders?facultySubjectId={facultySubjectId}&category=LIVE_CLASS' },
  { step: 3, field: 'batchId', api: 'GET /api/batches/dropdown?facultySubjectId={facultySubjectId}' },
  { step: 4, field: 'centerId', api: 'GET /api/centers/dropdown' },
  { step: 5, field: 'classroomId', api: 'GET /api/classrooms/dropdown?centerId={centerId}' },
  { step: 6, field: 'create', api: 'POST /api/live-classes' }
];

exports.getLiveClassCreateForm = async (req, res) => {
  try {
    const { facultySubjectId, folderId, centerId } = req.query;
    const data = {
      defaults: {
        timezone: 'Asia/Kolkata',
        publishStatus: 'DRAFT',
        classStatus: 'UPCOMING',
        attendanceEnabled: true,
        durationHours: 0,
        durationMinutes: 0,
        durationSeconds: 0,
        recurrence: { enabled: false }
      },
      enums: {
        timezones: LIVE_CLASS_TIMEZONES,
        publishStatuses: PUBLISH_STATUSES,
        classStatuses: CLASS_STATUSES,
        repeatTypes: REPEAT_TYPES,
        weekdays: WEEKDAYS,
        monthlyPatterns: MONTHLY_PATTERNS
      },
      dependencyFlow: CMS_DEPENDENCY_FLOW,
      dropdownApis: {
        facultySubjects: '/api/faculty-subjects/dropdown?category=LIVE_CLASS',
        folders: '/api/folders?facultySubjectId={facultySubjectId}&category=LIVE_CLASS',
        batches: '/api/batches/dropdown?facultySubjectId={facultySubjectId}',
        centers: '/api/centers/dropdown',
        classrooms: '/api/classrooms/dropdown?centerId={centerId}'
      }
    };

    if (facultySubjectId && isValidObjectId(facultySubjectId)) {
      const [facultySubject, folders, batches] = await Promise.all([
        FacultySubject.findOne({ _id: facultySubjectId, ...NOT_DELETED, status: 'ACTIVE' })
          .select('_id facultySubjectId subjectName teacher categories')
          .populate('teacher', 'teacherName')
          .lean(),
        SubjectContentFolder.find({
          facultySubjectId,
          category: 'LIVE_CLASS',
          status: 'ACTIVE',
          ...NOT_DELETED
        })
          .select('_id folderId folderName')
          .sort({ folderName: 1 })
          .lean(),
        Batch.find({
          facultySubjects: facultySubjectId,
          status: { $in: ['ACTIVE', 'UPCOMING'] },
          ...NOT_DELETED
        })
          .select('_id batchId batchName')
          .sort({ batchName: 1 })
          .lean()
      ]);

      data.facultySubject = facultySubject
        ? {
            _id: facultySubject._id,
            facultySubjectId: facultySubject.facultySubjectId,
            subjectName: facultySubject.subjectName
          }
        : null;
      data.folders = folders.map((f) => ({
        _id: f._id,
        folderId: f.folderId,
        folderName: f.folderName
      }));
      data.batches = batches.map((b) => ({
        _id: b._id,
        batchId: b.batchId,
        batchName: b.batchName
      }));
    }

    if (folderId && isValidObjectId(folderId)) {
      const folder = await SubjectContentFolder.findOne({
        _id: folderId,
        ...NOT_DELETED
      })
        .select('_id folderId folderName facultySubjectId category')
        .lean();
      data.selectedFolder = folder || null;
    }

    if (centerId && isValidObjectId(centerId)) {
      const [center, classrooms] = await Promise.all([
        Center.findOne({ _id: centerId, ...NOT_DELETED }).select('_id centerName centerCode').lean(),
        Classroom.find({
          center: centerId,
          status: 'ACTIVE',
          ...NOT_DELETED
        })
          .select('_id classroomId classroomName classroomCode capacity')
          .sort({ classroomName: 1 })
          .lean()
      ]);

      data.center = center
        ? { _id: center._id, centerName: center.centerName, centerCode: center.centerCode }
        : null;
      data.classrooms = classrooms.map((c) => ({
        _id: c._id,
        classroomId: c.classroomId,
        classroomName: c.classroomName,
        classroomCode: c.classroomCode,
        capacity: c.capacity ?? 0
      }));
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Live class create form error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteLiveClass = async (req, res) => {
  try {
    const doc = await SubjectLiveClass.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!doc) {
      return sendNotFound(res, {
        code: 'LIVE_CLASS_NOT_FOUND',
        message: 'Live class not found',
        reason: 'Cannot delete — live class not found or already deleted.'
      });
    }

    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.updatedBy = req.user?._id || null;
    await doc.save();

    res.json({ success: true, message: 'Live class deleted successfully', data: { _id: doc._id } });
  } catch (error) {
    console.error('Delete live class error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

### 8.16 `routes/subjectContentFolderRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const {
  listFolders,
  getFolderById,
  getFolderContentSummary,
  updateFolder,
  deleteFolder
} = require('../controllers/subjectContentFolderController');

router.get('/', listFolders);
router.get('/:id/content-summary', getFolderContentSummary);
router.get('/:id', getFolderById);
router.put('/:id', updateFolder);
router.delete('/:id', deleteFolder);

module.exports = router;
```

### 8.17 `routes/subjectLiveClassRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const {
  createLiveClass,
  getLiveClasses,
  getLiveClassById,
  getLiveClassCreateForm,
  getLiveClassDashboardSummary,
  updateLiveClass,
  updatePublishStatus,
  previewRecurrence,
  previewRecurrenceForLiveClass,
  duplicateLiveClass,
  deleteLiveClass
} = require('../controllers/subjectLiveClassController');

router.get('/create-form', getLiveClassCreateForm);
router.get('/dashboard-summary', getLiveClassDashboardSummary);
router.post('/preview-recurrence', previewRecurrence);
router.post('/:id/preview-recurrence', previewRecurrenceForLiveClass);
router.post('/:id/duplicate', duplicateLiveClass);
router.patch('/:id/publish-status', updatePublishStatus);

router.post('/', createLiveClass);
router.get('/', getLiveClasses);
router.get('/:id', getLiveClassById);
router.put('/:id', updateLiveClass);
router.delete('/:id', deleteLiveClass);

module.exports = router;
```

### 8.18 `app.js` route mounts

```javascript
// Faculty Subject CMS mounts (from app.js)
app.use('/api/faculty-subjects', ...superAdminAuth, facultySubjectRoutes);
app.use('/api/folders', ...superAdminAuth, subjectContentFolderRoutes);
app.use('/api/live-classes', ...superAdminAuth, subjectLiveClassRoutes);
// Legacy LMS (100ms) — separate from Academic CMS
app.use('/api/lms/live-classes', liveClassRoutes);
```


## 9. Error responses

| Scenario | Status | Notes |
|----------|--------|-------|
| Missing token | 401 | Not authorized |
| Non–Super Admin | 403 | Super Admin only |
| Invalid faculty subject / folder / batch | 400 | Validation via `cmsApiErrors` |
| Duplicate folder name | 409 | Same facultySubject + category |
| Folder delete with live classes | 409 | `FOLDER_HAS_CONTENT` + `liveClassCount` |
| Classroom / faculty clash | 409 | Structured `conflictWith` in body |
| FacultySubject not found | 404 | |

CMS errors include `errorCode`, `reason`, `field`, `suggestions` when returned via `sendValidationError` / `sendError`.

---

## 10. Postman collections

| Collection | Folder |
|------------|--------|
| `BATCH_FACULTY_SUBJECT_POSTMAN_COLLECTION.json` | Faculty Subject CRUD |
| `FACULTY_SUBJECT_CMS_POSTMAN_COLLECTION.json` | Folders + Live Classes |

**Variables:** `BASE_URL`, `SuperAdminToken`, `facultySubjectId`, `folderId`, `batchId`, `centerId`, `classroomId`, `liveClassId`

---

## 11. Frontend integration

| Screen | API |
|--------|-----|
| Faculty create — step 1 | `GET /api/faculty-subjects/create-form` |
| Faculty create — step 2 | `GET /api/faculty-subjects/create-form?subjectId=` |
| Faculty list | `GET /api/faculty-subjects` |
| CMS left nav | `GET /api/faculty-subjects/:id/content-tree` |
| Live class — faculty picker | `GET /api/faculty-subjects/dropdown?category=LIVE_CLASS` |
| Live class — folder picker | `GET /api/folders?facultySubjectId=&category=LIVE_CLASS` |
| Create folder | `POST /api/faculty-subjects/content/folders` |
| Live class form | `GET /api/live-classes/create-form` |
| Live class list / dashboard | `GET /api/live-classes`, `GET /api/live-classes/dashboard-summary` |
| Publish toggle | `PATCH /api/live-classes/:id/publish-status` |
| Folder header stats | `GET /api/folders/:id/content-summary` |

**Future modules** (same folder pattern): RECORDING, PRELIMS_TEST, MAINS_ANSWER_WRITING, PDF.

---

## 12. Quick reference

```text
Auth:           POST /api/auth/login-super-admin

Faculty Subject:
  GET    /api/faculty-subjects/create-form
  POST   /api/faculty-subjects
  GET    /api/faculty-subjects/:id/content-tree
  GET    /api/faculty-subjects/dropdown?category=LIVE_CLASS

Folders:
  POST   /api/faculty-subjects/content/folders
  GET    /api/folders?facultySubjectId=&category=LIVE_CLASS
  GET    /api/folders/:id/content-summary
  DELETE /api/folders/:id

Live Classes (Academic CMS):
  GET    /api/live-classes/create-form
  POST   /api/live-classes/preview-recurrence
  POST   /api/live-classes
  PATCH  /api/live-classes/:id/publish-status
  POST   /api/live-classes/:id/duplicate

Legacy LMS (100ms):  /api/lms/live-classes
```
