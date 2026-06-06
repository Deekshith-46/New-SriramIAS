const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const {
  createTeacher,
  getTeachers,
  getTeachersDropdown,
  getTeacherById,
  updateTeacher,
  updateTeacherStatus,
  deleteTeacher
} = require('../controllers/teacherController');

router.use(protect, requireSuperAdmin);

router.patch('/status/:id', updateTeacherStatus);

router.post('/', createTeacher);
router.get('/dropdown', getTeachersDropdown);
router.get('/', getTeachers);
router.get('/:id', getTeacherById);
router.put('/:id', updateTeacher);
router.delete('/:id', deleteTeacher);

module.exports = router;
