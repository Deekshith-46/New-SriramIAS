const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  mobile: String,
  email: String,
  otp: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['student', 'parent', 'password_reset'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  }
}, { timestamps: true });

// Index for faster queries
otpSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('OTP', otpSchema);
