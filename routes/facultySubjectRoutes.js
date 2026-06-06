const express = require('express');
const router = express.Router();
const {
  createFacultySubject,
  getFacultySubjects,
  getFacultySubjectCreateForm,
  getFacultySubjectCategories,
  getFacultySubjectsDropdown,
  getFacultySubjectSummary,
  getContentTree,
  getFacultySubjectById,
  updateFacultySubject,
  updateFacultySubjectStatus,
  deleteFacultySubject
} = require('../controllers/facultySubjectController');
const {
  createFolder,
  updateFolder
} = require('../controllers/subjectContentFolderController');

router.get('/create-form', getFacultySubjectCreateForm);
router.get('/categories', getFacultySubjectCategories);
router.get('/dropdown', getFacultySubjectsDropdown);
router.get('/summary/:id', getFacultySubjectSummary);
router.get('/:id/content-tree', getContentTree);
router.post('/content/folders', createFolder);
router.put('/content/folders/:id', updateFolder);
router.patch('/status/:id', updateFacultySubjectStatus);

router.post('/', createFacultySubject);
router.get('/', getFacultySubjects);
router.get('/:id', getFacultySubjectById);
router.put('/:id', updateFacultySubject);
router.delete('/:id', deleteFacultySubject);

module.exports = router;
