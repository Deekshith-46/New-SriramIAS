const RecordedLecture = require('../models/RecordedLecture');
const LectureProgress = require('../models/LectureProgress');
const { assertEnrollmentAccess } = require('../utils/courseAccess');
const { syncCourseProgress } = require('../utils/courseProgressService');
const { NOT_DELETED } = require('../utils/lectureHelpers');

exports.updateProgress = async (req, res) => {
  try {
    const { lectureId, watchedDuration } = req.body;

    if (!lectureId || watchedDuration === undefined) {
      return res.status(400).json({
        success: false,
        message: 'lectureId and watchedDuration are required'
      });
    }

    const lecture = await RecordedLecture.findOne({
      _id: lectureId,
      isPublished: true,
      ...NOT_DELETED
    });
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const serverDuration = lecture.video?.duration || 0;
    const totalDuration = serverDuration;
    const watched = totalDuration > 0
      ? Math.min(totalDuration, Math.max(0, Number(watchedDuration)))
      : Math.max(0, Number(watchedDuration));

    let progressPercent = 0;
    if (totalDuration > 0) {
      progressPercent = Math.min(100, Math.round((watched / totalDuration) * 100));
    }

    const isCompleted = totalDuration > 0 && watched >= totalDuration * 0.9;

    const progress = await LectureProgress.findOneAndUpdate(
      { userId: req.user._id, lectureId },
      {
        courseId: lecture.courseId,
        watchedDuration: watched,
        totalDuration,
        progressPercent,
        isCompleted,
        lastWatchedAt: new Date()
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const courseProgress = await syncCourseProgress(
      req.user._id,
      lecture.courseId,
      lectureId
    );

    res.json({ success: true, data: progress, courseProgress });
  } catch (error) {
    console.error('Update Progress Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getProgress = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await RecordedLecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const progress = await LectureProgress.findOne({
      userId: req.user._id,
      lectureId
    });

    res.json({
      success: true,
      data: progress || {
        lectureId,
        watchedDuration: 0,
        totalDuration: lecture.video?.duration || 0,
        progressPercent: 0,
        isCompleted: false
      }
    });
  } catch (error) {
    console.error('Get Progress Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
