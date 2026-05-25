const express = require('express');
const router = express.Router();
const { allowRoles, ROLES } = require('../middleware/roleMiddleware');
const { validate, validations } = require('../middleware/validation');
const {
  createAdminAccess,
  getAdminAccessList,
  getAdminAccessById,
  updateAdminAccess,
  updateAdminAccessStatus,
  deleteAdminAccess
} = require('../controllers/adminAccessController');

const superAdmin = allowRoles(ROLES.SUPER_ADMIN);

router.get('/', superAdmin, getAdminAccessList);
router.post('/', superAdmin, validate(validations.manageAdminAccessCreate), createAdminAccess);
router.get('/:id', superAdmin, getAdminAccessById);
router.put('/:id', superAdmin, validate(validations.manageAdminAccessUpdate), updateAdminAccess);
router.patch('/:id/status', superAdmin, validate(validations.manageAdminAccessStatus), updateAdminAccessStatus);
router.delete('/:id', superAdmin, deleteAdminAccess);

module.exports = router;
