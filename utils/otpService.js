const OTP = require('../models/OTP');
const { sendOTPEmail } = require('./emailService');
const { assertEmailConfigured } = require('./emailConfig');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const EMAIL_SEND_TIMEOUT_MS = 25000;

const sendOTPEmailWithTimeout = (email, otp, userName, type) =>
  Promise.race([
    sendOTPEmail(email, otp, userName, type),
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('OTP email send timed out. Please try again.')),
        EMAIL_SEND_TIMEOUT_MS
      );
    })
  ]);

// Persists OTP in DB, returns quickly; email is sent in the background.
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
    try {
      await sendOTPEmailWithTimeout(email, otp, userName || 'User', type);
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error.message);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n🔐 OTP (${type}) for ${mobile || email}: ${otp}\n`);
      }
      const err = new Error(
        'Could not send OTP email. Check server email configuration (EMAIL_USER / EMAIL_PASS on Render).'
      );
      err.statusCode = 503;
      err.cause = error;
      throw err;
    }
  } else if (process.env.NODE_ENV !== 'production') {
    console.log(`\n🔐 OTP (${type}) for ${mobile || email}: ${otp}\n`);
  }

  return otp;
};

const verifyOTP = async (userId, otp, type) => {
  const otpRecord = await OTP.findOne({
    userId,
    otp,
    type
  });

  if (!otpRecord) {
    return { valid: false, message: 'Invalid OTP' };
  }

  if (otpRecord.expiresAt < new Date()) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return { valid: false, message: 'OTP has expired' };
  }

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return { valid: false, message: 'Maximum attempts exceeded. Please request a new OTP.' };
  }

  otpRecord.attempts += 1;
  await otpRecord.save();

  await OTP.deleteOne({ _id: otpRecord._id });

  return { valid: true, message: 'OTP verified successfully' };
};

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP
};
