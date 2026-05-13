const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { paginate } = require('../middleware/resourceMiddleware');

const {
  createMockTest,
  getMockTests,
  getMockTestById,
  updateMockTest,
  deleteMockTest,
  attemptTest,
  getUserResults,
  getResultById,
  addQuestion,
  addQuestions,
  removeQuestion
} = require('../controllers/mockTestController');

// ==================== MOCK TEST ROUTES ====================

// Public routes
router.get('/', paginate, getMockTests);

// SPECIFIC routes MUST come before PARAMETERIZED routes
router.post('/:id/attempt',
  protect,
  authorize('student', 'parent'),
  attemptTest
);

router.get('/results',
  protect,
  getUserResults
);

router.get('/results/:id',
  protect,
  getResultById
);

// PARAMETERIZED routes (come AFTER specific routes)
router.get('/:id', getMockTestById);

// Protected routes (Admin only)
router.post('/',
  protect,
  authorize('super_admin', 'center_admin'),
  createMockTest
);

router.put('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  updateMockTest
);

router.delete('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  deleteMockTest
);

// Question management routes (Admin only)
router.post('/:id/add-question',
  protect,
  authorize('super_admin', 'center_admin'),
  addQuestion
);

router.post('/:id/add-questions',
  protect,
  authorize('super_admin', 'center_admin'),
  addQuestions
);

router.delete('/:id/question/:questionId',
  protect,
  authorize('super_admin', 'center_admin'),
  removeQuestion
);

module.exports = router;
