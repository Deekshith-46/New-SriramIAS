# Unified User Management — Complete API & Code Guide

> **Auth:** Super Admin JWT (`POST /api/auth/login-super-admin`)  
> **Prefix:** `/api/admin`  
> **Postman:** `USER_MANAGEMENT_POSTMAN_COLLECTION.json`

---

## Student Management module (Users & Access change request)

**List Users** screen is now a **Student Management** module for mutations:

| Action | Scope |
|--------|--------|
| List | All users (Student, Faculty, Employee, Admin, Super Admin, …) |
| View | All users |
| Create | **Student only** — `role` / `userType` / `roleId` in body are **ignored** |
| Edit | **Student only** — non-students return **403** |
| Delete | **Student only** — non-students return **403** |

- `GET /api/admin/users/module-config` — frontend integration metadata
- List rows include `permissions: { canView, canEdit, canDelete, editDisabledReason, deleteDisabledReason }`
- Create other roles: use **Admin Access** (`/api/admin/admin-access`) or **Role Management**, not List Users

---

## 1. Architecture (final)

```txt
STUDENT (platform role, NOT from Role Management)
  User (role=student) + Student (+ Parent link when parent account exists)

ALL OTHER ROLES (dynamic from Role Management)
  AdminAccess + Role

GET /api/admin/users → students + admins merged (parents NEVER listed separately)
```

| userType | MongoDB | Shown as |
|----------|---------|----------|
| `USER` | `User` + `Student` | Student only (`role=student`) |
| `ADMIN` | `AdminAccess` | Center Admin, Content Admin, Employee, … |

**Role filter:** `ALL` \| `STUDENT` \| `<Role._id>` — Student is outside Role Management.

**Create:** `POST /api/admin/users` — always creates **STUDENT** (no role dropdown). Optional `userType: "STUDENT"`; admin role ids are discarded.

---

## 2. File structure

```txt
controllers/userManagementController.js
routes/userManagementRoutes.js
utils/userManagementHelpers.js
utils/userManagementFields.js
utils/userManagementUpdate.js
utils/userManagementCreate.js
utils/userManagementStudentModule.js   (permissions, sanitize create, module config)
routes/adminRoutes.js          (registers routes)
```

---

## 3. API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | Unified list (all roles; includes `permissions` per row) |
| GET | `/api/admin/users/module-config` | Student Management module rules for frontend |
| POST | `/api/admin/users` | **Create student only** (incoming role ignored) |
| GET | `/api/admin/users/update-fields?type=USER\|ADMIN` | PUT fields; `editable: false` for ADMIN |
| GET | `/api/admin/user-roles` | **List filter** roles: ALL + STUDENT + dynamic |
| GET | `/api/admin/user-create-roles` | **Create Student** — returns STUDENT only (`roleSelectionEnabled: false`) |
| DELETE | `/api/admin/users/:id` | **Students only**; 403 for admins |
| GET | `/api/admin/user-centers` | Center filter: ALL + active centers |
| GET | `/api/admin/users/:id?type=USER\|ADMIN` | View one user (`recordType` from list row) |
| PUT | `/api/admin/users/:id?type=USER\|ADMIN` | Update student or admin |
| GET | `/api/admin/centers/dropdown` | Center filter dropdown |
| GET | `/api/admin/legacy-users` | Old staff list (deprecated) |

---

## 4. List API

```http
GET /api/admin/users?search=rahul&role=ALL&center=ALL&status=ACTIVE&userType=ALL&page=1&limit=10
Authorization: Bearer <superAdminToken>
```

