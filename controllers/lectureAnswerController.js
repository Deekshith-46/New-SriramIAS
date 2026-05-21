const RecordedLecture = require('../models/RecordedLecture');
const LectureAnswer = require('../models/LectureAnswer');
const { assertEnrollmentAccess } = require('../utils/courseAccess');

exports.saveAnswer = async (req, res) => {
  try {
    const { lectureId, answerText } = req.body;

    if (!lectureId) {
      return res.status(400).json({ success: false, message: 'lectureId is required' });
    }

    const lecture = await RecordedLecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const answer = await LectureAnswer.findOneAndUpdate(
      { userId: req.user._id, lectureId },
      {
        courseId: lecture.courseId,
        answerText: answerText ?? ''
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: answer });
  } catch (error) {
    console.error('Save Answer Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getAnswer = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await RecordedLecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const answer = await LectureAnswer.findOne({
      userId: req.user._id,
      lectureId
    });

    res.json({
      success: true,
      data: answer || { lectureId, answerText: '' },
      mainsQuestion: lecture.mainsQuestion || null
    });
  } catch (error) {
    console.error('Get Answer Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
