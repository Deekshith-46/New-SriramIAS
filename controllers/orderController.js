const Order = require('../models/Order');
const Enrollment = require('../models/Enrollment');
const BookOrder = require('../models/BookOrder');

// @desc    Get my orders (Student)
// @route   GET /api/orders/my-orders
// @access  Private
exports.getMyOrders = async (req, res) => {
   try {
      const { orderType, status, page = 1, limit = 10 } = req.query;
      
      // Build query
      const query = { userId: req.user._id };
      
      if (orderType && ['COURSE', 'BOOK'].includes(orderType)) {
         query.orderType = orderType;
      }
      
      if (status) {
         // Check if it's payment status or order status
         if (['PENDING', 'PAID', 'FAILED', 'REFUNDED'].includes(status)) {
            query.paymentStatus = status;
         } else {
            query.orderStatus = status;
         }
      }
      
      // Get orders
      const orders = await Order.find(query)
         .populate('courseId', 'title slug bannerImage')
         .populate('bookId', 'title image discountedPrice')
         .sort({ createdAt: -1 })
         .limit(limit * 1)
         .skip((page - 1) * limit);
      
      const total = await Order.countDocuments(query);
      
      res.json({
         success: true,
         count: orders.length,
         total,
         pages: Math.ceil(total / limit),
         currentPage: page,
         data: orders
      });
      
   } catch (error) {
      console.error('Get My Orders Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch orders',
         error: error.message
      });
   }
};

// @desc    Get single order details (Student)
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderDetails = async (req, res) => {
   try {
      const order = await Order.findOne({
         _id: req.params.id,
         userId: req.user._id
      })
         .populate('courseId', 'title slug bannerImage fees')
         .populate('bookId', 'title image discountedPrice authorNames');
      
      if (!order) {
         return res.status(404).json({
            success: false,
            message: 'Order not found'
         });
      }
      
      res.json({
         success: true,
         data: order
      });
      
   } catch (error) {
      console.error('Get Order Details Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch order details',
         error: error.message
      });
   }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
   try {
      const { orderType, paymentStatus, orderStatus, page = 1, limit = 20 } = req.query;
      
      // Build query
      const query = {};
      
      if (orderType && ['COURSE', 'BOOK'].includes(orderType)) {
         query.orderType = orderType;
      }
      
      if (paymentStatus) {
         query.paymentStatus = paymentStatus;
      }
      
      if (orderStatus) {
         query.orderStatus = orderStatus;
      }
      
      // Get orders
      const orders = await Order.find(query)
         .populate('userId', 'name email mobile')
         .populate('courseId', 'title')
         .populate('bookId', 'title')
         .sort({ createdAt: -1 })
         .limit(limit * 1)
         .skip((page - 1) * limit);
      
      const total = await Order.countDocuments(query);
      
      // Get statistics
      const stats = await Order.aggregate([
         { $match: query },
         {
            $group: {
               _id: null,
               totalOrders: { $sum: 1 },
               totalRevenue: { $sum: '$finalAmount' },
               paidOrders: {
                  $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, 1, 0] }
               },
               pendingOrders: {
                  $sum: { $cond: [{ $eq: ['$paymentStatus', 'PENDING'] }, 1, 0] }
               }
            }
         }
      ]);
      
      res.json({
         success: true,
         count: orders.length,
         total,
         pages: Math.ceil(total / limit),
         currentPage: page,
         stats: stats[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            paidOrders: 0,
            pendingOrders: 0
         },
         data: orders
      });
      
   } catch (error) {
      console.error('Get All Orders Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch orders',
         error: error.message
      });
   }
};

// @desc    Update order status (Admin) - For BOOK orders
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
   try {
      const { orderStatus, courierName, trackingNumber } = req.body;
      
      // Validate order status
      const validStatuses = ['PLACED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'];
      if (!validStatuses.includes(orderStatus)) {
         return res.status(400).json({
            success: false,
            message: `Invalid order status. Must be one of: ${validStatuses.join(', ')}`
         });
      }
      
      const order = await Order.findById(req.params.id);
      
      if (!order) {
         return res.status(404).json({
            success: false,
            message: 'Order not found'
         });
      }
      
      // Only BOOK orders have orderStatus
      if (order.orderType !== 'BOOK') {
         return res.status(400).json({
            success: false,
            message: 'Order status can only be updated for book orders'
         });
      }
      
      // Update order status
      order.orderStatus = orderStatus;
      
      // Add tracking info if provided
      if (courierName) order.courierName = courierName;
      if (trackingNumber) order.trackingNumber = trackingNumber;
      
      // Update timestamps
      if (orderStatus === 'SHIPPED' && !order.shippedAt) {
         order.shippedAt = new Date();
      }
      
      if (orderStatus === 'DELIVERED' && !order.deliveredAt) {
         order.deliveredAt = new Date();
      }
      
      await order.save();
      
      res.json({
         success: true,
         message: 'Order status updated successfully',
         data: order
      });
      
   } catch (error) {
      console.error('Update Order Status Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to update order status',
         error: error.message
      });
   }
};

// @desc    Get order statistics (Admin)
// @route   GET /api/orders/stats
// @access  Private/Admin
exports.getOrderStats = async (req, res) => {
   try {
      const stats = await Order.aggregate([
         {
            $group: {
               _id: '$orderType',
               count: { $sum: 1 },
               totalRevenue: { $sum: '$finalAmount' },
               avgOrderValue: { $avg: '$finalAmount' }
            }
         }
      ]);
      
      const paymentStats = await Order.aggregate([
         {
            $group: {
               _id: '$paymentStatus',
               count: { $sum: 1 },
               totalAmount: { $sum: '$finalAmount' }
            }
         }
      ]);
      
      const orderStatusStats = await Order.aggregate([
         { $match: { orderType: 'BOOK' } },
         {
            $group: {
               _id: '$orderStatus',
               count: { $sum: 1 }
            }
         }
      ]);
      
      res.json({
         success: true,
         data: {
            byType: stats,
            byPaymentStatus: paymentStats,
            byOrderStatus: orderStatusStats
         }
      });
      
   } catch (error) {
      console.error('Get Order Stats Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch order statistics',
         error: error.message
      });
   }
};
