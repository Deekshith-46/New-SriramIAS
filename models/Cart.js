const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  // Item Type: COURSE or BOOK
  itemType: {
    type: String,
    enum: ['COURSE', 'BOOK'],
    required: [true, 'Item type is required']
  },
  
  // Reference to the actual item
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Item ID is required'],
    refPath: 'itemType'
  },
  
  // For COURSE items (required only for courses)
  courseMode: {
    type: String,
    enum: ['online', 'offline'],
    default: undefined
  },
  
  // Quantity (for books, courses always 1)
  quantity: {
    type: Number,
    default: 1,
    min: [1, 'Quantity must be at least 1']
  },
  
  // Price snapshot at time of adding to cart
  actualPrice: {
    type: Number,
    required: [true, 'Actual price is required']
  },
  
  discountedPrice: {
    type: Number,
    required: [true, 'Discounted price is required']
  },
  
  // Offer text for UI display
  appliedOfferText: {
    type: String,
    default: ''
  },
  
  // Coupon eligibility flag
  isCouponApplicable: {
    type: Boolean,
    default: true
  },
  
  // Enhanced Item snapshot (preserve rich data at time of adding to cart)
  itemSnapshot: {
    title: { type: String, required: true },
    image: { type: String, default: null },
    
    // Book-specific fields
    authorNames: [{ type: String }],
    subjects: [{ type: String }],
    deliveryCharge: { type: Number, default: 0 },
    inStock: { type: Boolean, default: true },
    
    // Course-specific fields
    center: { type: String, default: null },
    category: { type: String, default: null },
    duration: { type: String, default: null },
    validity: { type: String, default: null },
    mode: { type: String, default: null }
  }
}, { _id: true });

const cartSchema = new mongoose.Schema({
  // User who owns this cart
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true // One cart per user
  },
  
  // Cart items
  items: [cartItemSchema],
  
  // Applied coupon
  appliedCoupon: {
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    couponCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['PERCENTAGE', 'FLAT'], default: null }
  },
  
  // Cart summary - Basic totals
  totalItems: {
    type: Number,
    default: 0
  },
  
  totalActualPrice: {
    type: Number,
    default: 0
  },
  
  totalDiscountedPrice: {
    type: Number,
    default: 0
  },
  
  totalItemDiscount: {
    type: Number,
    default: 0
  },
  
  // Separated totals for courses and books
  courseTotal: {
    actualPrice: { type: Number, default: 0 },
    discountedPrice: { type: Number, default: 0 }
  },
  
  bookTotal: {
    actualPrice: { type: Number, default: 0 },
    discountedPrice: { type: Number, default: 0 }
  },
  
  // Delivery charges (books only)
  deliveryCharge: {
    type: Number,
    default: 0
  },
  
  // Coupon discount
  couponDiscount: {
    type: Number,
    default: 0
  },
  
  // Final payable amount
  finalAmount: {
    type: Number,
    default: 0
  },
  
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Auto-calculate totals before saving
cartSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    // Calculate basic totals
    this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
    this.totalActualPrice = this.items.reduce((sum, item) => sum + (item.actualPrice * item.quantity), 0);
    this.totalDiscountedPrice = this.items.reduce((sum, item) => sum + (item.discountedPrice * item.quantity), 0);
    this.totalItemDiscount = this.totalActualPrice - this.totalDiscountedPrice;
    
    // Calculate separated totals for courses and books
    this.courseTotal = { actualPrice: 0, discountedPrice: 0 };
    this.bookTotal = { actualPrice: 0, discountedPrice: 0 };
    this.deliveryCharge = 0;
    
    this.items.forEach(item => {
      if (item.itemType === 'COURSE') {
        this.courseTotal.actualPrice += item.actualPrice * item.quantity;
        this.courseTotal.discountedPrice += item.discountedPrice * item.quantity;
      } else if (item.itemType === 'BOOK') {
        this.bookTotal.actualPrice += item.actualPrice * item.quantity;
        this.bookTotal.discountedPrice += item.discountedPrice * item.quantity;
        // Add delivery charge for books
        if (item.itemSnapshot && item.itemSnapshot.deliveryCharge) {
          this.deliveryCharge += item.itemSnapshot.deliveryCharge * item.quantity;
        }
      }
    });
    
    // Calculate final amount
    this.finalAmount = this.totalDiscountedPrice + this.deliveryCharge - this.couponDiscount;
    
  } else {
    this.totalItems = 0;
    this.totalActualPrice = 0;
    this.totalDiscountedPrice = 0;
    this.totalItemDiscount = 0;
    this.courseTotal = { actualPrice: 0, discountedPrice: 0 };
    this.bookTotal = { actualPrice: 0, discountedPrice: 0 };
    this.deliveryCharge = 0;
    this.couponDiscount = 0;
    this.finalAmount = 0;
    this.appliedCoupon = {
      couponId: null,
      couponCode: null,
      discountAmount: 0,
      discountType: null
    };
  }
  
  this.lastUpdated = Date.now();
  next();
});

// Indexes for faster queries
cartSchema.index({ userId: 1 });
cartSchema.index({ 'items.itemType': 1 });
cartSchema.index({ 'items.itemId': 1 });

module.exports = mongoose.model('Cart', cartSchema);
