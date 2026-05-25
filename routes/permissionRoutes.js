const express = require('express');
const router = express.Router();
const { allowRoles, ROLES } = require('../middleware/roleMiddleware');
const { validate, validations } = require('../middleware/validation');
const {
  getPermissionModuleConfig,
  getPermissionMatrix,
  getPermissionMatrixByRole,
  getMyPermissions,
  updateFeaturePermission,
  enableAllModulePermissions,
  restrictAllModulePermissions,
  resetModulePermissions
} = require('../controllers/permissionController');

const superAdmin = allowRoles(ROLES.SUPER_ADMIN);

router.get('/modules', superAdmin, getPermissionModuleConfig);
router.get('/my-access', getMyPermissions);
router.get('/role/:roleId', superAdmin, getPermissionMatrixByRole);
router.get('/', superAdmin, getPermissionMatrix);

router.patch(
  '/:permissionId/enable-all',
  superAdmin,
  enableAllModulePermissions
);
router.patch(
  '/:permissionId/restrict-all',
  superAdmin,
  restrictAllModulePermissions
);
router.patch('/:permissionId/reset', superAdmin, resetModulePermissions);
router.patch(
  '/:permissionId',
  superAdmin,
  validate(validations.updateFeaturePermission),
  updateFeaturePermission
);

module.exports = router;
