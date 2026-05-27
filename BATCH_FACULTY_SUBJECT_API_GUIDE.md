# Batch, Faculty Subject & Student Enrollment — API Guide

## Authentication (Super Admin only)

All endpoints below require **Super Admin**. They are **not** public.

| Layer | Middleware | Purpose |
|-------|------------|---------|
| 1 | `protect` | Valid JWT in `Authorization: Bearer <token>` |
| 2 | `requireSuperAdmin` | Only `super_admin` user **or** `AdminAccess` with role `SUPER_ADMIN` |

Applied on every route in:

- `/api/faculty-subjects`
- `/api/batches`
- `/api/batch-enrollments`

### Get token

```http
POST {{BASE_URL}}/api/auth/login-super-admin
Content-Type: application/json

{
  "email": "<SUPER_ADMIN_EMAIL from .env>",
  "password": "<SUPER_ADMIN_PASSWORD from .env>"
}
```

Response: `{ "success": true, "token": "..." }`

### Use token

```http
Authorization: Bearer {{SuperAdminToken}}
```

### Error responses

| Case | Status | Message |
|------|--------|---------|
| No `Authorization` header | `401` | Not authorized, no token |
| Empty `Bearer` token | `401` | Not authorized, no token |
| Invalid / expired JWT | `401` | Not authorized, token failed |
| Center admin / student / other role | `403` | Access denied. Super Admin only. |

Auth is enforced in **`app.js`** on the whole mount path (not optional).

### Postman note

If the collection uses **Bearer Auth** at collection level, Postman still sends a token even when you remove the header on one request. To test without auth: set collection Auth type to **No Auth**, or use a new request outside the collection.

### Public vs protected

| API | Auth |
|-----|------|
| `GET /api/courses/dropdown` | **Super Admin required** (batch form picker) |
| `GET /api/courses` (full list) | Public (admin list / website) |
| `/api/faculty-subjects/*` | **Super Admin required** |
| `/api/batches/*` | **Super Admin required** |
| `/api/batch-enrollments/*` | **Super Admin required** |

Base URL: `{{BASE_URL}}` (e.g. `http://localhost:5000`)

---

## Architecture

```text
Subject → Topic | Teacher
       ↓
FacultySubject (delivery: LIVE_CLASS, RECORDING, TEST, PDF)
       ↓
Batch (course + fees + facultySubjects[])
       ↓
AcademicStudent → BatchEnrollment (NOT embedded in batch)
```

---

# 1. Faculty Subject (`/api/faculty-subjects`)

## Create form dropdowns (one place — recommended)

Use this **single API** for the Faculty Subject create screen instead of calling subject/topic/teacher routes separately.

### Step 1 — Load subjects + categories

```http
GET {{BASE_URL}}/api/faculty-subjects/create-form
Authorization: Bearer {{SuperAdminToken}}
```

**Response `data`:**

| Field | Use in UI |
|-------|-----------|
| `categories` | Multi-select: Live Class, Recording, Test, PDF |
| `subjects` | **Select Subject** dropdown |
| `topics` | Empty until subject chosen |
| `teachers` | Empty until subject chosen |

### Step 2 — After user picks a subject

```http
GET {{BASE_URL}}/api/faculty-subjects/create-form?subjectId=<subjectObjectId>
Authorization: Bearer {{SuperAdminToken}}
```

Optional: `&centerId=<centerObjectId>` to filter teachers by center.

**Response adds:**

| Field | Use in UI |
|-------|-----------|
| `selectedSubject` | Confirms chosen subject |
| `topics` | **Select Topic(s)** — only topics under that subject |
| `teachers` | **Select Teacher** — teachers linked to that subject |

### Frontend flow

```text
1. GET /create-form
      → populate Subject dropdown + Categories checkboxes

2. User selects Subject
      → GET /create-form?subjectId=...
      → populate Topics (multi) + Teacher dropdown

3. User fills subjectName, picks topics, teacher, categories
      → POST /api/faculty-subjects
```

### Legacy separate APIs (still available)

