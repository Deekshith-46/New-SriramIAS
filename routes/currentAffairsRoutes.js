const express = require('express');
const router = express.Router();
const { cmsAdminAuth } = require('../middleware/cmsAdminAuth');
const { paginate } = require('../middleware/resourceMiddleware');
const { handleCurrentAffairUpload } = require('../middleware/currentAffairUpload');
const {
  validateCreate,
  validateUpdate,
  validateStatusUpdate
} = require('../validations/currentAffairValidation');
const {
  createCurrentAffair,
  getAllCurrentAffairs,
  getCurrentAffairById,
  updateCurrentAffair,
  deleteCurrentAffair,
  updateStatus
} = require('../controllers/currentAffairController');
const {
  getMainsCategories,
  downloadBulkTemplate,
  createDailyPracticePaper,
  bulkUploadQuestions,
  getQuestionsByPaper,
  addQuestionToPaper
} = require('../controllers/dailyPracticeController');
const {
  handleBulkUpload,
  handleQuestionImageUpload
} = require('../middleware/dailyPracticeUpload');

const adminAuth = cmsAdminAuth;

router.get('/daily-practice/mains-categories', getMainsCategories);
router.get('/daily-practice/questions/bulk-template', downloadBulkTemplate);
router.post('/daily-practice', ...adminAuth, createDailyPracticePaper);

router.get('/', paginate, getAllCurrentAffairs);

router.post(
  '/:id/questions/bulk-upload',
  ...adminAuth,
  handleBulkUpload,
  bulkUploadQuestions
);
router.get('/:id/questions', getQuestionsByPaper);
router.post(
  '/:id/questions',
  ...adminAuth,
  handleQuestionImageUpload,
  addQuestionToPaper
);

router.get('/:id', getCurrentAffairById);

router.post(
  '/',
  ...adminAuth,
  handleCurrentAffairUpload,
  validateCreate,
  createCurrentAffair
);

router.put(
  '/:id',
  ...adminAuth,
  handleCurrentAffairUpload,
  validateUpdate,
  updateCurrentAffair
);

router.delete('/:id', ...adminAuth, deleteCurrentAffair);

router.patch(
  '/:id/status',
  ...adminAuth,
  validateStatusUpdate,
  updateStatus
);

module.exports = router;
