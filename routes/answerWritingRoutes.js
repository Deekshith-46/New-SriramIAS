const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const uploadAnswerWriting = require('../middleware/uploadAnswerWriting');
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/answerWritingCategoryController');
const {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion
} = require('../controllers/answerWritingQuestionController');
const {
  submitAnswer,
  getMySubmissions,
  getSubmissionById,
  getEvaluatorSubmissions,
  evaluateSubmission
} = require('../controllers/answerWritingSubmissionController');

const admin = authorize('super_admin', 'center_admin', 'employee');
const studentOnly = authorize('student');
const evaluator = authorize('super_admin', 'center_admin', 'employee');

const questionUpload = uploadAnswerWriting.fields([{ name: 'questionPaperPdf', maxCount: 1 }]);
const submissionUpload = uploadAnswerWriting.fields([{ name: 'answerFile', maxCount: 1 }]);
const evaluateUpload = uploadAnswerWriting.fields([{ name: 'evaluatedAnswerFile', maxCount: 1 }]);

router.get('/categories', getCategories);
router.post('/categories', protect, admin, createCategory);
router.get('/categories/:id', protect, admin, getCategoryById);
router.put('/categories/:id', protect, admin, updateCategory);
router.delete('/categories/:id', protect, admin, deleteCategory);

router.post('/questions', protect, admin, questionUpload, createQuestion);
router.get('/questions', protect, getQuestions);
router.put('/questions/:id', protect, admin, questionUpload, updateQuestion);
router.delete('/questions/:id', protect, admin, deleteQuestion);
router.get('/questions/:id', protect, getQuestionById);

router.get('/my-submissions', protect, studentOnly, getMySubmissions);
router.post('/submissions', protect, studentOnly, submissionUpload, submitAnswer);

router.get('/evaluator/submissions', protect, evaluator, getEvaluatorSubmissions);
router.put('/submissions/:id/evaluate', protect, evaluator, evaluateUpload, evaluateSubmission);
router.get('/submissions/:id', protect, getSubmissionById);

module.exports = router;
