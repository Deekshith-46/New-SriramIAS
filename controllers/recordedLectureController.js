const RecordedLecture = require('../models/RecordedLecture');
const CourseSubject = require('../models/CourseSubject');
const Course = require('../models/Course');
const LectureProgress = require('../models/LectureProgress');
const LectureNote = require('../models/LectureNote');
const LectureQuizAttempt = require('../models/LectureQuizAttempt');
const LectureAnswer = require('../models/LectureAnswer');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const {
  assertEnrollmentAccess,
  getCourseForAdmin,
  parseJsonField
} = require('../utils/courseAccess');
const {
  NOT_DELETED,
  sanitizeLectureForStudent,
  validateTopicQuiz,
  deleteFromCloudinary,
  cleanupUploads,
  getVideoDurationFromUpload,
  formatLecture,
  formatLectures,
  withLectureTitles,
  withLectureTitlesList
} = require('../utils/lectureHelpers');

const getLectureTitleContext = async (subjectId, courseDoc = null) => {
  const subject = await CourseSubject.findOne({ _id: subjectId, ...NOT_DELETED }).lean();
  if (!subject) return null;

  let courseTitle = courseDoc?.title;
  if (!courseTitle) {
    const course = await Course.findById(subject.courseId).select('title').lean();
    courseTitle = course?.title ?? '';
  }

  return {
    courseId: subject.courseId,
    courseTitle,
    subjectId: subject._id,
    subjectTitle: subject.title
  };
};

const getNextLectureOrder = async (subjectId) => {
  const last = await RecordedLecture.findOne({ subjectId, ...NOT_DELETED })
    .sort({ order: -1 })
    .select('order')
    .lean();
  return (last?.order ?? -1) + 1;
};

const uploadLectureFiles = async (files) => {
  const uploads = {};

  if (files?.thumbnail?.[0]) {
    uploads.thumbnail = await uploadToCloudinary(
      files.thumbnail[0],
      'courses/recorded/thumbnails',
      'image'
    );
  }

  if (files?.video?.[0]) {
    uploads.video = await uploadToCloudinary(
      files.video[0],
      'courses/recorded/videos',
      'video'
    );
  }

  if (files?.cheatSheetPdf?.[0]) {
    uploads.cheatSheetPdf = await uploadToCloudinary(
      files.cheatSheetPdf[0],
      'courses/recorded/cheat-sheets',
      'raw',
      'pdf'
    );
  }

  return uploads;
};

const applyPublishState = (lecture, isPublished) => {
  lecture.isPublished = isPublished;
  if (isPublished && !lecture.publishedAt) {
    lecture.publishedAt = new Date();
  }
};