| Query | Description |
|-------|-------------|
| `search` | Name, email, phone; role title for admins |
| `role` | `ALL`, `STUDENT`, or Role `_id` from `/api/admin/user-roles` |
| `center` | `ALL` or Center `_id` (alias: `centerId`) — filters students by `User.center` and admins by `AdminAccess.centerId` |
| `status` | `ACTIVE` or `INACTIVE` |
| `recordType` | `USER`, `ADMIN`, `STUDENT`, or `ALL` (collection filter; alias: `userType` query) |
| `page`, `limit` | Pagination (merge then slice) |
| `sortBy` | `createdAt`, `fullName`, `email`, `role`, `status` |
| `sortOrder` | `asc`, `desc` |

### Student row

```json
{
  "id": "USER_ID",
  "fullName": "Arjun Mehta",
  "email": "arjun@gmail.com",
  "phoneNumber": "9876543210",
  "role": "Student",
  "roleType": "STUDENT",
  "center": "Hyderabad",
  "status": "ACTIVE",
  "userType": "STUDENT",
  "recordType": "USER",
  "joinedDate": "2026-05-25",
  "studentDetails": {
    "parentName": "Rajesh Mehta",
    "parentEmail": "parent@gmail.com",
    "parentMobile": "9876543211"
  }
}
```

### Admin row

```json
{
  "id": "ADMIN_ACCESS_ID",
  "fullName": "Hyderabad Center Admin",
  "email": "admin@sriramias.com",
  "phoneNumber": "9876543210",
  "role": "Center Admin",
  "roleType": "ADMIN",
  "roleId": "ROLE_ID",
  "center": "Hyderabad",
  "status": "ACTIVE",
  "userType": "CONTENT_ADMIN",
  "recordType": "ADMIN",
  "joinedDate": "2026-05-25"
}
```

---

## 5. Role dropdowns

### List Users filter (includes ALL)

```http
GET /api/admin/user-roles
```

Includes **All Roles**, **Student**, plus dynamic roles:

### Create User form (no ALL, no ADMIN)

```http
GET /api/admin/user-create-roles
Authorization: Bearer <superAdminToken>
```

```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "value": "STUDENT",
      "label": "Student",
      "roleCode": "STUDENT",
      "kind": "STUDENT"
    },
    {
      "value": "6a13ebf453c8354ba8bfbd44",
      "label": "Content Admin",
      "roleCode": "CONTENT_ADMIN",
      "status": "ACTIVE",
      "kind": "ADMIN_ACCESS"
    }
  ]
}
```

Use `value` as `userType` in `POST /api/admin/users`.  
`kind: STUDENT` → student form; `kind: ADMIN_ACCESS` → admin form.

Only **ACTIVE** roles from Role Management are included.

---

### List filter response (`user-roles`)

Includes **Student** (platform) plus dynamic Role Management roles:

```json
{
  "success": true,
  "count": 8,
  "data": [
    { "value": "ALL", "label": "All Roles" },
    { "value": "STUDENT", "label": "Student", "roleCode": "STUDENT" },
    { "value": "6a13ebf4...", "label": "Content Admin", "roleCode": "CONTENT_ADMIN", "status": "ACTIVE" }
  ]
}
```

**Filter logic:** `role=STUDENT` → only `User(role=student)`; `role=<Role._id>` → only `AdminAccess` with that `roleId`.

---

## 5b. Center dropdown (List Users filter)

```http
GET /api/admin/user-centers
Authorization: Bearer <superAdminToken>
```

```json
{
  "success": true,
  "count": 4,
  "data": [
    { "value": "ALL", "label": "All Centers" },
    {
      "value": "674abc...",
      "label": "Hyderabad Center",
      "centerCode": "HYD01",
      "city": "Hyderabad",
      "state": "Telangana"
    }
  ]
}
```

**List filter:** pass selected `value` as query param on list API:

```http
GET /api/admin/users?center=674abc...&role=ALL&page=1&limit=10
```

Or use alias:

```http
GET /api/admin/users?centerId=674abc...
```

When `center=ALL` or omitted → no center filter (all centers).

**Combine filters:**

```http
GET /api/admin/users?role=STUDENT&center=674abc...&status=ACTIVE&search=rahul
```

