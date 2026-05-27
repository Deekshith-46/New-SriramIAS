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
