const express = require('express');
const router = express.Router();
const {
  createEnquiry
} = require('../controllers/enquiryController');

// ==========================================
// PUBLIC ROUTES (No authentication needed)
// ==========================================

// Create enquiry (Book Demo)
router.post('/', createEnquiry);

module.exports = router;
