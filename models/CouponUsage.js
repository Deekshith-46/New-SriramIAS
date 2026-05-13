const mongoose = require('mongoose');

const CouponUsageSchema = new mongoose.Schema({
   couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      required: true
   },

   userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
   },

   orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
   },

   usedAt: {
      type: Date,
      default: Date.now
   }
}, {
   timestamps: true
});

// Indexes for fast lookups
CouponUsageSchema.index({ couponId: 1, userId: 1 });
CouponUsageSchema.index({ userId: 1 });
CouponUsageSchema.index({ couponId: 1 });

module.exports = mongoose.model('CouponUsage', CouponUsageSchema);
