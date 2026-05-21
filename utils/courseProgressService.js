const CourseProgress = require('../models/CourseProgress');
const CourseSubject = require('../models/CourseSubject');
const RecordedLecture = require('../models/RecordedLecture');
const LectureProgress = require('../models/LectureProgress');
const { NOT_DELETED } = require('./lectureHelpers');

const syncCourseProgress = async (userId, courseId, lastOpenedLectureId = null) => {
  const lectureFilter = {
    courseId,
    isPublished: true,
    ...NOT_DELETED
  };

  const totalLectures = await RecordedLecture.countDocuments(lectureFilter);

  const publishedLectures = await RecordedLecture.find(lectureFilter).select('_id subjectId').lean();
  const publishedIds = publishedLectures.map((l) => l._id);

  const completedLectures = publishedIds.length
    ? await LectureProgress.countDocuments({
        userId,
        lectureId: { $in: publishedIds },
        isCompleted: true
      })
    : 0;

  const subjects = await CourseSubject.find({
    courseId,
    isActive: true,
    ...NOT_DELETED
  }).select('_id').lean();

  const totalSubjects = subjects.length;
  let completedSubjects = 0;

  for (const subject of subjects) {
    const subjectLectureIds = publishedLectures
      .filter((l) => l.subjectId.toString() === subject._id.toString())
      .map((l) => l._id);

    if (!subjectLectureIds.length) continue;

    const subjectCompleted = await LectureProgress.countDocuments({
      userId,
      lectureId: { $in: subjectLectureIds },
      isCompleted: true
    });

    if (subjectCompleted === subjectLectureIds.length) {
      completedSubjects += 1;
    }
  }

  const progressPercent = totalLectures > 0
    ? Math.min(100, Math.round((completedLectures / totalLectures) * 100))
    : 0;

  const update = {
    completedLectures,
    totalLectures,
    progressPercent,
    completedSubjects,
    totalSubjects,
    lastWatchedAt: new Date()
  };

  if (lastOpenedLectureId) {
    update.lastOpenedLectureId = lastOpenedLectureId;
  }

  return CourseProgress.findOneAndUpdate(
    { userId, courseId },
    update,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

module.exports = { syncCourseProgress };
