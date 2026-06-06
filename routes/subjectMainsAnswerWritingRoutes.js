const express = require('express');
const router = express.Router();
const subjectMainsAnswerWritingUpload = require('../middleware/subjectMainsAnswerWritingUpload');
const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const { requireAdminAccessRoleCode } = require('../middleware/requireAdminAccessRoleCode');
const uploadAnswerWriting = require('../middleware/uploadAnswerWriting');
const {
  createMainsAnswerWriting,
  getMainsAnswerWritings,
  getMainsAnswerWritingById,
  getMainsAnswerWritingCreateForm,
  getMainsAnswerWritingDashboardSummary,
  updateMainsAnswerWriting,
  updateMainsAnswerWritingPublishStatus,
  deleteMainsAnswerWriting,
  getMainsAnswerWritingSubjectsDropdown,
  getMainsAnswerWritingTopicsDropdown
} = require('../controllers/subjectMainsAnswerWritingController');
const {
  listPublishedMainsTests,
  getPublishedMainsTestById,
  submitMainsAnswer,
  listMyMainsSubmissions,
  getMyMainsSubmissionById,
  getMyMainsSubmission,
  deleteMyMainsSubmission,
  trackMainsPdfDownload
} = require('../controllers/mainsAnswerWritingStudentController');

// =========================
// Student APIs (PUBLISHED only)
// =========================
router.get('/my-submissions', protect, listMyMainsSubmissions);
router.get('/submissions', protect, listMyMainsSubmissions);
router.get('/my-submissions/:submissionId', protect, getMyMainsSubmissionById);
router.get('/published/filter/subjects-dropdown', protect, getMainsAnswerWritingSubjectsDropdown);
router.get('/published/filter/topics-dropdown', protect, getMainsAnswerWritingTopicsDropdown);
router.get('/published', protect, listPublishedMainsTests);
router.get('/published/:id', protect, getPublishedMainsTestById);
router.post('/published/:id/track-pdf-download', protect, trackMainsPdfDownload);

// Submit answer (student)
const submissionUpload = uploadAnswerWriting.fields([{ name: 'answerFile', maxCount: 1 }]);
router.post('/published/:id/submissions', protect, submissionUpload, submitMainsAnswer);
router.get('/published/:id/my-submission', protect, getMyMainsSubmission);
router.delete('/published/:id/my-submission', protect, deleteMyMainsSubmission);

// Mentor evaluation: use /api/mentor/mains-answer-writing/* (see mentorRoutes.js)

// =========================
// Super Admin CMS APIs
// =========================
const superAdminAuth = [protect, requireSuperAdmin];

router.get('/create-form', ...superAdminAuth, getMainsAnswerWritingCreateForm);
router.get('/dashboard-summary', ...superAdminAuth, getMainsAnswerWritingDashboardSummary);
router.get('/filter/subjects-dropdown', ...superAdminAuth, getMainsAnswerWritingSubjectsDropdown);
router.get('/filter/topics-dropdown', ...superAdminAuth, getMainsAnswerWritingTopicsDropdown);
router.patch('/:id/publish-status', ...superAdminAuth, updateMainsAnswerWritingPublishStatus);

const maybeMainsPdfUpload = (req, res, next) => {
  const contentType = String(req.headers['content-type'] || '');
  if (contentType.includes('multipart/form-data')) {
    return subjectMainsAnswerWritingUpload(req, res, next);
  }
  return next();
};

router.post('/', ...superAdminAuth, subjectMainsAnswerWritingUpload, createMainsAnswerWriting);
router.get('/', ...superAdminAuth, getMainsAnswerWritings);
router.get('/:id', ...superAdminAuth, getMainsAnswerWritingById);
router.put('/:id', ...superAdminAuth, maybeMainsPdfUpload, updateMainsAnswerWriting);
router.delete('/:id', ...superAdminAuth, deleteMainsAnswerWriting);

module.exports = router;
