# Test Configuration API Guide

**Module:** Test Management → Test Configuration  
**Base URL:** `{{BASE_URL}}` (e.g. `http://localhost:5000`)  
**Auth:** Super Admin — `Authorization: Bearer {{SuperAdminToken}}`

Postman collection: **`TEST_CONFIGURATION_POSTMAN_COLLECTION.json`**

---

## Overview

Test Configuration has three sections:

| Section | UI Label | Base Path |
|---------|----------|-----------|
| 1 | Exam Pattern | `/api/test-configuration/exam-patterns` |
| 2 | Section Management | `/api/test-configuration/sections` |
| 3 | Language Settings | `/api/test-configuration/languages` |

All endpoints require **Super Admin** authentication. Deletes are **soft deletes** (`isDeleted: true`, status set to `INACTIVE`).

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

Use the returned token as:

```http
Authorization: Bearer {{SuperAdminToken}}
```

### Token is mandatory (all Test Configuration routes)

Every route under `/api/test-configuration/*` runs **`protect`** then **`requireSuperAdmin`**. Without a valid Super Admin Bearer token you get **401** or **403** — never a data list.

| Situation | HTTP | Example message |
|-----------|------|-----------------|
| No `Authorization` header | `401` | `Not authorized, no token` |
| Invalid / expired token | `401` | `Not authorized, token failed` |
| Valid token but not Super Admin | `403` | `Access denied. Super Admin only.` |

**Verify in Postman**

1. Run **0. Auth → GET Dropdown WITHOUT token (expect 401)** — should fail with 401.
2. Run **Login Super Admin**, then any list/dropdown request — should return `200` with data.

**Why you might still see data when the Auth tab says “No Auth”**

- The collection sends **`Authorization: Bearer {{SuperAdminToken}}`** from collection-level Bearer auth or from the **Headers** tab (not only the Auth tab).
- After login once, **`SuperAdminToken`** stays saved in collection variables until you clear it.
- Check **Headers** on the request: if `Authorization` is present, Postman is still sending the token.

---

## Common Response Shape

```json
{
  "success": true,
  "message": "...",
  "data": { }
}
```

**Paginated list:**

```json
{
  "success": true,
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "count": 10,
  "data": []
}
```

**Status values:** `ACTIVE` | `INACTIVE` (UI labels: Active / Inactive)

---

## Common Query Parameters (List APIs)

| Param | Description |
|-------|-------------|
| `page` | Page number (default `1`) |
| `limit` | Items per page (default `10`, max `100`) |
| `search` | Case-insensitive text search (field varies by section) |
| `status` | Filter: `ACTIVE` or `INACTIVE` |
| `sortBy` | Field to sort by (see each section) |
| `sortOrder` | `asc` or `desc` |
| `sortPreset` | UI-friendly preset (alternative to `sortBy` + `sortOrder`) |

### Sort presets (`sortPreset`)

| Preset | Meaning |
|--------|---------|
| `createdOn_newest` | Created On — Newest first |
| `createdOn_oldest` | Created On — Oldest first |
| `modifiedOn_newest` | Modified On — Newest first |
| `modifiedOn_oldest` | Modified On — Oldest first |
| `sectionName_az` | Section Name A–Z *(sections only)* |
| `sectionName_za` | Section Name Z–A *(sections only)* |

---

# Section 1: Exam Pattern

Manage exam instructions shown to candidates before/during tests.

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `instructionDescription` | String | Yes | Max 2000 characters |
| `status` | String | No | `ACTIVE` (default) or `INACTIVE` |

**Auto-generated:** `instructionId` (e.g. `S-1001`), `createdAt`, `updatedAt`, `createdOn`, `modifiedOn`

### Endpoints

| Method | Endpoint | Action |
|--------|----------|--------|
| POST | `/api/test-configuration/exam-patterns` | Add instruction |
| GET | `/api/test-configuration/exam-patterns` | List + search + filter |
| GET | `/api/test-configuration/exam-patterns/dropdown` | Active instructions dropdown |
| GET | `/api/test-configuration/exam-patterns/:id` | View complete details |
| PUT | `/api/test-configuration/exam-patterns/:id` | Edit |
| PATCH | `/api/test-configuration/exam-patterns/status/:id` | Update status only |
| DELETE | `/api/test-configuration/exam-patterns/:id` | Delete |

### Create instruction

```http
POST {{BASE_URL}}/api/test-configuration/exam-patterns
Authorization: Bearer {{SuperAdminToken}}
Content-Type: application/json
```

```json
{
  "instructionDescription": "Descriptive answers must be within word limit.",
  "status": "ACTIVE"
}
```

**Response `201`**

```json
{
  "success": true,
  "message": "Exam instruction created successfully",
  "data": {
    "_id": "...",
    "instructionId": "S-1008",
    "instructionDescription": "Descriptive answers must be within word limit.",
    "status": "ACTIVE",
    "createdAt": "2026-03-20T10:00:00.000Z",
    "updatedAt": "2026-03-20T10:00:00.000Z",
    "createdOn": "2026-03-20",
    "modifiedOn": "2026-03-20"
  }
}
```

### List / search / filter

```http
GET {{BASE_URL}}/api/test-configuration/exam-patterns?search=word&status=ACTIVE&sortPreset=createdOn_newest&page=1&limit=10
Authorization: Bearer {{SuperAdminToken}}
```

