const Course = require('../models/Course');
const CourseSubject = require('../models/CourseSubject');
const AnswerWritingQuestion = require('../models/AnswerWritingQuestion');
const { getCourseForAdmin } = require('./courseAccess');

const QUESTION_RELATION_POPULATE = [
  { path: 'courseId', select: 'title' },
  { path: 'subjectId', select: 'title' },
  { path: 'categoryId', select: 'title slug' }
];

const EVALUATOR_ROLES = ['super_admin', 'center_admin', 'employee'];

const normalizeStatusFilter = (status) => {
  if (!status) return null;
  const s = String(status).toLowerCase();
  if (s === 'completed') return 'evaluated';
  if (['upcoming', 'submitted', 'evaluated'].includes(s)) return s;
  return null;
};

const resolveDisplayStatus = (submission) => {
  if (!submission) return 'upcoming';
  if (submission.submissionStatus === 'evaluated') return 'evaluated';
  return 'submitted';
};

const getRequestUserId = (user) => user?._id || user?.id;

const isEvaluator = (role) => EVALUATOR_ROLES.includes(role);

const assertEvaluatorCourseAccess = async (req, res, courseId) => {
  const course = await getCourseForAdmin(req, res, courseId);
  return course;
};

const assertSubjectBelongsToCourse = async (courseId, subjectId) => {
  return CourseSubject.findOne({
    _id: subjectId,
    courseId,
    isDeleted: false
  }).lean();
};

const findQuestionWithRelations = (id) =>
  AnswerWritingQuestion.findById(id).populate(QUESTION_RELATION_POPULATE).lean();

const uploadAnswerFile = async (file, folder, uploadToCloudinary) => {
  if (!file) return null;
  const isPdf = file.mimetype === 'application/pdf';
  return uploadToCloudinary(
    file,
    folder,
    isPdf ? 'raw' : 'image',
    isPdf ? 'pdf' : null
  );
};

module.exports = {
  EVALUATOR_ROLES,
  normalizeStatusFilter,
  resolveDisplayStatus,
  getRequestUserId,
  isEvaluator,
  assertEvaluatorCourseAccess,
  assertSubjectBelongsToCourse,
  QUESTION_RELATION_POPULATE,
  findQuestionWithRelations,
  uploadAnswerFile
};
