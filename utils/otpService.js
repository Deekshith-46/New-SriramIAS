const mongoose = require('mongoose');
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('./emailService');
const { assertEmailConfigured } = require('./emailConfig');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const dispatchOTPEmail = (email, otp, userName, type, mobile) => {
  sendOTPEmail(email, otp, userName, type)
    .then(() => console.log('✅ OTP email sent successfully'))
    .catch((error) => {
      console.error('❌ Failed to send OTP email:', error.message);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n🔐 OTP (${type}) for ${mobile || email}: ${otp}\n`);
      }
    });
};

const sendOTP = async (userId, mobile, email, type = 'student', userName = null) => {
  const otp = generateOTP();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentOtps = await OTP.countDocuments({
    userId,
    createdAt: { $gte: oneHourAgo }
  });

  if (recentOtps >= 5) {
    throw new Error('Too many OTP requests. Please try again after 1 hour.');
  }

  await OTP.deleteMany({ userId, type });

  await OTP.create({
    userId,
    mobile,
    email,
    otp,
    type,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    attempts: 0,
    maxAttempts: 3
  });

  if (email) {
    assertEmailConfigured();
    console.log('Sending OTP email to:', email);
    dispatchOTPEmail(email, otp, userName || 'User', type, mobile);
  } else if (process.env.NODE_ENV !== 'production') {
    console.log(`\n🔐 OTP (${type}) for ${mobile || email}: ${otp}\n`);
  }

  return otp;
};

const normalizeOtpInput = (otp) => String(otp ?? '').trim();

const verifyOTP = async (userId, otp, type) => {
  const otpNorm = normalizeOtpInput(otp);
  if (!/^\d{6}$/.test(otpNorm)) {
    return { valid: false, message: 'Invalid OTP' };
  }

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { valid: false, message: 'Invalid user reference' };
  }

  const userOid = new mongoose.Types.ObjectId(userId);

  const otpRecord = await OTP.findOne({ userId: userOid, type }).sort({ createdAt: -1 });

  if (!otpRecord) {
    return { valid: false, message: 'OTP not found or expired. Please request a new OTP.' };
  }

  if (otpRecord.expiresAt < new Date()) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return { valid: false, message: 'OTP has expired' };
  }

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return { valid: false, message: 'Maximum attempts exceeded. Please request a new OTP.' };
  }

  if (otpRecord.otp !== otpNorm) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return { valid: false, message: 'Maximum attempts exceeded. Please request a new OTP.' };
    }
    return { valid: false, message: 'Invalid OTP' };
  }

  await OTP.deleteOne({ _id: otpRecord._id });

  return { valid: true, message: 'OTP verified successfully' };
};

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP
};
