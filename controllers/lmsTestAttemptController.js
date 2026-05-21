const LmsTestAttempt = require('../models/LmsTestAttempt');
const LmsTest = require('../models/LmsTest');
const { formatQuestionForReview, NOT_DELETED } = require('../utils/lmsTestHelpers');
const { getPagination, paginatedResponse } = require('../utils/pagination');

exports.getAttemptResult = async (req, res) => {
  try {
    const attempt = await LmsTestAttempt.findById(req.params.attemptId).lean();

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (String(attempt.userId) !== String(req.user._id)) {
      const isAdmin = ['super_admin', 'center_admin', 'employee'].includes(req.user.role);
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    if (attempt.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Test not submitted yet'
      });
    }

    const test = await LmsTest.findOne({ _id: attempt.testId, ...NOT_DELETED }).lean();

    const snapshot = attempt.questionSnapshot || [];
    const answerMap = new Map(
      (attempt.answers || []).map((a) => [String(a.questionId), a])
    );

    res.json({
      success: true,
      data: {
        attempt: {
          _id: attempt._id,
          testId: attempt.testId,
          courseId: attempt.courseId,
          score: attempt.obtainedMarks,
          percentage: attempt.percentage,
          correctAnswers: attempt.correctAnswers,
          wrongAnswers: attempt.wrongAnswers,
          unanswered: attempt.unanswered,
          obtainedMarks: attempt.obtainedMarks,
          totalMarks: attempt.totalMarks,
          isPassed: attempt.isPassed,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          timeTakenInSeconds: attempt.timeTakenInSeconds
        },
        test: test
          ? {
              _id: test._id,
              title: test.title,
              durationInMinutes: test.durationInMinutes,
              passMarks: test.passMarks
            }
          : { title: 'Test (removed)' },
        questions: snapshot.map((snap) =>
          formatQuestionForReview(snap, answerMap.get(String(snap.questionId)))
        )
      }
    });
  } catch (error) {
    console.error('Get LMS test attempt error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getMyAttempts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, 20, 50);

    const filter = { userId: req.user._id, status: 'submitted' };
    if (req.query.courseId) filter.courseId = req.query.courseId;
    if (req.query.testId) filter.testId = req.query.testId;

    const [attempts, total] = await Promise.all([
      LmsTestAttempt.find(filter)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('testId', 'title categoryId durationInMinutes')
        .lean(),
      LmsTestAttempt.countDocuments(filter)
    ]);

    res.json(paginatedResponse(attempts, total, page, limit));
  } catch (error) {
    console.error('Get my LMS attempts error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
