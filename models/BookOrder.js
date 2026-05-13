const mongoose = require('mongoose');

const BookOrderSchema = new mongoose.Schema({
   userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
   },

   bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
      index: true
   },

   quantity: {
      type: Number,
      default: 1,
      min: [1, 'Quantity must be at least 1']
   },

   // Pricing
   actualPrice: {
      type: Number,
      required: true
   },

   couponCode: String,

   discountAmount: {
      type: Number,
      default: 0
   },

   finalAmount: {
      type: Number,
      required: true
   },

   deliveryCharge: {
      type: Number,
      default: 0
   },

   // Payment Details
   paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING'
   },

   // Order/Shipping Status
   orderStatus: {
      type: String,
      enum: [
         'PLACED',
         'PROCESSING',
         'SHIPPED',
         'OUT_FOR_DELIVERY',
         'DELIVERED',
         'CANCELLED',
         'RETURNED'
      ],
      default: 'PLACED'
   },

   // Razorpay Details
   razorpayOrderId: String,
   razorpayPaymentId: String,
   razorpaySignature: String,

   // Shipping Address
   shippingAddress: {
      fullName: {
         type: String,
         required: [true, 'Full name is required']
      },
      mobile: {
         type: String,
         required: [true, 'Mobile number is required']
      },
      email: String,
      addressLine: {
         type: String,
         required: [true, 'Address is required']
      },
      city: {
         type: String,
         required: [true, 'City is required']
      },
      state: {
         type: String,
         required: [true, 'State is required']
      },
      pincode: {
         type: String,
         required: [true, 'Pincode is required']
      },
      landmark: String
   },

   // Tracking & Documentation
   receiptNumber: String,
   invoiceUrl: String,

   // Courier Tracking (for future use)
   courierName: String,
   trackingNumber: String,
   shippedAt: Date,
   deliveredAt: Date,

   // Cancellation
   cancelledAt: Date,
   cancellationReason: String,

   // Book Snapshot (preserve purchase-time data)
   bookSnapshot: {
      title: String,
      authorNames: [String],
      price: Number
   }
}, {
   timestamps: true
});

// Indexes for faster queries
BookOrderSchema.index({ userId: 1, createdAt: -1 });
BookOrderSchema.index({ orderStatus: 1 });
BookOrderSchema.index({ paymentStatus: 1 });
BookOrderSchema.index({ razorpayPaymentId: 1 });

module.exports = mongoose.model('BookOrder', BookOrderSchema);
