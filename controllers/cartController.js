const Cart = require('../models/Cart');
const Course = require('../models/Course');
const Book = require('../models/Book');
const Enrollment = require('../models/Enrollment');
const Coupon = require('../models/Coupon');

// @desc    Add item to cart (Course or Book)
// @route   POST /api/cart/add
// @access  Private (Students)
exports.addToCart = async (req, res) => {
  try {
    const { itemType, itemId, courseMode, quantity } = req.body;

    // Validate required fields
    if (!itemType || !itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item type and item ID are required'
      });
    }

    // Validate item type
    if (!['COURSE', 'BOOK'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: 'Item type must be either COURSE or BOOK'
      });
    }

    // Type-safe validation for course mode
    if (itemType === 'COURSE') {
      if (!courseMode || !['online', 'offline'].includes(courseMode)) {
        return res.status(400).json({
          success: false,
          message: 'Course mode is required and must be either online or offline'
        });
      }
    }

    // Set quantity (courses always 1, books can be multiple)
    const itemQuantity = itemType === 'COURSE' ? 1 : (quantity || 1);

    // Fetch item details based on type
    let item;
    let actualPrice;
    let discountedPrice;
    let appliedOfferText = '';
    let isCouponApplicable = true;
    let itemSnapshot;

    if (itemType === 'COURSE') {
      item = await Course.findById(itemId).populate('center', 'name').populate('category', 'name');
      
      if (!item || !item.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Course not found or inactive'
        });
      }

      // Check if course mode is available
      if (!item.modes.includes(courseMode)) {
        return res.status(400).json({
          success: false,
          message: `Course is not available in ${courseMode} mode`
        });
      }

      // Check if student already enrolled
      const existingEnrollment = await Enrollment.findOne({
        student: req.user._id,
        course: itemId,
        mode: courseMode,
        isActive: true
      });

      if (existingEnrollment) {
        return res.status(400).json({
          success: false,
          message: 'Already enrolled in this course',
          alreadyEnrolled: true
        });
      }

      // Get pricing for the selected mode
      const fees = item.fees[courseMode];
      actualPrice = fees.actualPrice;
      discountedPrice = fees.discountedPrice;
      appliedOfferText = fees.offerText || '';

      // Create enhanced snapshot
      itemSnapshot = {
        title: item.title,
        image: item.bannerImage?.url || null,
        center: item.center?.name || null,
        category: item.category?.name || null,
        duration: item.duration || null,
        validity: item.accessValidityInDays ? `${item.accessValidityInDays} days` : null,
        mode: courseMode,
        deliveryCharge: 0, // Courses have no delivery charge
        inStock: true // Courses always in stock
      };

    } else if (itemType === 'BOOK') {
      item = await Book.findById(itemId);
      
      if (!item || !item.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Book not found or inactive'
        });
      }

      // Stock validation
      if (!item.inStock || item.stock <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Book is out of stock'
        });
      }

      // Validate requested quantity
      if (itemQuantity > item.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${item.stock} copies available in stock`
        });
      }

      actualPrice = item.fullPrice;
      discountedPrice = item.discountedPrice;
      appliedOfferText = item.offerText || '';
      isCouponApplicable = item.isCouponApplicable !== false;

      // Create enhanced snapshot
      itemSnapshot = {
        title: item.title,
        image: item.image?.url || null,
        authorNames: item.authorNames,
        subjects: item.subjects,
        deliveryCharge: item.deliveryCharge || 0,
        inStock: item.inStock
      };
    }

    // Find or create cart for user
    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      cart = new Cart({
        userId: req.user._id,
        items: []
      });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (cartItem) => {
        if (cartItem.itemType === itemType && cartItem.itemId.toString() === itemId) {
          // For courses, also check mode
          if (itemType === 'COURSE') {
            return cartItem.courseMode === courseMode;
          }
          return true;
        }
        return false;
      }
    );

    if (existingItemIndex > -1) {
      // Update quantity if item exists (only for books)
      if (itemType === 'BOOK') {
        const newQuantity = cart.items[existingItemIndex].quantity + itemQuantity;
        
        // Re-validate stock
        const book = await Book.findById(itemId);
        if (newQuantity > book.stock) {
          return res.status(400).json({
            success: false,
            message: `Only ${book.stock} copies available in stock`
          });
        }
        
        cart.items[existingItemIndex].quantity = newQuantity;
      }
      // For courses, just update the price snapshot (in case prices changed)
      cart.items[existingItemIndex].actualPrice = actualPrice;
      cart.items[existingItemIndex].discountedPrice = discountedPrice;
      cart.items[existingItemIndex].appliedOfferText = appliedOfferText;
      cart.items[existingItemIndex].isCouponApplicable = isCouponApplicable;
      cart.items[existingItemIndex].itemSnapshot = itemSnapshot;
    } else {
      // Add new item to cart
      cart.items.push({
        itemType,
        itemId,
        courseMode: itemType === 'COURSE' ? courseMode : undefined,
        quantity: itemQuantity,
        actualPrice,
        discountedPrice,
        appliedOfferText,
        isCouponApplicable,
        itemSnapshot
      });
    }

    // Save cart (totals auto-calculated by pre-save hook)
    await cart.save();

    // Populate item references for response
    const populatedCart = await Cart.findOne({ userId: req.user._id });

    res.status(200).json({
      success: true,
      message: 'Item added to cart successfully',
      cart: populatedCart
    });

  } catch (error) {
    console.error('Add to Cart Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding item to cart',
      error: error.message
    });
  }
};

// @desc    Apply coupon to cart
// @route   POST /api/cart/apply-coupon
// @access  Private (Students)
exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      });
    }

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Find coupon
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    // Check coupon validity
    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      return res.status(400).json({
        success: false,
        message: 'Coupon is not yet active'
      });
    }

    if (coupon.endDate && now > coupon.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Coupon has expired'
      });
    }

    // Check usage limit
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({
        success: false,
        message: 'Coupon usage limit reached'
      });
    }

    // Check minimum cart value
    if (coupon.minCartValue && cart.totalDiscountedPrice < coupon.minCartValue) {
      return res.status(400).json({
        success: false,
        message: `Minimum cart value should be ₹${coupon.minCartValue}`
      });
    }

    // Check if coupon is applicable to cart items
    let applicableItems = 0;
    cart.items.forEach(item => {
      if (item.isCouponApplicable !== false) {
        applicableItems++;
      }
    });

    if (applicableItems === 0) {
      return res.status(400).json({
        success: false,
        message: 'Coupon is not applicable to items in your cart'
      });
    }

    // Calculate coupon discount
    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((cart.totalDiscountedPrice * coupon.discountValue) / 100);
      
      // Apply max discount cap if exists
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else if (coupon.discountType === 'FLAT') {
      discountAmount = coupon.discountValue;
    }

    // Apply coupon to cart
    cart.appliedCoupon = {
      couponId: coupon._id,
      couponCode: coupon.code,
      discountAmount,
      discountType: coupon.discountType
    };

    cart.couponDiscount = discountAmount;

    // Save cart (finalAmount auto-calculated)
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      cart,
      savings: discountAmount
    });

  } catch (error) {
    console.error('Apply Coupon Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error applying coupon',
      error: error.message
    });
  }
};

// @desc    Remove coupon from cart
// @route   DELETE /api/cart/remove-coupon
// @access  Private (Students)
exports.removeCoupon = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Remove coupon
    cart.appliedCoupon = {
      couponId: null,
      couponCode: null,
      discountAmount: 0,
      discountType: null
    };

    cart.couponDiscount = 0;

    // Save cart (finalAmount auto-calculated)
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Coupon removed successfully',
      cart
    });

  } catch (error) {
    console.error('Remove Coupon Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing coupon',
      error: error.message
    });
  }
};

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private (Students)
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Cart is empty',
        cart: {
          items: [],
          totalItems: 0,
          totalActualPrice: 0,
          totalDiscountedPrice: 0,
          totalDiscount: 0
        }
      });
    }

    res.status(200).json({
      success: true,
      cart
    });

  } catch (error) {
    console.error('Get Cart Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cart',
      error: error.message
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:itemId
// @access  Private (Students)
exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { courseMode } = req.query; // Optional: for courses

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Find and remove item
    const initialLength = cart.items.length;
    
    cart.items = cart.items.filter((cartItem) => {
      if (cartItem.itemId.toString() === itemId) {
        // For courses, also check mode
        if (cartItem.itemType === 'COURSE' && courseMode) {
          return cartItem.courseMode !== courseMode;
        }
        // For books or courses without mode filter
        return false;
      }
      return true;
    });

    // Check if item was removed
    if (cart.items.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Save cart (totals auto-calculated)
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully',
      cart
    });

  } catch (error) {
    console.error('Remove from Cart Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing item from cart',
      error: error.message
    });
  }
};

// @desc    Update item quantity in cart
// @route   PUT /api/cart/update-quantity/:itemId
// @access  Private (Students)
exports.updateQuantity = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity, courseMode } = req.body;

    // Validate quantity
    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Find item in cart
    const itemIndex = cart.items.findIndex((cartItem) => {
      if (cartItem.itemId.toString() === itemId) {
        if (cartItem.itemType === 'COURSE' && courseMode) {
          return cartItem.courseMode === courseMode;
        }
        return true;
      }
      return false;
    });

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Check if item is a course (quantity always 1)
    if (cart.items[itemIndex].itemType === 'COURSE') {
      return res.status(400).json({
        success: false,
        message: 'Course quantity cannot be changed (always 1)'
      });
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;

    // Save cart (totals auto-calculated)
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Quantity updated successfully',
      cart
    });

  } catch (error) {
    console.error('Update Quantity Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating quantity',
      error: error.message
    });
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart/clear
// @access  Private (Students)
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Clear all items
    cart.items = [];

    // Save cart (totals auto-calculated)
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      cart
    });

  } catch (error) {
    console.error('Clear Cart Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cart',
      error: error.message
    });
  }
};

// @desc    Get cart total (calculated price summary)
// @route   GET /api/cart/total
// @access  Private (Students)
exports.getCartTotal = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Cart is empty',
        total: {
          totalItems: 0,
          totalActualPrice: 0,
          totalDiscountedPrice: 0,
          totalDiscount: 0,
          savings: 0,
          savingsPercent: 0
        }
      });
    }

    // Calculate savings percentage
    const savingsPercent = cart.totalActualPrice > 0 
      ? Math.round((cart.totalDiscount / cart.totalActualPrice) * 100) 
      : 0;

    res.status(200).json({
      success: true,
      total: {
        totalItems: cart.totalItems,
        totalActualPrice: cart.totalActualPrice,
        totalDiscountedPrice: cart.totalDiscountedPrice,
        totalDiscount: cart.totalDiscount,
        savings: cart.totalDiscount,
        savingsPercent
      }
    });

  } catch (error) {
    console.error('Get Cart Total Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating cart total',
      error: error.message
    });
  }
};

// @desc    Check if item is in cart
// @route   GET /api/cart/check/:itemType/:itemId
// @access  Private (Students)
exports.checkItemInCart = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const { courseMode } = req.query; // Optional: for courses

    // Validate item type
    if (!['COURSE', 'BOOK'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: 'Item type must be either COURSE or BOOK'
      });
    }

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(200).json({
        success: true,
        isInCart: false
      });
    }

    // Check if item exists in cart
    const isInCart = cart.items.some((cartItem) => {
      if (cartItem.itemType === itemType && cartItem.itemId.toString() === itemId) {
        if (itemType === 'COURSE' && courseMode) {
          return cartItem.courseMode === courseMode;
        }
        return true;
      }
      return false;
    });

    res.status(200).json({
      success: true,
      isInCart
    });

  } catch (error) {
    console.error('Check Item in Cart Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking item in cart',
      error: error.message
    });
  }
};
