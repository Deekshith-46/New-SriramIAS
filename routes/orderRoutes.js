const express = require('express');
const router = express.Router();
const {
   getMyOrders,
   getOrderDetails,
   getAllOrders,
   updateOrderStatus,
   getOrderStats
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(protect);

// ========================================
// STUDENT ORDER ROUTES
// ========================================

// Get my orders (with optional filters)
router.get('/my-orders', getMyOrders);

// Get single order details
router.get('/:id', getOrderDetails);

// ========================================
// ADMIN ORDER ROUTES
// ========================================

// Get all orders (Admin only)
router.get('/', allowRoles('super_admin', 'center_admin'), getAllOrders);

// Get order statistics (Admin only)
router.get('/stats', allowRoles('super_admin', 'center_admin'), getOrderStats);

// Update order status (Admin only) - For BOOK orders
router.put('/:id/status', allowRoles('super_admin', 'center_admin'), updateOrderStatus);

module.exports = router;
