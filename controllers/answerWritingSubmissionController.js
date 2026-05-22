const AnswerWritingQuestion = require('../models/AnswerWritingQuestion');
const AnswerWritingSubmission = require('../models/AnswerWritingSubmission');
const {
  normalizeStatusFilter,
  getRequestUserId,
  isEvaluator,
  assertEvaluatorCourseAccess,
  uploadAnswerFile
} = require('../utils/answerWritingHelpers');
const { assertEnrollmentAccess } = require('../utils/courseAccess');
const { sanitizeText, sanitizeOptionalText } = require('../utils/sanitizeText');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

exports.submitAnswer = async (req, res) => {
  try {
    const studentUserId = getRequestUserId(req.user);
    const { questionId, answerType, answerText } = req.body;

    if (!questionId || !answerType) {
      return res.status(400).json({
        success: false,
        message: 'questionId and answerType are required'
      });
    }

    if (!['text', 'file'].includes(answerType)) {
      return res.status(400).json({ success: false, message: 'answerType must be text or file' });
    }

    const question = await AnswerWritingQuestion.findOne({
      _id: questionId,
      isPublished: true
    });

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, question.courseId);
    if (!enrollment) return;

    const existing = await AnswerWritingSubmission.findOne({
      studentId: studentUserId,
      questionId
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an answer for this question'
      });
    }

    let payload = {
      studentId: studentUserId,
      questionId,
      courseId: question.courseId,
      answerType,
      submissionStatus: 'submitted'
    };

    if (answerType === 'text') {
      const text = sanitizeOptionalText(answerText);
      if (!text) {
        return res.status(400).json({ success: false, message: 'answerText is required for text answers' });
      }
      payload.answerText = text;
    } else {
      const file = req.files?.answerFile?.[0];
      if (!file) {
        return res.status(400).json({ success: false, message: 'answerFile is required for file answers' });
      }
      const uploaded = await uploadAnswerFile(
        file,
        'answer-writing/submissions',
        uploadToCloudinary
      );
      payload.answerFile = { url: uploaded.url, public_id: uploaded.public_id };
    }

    const submission = await AnswerWritingSubmission.create(payload);

    res.status(201).json({
      success: true,
      message: 'Answer submitted successfully',
      data: submission
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Submission already exists for this question' });
    }
    console.error('Submit answer writing error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getMySubmissions = async (req, res) => {
  try {
    const studentUserId = getRequestUserId(req.user);
    const statusFilter = normalizeStatusFilter(req.query.status);

    const filter = { studentId: studentUserId };
    if (statusFilter === 'submitted') filter.submissionStatus = 'submitted';
    if (statusFilter === 'evaluated') filter.submissionStatus = 'evaluated';

    const submissions = await AnswerWritingSubmission.find(filter)
      .populate({
        path: 'questionId',
        select: 'title question subjectId categoryId courseId questionPaperPdf',
        populate: [
          { path: 'subjectId', select: 'title' },
          { path: 'categoryId', select: 'title slug' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: submissions.length, data: submissions });
  } catch (error) {
    console.error('Get my submissions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubmissionById = async (req, res) => {
  try {
    const submission = await AnswerWritingSubmission.findById(req.params.id)
      .populate({
        path: 'questionId',
        populate: [
          { path: 'subjectId', select: 'title' },
          { path: 'categoryId', select: 'title slug' }
        ]
      })
      .populate('evaluatedBy', 'name email role')
      .lean();

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const userId = getRequestUserId(req.user);

    if (req.user.role === 'student') {
      if (submission.studentId.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (isEvaluator(req.user.role)) {
      const course = await assertEvaluatorCourseAccess(req, res, submission.courseId);
      if (!course) return;
    } else {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: submission });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getEvaluatorSubmissions = async (req, res) => {
  try {
    if (!isEvaluator(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Evaluator access only' });
    }

    const { courseId, subjectId, categoryId, status } = req.query;
    const statusFilter = normalizeStatusFilter(status) || 'submitted';

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId query parameter is required' });
    }

    const course = await assertEvaluatorCourseAccess(req, res, courseId);
    if (!course) return;

    const questionFilter = { courseId };
    if (subjectId) questionFilter.subjectId = subjectId;
    if (categoryId) questionFilter.categoryId = categoryId;

    const questions = await AnswerWritingQuestion.find(questionFilter).select('_id').lean();
    const questionIds = questions.map((q) => q._id);

    const submissionFilter = { questionId: { $in: questionIds } };
    if (statusFilter === 'submitted') submissionFilter.submissionStatus = 'submitted';
    if (statusFilter === 'evaluated') submissionFilter.submissionStatus = 'evaluated';

    const submissions = await AnswerWritingSubmission.find(submissionFilter)
      .populate('studentId', 'name email mobile')
      .populate({
        path: 'questionId',
        select: 'title question subjectId categoryId',
        populate: [
          { path: 'subjectId', select: 'title' },
          { path: 'categoryId', select: 'title slug' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: submissions.length, data: submissions });
  } catch (error) {
    console.error('Evaluator submissions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.evaluateSubmission = async (req, res) => {
  try {
    if (!isEvaluator(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Evaluator access only' });
    }

    const submission = await AnswerWritingSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const course = await assertEvaluatorCourseAccess(req, res, submission.courseId);
    if (!course) return;

    const {
      evaluatedAnswerType,
      evaluatedAnswerText,
      feedback,
      evaluatorFeedback,
      marks: marksRaw
    } = req.body;

    if (!evaluatedAnswerType) {
      return res.status(400).json({
        success: false,
        message: 'evaluatedAnswerType is required (text or file)'
      });
    }

    if (!['text', 'file'].includes(evaluatedAnswerType)) {
      return res.status(400).json({
        success: false,
        message: 'evaluatedAnswerType must be text or file'
      });
    }

    const marks = marksRaw !== undefined ? Number(marksRaw) : submission.marks;
    if (Number.isNaN(marks) || marks < 0) {
      return res.status(400).json({ success: false, message: 'marks must be a valid number >= 0' });
    }

    const remarks = sanitizeOptionalText(feedback || evaluatorFeedback);

    if (evaluatedAnswerType === 'text') {
      const text = sanitizeOptionalText(evaluatedAnswerText);
      if (!text) {
        return res.status(400).json({
          success: false,
          message: 'evaluatedAnswerText is required when evaluatedAnswerType is text'
        });
      }
      submission.evaluatedAnswerType = 'text';
      submission.evaluatedAnswerText = text;
      submission.evaluatedAnswerFile = undefined;
    } else {
      const file = req.files?.evaluatedAnswerFile?.[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'evaluatedAnswerFile is required when evaluatedAnswerType is file'
        });
      }
      const uploaded = await uploadAnswerFile(
        file,
        'answer-writing/evaluated',
        uploadToCloudinary
      );
      submission.evaluatedAnswerType = 'file';
      submission.evaluatedAnswerText = '';
      submission.evaluatedAnswerFile = { url: uploaded.url, public_id: uploaded.public_id };
    }

    submission.submissionStatus = 'evaluated';
    submission.evaluatorFeedback = remarks;
    submission.marks = marks;
    submission.evaluatedBy = req.user._id;
    submission.evaluatedAt = new Date();
    await submission.save();

    res.json({
      success: true,
      message: 'Evaluation completed',
      data: submission
    });
  } catch (error) {
    console.error('Evaluate submission error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
