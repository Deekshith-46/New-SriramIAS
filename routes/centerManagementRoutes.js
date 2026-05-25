const express = require('express');
const router = express.Router();
const { allowRoles, ROLES } = require('../middleware/roleMiddleware');
const { validate, validations } = require('../middleware/validation');
const {
  createCenter,
  getCenters,
  getCenterById,
  updateCenter,
  updateCenterStatus,
  deleteCenter,
  getCentersDropdown
} = require('../controllers/centerManagementController');

const superAdmin = allowRoles(ROLES.SUPER_ADMIN);

router.get('/dropdown', superAdmin, getCentersDropdown);

router.get('/', superAdmin, getCenters);
router.post('/', superAdmin, validate(validations.manageCenterCreate), createCenter);
router.get('/:id', superAdmin, getCenterById);
router.put('/:id', superAdmin, validate(validations.manageCenterUpdate), updateCenter);
router.patch('/:id/status', superAdmin, validate(validations.manageCenterStatus), updateCenterStatus);
router.delete('/:id', superAdmin, deleteCenter);

module.exports = router;