---

## 6. Create user (unified)

```http
POST /api/admin/users
Authorization: Bearer <superAdminToken>
```

### Student body

```json
{
  "userType": "STUDENT",
  "fullName": "Arjun Mehta",
  "email": "arjun@gmail.com",
  "mobile": "9876543210",
  "parentName": "Rajesh Mehta",
  "parentEmail": "parent@gmail.com",
  "parentMobile": "9876543211",
  "centerId": "CENTER_OBJECT_ID",
  "status": true
}
```

Saves to `User` + `Student`. Gmail required for email.

### Admin body (any dynamic role from user-roles)

`userType` = **Role `_id`** from dropdown (e.g. Content Admin `6a13ebf453c8354ba8bfbd44`). **Do not** send `"ADMIN"`.

```json
{
  "userType": "6a13ebf453c8354ba8bfbd44",
  "fullName": "Hyderabad Center Admin",
  "officialEmail": "admin@gmail.com",
  "contactNumber": "9876543210",
  "employeeId": "EMP001",
  "centerId": "CENTER_OBJECT_ID",
  "password": "123456",
  "confirmPassword": "123456",
  "accountStatus": true
}
```

Saves to `AdminAccess` with `roleId = userType`. Optional legacy: send separate `roleId` if it matches `userType`.

**Response fields (do not confuse):**

| Field | Meaning |
|-------|---------|
| `createRoleValue` | What you sent in POST `userType` (Role `_id` or `STUDENT`) |
| `selectedRole` | Human-readable role from create dropdown |
| `userType` | Role code: `STUDENT`, `SUPER_ADMIN`, `CONTENT_ADMIN`, `CENTER_ADMIN`, etc. |
| `recordType` | `USER` or `ADMIN` — use for `GET/PUT ...?type=` (which collection) |
| `summary.role` | Display label e.g. `"Content Admin"` |

Example after creating Super Admin staff: `"userType": "SUPER_ADMIN"`, `"recordType": "ADMIN"`.

**Frontend:**

```javascript
if (selectedRole === 'STUDENT') {
  POST { userType: 'STUDENT', fullName, email, mobile, centerId, ... };
} else if (selectedRole !== 'ALL') {
  POST { userType: selectedRole, fullName, officialEmail, employeeId, centerId, password, ... };
}
```

---

## 7. All PUT fields (frontend comments)

```http
GET /api/admin/users/update-fields?type=USER
GET /api/admin/users/update-fields?type=ADMIN
```

Send **only fields you want to change** on PUT.

### `type=ADMIN` (AdminAccess)

| Field | Type |
|-------|------|
| `fullName` | string |
| `officialEmail` | string |
| `contactNumber` | string |
| `employeeId` | string |
| `roleId` | ObjectId |
| `centerId` | ObjectId |
| `password` | string |
| `confirmPassword` | string |
| `accountStatus` | boolean |
| `twoFactorEnabled` | boolean |
| `loginAlertEnabled` | boolean |
| `sessionTimeout` | `15_MINUTES` \| `30_MINUTES` \| `1_HOUR` \| `2_HOURS` \| `8_HOURS` |
| `lastLoginAt` | date \| null |

**Read-only:** `_id`, `createdBy`, `createdAt`, `updatedAt`

### `type=USER` (Student only)

Unified management supports **only** `User` rows with `role=student`. Parents are not listed or edited here.

| Field | Aliases |
|-------|---------|
| `name` | `fullName` |
| `email` | Gmail for students |
| `mobile` | `phoneNumber`, `contactNumber` |
| `password` + `confirmPassword` | |
| `centerId` | `center` |
| `isActive` | `accountStatus`, `status` |

**Student profile** (same PUT body):

| Field | Type |
|-------|------|
| `parentName` | string |
| `parentMobile` | string |
| `parentEmail` | string |
| `parentMobileVerified` | boolean |
| `parentEmailVerified` | boolean |

