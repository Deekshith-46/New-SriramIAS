const CourseProgress = require('../models/CourseProgress');
const RecordedLecture = require('../models/RecordedLecture');
const { assertEnrollmentAccess } = require('../utils/courseAccess');
const { syncCourseProgress } = require('../utils/courseProgressService');
const { NOT_DELETED } = require('../utils/lectureHelpers');

exports.getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    let progress = await CourseProgress.findOne({
      userId: req.user._id,
      courseId
    }).populate('lastOpenedLectureId', 'lectureTitle thumbnail subjectId');

    if (!progress) {
      progress = await syncCourseProgress(req.user._id, courseId);
      progress = await CourseProgress.findById(progress._id)
        .populate('lastOpenedLectureId', 'lectureTitle thumbnail subjectId');
    }

    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Get Course Progress Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateLastOpened = async (req, res) => {
  try {
    const { courseId, lectureId } = req.body;

    if (!courseId || !lectureId) {
      return res.status(400).json({
        success: false,
        message: 'courseId and lectureId are required'
      });
    }

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const lecture = await RecordedLecture.findOne({
      _id: lectureId,
      courseId,
      isPublished: true,
      ...NOT_DELETED
    });

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const progress = await syncCourseProgress(req.user._id, courseId, lectureId);

    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Update Last Opened Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
