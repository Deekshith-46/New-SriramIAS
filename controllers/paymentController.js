const razorpay = require('../config/razorpay');
const Course = require('../models/Course');
const Book = require('../models/Book');
const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const Enrollment = require('../models/Enrollment');
const BookOrder = require('../models/BookOrder');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');

// @desc    Create Razorpay Order
// @route   POST /api/payments/create-order
// @access  Private (Authenticated users)
exports.createOrder = async (req, res) => {
   try {
      const { courseId, couponCode, enrolledMode } = req.body;

      // Validate required fields
      if (!courseId || !enrolledMode) {
         return res.status(400).json({
            success: false,
            message: 'Course ID and enrolled mode are required'
         });
      }

      // Fetch course
      const course = await Course.findById(courseId).populate('center');
      if (!course) {
         return res.status(404).json({
            success: false,
            message: 'Course not found'
         });
      }

      // Check if course is active
      if (!course.isActive) {
         return res.status(400).json({
            success: false,
            message: 'Course is not available for enrollment'
         });
      }

      // Check already enrolled
      const existingEnrollment = await Enrollment.findOne({
         userId: req.user._id,
         courseId,
         status: { $in: ['active', 'completed'] }
      });

      if (existingEnrollment) {
         return res.status(400).json({
            success: false,
            message: 'Already enrolled in this course'
         });
      }

      // Get price based on mode
      let actualPrice, priceDetails;
      if (enrolledMode === 'online') {
         actualPrice = course.fees.online.discountedPrice;
         priceDetails = course.fees.online;
      } else if (enrolledMode === 'offline') {
         actualPrice = course.fees.offline.discountedPrice;
         priceDetails = course.fees.offline;
      } else {
         return res.status(400).json({
            success: false,
            message: 'Invalid enrolled mode. Use "online" or "offline"'
         });
      }

      let finalPrice = actualPrice;
      let discountAmount = 0;
      let appliedCoupon = null;

      // Apply coupon if provided
      if (couponCode) {
         const coupon = await Coupon.findOne({
            couponCode: couponCode.toUpperCase(),
            status: 'ACTIVE',
            isDeleted: false
         });

         if (!coupon) {
            return res.status(400).json({
               success: false,
               message: 'Invalid coupon code'
            });
         }

         // Applicable for validation
         if (coupon.applicableFor !== 'BOTH' && coupon.applicableFor !== 'COURSE') {
            return res.status(400).json({
               success: false,
               message: 'This coupon is not applicable for courses'
            });
         }

         // COURSE coupons MUST have categoryId (specific category only)
         if (coupon.applicableFor === 'COURSE' && !coupon.categoryId) {
            return res.status(400).json({
               success: false,
               message: 'Invalid coupon configuration: Course coupons require a category'
            });
         }

         // Check validity
         const now = new Date();
         if (now < coupon.validFrom || now > coupon.validTill) {
            return res.status(400).json({
               success: false,
               message: 'Coupon has expired or not yet active'
            });
         }

         // Category validation (required for COURSE coupons, optional for BOTH)
         if (coupon.categoryId && course.category.toString() !== coupon.categoryId.toString()) {
            return res.status(400).json({
               success: false,
               message: 'This coupon is not valid for this course category'
            });
         }

         // Check minimum cart value
         if (actualPrice < coupon.minimumCartValue) {
            return res.status(400).json({
               success: false,
               message: `Minimum cart value ₹${coupon.minimumCartValue} required`
            });
         }

         // Check usage limits
         if (coupon.totalUsersLimit && coupon.usedCount >= coupon.totalUsersLimit) {
            return res.status(400).json({
               success: false,
               message: 'Coupon usage limit reached'
            });
         }

         const userUsage = await CouponUsage.countDocuments({
            couponId: coupon._id,
            userId: req.user._id
         });

         if (userUsage >= coupon.usageLimitPerCustomer) {
            return res.status(400).json({
               success: false,
               message: 'You have already used this coupon maximum times allowed'
            });
         }

         // Calculate discount
         if (coupon.type === 'PERCENTAGE') {
            discountAmount = (actualPrice * coupon.value) / 100;
         } else if (coupon.type === 'FLAT') {
            discountAmount = coupon.value;
         }

         finalPrice = Math.max(0, actualPrice - discountAmount);
         appliedCoupon = coupon;
      }

      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
         amount: finalPrice * 100, // Convert to paise
         currency: 'INR',
         receipt: `receipt_${Date.now()}`,
         notes: {
            courseId: courseId,
            userId: req.user._id.toString(),
            enrolledMode: enrolledMode,
            couponCode: couponCode || 'none'
         }
      });

      res.json({
         success: true,
         data: {
            razorpayOrderId: razorpayOrder.id,
            amount: finalPrice,
            actualPrice: actualPrice,
            discountAmount: discountAmount,
            currency: 'INR',
            key: process.env.RAZORPAY_KEY_ID,
            course: {
               title: course.title,
               mode: enrolledMode
            },
            coupon: appliedCoupon ? {
               code: appliedCoupon.couponCode,
               type: appliedCoupon.type,
               value: appliedCoupon.value
            } : null
         }
      });

   } catch (error) {
      console.error('Create Order Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to create payment order',
         error: error.message
      });
   }
};

