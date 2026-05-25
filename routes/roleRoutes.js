const express = require('express');
const router = express.Router();
const { allowRoles, ROLES } = require('../middleware/roleMiddleware');
const { validate, validations } = require('../middleware/validation');
const {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  updateRoleStatus,
  deleteRole,
  getRolesDropdown
} = require('../controllers/roleController');

const superAdmin = allowRoles(ROLES.SUPER_ADMIN);

router.get('/dropdown', superAdmin, getRolesDropdown);

router.get('/', superAdmin, getRoles);
router.post('/', superAdmin, validate(validations.manageRoleCreate), createRole);
router.get('/:id', superAdmin, getRoleById);
router.put('/:id', superAdmin, validate(validations.manageRoleUpdate), updateRole);
router.patch('/:id/status', superAdmin, validate(validations.manageRoleStatus), updateRoleStatus);
router.delete('/:id', superAdmin, deleteRole);

module.exports = router;
