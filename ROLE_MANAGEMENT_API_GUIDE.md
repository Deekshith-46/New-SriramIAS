# Role Management API Guide (Dynamic RBAC — Phase 1)

> **Base URL:** `http://localhost:5000`  
> **Auth:** Super Admin JWT only (`Authorization: Bearer <token>`)  
> **Prefix:** `/api/admin/roles`

---

## Overview

Dynamic **Role** records are the foundation for future RBAC (permissions, module access, sidebar, route guards).

| Phase | Status |
|-------|--------|
| **Phase 1** (this module) | Create / list / edit / hard-delete roles |
| Phase 2 | Map `User` / `Employee` → `roleId` |
| Phase 3 | `permissions[]` per module |
| Phase 4 | Dynamic route & UI ACL |

**Important:** Existing `User.role` enum (`super_admin`, `center_admin`, `employee`) is **unchanged** for login and middleware. Dynamic roles run in parallel until Phase 2.

On server start, three default roles are seeded if missing: `SUPER_ADMIN`, `CENTER_ADMIN`, `EMPLOYEE`.

---

## Files

| Layer | Path |
|-------|------|
| Model | `models/Role.js` |
| Helpers | `utils/roleHelpers.js` |
| Seed | `utils/roleSeed.js` |
| Controller | `controllers/roleController.js` |
| Routes | `routes/roleRoutes.js` → mounted on `routes/adminRoutes.js` |

---

## Role fields

| Field | Required | Notes |
|-------|----------|-------|
| `roleTitle` | Yes | Display name, e.g. "Counseling Admin" |
| `roleCode` | Yes | Unique, stored UPPERCASE, e.g. `COUNSELING_ADMIN` |
| `status` | No | `ACTIVE` (default) or `INACTIVE` |

---

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/roles` | List + search + filter + pagination |
| GET | `/api/admin/roles/dropdown` | Active roles for dropdowns |
| GET | `/api/admin/roles/:id` | Single role |
| POST | `/api/admin/roles` | Create |
| PUT | `/api/admin/roles/:id` | Update |
| PATCH | `/api/admin/roles/:id/status` | Activate / inactivate |
| DELETE | `/api/admin/roles/:id` | Hard delete (permanent) |

---

## List roles (table API)

```http
GET /api/admin/roles?page=1&limit=10&status=ALL&search=admin
Authorization: Bearer {{superAdminToken}}
```

### Query parameters

| Param | Values | Description |
|-------|--------|-------------|
| `search` | string | Matches `roleTitle` or `roleCode` (case-insensitive) |
| `status` | `ALL`, `ACTIVE`, `INACTIVE` | Filter |
| `page` | number | Default `1` |
| `limit` | number | Default `10`, max `100` |
| `sortBy` | `createdAt`, `roleTitle`, `roleCode`, `status` | Optional |
| `sortOrder` | `asc`, `desc` | Optional |

### Example response

```json
{
  "success": true,
  "total": 2,
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "count": 2,
  "data": [
    {
      "_id": "...",
      "roleTitle": "Counseling Admin",
      "roleCode": "COUNSELING_ADMIN",
      "status": "ACTIVE",
      "createdBy": "...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### Filter examples

```http
GET /api/admin/roles?status=ACTIVE
GET /api/admin/roles?status=INACTIVE
GET /api/admin/roles?search=counsel
```

---

## Create role

```http
POST /api/admin/roles
Content-Type: application/json
Authorization: Bearer {{superAdminToken}}
```

```json
{
  "roleTitle": "Counseling Admin",
  "roleCode": "COUNSELING_ADMIN",
  "status": "ACTIVE"
}
```

`roleCode` is auto-uppercased. Duplicate code → `400`.

---

## Update role

```http
PUT /api/admin/roles/:roleId
```

```json
{
  "roleTitle": "Senior Counseling Admin",
  "roleCode": "COUNSELING_ADMIN"
}
```

---

## Update status only

```http
PATCH /api/admin/roles/:roleId/status
```

```json
{
  "status": "INACTIVE"
}
```

---

## Delete role (hard)

```http
DELETE /api/admin/roles/:roleId
```

- Permanently removes the document from the database
- Default roles (`SUPER_ADMIN`, `CENTER_ADMIN`, `EMPLOYEE`) are re-created on next server start if missing (`utils/roleSeed.js`)

---

## Dropdown (active roles)

```http
GET /api/admin/roles/dropdown
```

```json
{
  "success": true,
  "count": 3,
  "data": [
    { "_id": "...", "roleTitle": "Center Admin", "roleCode": "CENTER_ADMIN" }
  ]
}
```

---

## Testing flow (Postman)

1. `POST /api/auth/login-super-admin` → set `superAdminToken`
2. `GET /api/admin/roles` → see seeded roles
3. `POST /api/admin/roles` → create custom role
4. `PATCH /api/admin/roles/:id/status` → deactivate
5. `DELETE /api/admin/roles/:id` → hard delete

Import collection: **`ROLE_MANAGEMENT_POSTMAN_COLLECTION.json`**

---

## Future extension (Phase 3+)

```javascript
permissions: [{
  module: String,
  canView: Boolean,
  canCreate: Boolean,
  canEdit: Boolean,
  canDelete: Boolean
}]
```

Do not add until frontend and `User.roleId` mapping are ready.

---

## Relation to static roles

| Static `User.role` | Dynamic `Role.roleCode` (seeded) |
|--------------------|----------------------------------|
| `super_admin` | `SUPER_ADMIN` |
| `center_admin` | `CENTER_ADMIN` |
| `employee` | `EMPLOYEE` |

Login and `allowRoles()` still use **static** `User.role` until Phase 2 migration.