// @desc    Verify Payment and Create Enrollment
// @route   POST /api/payments/verify
// @access  Private (Authenticated users)
exports.verifyPayment = async (req, res) => {
   try {
      const {
         razorpay_order_id,
         razorpay_payment_id,
         razorpay_signature,
         courseId,
         couponCode,
         enrolledMode
      } = req.body;

      // Verify required fields
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
         return res.status(400).json({
            success: false,
            message: 'Payment details are required'
         });
      }

      // Verify signature
      const generatedSignature = crypto
         .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
         .update(razorpay_order_id + '|' + razorpay_payment_id)
         .digest('hex');

      if (generatedSignature !== razorpay_signature) {
         return res.status(400).json({
            success: false,
            message: 'Payment verification failed. Invalid signature.'
         });
      }

      // Fetch course
      const course = await Course.findById(courseId).populate('center category');
      if (!course) {
         return res.status(404).json({
            success: false,
            message: 'Course not found'
         });
      }

      // Calculate price AGAIN (never trust frontend)
      let actualPrice, finalPrice, discountAmount = 0;
      
      if (enrolledMode === 'online') {
         actualPrice = course.fees.online.discountedPrice;
      } else {
         actualPrice = course.fees.offline.discountedPrice;
      }

      finalPrice = actualPrice;

      // Apply coupon AGAIN if provided
      let appliedCoupon = null;
      if (couponCode) {
         appliedCoupon = await Coupon.findOne({
            couponCode: couponCode.toUpperCase(),
            status: 'ACTIVE',
            isDeleted: false
         });

         if (appliedCoupon) {
            if (appliedCoupon.type === 'PERCENTAGE') {
               discountAmount = (actualPrice * appliedCoupon.value) / 100;
            } else if (appliedCoupon.type === 'FLAT') {
               discountAmount = appliedCoupon.value;
            }
            finalPrice = Math.max(0, actualPrice - discountAmount);
         }
      }

      // Fetch Razorpay order to verify amount
      const order = await razorpay.orders.fetch(razorpay_order_id);
      
      if (order.amount !== finalPrice * 100) {
         return res.status(400).json({
            success: false,
            message: 'Payment amount mismatch. Possible tampering detected.'
         });
      }

      // Generate receipt number
      const receiptNumber = `RCPT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Calculate access validity
      const enrolledAt = new Date();
      let accessValidTill = null;
      if (course.accessValidityInDays) {
         accessValidTill = new Date(
            enrolledAt.getTime() + course.accessValidityInDays * 24 * 60 * 60 * 1000
         );
      }

      // Create enrollment
      const enrollment = await Enrollment.create({
         userId: req.user._id,
         courseId,
         centerId: course.center._id,
         paymentType: 'full',
         courseMode: enrolledMode,
         status: 'active',
         totalFees: actualPrice,
         discount: discountAmount,
         couponCode: couponCode || null,
         amountPaid: finalPrice,
         amountDue: 0,
         installments: [
            {
               installmentNo: 1,
               amount: finalPrice,
               dueDate: enrolledAt,
               status: 'paid',
               paidAt: enrolledAt,
               razorpayOrderId: razorpay_order_id,
               razorpayPaymentId: razorpay_payment_id
            }
         ],
         courseSnapshot: {
            title: course.title,
            slug: course.slug,
            totalFees: actualPrice,
            centerName: course.center.name,
            categoryName: course.category?.name || ''
         },
         enrolledAt: enrolledAt,
         accessValidTill: accessValidTill,
         receiptNumber: receiptNumber,
         razorpayPaymentId: razorpay_payment_id,
         razorpayOrderId: razorpay_order_id,
         razorpaySignature: razorpay_signature
      });

      // Track coupon usage
      if (appliedCoupon) {
         await CouponUsage.create({
            couponId: appliedCoupon._id,
            userId: req.user._id,
            orderId: enrollment._id
         });

         // Increment coupon used count
         appliedCoupon.usedCount += 1;
         await appliedCoupon.save();
      }

      // Generate receipt PDF
      const receiptUrl = await generateReceiptPDF(enrollment, course, req.user);

      // Update enrollment with receipt URL
      enrollment.receiptUrl = receiptUrl;
      await enrollment.save();

      res.json({
         success: true,
         message: 'Payment successful! Enrollment completed.',
         data: {
            enrollment: {
               id: enrollment._id,
               receiptNumber: enrollment.receiptNumber,
               receiptUrl: enrollment.receiptUrl,
               courseTitle: course.title,
               enrolledMode: enrolledMode,
               amountPaid: finalPrice,
               accessValidTill: accessValidTill
            }
         }
      });

   } catch (error) {
      console.error('Verify Payment Error:', error);
      res.status(500).json({
         success: false,
         message: 'Payment verification failed',
         error: error.message
      });
   }
};

// @desc    Generate Receipt PDF
// @route   Internal helper
async function generateReceiptPDF(enrollment, course, user) {
   return new Promise(async (resolve, reject) => {
      try {
         const doc = new PDFDocument();
         const fileName = `receipt_${enrollment.receiptNumber}.pdf`;
         const filePath = path.join(__dirname, '../temp', fileName);

         // Create temp directory if it doesn't exist
         const tempDir = path.join(__dirname, '../temp');
         if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
         }

         const stream = fs.createWriteStream(filePath);
         doc.pipe(stream);

         // Receipt Header
         doc.fontSize(24).text('PAYMENT RECEIPT', { align: 'center' });
         doc.moveDown();

         // Receipt Details
         doc.fontSize(12);
         doc.text(`Receipt Number: ${enrollment.receiptNumber}`);
         doc.text(`Date: ${new Date(enrollment.enrolledAt).toLocaleDateString('en-IN')}`);
         doc.moveDown();

         // Student Details
         doc.fontSize(14).text('Student Details', { underline: true });
         doc.fontSize(12);
         doc.text(`Name: ${user.name}`);
         doc.text(`Email: ${user.email || 'N/A'}`);
         doc.text(`Mobile: ${user.mobile || 'N/A'}`);
         doc.moveDown();

         // Course Details
         doc.fontSize(14).text('Course Details', { underline: true });
         doc.fontSize(12);
         doc.text(`Course: ${course.title}`);
         doc.text(`Mode: ${enrollment.courseMode.toUpperCase()}`);
         doc.text(`Center: ${course.center?.name || 'N/A'}`);
         doc.moveDown();

         // Payment Details
         doc.fontSize(14).text('Payment Details', { underline: true });
         doc.fontSize(12);
         doc.text(`Actual Price: ₹${enrollment.totalFees.toLocaleString('en-IN')}`);
         
         if (enrollment.discount > 0) {
            doc.text(`Discount: -₹${enrollment.discount.toLocaleString('en-IN')}`);
            if (enrollment.couponCode) {
               doc.text(`Coupon: ${enrollment.couponCode}`);
            }
         }
         
         doc.fontSize(16).text(`Amount Paid: ₹${enrollment.amountPaid.toLocaleString('en-IN')}`, { bold: true });
         doc.moveDown();

         // Transaction Details
         doc.fontSize(12);
         doc.text(`Payment ID: ${enrollment.razorpayPaymentId}`);
         doc.text(`Order ID: ${enrollment.razorpayOrderId}`);
         doc.text(`Status: PAID`);
         doc.moveDown();

         // Access Validity
         if (enrollment.accessValidTill) {
            doc.text(`Access Valid Till: ${new Date(enrollment.accessValidTill).toLocaleDateString('en-IN')}`);
         }

         // Footer
         doc.moveDown(2);
         doc.fontSize(10).text('Thank you for your enrollment!', { align: 'center' });
         doc.text('This is a computer-generated receipt.', { align: 'center' });

         doc.end();

         stream.on('finish', async () => {
            // Upload to Cloudinary
            try {
               const result = await cloudinary.uploader.upload(filePath, {
                  folder: 'receipts',
                  resource_type: 'raw',
                  format: 'pdf'
               });

               // Delete local file
               fs.unlinkSync(filePath);

               resolve(result.secure_url);
            } catch (uploadError) {
               reject(uploadError);
            }
         });

         stream.on('error', (error) => {
            reject(error);
         });

      } catch (error) {
         reject(error);
      }
   });
}

// @desc    Get User Enrollments
// @route   GET /api/payments/my-enrollments
// @access  Private (Authenticated users)
exports.getMyEnrollments = async (req, res) => {
   try {
      const enrollments = await Enrollment.find({ userId: req.user._id })
         .populate('courseId', 'title slug bannerImage fees')
         .populate('centerId', 'name')
         .sort({ enrolledAt: -1 });

      res.json({
         success: true,
         count: enrollments.length,
         data: enrollments
      });

   } catch (error) {
      console.error('Get Enrollments Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch enrollments',
         error: error.message
      });
   }
};

// @desc    Check Course Access
// @route   GET /api/payments/check-access/:courseId
// @access  Private (Authenticated users)
exports.checkCourseAccess = async (req, res) => {
   try {
      const { courseId } = req.params;

      const enrollment = await Enrollment.findOne({
         userId: req.user._id,
         courseId,
         status: { $in: ['active', 'completed'] }
      }).populate('courseId', 'title');

      if (!enrollment) {
         return res.json({
            success: true,
            hasAccess: false,
            message: 'No active enrollment found'
         });
      }

      // Check if access has expired
      const now = new Date();
      const hasExpired = enrollment.accessValidTill && now > enrollment.accessValidTill;

      if (hasExpired) {
         return res.json({
            success: true,
            hasAccess: false,
            message: 'Course access has expired',
            accessValidTill: enrollment.accessValidTill
         });
      }

      res.json({
         success: true,
         hasAccess: true,
         enrollment: {
            id: enrollment._id,
            status: enrollment.status,
            enrolledAt: enrollment.enrolledAt,
            accessValidTill: enrollment.accessValidTill,
            receiptNumber: enrollment.receiptNumber,
            receiptUrl: enrollment.receiptUrl
         }
      });

   } catch (error) {
      console.error('Check Access Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to check access',
         error: error.message
      });
   }
};

// ========================================
// BOOK PAYMENT FUNCTIONS
// ========================================

// @desc    Create Book Order (Razorpay)
// @route   POST /api/payments/book/create-order
// @access  Private (Authenticated users)
exports.createBookOrder = async (req, res) => {
   try {
      const { bookId, couponCode, quantity, shippingAddress } = req.body;

      // Validate required fields
      if (!bookId || !shippingAddress) {
         return res.status(400).json({
            success: false,
            message: 'Book ID and shipping address are required'
         });
      }

      // Validate shipping address
      if (!shippingAddress.fullName || !shippingAddress.mobile || 
          !shippingAddress.addressLine || !shippingAddress.city || 
          !shippingAddress.state || !shippingAddress.pincode) {
         return res.status(400).json({
            success: false,
            message: 'Complete shipping address is required'
         });
      }

      // Fetch book
      const book = await Book.findById(bookId);
      if (!book) {
         return res.status(404).json({
            success: false,
            message: 'Book not found'
         });
      }

      // Check if book is active
      if (!book.isActive) {
         return res.status(400).json({
            success: false,
            message: 'Book is not available for purchase'
         });
      }

      const bookQty = quantity || 1;
      const actualPrice = book.discountedPrice * bookQty;
      const deliveryCharge = 50; // Fixed delivery charge

      let finalPrice = actualPrice + deliveryCharge;
      let discountAmount = 0;
      let appliedCoupon = null;

      // Apply coupon if provided
      if (couponCode) {
         const coupon = await Coupon.findOne({
            couponCode: couponCode.toUpperCase(),
            status: 'ACTIVE',
            isDeleted: false
         });

         if (!coupon) {
            return res.status(400).json({
               success: false,
               message: 'Invalid coupon code'
            });
         }

         // Check applicableFor (COURSE/BOOK/BOTH)
         if (coupon.applicableFor !== 'BOTH' && coupon.applicableFor !== 'BOOK') {
            return res.status(400).json({
               success: false,
               message: 'This coupon is not applicable for books'
            });
         }

         // Check validity
         const now = new Date();
         if (now < coupon.validFrom || now > coupon.validTill) {
            return res.status(400).json({
               success: false,
               message: 'Coupon has expired or not yet active'
            });
         }

         // Check minimum cart value
         if (actualPrice < coupon.minimumCartValue) {
            return res.status(400).json({
               success: false,
               message: `Minimum cart value ₹${coupon.minimumCartValue} required`
            });
         }

         // Check usage limits
         if (coupon.totalUsersLimit && coupon.usedCount >= coupon.totalUsersLimit) {
            return res.status(400).json({
               success: false,
               message: 'Coupon usage limit reached'
            });
         }

         const userUsage = await CouponUsage.countDocuments({
            couponId: coupon._id,
            userId: req.user._id
         });

         if (userUsage >= coupon.usageLimitPerCustomer) {
            return res.status(400).json({
               success: false,
               message: 'You have already used this coupon maximum times allowed'
            });
         }

         // Calculate discount
         if (coupon.type === 'PERCENTAGE') {
            discountAmount = (actualPrice * coupon.value) / 100;
         } else if (coupon.type === 'FLAT') {
            discountAmount = coupon.value;
         }

         finalPrice = Math.max(0, actualPrice - discountAmount + deliveryCharge);
         appliedCoupon = coupon;
      }

      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
         amount: finalPrice * 100, // Convert to paise
         currency: 'INR',
         receipt: `book_receipt_${Date.now()}`,
         notes: {
            bookId: bookId,
            userId: req.user._id.toString(),
            quantity: bookQty.toString(),
            couponCode: couponCode || 'none'
         }
      });

      res.json({
         success: true,
         data: {
            razorpayOrderId: razorpayOrder.id,
            amount: finalPrice,
            actualPrice: actualPrice,
            deliveryCharge: deliveryCharge,
            discountAmount: discountAmount,
            currency: 'INR',
            key: process.env.RAZORPAY_KEY_ID,
            book: {
               title: book.title,
               quantity: bookQty
            },
            coupon: appliedCoupon ? {
               code: appliedCoupon.couponCode,
               type: appliedCoupon.type,
               value: appliedCoupon.value
            } : null
         }
      });

   } catch (error) {
      console.error('Create Book Order Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to create book order',
         error: error.message
      });
   }
};

// @desc    Verify Book Payment and Create Order
// @route   POST /api/payments/book/verify
// @access  Private (Authenticated users)
exports.verifyBookPayment = async (req, res) => {
   try {
      const {
         razorpay_order_id,
         razorpay_payment_id,
         razorpay_signature,
         bookId,
         couponCode,
         quantity,
         shippingAddress
      } = req.body;

      // Verify required fields
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
         return res.status(400).json({
            success: false,
            message: 'Payment details are required'
         });
      }

      // Verify signature
      const generatedSignature = crypto
         .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
         .update(razorpay_order_id + '|' + razorpay_payment_id)
         .digest('hex');

      if (generatedSignature !== razorpay_signature) {
         return res.status(400).json({
            success: false,
            message: 'Payment verification failed. Invalid signature.'
         });
      }

      // Fetch book
      const book = await Book.findById(bookId);
      if (!book) {
         return res.status(404).json({
            success: false,
            message: 'Book not found'
         });
      }

      // Calculate price AGAIN (never trust frontend)
      const bookQty = quantity || 1;
      const actualPrice = book.discountedPrice * bookQty;
      const deliveryCharge = 50;
      let finalPrice = actualPrice + deliveryCharge;
      let discountAmount = 0;

      // Apply coupon AGAIN if provided
      let appliedCoupon = null;
      if (couponCode) {
         appliedCoupon = await Coupon.findOne({
            couponCode: couponCode.toUpperCase(),
            status: 'ACTIVE',
            isDeleted: false
         });

         if (appliedCoupon) {
            // Verify applicableFor
            if (appliedCoupon.applicableFor === 'COURSE') {
               return res.status(400).json({
                  success: false,
                  message: 'This coupon is not applicable for books'
               });
            }

            if (appliedCoupon.type === 'PERCENTAGE') {
               discountAmount = (actualPrice * appliedCoupon.value) / 100;
            } else if (appliedCoupon.type === 'FLAT') {
               discountAmount = appliedCoupon.value;
            }
            finalPrice = Math.max(0, actualPrice - discountAmount + deliveryCharge);
         }
      }

      // Fetch Razorpay order to verify amount
      const order = await razorpay.orders.fetch(razorpay_order_id);
      
      if (order.amount !== finalPrice * 100) {
         return res.status(400).json({
            success: false,
            message: 'Payment amount mismatch. Possible tampering detected.'
         });
      }

      // Generate receipt number
      const receiptNumber = `BOOK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create book order
      const bookOrder = await BookOrder.create({
         userId: req.user._id,
         bookId,
         quantity: bookQty,
         actualPrice: actualPrice,
         couponCode: couponCode || null,
         discountAmount: discountAmount,
         finalAmount: finalPrice,
         deliveryCharge: deliveryCharge,
         paymentStatus: 'PAID',
         orderStatus: 'PLACED',
         razorpayPaymentId: razorpay_payment_id,
         razorpayOrderId: razorpay_order_id,
         razorpaySignature: razorpay_signature,
         shippingAddress: {
            fullName: shippingAddress.fullName,
            mobile: shippingAddress.mobile,
            email: shippingAddress.email || '',
            addressLine: shippingAddress.addressLine,
            city: shippingAddress.city,
            state: shippingAddress.state,
            pincode: shippingAddress.pincode,
            landmark: shippingAddress.landmark || ''
         },
         receiptNumber: receiptNumber,
         bookSnapshot: {
            title: book.title,
            authorNames: book.authorNames,
            price: book.discountedPrice
         }
      });

      // Track coupon usage
      if (appliedCoupon) {
         await CouponUsage.create({
            couponId: appliedCoupon._id,
            userId: req.user._id,
            orderId: bookOrder._id
         });

         // Increment coupon used count
         appliedCoupon.usedCount += 1;
         await appliedCoupon.save();
      }

      // Generate Invoice PDF
      const invoiceUrl = await generateInvoicePDF(bookOrder, book, req.user);

      // Update order with invoice URL
      bookOrder.invoiceUrl = invoiceUrl;
      await bookOrder.save();

      res.json({
         success: true,
         message: 'Book order placed successfully!',
         data: {
            order: {
               id: bookOrder._id,
               receiptNumber: bookOrder.receiptNumber,
               invoiceUrl: bookOrder.invoiceUrl,
               bookTitle: book.title,
               quantity: bookQty,
               totalAmount: finalPrice,
               orderStatus: bookOrder.orderStatus,
               estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')
            }
         }
      });

   } catch (error) {
      console.error('Verify Book Payment Error:', error);
      res.status(500).json({
         success: false,
         message: 'Book payment verification failed',
         error: error.message
      });
   }
};

