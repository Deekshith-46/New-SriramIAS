const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/enrollmentController');

const adminRoles  = ['super_admin', 'center_admin'];
const staffRoles  = ['super_admin', 'center_admin', 'employee'];

// ── Online enrollment flow ──────────────────────────────────────────────────
router.post('/initiate',  protect, ctrl.initiateOnlinePayment);
router.post('/verify',    protect, ctrl.verifyOnlinePayment);
router.post('/webhook',   ctrl.handleRazorpayWebhook);

// ── Offline / cash admission (admin/staff only) ─────────────────────────────
router.post('/offline',   protect, authorize(...staffRoles), ctrl.createOfflineEnrollment);

// ── Installment payments ────────────────────────────────────────────────────
router.post('/:id/installment/initiate', protect, ctrl.initiateInstallmentPayment);
router.post('/:id/installment/verify',   protect, ctrl.verifyInstallmentPayment);
router.post('/:id/installment/offline',  protect, authorize(...staffRoles), ctrl.payInstallmentOffline);

// ── Student dashboard ───────────────────────────────────────────────────────
router.get('/my',                    protect, ctrl.getMyEnrollments);
router.get('/:id/transactions',      protect, ctrl.getMyTransactions);
router.get('/:id/installments',      protect, ctrl.getInstallmentPlan);

// ── Admin ───────────────────────────────────────────────────────────────────
router.get('/',          protect, authorize(...adminRoles), ctrl.getAllEnrollments);
router.put('/:id/status', protect, authorize(...adminRoles), ctrl.updateEnrollmentStatus);

// ── Cron (internal — protect with super_admin) ──────────────────────────────
router.post('/cron/mark-overdue', protect, authorize('super_admin'), ctrl.markOverdueInstallments);

module.exports = router;
