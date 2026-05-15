const mongoose = require('mongoose');

const bookOrderItemSchema = new mongoose.Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  
  title: { type: String, required: true },
  image: { type: String, default: null },
  authorNames: [{ type: String }],
  subjects: [{ type: String }],
  
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  
  actualPrice: { type: Number, required: true },
  discountedPrice: { type: Number, required: true },
  deliveryCharge: { type: Number, default: 0 }
}, { _id: true });

const bookOrderSchema = new mongoose.Schema({
  // Order number (unique identifier)
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // User who placed the order
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Order items
  items: [bookOrderItemSchema],
  
  // Pricing
  totalItems: {
    type: Number,
    required: true
  },
  
  totalActualPrice: {
    type: Number,
    required: true
  },
  
  totalDiscountedPrice: {
    type: Number,
    required: true
  },
  
  totalDeliveryCharge: {
    type: Number,
    default: 0
  },
  
  // Coupon
  appliedCoupon: {
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    couponCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['PERCENTAGE', 'FLAT'], default: null }
  },
  
  // Final amount
  finalAmount: {
    type: Number,
    required: true
  },
  
  // Shipping Address
  shippingAddress: {
    fullName: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true },
    addressLine: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: { type: String, default: null }
  },
  
  // Payment Details
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  
  paymentMethod: {
    type: String,
    enum: ['RAZORPAY', 'COD'],
    default: 'RAZORPAY'
  },
  
  razorpayOrderId: { type: String, default: null },
  razorpayPaymentId: { type: String, default: null },
  razorpaySignature: { type: String, default: null },
  paidAt: { type: Date, default: null },
  
  // Order Status
  orderStatus: {
    type: String,
    enum: ['PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'],
    default: 'PLACED'
  },
  
  // Tracking & Documentation
  courierName: { type: String, default: null },
  trackingNumber: { type: String, default: null },
  shippedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  
  // Invoice
  invoiceUrl: { type: String, default: null },
  invoiceNumber: { type: String, default: null },
  
  // Notes
  customerNote: { type: String, default: null },
  adminNote: { type: String, default: null },
  
  // Metadata
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, default: null }
}, { 
  timestamps: true 
});

// Generate order number before saving
bookOrderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderNumber = `BK${year}${month}${random}`;
  }
  next();
});

// Indexes for faster queries
bookOrderSchema.index({ userId: 1, createdAt: -1 });
bookOrderSchema.index({ orderNumber: 1 });
bookOrderSchema.index({ paymentStatus: 1 });
bookOrderSchema.index({ orderStatus: 1 });

module.exports = mongoose.model('BookOrder', bookOrderSchema);
