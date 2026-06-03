const AdminAccess = require('../models/AdminAccess');
const { validate, validations } = require('../middleware/validation');
const {
  findAdminAccessByEmail,
  formatAdminAccessForAdmin
} = require('../utils/adminAccessHelpers');
const generateAdminToken = require('../utils/generateAdminToken');
const { sendAdminLoginAlert } = require('../utils/adminLoginAlert');
const { sendOTP, verifyOTP } = require('../utils/otpService');
const { assertEmailConfigured } = require('../utils/emailConfig');

const getClientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.ip ||
  req.connection?.remoteAddress ||
  '';

const completeAdminLogin = async (admin, req, res) => {
  admin.lastLoginAt = new Date();
  await admin.save({ validateBeforeSave: false });

  if (admin.loginAlertEnabled) {
    sendAdminLoginAlert({
      adminName: admin.fullName,
      adminEmail: admin.officialEmail,
      loginTime: admin.lastLoginAt,
      ipAddress: getClientIp(req)
    }).catch((err) => console.error('Login alert failed:', err.message));
  }

  const token = generateAdminToken(admin);

  res.json({
    success: true,
    token,
    authType: 'admin_access',
    user: formatAdminAccessForAdmin(admin)
  });
};

exports.loginAdminAccess = [
  validate(validations.adminAccessLogin),
  async (req, res) => {
    try {
      const { officialEmail, password } = req.body;

      const admin = await findAdminAccessByEmail(officialEmail);

      if (!admin) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (!admin.accountStatus) {
        return res.status(403).json({
          success: false,
          message: 'Account disabled'
        });
      }

      if (admin.roleId?.status === 'INACTIVE') {
        return res.status(403).json({
          success: false,
          message: 'Assigned role is inactive'
        });
      }

      if (admin.centerId?.isDeleted || admin.centerId?.status === 'DISABLED') {
        return res.status(403).json({
          success: false,
          message: 'Assigned center is not available'
        });
      }

      const isMatch = await admin.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (admin.twoFactorEnabled) {
        try {
          assertEmailConfigured();
        } catch {
          return res.status(503).json({
            success: false,
            message: 'Two-factor authentication requires email configuration'
          });
        }

        let otp;
        try {
          otp = await sendOTP(
            admin._id,
            admin.contactNumber,
            admin.officialEmail,
            'admin_access',
            admin.fullName
          );
        } catch (error) {
          if (error.statusCode === 503) {
            return res.status(503).json({ success: false, message: error.message });
          }
          return res.status(429).json({ success: false, message: error.message });
        }

        const exposeOtp =
          process.env.EXPOSE_OTP_IN_RESPONSE === 'true' || process.env.NODE_ENV !== 'production';

        return res.json({
          success: true,
          requiresOtp: true,
          message: 'OTP sent to your official email',
          adminAccessId: admin._id.toString(),
          otp: exposeOtp ? otp : undefined
        });
      }

      await completeAdminLogin(admin, req, res);
    } catch (error) {
      console.error('Admin access login error:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }
];

exports.verifyAdminAccessOtp = [
  validate(validations.adminAccessVerifyOtp),
  async (req, res) => {
    try {
      const { adminAccessId, otp } = req.body;

      const admin = await AdminAccess.findById(adminAccessId)
        .populate('roleId', 'roleTitle roleCode status')
        .populate('centerId', 'centerName centerCode status isDeleted');

      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin user not found' });
      }

      if (!admin.accountStatus) {
        return res.status(403).json({ success: false, message: 'Account disabled' });
      }

      const verification = await verifyOTP(admin._id, otp, 'admin_access');
      if (!verification.valid) {
        return res.status(400).json({ success: false, message: verification.message });
      }

      await completeAdminLogin(admin, req, res);
    } catch (error) {
      console.error('Admin access OTP verify error:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }
];