---

## 8. Update examples

```http
PUT /api/admin/users/:id?type=USER
```

```json
{
  "name": "Rahul Kumar",
  "email": "rahul@gmail.com",
  "mobile": "9876543210",
  "centerId": "674abc...",
  "isActive": true,
  "parentName": "Parent Name",
  "parentEmail": "parent@gmail.com",
  "parentMobile": "9876543211"
}
```

```http
PUT /api/admin/users/:id?type=ADMIN
```

```json
{
  "fullName": "Content Admin",
  "officialEmail": "content@sriramias.com",
  "contactNumber": "9876543210",
  "employeeId": "EMP-001",
  "roleId": "6a13ebf4...",
  "centerId": "674center...",
  "accountStatus": true,
  "twoFactorEnabled": true,
  "sessionTimeout": "2_HOURS"
}
```

---

## 9. Route registration (`routes/adminRoutes.js`)

```javascript
const userManagementRoutes = require('./userManagementRoutes');
const { getUserRoles } = require('../controllers/userManagementController');

router.get('/user-roles', allowRoles(ROLES.SUPER_ADMIN), getUserRoles);
router.get('/user-centers', allowRoles(ROLES.SUPER_ADMIN), getUserCenters);
router.use('/users', userManagementRoutes);

/** @deprecated — use GET /api/admin/users */
router.get('/legacy-users', allowRoles(ROLES.SUPER_ADMIN, ROLES.CENTER_ADMIN), getUsers);
```

---

## 10. Complete source code (current)

### `routes/userManagementRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { allowRoles, ROLES } = require('../middleware/roleMiddleware');
const {
  getUnifiedUsers,
  createUnifiedUser,
  getUpdateFields,
  getSingleUser,
  updateUnifiedUser
} = require('../controllers/userManagementController');
const { validate, validations } = require('../middleware/validation');

const superAdmin = allowRoles(ROLES.SUPER_ADMIN);

const validateCreateUser = (req, res, next) => {
  const { userType } = req.body || {};
  if (userType === 'STUDENT') {
    return validate(validations.createUnifiedUserStudent)(req, res, next);
  }
  if (userType === 'ADMIN') {
    return validate(validations.createUnifiedUserAdmin)(req, res, next);
  }
  return res.status(400).json({
    success: false,
    message: 'userType is required and must be STUDENT or ADMIN'
  });
};

router.get('/update-fields', superAdmin, getUpdateFields);
router.get('/', superAdmin, getUnifiedUsers);
router.post('/', superAdmin, validateCreateUser, createUnifiedUser);
router.get('/:id', superAdmin, getSingleUser);
router.put('/:id', superAdmin, updateUnifiedUser);

module.exports = router;
```

---

### `utils/userManagementFields.js`

```javascript
/**
 * Field catalog for PUT /api/admin/users/:id — use in frontend comments.
 */

const ADMIN_ACCESS_UPDATABLE_FIELDS = [
  { field: 'fullName', type: 'string', description: 'Display name' },
  { field: 'officialEmail', type: 'string', description: 'Login email (unique)' },
  { field: 'contactNumber', type: 'string', description: '10-digit mobile' },
  { field: 'employeeId', type: 'string', description: 'Unique employee ID (uppercase)' },
  { field: 'roleId', type: 'ObjectId', description: 'Dynamic role from Role Management' },
  { field: 'centerId', type: 'ObjectId', description: 'Operational center _id' },
  { field: 'password', type: 'string', description: 'New password (min 6); use with confirmPassword' },
  { field: 'confirmPassword', type: 'string', description: 'Must match password when changing password' },
  { field: 'accountStatus', type: 'boolean', description: 'true = active, false = disabled' },
  { field: 'twoFactorEnabled', type: 'boolean', description: 'Enable OTP after password login' },
  { field: 'loginAlertEnabled', type: 'boolean', description: 'Email super admin on login' },
  {
    field: 'sessionTimeout',
    type: 'enum',
    values: ['15_MINUTES', '30_MINUTES', '1_HOUR', '2_HOURS', '8_HOURS'],
    description: 'JWT session length'
  },
  { field: 'lastLoginAt', type: 'date|null', description: 'ISO date or null to clear' }
];

