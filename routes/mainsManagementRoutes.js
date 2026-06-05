const express = require('express');
const router = express.Router();
const {
  getMainsManagementDashboard,
  listMainsFacultySubjects,
  getMainsFacultySubjectDetails,
  getMainsTopicTests,
  getMainsTestResults
} = require('../controllers/mainsManagementController');

router.get('/dashboard', getMainsManagementDashboard);
router.get('/faculty-subjects', listMainsFacultySubjects);
router.get('/faculty-subjects/:facultySubjectId', getMainsFacultySubjectDetails);
router.get('/topics/:topicId/tests', getMainsTopicTests);
router.get('/tests/:testId/results', getMainsTestResults);

module.exports = router;
