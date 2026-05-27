# Course Create / Update — Form-Data Guide (CMS UI)

**Base URL:** `http://localhost:5000`  
**Auth:** `Bearer` token (Super Admin or Center Admin)

---

## Removed from create form (do not send)

- `onlineActualPrice`, `onlineDiscountPercent`, `duration`
- `banner`, `highlight`, `section`, `gallery`, `video`, `brochure` (legacy media)

---

## Required text fields

| Field | Type | Example |
|-------|------|---------|
| `courseName` | text | `GS Foundation Batch 2026` |
| `centerId` | text | MongoDB ObjectId |
| `programId` | text | ObjectId |
| `categoryId` | text | Academic category ObjectId |
| `subCategoryId` | text | Academic subcategory ObjectId |
| `courseOverview` | text | Long description |
| `status` | text | `ACTIVE` or `INACTIVE` |

---

## Hierarchy validation (automatic)

On **POST** and **PUT** (when hierarchy IDs change), the backend validates:

```text
Center (ACTIVE) → Program (ACTIVE, linked to center)
  → Category (ACTIVE, same centerId + programId)
    → SubCategory (ACTIVE, same centerId + programId + categoryId)
```

Failure response:

```json
{
  "success": false,
  "message": "Invalid hierarchy selection",
  "reason": "SubCategory does not match center, program, and category"
}
```

---

## 1. Key features — one image + flat point strings per row

Each **“Key Features Of Course”** block in the UI = **1 image** + **up to 5 text boxes** (each box is one string in `points`).

### Correct shape (send this)

**JSON field `keyFeatures`:**

```json
[
  {
    "points": [
      "Daily tests",
      "Mentor support",
      "Study material",
      "Doubt sessions",
      "Revision"
    ]
  },
  {
    "points": ["Answer writing"]
  }
]
```

**Files (one image per row):**

- Row 1 → `keyFeatureImage_0`
- Row 2 → `keyFeatureImage_1`

### Wrong — do not nest points

```json
[
  { "points": [{ "point": "Daily tests" }] },
  { "subPoints": ["Mentor support"] }
]
```

`points` must be a **flat array of strings**, not objects or sub-points.

### Alternative (matches 5 inputs without one JSON blob)

| Field | Value |
|-------|--------|
| `keyFeaturePoints_0` | `["Daily tests","Mentor support","Study material","Doubt sessions","Revision"]` |
| `keyFeatureImage_0` | file |

Or per input: `keyFeaturePoint_0_0`, `keyFeaturePoint_0_1`, … `keyFeaturePoint_0_4`.

### Stored in DB (backend merges image + points)

```json
[
  {
    "image": "https://res.cloudinary.com/.../a.jpg",
    "points": [
      "Daily tests",
      "Mentor support",
      "Study material",
      "Doubt sessions",
      "Revision"
    ]
  },
  {
    "image": "https://res.cloudinary.com/.../b.jpg",
    "points": ["Answer writing"]
  }
]
```

**Limits:** max **10** rows.  
**Image validation:** JPEG, PNG, WEBP — max **5 MB** each.

---

## 2. Feature cards — `displayOrder` inside JSON only (like help sections)

**Send one field `featureCards` (JSON array).**  
Put `displayOrder` **inside each object** — do **not** send `featureCardDisplayOrder_0` or any separate order field.

```json
[
  {
    "featureTitle": "Expert Faculty",
    "displayOrder": 1,
    "featureDescription": "Learn from mentors...",
    "highlightOnWebsite": true
  },
  {
    "featureTitle": "Structured Plan",
    "displayOrder": 2,
    "featureDescription": "Step-by-step...",
    "highlightOnWebsite": false
  }
]
```

If `displayOrder` is omitted in an object, backend uses `index + 1` for that row.

**Icon files (separate, by index):** `featureCardIcon_0`, `featureCardIcon_1`, …

**Stored:**

```json
{
  "featureCards": [
    {
      "image": "https://...",
      "featureTitle": "Expert Faculty",
      "displayOrder": 1,
      "featureDescription": "...",
      "highlightOnWebsite": true
    }
  ]
}
```

**Limits:** max **20** cards.  
**Icon validation:** JPEG, PNG, WEBP, SVG — max **1 MB**.

---

## 3. Help sections — use `displayOrder` metadata

