# Student Master + Batch Enrollment + Transfer API Guide

> **Full stack guide (Faculty + Batch + Enrollment):** see **`BATCH_FACULTY_SUBJECT_API_GUIDE.md`**  
> **Postman:** **`BATCH_FACULTY_SUBJECT_POSTMAN_COLLECTION.json`**


## Architecture

```text
AcademicStudent (permanent identity)
        ↓
BatchEnrollment (batch link — NOT embedded in Batch)
        ↓
Batch → FacultySubject → Course
```

**Important naming**

| Model | Purpose |
|-------|---------|
| `AcademicStudent` | ERP student master (`STU001`, name, email, mobile) |
| `BatchEnrollment` | Active/inactive link to a batch (`ENR001`) |
| `BatchTransfer` | Audit log when moving between batches (`BTR001`) |
| `BatchAudit` | Batch-level action history |
| `Student` (existing) | Parent portal linked to `User` — **unchanged** |
| `Enrollment` (existing) | Online course purchase / Razorpay — **unchanged** |

Students are **never** stored inside `batch.students[]`.  
`batch.totalStudents` is synced from `countDocuments({ batch, status: 'ACTIVE' })`.

---

## Auth

All routes require Super Admin:

```http
Authorization: Bearer {{SuperAdminToken}}
```

Login: `POST {{BASE_URL}}/api/auth/login-super-admin`

---

## 1. Add student to batch (enrollment creation)

`POST {{BASE_URL}}/api/batch-enrollments`

Creates **Student + Enrollment** if email/mobile is new.  
Creates **only Enrollment** if student already exists.

### Body (JSON)

```json
{
  "studentName": "Vikram Singh",
  "email": "vikram@example.com",
  "mobileNumber": "9876543210",
  "courseId": "<courseObjectId>",
  "batchId": "<batchObjectId>",
  "paymentStatus": "PENDING",
  "attendancePercentage": 0,
  "courseProgressPercentage": 0
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `studentName` | Yes | |
| `email` or `mobileNumber` | At least one | Used to dedupe student |
| `courseId` | Yes | Must match batch's course |
| `batchId` | Yes | Batch must be `ACTIVE` or `UPCOMING` |
| `paymentStatus` | No | `PAID`, `PENDING`, `PARTIAL`, `OVERDUE` (default `PENDING`) |
| `attendancePercentage` | No | 0–100 |
| `courseProgressPercentage` | No | 0–100 |

### Response highlights

- `studentCreated: true|false`
- `batchTotalStudents` — recalculated count
- `data` — enrollment with populated student/batch/course

---

## 2. List students in a batch

`GET {{BASE_URL}}/api/batch-enrollments/by-batch/:batchId`

### Query params

| Param | Description |
|-------|-------------|
| `search` | Name, email, mobile, studentId, enrollmentId |
| `paymentStatus` | `PAID`, `PENDING`, `PARTIAL`, `OVERDUE` |
| `status` | `ACTIVE`, `INACTIVE` |
| `page`, `limit` | Pagination |
| `sortBy`, `sortOrder` | Sort |

---

## 3. View / edit / remove enrollment

| Method | URL | Action |
|--------|-----|--------|
| `GET` | `/api/batch-enrollments/:id` | View enrollment + student |
| `PUT` | `/api/batch-enrollments/:id` | Update payment, attendance, progress, student name/contact |
| `PATCH` | `/api/batch-enrollments/status/:id` | Set enrollment `ACTIVE` / `INACTIVE` |
| `DELETE` | `/api/batch-enrollments/:id` | Soft-delete enrollment |

### Edit example

```json
{
  "paymentStatus": "PARTIAL",
  "attendancePercentage": 72,
  "courseProgressPercentage": 45,
  "studentName": "Vikram Singh Updated"
}
```

---

## 4. Move student to another batch

### 4a. Current batch (read-only field)

`GET {{BASE_URL}}/api/batch-enrollments/:enrollmentId/move-form`

`:enrollmentId` — MongoDB `_id` or display id (`ENR001`).

```json
{
  "success": true,
  "currentBatchName": "Mains GS Batch With Banner"
}
```

### 4a-ii. Target batches + other courses (dropdowns)

```http
GET {{BASE_URL}}/api/batches/dropdown?excludeBatchId={{currentBatchId}}
GET {{BASE_URL}}/api/courses/dropdown?excludeCourseId={{currentCourseId}}
```

### 4b. Submit move

`POST {{BASE_URL}}/api/batch-enrollments/:enrollmentId/move`

### Flow (server-side)

1. Old enrollment → `status: INACTIVE`, `transferredTo: newBatchId`
2. New enrollment → `status: ACTIVE`, `transferredFrom: oldBatchId`
3. `BatchTransfer` record created
4. Both batch `totalStudents` counts updated
5. `BatchAudit` entries on source and destination batches

### Body

```json
{
  "toBatchId": "<destinationBatchObjectId>",
  "transferReason": "Promoted to next batch",
  "transferAttendanceRecords": true,
  "transferFeeRecords": true,
  "transferTestRecords": false,
  "effectiveTransferDate": "2026-05-27",
  "paymentStatus": "PAID",
  "attendancePercentage": 80,
  "courseProgressPercentage": 60
}
```

| Flag | Behavior |
|------|----------|
| `transferAttendanceRecords` | Copies attendance & progress from old enrollment if new values omitted |
| `transferFeeRecords` | Copies `paymentStatus` from old enrollment if `paymentStatus` omitted |
| `transferTestRecords` | Stored on transfer log for future test/assignment migration |

---

## 5. Transfer history & audit

| Method | URL |
|--------|-----|
| `GET` | `/api/batch-enrollments/batch/:batchId/transfers` |
| `GET` | `/api/batch-enrollments/batch/:batchId/audit` |
| `GET` | `/api/batch-enrollments/student/:studentId/history` |

---

## 6. Related modules (already wired)

| Module | Base URL |
|--------|----------|
| Faculty Subject | `/api/faculty-subjects` |
| Batch | `/api/batches` |
| Subject / Topic / Teacher | `/api/subjects`, `/api/topics`, `/api/teachers` |

See `BATCH_FACULTY_SUBJECT_MODULE_COMPLETE.md` for batch & faculty-subject payloads.

---

## Recommended ERP flow

```text
1. POST /api/subjects
2. POST /api/topics
3. POST /api/teachers
4. POST /api/faculty-subjects
5. POST /api/batches
6. POST /api/batch-enrollments   ← add student
7. POST /api/batch-enrollments/:id/move   ← when promoting
```

---

## Future modules (not yet implemented)

- Merge batch
- FacultySubject content: Live Classes, Recordings, Tests, PDFs  
  → should reference **BatchEnrollment**, not Batch, for transfer-safe data
