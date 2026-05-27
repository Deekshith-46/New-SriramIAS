const Razorpay = require('razorpay');
const crypto   = require('crypto');
const Course          = require('../models/Course');
const Enrollment      = require('../models/Enrollment');
const Transaction     = require('../models/Transaction');
const InstallmentPlan = require('../models/InstallmentPlan');
const Coupon          = require('../models/Coupon');
const PaymentIntent   = require('../models/PaymentIntent');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ─── helpers ────────────────────────────────────────────────────────────────

async function resolveFees(course, learningMode) {
  const fees =
    learningMode === 'online' ? course.fees?.online : course.fees?.offline;
  if (!fees) {
    throw new Error('Course pricing is not configured yet');
  }
  return fees;
}

async function applyCoupon(code, baseFees, userId) {
  if (!code) return { discount: 0, coupon: null };
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  if (!coupon || coupon.category !== 'COURSE') throw new Error('Invalid or inapplicable coupon');
  if (coupon.expiryDate < new Date())              throw new Error('Coupon has expired');
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new Error('Coupon usage limit reached');
  if (coupon.isNewUserOnly) {
    const existing = await Enrollment.countDocuments({ userId });
    if (existing > 0) throw new Error('This coupon is only for new students');
  }
  const discount = coupon.type === 'PERCENT'
    ? Math.round((baseFees * coupon.value) / 100)
    : coupon.value;
  return { discount, coupon };
}

function createReceiptNumber(centerName = 'SRM') {
  const prefix = centerName
    ? centerName.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() || 'SRM'
    : 'SRM';
  const now = new Date();
  return `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getTime()).slice(-6)}`;
}

function createInvoiceNumber(centerName = 'SRM') {
  const prefix = centerName
    ? centerName.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() || 'SRM'
    : 'SRM';
  const now = new Date();
  return `${prefix}-INV-${now.getFullYear()}-${String(Math.floor(Math.random() * 900000 + 100000))}`;
}

function parseDurationToDays(duration) {
  if (!duration || typeof duration !== 'string') return null;
  const normalized = duration.trim().toLowerCase();
  const match = normalized.match(/(\d+)\s*(year|years|month|months|day|days)/);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  if (unit.startsWith('year')) return value * 365;
  if (unit.startsWith('month')) return Math.round(value * 30.4375);
  if (unit.startsWith('day')) return value;
  return null;
}

function calculateAccessWindow(course, startDate = new Date()) {
  const accessStartDate = startDate;
  let accessEndDate = null;

  if (typeof course.accessValidityInDays === 'number' && course.accessValidityInDays > 0) {
    accessEndDate = new Date(accessStartDate);
    accessEndDate.setDate(accessEndDate.getDate() + course.accessValidityInDays);
  } else if (course.batchEndDate) {
    accessEndDate = new Date(course.batchEndDate);
  } else if (course.startDate && course.duration) {
    const days = parseDurationToDays(course.duration);
    if (days) {
      accessEndDate = new Date(course.startDate instanceof Date ? course.startDate : new Date(course.startDate));
      accessEndDate.setDate(accessEndDate.getDate() + days);
    }
  }

  return {
    accessStartDate,
    accessEndDate,
    expiredAt: accessEndDate ? new Date(accessEndDate) : null
  };
}

function refreshExpiredEnrollment(enrollment) {
  if (!enrollment || !enrollment.accessEndDate) return enrollment;
  if (new Date(enrollment.accessEndDate) < new Date() && enrollment.accessStatus !== 'EXPIRED') {
    enrollment.accessStatus = 'EXPIRED';
    enrollment.enrollmentStatus = enrollment.enrollmentStatus === 'ACTIVE' ? 'COMPLETED' : enrollment.enrollmentStatus;
    enrollment.courseCompletionStatus = 'COMPLETED';
    enrollment.expiredAt = enrollment.accessEndDate;
  }
  return enrollment;
}

function buildCourseSnapshot(course) {
  return {
    title: course.courseName || course.title,
    slug: course.slug,
    centerName: course.center?.centerName || course.center?.name || '',
    courseOverview: course.courseOverview || ''
  };
}

function getEnrollmentQuery(userId, courseId) {
  return {
    userId,
    courseId,
    isDeleted: false,
    enrollmentStatus: { $ne: 'CANCELLED' }
  };
}

