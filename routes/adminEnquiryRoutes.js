const express = require('express');
const router = express.Router();
const {
  getEnquiries,
  getEnquiryById,
  updateEnquiry,
  getEnquiryStats
} = require('../controllers/enquiryController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles, ROLES } = require('../middleware/roleMiddleware');

// All enquiry admin routes require authentication
router.use(protect);

// ==========================================
// ADMIN ROUTES (Super Admin Only)
// ==========================================

// Get all enquiries (can filter by center)
router.get('/', allowRoles(ROLES.SUPER_ADMIN), getEnquiries);

// Get enquiry statistics
router.get('/stats', allowRoles(ROLES.SUPER_ADMIN), getEnquiryStats);

// Get single enquiry
router.get('/:id', allowRoles(ROLES.SUPER_ADMIN), getEnquiryById);

// Update enquiry status
router.put('/:id', allowRoles(ROLES.SUPER_ADMIN), updateEnquiry);

module.exports = router;
