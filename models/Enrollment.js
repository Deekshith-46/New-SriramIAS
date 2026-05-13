const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true,
    index: true
  },
  
  // Industry Standard Naming
  paymentType: {
    type: String,
    enum: ['full', 'installment'],
    default: 'full'
  },
  courseMode: {
    type: String,
    enum: ['online', 'offline'],
    required: true
  },
  
  // Single Status Field (Simplified)
  status: {
    type: String,
    enum: ['pending', 'active', 'overdue', 'completed', 'expired', 'cancelled'],
    default: 'pending',
    index: true
  },
  accessBlocked: { type: Boolean, default: false },
  
  // Financial Tracking
  totalFees: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  couponCode: { type: String },
  amountPaid: { type: Number, default: 0 },
  amountDue: { type: Number, default: 0 },
  
  // Installments (Embedded in Enrollment - Industry Standard)
  installments: [
    {
      installmentNo: { type: Number, required: true },
      amount: { type: Number, required: true },
      dueDate: { type: Date, required: true },
      status: {
        type: String,
        enum: ['pending', 'paid', 'overdue', 'cancelled'],
        default: 'pending',
        index: true
      },
      paidAt: { type: Date },
      transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String }
    }
  ],
  
  // Course Snapshot (Preserve purchase-time data)
  courseSnapshot: {
    title: { type: String },
    slug: { type: String },
    totalFees: { type: Number },
    onlineFees: { type: Number },
    offlineFees: { type: Number },
    centerName: { type: String },
    centerCity: { type: String },
    categoryName: { type: String },
    validityMonths: { type: Number },
    batchStartDate: { type: Date },
    batchEndDate: { type: Date },
    installmentPlans: {
      online: {
        enabled: Boolean,
        installments: [{
          installmentNo: Number,
          amount: Number,
          dueAfterDays: Number
        }]
      },
      offline: {
        enabled: Boolean,
        installments: [{
          installmentNo: Number,
          amount: Number,
          dueAfterDays: Number
        }]
      }
    }
  },
  
  // Coupon Snapshot (Preserve discount data)
  couponSnapshot: {
    code: { type: String },
    discountType: { type: String },
    discountValue: { type: Number },
    maxDiscount: { type: Number }
  },
  
  // Access Validity
  validFrom: { type: Date, default: Date.now },
  validUntil: { type: Date },
  accessEndsAt: { type: Date }, // Computed and stored at enrollment
  
  // Refund Architecture
  refundStatus: {
    type: String,
    enum: ['none', 'partial', 'full'],
    default: 'none'
  },
  refundAmount: { type: Number, default: 0 },
  refundDate: { type: Date },
  
  // Financial Audit Fields
  currency: { type: String, default: 'INR' },
  paymentGateway: { type: String, default: 'RAZORPAY' },
  invoiceNumber: { type: String },
  receiptNumber: { type: String },
  
  // Course Progress
  courseCompletionStatus: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  
  // Legacy fields (for backward compatibility)
  razorpayOrderId: { type: String, default: null },
  
  // Soft Delete (Financial data should NEVER be hard deleted)
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Indexes for Performance
// Prevent duplicate active enrollments for same user + course
enrollmentSchema.index(
  { userId: 1, courseId: 1, isDeleted: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: { $in: ['pending', 'active', 'overdue'] }
    }
  }
);

// Common query indexes
enrollmentSchema.index({ centerId: 1, status: 1 });
enrollmentSchema.index({ userId: 1, status: 1 });
enrollmentSchema.index({ courseId: 1, status: 1 });
enrollmentSchema.index({ status: 1, isDeleted: 1 });
enrollmentSchema.index({ accessEndsAt: 1 });
enrollmentSchema.index({ 'installments.status': 1 });
enrollmentSchema.index({ 'installments.dueDate': 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);