| Query | Description |
|-------|-------------|
| `search` | Matches **instruction description** or **instruction ID** |
| `status` | `ACTIVE` or `INACTIVE` |
| `sortBy` | `createdAt`, `updatedAt`, `instructionDescription`, `instructionId`, `status` |
| `sortPreset` | `createdOn_newest`, `createdOn_oldest`, `modifiedOn_newest`, `modifiedOn_oldest` |

---

# Section 2: Section Management

Manage test paper sections (e.g. GS Paper 1, Reasoning Section).

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sectionName` | String | Yes | Unique (case-insensitive) |
| `status` | String | No | `ACTIVE` (default) or `INACTIVE` |

**Auto-generated:** `sectionId` (e.g. `SEC-1010`), dates

### Endpoints

| Method | Endpoint | Action |
|--------|----------|--------|
| POST | `/api/test-configuration/sections` | Add section |
| GET | `/api/test-configuration/sections` | List + search + filter |
| GET | `/api/test-configuration/sections/dropdown` | Active sections dropdown |
| GET | `/api/test-configuration/sections/:id` | View complete details |
| PUT | `/api/test-configuration/sections/:id` | Edit |
| PATCH | `/api/test-configuration/sections/status/:id` | Update status only |
| DELETE | `/api/test-configuration/sections/:id` | Delete |

### Create section

```http
POST {{BASE_URL}}/api/test-configuration/sections
Authorization: Bearer {{SuperAdminToken}}
Content-Type: application/json
```

```json
{
  "sectionName": "English Comprehension",
  "status": "ACTIVE"
}
```

### List / search / filter

```http
GET {{BASE_URL}}/api/test-configuration/sections?search=english&status=ACTIVE&sortPreset=sectionName_az&page=1&limit=10
Authorization: Bearer {{SuperAdminToken}}
```

| Query | Description |
|-------|-------------|
| `search` | Matches **section name** or **section ID** |
| `status` | `ACTIVE` or `INACTIVE` |
| `sortBy` | `createdAt`, `updatedAt`, `sectionName`, `sectionId`, `status` |
| `sortPreset` | All exam-pattern presets plus `sectionName_az`, `sectionName_za` |

---

# Section 3: Language Settings

Manage languages available for tests.

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `languageName` | String | Yes | Also accepts `language` in request body. Unique (case-insensitive) |
| `status` | String | No | `ACTIVE` (default) or `INACTIVE` |

**Auto-generated:** `languageId` (e.g. `LG-4008`), dates

> **Note:** This is separate from the blog `Language` model (`/api/blog`). Test Configuration languages are stored in `TestConfigLanguage`.

### Endpoints

| Method | Endpoint | Action |
|--------|----------|--------|
| POST | `/api/test-configuration/languages` | Add language |
| GET | `/api/test-configuration/languages` | List + search + filter |
| GET | `/api/test-configuration/languages/dropdown` | Active languages dropdown |
| GET | `/api/test-configuration/languages/:id` | View complete details |
| PUT | `/api/test-configuration/languages/:id` | Edit |
| PATCH | `/api/test-configuration/languages/status/:id` | Update status only |
| DELETE | `/api/test-configuration/languages/:id` | Delete |

### Create language

```http
POST {{BASE_URL}}/api/test-configuration/languages
Authorization: Bearer {{SuperAdminToken}}
Content-Type: application/json
```

```json
{
  "languageName": "English",
  "status": "ACTIVE"
}
```

Alternate body key:

```json
{
  "language": "Tamil",
  "status": "ACTIVE"
}
```

### List / search / filter

```http
GET {{BASE_URL}}/api/test-configuration/languages?search=tamil&status=ACTIVE&page=1&limit=10
Authorization: Bearer {{SuperAdminToken}}
```

| Query | Description |
|-------|-------------|
| `search` | Matches **language name** or **language ID** |
| `status` | `ACTIVE` or `INACTIVE` |
| `sortBy` | `createdAt`, `updatedAt`, `languageName`, `languageId`, `status` |

---

## Edit, View, Delete (All Sections)

### View complete details

```http
GET {{BASE_URL}}/api/test-configuration/exam-patterns/:id
Authorization: Bearer {{SuperAdminToken}}
```

Replace `exam-patterns` with `sections` or `languages` as needed. Use MongoDB `_id` from list/create response.

### Edit

```http
PUT {{BASE_URL}}/api/test-configuration/sections/:id
Authorization: Bearer {{SuperAdminToken}}
Content-Type: application/json

{
  "sectionName": "Updated Section Name",
  "status": "INACTIVE"
}
```

### Update status only

```http
PATCH {{BASE_URL}}/api/test-configuration/languages/status/:id
Authorization: Bearer {{SuperAdminToken}}
Content-Type: application/json

{
  "status": "INACTIVE"
}
```

### Delete

```http
DELETE {{BASE_URL}}/api/test-configuration/exam-patterns/:id
Authorization: Bearer {{SuperAdminToken}}
```

---

## File Structure

```
models/
  ExamPatternInstruction.js
  TestConfigSection.js
  TestConfigLanguage.js
controllers/
  examPatternController.js
  testConfigSectionController.js
  testConfigLanguageController.js
routes/
  testConfigurationRoutes.js
utils/
  testConfigurationHelpers.js
  contentIdGenerator.js   (ID generators: S-, SEC-, LG-)
```

---

## Error Codes

| HTTP | When |
|------|------|
| `400` | Validation error (missing field, invalid status, text too long) |
| `401` | Missing or invalid token |
| `403` | Not Super Admin |
| `404` | Record not found |
| `409` | Duplicate section or language name |
| `500` | Server error |
