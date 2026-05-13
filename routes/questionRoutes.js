const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

const {
  updateQuestion,
  deleteQuestion,
  getQuestionById
} = require('../controllers/questionController');

// ==================== QUESTION ROUTES ====================

// Get question by ID (Admin only)
router.get('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  getQuestionById
);

// Update question (Admin only)
router.put('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  updateQuestion
);

// Delete question (Admin only)
router.delete('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  deleteQuestion
);

// Patch/Update specific fields (Admin only)
router.patch('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  updateQuestion
);

module.exports = router;
