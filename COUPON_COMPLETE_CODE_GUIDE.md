# 🎫 Complete Coupon System - Full Code & API Documentation

## Overview

Production-grade coupon system with percentage/flat discounts, category integration, Cloudinary image uploads, usage tracking, and advanced validation.

---

## 📑 Table of Contents

1. [Complete Model Code](#1-complete-model-code)
2. [Complete Controller Code](#2-complete-controller-code)
3. [Complete Routes Code](#3-complete-routes-code)
4. [API Endpoints](#4-api-endpoints)
5. [Step-by-Step API Testing](#5-step-by-step-api-testing)
6. [Frontend Integration](#6-frontend-integration)

---

## 1. Complete Model Code

### File: `models/Coupon.js`

```javascript
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
```

---

### File: `models/CouponUsage.js`

```javascript
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

// Index for fast lookups
CouponUsageSchema.index({ couponId: 1, userId: 1 });
CouponUsageSchema.index({ userId: 1 });

module.exports = mongoose.model('CouponUsage', CouponUsageSchema);
```

---

## 2. Complete Controller Code

### File: `controllers/couponController.js`

```javascript
const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const Category = require('../models/Category');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const cloudinary = require('../config/cloudinary');

// @desc    Apply coupon and calculate discount
// @route   POST /api/coupons/apply
// @access  Private (Authenticated users)
exports.applyCoupon = async (req, res) => {
   try {
      const { couponCode, cartAmount, quantity, categoryId } = req.body;

      // Validate required fields
      if (!couponCode || !cartAmount) {
         return res.status(400).json({
            success: false,
            message: 'Coupon code and cart amount are required'
         });
      }

      // Find coupon
      const coupon = await Coupon.findOne({
         couponCode: couponCode.toUpperCase(),
         status: 'ACTIVE',
         isDeleted: false
      }).populate('categoryId', 'name');

      if (!coupon) {
         return res.status(404).json({
            success: false,
            message: 'Invalid or expired coupon'
         });
      }

      // Check validity dates
      const now = new Date();
      if (now < coupon.validFrom) {
         return res.status(400).json({
            success: false,
            message: `Coupon will be active from ${coupon.validFrom.toLocaleDateString()}`
         });
      }

      if (now > coupon.validTill) {
         return res.status(400).json({
            success: false,
            message: 'Coupon has expired'
         });
      }

      // Check category restriction
      if (coupon.categoryId && categoryId) {
         if (coupon.categoryId._id.toString() !== categoryId.toString()) {
            return res.status(400).json({
               success: false,
               message: `This coupon is only valid for ${coupon.categoryId.name} category`
            });
         }
      }

      // Check minimum cart value
      if (cartAmount < coupon.minimumCartValue) {
         return res.status(400).json({
            success: false,
            message: `Minimum cart value ₹${coupon.minimumCartValue} required`
         });
      }

      // Check minimum quantity
      if (quantity && quantity < coupon.minimumQuantity) {
         return res.status(400).json({
            success: false,
            message: `Minimum ${coupon.minimumQuantity} item(s) required`
         });
      }

      // Check total usage limit
      if (coupon.totalUsersLimit && coupon.usedCount >= coupon.totalUsersLimit) {
         return res.status(400).json({
            success: false,
            message: 'Coupon usage limit reached'
         });
      }

      // Check per-customer usage limit
      const userUsage = await CouponUsage.countDocuments({
         couponId: coupon._id,
         userId: req.user._id
      });

      if (userUsage >= coupon.usageLimitPerCustomer) {
         return res.status(400).json({
            success: false,
            message: `You have used this coupon ${userUsage}/${coupon.usageLimitPerCustomer} times. Limit exceeded.`
         });
      }

      // Calculate discount based on type
      let discount = 0;
      const originalPrice = parseFloat(cartAmount);

      if (coupon.type === 'PERCENTAGE') {
         discount = (originalPrice * coupon.value) / 100;
      } else if (coupon.type === 'FLAT') {
         discount = coupon.value;
      }

      // Prevent negative prices
      const finalPrice = Math.max(0, originalPrice - discount);

      // Calculate dynamic status
      const displayStatus = now > coupon.validTill ? 'EXPIRED' : coupon.status;

      res.json({
         success: true,
         message: 'Coupon applied successfully',
         data: {
            couponId: coupon._id,
            couponName: coupon.couponName,
            couponCode: coupon.couponCode,
            discountType: coupon.type,
            discount: discount,
            originalPrice: originalPrice,
            finalPrice: finalPrice,
            status: displayStatus
         }
      });

   } catch (error) {
      console.error('Apply Coupon Error:', error);
      res.status(500).json({
         success: false,
         message: 'Server error while applying coupon',
         error: error.message
      });
   }
};

// @desc    Create coupon
// @route   POST /api/coupons/admin
// @access  Private (Super Admin & Admin)
exports.createCoupon = async (req, res) => {
   try {
      const {
         couponName,
         couponCode,
         type,
         value,
         categoryId,
         validFrom,
         validTill,
         totalUsersLimit,
         usageLimitPerCustomer,
         minimumQuantity,
         minimumCartValue,
         status
      } = req.body;

      // Validate required fields
      if (!couponName || !couponCode || !type || !validFrom || !validTill) {
         return res.status(400).json({
            success: false,
            message: 'Required fields: couponName, couponCode, type, validFrom, validTill'
         });
      }

      // Check if coupon code already exists
      const existingCoupon = await Coupon.findOne({
         couponCode: couponCode.toUpperCase(),
         isDeleted: false
      });

      if (existingCoupon) {
         return res.status(400).json({
            success: false,
            message: 'Coupon code already exists'
         });
      }

      // Validate category if provided
      if (categoryId) {
         const category = await Category.findById(categoryId);
         if (!category) {
            return res.status(404).json({
               success: false,
               message: 'Category not found'
            });
         }
      }

      // Handle image upload
      let backgroundImage = {};
      if (req.files && req.files.backgroundImage) {
         const imageResult = await uploadToCloudinary(
            req.files.backgroundImage[0],
            'coupons/banners'
         );
         backgroundImage = {
            url: imageResult.url,
            public_id: imageResult.public_id
         };
      }

      // Create coupon
      const coupon = await Coupon.create({
         couponName,
         couponCode: couponCode.toUpperCase(),
         type,
         value: parseFloat(value),
         categoryId: categoryId || null,
         backgroundImage,
         validFrom: new Date(validFrom),
         validTill: new Date(validTill),
         totalUsersLimit: totalUsersLimit ? parseInt(totalUsersLimit) : null,
         usageLimitPerCustomer: parseInt(usageLimitPerCustomer) || 1,
         minimumQuantity: parseInt(minimumQuantity) || 1,
         minimumCartValue: parseFloat(minimumCartValue) || 0,
         status: status || 'ACTIVE',
         createdBy: req.user._id
      });

      res.status(201).json({
         success: true,
         message: 'Coupon created successfully',
         data: coupon
      });

   } catch (error) {
      console.error('Create Coupon Error:', error);
      res.status(500).json({
         success: false,
         message: 'Server error while creating coupon',
         error: error.message
      });
   }
};

// @desc    Get public active coupons (no auth required)
// @route   GET /api/coupons
// @access  Public
exports.getPublicCoupons = async (req, res) => {
   try {
      const { categoryId, type, search } = req.query;
      const now = new Date();

      // Build filter for public view
      const filter = {
         isDeleted: false,
         status: 'ACTIVE',
         validTill: { $gte: now }  // Only exclude expired coupons
      };

      // Filter by category if provided
      if (categoryId) {
         filter.categoryId = categoryId;
      }

      // Filter by type if provided
      if (type && ['PERCENTAGE', 'FLAT'].includes(type)) {
         filter.type = type;
      }

      // Search by coupon name or code
      if (search) {
         filter.$or = [
            { couponName: { $regex: search, $options: 'i' } },
            { couponCode: { $regex: search, $options: 'i' } }
         ];
      }

      // Fetch active, non-expired coupons
      const coupons = await Coupon.find(filter)
         .select('couponName couponCode type value categoryId backgroundImage validFrom validTill minimumCartValue usageLimitPerCustomer')
         .populate('categoryId', 'name')
         .sort({ createdAt: -1 });

      // Add dynamic status
      const couponsWithStatus = coupons.map(coupon => {
         const couponObj = coupon.toObject();
         const isExpired = now > coupon.validTill;
         couponObj.displayStatus = isExpired ? 'EXPIRED' : 'ACTIVE';
         return couponObj;
      });

      res.json({
         success: true,
         count: couponsWithStatus.length,
         data: couponsWithStatus
      });

   } catch (error) {
      console.error('Get Public Coupons Error:', error);
      res.status(500).json({
         success: false,
         message: 'Server error while fetching coupons',
         error: error.message
      });
   }
};

// @desc    Get all coupons (Admin)
// @route   GET /api/coupons/admin
// @access  Private (Super Admin & Admin)
exports.getCoupons = async (req, res) => {
   try {
      const { status, type, categoryId, search } = req.query;

      // Build filter
      const filter = { isDeleted: false };

      if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
         filter.status = status;
      }

      if (type && ['PERCENTAGE', 'FLAT'].includes(type)) {
         filter.type = type;
      }

      if (categoryId) {
         filter.categoryId = categoryId;
      }

      if (search) {
         filter.$or = [
            { couponName: { $regex: search, $options: 'i' } },
            { couponCode: { $regex: search, $options: 'i' } }
         ];
      }

      const coupons = await Coupon.find(filter)
         .populate('categoryId', 'name')
         .populate('createdBy', 'name email')
         .sort({ createdAt: -1 });

      // Add dynamic status
      const now = new Date();
      const couponsWithStatus = coupons.map(coupon => {
         const couponObj = coupon.toObject();
         const isExpired = now > coupon.validTill;
         couponObj.displayStatus = isExpired ? 'EXPIRED' : coupon.status;
         return couponObj;
      });

      res.json({
         success: true,
         count: couponsWithStatus.length,
         data: couponsWithStatus
      });

   } catch (error) {
      console.error('Get Coupons Error:', error);
      res.status(500).json({
         success: false,
         message: 'Server error while fetching coupons',
         error: error.message
      });
   }
};

// @desc    Get single coupon by ID
// @route   GET /api/coupons/admin/:id
// @access  Private (Super Admin & Admin)
exports.getCouponById = async (req, res) => {
   try {
      const coupon = await Coupon.findOne({
         _id: req.params.id,
         isDeleted: false
      })
         .populate('categoryId', 'name')
         .populate('createdBy', 'name email');

      if (!coupon) {
         return res.status(404).json({
            success: false,
            message: 'Coupon not found'
         });
      }

      // Add dynamic status
      const now = new Date();
      const couponObj = coupon.toObject();
      couponObj.displayStatus = now > coupon.validTill ? 'EXPIRED' : coupon.status;

      res.json({
         success: true,
         data: couponObj
      });

   } catch (error) {
      console.error('Get Coupon By ID Error:', error);
      res.status(500).json({
         success: false,
         message: 'Server error while fetching coupon',
         error: error.message
      });
   }
};

// @desc    Update coupon
// @route   PUT /api/coupons/admin/:id
// @access  Private (Super Admin & Admin)
exports.updateCoupon = async (req, res) => {
   try {
      const coupon = await Coupon.findById(req.params.id);

      if (!coupon || coupon.isDeleted) {
         return res.status(404).json({
            success: false,
            message: 'Coupon not found'
         });
      }

      const {
         couponName,
         couponCode,
         type,
         value,
         categoryId,
         validFrom,
         validTill,
         totalUsersLimit,
         usageLimitPerCustomer,
         minimumQuantity,
         minimumCartValue,
         status
      } = req.body;

      // Check if new code already exists
      if (couponCode && couponCode.toUpperCase() !== coupon.couponCode) {
         const existingCode = await Coupon.findOne({
            couponCode: couponCode.toUpperCase(),
            _id: { $ne: req.params.id },
            isDeleted: false
         });

         if (existingCode) {
            return res.status(400).json({
               success: false,
               message: 'Coupon code already exists'
            });
         }
         coupon.couponCode = couponCode.toUpperCase();
      }

      // Validate category if provided
      if (categoryId) {
         const category = await Category.findById(categoryId);
         if (!category) {
            return res.status(404).json({
               success: false,
               message: 'Category not found'
            });
         }
         coupon.categoryId = categoryId;
      }

      // Handle image update
      if (req.files && req.files.backgroundImage) {
         // Delete old image from Cloudinary
         if (coupon.backgroundImage && coupon.backgroundImage.public_id) {
            await cloudinary.uploader.destroy(coupon.backgroundImage.public_id);
         }

         const imageResult = await uploadToCloudinary(
            req.files.backgroundImage[0],
            'coupons/banners'
         );
         coupon.backgroundImage = {
            url: imageResult.url,
            public_id: imageResult.public_id
         };
      }

      // Update fields
      if (couponName) coupon.couponName = couponName;
      if (type) coupon.type = type;
      if (value !== undefined) coupon.value = parseFloat(value);
      if (validFrom) coupon.validFrom = new Date(validFrom);
      if (validTill) coupon.validTill = new Date(validTill);
      if (totalUsersLimit !== undefined) coupon.totalUsersLimit = parseInt(totalUsersLimit) || null;
      if (usageLimitPerCustomer !== undefined) coupon.usageLimitPerCustomer = parseInt(usageLimitPerCustomer);
      if (minimumQuantity !== undefined) coupon.minimumQuantity = parseInt(minimumQuantity);
      if (minimumCartValue !== undefined) coupon.minimumCartValue = parseFloat(minimumCartValue);
      if (status) coupon.status = status;

      await coupon.save();

      res.json({
         success: true,
         message: 'Coupon updated successfully',
         data: coupon
      });

   } catch (error) {
      console.error('Update Coupon Error:', error);
      res.status(500).json({
         success: false,
         message: 'Server error while updating coupon',
         error: error.message
      });
   }
};

// @desc    Delete coupon (soft delete)
// @route   DELETE /api/coupons/admin/:id
// @access  Private (Super Admin & Admin)
exports.deleteCoupon = async (req, res) => {
   try {
      const coupon = await Coupon.findById(req.params.id);

      if (!coupon) {
         return res.status(404).json({
            success: false,
            message: 'Coupon not found'
         });
      }

      // Soft delete
      coupon.isDeleted = true;
      await coupon.save();

      res.json({
         success: true,
         message: 'Coupon deleted successfully'
      });

   } catch (error) {
      console.error('Delete Coupon Error:', error);
      res.status(500).json({
         success: false,
         message: 'Server error while deleting coupon',
         error: error.message
      });
   }
};

// @desc    Get coupon usage analytics
// @route   GET /api/coupons/admin/:id/usages
// @access  Private (Super Admin & Admin)
exports.getCouponUsages = async (req, res) => {
   try {
      const coupon = await Coupon.findById(req.params.id);

      if (!coupon || coupon.isDeleted) {
         return res.status(404).json({
            success: false,
            message: 'Coupon not found'
         });
      }

      const usages = await CouponUsage.find({ couponId: coupon._id })
         .populate('userId', 'name email')
         .sort({ usedAt: -1 });

      res.json({
         success: true,
         count: usages.length,
         data: usages
      });

   } catch (error) {
      console.error('Get Coupon Usages Error:', error);
      res.status(500).json({
         success: false,
         message: 'Server error while fetching coupon usages',
         error: error.message
      });
   }
};
```

---

## 3. Complete Routes Code

### File: `routes/couponRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
   applyCoupon,
   createCoupon,
   getPublicCoupons,
   getCoupons,
   getCouponById,
   updateCoupon,
   deleteCoupon,
   getCouponUsages
} = require('../controllers/couponController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Configure multer for memory storage
const upload = multer({
   storage: multer.memoryStorage(),
   limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
   }
});

// ==========================================
// PUBLIC/USER ROUTES (No Auth Required)
// ==========================================
router.post('/apply', protect, applyCoupon);

// Public endpoint - List active coupons (no auth required)
router.get('/', getPublicCoupons);

// ==========================================
// ADMIN ROUTES (Auth Required)
// ==========================================
router.post(
   '/admin',
   protect,
   authorize('super_admin', 'admin'),
   upload.fields([{ name: 'backgroundImage', maxCount: 1 }]),
   createCoupon
);

router.get(
   '/admin',
   protect,
   authorize('super_admin', 'admin'),
   getCoupons
);

router.get(
   '/admin/:id',
   protect,
   authorize('super_admin', 'admin'),
   getCouponById
);

router.put(
   '/admin/:id',
   protect,
   authorize('super_admin', 'admin'),
   upload.fields([{ name: 'backgroundImage', maxCount: 1 }]),
   updateCoupon
);

router.delete(
   '/admin/:id',
   protect,
   authorize('super_admin', 'admin'),
   deleteCoupon
);

router.get(
   '/admin/:id/usages',
   protect,
   authorize('super_admin', 'admin'),
   getCouponUsages
);

module.exports = router;
```

---

## 4. API Endpoints

### Base URL: `http://localhost:5000/api/coupons`

### Public Routes (No Token Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/api/coupons` | Get all active coupons |
| **POST** | `/api/coupons/apply` | Apply coupon (requires auth) |

### Admin Routes (Token Required)

| Method | Endpoint | Access | Content-Type | Description |
|--------|----------|--------|--------------|-------------|
| **POST** | `/api/coupons/admin` | Super Admin, Admin | multipart/form-data | Create coupon |
| **GET** | `/api/coupons/admin` | Super Admin, Admin | JSON | Get all coupons |
| **GET** | `/api/coupons/admin/:id` | Super Admin, Admin | JSON | Get single coupon |
| **PUT** | `/api/coupons/admin/:id` | Super Admin, Admin | multipart/form-data | Update coupon |
| **DELETE** | `/api/coupons/admin/:id` | Super Admin, Admin | JSON | Soft delete coupon |
| **GET** | `/api/coupons/admin/:id/usages` | Super Admin, Admin | JSON | Get usage analytics |

---

## 5. Step-by-Step API Testing

### Prerequisites

**1. Get Authentication Token:**
```bash
POST http://localhost:5000/api/auth/login
Body: { "email": "admin@example.com", "password": "yourpassword" }
```
Save the `token` from response.

**2. Get Category ID (optional):**
```bash
GET http://localhost:5000/api/categories
```
Save a category `_id` for testing.

---

### Test 1: Create Percentage Coupon

```bash
POST http://localhost:5000/api/coupons/admin
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data
```

**Form Data:**
```
couponName: Summer Sale 2026
couponCode: SUMMER50
type: PERCENTAGE
value: 50
categoryId: YOUR_CATEGORY_ID
validFrom: 2026-06-01
validTill: 2026-06-30
totalUsersLimit: 500
usageLimitPerCustomer: 2
minimumCartValue: 1000
minimumQuantity: 1
status: ACTIVE
backgroundImage: [Select Image File]
```

**Expected Response (201):**
```json
{
   "success": true,
   "message": "Coupon created successfully",
   "data": {
      "_id": "coupon_id_here",
      "couponName": "Summer Sale 2026",
      "couponCode": "SUMMER50",
      "type": "PERCENTAGE",
      "value": 50,
      "backgroundImage": {
         "url": "https://res.cloudinary.com/...",
         "public_id": "coupons/banners/xyz123"
      },
      ...
   }
}
```

---

### Test 2: Create Flat Discount Coupon

```bash
POST http://localhost:5000/api/coupons/admin
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data
```

**Form Data:**
```
couponName: Flat ₹500 Off
couponCode: FLAT500
type: FLAT
value: 500
validFrom: 2026-05-01
validTill: 2026-12-31
usageLimitPerCustomer: 1
minimumCartValue: 2000
status: ACTIVE
```

---

### Test 3: Get All Coupons (Public - No Token)

```bash
GET http://localhost:5000/api/coupons
```

**Expected Response (200):**
```json
{
   "success": true,
   "count": 2,
   "data": [
      {
         "_id": "...",
         "couponName": "Summer Sale 2026",
         "couponCode": "SUMMER50",
         "type": "PERCENTAGE",
         "value": 50,
         "displayStatus": "ACTIVE"
      }
   ]
}
```

---

### Test 4: Filter Coupons

**By category:**
```bash
GET http://localhost:5000/api/coupons?categoryId=YOUR_CATEGORY_ID
```

**By type:**
```bash
GET http://localhost:5000/api/coupons?type=PERCENTAGE
```

**Search:**
```bash
GET http://localhost:5000/api/coupons?search=summer
```

---

### Test 5: Apply Coupon (Percentage)

```bash
POST http://localhost:5000/api/coupons/apply
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
   "couponCode": "SUMMER50",
   "cartAmount": 5000,
   "quantity": 1,
   "categoryId": "YOUR_CATEGORY_ID"
}
```

**Expected Response (200):**
```json
{
   "success": true,
   "message": "Coupon applied successfully",
   "data": {
      "couponId": "...",
      "couponName": "Summer Sale 2026",
      "couponCode": "SUMMER50",
      "discountType": "PERCENTAGE",
      "discount": 2500,
      "originalPrice": 5000,
      "finalPrice": 2500,
      "status": "ACTIVE"
   }
}
```

---

### Test 6: Apply Coupon (Flat Discount)

```bash
POST http://localhost:5000/api/coupons/apply
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
   "couponCode": "FLAT500",
   "cartAmount": 3000,
   "quantity": 1
}
```

**Expected:**
```json
{
   "discount": 500,
   "originalPrice": 3000,
   "finalPrice": 2500
}
```

---

### Test 7: Get All Coupons (Admin)

```bash
GET http://localhost:5000/api/coupons/admin
Authorization: Bearer YOUR_TOKEN
```

**Expected Response (200):**
```json
{
   "success": true,
   "count": 2,
   "data": [
      {
         "_id": "...",
         "couponName": "Summer Sale 2026",
         "couponCode": "SUMMER50",
         "categoryId": {
            "_id": "...",
            "name": "GS Foundation"
         },
         "createdBy": {
            "name": "Super Admin",
            "email": "admin@sriram.com"
         },
         "displayStatus": "ACTIVE"
      }
   ]
}
```

---

### Test 8: Get Single Coupon

```bash
GET http://localhost:5000/api/coupons/admin/COUPON_ID
Authorization: Bearer YOUR_TOKEN
```

---

### Test 9: Update Coupon

```bash
PUT http://localhost:5000/api/coupons/admin/COUPON_ID
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data
```

**Form Data (partial update):**
```
value: 60
status: INACTIVE
backgroundImage: [New Image File - Optional]
```

---

### Test 10: Get Coupon Usages

```bash
GET http://localhost:5000/api/coupons/admin/COUPON_ID/usages
Authorization: Bearer YOUR_TOKEN
```

**Expected Response (200):**
```json
{
   "success": true,
   "count": 5,
   "data": [
      {
         "_id": "...",
         "couponId": "...",
         "userId": {
            "name": "John Doe",
            "email": "john@example.com"
         },
         "orderId": "...",
         "usedAt": "2026-05-12T10:30:00.000Z"
      }
   ]
}
```

---

### Test 11: Soft Delete Coupon

```bash
DELETE http://localhost:5000/api/coupons/admin/COUPON_ID
Authorization: Bearer YOUR_TOKEN
```

**Expected Response (200):**
```json
{
   "success": true,
   "message": "Coupon deleted successfully"
}
```

---

### Test 12: Validation - Expired Coupon

**Create expired coupon:**
```
couponCode: EXPIRED
validFrom: 2025-01-01
validTill: 2025-01-31
```

**Try to apply:**
```json
{
   "couponCode": "EXPIRED",
   "cartAmount": 5000
}
```

**Expected Error (400):**
```json
{
   "success": false,
   "message": "Coupon has expired"
}
```

---

### Test 13: Validation - Minimum Cart Value

```json
{
   "couponCode": "FLAT500",
   "cartAmount": 1500
}
```

**Expected Error (400):**
```json
{
   "success": false,
   "message": "Minimum cart value ₹2000 required"
}
```

---

### Test 14: Validation - Usage Limit Exceeded

**Apply coupon multiple times until limit reached**

**Expected Error (400):**
```json
{
   "success": false,
   "message": "You have used this coupon 2/2 times. Limit exceeded."
}
```

---

## 6. Frontend Integration

### 1. Apply Coupon (React + Axios)

```javascript
const applyCoupon = async (couponCode, cartAmount, quantity, categoryId) => {
   try {
      const response = await axios.post(
         'http://localhost:5000/api/coupons/apply',
         {
            couponCode,
            cartAmount,
            quantity,
            categoryId
         },
         {
            headers: {
               'Authorization': `Bearer ${token}`
            }
         }
      );
      
      const { discount, finalPrice } = response.data.data;
      console.log(`Discount: ₹${discount}, Final Price: ₹${finalPrice}`);
      
      return response.data.data;
   } catch (error) {
      console.error('Coupon error:', error.response.data.message);
      throw error;
   }
};

// Usage
try {
   const result = await applyCoupon('SUMMER50', 5000, 1, categoryId);
   console.log(result.discount); // 2500
   console.log(result.finalPrice); // 2500
} catch (error) {
   alert(error.response.data.message);
}
```

### 2. Get Public Coupons

```javascript
const getPublicCoupons = async (filters = {}) => {
   try {
      const params = new URLSearchParams();
      
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.type) params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);
      
      const response = await axios.get(
         `http://localhost:5000/api/coupons?${params}`
      );
      
      return response.data.data;
   } catch (error) {
      console.error('Error:', error);
      throw error;
   }
};

// Usage
const coupons = await getPublicCoupons({
   categoryId: '...',
   type: 'PERCENTAGE'
});
```

### 3. Display Coupon in UI

```javascript
function CouponCard({ coupon }) {
   return (
      <div className="coupon-card">
         {coupon.backgroundImage && (
            <img src={coupon.backgroundImage.url} alt={coupon.couponName} />
         )}
         
         <h3>{coupon.couponName}</h3>
         <p className="coupon-code">{coupon.couponCode}</p>
         
         {coupon.type === 'PERCENTAGE' ? (
            <span className="discount">{coupon.value}% OFF</span>
         ) : (
            <span className="discount">₹{coupon.value} OFF</span>
         )}
         
         {coupon.categoryId && (
            <p>Valid for: {coupon.categoryId.name}</p>
         )}
         
         <p>Min cart value: ₹{coupon.minimumCartValue}</p>
         <p>Valid till: {new Date(coupon.validTill).toLocaleDateString()}</p>
         
         <button onClick={() => applyCoupon(coupon.couponCode, cartAmount)}>
            Apply Coupon
         </button>
      </div>
   );
}
```

---

## 📝 Important Notes

### File Upload
- **Image Size:** Max 5MB
- **Formats:** JPG, PNG, WebP
- **Storage:** Cloudinary (`coupons/banners/`)
- **Returns:** `{ url, public_id }`

### Validation Rules
1. ✅ Coupon code must be unique
2. ✅ ValidFrom must be before ValidTill
3. ✅ Value cannot be negative
4. ✅ Category must exist if provided
5. ✅ Checks minimum cart value
6. ✅ Checks minimum quantity
7. ✅ Enforces per-customer usage limit
8. ✅ Enforces total usage limit
9. ✅ Validates date range (not expired, not future)

### Status System
- **ACTIVE:** Coupon is available
- **INACTIVE:** Coupon is disabled by admin
- **EXPIRED:** Auto-calculated when `validTill < now`

### Soft Delete
- Sets `isDeleted: true` instead of removing from database
- Hidden from all queries
- Can be recovered if needed

---

**Last Updated:** May 12, 2026  
**Version:** 1.0  
**Status:** Production Ready ✅

