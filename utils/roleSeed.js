/**
 * Seeds default dynamic roles (Phase 1). Does not replace User.role enum yet.
 * Run from server.js on startup (optional).
 */
const Role = require('../models/Role');
const { createPermissionMatrixForRole } = require('./permissionHelpers');

const DEFAULT_ROLES = [
  { roleTitle: 'Super Admin', roleCode: 'SUPER_ADMIN', status: 'ACTIVE' },
  { roleTitle: 'Center Admin', roleCode: 'CENTER_ADMIN', status: 'ACTIVE' },
  { roleTitle: 'Employee', roleCode: 'EMPLOYEE', status: 'ACTIVE' }
];

const seedDefaultRoles = async () => {
  for (const row of DEFAULT_ROLES) {
    const exists = await Role.findOne({ roleCode: row.roleCode });
    if (!exists) {
      const role = await Role.create(row);
      await createPermissionMatrixForRole(role._id);
      console.log(`✓ Role seeded: ${row.roleCode}`);
    } else {
      await createPermissionMatrixForRole(exists._id);
    }
  }
};

module.exports = { seedDefaultRoles, DEFAULT_ROLES };