exports.createLecture = async (req, res) => {
  let uploads = null;

  try {
    const {
      courseId,
      subjectId,
      lectureTitle,
      lectureDescription,
      isPublished
    } = req.body;

    if (!courseId || !subjectId || !lectureTitle) {
      return res.status(400).json({
        success: false,
        message: 'courseId, subjectId, and lectureTitle are required'
      });
    }

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const subject = await CourseSubject.findOne({ _id: subjectId, courseId, ...NOT_DELETED });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found for this course' });
    }

    const topicQuiz = parseJsonField(req.body.topicQuiz) || [];
    const quizError = validateTopicQuiz(topicQuiz);
    if (quizError) {
      return res.status(400).json({ success: false, message: quizError });
    }

    uploads = await uploadLectureFiles(req.files);
    const cheatSheet = parseJsonField(req.body.cheatSheet) || {};
    const mainsQuestion = parseJsonField(req.body.mainsQuestion) || {};

    if (uploads.cheatSheetPdf) {
      cheatSheet.pdf = {
        url: uploads.cheatSheetPdf.url,
        public_id: uploads.cheatSheetPdf.public_id
      };
    }

    const published = isPublished !== false && isPublished !== 'false';
    const nextOrder = await getNextLectureOrder(subjectId);

    const lecture = await RecordedLecture.create({
      courseId,
      subjectId,
      lectureTitle,
      lectureDescription,
      order: nextOrder,
      thumbnail: uploads.thumbnail || undefined,
      video: uploads.video
        ? {
            url: uploads.video.url,
            public_id: uploads.video.public_id,
            duration: getVideoDurationFromUpload(uploads.video)
          }
        : undefined,
      cheatSheet: Object.keys(cheatSheet).length ? cheatSheet : undefined,
      topicQuiz,
      mainsQuestion: Object.keys(mainsQuestion).length ? mainsQuestion : undefined,
      isPreviewFree: false,
      isPublished: published,
      publishedAt: published ? new Date() : null,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: withLectureTitles(lecture, {
        courseTitle: course.title,
        subjectTitle: subject.title
      })
    });
  } catch (error) {
    await cleanupUploads(uploads);
    console.error('Create Lecture Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLecturesBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { page, limit, skip } = getPagination(req.query);

    const titles = await getLectureTitleContext(subjectId);
    if (!titles) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, titles.courseId);
    if (!enrollment) return;

    const filter = { subjectId, isPublished: true, ...NOT_DELETED };
    const total = await RecordedLecture.countDocuments(filter);

    const lectures = await RecordedLecture.find(filter)
      .sort({ order: 1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

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

    const data = lectures.map((lecture) => {
      const progress = progressMap.get(lecture._id.toString());
      return {
        ...withLectureTitles(lecture, titles, { forStudent: true }),
        progressPercent: progress?.progressPercent ?? 0,
        isCompleted: progress?.isCompleted ?? false
      };
    });

    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    console.error('Get Lectures Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLecturesBySubjectAdmin = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const includeDeleted = req.query.includeDeleted === 'true';

    const subject = await CourseSubject.findById(subjectId);
    if (!subject || (!includeDeleted && subject.isDeleted)) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const course = await getCourseForAdmin(req, res, subject.courseId);
    if (!course) return;

    const filter = { subjectId };
    if (!includeDeleted) Object.assign(filter, NOT_DELETED);

    const lectures = await RecordedLecture.find(filter).sort({ order: 1, createdAt: 1 });
    const titles = {
      courseTitle: course.title,
      subjectTitle: subject.title
    };

    res.json({
      success: true,
      count: lectures.length,
      data: withLectureTitlesList(lectures, titles)
    });
  } catch (error) {
    console.error('Admin Get Lectures Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLectureById = async (req, res) => {
  try {
    const lecture = await RecordedLecture.findById(req.params.id);
    if (!lecture || lecture.isDeleted) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    if (!lecture.isPublished && !['super_admin', 'center_admin'].includes(req.user.role)) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const isAdmin = ['super_admin', 'center_admin'].includes(req.user.role);

    if (!isAdmin) {
      if (!lecture.isPreviewFree) {
        const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
        if (!enrollment) return;
      }

      const titles = await getLectureTitleContext(lecture.subjectId);
      return res.json({
        success: true,
        data: withLectureTitles(lecture, titles, { forStudent: true })
      });
    }

    const course = await getCourseForAdmin(req, res, lecture.courseId);
    if (!course) return;

    const titles = await getLectureTitleContext(lecture.subjectId, course);
    res.json({ success: true, data: withLectureTitles(lecture, titles) });
  } catch (error) {
    console.error('Get Lecture Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateLecture = async (req, res) => {
  let uploads = null;
  const oldAssets = { thumbnail: null, video: null, cheatSheetPdf: null };

  try {
    const lecture = await RecordedLecture.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const course = await getCourseForAdmin(req, res, lecture.courseId);
    if (!course) return;

    const topicQuiz = parseJsonField(req.body.topicQuiz);
    if (topicQuiz) {
      const quizError = validateTopicQuiz(topicQuiz);
      if (quizError) {
        return res.status(400).json({ success: false, message: quizError });
      }
      lecture.topicQuiz = topicQuiz;
    }

    uploads = await uploadLectureFiles(req.files);

    if (uploads.thumbnail) {
      oldAssets.thumbnail = lecture.thumbnail?.public_id;
      lecture.thumbnail = uploads.thumbnail;
    }

    if (uploads.video) {
      oldAssets.video = lecture.video?.public_id;
      lecture.video = {
        url: uploads.video.url,
        public_id: uploads.video.public_id,
        duration: getVideoDurationFromUpload(uploads.video) || lecture.video?.duration || 0
      };
    }

    const cheatSheet = parseJsonField(req.body.cheatSheet);
    if (cheatSheet) {
      if (uploads.cheatSheetPdf) {
        oldAssets.cheatSheetPdf = lecture.cheatSheet?.pdf?.public_id;
        cheatSheet.pdf = {
          url: uploads.cheatSheetPdf.url,
          public_id: uploads.cheatSheetPdf.public_id
        };
      }
      lecture.cheatSheet = cheatSheet;
    } else if (uploads.cheatSheetPdf) {
      oldAssets.cheatSheetPdf = lecture.cheatSheet?.pdf?.public_id;
      lecture.cheatSheet = {
        ...(lecture.cheatSheet?.toObject?.() || lecture.cheatSheet || {}),
        pdf: {
          url: uploads.cheatSheetPdf.url,
          public_id: uploads.cheatSheetPdf.public_id
        }
      };
    }

    const mainsQuestion = parseJsonField(req.body.mainsQuestion);
    if (mainsQuestion) lecture.mainsQuestion = mainsQuestion;

    const fields = ['lectureTitle', 'lectureDescription', 'subjectId'];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        lecture[field] = req.body[field];
      }
    }

    if (req.body.isPublished !== undefined) {
      const published = req.body.isPublished === true || req.body.isPublished === 'true';
      applyPublishState(lecture, published);
    }

    await lecture.save();

    if (oldAssets.thumbnail) await deleteFromCloudinary(oldAssets.thumbnail, 'image');
    if (oldAssets.video) await deleteFromCloudinary(oldAssets.video, 'video');
    if (oldAssets.cheatSheetPdf) await deleteFromCloudinary(oldAssets.cheatSheetPdf, 'raw');

    const subject = await CourseSubject.findOne({ _id: lecture.subjectId, ...NOT_DELETED }).lean();
    res.json({
      success: true,
      data: withLectureTitles(lecture, {
        courseTitle: course.title,
        subjectTitle: subject?.title ?? ''
      })
    });
  } catch (error) {
    await cleanupUploads(uploads);
    console.error('Update Lecture Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteLecture = async (req, res) => {
  try {
    const lecture = await RecordedLecture.findById(req.params.id);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const course = await getCourseForAdmin(req, res, lecture.courseId);
    if (!course) return;

    const lectureId = lecture._id;

    await Promise.all([
      deleteFromCloudinary(lecture.thumbnail?.public_id, 'image'),
      deleteFromCloudinary(lecture.video?.public_id, 'video'),
      deleteFromCloudinary(lecture.cheatSheet?.pdf?.public_id, 'raw'),
      LectureNote.deleteMany({ lectureId }),
      LectureProgress.deleteMany({ lectureId }),
      LectureQuizAttempt.deleteMany({ lectureId }),
      LectureAnswer.deleteMany({ lectureId })
    ]);

    await RecordedLecture.deleteOne({ _id: lectureId });

    res.json({
      success: true,
      message: 'Lecture and related data permanently deleted'
    });
  } catch (error) {
    console.error('Delete Lecture Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.reorderLectures = async (req, res) => {
  try {
    const { subjectId, items } = req.body;

    if (!subjectId || !Array.isArray(items) || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'subjectId and items array are required'
      });
    }

    const subject = await CourseSubject.findOne({ _id: subjectId, ...NOT_DELETED });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const course = await getCourseForAdmin(req, res, subject.courseId);
    if (!course) return;

    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: item.id, subjectId, ...NOT_DELETED },
        update: { $set: { order: item.order } }
      }
    }));

    await RecordedLecture.bulkWrite(bulkOps);

    const lectures = await RecordedLecture.find({ subjectId, ...NOT_DELETED })
      .sort({ order: 1, createdAt: 1 });

    res.json({
      success: true,
      data: withLectureTitlesList(lectures, {
        courseTitle: course.title,
        subjectTitle: subject.title
      })
    });
  } catch (error) {
    console.error('Reorder Lectures Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
