const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const {
  createClassroom,
  getClassrooms,
  getClassroomById,
  updateClassroom,
  updateClassroomStatus,
  deleteClassroom
} = require('../controllers/classroomController');

router.use(protect, requireSuperAdmin);

router.patch('/status/:id', updateClassroomStatus);

router.post('/', createClassroom);
router.get('/', getClassrooms);
router.get('/:id', getClassroomById);
router.put('/:id', updateClassroom);
router.delete('/:id', deleteClassroom);

module.exports = router;
