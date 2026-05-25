# Admin Access Management API Guide

> **Base URL:** `http://localhost:5000`  
> **Management APIs:** Super Admin JWT (`User` login via `/api/auth/login-super-admin`)  
> **Admin login:** `/api/auth/login-admin-access` (separate `AdminAccess` accounts)

---

## Architecture

```txt
Role  →  AdminAccess  →  Center
```

| Module | Path | Purpose |
|--------|------|---------|
| Centers | `/api/admin/centers` | Operational centers |
| Roles | `/api/admin/roles` | Dynamic roles |
| Admin Access | `/api/admin/admin-access` | Admin users + security settings |

**Important:** `AdminAccess` is separate from `User` (students/parents/legacy center admins). Static `User.role` is unchanged for existing flows.

---

## AdminAccess fields

| Field | Type | Notes |
|-------|------|-------|
| `fullName` | string | Required |
| `officialEmail` | string | Unique, login email |
| `contactNumber` | string | 10-digit Indian mobile |
| `employeeId` | string | Unique, uppercase |
| `roleId` | ObjectId | Active `Role` |
| `centerId` | ObjectId | Active `Center` |
| `password` / `confirmPassword` | string | Min 6 chars (create) |
| `accountStatus` | boolean | `true` = active |
| `twoFactorEnabled` | boolean | OTP after password |
| `loginAlertEnabled` | boolean | Email super admin on login |
| `sessionTimeout` | enum | `15_MINUTES` … `8_HOURS` |

Password is **never** returned in API responses.

---

## Management APIs (Super Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/admin-access` | List + unified search + filters |
| GET | `/api/admin/admin-access/:id` | Single admin |
| POST | `/api/admin/admin-access` | Create |
| PUT | `/api/admin/admin-access/:id` | Update (optional password) |
| PATCH | `/api/admin/admin-access/:id/status` | Enable / disable account |
| DELETE | `/api/admin/admin-access/:id` | Hard delete (permanent) |

### List query parameters

| Param | Values | Description |
|-------|--------|-------------|
| `search` | string | One box: matches **full name**, email, employee ID, **role** title/code, or **center** name/code |
| `status` | `ACTIVE`, `INACTIVE` | Account status filter |
| `roleId` | ObjectId | Optional exact role filter |
| `centerId` | ObjectId | Optional exact center filter |
| `page`, `limit` | number | Pagination |
| `sortBy` | `createdAt`, `fullName`, `officialEmail`, `employeeId` | Sort field |
| `sortOrder` | `asc`, `desc` | Sort direction |

#### Search example

```http
GET /api/admin/admin-access?search=hyderabad
GET /api/admin/admin-access?search=content
GET /api/admin/admin-access?search=center admin
```

### Create example

```http
POST /api/admin/admin-access
Authorization: Bearer {{superAdminToken}}
Content-Type: application/json
```

```json
{
  "fullName": "Content Admin",
  "officialEmail": "contentadmin@sriramias.com",
  "contactNumber": "9876543210",
  "employeeId": "EMP-CONTENT-01",
  "roleId": "{{roleId}}",
  "centerId": "{{centerId}}",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123",
  "accountStatus": true,
  "twoFactorEnabled": false,
  "loginAlertEnabled": true,
  "sessionTimeout": "1_HOUR"
}
```

### Update status

```http
PATCH /api/admin/admin-access/:id/status
```

```json
{
  "accountStatus": false
}
```

### Delete (hard)

Permanently removes the admin user from the database.

---

## Dropdowns (existing)

| Resource | Endpoint |
|----------|----------|
| Roles | `GET /api/admin/roles/dropdown` |
| Centers | `GET /api/admin/centers/dropdown` |

---

## Admin login flow

### Step 1 — Email + password

```http
POST /api/auth/login-admin-access
Content-Type: application/json
```

```json
{
  "officialEmail": "contentadmin@sriramias.com",
  "password": "SecurePass123"
}
```

**If 2FA disabled** — returns JWT immediately:

```json
{
  "success": true,
  "token": "...",
  "authType": "admin_access",
  "user": { ... }
}
```

**If 2FA enabled** — returns OTP challenge:

```json
{
  "success": true,
  "requiresOtp": true,
  "adminAccessId": "...",
  "message": "OTP sent to your official email"
}
```

### Step 2 — Verify OTP (2FA only)

```http
POST /api/auth/login-admin-access/verify-otp
```

```json
{
  "adminAccessId": "...",
  "otp": "123456"
}
```

### Login blocks

| Condition | Response |
|-----------|----------|
| `accountStatus: false` | 403 Account disabled |
| Role `INACTIVE` | 403 Assigned role is inactive |
| Center disabled/deleted | 403 Assigned center is not available |
| Wrong password | 401 Invalid credentials |

---

## Login alert email

When `loginAlertEnabled: true`, after successful login (post-OTP if 2FA):

- Email sent to `SUPER_ADMIN_ALERT_EMAIL` or `SUPER_ADMIN_EMAIL`
- Includes name, email, time, IP

Requires `EMAIL_USER` and `EMAIL_PASS` configured.

---

## Session timeout (JWT)

| Setting | JWT `expiresIn` |
|---------|-----------------|
| `15_MINUTES` | 15m |
| `30_MINUTES` | 30m |
| `1_HOUR` | 1h (default) |
| `2_HOURS` | 2h |
| `8_HOURS` | 8h |

Frontend should auto-logout based on `sessionTimeout` in user profile.

JWT payload includes `authType: "admin_access"` for middleware.

---

## Files

```txt
models/AdminAccess.js
controllers/adminAccessController.js
controllers/adminAuthController.js
routes/adminAccessRoutes.js
utils/adminAccessHelpers.js
utils/adminLoginAlert.js
utils/generateAdminToken.js
utils/sessionTimeoutMap.js
```

---

## Phased migration

| Phase | Status |
|-------|--------|
| 1 | Centers + Roles + AdminAccess CRUD |
| 2 | Map legacy `User` admins → `AdminAccess` |
| 3 | `permissions[]` on Role |
| 4 | Route + sidebar ACL |

---

## Postman

Import: **`ADMIN_ACCESS_POSTMAN_COLLECTION.json`**