**Frontend sends:**

```json
[
  { "displayOrder": 1 },
  { "displayOrder": 2 }
]
```

`displayOrder` is optional; backend defaults to `index + 1`.

On **update**, include existing URLs to keep media:

```json
[
  { "displayOrder": 1, "video": "https://res.cloudinary.com/.../old.mp4" }
]
```

**Files per row:**

| Row | Video | Image 1 | Image 2 |
|-----|-------|---------|---------|
| 0 | `helpSectionVideo_0` | `helpSectionImage1_0` | `helpSectionImage2_0` |
| 1 | `helpSectionVideo_1` | `helpSectionImage1_1` | `helpSectionImage2_1` |

**Limits:** max **10** sections.  
**Video:** MP4, WebM — max **50 MB**.  
**Images:** JPEG, PNG, WEBP — max **5 MB** each.

---

## File validation (backend enforced)

| Field prefix | Allowed types | Max size |
|--------------|---------------|----------|
| `keyFeatureImage` | jpeg, png, webp | 5 MB |
| `featureCardIcon` | jpeg, png, webp, svg | 1 MB |
| `helpSectionImage1`, `helpSectionImage2` | jpeg, png, webp | 5 MB |
| `helpSectionVideo` | mp4, webm | 50 MB |

Invalid type or size → `400` with a clear message.  
Unknown field names (e.g. random uploads) are rejected.

---

## APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/api/courses` | List, search, filters, pagination (populated) |
| **POST** | `/api/courses` | Create (multipart) |
| **PUT** | `/api/courses/:id` | Update |
| **PATCH** | `/api/courses/status/:id` | `{ "status": "ACTIVE" \| "INACTIVE" }` |
| **GET** | `/api/courses/:id` | Detail (populated) |
| **DELETE** | `/api/courses/:id` | **Soft delete** (`isDeleted: true`) — Super Admin |

---

## GET list — search & filters

```http
GET /api/courses?page=1&limit=10&search=gs&centerId=CENTER_ID&programId=PROGRAM_ID&categoryId=CAT_ID&subCategoryId=SUB_ID&status=ACTIVE
```

| Query | Description |
|-------|-------------|
| `page` | Default `1` |
| `limit` | Default `10`, max `100`, or `all` |
| `search` | Case-insensitive on `courseName`, `title`, `courseId` |
| `centerId` or `center` | Filter by center |
| `programId` or `program` | Filter by program |
| `categoryId` | Academic category |
| `subCategoryId` | Academic subcategory |
| `status` | `ACTIVE` or `INACTIVE` |

**Response:**

```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "page": 1,
  "limit": 10,
  "pages": 5,
  "courses": [
    {
      "courseName": "GS Foundation",
      "center": { "centerName": "Hyderabad" },
      "program": { "programName": "UPSC" },
      "academicCategory": { "categoryName": "Prelims" },
      "academicSubCategory": { "subCategoryName": "GS" }
    }
  ]
}
```

Deleted courses are excluded from list/detail (`isDeleted: true`).

---

## React — feature cards + help sections

```javascript
formData.append(
  'featureCards',
  JSON.stringify(
    cards.map((card, index) => ({
      featureTitle: card.title,
      featureDescription: card.description,
      highlightOnWebsite: card.highlight,
      displayOrder: index + 1 // inside JSON only
    }))
  )
);
cards.forEach((card, i) => {
  if (card.iconFile) formData.append(`featureCardIcon_${i}`, card.iconFile);
});

formData.append(
  'helpSections',
  JSON.stringify(helpRows.map((_, index) => ({ displayOrder: index + 1 })))
);
```

---

## React — key features (5 inputs → one `points` array)

```javascript
// row.points = ["Daily tests", "Mentor support", ...]  // flat strings from UI text boxes
formData.append(
  'keyFeatures',
  JSON.stringify(
    rows.map((row) => ({
      points: row.points.filter((p) => p && String(p).trim())
    }))
  )
);
rows.forEach((row, i) => {
  if (row.imageFile) formData.append(`keyFeatureImage_${i}`, row.imageFile);
});

// OR send each text box separately:
// row.points.forEach((text, j) => formData.append(`keyFeaturePoint_${i}_${j}`, text));
```

---

Postman: **`COURSE_ERP_POSTMAN_COLLECTION.json`**
