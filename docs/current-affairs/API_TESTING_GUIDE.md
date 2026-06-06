# Current Affairs CMS — API Testing Guide

## Base URL

```
http://localhost:5000
```

Set `API_BASE_URL` in your environment or Postman collection variables.

## Authentication

Protected routes require a Bearer token from Super Admin or Center Admin login:

```
Authorization: Bearer {{authToken}}
```

Login endpoints:

- `POST /api/auth/login-super-admin`
- `POST /api/auth/login-admin-access`

## Swagger Documentation

Interactive docs: `GET /api-docs`

## Categories

| UI Label | API Value |
|----------|-----------|
| Current Affairs | `CURRENT_AFFAIRS` |
| Monthly Magazine | `MONTHLY_MAGAZINE` |
| Infographics | `INFOGRAPHICS` |
| Monthly Recap | `MONTHLY_RECAP` |
| Daily Practice Questions | `DAILY_PRACTICE_QUESTIONS` |

## Field Rules by Category

| Category | Required Fields | PDF |
|----------|-----------------|-----|
| `MONTHLY_MAGAZINE` | category, magazineName, year, month | Required |
| `INFOGRAPHICS` | category, title, year, month | Required |
| `MONTHLY_RECAP` | category, title, year, month | Required |
| `CURRENT_AFFAIRS` | category, title, year, month, description | Optional |
| `DAILY_PRACTICE_QUESTIONS` | category, title, year, month, description | Optional |

## Endpoints

### 1. Create Current Affair

```
POST /api/current-affairs
Content-Type: multipart/form-data
```

**Monthly Magazine example**

| Key | Value |
|-----|-------|
| category | MONTHLY_MAGAZINE |
| magazineName | Vision IAS June Edition |
| year | 2025 |
| month | June |
| pdf | [file] |

**Expected 201**

```json
{
  "success": true,
  "message": "Current affairs created successfully",
  "data": {
    "_id": "...",
    "category": "MONTHLY_MAGAZINE",
    "magazineName": "Vision IAS June Edition",
    "pdfUrl": "/uploads/current-affairs/1717000000000-file.pdf",
    "status": true
  }
}
```

### 2. Get All (with filters)

```
GET /api/current-affairs?page=1&limit=10&category=MONTHLY_MAGAZINE&year=2025&month=June&search=budget&status=true&sortBy=createdAt&sortOrder=desc
```

### 3. Get By ID

```
GET /api/current-affairs/:id
```

### 4. Update

```
PUT /api/current-affairs/:id
Content-Type: multipart/form-data
```

Send only fields to update. Upload `pdf` only when replacing the file; existing PDF is preserved otherwise.

### 5. Soft Delete

```
DELETE /api/current-affairs/:id
```

Sets `isDeleted: true`. Record is excluded from list/detail queries.

### 6. Status Toggle

```
PATCH /api/current-affairs/:id/status
Content-Type: application/json
```

```json
{
  "status": false
}
```

## Validation Errors

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "pdf",
      "message": "PDF file is required for this category"
    }
  ]
}
```

## File Upload Rules

- Field name: `pdf`
- Allowed MIME: `application/pdf`
- Max size: 10 MB
- Storage: `uploads/current-affairs/`
- Public URL: `/uploads/current-affairs/{timestamp-filename.pdf}`

## Manual Test Checklist

1. Create each of the 5 categories with valid data.
2. Verify PDF-required categories reject missing PDF.
3. Verify `CURRENT_AFFAIRS` accepts create without PDF.
4. List with pagination and each filter param.
5. Search by title/magazineName/description substring.
6. Update title without uploading new PDF — old `pdfUrl` unchanged.
7. Replace PDF on update — old file removed, new URL returned.
8. Soft delete — record no longer in GET list.
9. PATCH status — `status` toggles correctly.
10. Upload non-PDF file — returns 400 validation error.
11. Upload PDF > 10 MB — returns 400 validation error.

## Postman Collection

**Full setup guide:** [POSTMAN_SETUP.md](./POSTMAN_SETUP.md)

Import these files from the project root (or `docs/current-affairs/`):

| File | Purpose |
|------|---------|
| `CURRENT_AFFAIRS_POSTMAN_COLLECTION.json` | All requests + test scripts + sample responses |
| `CURRENT_AFFAIRS_POSTMAN_ENVIRONMENT.json` | Local environment variables |
| `CURRENT_AFFAIRS_POSTMAN_ENVIRONMENT_PRODUCTION.json` | Production template |

Quick steps:

1. Import collection + environment into Postman.
2. Select environment **Sriram IAS - Current Affairs (Local)**.
3. Set `superAdminEmail` / `superAdminPassword` from your `.env`.
4. Run **Login Super Admin** → `authToken` auto-saves.
5. Run create requests with a PDF attached to the `pdf` field.

## Folder Structure

```
models/CurrentAffair.js
controllers/currentAffairController.js
services/currentAffairCmsService.js
routes/currentAffairsRoutes.js
validations/currentAffairValidation.js
middleware/currentAffairUpload.js
middleware/cmsAdminAuth.js
utils/currentAffairConstants.js
utils/currentAffairHelpers.js
uploads/current-affairs/
docs/current-affairs/
config/swaggerCurrentAffairs.js
```
