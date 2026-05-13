const mongoose = require('mongoose');

const paymentIntentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true
  },
  learningMode: {
    type: String,
    enum: ['online', 'offline'],
    required: true
  },
  admissionType: {
    type: String,
    enum: ['full', 'installment'],
    required: true
  },
  installmentMonths: {
    type: Number,
    default: 1
  },
  couponCode: {
    type: String,
    default: null
  },
  discount: {
    type: Number,
    default: 0
  },
  totalFees: {
    type: Number,
    required: true
  },
  chargeAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'CAPTURED', 'FAILED', 'EXPIRED'],
    default: 'PENDING'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  idempotencyKey: {
    type: String,
    default: null
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

paymentIntentSchema.index({ userId: 1, courseId: 1, status: 1 });
paymentIntentSchema.index({ idempotencyKey: 1, userId: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $exists: true, $ne: null } } });

module.exports = mongoose.model('PaymentIntent', paymentIntentSchema);
