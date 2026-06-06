const express = require('express');
const router = express.Router();
const { cmsAdminAuth } = require('../middleware/cmsAdminAuth');
const { paginate } = require('../middleware/resourceMiddleware');
const {
  handleQuestionImageUpload,
  handleBulkFileUpload
} = require('../middleware/questionBankUpload');
const {
  getAnalytics,
  getTypes,
  getSubjects,
  getTopics,
  getTags,
  getDifficulties,
  getCategories,
  listQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  getEditableFields,
  deleteQuestion,
  updateStatus,
  duplicateQuestion,
  downloadTemplate,
  validateBulkFile,
  importBulkFile
} = require('../controllers/questionBankController');

const adminAuth = cmsAdminAuth;

router.get('/analytics', ...adminAuth, getAnalytics);

router.get('/types', ...adminAuth, getTypes);
router.get('/subjects', ...adminAuth, getSubjects);
router.get('/topics', ...adminAuth, getTopics);
router.get('/tags', ...adminAuth, getTags);
router.get('/difficulties', ...adminAuth, getDifficulties);
router.get('/categories', ...adminAuth, getCategories);

router.get('/bulk/templates/:type', ...adminAuth, downloadTemplate);
router.post('/bulk/validate', ...adminAuth, handleBulkFileUpload, validateBulkFile);
router.post('/bulk/import', ...adminAuth, handleBulkFileUpload, importBulkFile);

router.get('/editable-fields/:type', ...adminAuth, getEditableFields);

router.get('/', ...adminAuth, paginate, listQuestions);
router.post('/', ...adminAuth, handleQuestionImageUpload, createQuestion);

router.get('/:id', ...adminAuth, getQuestionById);
router.put('/:id', ...adminAuth, handleQuestionImageUpload, updateQuestion);
router.patch('/:id', ...adminAuth, handleQuestionImageUpload, updateQuestion);
router.delete('/:id', ...adminAuth, deleteQuestion);
router.patch('/:id/status', ...adminAuth, updateStatus);
router.post('/:id/duplicate', ...adminAuth, duplicateQuestion);

module.exports = router;
