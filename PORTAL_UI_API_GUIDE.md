# Portal UI API Guide (Final — 2 Tabs)

Matches frontend: **one page, two tabs**, filter dropdowns, list cards.

**CMS unchanged:** `/api/resources/*`

---

## Current Affairs tab

**Data source:** `TestCategory`, `TestContent`, `TestPaper` (same as `/api/test-categories`, `/api/test-contents`, `/api/test-papers`).

| Method | URL |
|--------|-----|
| GET | `/api/portal/current-affairs/filters` |
| GET | `/api/portal/current-affairs/resources` |
| GET | `/api/portal/current-affairs/:id` |
| GET | `/api/portal/current-affairs/:id/view` |
| GET | `/api/portal/current-affairs/:id/download` |

### Filters response

```json
{
  "success": true,
  "data": {
    "years": [{ "_id": "2026", "value": "2026" }],
    "months": [{ "_id": "10", "value": "10", "label": "October" }],
    "types": [
      { "_id": "...", "name": "Monthly Magazine", "slug": "monthly-magazine", "categoryType": "CONTENT" },
      { "_id": "...", "name": "Daily Practice Questions", "categoryType": "EXAM" }
    ]
  }
}
```

`types` = rows from **test-categories**. `categoryType`: `CONTENT` (PDF) or `EXAM` (practice test).

### List query

Use IDs **or** labels:

```http
GET /api/portal/current-affairs/resources?typeId={{testCategoryId}}&year=2026&month=10
GET /api/portal/current-affairs/resources?year=2026&month=April
```

`typeId` = **TestCategory** `_id` (e.g. Monthly Magazine, Infographics).

### List response

```json
{
  "success": true,
  "data": [
    {
      "_id": "",
      "title": "Apr 10 News today",
      "pdfUrl": "",
      "year": "2026",
      "month": "April",
      "type": "Daily Current Affairs"
    }
  ]
}
```

---

## Free Resources tab

| Method | URL |
|--------|-----|
| GET | `/api/portal/free-resources/filters` |
| GET | `/api/portal/free-resources/dynamic-filters?typeId=` |
| GET | `/api/portal/free-resources/resources` |
| GET | `/api/portal/free-resources/:id` |
| GET | `/api/portal/free-resources/:id/view` |
| GET | `/api/portal/free-resources/:id/download` |

### Step 1 — Initial filters

`types` = **categories** (NCERT Books, PYQ, Mock Tests, Study Material).

`subjects` and `classes` come from the **NCERT Books** category by default (same data as CMS `GET /api/resources/filters?type=SUBJECT|CLASS&categoryId=...`).

Optional: `GET /filters?typeId={{categoryId}}` reloads subject/class lists for that category (usually only NCERT has them).

```json
{
  "success": true,
  "data": {
    "subjects": [{ "_id": "", "value": "History", "type": "SUBJECT" }],
    "classes": [{ "_id": "", "value": "10th", "type": "CLASS" }],
    "ncertTypeId": "69e1ee859980f3d774514a3f",
    "types": [{ "_id": "", "name": "NCERT Books", "kind": "NCERT" }]
  }
}
```

### Step 2 — User picks type → dynamic filters (PYQ / Study / Mock)

```http
GET /api/portal/free-resources/dynamic-filters?typeId={{categoryId}}
```

**NCERT** → `filters: ["SUBJECT", "CLASS"]` + options  
**PYQ** → `filters: ["SUB_CATEGORY", "PAPER", "YEAR"]` + options  
**Study Material** → `filters: ["SUB_CATEGORY"]`  
**Mock Tests** → `filters: ["SUB_CATEGORY"]` (tests API separate)

### Step 3 — List resources

`typeId` = **categoryId** (required)

```http
# NCERT
GET /api/portal/free-resources/resources?typeId=&subjectId=&classId=

# PYQ
GET /api/portal/free-resources/resources?typeId=&subCategoryId=&paperId=&yearId=
```

```json
{
  "success": true,
  "data": [
    {
      "_id": "",
      "title": "History NCERT Book",
      "pdfUrl": "",
      "subject": "History",
      "class": "10th",
      "type": "NCERT Books"
    }
  ]
}
```

---

## Removed (old portal)

- ~~`GET /api/portal/free-resources/home`~~
- ~~`GET /api/portal/free-resources/categories`~~

---

## React flow

```text
Tab: Current Affairs
  → GET /current-affairs/filters
  → on filter change → GET /current-affairs/resources?...

Tab: Free Resources
  → GET /free-resources/filters  (Type + NCERT Subject/Class dropdowns)
  → on Type = PYQ / Study / Mock → GET /dynamic-filters?typeId= (SubCategory, Paper, Year, etc.)
  → GET /free-resources/resources?typeId=&subjectId=&classId=  (NCERT)
  → GET /free-resources/resources?typeId=&subCategoryId=&paperId=&yearId=  (PYQ)
```

Postman: `PORTAL_FREE_RESOURCES_POSTMAN_COLLECTION.json`