async function settleEnrollment(enrollment, amountPaid, installmentNo = null) {
  enrollment.paidAmount   += amountPaid;
  enrollment.pendingAmount = Math.max(0, enrollment.totalFees - enrollment.paidAmount);

  if (enrollment.enrollmentStatus === 'PENDING') {
    enrollment.enrollmentStatus = 'ACTIVE';
    enrollment.accessStatus     = 'GRANTED';
    enrollment.joinedAt         = new Date();
  }

  if (enrollment.pendingAmount === 0 && enrollment.courseCompletionStatus === 'NOT_STARTED') {
    enrollment.courseCompletionStatus = 'IN_PROGRESS';
  }

  await enrollment.save();

  // Mark installment paid if applicable
  if (installmentNo !== null) {
    await InstallmentPlan.findOneAndUpdate(
      { enrollmentId: enrollment._id, 'installments.installmentNo': installmentNo },
      { $set: { 'installments.$.status': 'PAID', 'installments.$.paidAt': new Date() } }
    );
  }
}

// ─── 1. INITIATE ONLINE PAYMENT ─────────────────────────────────────────────
// POST /api/enrollments/initiate
exports.initiateOnlinePayment = async (req, res) => {
  try {
    const { courseId, learningMode, admissionType, couponCode, idempotencyKey } = req.body;

    const course = await Course.findById(courseId).populate('center', 'name');
    if (!course || !course.isActive) return res.status(404).json({ success: false, message: 'Course not found' });

    const existingEnrollment = await Enrollment.findOne(getEnrollmentQuery(req.user._id, courseId));
    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'An active or completed enrollment already exists for this course'
      });
    }

    if (idempotencyKey) {
      const existingIntent = await PaymentIntent.findOne({ userId: req.user._id, idempotencyKey });
      if (existingIntent) {
        if (existingIntent.status === 'PENDING' && existingIntent.expiresAt > new Date()) {
          return res.json({
            success: true,
            data: {
              razorpayOrderId: existingIntent.razorpayOrderId,
              amount: existingIntent.chargeAmount,
              currency: existingIntent.currency,
              meta: existingIntent.meta
            }
          });
        }
        if (existingIntent.status === 'CAPTURED') {
          return res.status(400).json({
            success: false,
            message: 'Payment already completed for this request'
          });
        }
      }
    }

    const baseFees = await resolveFees(course, learningMode);
    const { discount } = await applyCoupon(couponCode, baseFees, req.user._id).catch(e =>
      res.status(400).json({ success: false, message: e.message })
    );
    if (res.headersSent) return;

    const totalFees = Math.max(0, baseFees - (discount || 0));

    let chargeNow = totalFees;
    let installmentPlan = null;

    if (admissionType === 'installment') {
      // Get installment plan for the selected learning mode
      const plan = course.installmentPlans?.[learningMode];
      
      if (!plan || !plan.enabled || !plan.installments || plan.installments.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: `Installment plan not available for ${learningMode} mode` 
        });
      }

      // Get first installment
      const firstInstallment = plan.installments[0];
      
      if (!firstInstallment || firstInstallment.amount <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid installment plan configuration' 
        });
      }

      chargeNow = firstInstallment.amount;
      installmentPlan = plan;
    }

    if (chargeNow <= 0) return res.status(400).json({ success: false, message: 'Invalid fee amount' });

    const rzpOrder = await razorpay.orders.create({
      amount:   chargeNow * 100,
      currency: 'INR',
      receipt:  `enroll_${Date.now()}`
    });

    const paymentIntent = await PaymentIntent.create({
      userId: req.user._id,
      courseId,
      centerId: course.center,
      learningMode,
      admissionType,
      couponCode: couponCode || null,
      discount: discount || 0,
      totalFees,
      chargeAmount: chargeNow,
      currency: 'INR',
      razorpayOrderId: rzpOrder.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      idempotencyKey: idempotencyKey || null,
      meta: { 
        courseId, 
        learningMode, 
        admissionType, 
        couponCode, 
        totalFees, 
        discount: discount || 0,
        installmentPlan: installmentPlan || null
      }
    });

    res.json({
      success: true,
      data: {
        razorpayOrderId: rzpOrder.id,
        amount:          chargeNow,
        currency:        'INR',
        meta: paymentIntent.meta
      }
    });
  } catch (err) {
    console.error('initiateOnlinePayment:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 2. VERIFY ONLINE PAYMENT & CREATE ENROLLMENT ───────────────────────────
// POST /api/enrollments/verify
exports.verifyOnlinePayment = async (req, res) => {
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      courseId, learningMode, admissionType, installmentMonths, couponCode
    } = req.body;

    const paymentIntent = await PaymentIntent.findOne({ razorpayOrderId: razorpay_order_id });
    if (!paymentIntent) {
      return res.status(404).json({ success: false, message: 'Payment intent not found' });
    }

    if (paymentIntent.status === 'CAPTURED') {
      return res.status(400).json({ success: false, message: 'Payment already processed' });
    }

    if (paymentIntent.expiresAt < new Date()) {
      paymentIntent.status = 'EXPIRED';
      await paymentIntent.save();
      return res.status(400).json({ success: false, message: 'Payment intent has expired' });
    }

    if (paymentIntent.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied for this payment intent' });
    }

    if (await Transaction.findOne({ razorpayPaymentId: razorpay_payment_id })) {
      return res.status(400).json({ success: false, message: 'Payment already processed' });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const course = await Course.findById(courseId).populate('center', 'name');
    if (!course || !course.isActive) return res.status(404).json({ success: false, message: 'Course not found' });

    const baseFees = await resolveFees(course, learningMode);
    const { discount, coupon } = await applyCoupon(couponCode || paymentIntent.couponCode, baseFees, req.user._id).catch(e =>
      res.status(400).json({ success: false, message: e.message })
    );
    if (res.headersSent) return;

    const totalFees = Math.max(0, baseFees - discount);
    const chargeNow = admissionType === 'installment' ? paymentIntent.chargeAmount : totalFees;

    const rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
    if (rzpOrder.amount !== chargeNow * 100) {
      return res.status(400).json({ success: false, message: 'Amount mismatch — possible tampering' });
    }

    const existingEnrollment = await Enrollment.findOne(getEnrollmentQuery(req.user._id, courseId));
    if (existingEnrollment) {
      return res.status(400).json({ success: false, message: 'An active or completed enrollment already exists for this course' });
    }

    const accessWindow = calculateAccessWindow(course, new Date());

    const enrollment = await Enrollment.create({
      userId:           req.user._id,
      courseId,
      centerId:         course.center,
      paymentIntentId:  paymentIntent._id,
      courseSnapshot:   buildCourseSnapshot(course),
      learningMode,
      admissionType,
      totalFees,
      paidAmount:       0,
      pendingAmount:    totalFees,
      currency:         'INR',
      couponCode:       couponCode || paymentIntent.couponCode || null,
      discount,
      courseCompletionStatus: 'IN_PROGRESS',
      enrollmentStatus:       'ACTIVE',
      accessStatus:           'GRANTED',
      joinedAt:               accessWindow.accessStartDate,
      accessStartDate:        accessWindow.accessStartDate,
      accessEndDate:          accessWindow.accessEndDate,
      expiredAt:              accessWindow.expiredAt,
      razorpayOrderId:        razorpay_order_id
    });

    await Transaction.create({
      enrollmentId:      enrollment._id,
      amount:            chargeNow,
      currency:          'INR',
      gatewayAmount:     chargeNow,
      settlementStatus:  'SETTLED',
      paymentMode:       'card',
      paymentChannel:    'online',
      paymentStatus:     'SUCCESS',
      razorpayOrderId:   razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      invoiceNumber:     createInvoiceNumber(course.center?.name),
      receiptNumber:     createReceiptNumber(course.center?.name),
      idempotencyKey:    paymentIntent.idempotencyKey,
      installmentNo:     admissionType === 'installment' ? 1 : null
    });

    if (admissionType === 'installment') {
      const schedule = buildInstallmentSchedule(totalFees, months);
      schedule[0].status = 'PAID';
      schedule[0].paidAt = new Date();
      await InstallmentPlan.create({ enrollmentId: enrollment._id, installments: schedule });
    }

    paymentIntent.status = 'CAPTURED';
    await paymentIntent.save();

    await settleEnrollment(enrollment, chargeNow, admissionType === 'installment' ? 1 : null);

    if (coupon) await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });

    res.json({ success: true, message: 'Enrollment successful', data: enrollment });
  } catch (err) {
    console.error('verifyOnlinePayment:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 3. OFFLINE / CASH ADMISSION (Admin only) ───────────────────────────────
// POST /api/enrollments/offline
exports.createOfflineEnrollment = async (req, res) => {
  try {
    const {
      userId, courseId, learningMode, admissionType,
      installmentMonths, couponCode, amountPaid, paymentMode, remarks
    } = req.body;

    const course = await Course.findById(courseId).populate('center', 'name');
    if (!course || !course.isActive) return res.status(404).json({ success: false, message: 'Course not found' });

    if (req.user.role === 'center_admin' && course.center.toString() !== req.user.center?.toString())
      return res.status(403).json({ success: false, message: 'You can only enroll students into your center' });

    const existingEnrollment = await Enrollment.findOne(getEnrollmentQuery(userId, courseId));
    if (existingEnrollment) {
      return res.status(400).json({ success: false, message: 'An active or completed enrollment already exists for this course' });
    }

    const baseFees = await resolveFees(course, learningMode);
    let discount = 0, couponDoc = null;
    if (couponCode) {
      const result = await applyCoupon(couponCode, baseFees, userId).catch(e =>
        res.status(400).json({ success: false, message: e.message })
      );
      if (res.headersSent) return;
      discount  = result.discount;
      couponDoc = result.coupon;
    }
    const totalFees = Math.max(0, baseFees - discount);

    const accessWindow = calculateAccessWindow(course, new Date());

    const enrollmentData = {
      userId,
      courseId,
      centerId:      course.center,
      courseSnapshot: buildCourseSnapshot(course),
      learningMode,
      admissionType,
      totalFees,
      paidAmount:    0,
      pendingAmount: totalFees,
      currency:      'INR',
      couponCode:    couponCode || null,
      discount,
      courseCompletionStatus: amountPaid > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
      enrollmentStatus: amountPaid > 0 ? 'ACTIVE' : 'PENDING',
      accessStatus: amountPaid > 0 ? 'GRANTED' : 'RESTRICTED',
      joinedAt: amountPaid > 0 ? accessWindow.accessStartDate : null,
      accessStartDate: amountPaid > 0 ? accessWindow.accessStartDate : null,
      accessEndDate: amountPaid > 0 ? accessWindow.accessEndDate : null,
      expiredAt: amountPaid > 0 ? accessWindow.expiredAt : null
    };

    const enrollment = await Enrollment.create(enrollmentData);

    if (admissionType === 'installment') {
      const months = installmentMonths || course.installmentOptions?.[0]?.months || 3;
      const schedule = buildInstallmentSchedule(totalFees, months);
      await InstallmentPlan.create({ enrollmentId: enrollment._id, installments: schedule });
    }

    if (amountPaid > 0) {
      await Transaction.create({
        enrollmentId:   enrollment._id,
        amount:         amountPaid,
        currency:       'INR',
        settlementStatus: 'SETTLED',
        paymentMode:    paymentMode || 'cash',
        paymentChannel: 'offline',
        paymentStatus:  'SUCCESS',
        collectedBy:    req.user._id,
        receiptNumber:  createReceiptNumber(course.center?.name),
        invoiceNumber:  createInvoiceNumber(course.center?.name),
        remarks,
        installmentNo:  admissionType === 'installment' ? 1 : null
      });
      await settleEnrollment(enrollment, amountPaid, admissionType === 'installment' ? 1 : null);
    }

    if (couponDoc) await Coupon.findByIdAndUpdate(couponDoc._id, { $inc: { usedCount: 1 } });

    res.status(201).json({ success: true, message: 'Offline enrollment created', data: enrollment });
  } catch (err) {
    console.error('createOfflineEnrollment:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Razorpay webhook endpoint ───────────────────────────────────────────────
// POST /api/enrollments/webhook
exports.handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing Razorpay signature' });
    }

    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid Razorpay signature' });
    }

    const { event, payload } = req.body;
    const payment = payload?.payment?.entity;
    const order = payload?.order?.entity;
    const razorpayOrderId = payment?.order_id || order?.id;

    if (!razorpayOrderId) {
      return res.status(400).json({ success: false, message: 'Missing order id' });
    }

    const paymentIntent = await PaymentIntent.findOne({ razorpayOrderId });
    if (!paymentIntent) {
      return res.status(200).json({ success: true, message: 'No matching payment intent' });
    }

    if (event === 'payment.captured') {
      if (paymentIntent.status !== 'CAPTURED') {
        paymentIntent.status = 'CAPTURED';
        await paymentIntent.save();
      }

      const existingEnrollment = await Enrollment.findOne({ paymentIntentId: paymentIntent._id, isDeleted: false });
      if (!existingEnrollment) {
        const course = await Course.findById(paymentIntent.courseId).populate('center', 'name');
        if (course && course.isActive) {
          const accessWindow = calculateAccessWindow(course, new Date());
          const enrollment = await Enrollment.create({
            userId: req.body?.userId || paymentIntent.userId,
            courseId: paymentIntent.courseId,
            centerId: course.center,
            paymentIntentId: paymentIntent._id,
            courseSnapshot: buildCourseSnapshot(course),
            learningMode: paymentIntent.learningMode,
            admissionType: paymentIntent.admissionType,
            totalFees: paymentIntent.totalFees,
            paidAmount: 0,
            pendingAmount: paymentIntent.totalFees,
            currency: paymentIntent.currency,
            couponCode: paymentIntent.couponCode || null,
            discount: paymentIntent.discount,
            courseCompletionStatus: 'IN_PROGRESS',
            enrollmentStatus: 'ACTIVE',
            accessStatus: 'GRANTED',
            joinedAt: accessWindow.accessStartDate,
            accessStartDate: accessWindow.accessStartDate,
            accessEndDate: accessWindow.accessEndDate,
            expiredAt: accessWindow.expiredAt,
            razorpayOrderId: paymentIntent.razorpayOrderId
          });

          await Transaction.create({
            enrollmentId: enrollment._id,
            amount: payment ? payment.amount / 100 : paymentIntent.chargeAmount,
            currency: paymentIntent.currency,
            gatewayAmount: payment ? payment.amount / 100 : paymentIntent.chargeAmount,
            settlementStatus: 'SETTLED',
            paymentMode: 'card',
            paymentChannel: 'online',
            paymentStatus: 'SUCCESS',
            razorpayOrderId: paymentIntent.razorpayOrderId,
            razorpayPaymentId: payment?.id || null,
            razorpaySignature: signature,
            invoiceNumber: createInvoiceNumber(course.center?.name),
            receiptNumber: createReceiptNumber(course.center?.name),
            installmentNo: paymentIntent.admissionType === 'installment' ? 1 : null
          });

          if (paymentIntent.admissionType === 'installment') {
            const schedule = buildInstallmentSchedule(paymentIntent.totalFees, paymentIntent.installmentMonths || 1);
            schedule[0].status = 'PAID';
            schedule[0].paidAt = new Date();
            await InstallmentPlan.create({ enrollmentId: enrollment._id, installments: schedule });
          }

          await settleEnrollment(enrollment, payment ? payment.amount / 100 : paymentIntent.chargeAmount, paymentIntent.admissionType === 'installment' ? 1 : null);
        }
      }
    } else if (event === 'payment.failed') {
      paymentIntent.status = 'FAILED';
      await paymentIntent.save();
    } else if (event === 'order.expired') {
      paymentIntent.status = 'EXPIRED';
      await paymentIntent.save();
    }

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    console.error('handleRazorpayWebhook:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 4. PAY INSTALLMENT — ONLINE (initiate) ─────────────────────────────────
// POST /api/enrollments/:id/installment/initiate
exports.initiateInstallmentPayment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    if (enrollment.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });

    if (enrollment.accessEndDate && new Date(enrollment.accessEndDate) < new Date()) {
      return res.status(403).json({ success: false, message: 'Course access expired' });
    }

    const plan = await InstallmentPlan.findOne({ enrollmentId: enrollment._id });
    if (!plan) return res.status(400).json({ success: false, message: 'No installment plan found' });

    const next = plan.installments.find(i => i.status === 'PENDING' || i.status === 'OVERDUE');
    if (!next) return res.status(400).json({ success: false, message: 'All installments are paid' });

    const rzpOrder = await razorpay.orders.create({
      amount:   next.amount * 100,
      currency: 'INR',
      receipt:  `inst_${enrollment._id}_${next.installmentNo}`
    });

    res.json({
      success: true,
      data: {
        razorpayOrderId: rzpOrder.id,
        amount:          next.amount,
        installmentNo:   next.installmentNo
      }
    });
  } catch (err) {
    console.error('initiateInstallmentPayment:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 5. PAY INSTALLMENT — ONLINE (verify) ───────────────────────────────────
// POST /api/enrollments/:id/installment/verify
exports.verifyInstallmentPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, installmentNo } = req.body;

    if (await Transaction.findOne({ razorpayPaymentId: razorpay_payment_id }))
      return res.status(400).json({ success: false, message: 'Payment already processed' });

    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    if (enrollment.accessEndDate && new Date(enrollment.accessEndDate) < new Date()) {
      return res.status(403).json({ success: false, message: 'Course access expired' });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (expected !== razorpay_signature)
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });

    const plan = await InstallmentPlan.findOne({ enrollmentId: enrollment._id });
    const inst = plan?.installments.find(i => i.installmentNo === installmentNo);
    if (!inst) return res.status(400).json({ success: false, message: 'Installment not found' });
    if (inst.status === 'PAID') return res.status(400).json({ success: false, message: 'Installment already paid' });

    await Transaction.create({
      enrollmentId:      enrollment._id,
      amount:            inst.amount,
      paymentMode:       'card',
      paymentChannel:    'online',
      paymentStatus:     'SUCCESS',
      razorpayOrderId:   razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      installmentNo
    });

    await settleEnrollment(enrollment, inst.amount, installmentNo);

    res.json({ success: true, message: 'Installment paid successfully', data: enrollment });
  } catch (err) {
    console.error('verifyInstallmentPayment:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 6. PAY INSTALLMENT — OFFLINE (Admin) ───────────────────────────────────
// POST /api/enrollments/:id/installment/offline
exports.payInstallmentOffline = async (req, res) => {
  try {
    const { installmentNo, paymentMode, remarks } = req.body;

    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    if (enrollment.accessEndDate && new Date(enrollment.accessEndDate) < new Date()) {
      return res.status(403).json({ success: false, message: 'Course access expired' });
    }

    if (req.user.role === 'center_admin' && enrollment.centerId.toString() !== req.user.center?.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });

    const plan = await InstallmentPlan.findOne({ enrollmentId: enrollment._id });
    const inst = plan?.installments.find(i => i.installmentNo === installmentNo);
    if (!inst) return res.status(400).json({ success: false, message: 'Installment not found' });
    if (inst.status === 'PAID') return res.status(400).json({ success: false, message: 'Already paid' });

    const receiptNumber = `RCP-${Date.now()}`;
    await Transaction.create({
      enrollmentId:   enrollment._id,
      amount:         inst.amount,
      paymentMode:    paymentMode || 'cash',
      paymentChannel: 'offline',
      paymentStatus:  'SUCCESS',
      collectedBy:    req.user._id,
      receiptNumber,
      remarks,
      installmentNo
    });

    await settleEnrollment(enrollment, inst.amount, installmentNo);

    res.json({ success: true, message: 'Installment recorded', data: enrollment });
  } catch (err) {
    console.error('payInstallmentOffline:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 7. STUDENT DASHBOARD ───────────────────────────────────────────────────
// GET /api/enrollments/my
exports.getMyEnrollments = async (req, res) => {
  try {
    await Enrollment.updateMany(
      {
        userId: req.user._id,
        accessEndDate: { $lt: new Date() },
        accessStatus: { $ne: 'EXPIRED' }
      },
      [
        {
          $set: {
            accessStatus: 'EXPIRED',
            enrollmentStatus: 'COMPLETED',
            courseCompletionStatus: 'COMPLETED',
            expiredAt: '$accessEndDate'
          }
        }
      ]
    );

    const enrollments = await Enrollment.find({ userId: req.user._id })
      .populate('courseId', 'title slug bannerImage fees')
      .populate('centerId', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: enrollments.length, data: enrollments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/enrollments/:id/transactions
exports.getMyTransactions = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    if (enrollment.userId.toString() !== req.user._id.toString() &&
        !['super_admin', 'center_admin'].includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Access denied' });

    refreshExpiredEnrollment(enrollment);
    if (enrollment.isModified()) await enrollment.save();

    const transactions = await Transaction.find({ enrollmentId: req.params.id })
      .populate('collectedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/enrollments/:id/installments
exports.getInstallmentPlan = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    if (enrollment.userId.toString() !== req.user._id.toString() &&
        !['super_admin', 'center_admin'].includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Access denied' });

    refreshExpiredEnrollment(enrollment);
    if (enrollment.isModified()) await enrollment.save();

    const plan = await InstallmentPlan.findOne({ enrollmentId: req.params.id });
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 8. ADMIN — ALL ENROLLMENTS ─────────────────────────────────────────────
// GET /api/enrollments  (super_admin = all, center_admin = their center)
exports.getAllEnrollments = async (req, res) => {
  try {
    const { status, courseId, page = 1, limit = 20 } = req.query;
    const query = {};

    if (req.user.role === 'center_admin') query.centerId = req.user.center;
    if (status)   query.enrollmentStatus = status;
    if (courseId) query.courseId = courseId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [enrollments, total] = await Promise.all([
      Enrollment.find(query)
        .populate('userId',   'name email mobile')
        .populate('courseId', 'title')
        .populate('centerId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Enrollment.countDocuments(query)
    ]);

    res.json({ success: true, total, page: parseInt(page), data: enrollments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 9. ADMIN — UPDATE ENROLLMENT STATUS ────────────────────────────────────
// PUT /api/enrollments/:id/status
exports.updateEnrollmentStatus = async (req, res) => {
  try {
    const { enrollmentStatus, accessStatus } = req.body;
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });

    if (req.user.role === 'center_admin' && enrollment.centerId.toString() !== req.user.center?.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });

    if (enrollmentStatus) enrollment.enrollmentStatus = enrollmentStatus;
    if (accessStatus)     enrollment.accessStatus     = accessStatus;
    await enrollment.save();

    res.json({ success: true, data: enrollment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 10. INTERNAL EXPIRY HANDLER ───────────────────────────────────────────
exports.expireEnrollments = async () => {
  try {
    const today = new Date();
    await Enrollment.updateMany(
      {
        accessEndDate: { $lt: today },
        accessStatus: { $ne: 'EXPIRED' }
      },
      [
        {
          $set: {
            accessStatus: 'EXPIRED',
            enrollmentStatus: 'COMPLETED',
            courseCompletionStatus: 'COMPLETED',
            expiredAt: '$accessEndDate'
          }
        }
      ]
    );
  } catch (err) {
    console.error('expireEnrollments:', err);
  }
};

// ─── 11. CRON — MARK OVERDUE INSTALLMENTS ───────────────────────────────────
// Called by a cron job or scheduled task: POST /api/enrollments/cron/mark-overdue
exports.markOverdueInstallments = async (req, res) => {
  try {
    const today = new Date();
    const overdueResult = await InstallmentPlan.updateMany(
      { 'installments.status': 'PENDING', 'installments.dueDate': { $lt: today } },
      { $set: { 'installments.$[elem].status': 'OVERDUE' } },
      { arrayFilters: [{ 'elem.status': 'PENDING', 'elem.dueDate': { $lt: today } }] }
    );

    const overdueThreshold = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000);
    const overduePlans = await InstallmentPlan.find({
      'installments.status': 'OVERDUE',
      'installments.dueDate': { $lt: overdueThreshold }
    });

    const enrollmentIds = overduePlans.map(plan => plan.enrollmentId);
    let restrictedResult = { modifiedCount: 0 };

    if (enrollmentIds.length > 0) {
      restrictedResult = await Enrollment.updateMany(
        { _id: { $in: enrollmentIds }, accessStatus: 'GRANTED' },
        { $set: { accessStatus: 'RESTRICTED' } }
      );
    }

    res.json({
      success: true,
      message: 'Overdue installments updated',
      overdueMarked: overdueResult.modifiedCount,
      accessRestricted: restrictedResult.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