const USER_ACCOUNT_UPDATABLE_FIELDS = [
  { field: 'name', type: 'string', description: 'Full name (alias: fullName)' },
  { field: 'fullName', type: 'string', description: 'Same as name' },
  { field: 'email', type: 'string', description: 'Email (unique)' },
  { field: 'mobile', type: 'string', description: 'Phone (alias: phoneNumber, contactNumber)' },
  { field: 'phoneNumber', type: 'string', description: 'Same as mobile' },
  { field: 'contactNumber', type: 'string', description: 'Same as mobile' },
  { field: 'password', type: 'string', description: 'New password; use with confirmPassword' },
  { field: 'confirmPassword', type: 'string', description: 'Must match password' },
  {
    field: 'role',
    type: 'enum',
    values: ['student', 'parent', 'employee', 'center_admin', 'super_admin'],
    description: 'Platform user role'
  },
  { field: 'centerId', type: 'ObjectId', description: 'Center _id (sets User.center)' },
  { field: 'center', type: 'ObjectId', description: 'Alias for centerId' },
  {
    field: 'location',
    type: 'enum',
    values: ['Hyderabad', 'New Delhi', 'Pune'],
    description: 'Legacy location (optional if centerId set)'
  },
  { field: 'isActive', type: 'boolean', description: 'Account active flag' },
  { field: 'accountStatus', type: 'boolean', description: 'Alias: maps to isActive' }
];

const STUDENT_PROFILE_UPDATABLE_FIELDS = [
  { field: 'parentName', type: 'string', description: 'Parent / guardian name' },
  { field: 'parentMobile', type: 'string', description: 'Parent mobile (unique)' },
  { field: 'parentEmail', type: 'string', description: 'Parent email (unique)' },
  { field: 'parentMobileVerified', type: 'boolean', description: 'Parent mobile verified flag' },
  { field: 'parentEmailVerified', type: 'boolean', description: 'Parent email verified flag' }
];

const EMPLOYEE_PROFILE_UPDATABLE_FIELDS = [
  { field: 'permissions', type: 'string[]', description: 'Permission strings array' },
  {
    field: 'center',
    type: 'enum',
    values: ['Hyderabad', 'New Delhi', 'Pune'],
    description: 'Employee center label (legacy)'
  },
  { field: 'employeeCenter', type: 'string', description: 'Alias for employee profile center' }
];

const READ_ONLY_FIELDS = {
  ADMIN: ['_id', 'createdBy', 'createdAt', 'updatedAt'],
  USER: ['_id', 'createdAt', 'updatedAt']
};

const getUpdatableFieldsForType = (type) => {
  if (type === 'ADMIN') {
    return {
      userType: 'ADMIN',
      account: ADMIN_ACCESS_UPDATABLE_FIELDS,
      readOnly: READ_ONLY_FIELDS.ADMIN
    };
  }

  return {
    userType: 'USER',
    account: USER_ACCOUNT_UPDATABLE_FIELDS,
    studentProfile: STUDENT_PROFILE_UPDATABLE_FIELDS,
    employeeProfile: EMPLOYEE_PROFILE_UPDATABLE_FIELDS,
    readOnly: READ_ONLY_FIELDS.USER,
    notes: [
      'studentProfile fields apply when user.role is student',
      'employeeProfile fields apply when user.role is employee'
    ]
  };
};

