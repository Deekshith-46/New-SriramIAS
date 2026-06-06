const express = require('express');
const router = express.Router();
const subjectRecordingUpload = require('../middleware/subjectRecordingUpload');
const {
  createRecording,
  getRecordings,
  getRecordingById,
  getRecordingCreateForm,
  getRecordingTopicsDropdown,
  getRecordingDashboardSummary,
  updateRecording,
  updateRecordingVisibility,
  playRecording,
  deleteRecording
} = require('../controllers/subjectRecordingController');

router.get('/create-form', getRecordingCreateForm);
router.get('/topics-dropdown', getRecordingTopicsDropdown);
router.get('/dashboard-summary', getRecordingDashboardSummary);

const maybeRecordingUpload = (req, res, next) => {
  const contentType = String(req.headers['content-type'] || '');
  if (contentType.includes('multipart/form-data')) {
    return subjectRecordingUpload(req, res, next);
  }
  return next();
};

router.post('/', subjectRecordingUpload, createRecording);
router.get('/', getRecordings);
router.get('/:id', getRecordingById);
router.post('/:id/play', playRecording);
router.patch('/:id/visibility', updateRecordingVisibility);
router.put('/:id', maybeRecordingUpload, updateRecording);
router.delete('/:id', deleteRecording);

module.exports = router;
