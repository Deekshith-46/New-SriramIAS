const express = require('express');
const router = express.Router();
const {
  getCenterEnquiries,
  getEnquiryById,
  getEnquiryStats
} = require('../controllers/enquiryController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles, ROLES } = require('../middleware/roleMiddleware');

// Protect all routes
router.use(protect);

// ==========================================
// CENTER ROUTES (Center Admin & Employee)
// ==========================================

// Get enquiries for their center only
router.get('/', allowRoles(ROLES.CENTER_ADMIN, ROLES.EMPLOYEE), getCenterEnquiries);

// Get single enquiry
router.get('/:id', allowRoles(ROLES.CENTER_ADMIN, ROLES.EMPLOYEE), getEnquiryById);

// Get statistics for their center
router.get('/stats/summary', allowRoles(ROLES.CENTER_ADMIN, ROLES.EMPLOYEE), getEnquiryStats);

module.exports = router;
