# Faculty Subject CMS — System Design Specification

> **Audience:** Cursor AI / backend implementers  
> **Scope:** Academic content CMS built on top of existing `FacultySubject` base layer  
> **Auth:** Super Admin only (`protect` + `requireSuperAdmin`) on all routes below

---

## Table of contents

1. [System context](#1-system-context)
2. [Database design](#2-database-design)
3. [API design](#3-api-design)
4. [Business logic](#4-business-logic)
5. [File map](#5-file-map-implementation)
6. [API testing sequence](#6-api-testing-sequence)
7. [Future modules](#7-future-modules-same-folder-architecture)
8. [Implementation checklist](#8-implementation-checklist)
9. [Breaking change notice](#9-breaking-change-notice)
10. [Complete source code](#10-complete-source-code)

---

## 1. System context

### 1.1 Base layer (already implemented)

```text
Subject → Topic | Teacher
       ↓
FacultySubject  ← categories[] are ENUM flags only (no category master collection)
       ↓
Batch.facultySubjects[]
       ↓
BatchEnrollment
```

### 1.2 CMS layer (this spec)

```text
FacultySubject
   └── SubjectContentFolder  (per category)
          └── SubjectLiveClass  (LIVE_CLASS content — Phase 1 module)
          └── [Future] Recording, PrelimsTest, MainsAnswerWriting, PDF
```

### 1.3 Design decisions (mandatory)

| Decision | Rule |
|----------|------|
| Category master | **NO** separate `SubjectCategory` collection |
| Categories | **ENUM only** in `batchFacultyConstants.js` |
| Content storage | **Separate collections** per content type |
| Folder scope | `facultySubjectId` + `category` only |
| Legacy LiveClass | Old 100ms LMS model stays at `/api/lms/live-classes` |
| Academic LiveClass | New model `SubjectLiveClass` at `/api/live-classes` |

---

## 2. Database design

### 2.1 Category ENUM (Phase 1 update)

**File:** `utils/batchFacultyConstants.js`

```js
const FACULTY_CATEGORIES = [
  'LIVE_CLASS',
  'RECORDING',
  'PRELIMS_TEST',           // replaces legacy TEST
  'MAINS_ANSWER_WRITING',   // new
  'PDF'
];
```

**UI labels** (`controllers/facultySubjectController.js`):

| ENUM | Label |
|------|-------|
| `LIVE_CLASS` | Live Class |
| `RECORDING` | Recording |
| `PRELIMS_TEST` | Prelims Test |
| `MAINS_ANSWER_WRITING` | Mains Answer Writing |
| `PDF` | PDF |

**Migration note:** Legacy `TEST` in `categories[]` is auto-mapped to `PRELIMS_TEST` on save via `normalizeFacultyCategories()` in `batchFacultyConstants.js`. Prefer updating stored data to the new ENUM values.

---

### 2.2 Collection: `SubjectContentFolder`

**Model:** `models/SubjectContentFolder.js`  
**ID prefix:** `FLD001`, `FLD002`, …

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | |
| `folderId` | String | auto | Display id |
| `facultySubjectId` | ObjectId → FacultySubject | yes | |
| `category` | String enum | yes | Must exist on parent FacultySubject.categories[] |
| `folderName` | String | yes | Unique per (facultySubjectId + category + not deleted) |
| `description` | String | no | |
| `status` | ACTIVE \| INACTIVE | yes | default ACTIVE |
| `isDeleted` | Boolean | yes | soft delete |
| `deletedAt` | Date | no | |
| `createdBy` | ObjectId → User | no | |
| `updatedBy` | ObjectId → User | no | |
| `createdAt` / `updatedAt` | Date | auto | |

**Business rules:**

1. Folder belongs to exactly one `facultySubjectId` + one `category`.
2. `category` must be enabled on the parent FacultySubject.
3. Duplicate folder names blocked within same faculty subject + category.
4. Soft delete sets `isDeleted=true`, `status=INACTIVE`.

---

### 2.3 Collection: `SubjectLiveClass`

**Model:** `models/SubjectLiveClass.js`  
**ID prefix:** `LVC001`, `LVC002`, …  
**Mongoose model name:** `SubjectLiveClass` (avoids conflict with legacy `LiveClass`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | |
| `liveClassId` | String | auto | |
| `facultySubjectId` | ObjectId | yes | Must be ACTIVE |
| `folderId` | ObjectId | yes | Must belong to same facultySubject + LIVE_CLASS category |
| `batchId` | ObjectId | yes | ACTIVE or UPCOMING; must include facultySubject in batch.facultySubjects[] |
| `centerId` | ObjectId | yes | Must match batch course center when course.center is set |
| `classroomId` | ObjectId | yes | ACTIVE; classroom.center === centerId |
| `classTitle` | String | yes | |
| `scheduledDate` | Date | yes | First session anchor date |
| `startTime` | String | yes | `HH:mm` or `HH:mm:ss` |
| `durationHours` | Number | no | default 0 |
| `durationMinutes` | Number | no | 0–59 |
| `durationSeconds` | Number | no | 0–59 |
| `timezone` | String enum | yes | `LIVE_CLASS_TIMEZONES` — default `Asia/Kolkata` |
| `attendanceEnabled` | Boolean | yes | default `true` |
| `publishStatus` | String enum | yes | `DRAFT` \| `PUBLISHED` \| `UNPUBLISHED` — default `DRAFT` |
| `classStatus` | UPCOMING \| ONGOING \| COMPLETED \| CANCELLED | yes | default UPCOMING |
| `recurrence` | Object | no | See §2.4 |
| `isDeleted` | Boolean | yes | |
| `createdBy` / `updatedBy` | ObjectId | no | |
| `createdAt` / `updatedAt` | Date | auto | |

**Publish workflow:**

| Status | Visibility |
|--------|------------|
| `DRAFT` | Admin only — not visible to students |
| `PUBLISHED` | Visible to enrolled students |
| `UNPUBLISHED` | Hidden from students |

**ENUMs** (`utils/facultyContentConstants.js`):

| Field | Allowed values |
|-------|----------------|
| `publishStatus` | `DRAFT`, `PUBLISHED`, `UNPUBLISHED` |
| `timezone` | `Asia/Kolkata`, `Asia/Dubai`, `Asia/Singapore`, `UTC` |
| `classStatus` | `UPCOMING`, `ONGOING`, `COMPLETED`, `CANCELLED` |

Frontend: load from `GET /api/live-classes/create-form` → `data.enums.publishStatuses`, `data.enums.timezones`.

---

### 2.4 Recurrence sub-document (embedded, not text)

```js
recurrence: {
  enabled: Boolean,
  repeatType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM',
  repeatEvery: Number,        // DAILY/CUSTOM interval in days
  startDate: Date,
  endDate: Date,
  weekdays: ['MON','WED','FRI'],  // WEEKLY only
  monthlyPattern: 'SAME_DATE' | 'FIRST_WEEKDAY' | 'LAST_WEEKDAY',
  excludedDates: [Date],
  paused: Boolean,
  pausedUntil: Date,
  notes: String
}
```

**Patterns:**

| repeatType | Meaning |
|------------|---------|
| `DAILY` | Every N days (`repeatEvery`) |
| `WEEKLY` | Selected weekdays between start/end |
| `MONTHLY` | Same date / first weekday / last weekday of month |
| `CUSTOM` | Every N days (alias of daily with custom interval) |

**Pause / resume / exclude:**

- `paused: true` + optional `pausedUntil` — skip generation until date
- `excludedDates[]` — never generate sessions on those dates

**Service:** `services/recurrenceEngine.js`

```js
generateDailyOccurrences()
generateWeeklyOccurrences()
generateMonthlyOccurrences()
generateCustomOccurrences()
generateRecurrenceOccurrences()  // orchestrator
previewRecurrence()              // { totalSessions, occurrences[] }
```

---

## 3. API design

**Base URL:** `{{BASE_URL}}`  
**Header:** `Authorization: Bearer {{SuperAdminToken}}`

### 3.0 CMS form, dropdown & dashboard APIs (frontend)

These endpoints support the Live Class create/edit UI. They are **in addition to** CRUD APIs in §3.2–3.3.

#### Frontend dependency flow

```text
Faculty Subject  →  GET /api/faculty-subjects/dropdown?category=LIVE_CLASS
       ↓
Folder           →  GET /api/folders?facultySubjectId={id}&category=LIVE_CLASS
       ↓
Batch            →  GET /api/batches/dropdown?facultySubjectId={id}
       ↓
Center           →  GET /api/centers/dropdown
       ↓
Classroom        →  GET /api/classrooms/dropdown?centerId={id}
       ↓
Create Live Class → POST /api/live-classes
```

#### Existing dropdown APIs (keep as-is)

| Method | Path | Query | Response shape |
|--------|------|-------|----------------|
| GET | `/api/faculty-subjects/dropdown` | `category=LIVE_CLASS` | `{ success, data: [{ _id, facultySubjectId, subjectName, teacher }] }` |
| GET | `/api/folders` | `facultySubjectId`, `category=LIVE_CLASS` | `{ success, data: [folders] }` |
| GET | `/api/batches/dropdown` | optional `facultySubjectId` (filters `batch.facultySubjects[]`) | `{ success, data: [{ _id, batchId, batchName }] }` |
| GET | `/api/centers/dropdown` | — | `{ success, data: [{ _id, centerName, centerCode, city, state }] }` |
| GET | `/api/classrooms/dropdown` | `centerId` (required for filtered list) | `{ success, data: [{ _id, classroomId, classroomName, classroomCode, centerId, capacity }] }` |

**Note:** Teacher is **not** sent on live class create/update. Faculty schedule clash (REQ-8) uses `FacultySubject.teacher` from the selected faculty subject.

#### Aggregated form metadata

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/live-classes/create-form` | Defaults, enums, dependency flow, optional preloaded lists |
| GET | `/api/live-classes/dashboard-summary` | Counts for CMS dashboard cards |
| GET | `/api/folders/:id/content-summary` | Folder header stats (live class counts by publish status) |

**`GET /api/live-classes/create-form`**

Optional query: `facultySubjectId`, `folderId`, `centerId` — when provided, response includes preloaded `folders`, `batches`, `classrooms`, `teachers` for that step.

**`GET /api/live-classes/dashboard-summary`**

Optional filters: `facultySubjectId`, `folderId`, `batchId`, `centerId`.

```json
{
  "success": true,
  "data": {
    "totalClasses": 120,
    "draftClasses": 15,
    "publishedClasses": 90,
    "unpublishedClasses": 5,
    "upcomingClasses": 5,
    "ongoingClasses": 0,
    "completedClasses": 10,
    "cancelledClasses": 0
  }
}
```

**`GET /api/folders/:id/content-summary`**

```json
{
  "success": true,
  "data": {
    "folderId": "FLD001",
    "folderName": "Prelims Live Classes",
    "liveClassCount": 12,
    "publishedCount": 8,
    "draftCount": 4,
    "unpublishedCount": 0
  }
}
```

---

### 3.1 Faculty Subject (base layer — updated categories)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/faculty-subjects/create-form` | Categories include new ENUM values |
| POST | `/api/faculty-subjects` | `categories[]` uses new ENUM |
| PUT | `/api/faculty-subjects/:id` | Same |
| GET | `/api/faculty-subjects/dropdown?category=PRELIMS_TEST` | Filter by category |
| GET | `/api/faculty-subjects/:id/content-tree` | Left panel navigation |

**Content tree response:**

```json
{
  "success": true,
  "facultySubjectId": "...",
  "subjectName": "History",
  "categories": ["LIVE_CLASS", "RECORDING"],
  "data": {
    "LIVE_CLASS": [{ "_id": "...", "folderId": "FLD001", "folderName": "Prelims Live Class" }],
    "RECORDING": [{ "_id": "...", "folderId": "FLD002", "folderName": "Ancient India Recordings" }],
    "PRELIMS_TEST": [],
    "MAINS_ANSWER_WRITING": [],
    "PDF": []
  }
}
```

---

### 3.2 Subject content folders

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/faculty-subjects/content/folders` | Create folder |
| PUT | `/api/faculty-subjects/content/folders/:id` | Update folder (same module as create) |
| GET | `/api/folders?facultySubjectId=&category=` | List folders |
| GET | `/api/folders/:id` | Get one |
| GET | `/api/folders/:id/content-summary` | CMS folder header counts |
| PUT | `/api/folders/:id` | Update name/description/status (alias) |
| DELETE | `/api/folders/:id` | Soft delete |

**Create payload:**

```json
{
  "facultySubjectId": "xxx",
  "category": "LIVE_CLASS",
  "folderName": "Prelims Live Class",
  "description": "History prelims classes"
}
```

**Update payload** (`PUT` — use folder MongoDB `_id`):

```http
PUT {{BASE_URL}}/api/faculty-subjects/content/folders/{{folderId}}
```

```json
{
  "folderName": "Prelims Live Class Updated",
  "description": "CMS test folder"
}
```

Partial update supported — send only fields you want to change. Optional: `"status": "ACTIVE" | "INACTIVE"`.

---

### 3.3 Live classes (Academic CMS)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/live-classes/create-form` | Form defaults, enums, dependency flow (§3.0) |
| GET | `/api/live-classes/dashboard-summary` | Dashboard aggregate counts |
| POST | `/api/live-classes` | Create (default DRAFT) |
| GET | `/api/live-classes` | List with filters + search |
| GET | `/api/live-classes/:id` | Detail |
| PUT | `/api/live-classes/:id` | Update |
| PATCH | `/api/live-classes/:id/publish-status` | Draft / Publish / Unpublish |
| DELETE | `/api/live-classes/:id` | Soft delete |
| POST | `/api/live-classes/preview-recurrence` | Standalone session preview (no live class id) |
| POST | `/api/live-classes/:id/preview-recurrence` | Preview for one live class; optional body overrides |
| POST | `/api/live-classes/:id/duplicate` | Clone as new DRAFT |

**Create payload:**

```json
{
  "facultySubjectId": "xxx",
  "folderId": "xxx",
  "batchId": "xxx",
  "centerId": "xxx",
  "classroomId": "xxx",
  "classTitle": "History",
  "scheduledDate": "2026-05-29",
  "startTime": "10:00:00",
  "durationHours": 2,
  "durationMinutes": 30,
  "durationSeconds": 0,
  "timezone": "Asia/Kolkata",
  "attendanceEnabled": true,
  "publishStatus": "DRAFT",
  "recurrence": {
    "enabled": true,
    "repeatType": "WEEKLY",
    "startDate": "2026-05-29",
    "endDate": "2026-07-29",
    "weekdays": ["MON", "WED", "FRI"]
  }
}
```

**Notes:**

- Do **not** send `teacherId`, `description`, `meetingProvider`, or `meetingLink` on POST/PUT — not part of this CMS module.
- Faculty schedule clash (REQ-8) uses the teacher assigned on `FacultySubject`.

**List query params:**

| Param | Description |
|-------|-------------|
| `facultySubjectId` | Filter by faculty subject |
| `folderId` | Filter by folder |
| `publishStatus` | DRAFT / PUBLISHED / UNPUBLISHED |
| `classStatus` | UPCOMING / ONGOING / COMPLETED / CANCELLED |
| `batchId` | Filter by batch |
| `centerId` | Filter by center |
| `search` | classTitle, folderName, facultySubjectName |
| `page`, `limit`, `sortBy`, `sortOrder` | Pagination |

**Preview recurrence (two endpoints):**

| Endpoint | Use when |
|----------|----------|
| `POST /api/live-classes/preview-recurrence` | New class form — no saved `_id` yet; send full `scheduledDate`, `startTime`, `recurrence` |
| `POST /api/live-classes/:id/preview-recurrence` | Edit existing class — loads LVC schedule; optional body overrides before save |

**Per live class (recommended for edit UI):**

```http
POST /api/live-classes/6a193c0e7335cb48998eab37/preview-recurrence
```

Empty body → preview exactly what is stored on that class.

Optional override (merged with saved recurrence):

```json
{
  "recurrence": {
    "enabled": true,
    "repeatType": "WEEKLY",
    "startDate": "2026-05-29",
    "endDate": "2026-07-29",
    "weekdays": ["MON", "WED", "FRI"]
  }
}
```

**Response (per-class preview):**

```json
{
  "success": true,
  "previewMode": "LIVE_CLASS",
  "_id": "6a193c0e7335cb48998eab37",
  "liveClassId": "LVC001",
  "sourceLiveClassId": "6a193c0e7335cb48998eab37",
  "classTitle": "History Class",
  "appliedInput": { "scheduledDate": "2026-05-29", "startTime": "10:00:00", "recurrence": { } },
  "overridesFromBody": { "scheduledDate": false, "startTime": false, "recurrence": true },
  "totalSessions": 24,
  "occurrences": [{ "date": "2026-05-29", "startTime": "10:00:00", "weekday": "FRI" }]
}
```

**Standalone preview:**

```http
POST /api/live-classes/preview-recurrence
```

```json
{
  "scheduledDate": "2026-05-29",
  "startTime": "10:00:00",
  "recurrence": {
    "enabled": true,
    "repeatType": "WEEKLY",
    "startDate": "2026-05-29",
    "endDate": "2026-07-29",
    "weekdays": ["MON", "WED", "FRI"],
    "excludedDates": ["2026-06-10"],
    "paused": false
  }
}
```

Response includes `"previewMode": "STANDALONE"` (no `liveClassId`).

**Publish status patch:**

```json
{ "publishStatus": "PUBLISHED" }
```

---

## 4. Business logic

### 4.1 Folder creation flow

```text
1. Validate facultySubjectId → ACTIVE, not deleted
2. Validate category → valid ENUM + present on facultySubject.categories[]
3. Validate folderName → non-empty, unique per (facultySubjectId + category)
4. Generate folderId (FLD###)
5. Save folder
```

### 4.2 Live class creation flow

```text
1. Validate required fields (batch, center, classroom, title, date, time, timezone, attendanceEnabled)
2. Validate facultySubject → ACTIVE (must have teacher for schedule checks)
3. Validate folder → ACTIVE, belongs to facultySubject, category=LIVE_CLASS
4. Validate batch → ACTIVE|UPCOMING, facultySubject in batch.facultySubjects[]
5. Validate center → exists
6. Validate classroom → ACTIVE, classroom.center === centerId
7. Validate batch center alignment → course.center === centerId (when course has center)
8. Validate recurrence object (if enabled)
9. runScheduleConflictChecks() — classroom then faculty (REQ-7, REQ-8)
10. Default publishStatus = DRAFT
11. Generate liveClassId (LVC###)
12. Save
```

### 4.3 Duplicate live class

```text
1. Load source (not deleted)
2. Copy all fields except _id, liveClassId, timestamps
3. New liveClassId
4. publishStatus = DRAFT, classStatus = UPCOMING
5. classTitle += " (Copy)" unless overridden
6. Save new record
```

### 4.4 Content tree (left panel)

```text
1. Resolve facultySubject by _id or facultySubjectId (FSU001)
2. Load all ACTIVE folders for that facultySubject
3. Group by category ENUM key
4. Return empty arrays for categories with no folders
```

### 4.5 Folder delete validation (Requirement 6)

**Rule:** A folder **cannot** be soft-deleted if any live class still references `folderId`.

```text
DELETE /api/folders/:id
  → assertFolderCanBeDeleted(folderId)
  → count SubjectLiveClass where folderId = X and isDeleted = false
  → if count > 0 → HTTP 409
```

**Response (409):**

```json
{
  "success": false,
  "message": "Cannot delete folder: 3 live class(es) still exist in this folder. Remove or move them first.",
  "liveClassCount": 3
}
```

Prevents orphan live class records pointing at a deleted folder.

---

### 4.6 Classroom clash detection (Requirement 7)

**Service:** `services/scheduleConflictService.js` → `checkClassroomAvailability()`

**When:** Before `POST /api/live-classes` and `PUT /api/live-classes/:id`

**Logic:**

1. Expand requested class into time slots (single date or all recurrence occurrences).
2. Load other live classes for the same `classroomId` (excluding `CANCELLED` and soft-deleted).
3. Expand each candidate’s slots (including recurrence).
4. If any slot overlaps on the same calendar day → **HTTP 409**.

**Overlap rule (same day):**

```text
startA < endB  AND  startB < endA
```

**Example (rejected):**

| Class | Room | Date | Time |
|-------|------|------|------|
| History | Room A | 2026-05-29 | 10:00–12:00 |
| New class | Room A | 2026-05-29 | 10:30–12:30 |

**Response (409):**

```json
{
  "success": false,
  "message": "Classroom is already booked on 2026-05-29 between 10:00 and 12:00 (conflicts with \"History\" / LVC001)",
  "conflictType": "CLASSROOM",
  "conflictWith": {
    "liveClassId": "LVC001",
    "classTitle": "History",
    "date": "2026-05-29",
    "startTime": "10:00",
    "endTime": "12:00"
  }
}
```

---

### 4.7 Faculty (teacher) clash detection (Requirement 8)

**Service:** `checkFacultyAvailability()`

**When:** Same as classroom check (create + update live class).

**Logic:**

1. Resolve `teacher` from `FacultySubject.teacher`.
2. Find all `FacultySubject` rows with that teacher.
3. Find live classes for those faculty subjects in the date window.
4. Expand slots and detect overlap (teacher cannot teach two classes at once).

**Example (rejected):**

| Class | Teacher | Time |
|-------|---------|------|
| History | Teacher A | 10:00–12:00 |
| Polity | Teacher A | 10:00–12:00 |

**Response (409):**

```json
{
  "success": false,
  "message": "Teacher is already scheduled on 2026-05-29 between 10:00 and 12:00 (conflicts with \"Polity\" / Indian Polity / LVC002)",
  "conflictType": "FACULTY",
  "conflictWith": { "liveClassId": "LVC002", "classTitle": "Polity", "facultySubjectName": "Indian Polity" }
}
```

**Orchestrator:** `runScheduleConflictChecks()` runs classroom check first, then faculty check.

---

## 5. File map (implementation)

| File | Purpose |
|------|---------|
| `models/FacultySubject.js` | Base faculty subject schema |
| `utils/batchFacultyConstants.js` | FACULTY_CATEGORIES + legacy TEST normalization |
| `utils/batchFacultyHelpers.js` | Faculty subject + batch validation |
| `controllers/facultySubjectController.js` | Faculty subject CRUD + content tree + dropdowns |
| `routes/facultySubjectRoutes.js` | `/api/faculty-subjects` (+ folder create/update under content/) |
| `utils/facultyContentConstants.js` | Folder/LiveClass/Recurrence/timezone enums |
| `utils/facultyContentHelpers.js` | CMS validation (structured errors via `cmsApiErrors`) |
| `utils/cmsApiErrors.js` | Structured 400/404/409 responses for CMS |
| `models/SubjectContentFolder.js` | Folder schema |
| `models/SubjectLiveClass.js` | Live class schema |
| `services/recurrenceEngine.js` | Occurrence calculation |
| `services/scheduleConflictService.js` | Folder delete guard + classroom/faculty clash detection |
| `controllers/subjectContentFolderController.js` | Folder CRUD + content-summary |
| `controllers/subjectLiveClassController.js` | Live class CRUD + create-form + dashboard + preview |
| `routes/subjectContentFolderRoutes.js` | `/api/folders` |
| `routes/subjectLiveClassRoutes.js` | `/api/live-classes` |
| `utils/contentIdGenerator.js` | FSU###, FLD###, LVC### generators |
| `app.js` | Route mounting |

**Route mounting:**

```js
app.use('/api/faculty-subjects', ...superAdminAuth, facultySubjectRoutes);
app.use('/api/folders', ...superAdminAuth, subjectContentFolderRoutes);
app.use('/api/live-classes', ...superAdminAuth, subjectLiveClassRoutes);
app.use('/api/lms/live-classes', liveClassRoutes); // legacy 100ms LMS
```

---

## 6. API testing sequence

### Prerequisites

```text
1. POST /api/auth/login-super-admin → token
2. Ensure Subject, Topic, Teacher exist
3. POST /api/faculty-subjects with categories including LIVE_CLASS
4. POST /api/batches with facultySubjects[] including faculty subject _id
```

### Test order

| Step | Request | Expected |
|------|---------|----------|
| 1 | `GET /api/faculty-subjects/create-form` | categories include PRELIMS_TEST, MAINS_ANSWER_WRITING |
| 2 | `POST /api/faculty-subjects/content/folders` | 201, folderId FLD001 |
| 3 | `GET /api/folders?facultySubjectId=&category=LIVE_CLASS` | folder list |
| 4 | `GET /api/faculty-subjects/:id/content-tree` | grouped folders |
| 5 | `POST /api/live-classes/preview-recurrence` | totalSessions count |
| 6 | `POST /api/live-classes` publishStatus=DRAFT | 201, LVC001 |
| 7 | `GET /api/live-classes?facultySubjectId=&search=History` | list with search |
| 8 | `PATCH /api/live-classes/:id/publish-status` PUBLISHED | status updated |
| 9 | `POST /api/live-classes/:id/duplicate` | new DRAFT copy |
| 10 | `PUT /api/folders/:id` | update folder name |
| 11 | `DELETE /api/folders/:id` | soft delete (409 if live classes exist) |
| 12 | `POST /api/live-classes` overlapping room | 409 CLASSROOM clash |
| 13 | `POST /api/live-classes` overlapping teacher | 409 FACULTY clash |

### Validation error tests

| Test | Expected 400 |
|------|--------------|
| Folder category not on faculty subject | Faculty subject does not include category |
| Classroom wrong center | Classroom does not belong to the selected center |
| Batch not linked to faculty subject | Selected batch is not linked to this faculty subject |
| Missing batchId on live class create | batchId is required |
| Invalid recurrence weekdays empty on WEEKLY | weekdays required for WEEKLY recurrence |
| Delete folder with live classes | HTTP 409 + `liveClassCount` |
| Classroom double-booking | HTTP 409 + `conflictType: CLASSROOM` |
| Teacher double-booking | HTTP 409 + `conflictType: FACULTY` |

---

## 7. Future modules (same folder architecture)

After LIVE_CLASS is stable, implement using identical folder pattern:

| Category | Future collection |
|----------|---------------------|
| `RECORDING` | `SubjectRecording` |
| `PRELIMS_TEST` | `SubjectPrelimsTest` |
| `MAINS_ANSWER_WRITING` | `SubjectMainsAnswerWriting` |
| `PDF` | `SubjectPdf` |

Each content type:

- References `facultySubjectId` + `folderId`
- Has own CRUD + publish workflow
- Reuses folder APIs (no change)

---

## 8. Implementation checklist

- [x] STEP-1 — Update Faculty Categories ENUM
- [x] STEP-2 — SubjectContentFolder module
- [x] STEP-3 — SubjectLiveClass model + CRUD
- [x] STEP-4 — Publish workflow (DRAFT/PUBLISHED/UNPUBLISHED)
- [x] STEP-5 — Recurrence engine service
- [x] STEP-6 — Preview recurrence API
- [x] STEP-7 — Duplicate live class API
- [x] STEP-8 — Content tree API
- [x] STEP-9 — Search + filters on list
- [x] STEP-10 — Batch/Center/Classroom validations
- [x] REQ-6 — Folder delete blocked when live classes exist
- [x] REQ-7 — `checkClassroomAvailability()` on create/update
- [x] REQ-8 — `checkFacultyAvailability()` on create/update
- [x] CMS — `GET /api/live-classes/create-form` + `GET /api/live-classes/dashboard-summary`
- [x] CMS — `GET /api/folders/:id/content-summary`
- [x] CMS — `POST /api/live-classes/:id/preview-recurrence` (per-class preview)
- [x] CMS — Structured errors (`utils/cmsApiErrors.js`)
- [ ] RECORDING module (future)
- [ ] PRELIMS_TEST module (future)
- [ ] MAINS_ANSWER_WRITING module (future)
- [ ] PDF module (future)

---

## 9. Breaking change notice

Legacy LMS live classes moved from `/api/live-classes` → `/api/lms/live-classes`.  
Update any existing 100ms integrations accordingly.

---

## 10. Complete source code

All code below is the **implemented Faculty Subject base layer + LIVE_CLASS CMS** (folders, live classes, recurrence, schedule conflicts, form/dashboard APIs). Paths match the repo.

**Regenerate this section from disk:** `node scripts/regenerate-cms-design-section10.js`

### 10.0 Source file index

| § | Path | Lines (approx) |
|---|------|----------------|
| 10.1 | `models/FacultySubject.js` | 69 |
| 10.2 | `utils/batchFacultyConstants.js` | 42 |
| 10.3 | `utils/batchFacultyHelpers.js` | 268 |
| 10.4 | `controllers/facultySubjectController.js` | 500 |
| 10.5 | `routes/facultySubjectRoutes.js` | 35 |
| 10.6 | `utils/facultyContentConstants.js` | 35 |
| 10.7 | `utils/cmsApiErrors.js` | 132 |
| 10.8 | `utils/contentIdGenerator.js` | 56 |
| 10.9 | `utils/facultyContentHelpers.js` | 477 |
| 10.10 | `models/SubjectContentFolder.js` | 70 |
| 10.11 | `models/SubjectLiveClass.js` | 144 |
| 10.12 | `services/recurrenceEngine.js` | 272 |
| 10.13 | `services/scheduleConflictService.js` | 442 |
| 10.14 | `controllers/subjectContentFolderController.js` | 259 |
| 10.15 | `controllers/subjectLiveClassController.js` | 824 |
| 10.16 | `routes/subjectContentFolderRoutes.js` | 18 |
| 10.17 | `routes/subjectLiveClassRoutes.js` | 31 |
| 10.18 | `app.js` (mounts only) | — |

---

### 10.1 `models/FacultySubject.js` — Faculty Subject model

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

---

### 10.2 `utils/batchFacultyConstants.js` — Category ENUM + legacy TEST map

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

---

### 10.3 `utils/batchFacultyHelpers.js` — Faculty subject validation

> Full file (268 lines): `utils/batchFacultyHelpers.js` — exports `validateFacultySubjectPayload`, `validateFacultySubjectIds`, batch/fee helpers.

---

### 10.4 `controllers/facultySubjectController.js` — Faculty Subject CRUD + CMS tree

> Full file (500 lines): `controllers/facultySubjectController.js` — exports `createFacultySubject`, `getFacultySubjects`, `getFacultySubjectCreateForm`, `getFacultySubjectsDropdown`, `getFacultySubjectSummary`, `getContentTree`, `updateFacultySubject`, `deleteFacultySubject`.

---

### 10.5 `routes/facultySubjectRoutes.js`

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

---

### 10.6 `utils/facultyContentConstants.js`

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

---

### 10.7 `utils/cmsApiErrors.js`

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

---

### 10.8 `utils/contentIdGenerator.js`

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

---

### 10.9 `utils/facultyContentHelpers.js`

> **Full source:** `utils/facultyContentHelpers.js` (477 lines). Regenerate §10 with `node scripts/regenerate-cms-design-section10.js` to inline the latest copy.
>
> Key exports: `validateLiveClassPayload` (uses `cmsApiErrors.fail`), `validateFolderPayload`, `validateBatchForLiveClass`, `validateCenterForLiveClass`, `validateClassroomForLiveClass`, `validateRecurrence`, `LIVE_CLASS_TIMEZONES`, `findActiveFacultySubject`, `findActiveFolder`.

```javascript
// utils/facultyContentHelpers.js — see repo for complete implementation
const { fail } = require('./cmsApiErrors');
const { LIVE_CLASS_TIMEZONES, PUBLISH_STATUSES, CLASS_STATUSES } = require('./facultyContentConstants');
// validateLiveClassPayload → structured errors + attendanceEnabled + timezone enum
// validateFolderPayload → folderName + category on faculty subject
module.exports = { /* see repo */ };
```

---

### 10.10 `models/SubjectContentFolder.js`

```javascript
const mongoose = require('mongoose');
const {
  FACULTY_CATEGORIES,
  FOLDER_STATUSES
} = require('../utils/facultyContentConstants');

const subjectContentFolderSchema = new mongoose.Schema(
  {
    folderId: { type: String, unique: true, trim: true },
    facultySubjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FacultySubject',
      required: true,
      index: true
    },
    category: { type: String, enum: FACULTY_CATEGORIES, required: true, index: true },
    folderName: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    status: { type: String, enum: FOLDER_STATUSES, default: 'ACTIVE' },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

subjectContentFolderSchema.index(
  { facultySubjectId: 1, category: 1, folderName: 1, isDeleted: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

module.exports = mongoose.model('SubjectContentFolder', subjectContentFolderSchema);
```

---

### 10.11 `models/SubjectLiveClass.js`

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
    repeatType: { type: String, enum: [...REPEAT_TYPES, null], default: null },
    repeatEvery: { type: Number, default: 1, min: 1 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    weekdays: [{ type: String, enum: WEEKDAYS }],
    monthlyPattern: { type: String, enum: [...MONTHLY_PATTERNS, null], default: null },
    excludedDates: [{ type: Date }],
    paused: { type: Boolean, default: false },
    pausedUntil: { type: Date, default: null },
    notes: { type: String, default: '', trim: true }
  },
  { _id: false }
);

const subjectLiveClassSchema = new mongoose.Schema(
  {
    liveClassId: { type: String, unique: true, trim: true },
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
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    centerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Center', required: true, index: true },
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      required: true,
      index: true
    },
    classTitle: { type: String, required: true, trim: true },
    scheduledDate: { type: Date, required: true },
    startTime: { type: String, required: true, trim: true },
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
    attendanceEnabled: { type: Boolean, default: true },
    publishStatus: { type: String, enum: PUBLISH_STATUSES, default: 'DRAFT', index: true },
    classStatus: { type: String, enum: CLASS_STATUSES, default: 'UPCOMING', index: true },
    recurrence: { type: recurrenceSchema, default: () => ({ enabled: false }) },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

subjectLiveClassSchema.index({ facultySubjectId: 1, folderId: 1, publishStatus: 1, isDeleted: 1 });
subjectLiveClassSchema.index({ classTitle: 1 });

module.exports = mongoose.model('SubjectLiveClass', subjectLiveClassSchema);
```

---

### 10.12 `services/recurrenceEngine.js`

> Full file: `services/recurrenceEngine.js` (272 lines) — see repo or run regenerate script.

---

### 10.13 `services/scheduleConflictService.js`

> Full file: `services/scheduleConflictService.js` (442 lines) — `assertFolderCanBeDeleted`, `checkClassroomAvailability`, `checkFacultyAvailability`, `runScheduleConflictChecks`.

---

### 10.14 `controllers/subjectContentFolderController.js`

> Full file: `controllers/subjectContentFolderController.js` (259 lines) — includes `getFolderContentSummary`, folder delete guard via `assertFolderCanBeDeleted`.

---

### 10.15 `controllers/subjectLiveClassController.js`

> **Full file:** `controllers/subjectLiveClassController.js` (824 lines).
>
> Exports: `getLiveClassCreateForm`, `getLiveClassDashboardSummary`, `createLiveClass`, `getLiveClasses`, `getLiveClassById`, `updateLiveClass`, `updatePublishStatus`, `previewRecurrence`, `previewRecurrenceForLiveClass`, `duplicateLiveClass`, `deleteLiveClass`.
>
> Create/update call `runScheduleConflictChecks()` before save.

---

### 10.16 `routes/subjectContentFolderRoutes.js`

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

---

### 10.17 `routes/subjectLiveClassRoutes.js`

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

---

### 10.18 `app.js` route mounts

```javascript
app.use('/api/faculty-subjects', ...superAdminAuth, facultySubjectRoutes);
app.use('/api/folders', ...superAdminAuth, subjectContentFolderRoutes);
app.use('/api/live-classes', ...superAdminAuth, subjectLiveClassRoutes);
app.use('/api/lms/live-classes', liveClassRoutes); // legacy 100ms LMS
```

---

### 10.19 API testing — cURL examples

**Login**

```bash
curl -X POST "{{BASE_URL}}/api/auth/login-super-admin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@sriram.com\",\"password\":\"admin123\"}"
```

**Create faculty subject (with LIVE_CLASS category)**

```bash
curl -X POST "{{BASE_URL}}/api/faculty-subjects" \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d "{\"subjectName\":\"History\",\"subjectId\":\"{{subjectId}}\",\"teacherId\":\"{{teacherId}}\",\"topicIds\":[],\"categories\":[\"LIVE_CLASS\"]}"
```

**Create folder**

```bash
curl -X POST "{{BASE_URL}}/api/faculty-subjects/content/folders" \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d "{\"facultySubjectId\":\"{{fsId}}\",\"category\":\"LIVE_CLASS\",\"folderName\":\"Prelims Live Class\"}"
```

**Live class create-form**

```bash
curl "{{BASE_URL}}/api/live-classes/create-form?facultySubjectId={{fsId}}&centerId={{centerId}}" \
  -H "Authorization: Bearer {{token}}"
```

**Create live class (draft)**

```bash
curl -X POST "{{BASE_URL}}/api/live-classes" \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d "{\"facultySubjectId\":\"{{fsId}}\",\"folderId\":\"{{folderId}}\",\"batchId\":\"{{batchId}}\",\"centerId\":\"{{centerId}}\",\"classroomId\":\"{{classroomId}}\",\"classTitle\":\"History\",\"scheduledDate\":\"2026-05-29\",\"startTime\":\"10:00:00\",\"timezone\":\"Asia/Kolkata\",\"attendanceEnabled\":true,\"publishStatus\":\"DRAFT\"}"
```

**Postman:** `FACULTY_SUBJECT_CMS_POSTMAN_COLLECTION.json`
<!--TAIL3-->
### 10.8 `controllers/subjectContentFolderController.js`

Exports:

| Export | HTTP |
|--------|------|
| `createFolder` | POST `/api/faculty-subjects/content/folders` |
| `listFolders` | GET `/api/folders` |
| `getFolderById` | GET `/api/folders/:id` |
| `updateFolder` | PUT `/api/folders/:id` |
| `deleteFolder` | DELETE `/api/folders/:id` (soft) |

Full file: **193 lines** — see `controllers/subjectContentFolderController.js`.

---

### 10.9 `controllers/subjectLiveClassController.js`

Exports:

| Export | HTTP |
|--------|------|
| `createLiveClass` | POST `/api/live-classes` |
| `getLiveClasses` | GET `/api/live-classes` (aggregate + search) |
| `getLiveClassById` | GET `/api/live-classes/:id` |
| `updateLiveClass` | PUT `/api/live-classes/:id` |
| `updatePublishStatus` | PATCH `/api/live-classes/:id/publish-status` |
| `previewRecurrence` | POST `/api/live-classes/preview-recurrence` |
| `duplicateLiveClass` | POST `/api/live-classes/:id/duplicate` |
| `deleteLiveClass` | DELETE `/api/live-classes/:id` (soft) |

Full file: **418 lines** — see `controllers/subjectLiveClassController.js`.

---

### 10.10 `controllers/facultySubjectController.js` (CMS additions)

**Updated category labels:**

```javascript
const FACULTY_CATEGORY_LABELS = {
  LIVE_CLASS: 'Live Class',
  RECORDING: 'Recording',
  PRELIMS_TEST: 'Prelims Test',
  MAINS_ANSWER_WRITING: 'Mains Answer Writing',
  PDF: 'PDF'
};
```

**New import:**

```javascript
const SubjectContentFolder = require('../models/SubjectContentFolder');
```

**New export — `getContentTree`:**

```javascript
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
```

---

### 10.11 Routes

#### `routes/facultySubjectRoutes.js`

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
const { createFolder } = require('../controllers/subjectContentFolderController');

router.get('/create-form', getFacultySubjectCreateForm);
router.get('/dropdown', getFacultySubjectsDropdown);
router.get('/summary/:id', getFacultySubjectSummary);
router.get('/:id/content-tree', getContentTree);
router.post('/content/folders', createFolder);
router.patch('/status/:id', updateFacultySubjectStatus);

router.post('/', createFacultySubject);
router.get('/', getFacultySubjects);
router.get('/:id', getFacultySubjectById);
router.put('/:id', updateFacultySubject);
router.delete('/:id', deleteFacultySubject);

module.exports = router;
```

#### `routes/subjectContentFolderRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const {
  listFolders,
  getFolderById,
  updateFolder,
  deleteFolder
} = require('../controllers/subjectContentFolderController');

router.get('/', listFolders);
router.get('/:id', getFolderById);
router.put('/:id', updateFolder);
router.delete('/:id', deleteFolder);

module.exports = router;
```

#### `routes/subjectLiveClassRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const {
  createLiveClass,
  getLiveClasses,
  getLiveClassById,
  updateLiveClass,
  updatePublishStatus,
  previewRecurrence,
  duplicateLiveClass,
  deleteLiveClass
} = require('../controllers/subjectLiveClassController');

router.post('/preview-recurrence', previewRecurrence);
router.post('/:id/duplicate', duplicateLiveClass);
router.patch('/:id/publish-status', updatePublishStatus);

router.post('/', createLiveClass);
router.get('/', getLiveClasses);
router.get('/:id', getLiveClassById);
router.put('/:id', updateLiveClass);
router.delete('/:id', deleteLiveClass);

module.exports = router;
```

---

### 10.12 `app.js` wiring

**Imports:**

```javascript
const subjectContentFolderRoutes = require('./routes/subjectContentFolderRoutes');
const subjectLiveClassRoutes = require('./routes/subjectLiveClassRoutes');
```

**Mounts:**

```javascript
app.use('/api/faculty-subjects', ...superAdminAuth, facultySubjectRoutes);
app.use('/api/folders', ...superAdminAuth, subjectContentFolderRoutes);
app.use('/api/batches', ...superAdminAuth, batchRoutes);
app.use('/api/batch-enrollments', ...superAdminAuth, batchEnrollmentRoutes);
// Academic CMS live classes (Faculty Subject content module)
app.use('/api/live-classes', ...superAdminAuth, subjectLiveClassRoutes);

// Legacy LMS live classes (100ms integration — separate from Academic CMS)
app.use('/api/lms/live-classes', liveClassRoutes);
```

---

### 10.13 Full model source — `models/SubjectContentFolder.js`

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

---

### 10.14 Full model source — `models/SubjectLiveClass.js`

```javascript
const mongoose = require('mongoose');
const {
  PUBLISH_STATUSES,
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
    description: {
      type: String,
      default: '',
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
      required: true,
      default: 'Asia/Kolkata',
      trim: true
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

---

### 10.15 Full controller — `controllers/subjectContentFolderController.js`

```javascript
const SubjectContentFolder = require('../models/SubjectContentFolder');
const {
  generateSubjectContentFolderId,
  isValidObjectId
} = require('../utils/contentIdGenerator');
const { NOT_DELETED, escapeRegex, parsePagination } = require('../utils/contentMastersHelpers');
const {
  validateFolderPayload,
  validateCategory
} = require('../utils/facultyContentHelpers');

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
      return res.status(400).json({ success: false, message: validation.message });
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
      if (!String(req.body.folderName).trim()) {
        return res.status(400).json({ success: false, message: 'folderName cannot be empty' });
      }
      folder.folderName = String(req.body.folderName).trim();
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
```

---

### 10.16 Full service — `services/recurrenceEngine.js`

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

const generateCustomOccurrences = (args) => generateDailyOccurrences(args);

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

  if (!REPEAT_TYPES.includes(repeatType)) return [];

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
      return generateDailyOccurrences({ ...base, repeatEvery: recurrence.repeatEvery || 1 });
    case 'WEEKLY':
      return generateWeeklyOccurrences({ ...base, weekdays: recurrence.weekdays || [] });
    case 'MONTHLY':
      return generateMonthlyOccurrences({
        ...base,
        monthlyPattern: recurrence.monthlyPattern || 'SAME_DATE'
      });
    case 'CUSTOM':
      return generateCustomOccurrences({ ...base, repeatEvery: recurrence.repeatEvery || 1 });
    default:
      return [];
  }
};

const previewRecurrence = (payload) => {
  const occurrences = generateRecurrenceOccurrences(payload);
  return { totalSessions: occurrences.length, occurrences };
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

---

### 10.17 Full controller — `controllers/subjectLiveClassController.js`

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
const { validateLiveClassPayload, PUBLISH_STATUSES } = require('../utils/facultyContentHelpers');
const { previewRecurrence } = require('../services/recurrenceEngine');

const formatLiveClass = (doc) => ({
  _id: doc._id,
  liveClassId: doc.liveClassId,
  facultySubjectId: doc.facultySubjectId,
  folderId: doc.folderId,
  batchId: doc.batchId,
  centerId: doc.centerId,
  classroomId: doc.classroomId,
  classTitle: doc.classTitle,
  description: doc.description || '',
  scheduledDate: doc.scheduledDate,
  startTime: doc.startTime,
  durationHours: doc.durationHours ?? 0,
  durationMinutes: doc.durationMinutes ?? 0,
  durationSeconds: doc.durationSeconds ?? 0,
  timezone: doc.timezone,
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
            description: 1,
            scheduledDate: 1,
            startTime: 1,
            durationHours: 1,
            durationMinutes: 1,
            durationSeconds: 1,
            timezone: 1,
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
      return res.status(400).json({ success: false, message: validation.message });
    }

    const doc = await SubjectLiveClass.create({
      liveClassId: await generateSubjectLiveClassId(),
      facultySubjectId: validation.facultySubject._id,
      folderId: validation.folder._id,
      batchId: req.body.batchId,
      centerId: req.body.centerId,
      classroomId: req.body.classroomId,
      classTitle: String(req.body.classTitle).trim(),
      description: String(req.body.description || '').trim(),
      scheduledDate: new Date(req.body.scheduledDate),
      startTime: validation.startTime,
      durationHours: Number(req.body.durationHours) || 0,
      durationMinutes: Number(req.body.durationMinutes) || 0,
      durationSeconds: Number(req.body.durationSeconds) || 0,
      timezone: String(req.body.timezone).trim(),
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
      return res.status(404).json({ success: false, message: 'Live class not found' });
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
      return res.status(404).json({ success: false, message: 'Live class not found' });
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
      publishStatus: req.body.publishStatus ?? existing.publishStatus,
      classStatus: req.body.classStatus ?? existing.classStatus,
      recurrence: req.body.recurrence ?? existing.recurrence
    };

    const validation = await validateLiveClassPayload(merged);
    if (!validation.ok) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    if (req.body.classTitle !== undefined) existing.classTitle = String(req.body.classTitle).trim();
    if (req.body.description !== undefined) existing.description = String(req.body.description || '').trim();
    if (req.body.scheduledDate !== undefined) existing.scheduledDate = new Date(req.body.scheduledDate);
    if (req.body.startTime !== undefined) existing.startTime = validation.startTime;
    if (req.body.durationHours !== undefined) existing.durationHours = Number(req.body.durationHours) || 0;
    if (req.body.durationMinutes !== undefined) existing.durationMinutes = Number(req.body.durationMinutes) || 0;
    if (req.body.durationSeconds !== undefined) existing.durationSeconds = Number(req.body.durationSeconds) || 0;
    if (req.body.timezone !== undefined) existing.timezone = String(req.body.timezone).trim();
    if (req.body.batchId !== undefined) existing.batchId = req.body.batchId;
    if (req.body.centerId !== undefined) existing.centerId = req.body.centerId;
    if (req.body.classroomId !== undefined) existing.classroomId = req.body.classroomId;
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
      return res.status(400).json({
        success: false,
        message: `publishStatus must be one of: ${PUBLISH_STATUSES.join(', ')}`
      });
    }

    const doc = await SubjectLiveClass.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { publishStatus, updatedBy: req.user?._id || null },
      { new: true }
    ).lean();

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
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

exports.previewRecurrence = async (req, res) => {
  try {
    const { scheduledDate, startTime, recurrence, maxOccurrences } = req.body;

    if (!scheduledDate) {
      return res.status(400).json({ success: false, message: 'scheduledDate is required' });
    }

    const result = previewRecurrence({
      scheduledDate,
      startTime: startTime || '00:00:00',
      recurrence: recurrence || { enabled: false },
      maxOccurrences: maxOccurrences || 500
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Preview recurrence error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.duplicateLiveClass = async (req, res) => {
  try {
    const source = await SubjectLiveClass.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!source) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    const clone = {
      liveClassId: await generateSubjectLiveClassId(),
      facultySubjectId: source.facultySubjectId,
      folderId: source.folderId,
      batchId: source.batchId,
      centerId: source.centerId,
      classroomId: source.classroomId,
      classTitle: req.body.classTitle?.trim() || `${source.classTitle} (Copy)`,
      description: source.description || '',
      scheduledDate: source.scheduledDate,
      startTime: source.startTime,
      durationHours: source.durationHours ?? 0,
      durationMinutes: source.durationMinutes ?? 0,
      durationSeconds: source.durationSeconds ?? 0,
      timezone: source.timezone,
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

exports.deleteLiveClass = async (req, res) => {
  try {
    const doc = await SubjectLiveClass.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
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

---

### 10.18 Full `utils/contentIdGenerator.js`

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

---

### 10.19 API testing — cURL examples

**Login**

```bash
curl -X POST "{{BASE_URL}}/api/auth/login-super-admin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@sriram.com\",\"password\":\"admin123\"}"
```

**Create folder**

```bash
curl -X POST "{{BASE_URL}}/api/faculty-subjects/content/folders" \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d "{\"facultySubjectId\":\"{{fsId}}\",\"category\":\"LIVE_CLASS\",\"folderName\":\"Prelims Live Class\"}"
```

**Content tree**

```bash
curl "{{BASE_URL}}/api/faculty-subjects/{{fsId}}/content-tree" \
  -H "Authorization: Bearer {{token}}"
```

**Preview recurrence**

```bash
curl -X POST "{{BASE_URL}}/api/live-classes/preview-recurrence" \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d "{\"scheduledDate\":\"2026-05-29\",\"startTime\":\"10:00:00\",\"recurrence\":{\"enabled\":true,\"repeatType\":\"WEEKLY\",\"startDate\":\"2026-05-29\",\"endDate\":\"2026-07-29\",\"weekdays\":[\"MON\",\"WED\",\"FRI\"]}}"
```

**Create live class (draft)**

```bash
curl -X POST "{{BASE_URL}}/api/live-classes" \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d "{\"facultySubjectId\":\"{{fsId}}\",\"folderId\":\"{{folderId}}\",\"batchId\":\"{{batchId}}\",\"centerId\":\"{{centerId}}\",\"classroomId\":\"{{classroomId}}\",\"classTitle\":\"History\",\"scheduledDate\":\"2026-05-29\",\"startTime\":\"10:00:00\",\"timezone\":\"Asia/Kolkata\",\"publishStatus\":\"DRAFT\"}"
```

**Publish**

```bash
curl -X PATCH "{{BASE_URL}}/api/live-classes/{{liveClassId}}/publish-status" \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d "{\"publishStatus\":\"PUBLISHED\"}"
```

**Duplicate**

```bash
curl -X POST "{{BASE_URL}}/api/live-classes/{{liveClassId}}/duplicate" \
  -H "Authorization: Bearer {{token}}"
```

---

### 10.20 Repo file index (copy-paste reference)

| Path | Lines | Status |
|------|-------|--------|
| `utils/batchFacultyConstants.js` | 25 | Updated |
| `utils/facultyContentConstants.js` | 26 | New |
| `utils/facultyContentHelpers.js` | 338 | New |
| `utils/contentIdGenerator.js` | 56 | Updated |
| `models/SubjectContentFolder.js` | 70 | New |
| `models/SubjectLiveClass.js` | 143 | New |
| `services/recurrenceEngine.js` | 272 | New |
| `services/scheduleConflictService.js` | 347 | New (REQ 6–8) |
| `controllers/subjectContentFolderController.js` | 203 | New |
| `controllers/subjectLiveClassController.js` | 460 | New |
| `controllers/facultySubjectController.js` | +55 CMS | Updated |
| `routes/facultySubjectRoutes.js` | 31 | Updated |
| `routes/subjectContentFolderRoutes.js` | 16 | New |
| `routes/subjectLiveClassRoutes.js` | 25 | New |
| `app.js` | +6 lines | Updated |

All CMS source is inlined in §10.1–§10.18 above; repo files remain the runtime source of truth.

---

### 10.21 `services/scheduleConflictService.js` (Requirements 6–8)

Full source: `services/scheduleConflictService.js` (347 lines).

**Exports:**

| Function | Purpose |
|----------|---------|
| `assertFolderCanBeDeleted(folderId)` | REQ-6 — block delete if live classes exist |
| `checkClassroomAvailability(...)` | REQ-7 — room overlap on create/update |
| `checkFacultyAvailability(...)` | REQ-8 — teacher overlap via `FacultySubject.teacher` |
| `runScheduleConflictChecks(payload, excludeId)` | Runs both checks (used by controller) |
| `expandSlotsForLiveClass(...)` | Single + recurrence slots for overlap math |

**Postman collection:** `FACULTY_SUBJECT_CMS_POSTMAN_COLLECTION.json`