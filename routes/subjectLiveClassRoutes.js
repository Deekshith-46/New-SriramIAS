const express = require('express');
const router = express.Router();
const {
  createLiveClass,
  getLiveClasses,
  getLiveClassById,
  getLiveClassCreateForm,
  getLiveClassDashboardSummary,
  updateLiveClass,
  updatePublishStatus,
  previewRecurrence,
  previewRecurrenceForLiveClass,
  duplicateLiveClass,
  deleteLiveClass
} = require('../controllers/subjectLiveClassController');

router.get('/create-form', getLiveClassCreateForm);
router.get('/dashboard-summary', getLiveClassDashboardSummary);
router.post('/preview-recurrence', previewRecurrence);
router.post('/:id/preview-recurrence', previewRecurrenceForLiveClass);
router.post('/:id/duplicate', duplicateLiveClass);
router.patch('/:id/publish-status', updatePublishStatus);

router.post('/', createLiveClass);
router.get('/', getLiveClasses);
router.get('/:id', getLiveClassById);
router.put('/:id', updateLiveClass);
router.delete('/:id', deleteLiveClass);

module.exports = router;