| Step | Endpoint |
|------|----------|
| Subjects | `GET /api/subjects/dropdown` |
| Topics by subject | `GET /api/topics/by-subject/:subjectId` |
| Teachers by subject | `GET /api/teachers?subject=<subjectId>&status=ACTIVE` |

---

## Create

`POST /api/faculty-subjects`

```json
{
  "subjectName": "Polity – Live + Test",
  "subjectId": "<Subject _id>",
  "topicIds": ["<Topic _id>"],
  "teacherId": "<Teacher _id>",
  "categories": ["LIVE_CLASS", "TEST"],
  "status": "ACTIVE"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `subjectName` | Yes | Display name |
| `subjectId` | Yes | Subject master ref |
| `topicIds` | No | Must belong to selected subject |
| `teacherId` | Yes | Active teacher |
| `categories` | Yes | `LIVE_CLASS`, `RECORDING`, `TEST`, `PDF` (multi) |
| `status` | No | `ACTIVE` / `INACTIVE` |

## List (search & filter)

`GET /api/faculty-subjects`

| Query | Description |
|-------|-------------|
| `search` | `subjectName` only (case-insensitive contains) |
| `status` | `ACTIVE`, `INACTIVE` |
| `category` | e.g. `LIVE_CLASS` |
| `page`, `limit`, `sortBy`, `sortOrder` | Pagination |

## View

`GET /api/faculty-subjects/:id`

## Edit

`PUT /api/faculty-subjects/:id` — same fields as create (partial update supported)

## Change status

`PATCH /api/faculty-subjects/status/:id`

```json
{ "status": "INACTIVE" }
```

## Delete (soft)

`DELETE /api/faculty-subjects/:id`

## Dropdown (lightweight — for Batch subject picker)

```http
GET {{BASE_URL}}/api/faculty-subjects/dropdown?search=&status=ACTIVE&category=
```

Returns only:

| Field | Description |
|-------|-------------|
| `_id` | MongoDB id (use in `facultySubjects[]` on batch) |
| `facultySubjectId` | e.g. `FSU001` |
| `subjectName` | Display name |
| `teacherName` | From linked teacher |

```json
{
  "success": true,
  "count": 1,
  "total": 1,
  "data": [
    {
      "_id": "6a169ccbe49ede0d99bb07aa",
      "facultySubjectId": "FSU001",
      "subjectName": "Indian Polity – Live & Test",
      "teacherName": "Dr Rajesh Kumar"
    }
  ]
}
```

| Query | Description |
|-------|-------------|
| `search` | `subjectName` only |
| `status` | Default `ACTIVE` |
| `category` | e.g. `LIVE_CLASS` |
| `page`, `limit` | Pagination |

## Summary by id (lightweight single record)

```http
GET {{BASE_URL}}/api/faculty-subjects/summary/:id
```

`:id` = MongoDB `_id` **or** `facultySubjectId` (e.g. `FSU001`).

Same 4 fields as dropdown. Full details remain at `GET /api/faculty-subjects/:id`.

---

# 2. Course dropdown (for Batch create)

Lightweight list — **no** CMS fields, populate, or nested objects.

```http
GET {{BASE_URL}}/api/courses/dropdown?search=&status=ACTIVE&page=1&limit=100
Authorization: Bearer {{SuperAdminToken}}
```

Query `excludeCourseId=<currentCourseObjectId>` — other courses only (Move Student / cross-course transfer).

**Super Admin required** (same as faculty-subjects / batches).

| Query | Description |
|-------|-------------|
| `search` | `courseName` or `courseId` (contains, case-insensitive) |
| `status` | Default `ACTIVE` |
| `centerId` / `programId` | Optional filters |
| `page`, `limit` | Pagination (default limit 100, max 200) |

**Response:**

```json
{
  "success": true,
  "count": 1,
  "total": 1,
  "page": 1,
  "limit": 100,
  "totalPages": 1,
  "data": [
    {
      "_id": "6a158b16614cacb1bd978e52",
      "courseId": "CRS001",
      "courseName": "Mains GS Foundation Programme"
    }
  ]
}
```

Full course details remain at `GET /api/courses`.

---

# 3. Batch (`/api/batches`)

## Step 1 — Batch details

| Field | Type | Notes |
|-------|------|-------|
| `batchName` | string | Required |
| `courseId` | ObjectId | Active course |
| `commencementDate` | date | |
| `durationInMonths` | number | e.g. 24 (not text) |
| `batchStartDate` | date | Must be ≥ commencementDate |
| `batchEndDate` | date | Must be > batchStartDate |
| `bannerImage` | file or JSON | Multipart field `bannerImage` or `{ url, publicId }` |

## Step 2 — Fees

```json
"fees": {
  "currency": "INR",
  "onlineAmount": 19999,
  "offlineAmount": 24999,
  "discountAmount": 2000,
  "onlineBulletPoints": ["Point 1", "Point 2"],
  "offlineBulletPoints": ["Point 1"]
}
```

Or `feesJson` as string in multipart.

Currencies: `INR`, `USD`, `EUR`

## Step 3 — Faculty subjects

```json
"facultySubjects": ["<FacultySubject _id>", "..."]
```

## Create

`POST /api/batches` — JSON **or** `multipart/form-data` with `bannerImage` file

### JSON body

```json
{
  "batchName": "Mains GS Batch 1",
  "courseId": "<course _id>",
  "commencementDate": "2026-06-01",
  "durationInMonths": 12,
  "batchStartDate": "2026-06-10",
  "batchEndDate": "2027-05-31",
  "fees": { "...": "..." },
  "facultySubjects": ["<facultySubject _id>"],
  "status": "UPCOMING"
}
```

### Multipart form-data (`Content-Type: multipart/form-data`)

Use **text** fields for all values below; use **file** only for `bannerImage`.

| Form field | Type | Required | Example | Notes |
|------------|------|----------|---------|--------|
| `batchName` | text | Yes | `Mains GS Batch 1` | |
| `courseId` | text | Yes | `<course ObjectId>` | From `GET /api/courses/dropdown` |
| `commencementDate` | text | No | `2026-06-01` | Date of commencement (ISO `YYYY-MM-DD`) |
| `durationInMonths` | text | No | `12` | Number only (e.g. 24 for 2 years) |
| `batchStartDate` | text | No | `2026-06-10` | Must be on or after `commencementDate` |
| `batchEndDate` | text | No | `2027-05-31` | Must be after `batchStartDate` |
| `feesJson` | text | No | see below | JSON string for fees block |
| `facultySubjects` | text | Yes | `["<fsId1>","<fsId2>"]` | JSON array string of FacultySubject `_id`s |
| `status` | text | No | `UPCOMING` | Default `UPCOMING` |
| `bannerImage` | file | No | image file | JPEG, PNG, WEBP (max 5 MB) |

**`feesJson` example (single line in Postman):**

```json
{"currency":"INR","onlineAmount":19999,"offlineAmount":24999,"discountAmount":2000,"onlineBulletPoints":["Daily mentorship","Live lectures"],"offlineBulletPoints":["Classroom","Notes"]}
```

**Date validation (server):**

- `batchStartDate` ≥ `commencementDate`
- `batchEndDate` > `batchStartDate`

Statuses: `UPCOMING`, `ACTIVE`, `INACTIVE`, `COMPLETED`, `ARCHIVED`, `CANCELLED`

## List (search & filter)

`GET /api/batches`

| Query | Description |
|-------|-------------|
| `search` | `batchName` only (case-insensitive contains) |
| `status` | Any batch status |
| `courseId` | Filter by course |
| `page`, `limit`, `sortBy`, `sortOrder` | Pagination |

## View full

`GET /api/batches/:id` — includes synced `totalStudents`

## Quick view (action)

`GET /api/batches/:id/quick-view`

Returns snapshot: batchId, batchName, linked course, dates, duration, status, linked subjects, fees, banner, totalStudents, created/modified.

## Edit

`PUT /api/batches/:id` — JSON or multipart (banner optional)

Multipart update: send only fields you want to change, including `commencementDate`, `batchStartDate`, `batchEndDate` as text fields (same format as create).

## Change status (action)

`PATCH /api/batches/status/:id`

```json
{ "status": "ACTIVE" }
```

## Duplicate batch (action)

`POST /api/batches/:id/duplicate`

Copies: fees, faculty subjects, course, banner URL, dates (unless overridden).  
Copies **students by default** (active enrollments).

### Multipart support (recommended)

You can send `multipart/form-data` for duplicate too (same as batch create):

- **Text fields**: `batchName`, `courseId`, `durationInMonths`, `commencementDate`, `batchStartDate`, `batchEndDate`, `feesJson`, `facultySubjects`, `status`
- **File field**: `bannerImage` (optional)

```json
{
  "batchName": "Mains GS Batch 2",
  "status": "UPCOMING"
}
```

Optional: set `"includeStudents": false` to skip copying students.

## Delete (soft)

`DELETE /api/batches/:id`

## Dropdown (move student / filters)

`GET /api/batches/dropdown?excludeBatchId=<current>&courseId=<optional>`

Response `data[]`: `{ "_id", "batchId", "batchName" }`.

---

# 3. Batch students — Enrollment (`/api/batch-enrollments`)

Students are **not** stored inside the batch document.

## Add student to batch

`POST /api/batch-enrollments`

```json
{
  "studentName": "Vikram Singh",
  "email": "vikram@example.com",
  "mobileNumber": "9876543210",
  "batchId": "<batch _id>",
  "paymentStatus": "PENDING",
  "attendancePercentage": 0,
  "courseProgressPercentage": 0
}
```

- Finds student by email **or** mobile; creates student only if new.
- `paymentStatus`: `PAID`, `PENDING`, `PARTIAL`, `OVERDUE`
 - `courseId` is **optional**: if omitted, backend auto-uses the batch's course and still validates consistency.

## List students in batch

`GET /api/batch-enrollments/by-batch/:batchId`

| Query | Description |
|-------|-------------|
| `search` | Student name, email, mobile, ids |
| `paymentStatus` | Payment filter |
| `status` | `ACTIVE`, `INACTIVE` |

## View / edit / delete

| Method | URL |
|--------|-----|
| `GET` | `/api/batch-enrollments/:id` |
| `PUT` | `/api/batch-enrollments/:id` |
| `PATCH` | `/api/batch-enrollments/status/:id` |
| `DELETE` | `/api/batch-enrollments/:id` |

## Move to another batch

**Current batch name:** `GET /api/batch-enrollments/:enrollmentId/move-form` → `{ "currentBatchName": "..." }`

**Target batches:** `GET /api/batches/dropdown?excludeBatchId=<currentBatchId>`

**Other courses:** `GET /api/courses/dropdown?excludeCourseId=<currentCourseId>`

**Submit:** `POST /api/batch-enrollments/:enrollmentId/move`

```json
{
  "toBatchId": "<destination batch>",
  "transferReason": "Promoted",
  "effectiveTransferDate": "2026-05-27",
  "transferAttendanceRecords": true,
  "transferFeeRecords": true,
  "transferTestRecords": false
}
```

## Transfer & audit history

| Method | URL |
|--------|-----|
| `GET` | `/api/batch-enrollments/batch/:batchId/transfers` |
| `GET` | `/api/batch-enrollments/batch/:batchId/audit` |
| `GET` | `/api/batch-enrollments/student/:studentId/history` |

---

# 4. Recommended setup order

```text
1. POST /api/subjects
2. POST /api/topics
3. POST /api/teachers
4. POST /api/faculty-subjects
5. POST /api/batches
6. POST /api/batch-enrollments
```

---

# 5. Pending (not implemented)

- **Merge batch** — complex; planned later
- **Faculty subject content modules** — Live Class, Recording, Test, PDF detail CRUD per category

---

# Postman

Import: `BATCH_FACULTY_SUBJECT_POSTMAN_COLLECTION.json`

Variables: `{{BASE_URL}}`, `{{SuperAdminToken}}`, `{{courseId}}`, `{{facultySubjectId}}`, `{{batchId}}`, `{{enrollmentId}}`
