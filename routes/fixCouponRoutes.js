const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const { protect, authorize } = require('../middleware/authMiddleware');

// @desc    Hard delete coupon by code (for fixing duplicate issues)
// @route   DELETE /api/coupons/fix-duplicate/:code
// @access  Private/Admin
router.delete('/fix-duplicate/:code', protect, authorize('admin'), async (req, res) => {
   try {
      const couponCode = req.params.code.toUpperCase();
      
      console.log('🔍 Searching for coupons with code:', couponCode);
      
      // Find ALL coupons with this code
      const coupons = await Coupon.find({ couponCode });
      
      if (coupons.length === 0) {
         return res.json({
            success: true,
            message: `No coupons found with code: ${couponCode}`,
            deletedCount: 0
         });
      }
      
      console.log(`📋 Found ${coupons.length} coupon(s)`);
      
      // Hard delete all
      const result = await Coupon.deleteMany({ couponCode });
      
      console.log(`✅ Deleted ${result.deletedCount} coupon(s)`);
      
      res.json({
         success: true,
         message: `Successfully deleted ${result.deletedCount} coupon(s)`,
         deletedCount: result.deletedCount,
         deletedCoupons: coupons.map(c => ({
            id: c._id,
            name: c.couponName,
            code: c.couponCode,
            isDeleted: c.isDeleted
         }))
      });
      
   } catch (error) {
      console.error('Error deleting coupon:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to delete coupon',
         error: error.message
      });
   }
});

module.exports = router;

