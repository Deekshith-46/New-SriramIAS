const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const {
  createExamPattern,
  getExamPatterns,
  getExamPatternsDropdown,
  getExamPatternById,
  updateExamPattern,
  updateExamPatternStatus,
  deleteExamPattern
} = require('../controllers/examPatternController');
const {
  createSection,
  getSections,
  getSectionsDropdown,
  getSectionById,
  updateSection,
  updateSectionStatus,
  deleteSection
} = require('../controllers/testConfigSectionController');
const {
  createLanguage,
  getLanguages,
  getLanguagesDropdown,
  getLanguageById,
  updateLanguage,
  updateLanguageStatus,
  deleteLanguage
} = require('../controllers/testConfigLanguageController');

router.use(protect, requireSuperAdmin);

// Section 1: Exam Pattern
router.get('/exam-patterns/dropdown', getExamPatternsDropdown);
router.patch('/exam-patterns/status/:id', updateExamPatternStatus);
router.post('/exam-patterns', createExamPattern);
router.get('/exam-patterns', getExamPatterns);
router.get('/exam-patterns/:id', getExamPatternById);
router.put('/exam-patterns/:id', updateExamPattern);
router.delete('/exam-patterns/:id', deleteExamPattern);

// Section 2: Section Management
router.get('/sections/dropdown', getSectionsDropdown);
router.patch('/sections/status/:id', updateSectionStatus);
router.post('/sections', createSection);
router.get('/sections', getSections);
router.get('/sections/:id', getSectionById);
router.put('/sections/:id', updateSection);
router.delete('/sections/:id', deleteSection);

// Section 3: Language Settings
router.get('/languages/dropdown', getLanguagesDropdown);
router.patch('/languages/status/:id', updateLanguageStatus);
router.post('/languages', createLanguage);
router.get('/languages', getLanguages);
router.get('/languages/:id', getLanguageById);
router.put('/languages/:id', updateLanguage);
router.delete('/languages/:id', deleteLanguage);

module.exports = router;
