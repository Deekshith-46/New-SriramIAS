const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const {
  createQuestion,
  bulkCreateQuestions,
  getQuestionsByPaper,
  getQuestionsForStudent,
  updateQuestion,
  deleteQuestion
} = require('../controllers/testQuestionController');

// Public routes
// None - all question routes require authentication

// Protected routes (Admin only - with correct answers)
router.get(
  '/paper/:paperId',
  protect,
  allowRoles('super_admin', 'center_admin'),
  getQuestionsByPaper
);

// Protected routes (Student only - without correct answers)
router.get(
  '/view/:paperId',
  protect,
  getQuestionsForStudent
);

// Protected routes (Admin only - CRUD operations)
router.post(
  '/',
  protect,
  allowRoles('super_admin', 'center_admin'),
  createQuestion
);

router.post(
  '/bulk',
  protect,
  allowRoles('super_admin', 'center_admin'),
  bulkCreateQuestions
);

router.put(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  updateQuestion
);

router.delete(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  deleteQuestion
);

module.exports = router;
