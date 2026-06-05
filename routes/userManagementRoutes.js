const express = require('express');
const router = express.Router();
const { allowRoles, ROLES } = require('../middleware/roleMiddleware');
const {
  getModuleConfig,
  getUnifiedUsers,
  createUnifiedUser,
  getUpdateFields,
  getSingleUser,
  updateUnifiedUser,
  deleteUnifiedUser
} = require('../controllers/userManagementController');
const { validate, validations } = require('../middleware/validation');
const { sanitizeStudentCreatePayload } = require('../utils/userManagementStudentModule');

const superAdmin = allowRoles(ROLES.SUPER_ADMIN);

const prepareStudentCreate = (req, res, next) => {
  req.body = sanitizeStudentCreatePayload(req.body);
  req.body.userType = 'STUDENT';
  next();
};

router.get('/module-config', superAdmin, getModuleConfig);
router.get('/update-fields', superAdmin, getUpdateFields);
router.get('/', superAdmin, getUnifiedUsers);
router.post(
  '/',
  superAdmin,
  prepareStudentCreate,
  validate(validations.createUnifiedUserStudent),
  createUnifiedUser
);
router.get('/:id', superAdmin, getSingleUser);
router.put('/:id', superAdmin, updateUnifiedUser);
router.delete('/:id', superAdmin, deleteUnifiedUser);

module.exports = router;
