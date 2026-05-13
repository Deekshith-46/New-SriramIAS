const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
   userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
   },
   
   // Order Type: COURSE or BOOK
   orderType: {
      type: String,
      enum: ['COURSE', 'BOOK'],
      required: [true, 'Order type is required']
   },
   
   // For COURSE orders
   courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null
   },
   
   courseMode: {
      type: String,
      enum: ['online', 'offline', null],
      default: null
   },
   
   // For BOOK orders
   bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      default: null
   },
   
   quantity: {
      type: Number,
      default: 1,
      min: [1, 'Quantity must be at least 1']
   },
   
   // Pricing
   actualPrice: {
      type: Number,
      required: [true, 'Actual price is required']
   },
   
   discountAmount: {
      type: Number,
      default: 0
   },
   
   deliveryCharge: {
      type: Number,
      default: 0
   },
   
   finalAmount: {
      type: Number,
      required: [true, 'Final amount is required']
   },
   
   // Coupon
   couponCode: {
      type: String,
      default: null
   },
   
   // Payment Details
   paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING'
   },
   
   // Order Status (for BOOK orders)
   orderStatus: {
      type: String,
      enum: ['PLACED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'],
      default: 'PLACED'
   },
   
   // Razorpay Details
   razorpayOrderId: {
      type: String,
      required: [true, 'Razorpay order ID is required']
   },
   
   razorpayPaymentId: {
      type: String,
      default: null
   },
   
   razorpaySignature: {
      type: String,
      default: null
   },
   
   // Shipping Address (for BOOK orders only)
   shippingAddress: {
      fullName: String,
      mobile: String,
      email: String,
      addressLine: String,
      city: String,
      state: String,
      pincode: String,
      landmark: String
   },
   
   // Tracking & Documentation
   receiptNumber: {
      type: String,
      unique: true,
      sparse: true
   },
   
   receiptUrl: {
      type: String,
      default: null
   },
   
   invoiceUrl: {
      type: String,
      default: null
   },
   
   courierName: {
      type: String,
      default: null
   },
   
   trackingNumber: {
      type: String,
      default: null
   },
   
   shippedAt: {
      type: Date,
      default: null
   },
   
   deliveredAt: {
      type: Date,
      default: null
   },
   
   // Snapshot (preserve purchase-time data)
   itemSnapshot: {
      title: String,
      price: Number,
      image: String
   }
}, { 
   timestamps: true 
});

// Indexes for faster queries
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ orderType: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ orderStatus: 1 });
// Note: receiptNumber index is automatically created by unique: true

module.exports = mongoose.model('Order', OrderSchema);