module.exports = {
  ADMIN_ACCESS_UPDATABLE_FIELDS,
  USER_ACCOUNT_UPDATABLE_FIELDS,
  STUDENT_PROFILE_UPDATABLE_FIELDS,
  EMPLOYEE_PROFILE_UPDATABLE_FIELDS,
  getUpdatableFieldsForType
};
```

---

### `utils/userManagementUpdate.js`

```javascript
const Center = require('../models/Center');
const Role = require('../models/Role');
const Student = require('../models/Student');
const Employee = require('../models/Employee');
const { SESSION_TIMEOUTS } = require('../models/AdminAccess');

const applyAdminAccessUpdate = async (admin, body) => {
  const {
    fullName,
    officialEmail,
    contactNumber,
    employeeId,
    roleId,
    centerId,
    password,
    confirmPassword,
    accountStatus,
    twoFactorEnabled,
    loginAlertEnabled,
    sessionTimeout,
    lastLoginAt
  } = body;

  if (password !== undefined) {
    if (password !== confirmPassword) {
      const err = new Error('Passwords do not match');
      err.statusCode = 400;
      throw err;
    }
    if (String(password).length < 6) {
      const err = new Error('Password must be at least 6 characters');
      err.statusCode = 400;
      throw err;
    }
    admin.password = password;
  }

  if (fullName !== undefined) admin.fullName = String(fullName).trim();
  if (officialEmail !== undefined) admin.officialEmail = String(officialEmail).toLowerCase().trim();
  if (contactNumber !== undefined) admin.contactNumber = String(contactNumber).trim();
  if (employeeId !== undefined) admin.employeeId = String(employeeId).toUpperCase().trim();

  if (accountStatus !== undefined) admin.accountStatus = !!accountStatus;
  if (twoFactorEnabled !== undefined) admin.twoFactorEnabled = !!twoFactorEnabled;
  if (loginAlertEnabled !== undefined) admin.loginAlertEnabled = !!loginAlertEnabled;

  if (sessionTimeout !== undefined) {
    if (!SESSION_TIMEOUTS.includes(sessionTimeout)) {
      const err = new Error(`sessionTimeout must be one of: ${SESSION_TIMEOUTS.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    admin.sessionTimeout = sessionTimeout;
  }

  if (lastLoginAt !== undefined) {
    admin.lastLoginAt = lastLoginAt === null || lastLoginAt === '' ? null : new Date(lastLoginAt);
  }

  if (roleId !== undefined) {
    const role = await Role.findById(roleId);
    if (!role) {
      const err = new Error('Role not found');
      err.statusCode = 404;
      throw err;
    }
    if (role.status === 'INACTIVE') {
      const err = new Error('Cannot assign an inactive role');
      err.statusCode = 400;
      throw err;
    }
    admin.roleId = roleId;
  }

  if (centerId !== undefined) {
    const center = await Center.findOne({ _id: centerId, isDeleted: false });
    if (!center) {
      const err = new Error('Center not found');
      err.statusCode = 404;
      throw err;
    }
    admin.centerId = centerId;
  }
};

const applyUserAccountUpdate = async (user, body) => {
  const name = body.name ?? body.fullName;
  const mobile = body.mobile ?? body.phoneNumber ?? body.contactNumber;
  const active = body.isActive ?? body.accountStatus;
  const centerRef = body.centerId ?? body.center;

  const { email, password, confirmPassword, role, location } = body;

  if (password !== undefined) {
    if (password !== confirmPassword) {
      const err = new Error('Passwords do not match');
      err.statusCode = 400;
      throw err;
    }
    if (String(password).length < 6) {
      const err = new Error('Password must be at least 6 characters');
      err.statusCode = 400;
      throw err;
    }
    user.password = password;
  }

  if (name !== undefined) user.name = String(name).trim();
  if (email !== undefined) user.email = String(email).toLowerCase().trim();
  if (mobile !== undefined) user.mobile = String(mobile).trim();
  if (active !== undefined) user.isActive = !!active;

  if (role !== undefined) {
    const allowed = ['super_admin', 'center_admin', 'employee', 'student', 'parent'];
    if (!allowed.includes(role)) {
      const err = new Error(`role must be one of: ${allowed.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    user.role = role;
  }

  if (location !== undefined) {
    const allowedLoc = ['Hyderabad', 'New Delhi', 'Pune'];
    if (location !== null && location !== '' && !allowedLoc.includes(location)) {
      const err = new Error(`location must be one of: ${allowedLoc.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    user.location = location || undefined;
  }

  if (centerRef !== undefined) {
    if (centerRef === null || centerRef === '') {
      user.center = null;
    } else {
      const center = await Center.findOne({ _id: centerRef, isDeleted: false });
      if (!center) {
        const err = new Error('Center not found');
        err.statusCode = 404;
        throw err;
      }
      user.center = centerRef;
      if (center.city && !body.location) {
        user.location = center.city;
      }
    }
  }
};

const applyStudentProfileUpdate = async (userId, body) => {
  const {
    parentName,
    parentMobile,
    parentEmail,
    parentMobileVerified,
    parentEmailVerified
  } = body;

  const hasStudentFields = [
    parentName,
    parentMobile,
    parentEmail,
    parentMobileVerified,
    parentEmailVerified
  ].some((v) => v !== undefined);

  if (!hasStudentFields) return null;

  let student = await Student.findOne({ userId });
  if (!student) {
    student = await Student.create({ userId });
  }

  if (parentName !== undefined) student.parentName = String(parentName).trim();
  if (parentMobile !== undefined) student.parentMobile = String(parentMobile).trim();
  if (parentEmail !== undefined) {
    student.parentEmail = String(parentEmail).toLowerCase().trim();
    if (body.parentEmailVerified === undefined) {
      student.parentEmailVerified = false;
    }
  }
  if (parentMobileVerified !== undefined) {
    student.parentMobileVerified = !!parentMobileVerified;
  }
  if (parentEmailVerified !== undefined) {
    student.parentEmailVerified = !!parentEmailVerified;
  }

  await student.save();
  return student;
};

const applyEmployeeProfileUpdate = async (userId, body) => {
  const permissions = body.permissions ?? body.employeePermissions;
  const empCenter = body.employeeCenter ?? body.center;

  if (permissions === undefined && empCenter === undefined) return null;

  let employee = await Employee.findOne({ userId });
  if (!employee) {
    employee = await Employee.create({ userId });
  }

  if (permissions !== undefined) {
    employee.permissions = Array.isArray(permissions) ? permissions : [];
  }

  if (empCenter !== undefined) {
    const allowed = ['Hyderabad', 'New Delhi', 'Pune'];
    if (empCenter !== null && empCenter !== '' && !allowed.includes(empCenter)) {
      const err = new Error(`employee center must be one of: ${allowed.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    employee.center = empCenter || undefined;
  }

  await employee.save();
  return employee;
};

module.exports = {
  applyAdminAccessUpdate,
  applyUserAccountUpdate,
  applyStudentProfileUpdate,
  applyEmployeeProfileUpdate
};
```

---

> **Note:** Current source for helpers, create, and controller is in repository files.

---

## 11. Postman collection

Import **USER_MANAGEMENT_POSTMAN_COLLECTION.json** (updated).

| Folder | Requests |
|--------|----------|
| 1. Auth | Login Super Admin |
| 2. Dropdowns | User Roles, User Centers |
| 3. List | ALL, STUDENT, RoleId, center filter, ADMIN, search |
| 4. Create | POST Student, POST Admin |
| 5. View/Edit | Fields, GET, PUT |

---

## 12. Frontend flow

1. user-roles + user-centers 2. GET users (role, center, status, search) 3. POST users 4. GET/PUT by id

---

## 13. Notes

- Parents only in studentDetails. STUDENT in role dropdown. Center filter via user-centers + center/centerId on list. POST create unified.
