const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const {
  createSubject,
  getSubjectsByCourse,
  getSubjectsGrouped,
  getSubjectsByCourseAdmin,
  updateSubject,
  deleteSubject,
  reorderSubjects
} = require('../controllers/courseSubjectController');

router.use(protect);

router.get('/course/:courseId/grouped', getSubjectsGrouped);
router.get('/course/:courseId', getSubjectsByCourse);

router.use(allowRoles('super_admin', 'center_admin'));

router.post('/', createSubject);
router.put('/reorder', reorderSubjects);
router.get('/admin/course/:courseId', getSubjectsByCourseAdmin);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

module.exports = router;
