# Faculty Subject CMS — PDF Module

Academic CMS module for **PDF resources** under Faculty Subjects. Super Admin only (Bearer `SuperAdminToken`).

## Overview

| Item | Value |
|------|-------|
| Category | `PDF` |
| Model | `SubjectPdf` |
| ID prefix | `SPF001`, `SPF002`, … |
| Base route | `/api/subject-pdfs` |
| Visibility | `VISIBILITY`, `PUBLISHED`, `DRAFT`, `PRIVATE` |
| Multiple PDFs | Yes — one folder holds many PDF entries |

## Prerequisites

1. Faculty Subject must include `PDF` in `categories[]`.
2. Create a folder: `POST /api/faculty-subjects/content/folders` with `category: "PDF"`.
3. Add PDF entries inside that folder (repeat POST for each PDF).

## UI Fields

| Field | API field | Type | Required |
|-------|-----------|------|----------|
| Select Batch | `batchId` | ObjectId | Yes |
| PDF Title | `pdfTitle` | string | Yes |
| Tags | `tags` | string or array | No |
| Visibility | `visibility` | enum | Yes |
| Upload PDF | `pdf` | file (multipart) | Yes on create |
| Description | `description` | string | No |

### Batch dropdown (existing)

```
GET /api/batches/dropdown?facultySubjectId={facultySubjectId}
```

Also returned in `GET /api/subject-pdfs/create-form?facultySubjectId=` → `data.batches[]`.

### Visibility enum (stored in DB — not display text)

| Value | Student access |
|-------|----------------|
| `VISIBILITY` | Shown in visibility-filtered views (same as RECORDING) |
| `PUBLISHED` | Visible to enrolled students |
| `DRAFT` | Admin only |
| `PRIVATE` | Admin only — hidden from students |

Change visibility via:

```
PATCH /api/subject-pdfs/:id/visibility
{ "visibility": "PUBLISHED" }
```

## Left Navigation

```
GET /api/faculty-subjects/:id/content-tree
```

Returns `data.PDF[]` with folders when category is enabled.

## Dependency Flow

```
1. GET /api/faculty-subjects/dropdown?category=PDF
2. POST /api/faculty-subjects/content/folders { category: "PDF", folderName: "Resource PDF" }
3. GET /api/folders?facultySubjectId=&category=PDF
4. GET /api/batches/dropdown?facultySubjectId=
5. GET /api/subject-pdfs/create-form?facultySubjectId=&folderId=
6. POST /api/subject-pdfs (multipart) — repeat for each PDF in folder
```

## CRUD Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/subject-pdfs/create-form` | Enums, folders, batches |
| GET | `/api/subject-pdfs/dashboard-summary` | Counts by visibility |
| POST | `/api/subject-pdfs` | Create PDF |
| GET | `/api/subject-pdfs` | List (filter `folderId`, `visibility`, `batchId`) |
| GET | `/api/subject-pdfs/:id` | Detail |
| PUT | `/api/subject-pdfs/:id` | Update (optional new PDF file) |
| PATCH | `/api/subject-pdfs/:id/visibility` | Change visibility |
| POST | `/api/subject-pdfs/:id/download` | PDF URL + viewCount++ |
| DELETE | `/api/subject-pdfs/:id` | Soft delete |

## Create Example

```
POST /api/subject-pdfs
Content-Type: multipart/form-data

facultySubjectId: <ObjectId>
folderId: <ObjectId>
batchId: <ObjectId>
pdfTitle: Indian Polity Notes Chapter 1
tags: polity,notes
visibility: DRAFT
description: PDF description
pdf: <file>
```

## Upload Rules

| Rule | Value |
|------|-------|
| Field name | `pdf` |
| Max size | 10 MB |
| MIME type | `application/pdf` only |
| Storage | Cloudinary `faculty-subject/pdfs` |

## Files

| File | Purpose |
|------|---------|
| `FACULTY_SUBJECT_PDF_API_SPEC.json` | API reference |
| `FACULTY_SUBJECT_PDF_POSTMAN_COLLECTION.json` | Postman (import this) |
| `models/SubjectPdf.js` | Mongoose model |
| `controllers/subjectPdfController.js` | CRUD controller |
| `routes/subjectPdfRoutes.js` | Express routes |
| `middleware/subjectPdfUpload.js` | Multer upload |

## Related Modules

| Category | Route |
|----------|-------|
| LIVE_CLASS | `/api/live-classes` |
| RECORDING | `/api/recordings` |
| MAINS_ANSWER_WRITING | `/api/mains-answer-writing` |
| PDF | `/api/subject-pdfs` |
