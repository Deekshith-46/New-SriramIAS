# Permission Matrix API Guide (Enterprise RBAC)

> **Base URL:** `http://localhost:5000`  
> **Prefix:** `/api/admin/permissions`  
> **Super Admin:** matrix edit APIs  
> **Any admin login:** `GET /my-access` for sidebar/routes

---

## Architecture

```txt
Role → PermissionMatrix (per module) → AdminAccess user
```

| Layer | File |
|-------|------|
| Module definitions | `config/permissionModules.js` |
| Stored permissions | `models/PermissionMatrix.js` |
| Auto-seed on role create | `utils/permissionHelpers.js` |
| API protection | `middleware/permissionMiddleware.js` |

**Super Admin** (`User.role === super_admin` or `roleCode === SUPER_ADMIN`) bypasses all permission checks.

---

## Auto matrix on new role

When you `POST /api/admin/roles`, the backend creates one `PermissionMatrix` row per module with all features `allowed: false`.

Existing roles are synced on server start.

---

## APIs

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/admin/permissions/modules` | Super Admin | Master module/feature config |
| GET | `/api/admin/permissions` | Super Admin | Full matrix (all roles) |
| GET | `/api/admin/permissions?search=center` | Super Admin | Filter roles by title/code |
| GET | `/api/admin/permissions/role/:roleId` | Super Admin | One role matrix |
| GET | `/api/admin/permissions/my-access` | Any auth | Allowed features for logged-in admin |
| PATCH | `/api/admin/permissions/:permissionId` | Super Admin | Toggle one feature |
| PATCH | `/api/admin/permissions/:permissionId/enable-all` | Super Admin | Allow all in module |
| PATCH | `/api/admin/permissions/:permissionId/restrict-all` | Super Admin | Deny all in module |
| PATCH | `/api/admin/permissions/:permissionId/reset` | Super Admin | Reset to default (all denied) |

`permissionId` = `_id` of a **module row** in PermissionMatrix (not role id).

---

## Matrix list response

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "role": {
        "_id": "...",
        "roleTitle": "Counseling Admin",
        "roleCode": "COUNSELING_ADMIN",
        "status": "ACTIVE"
      },
      "allowedCount": 5,
      "restrictedCount": 52,
      "totalFeatures": 57,
      "modules": [
        {
          "_id": "permissionMatrixDocId",
          "moduleKey": "ACADEMICS",
          "moduleTitle": "Academics",
          "allowedCount": 2,
          "restrictedCount": 8,
          "totalFeatures": 10,
          "permissions": [
            {
              "featureKey": "STUDENT_MANAGEMENT",
              "featureTitle": "Student Management",
              "allowed": true
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Toggle feature

```http
PATCH /api/admin/permissions/:permissionId
Authorization: Bearer {{superAdminToken}}
```

```json
{
  "featureKey": "STUDENT_MANAGEMENT",
  "allowed": true
}
```

---

## Protect an API route

```javascript
const { checkPermission } = require('../middleware/permissionMiddleware');

router.post(
  '/students',
  protect,
  checkPermission('ACADEMICS', 'STUDENT_MANAGEMENT'),
  createStudent
);
```

---

## Frontend (dynamic menus)

1. Super Admin edits matrix: `GET /api/admin/permissions`
2. Logged-in admin sidebar: `GET /api/admin/permissions/my-access`
3. Module catalog: `GET /api/admin/permissions/modules`

Do not hardcode sidebar items — render from `my-access` response.

---

## Modules (6)

| moduleKey | Title |
|-----------|-------|
| ACADEMICS | Academics |
| USERS_ACCESS | Users & Access |
| ENGAGEMENT_CRM | Engagement & CRM |
| CONTENT_MARKETING | Content & Marketing |
| OPERATIONS | Operations |
| SYSTEM_TOOLS | System Tools |

Feature keys are auto-generated: `Student Management` → `STUDENT_MANAGEMENT`.

---

## Postman

Import: **`PERMISSION_MATRIX_POSTMAN_COLLECTION.json`**
