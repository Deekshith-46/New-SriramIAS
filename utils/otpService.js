const OTP = require('../models/OTP');
const { sendOTPEmail } = require('./emailService');

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP (for development - logs to console)
// In production, integrates with Email service
const sendOTP = async (userId, mobile, email, type = 'student') => {
  const otp = generateOTP();
  
  // Check for OTP abuse - max 5 OTPs per hour per user
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentOtps = await OTP.countDocuments({
    userId,
    createdAt: { $gte: oneHourAgo }
  });

  if (recentOtps >= 5) {
    throw new Error('Too many OTP requests. Please try again after 1 hour.');
  }

  // Delete any existing OTPs for this user and type
  await OTP.deleteMany({ 
    userId,
    type
  });

  // Create new OTP record
  await OTP.create({
    userId,
    mobile,
    email,
    otp,
    type,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiry
    attempts: 0,
    maxAttempts: 3
  });

  // Send OTP via email if email is provided
  if (email) {
    try {
      // Get user name for personalized email
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      console.log("Sending email to:", email);
      
      if (user) {
        await sendOTPEmail(email, otp, user.name, type);
        console.log("✅ OTP email sent successfully");
      }
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error.message);
      // Continue anyway - OTP is still valid in database
      // Also log OTP to console as fallback
      console.log(`\n🔐 OTP (${type}) for ${mobile || email}: ${otp}\n`);
    }
  } else {
    // Log OTP for development (no email available)
    console.log(`\n🔐 OTP (${type}) for ${mobile || email}: ${otp}\n`);
  }
  
  return otp;
};

// Verify OTP
const verifyOTP = async (userId, otp, type) => {
  const otpRecord = await OTP.findOne({
    userId,
    otp,
    type
  });

  if (!otpRecord) {
    return { valid: false, message: 'Invalid OTP' };
  }

  // Check if expired
  if (otpRecord.expiresAt < new Date()) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return { valid: false, message: 'OTP has expired' };
  }

  // Check max attempts
  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return { valid: false, message: 'Maximum attempts exceeded. Please request a new OTP.' };
  }

  // Increment attempts
  otpRecord.attempts += 1;
  await otpRecord.save();

  // Delete OTP after successful verification
  await OTP.deleteOne({ _id: otpRecord._id });
  
  return { valid: true, message: 'OTP verified successfully' };
};

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP
};
