const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { requireAdminAccessRoleCode } = require('../middleware/requireAdminAccessRoleCode');
const uploadAnswerWriting = require('../middleware/uploadAnswerWriting');

const { getAssignedBatches, getAssignedStudents } = require('../controllers/mentorController');
const {
  getMentorMainsFacultySubjectsDropdown,
  getMentorMainsTestsDropdown,
  getMentorSubmissions,
  getMentorSubmissionById,
  evaluateMentorSubmission,
  deleteMentorEvaluation
} = require('../controllers/mentorAnswerWritingController');

router.use(protect, requireAdminAccessRoleCode('MENTOR_ADMIN'));

// Mentor dashboard: assignments
router.get('/batches', getAssignedBatches);
router.get('/students', getAssignedStudents);

// Mains Answer Writing — faculty subject / batch based (not courseId)
const evaluateUpload = uploadAnswerWriting.fields([{ name: 'evaluatedAnswerFile', maxCount: 1 }]);

router.get('/mains-answer-writing/faculty-subjects-dropdown', getMentorMainsFacultySubjectsDropdown);
router.get('/mains-answer-writing/tests-dropdown', getMentorMainsTestsDropdown);
router.get('/mains-answer-writing/submissions', getMentorSubmissions);
router.get('/mains-answer-writing/submissions/:id', getMentorSubmissionById);
router.put('/mains-answer-writing/submissions/:id/evaluate', evaluateUpload, evaluateMentorSubmission);
router.delete('/mains-answer-writing/submissions/:id/evaluation', deleteMentorEvaluation);

// Legacy paths (same handlers — use facultySubjectId not courseId)
router.get('/answer-writing/submissions', getMentorSubmissions);
router.get('/answer-writing/submissions/:id', getMentorSubmissionById);
router.put('/answer-writing/submissions/:id/evaluate', evaluateUpload, evaluateMentorSubmission);
router.delete('/answer-writing/submissions/:id/evaluation', deleteMentorEvaluation);

module.exports = router;

