# Faculty Subject CMS — MAINS_ANSWER_WRITING Module

Academic CMS module for **Mains Answer Writing** content under Faculty Subjects. Super Admin only (Bearer `SuperAdminToken`).

## Overview

| Item | Value |
|------|-------|
| Category | `MAINS_ANSWER_WRITING` |
| Model | `SubjectMainsAnswerWriting` |
| ID prefix | `MAW001`, `MAW002`, … |
| Base route | `/api/mains-answer-writing` |
| Publish status | `DRAFT`, `PUBLISHED`, `UNPUBLISHED` |
| Student visibility | **Only `PUBLISHED`** entries are shown to students |

## Prerequisites

1. Create a **Faculty Subject** with `MAINS_ANSWER_WRITING` in its `categories[]`.
2. Create a **folder** under that category (same pattern as LIVE_CLASS and RECORDING).
3. Add test entries inside the folder.

Folders can only be created when the faculty subject includes the category at creation time.

## UI Fields (Admin Form)

| Field | API field | Type | Required |
|-------|-----------|------|----------|
| Test Name | `testName` | string | Yes |
| Schedule Date | `scheduleDate` | date | Yes |
| Duration | `durationPreset` | enum | Yes |
| Custom duration | `durationMinutes` | number | When preset = `CUSTOM` |
| Total Marks | `totalMarks` | number | Yes |
| Result Date | `resultDate` | date | Yes |
| Write Questions Manually | `questionsText` | string (multiline) | Yes |
| Upload PDF | `pdf` | file (multipart) | Yes on create |
| Publish Status | `publishStatus` | enum | Default `DRAFT` |

### Duration presets

| Preset value | Minutes |
|--------------|---------|
| `30` | 30 mins |
| `60` | 60 mins |
| `90` | 90 mins |
| `120` | 120 mins |
| `180` | 180 mins |
| `CUSTOM` | Send `durationMinutes` (e.g. 45) |

## Left Navigation (Content Tree)

Same filter list as LIVE_CLASS and RECORDING:

```
GET /api/faculty-subjects/:id/content-tree
```

Response includes `data.MAINS_ANSWER_WRITING[]` with folder list when the category is enabled on the faculty subject.

Category filter tags on the UI map to `facultySubject.categories[]`.

## Dependency Flow

```
1. GET /api/faculty-subjects/dropdown?category=MAINS_ANSWER_WRITING
2. POST /api/faculty-subjects/content/folders
     { facultySubjectId, category: "MAINS_ANSWER_WRITING", folderName }
3. GET /api/folders?facultySubjectId=&category=MAINS_ANSWER_WRITING
4. GET /api/mains-answer-writing/create-form?facultySubjectId=&folderId=
5. POST /api/mains-answer-writing (multipart/form-data)
```

## CRUD Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/mains-answer-writing/create-form` | Form defaults, enums, folders |
| GET | `/api/mains-answer-writing/dashboard-summary` | Counts by publish status |
| POST | `/api/mains-answer-writing` | Create entry (requires PDF) |
| GET | `/api/mains-answer-writing` | List (filter by `publishStatus`, `folderId`, `search`) |
| GET | `/api/mains-answer-writing/:id` | Get one entry |
| PUT | `/api/mains-answer-writing/:id` | Update (optional new PDF) |
| PATCH | `/api/mains-answer-writing/:id/publish-status` | Change DRAFT / PUBLISHED / UNPUBLISHED |
| DELETE | `/api/mains-answer-writing/:id` | Soft delete + Cloudinary PDF cleanup |

### Folder endpoints (shared)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/faculty-subjects/content/folders` | Create folder |
| PUT | `/api/faculty-subjects/content/folders/:id` | Update folder |
| GET | `/api/folders?facultySubjectId=&category=MAINS_ANSWER_WRITING` | List folders |
| GET | `/api/folders/:id/content-summary` | Count by publish status |
| DELETE | `/api/folders/:id` | Soft delete (blocked if folder has content) |

