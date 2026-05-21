const cloudinary = require('../config/cloudinary');

const NOT_DELETED = { isDeleted: false };

const stripQuizAnswers = (lecture) => {
  const doc = lecture.toObject ? lecture.toObject() : { ...lecture };
  if (Array.isArray(doc.topicQuiz)) {
    doc.topicQuiz = doc.topicQuiz.map((q) => ({
      question: q.question,
      options: q.options
    }));
  }
  return doc;
};

const sanitizeLectureForStudent = (lecture) => {
  const doc = stripQuizAnswers(lecture);

  if (doc.thumbnail) {
    doc.thumbnail = { url: doc.thumbnail.url || null };
  }

  if (doc.video) {
    doc.video = {
      url: doc.video.url || null,
      duration: doc.video.duration || 0
    };
  }

  if (doc.cheatSheet?.pdf) {
    doc.cheatSheet = {
      ...doc.cheatSheet,
      pdf: { url: doc.cheatSheet.pdf.url || null }
    };
  }

  delete doc.order;
  delete doc.isPreviewFree;

  return doc;
};

const formatLecture = (lecture) => {
  if (!lecture) return lecture;
  const doc = lecture.toObject ? lecture.toObject() : { ...lecture };
  delete doc.order;
  delete doc.isPreviewFree;
  delete doc.__v;
  return doc;
};

const formatLectures = (lectures) => lectures.map(formatLecture);

const withLectureTitles = (lecture, titles, { forStudent = false } = {}) => {
  const base = forStudent ? sanitizeLectureForStudent(lecture) : formatLecture(lecture);
  return {
    ...base,
    courseTitle: titles?.courseTitle ?? '',
    subjectTitle: titles?.subjectTitle ?? ''
  };
};

const withLectureTitlesList = (lectures, titles, options = {}) =>
  lectures.map((lecture) => withLectureTitles(lecture, titles, options));

const validateTopicQuiz = (quiz) => {
  if (!Array.isArray(quiz)) {
    return 'topicQuiz must be an array';
  }

  for (let i = 0; i < quiz.length; i++) {
    const q = quiz[i];
    if (!q?.question?.trim()) {
      return `Question ${i + 1}: question is required`;
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      return `Question ${i + 1}: exactly 4 options are required`;
    }
    if (q.options.some((opt) => !String(opt).trim())) {
      return `Question ${i + 1}: all options must be non-empty`;
    }
    const correct = Number(q.correctAnswer);
    if (!Number.isInteger(correct) || correct < 0 || correct > 3) {
      return `Question ${i + 1}: correctAnswer must be 0–3`;
    }
  }

  return null;
};

const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error('Cloudinary delete error:', error.message);
  }
};

const cleanupUploads = async (uploads) => {
  if (!uploads) return;
  if (uploads.thumbnail?.public_id) {
    await deleteFromCloudinary(uploads.thumbnail.public_id, 'image');
  }
  if (uploads.video?.public_id) {
    await deleteFromCloudinary(uploads.video.public_id, 'video');
  }
  if (uploads.cheatSheetPdf?.public_id) {
    await deleteFromCloudinary(uploads.cheatSheetPdf.public_id, 'raw');
  }
};

const getVideoDurationFromUpload = (videoUpload) => {
  if (!videoUpload) return 0;
  const duration = Number(videoUpload.duration);
  return Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0;
};

module.exports = {
  NOT_DELETED,
  stripQuizAnswers,
  sanitizeLectureForStudent,
  formatLecture,
  formatLectures,
  withLectureTitles,
  withLectureTitlesList,
  validateTopicQuiz,
  deleteFromCloudinary,
  cleanupUploads,
  getVideoDurationFromUpload
};
