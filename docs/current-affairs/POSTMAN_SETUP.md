# Current Affairs CMS — Postman Setup Guide

Complete Postman setup for testing `/api/current-affairs` APIs.

## Files to import

| File | Purpose |
|------|---------|
| `CURRENT_AFFAIRS_POSTMAN_COLLECTION.json` | All API requests |
| `CURRENT_AFFAIRS_POSTMAN_ENVIRONMENT.json` | Local dev variables |
| `CURRENT_AFFAIRS_POSTMAN_ENVIRONMENT_PRODUCTION.json` | Production template |

Both live in the **project root** and in `docs/current-affairs/`.

---

## Step 1 — Import into Postman

1. Open **Postman**.
2. Click **Import** (top left).
3. Drag all three JSON files, or browse and select them.
4. Confirm import.

You should see:

- Collection: **Sriram IAS - Current Affairs CMS**
- Environments: **Sriram IAS - Current Affairs (Local)** and **(Production)**

---

## Step 2 — Select environment

1. Top-right dropdown → choose **Sriram IAS - Current Affairs (Local)**.
2. Click the **eye icon** → **Edit** to set variables.

### Required variables (Local)

| Variable | Default | Set to |
|----------|---------|--------|
| `baseUrl` | `http://localhost:5000` | Your server URL |
| `superAdminEmail` | `admin@sriram.com` | Value from `.env` → `SUPER_ADMIN_EMAIL` |
| `superAdminPassword` | `admin123` | Value from `.env` → `SUPER_ADMIN_PASSWORD` |

### Auto-filled by scripts (do not set manually)

| Variable | Set by |
|----------|--------|
| `authToken` | Login requests |
| `currentAffairId` | Create / Get All requests |

### Optional variables

| Variable | Use |
|----------|-----|
| `year` | Default `2025` for create requests |
| `month` | Default `June` |
| `category` | Default filter for Get All |
| `centerAdminEmail` / `centerAdminPassword` | Center admin login |
| `adminAccessEmail` / `adminAccessPassword` | Dynamic admin login |

---

## Step 3 — Start the backend

```bash
npm run dev
```

Verify:

```
GET http://localhost:5000/api/health
```

Or run **0. Setup → Health Check** in Postman.

---

## Step 4 — Login and get token

1. Open **1. Auth → Login Super Admin**.
2. Click **Send**.
3. Tests tab should pass; `authToken` is saved to the environment automatically.

Collection auth is pre-configured as **Bearer {{authToken}}** for protected routes.

---

## Step 5 — Test create flow

1. Open **2. Create → Create - Monthly Magazine**.
2. In **Body → form-data**, click **pdf** → **Select Files** → choose any PDF under 10 MB.
3. Click **Send**.
4. On success (201), `currentAffairId` is saved automatically.

Repeat for other categories in folder **2. Create**.

---

## Step 6 — Full test sequence (recommended order)

Run in this order for an end-to-end check:

```
0. Setup        → Health Check
1. Auth         → Login Super Admin
2. Create       → Create - Monthly Magazine   (attach PDF)
3. Read         → Get All (paginated + filters)
3. Read         → Get By ID
4. Update       → Update (text only, keep PDF)
4. Update       → Update Status - Disable
4. Update       → Update Status - Enable
5. Delete       → Delete (Soft)
5. Delete       → Get By ID (after delete - expect 404)
```

---

## Request reference

### Create (multipart/form-data)

```
POST {{baseUrl}}/api/current-affairs
Authorization: Bearer {{authToken}}
```

**Monthly Magazine**

| Key | Value |
|-----|-------|
| category | MONTHLY_MAGAZINE |
| magazineName | Vision IAS June Edition |
| year | 2025 |
| month | June |
| pdf | [file] |

**Infographics**

| Key | Value |
|-----|-------|
| category | INFOGRAPHICS |
| title | Economy Infographics |
| year | 2025 |
| month | June |
| pdf | [file] |

**Current Affairs**

| Key | Value |
|-----|-------|
| category | CURRENT_AFFAIRS |
| title | Union Budget Highlights |
| year | 2025 |
| month | June |
| description | Daily summary... |
| pdf | optional |

### Get all

```
GET {{baseUrl}}/api/current-affairs?page=1&limit=10&category=MONTHLY_MAGAZINE&year=2025&month=June&search=budget&status=true
```

### Update status

```
PATCH {{baseUrl}}/api/current-affairs/{{currentAffairId}}/status
Content-Type: application/json

{ "status": false }
```

---

## Sample responses (in collection)

Each main request includes saved **Examples** in Postman (right panel → Examples):

- 201 Created
- 200 Paginated list
- 400 Validation error
- 200 Status updated

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 401 Unauthorized | Run **Login Super Admin** again; check `authToken` in environment |
| 400 PDF required | Attach a file to the `pdf` field for MONTHLY_MAGAZINE / INFOGRAPHICS / MONTHLY_RECAP |
| 400 File size | PDF must be ≤ 10 MB |
| 400 Only PDF allowed | Upload `.pdf` only, not images |
| 404 on Get By ID | Run a create first, or copy `_id` from Get All into `currentAffairId` |
| Connection refused | Start server with `npm run dev`; confirm `baseUrl` and port |

---

## Swagger (alternative to Postman)

```
http://localhost:5000/api-docs
```

---

## Production environment

1. Import `CURRENT_AFFAIRS_POSTMAN_ENVIRONMENT_PRODUCTION.json`.
2. Set `baseUrl` to your deployed API URL.
3. Set admin credentials (never commit real passwords to git).
