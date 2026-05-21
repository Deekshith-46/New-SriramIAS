const RecordedLecture = require('../models/RecordedLecture');
const LectureNote = require('../models/LectureNote');
const { assertEnrollmentAccess } = require('../utils/courseAccess');
const { NOT_DELETED } = require('../utils/lectureHelpers');

const getLectureWithAccess = async (req, res, lectureId) => {
  const lecture = await RecordedLecture.findOne({
    _id: lectureId,
    isPublished: true,
    ...NOT_DELETED
  });
  if (!lecture) {
    res.status(404).json({ success: false, message: 'Lecture not found' });
    return null;
  }

  if (!lecture.isPreviewFree) {
    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return null;
  }

  return lecture;
};

exports.saveNote = async (req, res) => {
  try {
    const { lectureId, noteText } = req.body;

    if (!lectureId) {
      return res.status(400).json({ success: false, message: 'lectureId is required' });
    }

    const lecture = await getLectureWithAccess(req, res, lectureId);
    if (!lecture) return;

    const note = await LectureNote.findOneAndUpdate(
      { userId: req.user._id, lectureId },
      { noteText: noteText ?? '' },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: note });
  } catch (error) {
    console.error('Save Note Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getNote = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await getLectureWithAccess(req, res, lectureId);
    if (!lecture) return;

    const note = await LectureNote.findOne({
      userId: req.user._id,
      lectureId
    });

    res.json({
      success: true,
      data: note || { lectureId, noteText: '' }
    });
  } catch (error) {
    console.error('Get Note Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
