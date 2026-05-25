const AnswerWritingQuestion = require('../models/AnswerWritingQuestion');
const AnswerWritingSubmission = require('../models/AnswerWritingSubmission');
const AnswerWritingCategory = require('../models/AnswerWritingCategory');
const CourseSubject = require('../models/CourseSubject');
const {
  normalizeStatusFilter,
  filterQuestionsByStatus,
  STUDENT_STATUS_OPTIONS,
  resolveDisplayStatus,
  getRequestUserId,
  isEvaluator,
  assertSubjectBelongsToCourse,
  findQuestionWithRelations,
  QUESTION_RELATION_POPULATE,
  uploadAnswerFile
} = require('../utils/answerWritingHelpers');
const { getCourseForAdmin, assertEnrollmentAccess } = require('../utils/courseAccess');
const { sanitizeText } = require('../utils/sanitizeText');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

exports.createQuestion = async (req, res) => {
  try {
    const { courseId, subjectId, categoryId, title, question, isPublished } = req.body;

    if (!courseId || !subjectId || !categoryId || !title || !question) {
      return res.status(400).json({
        success: false,
        message: 'courseId, subjectId, categoryId, title, and question are required'
      });
    }

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const subject = await assertSubjectBelongsToCourse(courseId, subjectId);
    if (!subject) {
      return res.status(400).json({ success: false, message: 'Invalid subject for this course' });
    }

    const category = await AnswerWritingCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    let questionPaperPdf;
    if (req.files?.questionPaperPdf?.[0]) {
      const uploaded = await uploadAnswerFile(
        req.files.questionPaperPdf[0],
        'answer-writing/questions',
        uploadToCloudinary
      );
      questionPaperPdf = { url: uploaded.url, public_id: uploaded.public_id };
    }

    const doc = await AnswerWritingQuestion.create({
      courseId,
      subjectId,
      categoryId,
      title: sanitizeText(title),
      question: sanitizeText(question),
      questionPaperPdf,
      isPublished: isPublished !== undefined ? isPublished === 'true' || isPublished === true : true,
      createdBy: req.user._id
    });

    const data = await findQuestionWithRelations(doc._id);

    res.status(201).json({ success: true, message: 'Question created', data });
  } catch (error) {
    console.error('Create answer writing question error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getStudentFilters = async (req, res) => {
  try {
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId query parameter is required' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const publishedQuestions = await AnswerWritingQuestion.find({
      courseId,
      isPublished: true
    })
      .select('subjectId categoryId')
      .lean();

    const subjectIds = [...new Set(publishedQuestions.map((q) => String(q.subjectId)))];
    const categoryIds = [...new Set(publishedQuestions.map((q) => String(q.categoryId)))];

    const [subjects, categories] = await Promise.all([
      subjectIds.length
        ? CourseSubject.find({
            _id: { $in: subjectIds },
            courseId,
            isActive: true,
            isDeleted: false
          })
            .select('title')
            .sort({ order: 1, createdAt: 1 })
            .lean()
        : [],
      categoryIds.length
        ? AnswerWritingCategory.find({ _id: { $in: categoryIds } })
            .select('title slug')
            .sort({ title: 1 })
            .lean()
        : []
    ]);

    res.json({
      success: true,
      data: {
        subjects,
        categories,
        statuses: STUDENT_STATUS_OPTIONS
      }
    });
  } catch (error) {
    console.error('Get answer writing student filters error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const { courseId, subjectId, categoryId, status } = req.query;
    const statusFilter = normalizeStatusFilter(status);
    const studentUserId = getRequestUserId(req.user);
    const adminView = isEvaluator(req.user.role);

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId query parameter is required' });
    }

    if (adminView) {
      const course = await getCourseForAdmin(req, res, courseId);
      if (!course) return;
    } else {
      const enrollment = await assertEnrollmentAccess(req, res, courseId);
      if (!enrollment) return;
    }

    const filter = { courseId };
    if (subjectId) filter.subjectId = subjectId;
    if (categoryId) filter.categoryId = categoryId;
    if (!adminView) filter.isPublished = true;

    const questions = await AnswerWritingQuestion.find(filter)
      .populate(QUESTION_RELATION_POPULATE)
      .sort({ createdAt: -1 })
      .lean();

    let submissionMap = new Map();
    if (!adminView && studentUserId) {
      const submissions = await AnswerWritingSubmission.find({
        studentId: studentUserId,
        questionId: { $in: questions.map((q) => q._id) }
      }).lean();
      submissionMap = new Map(submissions.map((s) => [String(s.questionId), s]));
    }

    let data = questions.map((q) => {
      const submission = submissionMap.get(String(q._id));
      const displayStatus = resolveDisplayStatus(submission);
      return {
        ...q,
        displayStatus,
        submissionId: submission?._id ?? null,
        submission: submission
          ? {
              _id: submission._id,
              submissionStatus: submission.submissionStatus,
              marks: submission.marks,
              evaluatedAt: submission.evaluatedAt
            }
          : null
      };
    });

    if (!adminView) {
      data = filterQuestionsByStatus(data, statusFilter);
    } else if (statusFilter) {
      data = filterQuestionsByStatus(data, statusFilter);
    }

    res.json({
      success: true,
      count: data.length,
      data,
      filters: {
        courseId,
        subjectId: subjectId || null,
        categoryId: categoryId || null,
        status: statusFilter || null
      }
    });
  } catch (error) {
    console.error('Get answer writing questions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getQuestionById = async (req, res) => {
  try {
    const question = await AnswerWritingQuestion.findById(req.params.id)
      .populate(QUESTION_RELATION_POPULATE)
      .lean();

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const adminView = isEvaluator(req.user.role);

    if (adminView) {
      const course = await getCourseForAdmin(req, res, question.courseId);
      if (!course) return;
    } else {
      if (!question.isPublished) {
        return res.status(404).json({ success: false, message: 'Question not found' });
      }
      const enrollment = await assertEnrollmentAccess(req, res, question.courseId);
      if (!enrollment) return;
    }

    let submission = null;
    const studentUserId = getRequestUserId(req.user);
    if (!adminView && studentUserId) {
      submission = await AnswerWritingSubmission.findOne({
        studentId: studentUserId,
        questionId: question._id
      }).lean();
    }

    res.json({
      success: true,
      data: {
        ...question,
        displayStatus: resolveDisplayStatus(submission),
        submission
      }
    });
  } catch (error) {
    console.error('Get answer writing question error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const question = await AnswerWritingQuestion.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const course = await getCourseForAdmin(req, res, question.courseId);
    if (!course) return;

    const { subjectId, categoryId, title, question: questionText, isPublished } = req.body;

    if (subjectId) {
      const subject = await assertSubjectBelongsToCourse(question.courseId, subjectId);
      if (!subject) {
        return res.status(400).json({ success: false, message: 'Invalid subject for this course' });
      }
      question.subjectId = subjectId;
    }

    if (categoryId) {
      const category = await AnswerWritingCategory.findById(categoryId);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      question.categoryId = categoryId;
    }

    if (title) question.title = sanitizeText(title);
    if (questionText) question.question = sanitizeText(questionText);

    if (isPublished !== undefined) {
      question.isPublished = isPublished === 'true' || isPublished === true;
    }

    if (req.files?.questionPaperPdf?.[0]) {
      const uploaded = await uploadAnswerFile(
        req.files.questionPaperPdf[0],
        'answer-writing/questions',
        uploadToCloudinary
      );
      question.questionPaperPdf = { url: uploaded.url, public_id: uploaded.public_id };
    }

    await question.save();

    const data = await findQuestionWithRelations(question._id);

    res.json({ success: true, message: 'Question updated', data });
  } catch (error) {
    console.error('Update answer writing question error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await AnswerWritingQuestion.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const course = await getCourseForAdmin(req, res, question.courseId);
    if (!course) return;

    const submissionsDeleted = await AnswerWritingSubmission.deleteMany({ questionId: question._id });
    await AnswerWritingQuestion.deleteOne({ _id: question._id });

    res.json({
      success: true,
      message: 'Question deleted permanently',
      submissionsDeleted: submissionsDeleted.deletedCount
    });
  } catch (error) {
    console.error('Delete answer writing question error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
