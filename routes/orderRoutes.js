const express = require('express');
const router = express.Router();
const {
  getMyOrders,
  getOrder,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// User routes
router.get('/my-orders', protect, getMyOrders);
router.get('/:id', protect, getOrder);

// Admin routes
router.get('/', protect, authorize('super_admin', 'admin'), getAllOrders);
router.put('/:id/status', protect, authorize('super_admin', 'admin'), updateOrderStatus);

module.exports = router;