## Publish Status Workflow

| Status | Admin | Students |
|--------|-------|----------|
| `DRAFT` | Visible | Hidden |
| `PUBLISHED` | Visible | **Visible** |
| `UNPUBLISHED` | Visible | Hidden |

**Save Draft** → create/update with `publishStatus: "DRAFT"`

**Publish Changes** → `PATCH /api/mains-answer-writing/:id/publish-status` with `{ "publishStatus": "PUBLISHED" }`

**Unpublish** → same endpoint with `{ "publishStatus": "UNPUBLISHED" }`

## Create Example (multipart)

```
POST /api/mains-answer-writing
Content-Type: multipart/form-data

facultySubjectId: <ObjectId>
folderId: <ObjectId>
testName: UPSC Mains Test 1
scheduleDate: 2026-06-15
durationPreset: 60
totalMarks: 200
resultDate: 2026-06-20
questionsText: 1) Discuss basic structure doctrine.
publishStatus: DRAFT
pdf: <file>
```

Custom duration:

```
durationPreset: CUSTOM
durationMinutes: 45
```

## Response Shape (single entry)

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "mainsAnswerWritingId": "MAW001",
    "testName": "UPSC Mains Test 1",
    "scheduleDate": "2026-06-15T00:00:00.000Z",
    "durationPreset": "60",
    "durationMinutes": 60,
    "durationLabel": "60 mins",
    "totalMarks": 200,
    "resultDate": "2026-06-20T00:00:00.000Z",
    "questionsText": "1) ...",
    "pdf": {
      "url": "https://...",
      "publicId": "...",
      "format": "pdf",
      "bytes": 12345
    },
    "publishStatus": "DRAFT",
    "folderName": "UPSC Mains",
    "facultySubjectName": "Indian Polity – Darshan"
  }
}
```

## Upload Rules

| Rule | Value |
|------|-------|
| Field name | `pdf` |
| Max size | 20 MB |
| MIME type | `application/pdf` only |
| Storage | Cloudinary (`faculty-subject/mains-answer-writing`) |

## Error Codes

| Code | When |
|------|------|
| `MAINS_PDF_REQUIRED` | No PDF on create |
| `FACULTY_SUBJECT_CATEGORY_DISABLED` | Category not on faculty subject |
| `FOLDER_INVALID_FOR_MAINS_ANSWER_WRITING` | Wrong folder category |
| `INVALID_DURATION_PRESET` | Bad duration preset |
| `CUSTOM_DURATION_REQUIRED` | CUSTOM preset without minutes |
| `INVALID_RESULT_DATE` | resultDate before scheduleDate |
| `QUESTIONS_TEXT_REQUIRED` | Empty questionsText |
| `INVALID_PUBLISH_STATUS` | Bad publish status |
| `MAINS_ANSWER_WRITING_NOT_FOUND` | Invalid id |
| `FOLDER_HAS_CONTENT` | Cannot delete folder with entries |

## Files

| File | Purpose |
|------|---------|
| `FACULTY_SUBJECT_MAINS_ANSWER_WRITING_API_SPEC.json` | Machine-readable API reference |
| `FACULTY_SUBJECT_MAINS_ANSWER_WRITING_POSTMAN_COLLECTION.json` | Postman collection (import this) |
| `models/SubjectMainsAnswerWriting.js` | Mongoose model |
| `controllers/subjectMainsAnswerWritingController.js` | CRUD controller |
| `routes/subjectMainsAnswerWritingRoutes.js` | Express routes |
| `middleware/subjectMainsAnswerWritingUpload.js` | Multer PDF upload |

## Related Modules

Same folder + category pattern:

- `LIVE_CLASS` → `/api/live-classes`
- `RECORDING` → `/api/recordings`
- `MAINS_ANSWER_WRITING` → `/api/mains-answer-writing` (this module)
- `PRELIMS_TEST`, `PDF` → future modules
