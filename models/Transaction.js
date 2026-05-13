const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  enrollmentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Enrollment', 
    required: true,
    index: true 
  },
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
    index: true 
  },
  installmentId: { type: mongoose.Schema.Types.ObjectId }, // Reference to specific installment
  
  // Payment Type
  paymentType: { 
    type: String, 
    enum: ['full', 'installment'], 
    required: true 
  },
  installmentNo: { type: Number }, // For installment payments
  
  // Amount Details
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  
  // Payment Status (Track ALL attempts)
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'success', 'failed', 'cancelled', 'refunded'], 
    default: 'pending',
    index: true 
  },
  
  // Payment Mode
  paymentMode: { 
    type: String, 
    enum: ['online', 'offline', 'mixed'], 
    required: true 
  },
  
  // Gateway Details
  paymentGateway: { type: String, default: 'RAZORPAY' },
  gatewayTransactionId: { type: String },
  
  // Razorpay Fields
  razorpayOrderId: { type: String, required: true, index: true },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  
  // Offline Payment Fields
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'netbanking', 'wallet'] 
  },
  chequeNumber: { type: String },
  bankReferenceNumber: { type: String },
  
  // Financial Audit
  invoiceNumber: { type: String, index: true },
  receiptNumber: { type: String },
  
  // Refund Fields
  refundAmount: { type: Number, default: 0 },
  refundDate: { type: Date },
  refundId: { type: String }, // Gateway refund ID
  refundReason: { type: String },
  refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Payment Expiry (For pending orders)
  paymentExpiresAt: { type: Date, index: true },
  
  // Error Tracking (For failed payments)
  errorCode: { type: String },
  errorMessage: { type: String },
  failureReason: { type: String },
  
  // Metadata
  description: { type: String },
  notes: { type: Map, of: String },
  metadata: { type: Map, of: String },
  
  // Payment Attempt Details
  attemptNumber: { type: Number, default: 1 },
  isRetry: { type: Boolean, default: false },
  previousTransactionId: { type: mongoose.Schema.Types.ObjectId },
  
  // Verification
  isVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  verifiedBy: { type: String }, // 'webhook' | 'api' | 'manual'
  
  // Legacy fields
  orderNumber: { type: String },
  enrollmentNumber: { type: String },
  
  // Status
  isActive: { type: Boolean, default: true },
  remarks: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Performance Indexes
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ courseId: 1, createdAt: -1 });
transactionSchema.index({ paymentStatus: 1, createdAt: -1 });
transactionSchema.index({ centerId: 1, createdAt: -1 });
transactionSchema.index({ paymentType: 1, paymentStatus: 1 });
transactionSchema.index({ paymentExpiresAt: 1 });
transactionSchema.index({ invoiceNumber: 1 }, { sparse: true });
transactionSchema.index({ razorpayPaymentId: 1 }, { sparse: true });

module.exports = mongoose.model('Transaction', transactionSchema);
