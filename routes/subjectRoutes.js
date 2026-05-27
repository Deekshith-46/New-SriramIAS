const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const {
  createSubject,
  getSubjects,
  getSubjectsDropdown,
  getSubjectById,
  updateSubject,
  updateSubjectStatus,
  deleteSubject
} = require('../controllers/subjectController');

router.use(protect, requireSuperAdmin);

router.get('/dropdown', getSubjectsDropdown);
router.patch('/status/:id', updateSubjectStatus);

router.post('/', createSubject);
router.get('/', getSubjects);
router.get('/:id', getSubjectById);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

module.exports = router;
