const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
   applyCoupon,
   createCoupon,
   getCoupons,
   getCouponById,
   updateCoupon,
   deleteCoupon,
   getCouponUsages,
   getPublicCoupons
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
