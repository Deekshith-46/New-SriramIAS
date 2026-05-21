const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const uploadRecordedLecture = require('../middleware/uploadRecordedLecture');
const {
  createLecture,
  getLecturesBySubject,
  getLecturesBySubjectAdmin,
  getLectureById,
  updateLecture,
  deleteLecture,
  reorderLectures
} = require('../controllers/recordedLectureController');

const adminOnly = allowRoles('super_admin', 'center_admin');

const lectureUpload = uploadRecordedLecture.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'cheatSheetPdf', maxCount: 1 }
]);

router.use(protect);

router.get('/subject/:subjectId', getLecturesBySubject);

router.post('/', adminOnly, lectureUpload, createLecture);
router.put('/reorder', adminOnly, reorderLectures);
router.get('/admin/subject/:subjectId', adminOnly, getLecturesBySubjectAdmin);
router.put('/:id', adminOnly, lectureUpload, updateLecture);
router.delete('/:id', adminOnly, deleteLecture);

router.get('/:id', getLectureById);

module.exports = router;
