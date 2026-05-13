const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
   couponName: {
      type: String,
      required: [true, 'Coupon name is required'],
      trim: true
   },

   couponCode: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true
   },

   type: {
      type: String,
      enum: ['PERCENTAGE', 'FLAT'],
      required: [true, 'Coupon type is required']
   },

   // Discount value (percentage or flat amount)
   value: {
      type: Number,
      required: [true, 'Coupon value is required'],
      min: [0, 'Value cannot be negative']
   },

   // Category API relation
   categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
   },

   // Coupon banner image
   backgroundImage: {
      url: String,
      public_id: String
   },

   // Coupon validity
   validFrom: {
      type: Date,
      required: [true, 'Valid from date is required']
   },

   validTill: {
      type: Date,
      required: [true, 'Valid till date is required']
   },

   // Usage controls
   totalUsersLimit: {
      type: Number,
      default: null
   },

   usageLimitPerCustomer: {
      type: Number,
      default: 1
   },

   minimumQuantity: {
      type: Number,
      default: 1
   },

   minimumCartValue: {
      type: Number,
      default: 0
   },

   usedCount: {
      type: Number,
      default: 0
   },

   // Applicable for (Course, Book, or Both)
   applicableFor: {
      type: String,
      enum: ['COURSE', 'BOOK', 'BOTH'],
      default: 'BOTH'
   },

   // Status
   status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
   },

   isDeleted: {
      type: Boolean,
      default: false
   },

   createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
   }
}, {
   timestamps: true
});

// Indexes for faster lookups
CouponSchema.index({ couponCode: 1, status: 1, isDeleted: 1 });
CouponSchema.index({ validTill: 1 });
CouponSchema.index({ categoryId: 1 });
CouponSchema.index({ type: 1 });

module.exports = mongoose.model('Coupon', CouponSchema);
