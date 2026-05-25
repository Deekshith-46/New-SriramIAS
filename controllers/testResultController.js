const TestExam = require('../models/TestExam');
const TestResult = require('../models/TestResult');
const { assertEnrollmentAccess } = require('../utils/courseAccess');
const {
  NOT_DELETED,
  isExamWindowOpen,
  resolveExamScheduleStatus,
  normalizeAnswerPayload,
  scoreTestExam,
  formatResultSummary
} = require('../utils/testExamHelpers');

exports.submitTest = async (req, res) => {
  try {
    const { testExamId, answers, timeTakenInSeconds } = req.body;

    if (!testExamId) {
      return res.status(400).json({
        success: false,
        message: 'testExamId is required'
      });
    }

    const exam = await TestExam.findOne({
      _id: testExamId,
      isPublished: true,
      isActive: true,
      ...NOT_DELETED
    }).lean();

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Test exam not found or not published'
      });
    }

    const enrollment = await assertEnrollmentAccess(req, res, exam.course);
    if (!enrollment) return;

    if (!isExamWindowOpen(exam)) {
      return res.status(403).json({
        success: false,
        message:
          resolveExamScheduleStatus(exam) === 'UPCOMING'
            ? 'This test is not available yet'
            : 'This test window has ended',
        scheduleStatus: resolveExamScheduleStatus(exam)
      });
    }

    const previousAttempts = await TestResult.countDocuments({
      student: req.user._id,
      testExam: exam._id
    });

    if (previousAttempts >= (exam.maxAttempts || 1)) {
      return res.status(400).json({
        success: false,
        message: `Maximum attempts (${exam.maxAttempts}) reached for this test`
      });
    }

    if (!exam.questions?.length) {
      return res.status(400).json({
        success: false,
        message: 'Test exam has no questions'
      });
    }

    const answerMap = normalizeAnswerPayload(exam.questions, answers);
    const scored = scoreTestExam(exam, answerMap);

    const elapsed = Number(timeTakenInSeconds);
    const timeTaken = Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
    const maxSeconds = (exam.durationInMinutes || 60) * 60;

    if (timeTaken > maxSeconds + 30) {
      return res.status(400).json({
        success: false,
        message: 'Time limit exceeded for this test',
        allowedSeconds: maxSeconds
      });
    }

    const result = await TestResult.create({
      student: req.user._id,
      course: exam.course,
      testExam: exam._id,
      answers: scored.answers,
      totalQuestions: scored.totalQuestions,
      correctAnswers: scored.correctAnswers,
      wrongAnswers: scored.wrongAnswers,
      skippedAnswers: scored.skippedAnswers,
      score: scored.score,
      totalMarks: scored.totalMarks,
      percentage: scored.percentage,
      resultStatus: scored.resultStatus,
      attemptNumber: previousAttempts + 1,
      timeTakenInSeconds: timeTaken,
      submittedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Test submitted successfully',
      data: formatResultSummary(result)
    });
  } catch (error) {
    console.error('Submit test exam error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getResultById = async (req, res) => {
  try {
    const result = await TestResult.findById(req.params.id)
      .populate('testExam', 'title examDate passMarks totalMarks')
      .populate('course', 'title')
      .lean();

    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    if (String(result.student) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const exam = await TestExam.findById(result.testExam._id || result.testExam).lean();
    const answerMap = new Map(
      (result.answers || []).map((a) => [String(a.questionId), a])
    );

    const review = (exam?.questions || []).map((q) => {
      const row = answerMap.get(String(q._id));
      return {
        _id: q._id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        marks: q.marks,
        selectedOption: row?.selectedOption ?? null,
        isCorrect: row?.isCorrect ?? false,
        obtainedMarks: row?.obtainedMarks ?? 0
      };
    });

    res.json({
      success: true,
      data: {
        ...formatResultSummary(result),
        testTitle: exam?.title,
        review
      }
    });
  } catch (error) {
    console.error('Get test result error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getMyResultsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const results = await TestResult.find({
      student: req.user._id,
      course: courseId
    })
      .populate('testExam', 'title examDate subject')
      .sort({ submittedAt: -1 })
      .lean();

    res.json({
      success: true,
      count: results.length,
      data: results.map((row) => ({
        ...formatResultSummary(row),
        testExam: row.testExam
          ? {
              _id: row.testExam._id,
              title: row.testExam.title,
              examDate: row.testExam.examDate
            }
          : null
      }))
    });
  } catch (error) {
    console.error('Course result history error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getMyResults = async (req, res) => {
  try {
    const results = await TestResult.find({ student: req.user._id })
      .populate('testExam', 'title examDate')
      .populate('course', 'title')
      .sort({ submittedAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      count: results.length,
      data: results.map((row) => ({
        ...formatResultSummary(row),
        testExam: row.testExam,
        course: row.course
      }))
    });
  } catch (error) {
    console.error('My test results error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getResultsByTestExam = async (req, res) => {
  try {
    const exam = await TestExam.findOne({ _id: req.params.testExamId, ...NOT_DELETED });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Test exam not found' });
    }

    const results = await TestResult.find({
      student: req.user._id,
      testExam: exam._id
    })
      .sort({ attemptNumber: -1 })
      .lean();

    res.json({
      success: true,
      count: results.length,
      data: results.map(formatResultSummary)
    });
  } catch (error) {
    console.error('Results by test exam error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
