const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  addToCart,
  getCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  getCartTotal,
  checkItemInCart,
  applyCoupon,
  removeCoupon
} = require('../controllers/cartController');

// ==========================================
// CART ROUTES (All require authentication)
// ==========================================

// Add item to cart (Course or Book)
router.post('/add', protect, addToCart);

// Get user's cart with all items
router.get('/', protect, getCart);

// Remove item from cart
router.delete('/remove/:itemId', protect, removeFromCart);

// Update item quantity in cart (only for books)
router.put('/update-quantity/:itemId', protect, updateQuantity);

// Clear entire cart
router.delete('/clear', protect, clearCart);

// Get cart total (price summary)
router.get('/total', protect, getCartTotal);

// Check if item is already in cart
router.get('/check/:itemType/:itemId', protect, checkItemInCart);

// Apply coupon to cart
router.post('/apply-coupon', protect, applyCoupon);

// Remove coupon from cart
router.delete('/remove-coupon', protect, removeCoupon);

module.exports = router;
