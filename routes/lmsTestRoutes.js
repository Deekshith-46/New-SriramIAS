const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/lmsTestCategoryController');
const {
  createTest,
  updateTest,
  deleteTest,
  publishTest,
  getTestsByCourseAndCategory,
  getTestsByCourseAndCategoryAdmin,
  startTest,
  submitTest
} = require('../controllers/lmsTestController');
const {
  createQuestion,
  createQuestionsBulk,
  getQuestionsByTest,
  updateQuestion,
  deleteQuestion
} = require('../controllers/lmsTestQuestionController');
const {
  getAttemptResult,
  getMyAttempts
} = require('../controllers/lmsTestAttemptController');

const admin = authorize('super_admin', 'center_admin', 'employee');

// Static routes first (avoid /:id capturing "attempts", "questions", etc.)
router.get('/categories', getCategories);
router.post('/categories', protect, admin, createCategory);
router.put('/categories/:id', protect, admin, updateCategory);
router.delete('/categories/:id', protect, admin, deleteCategory);

router.get('/attempts/me/list', protect, getMyAttempts);
router.get('/attempts/:attemptId', protect, getAttemptResult);

router.post('/questions/bulk', protect, admin, createQuestionsBulk);
router.post('/questions', protect, admin, createQuestion);
router.get('/questions/test/:testId', protect, admin, getQuestionsByTest);
router.put('/questions/:id', protect, admin, updateQuestion);
router.delete('/questions/:id', protect, admin, deleteQuestion);

router.get(
  '/course/:courseId/category/:categoryId',
  protect,
  getTestsByCourseAndCategory
);
router.get(
  '/course/:courseId/category/:categoryId/admin',
  protect,
  admin,
  getTestsByCourseAndCategoryAdmin
);

router.post('/', protect, admin, createTest);
router.put('/:id', protect, admin, updateTest);
router.delete('/:id', protect, admin, deleteTest);
router.patch('/:id/publish', protect, admin, publishTest);

router.get('/:id/start', protect, startTest);
router.post('/:id/submit', protect, submitTest);

module.exports = router;