// @desc    Get User Book Orders
// @route   GET /api/payments/book/my-orders
// @access  Private (Authenticated users)
exports.getMyBookOrders = async (req, res) => {
   try {
      const orders = await BookOrder.find({ userId: req.user._id })
         .populate('bookId', 'title image discountedPrice')
         .sort({ createdAt: -1 });

      res.json({
         success: true,
         count: orders.length,
         data: orders
      });

   } catch (error) {
      console.error('Get Book Orders Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch book orders',
         error: error.message
      });
   }
};

// @desc    Generate Invoice PDF for Book Order
// @route   Internal helper
async function generateInvoicePDF(bookOrder, book, user) {
   return new Promise(async (resolve, reject) => {
      try {
         const doc = new PDFDocument();
         const fileName = `invoice_${bookOrder.receiptNumber}.pdf`;
         const filePath = path.join(__dirname, '../temp', fileName);

         // Create temp directory if it doesn't exist
         const tempDir = path.join(__dirname, '../temp');
         if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
         }

         const stream = fs.createWriteStream(filePath);
         doc.pipe(stream);

         // Invoice Header
         doc.fontSize(24).text('BOOK PURCHASE INVOICE', { align: 'center' });
         doc.moveDown();

         // Invoice Details
         doc.fontSize(12);
         doc.text(`Invoice Number: ${bookOrder.receiptNumber}`);
         doc.text(`Date: ${new Date(bookOrder.createdAt).toLocaleDateString('en-IN')}`);
         doc.moveDown();

         // Customer Details
         doc.fontSize(14).text('Customer Details', { underline: true });
         doc.fontSize(12);
         doc.text(`Name: ${bookOrder.shippingAddress.fullName}`);
         doc.text(`Mobile: ${bookOrder.shippingAddress.mobile}`);
         if (bookOrder.shippingAddress.email) {
            doc.text(`Email: ${bookOrder.shippingAddress.email}`);
         }
         doc.moveDown();

         // Shipping Address
         doc.fontSize(14).text('Shipping Address', { underline: true });
         doc.fontSize(12);
         doc.text(bookOrder.shippingAddress.addressLine);
         doc.text(`${bookOrder.shippingAddress.city}, ${bookOrder.shippingAddress.state} - ${bookOrder.shippingAddress.pincode}`);
         if (bookOrder.shippingAddress.landmark) {
            doc.text(`Landmark: ${bookOrder.shippingAddress.landmark}`);
         }
         doc.moveDown();

         // Book Details
         doc.fontSize(14).text('Book Details', { underline: true });
         doc.fontSize(12);
         doc.text(`Title: ${book.title}`);
         doc.text(`Author(s): ${book.authorNames.join(', ')}`);
         doc.text(`Quantity: ${bookOrder.quantity}`);
         doc.moveDown();

         // Payment Details
         doc.fontSize(14).text('Payment Details', { underline: true });
         doc.fontSize(12);
         doc.text(`Book Price: ₹${bookOrder.actualPrice.toLocaleString('en-IN')}`);
         
         if (bookOrder.discountAmount > 0) {
            doc.text(`Discount: -₹${bookOrder.discountAmount.toLocaleString('en-IN')}`);
            if (bookOrder.couponCode) {
               doc.text(`Coupon: ${bookOrder.couponCode}`);
            }
         }
         
         doc.text(`Delivery Charge: ₹${bookOrder.deliveryCharge.toLocaleString('en-IN')}`);
         doc.fontSize(16).text(`Total Amount: ₹${bookOrder.finalAmount.toLocaleString('en-IN')}`, { bold: true });
         doc.moveDown();

         // Transaction Details
         doc.fontSize(12);
         doc.text(`Payment ID: ${bookOrder.razorpayPaymentId}`);
         doc.text(`Order ID: ${bookOrder.razorpayOrderId}`);
         doc.text(`Payment Status: PAID`);
         doc.text(`Order Status: ${bookOrder.orderStatus}`);
         doc.moveDown();

         // Estimated Delivery
         const estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
         doc.text(`Estimated Delivery: ${estimatedDelivery.toLocaleDateString('en-IN')}`);

         // Footer
         doc.moveDown(2);
         doc.fontSize(10).text('Thank you for your purchase!', { align: 'center' });
         doc.text('This is a computer-generated invoice.', { align: 'center' });

         doc.end();

         stream.on('finish', async () => {
            // Upload to Cloudinary
            try {
               const result = await cloudinary.uploader.upload(filePath, {
                  folder: 'invoices',
                  resource_type: 'raw',
                  format: 'pdf'
               });

               // Delete local file
               fs.unlinkSync(filePath);

               resolve(result.secure_url);
            } catch (uploadError) {
               reject(uploadError);
            }
         });

         stream.on('error', (error) => {
            reject(error);
         });

      } catch (error) {
         reject(error);
      }
   });
}

