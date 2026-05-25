const jwt = require('jsonwebtoken');
const { getJwtExpiresIn } = require('./sessionTimeoutMap');

const generateAdminToken = (admin) => {
  return jwt.sign(
    {
      id: admin._id,
      authType: 'admin_access',
      roleId: admin.roleId?._id || admin.roleId,
      centerId: admin.centerId?._id || admin.centerId,
      sessionTimeout: admin.sessionTimeout || '1_HOUR'
    },
    process.env.JWT_SECRET,
    { expiresIn: getJwtExpiresIn(admin.sessionTimeout) }
  );
};

module.exports = generateAdminToken;
