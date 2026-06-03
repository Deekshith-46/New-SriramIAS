const express = require('express');
const router = express.Router();
const { allowRoles, ROLES } = require('../middleware/roleMiddleware');
const {
  getUnifiedUsers,
  createUnifiedUser,
  getUpdateFields,
  getSingleUser,
  updateUnifiedUser,
  deleteUnifiedUser
} = require('../controllers/userManagementController');
const { validate, validations } = require('../middleware/validation');

const superAdmin = allowRoles(ROLES.SUPER_ADMIN);

const isAdminRoleUserType = (userType) =>
  typeof userType === 'string' &&
  userType !== 'STUDENT' &&
  userType !== 'ALL' &&
  /^[a-f0-9]{24}$/i.test(userType);

const validateCreateUser = (req, res, next) => {
  const { userType } = req.body || {};
  if (userType === 'STUDENT') {
    return validate(validations.createUnifiedUserStudent)(req, res, next);
  }
  if (isAdminRoleUserType(userType)) {
    return validate(validations.createUnifiedUserAdmin)(req, res, next);
  }
  return res.status(400).json({
    success: false,
    message:
      'userType is required: use STUDENT for students, or a Role _id from GET /api/admin/user-roles (e.g. Content Admin). Do not use ALL or ADMIN.'
  });
};

router.get('/update-fields', superAdmin, getUpdateFields);
router.get('/', superAdmin, getUnifiedUsers);
router.post('/', superAdmin, validateCreateUser, createUnifiedUser);
router.get('/:id', superAdmin, getSingleUser);
router.put('/:id', superAdmin, updateUnifiedUser);
router.delete('/:id', superAdmin, deleteUnifiedUser);

module.exports = router;
