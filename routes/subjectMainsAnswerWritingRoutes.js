const express = require('express');
const router = express.Router();
const subjectMainsAnswerWritingUpload = require('../middleware/subjectMainsAnswerWritingUpload');
const {
  createMainsAnswerWriting,
  getMainsAnswerWritings,
  getMainsAnswerWritingById,
  getMainsAnswerWritingCreateForm,
  getMainsAnswerWritingDashboardSummary,
  updateMainsAnswerWriting,
  updateMainsAnswerWritingPublishStatus,
  deleteMainsAnswerWriting
} = require('../controllers/subjectMainsAnswerWritingController');

router.get('/create-form', getMainsAnswerWritingCreateForm);
router.get('/dashboard-summary', getMainsAnswerWritingDashboardSummary);
router.patch('/:id/publish-status', updateMainsAnswerWritingPublishStatus);

const maybeMainsPdfUpload = (req, res, next) => {
  const contentType = String(req.headers['content-type'] || '');
  if (contentType.includes('multipart/form-data')) {
    return subjectMainsAnswerWritingUpload(req, res, next);
  }
  return next();
};

router.post('/', subjectMainsAnswerWritingUpload, createMainsAnswerWriting);
router.get('/', getMainsAnswerWritings);
router.get('/:id', getMainsAnswerWritingById);
router.put('/:id', maybeMainsPdfUpload, updateMainsAnswerWriting);
router.delete('/:id', deleteMainsAnswerWriting);

module.exports = router;
