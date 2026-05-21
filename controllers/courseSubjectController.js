const CourseSubject = require('../models/CourseSubject');
const Course = require('../models/Course');
const RecordedLecture = require('../models/RecordedLecture');
const LectureProgress = require('../models/LectureProgress');
const {
  assertEnrollmentAccess,
  getCourseForAdmin
} = require('../utils/courseAccess');
const { NOT_DELETED, sanitizeLectureForStudent, withLectureTitles } = require('../utils/lectureHelpers');

const formatSubject = (subject) => {
  if (!subject) return subject;
  if (typeof subject.toObject === 'function') {
    return subject.toObject();
  }
  const { description, order, __v, ...rest } = subject;
  return rest;
};

const formatSubjects = (subjects) => subjects.map(formatSubject);

exports.createSubject = async (req, res) => {
  try {
    const { courseId, title } = req.body;

    if (!courseId || !title?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'courseId and title are required'
      });
    }

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const subject = await CourseSubject.create({
      courseId,
      title: title.trim(),
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: formatSubject(subject) });
  } catch (error) {
    console.error('Create Subject Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubjectsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const subjects = await CourseSubject.find({ courseId, isActive: true, ...NOT_DELETED })
      .sort({ order: 1, createdAt: 1 });

    res.json({ success: true, count: subjects.length, data: formatSubjects(subjects) });
  } catch (error) {
    console.error('Get Subjects Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubjectsGrouped = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const course = await Course.findById(courseId).select('title').lean();
    const courseTitle = course?.title ?? '';

    const subjects = await CourseSubject.find({ courseId, isActive: true, ...NOT_DELETED })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const subjectIds = subjects.map((s) => s._id);
    const lectures = subjectIds.length
      ? await RecordedLecture.find({
          courseId,
          subjectId: { $in: subjectIds },
          isPublished: true,
          ...NOT_DELETED
        })
          .select('subjectId lectureTitle lectureDescription thumbnail video order isPreviewFree')
          .sort({ order: 1, createdAt: 1 })
          .lean()
      : [];

    const lectureIds = lectures.map((l) => l._id);
    const progressList = lectureIds.length
      ? await LectureProgress.find({
          userId: req.user._id,
          lectureId: { $in: lectureIds }
        }).lean()
      : [];

    const progressMap = new Map(
      progressList.map((p) => [p.lectureId.toString(), p])
    );

    const lecturesBySubject = new Map();
    for (const lecture of lectures) {
      const key = lecture.subjectId.toString();
      const progress = progressMap.get(lecture._id.toString());
      const entry = {
        ...withLectureTitles(lecture, {
          courseTitle,
          subjectTitle: subjects.find((s) => s._id.toString() === key)?.title ?? ''
        }, { forStudent: true }),
        progressPercent: progress?.progressPercent ?? 0,
        isCompleted: progress?.isCompleted ?? false
      };
      if (!lecturesBySubject.has(key)) lecturesBySubject.set(key, []);
      lecturesBySubject.get(key).push(entry);
    }

    const data = subjects.map((subject) => ({
      subject: formatSubject(subject),
      lectures: lecturesBySubject.get(subject._id.toString()) || []
    }));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('Get Grouped Subjects Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubjectsByCourseAdmin = async (req, res) => {
  try {
    const { courseId } = req.params;
    const includeDeleted = req.query.includeDeleted === 'true';

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const filter = { courseId };
    if (!includeDeleted) Object.assign(filter, NOT_DELETED);

    const subjects = await CourseSubject.find(filter).sort({ order: 1, createdAt: 1 });

    res.json({ success: true, count: subjects.length, data: formatSubjects(subjects) });
  } catch (error) {
    console.error('Admin Get Subjects Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const subject = await CourseSubject.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const course = await getCourseForAdmin(req, res, subject.courseId);
    if (!course) return;

    const { title } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'title is required'
      });
    }

    subject.title = title.trim();

    await subject.save();

    res.json({ success: true, data: formatSubject(subject) });
  } catch (error) {
    console.error('Update Subject Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const subject = await CourseSubject.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const course = await getCourseForAdmin(req, res, subject.courseId);
    if (!course) return;

    const now = new Date();
    subject.isDeleted = true;
    subject.deletedAt = now;
    subject.isActive = false;
    await subject.save();

    await RecordedLecture.updateMany(
      { subjectId: subject._id, ...NOT_DELETED },
      { $set: { isDeleted: true, deletedAt: now, isPublished: false } }
    );

    res.json({
      success: true,
      message: 'Subject and its lectures soft-deleted successfully'
    });
  } catch (error) {
    console.error('Delete Subject Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.reorderSubjects = async (req, res) => {
  try {
    const { courseId, items } = req.body;

    if (!courseId || !Array.isArray(items) || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'courseId and items array are required'
      });
    }

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: item.id, courseId, ...NOT_DELETED },
        update: { $set: { order: item.order } }
      }
    }));

    await CourseSubject.bulkWrite(bulkOps);

    const subjects = await CourseSubject.find({ courseId, ...NOT_DELETED })
      .sort({ order: 1, createdAt: 1 });

    res.json({ success: true, data: formatSubjects(subjects) });
  } catch (error) {
    console.error('Reorder Subjects Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
