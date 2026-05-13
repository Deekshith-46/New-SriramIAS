const express = require('express');
const router = express.Router();
const {
   createOrder,
   verifyPayment,
   getMyEnrollments,
   checkCourseAccess,
   createBookOrder,
   verifyBookPayment,
   getMyBookOrders
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// All payment routes require authentication
router.use(protect);

// ========================================
// COURSE PAYMENT ROUTES
// ========================================

// Create Razorpay order for course
router.post('/course/create-order', createOrder);

// Verify course payment and create enrollment
router.post('/course/verify', verifyPayment);

// Get user's course enrollments
router.get('/course/my-enrollments', getMyEnrollments);

// Check course access
router.get('/course/check-access/:courseId', checkCourseAccess);

// ========================================
// BOOK PAYMENT ROUTES
// ========================================

// Create Razorpay order for book
router.post('/book/create-order', createBookOrder);

// Verify book payment and create order
router.post('/book/verify', verifyBookPayment);

// Get user's book orders
router.get('/book/my-orders', getMyBookOrders);

module.exports = router;
