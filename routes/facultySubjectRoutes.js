const express = require('express');
const router = express.Router();
const {
  createFacultySubject,
  getFacultySubjects,
  getFacultySubjectCreateForm,
  getFacultySubjectsDropdown,
  getFacultySubjectSummary,
  getFacultySubjectById,
  updateFacultySubject,
  updateFacultySubjectStatus,
  deleteFacultySubject
} = require('../controllers/facultySubjectController');

router.get('/create-form', getFacultySubjectCreateForm);
router.get('/dropdown', getFacultySubjectsDropdown);
router.get('/summary/:id', getFacultySubjectSummary);
router.patch('/status/:id', updateFacultySubjectStatus);

router.post('/', createFacultySubject);
router.get('/', getFacultySubjects);
router.get('/:id', getFacultySubjectById);
router.put('/:id', updateFacultySubject);
router.delete('/:id', deleteFacultySubject);

module.exports = router;
