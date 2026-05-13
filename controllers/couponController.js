const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const Category = require('../models/Category');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const cloudinary = require('../config/cloudinary');

// @desc    Apply coupon to cart
// @route   POST /api/coupons/apply
// @access  Private
exports.applyCoupon = async (req, res) => {
   try {
      const { couponCode, cartAmount, quantity, categoryId, purchaseType } = req.body;

      if (!couponCode || !cartAmount) {
         return res.status(400).json({
            success: false,
            message: 'Coupon code and cart amount are required'
         });
      }

      // Find coupon
      const coupon = await Coupon.findOne({
         couponCode: couponCode.toUpperCase(),
         isDeleted: false
      }).populate('categoryId', 'name');

      if (!coupon) {
         return res.status(404).json({
            success: false,
            message: 'Invalid coupon code'
         });
      }

      // Check status
      if (coupon.status === 'INACTIVE') {
         return res.status(400).json({
            success: false,
            message: 'Coupon is currently inactive'
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

      // CHECK APPLICABLE FOR (COURSE, BOOK, or BOTH)
      if (coupon.applicableFor === 'COURSE' && purchaseType !== 'COURSE') {
         return res.status(400).json({
            success: false,
            message: 'This coupon is only applicable for courses'
         });
      }

      if (coupon.applicableFor === 'BOOK' && purchaseType !== 'BOOK') {
         return res.status(400).json({
            success: false,
            message: 'This coupon is only applicable for books'
         });
      }

      // For COURSE coupons, categoryId is REQUIRED and must match
      if (coupon.applicableFor === 'COURSE') {
         if (!coupon.categoryId) {
            return res.status(400).json({
               success: false,
               message: 'Invalid coupon configuration: Course coupons require a category'
            });
         }
         
         if (!categoryId || categoryId.toString() !== coupon.categoryId._id.toString()) {
            return res.status(400).json({
               success: false,
               message: `This coupon is only applicable for ${coupon.categoryId.name} category`
            });
         }
      }

      // For BOTH coupons with categoryId, it must match if provided
      if (coupon.applicableFor === 'BOTH' && coupon.categoryId && purchaseType === 'COURSE') {
         if (!categoryId || categoryId.toString() !== coupon.categoryId._id.toString()) {
            return res.status(400).json({
               success: false,
               message: `This coupon is only applicable for ${coupon.categoryId.name} category`
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
            message: `Minimum quantity ${coupon.minimumQuantity} required`
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
            discountAmount: Math.round(discount),
            originalPrice: Math.round(originalPrice),
            finalAmount: Math.round(finalPrice),
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
// @route   POST /api/coupons
// @access  Private (Super Admin & Admin)
exports.createCoupon = async (req, res) => {
   try {
      const {
         couponName,
         couponCode,
         type,
         value,
         categoryId,
         applicableFor,
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
         applicableFor: applicableFor || 'BOTH',
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

// @desc    Get all coupons with filters
// @route   GET /api/coupons
// @access  Private (Super Admin & Admin)
exports.getCoupons = async (req, res) => {
   try {
      const { status, type, categoryId, search } = req.query;

      // Build filter
      const filter = { isDeleted: false };

      if (status && status !== 'EXPIRED') {
         filter.status = status;
      }

      if (type) {
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

// @desc    Get single coupon by ID
// @route   GET /api/coupons/:id
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
      const isExpired = now > coupon.validTill;
      couponObj.displayStatus = isExpired ? 'EXPIRED' : coupon.status;

      res.json({
         success: true,
         data: couponObj
      });

   } catch (error) {
      console.error('Get Coupon Error:', error);
      res.status(500).json({
         success: false,
         message: 'Server error while fetching coupon',
         error: error.message
      });
   }
};

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private (Super Admin & Admin)
exports.updateCoupon = async (req, res) => {
   try {
      const coupon = await Coupon.findOne({
         _id: req.params.id,
         isDeleted: false
      });

      if (!coupon) {
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
         applicableFor,
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
      if (applicableFor) coupon.applicableFor = applicableFor;
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

// @desc    Delete coupon (hard delete - permanently removes from database)
// @route   DELETE /api/coupons/:id
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

      // Delete image from Cloudinary if exists
      if (coupon.backgroundImage && coupon.backgroundImage.public_id) {
         await cloudinary.uploader.destroy(coupon.backgroundImage.public_id);
      }

      // Hard delete - permanently remove from database
      await Coupon.findByIdAndDelete(req.params.id);

      res.json({
         success: true,
         message: 'Coupon permanently deleted'
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
// @route   GET /api/coupons/:id/usages
// @access  Private (Super Admin & Admin)
exports.getCouponUsages = async (req, res) => {
   try {
      const coupon = await Coupon.findById(req.params.id);

      if (!coupon) {
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

