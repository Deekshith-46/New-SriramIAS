# Content Masters API Guide — Subject → Topic → Teacher

**Base URL:** `{{BASE_URL}}` (e.g. `http://localhost:5000`)  
**Auth:** Super Admin — `Authorization: Bearer <token>`

Postman collection: **`SUBJECT_TOPIC_TEACHER_POSTMAN_COLLECTION.json`**

---

## Architecture

```text
ACADEMIC HIERARCHY (center-scoped)
Program → Category → SubCategory → Course

CONTENT HIERARCHY (global masters — reusable)
Subject → Topic
Teacher → subjects[] (multiple subjects)
```

**Design rules**

- Subjects, topics, and teachers are **global** — not linked to center, program, or category.
- One subject (e.g. Indian Polity) is reused across courses, batches, teachers, and tests.
- Teachers support **multiple subjects** via `subjects: [ObjectId, ...]`.
- Topics belong to **one subject** only.
- Do **not** link teachers directly to topics (use Subject as the bridge).

---

## Authentication

```http
POST {{BASE_URL}}/api/auth/login-super-admin
Content-Type: application/json

{
  "email": "admin@sriram.com",
  "password": "admin123"
}
```

Use the returned `token`:

```http
Authorization: Bearer <token>
```

All endpoints below require **Super Admin**.

---

## ID formats

| Entity  | Field       | Example  |
|---------|-------------|----------|
| Subject | `subjectId` | `SUB001` |
| Topic   | `topicId`   | `TOP001` |
| Teacher | `teacherId` | `TCH001` |

MongoDB `_id` is used in URLs and references (`subjectId` in topic body = Subject `_id`).

---

## 1. Subjects

### 1.1 Create subject

```http
POST {{BASE_URL}}/api/subjects
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**

```json
{
  "subjectName": "Indian Polity",
  "description": "Constitution, governance, and polity for UPSC",
  "status": "ACTIVE"
}
```

**Response `201`**

```json
{
  "success": true,
  "message": "Subject created successfully",
  "data": {
    "_id": "...",
    "subjectId": "SUB001",
    "subjectName": "Indian Polity",
    "description": "Constitution, governance, and polity for UPSC",
    "status": "ACTIVE",
    "linkedTopics": 0,
    "linkedTeachers": 0,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 1.2 List subjects

```http
GET {{BASE_URL}}/api/subjects?page=1&limit=10&search=polity&status=ACTIVE
Authorization: Bearer <token>
```

| Query    | Description                                      |
|----------|--------------------------------------------------|
| `page`   | Default `1`                                      |
| `limit`  | Default `10`, max `100`                          |
| `search` | Matches `subjectName` or `subjectId` (case-insensitive) |
| `status` | `ACTIVE` or `INACTIVE`                           |

**Response `200`**

```json
{
  "success": true,
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "count": 10,
  "data": [
    {
      "_id": "...",
      "subjectId": "SUB001",
      "subjectName": "Indian Polity",
      "description": "...",
      "status": "ACTIVE",
      "linkedTopics": 5,
      "linkedTeachers": 2,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### 1.3 Subjects dropdown (active only)

```http
GET {{BASE_URL}}/api/subjects/dropdown
Authorization: Bearer <token>
```

**Response**

```json
{
  "success": true,
  "count": 8,
  "data": [
    { "_id": "...", "subjectId": "SUB001", "subjectName": "Indian Polity" }
  ]
}
```

---

### 1.4 Get subject by ID

```http
GET {{BASE_URL}}/api/subjects/:id
Authorization: Bearer <token>
```

---

### 1.5 Update subject

```http
PUT {{BASE_URL}}/api/subjects/:id
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "subjectName": "Indian Polity & Governance",
  "description": "Updated description",
  "status": "ACTIVE"
}
```

---

### 1.6 Toggle subject status

```http
PATCH {{BASE_URL}}/api/subjects/status/:id
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "status": "INACTIVE"
}
```

---

### 1.7 Delete subject (soft delete)

```http
DELETE {{BASE_URL}}/api/subjects/:id
Authorization: Bearer <token>
```

Sets `isDeleted: true`, `status: INACTIVE`.  
**Blocked** if the subject still has **active** topics.

---

## 2. Topics

### 2.1 Create topic

```http
POST {{BASE_URL}}/api/topics
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**

```json
{
  "subjectId": "SUBJECT_MONGODB_OBJECT_ID",
  "topicName": "Fundamental Rights",
  "description": "Articles 12–35",
  "status": "ACTIVE"
}
```

**Validation:** `subjectId` must reference an **ACTIVE**, non-deleted subject.

**Response `201`**

```json
{
  "success": true,
  "message": "Topic created successfully",
  "data": {
    "_id": "...",
    "topicId": "TOP001",
    "topicName": "Fundamental Rights",
    "description": "Articles 12–35",
    "subject": "...",
    "subjectId": "SUB001",
    "subjectName": "Indian Polity",
    "status": "ACTIVE",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 2.2 List topics

```http
GET {{BASE_URL}}/api/topics?page=1&limit=10&search=fundamental&subject=SUBJECT_OBJECT_ID&status=ACTIVE
Authorization: Bearer <token>
```

| Query     | Description                                |
|-----------|--------------------------------------------|
| `subject` | Filter by parent subject `_id`             |
| `search`  | Matches `topicName` or `topicId`           |
| `status`  | `ACTIVE` or `INACTIVE`                     |

---

### 2.3 Topics by subject (dropdown)

```http
GET {{BASE_URL}}/api/topics/by-subject/:subjectId
Authorization: Bearer <token>
```

**Response**

```json
{
  "success": true,
  "count": 4,
  "data": [
    { "_id": "...", "topicId": "TOP001", "topicName": "Fundamental Rights" }
  ]
}
```

---

### 2.4 Get / update / status / delete topic

| Action | Method | Endpoint |
|--------|--------|----------|
| Get    | GET    | `{{BASE_URL}}/api/topics/:id` |
| Update | PUT    | `{{BASE_URL}}/api/topics/:id` |
| Status | PATCH  | `{{BASE_URL}}/api/topics/status/:id` |
| Delete | DELETE | `{{BASE_URL}}/api/topics/:id` (soft delete) |

**Update body example**

```json
{
  "topicName": "DPSP",
  "description": "Directive Principles",
  "status": "ACTIVE"
}
```

To change parent subject, send `subjectId` in the PUT body (must be active).

---

## 3. Teachers

### 3.1 Create teacher (multi-subject)

```http
POST {{BASE_URL}}/api/teachers
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**

```json
{
  "centerId": "CENTER_OBJECT_ID",
  "teacherName": "Dr Rajesh Kumar",
  "subjects": [
    "SUBJECT_ID_POLITY",
    "SUBJECT_ID_ETHICS",
    "SUBJECT_ID_ESSAY"
  ],
  "description": "15+ years UPSC mentoring",
  "status": "ACTIVE"
}
```

`center` is accepted as an alias for `centerId`. Center must be **ACTIVE** and not deleted.

**Response `201`**

```json
{
  "success": true,
  "message": "Teacher created successfully",
  "data": {
    "_id": "...",
    "teacherId": "TCH001",
    "teacherName": "Dr Rajesh Kumar",
    "centerId": "...",
    "centerName": "Hyderabad Main Center",
    "description": "15+ years UPSC mentoring",
    "subjects": [
      { "_id": "...", "subjectId": "SUB001", "subjectName": "Indian Polity" },
      { "_id": "...", "subjectId": "SUB002", "subjectName": "Ethics" }
    ],
    "status": "ACTIVE",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 3.2 List teachers

```http
GET {{BASE_URL}}/api/teachers?page=1&limit=10&search=rajesh&centerId=CENTER_OBJECT_ID&subject=SUBJECT_OBJECT_ID&status=ACTIVE
Authorization: Bearer <token>
```

| Query      | Description                                           |
|------------|-------------------------------------------------------|
| `centerId` | Filter by center (`center` alias also works)          |
| `subject`  | Teachers who teach this subject (array contains id)   |
| `search`   | Matches `teacherName` or `teacherId`                  |

**Response includes:** `centerId`, `centerName`, and populated `subjects`.

---

### 3.3 Get / update / status / delete teacher

| Action | Method | Endpoint |
|--------|--------|----------|
| Get    | GET    | `{{BASE_URL}}/api/teachers/:id` |
| Update | PUT    | `{{BASE_URL}}/api/teachers/:id` |
| Status | PATCH  | `{{BASE_URL}}/api/teachers/status/:id` |
| Delete | DELETE | `{{BASE_URL}}/api/teachers/:id` (soft delete) |

**Update body example**

```json
{
  "centerId": "CENTER_OBJECT_ID",
  "teacherName": "Dr Rajesh Kumar",
  "subjects": ["SUBJECT_ID_POLITY", "SUBJECT_ID_ETHICS"],
  "description": "Updated bio",
  "status": "ACTIVE"
}
```

---

## 4. Recommended UI flow

```text
1. GET {{BASE_URL}}/api/subjects/dropdown
2. User picks subject → GET {{BASE_URL}}/api/topics/by-subject/:subjectId
3. Teacher form → multi-select subjects from dropdown
4. Teacher list filter → GET {{BASE_URL}}/api/teachers?subject=:subjectId
```

---

## 5. Error responses

```json
{
  "success": false,
  "message": "Invalid or inactive subject"
}
```

```json
{
  "success": false,
  "message": "Cannot delete subject with active topics. Deactivate topics first."
}
```

```json
{
  "success": false,
  "message": "One or more subjects are invalid or inactive"
}
```

---

## 6. Future extensions (not in this release)

- Teacher: `profileImage`, `qualification`, `experience`, `featuredTeacher`
- Course ↔ Subject mapping (junction table for LMS per course)
- Fees / pricing module (separate from Course document)

---

## Quick reference

| Resource | Base path |
|----------|-----------|
| Subjects | `{{BASE_URL}}/api/subjects` |
| Topics   | `{{BASE_URL}}/api/topics` |
| Teachers | `{{BASE_URL}}/api/teachers` |
