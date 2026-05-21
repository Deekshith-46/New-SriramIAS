const LmsTest = require('../models/LmsTest');
const LmsTestCategory = require('../models/LmsTestCategory');
const LmsTestQuestion = require('../models/LmsTestQuestion');
const LmsTestAttempt = require('../models/LmsTestAttempt');
const { assertEnrollmentAccess, getCourseForAdmin } = require('../utils/courseAccess');
const { sanitizeOptionalText } = require('../utils/sanitizeText');
const {
  NOT_DELETED,
  sanitizeQuestionForAttempt,
  isTestWithinSchedule,
  scoreAnswers,
  buildQuestionSnapshot,
  syncTestTotals
} = require('../utils/lmsTestHelpers');

const findActiveTest = async (id) => LmsTest.findOne({ _id: id, ...NOT_DELETED });

const formatTestListItem = (test) => ({
  _id: test._id,
  courseId: test.courseId,
  categoryId: test.categoryId,
  title: test.title,
  durationInMinutes: test.durationInMinutes,
  totalQuestions: test.totalQuestions,
  totalMarks: test.totalMarks,
  passMarks: test.passMarks,
  maxAttempts: test.maxAttempts,
  startDateTime: test.startDateTime,
  endDateTime: test.endDateTime,
  isPublished: test.isPublished
});

const formatTestResponse = (test) => {
  const doc = test?.toObject ? test.toObject() : { ...test };
  return {
    _id: doc._id,
    courseId: doc.courseId,
    categoryId: doc.categoryId,
    title: doc.title,
    durationInMinutes: doc.durationInMinutes,
    totalQuestions: doc.totalQuestions,
    totalMarks: doc.totalMarks,
    passMarks: doc.passMarks,
    negativeMarkPerWrongAnswer: doc.negativeMarkPerWrongAnswer,
    maxAttempts: doc.maxAttempts,
    shuffleQuestions: doc.shuffleQuestions,
    shuffleOptions: doc.shuffleOptions,
    instructions: doc.instructions,
    startDateTime: doc.startDateTime,
    endDateTime: doc.endDateTime,
    isPublished: doc.isPublished,
    isDeleted: doc.isDeleted,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

exports.createTest = async (req, res) => {
  try {
    const {
      courseId,
      categoryId,
      title,
      durationInMinutes,
      passMarks,
      negativeMarkPerWrongAnswer,
      maxAttempts,
      shuffleQuestions,
      shuffleOptions,
      instructions,
      startDateTime,
      endDateTime,
      isPublished
    } = req.body;

    if (!courseId || !categoryId || !title || !durationInMinutes) {
      return res.status(400).json({
        success: false,
        message: 'courseId, categoryId, title, and durationInMinutes are required'
      });
    }

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const category = await LmsTestCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Test category not found' });
    }

    const test = await LmsTest.create({
      courseId,
      categoryId,
      title,
      durationInMinutes,
      passMarks,
      negativeMarkPerWrongAnswer,
      maxAttempts: maxAttempts ?? 1,
      shuffleQuestions: shuffleQuestions ?? false,
      shuffleOptions: shuffleOptions ?? false,
      instructions: sanitizeOptionalText(instructions) || '',
      startDateTime,
      endDateTime,
      isPublished: isPublished ?? false,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Test created',
      data: formatTestResponse(test)
    });
  } catch (error) {
    console.error('Create LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    const updates = { ...req.body };
    delete updates.courseId;
    delete updates.createdBy;
    delete updates.subjectId;
    delete updates.description;
    if (updates.instructions) updates.instructions = sanitizeOptionalText(updates.instructions);

    const updated = await LmsTest.findByIdAndUpdate(test._id, updates, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      message: 'Test updated',
      data: formatTestResponse(updated)
    });
  } catch (error) {
    console.error('Update LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    test.isDeleted = true;
    test.isPublished = false;
    await test.save();

    await LmsTestQuestion.updateMany({ testId: test._id }, { $set: { isDeleted: true } });

    res.json({
      success: true,
      message: 'Test deleted (soft). Questions soft-deleted. Attempts preserved for audit.'
    });
  } catch (error) {
    console.error('Delete LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.publishTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    const totals = await syncTestTotals(test._id);
    if (totals.totalQuestions < 1) {
      return res.status(400).json({
        success: false,
        message: 'Add at least one question before publishing'
      });
    }

    test.isPublished = true;
    await test.save();

    const refreshed = await findActiveTest(test._id);

    res.json({
      success: true,
      message: 'Test published',
      data: formatTestResponse(refreshed || test),
      testTotals: totals
    });
  } catch (error) {
    console.error('Publish LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTestsByCourseAndCategory = async (req, res) => {
  try {
    const { courseId, categoryId } = req.params;

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const tests = await LmsTest.find({
      courseId,
      categoryId,
      isPublished: true,
      ...NOT_DELETED
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: tests.length,
      data: tests.map(formatTestListItem)
    });
  } catch (error) {
    console.error('Get LMS tests by category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTestsByCourseAndCategoryAdmin = async (req, res) => {
  try {
    const { courseId, categoryId } = req.params;

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const tests = await LmsTest.find({ courseId, categoryId, ...NOT_DELETED })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: tests.length,
      data: tests.map(formatTestResponse)
    });
  } catch (error) {
    console.error('Admin get LMS tests error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.startTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.id);
    if (!test || !test.isPublished) {
      return res.status(404).json({ success: false, message: 'Test not found or not published' });
    }

    const schedule = isTestWithinSchedule(test);
    if (!schedule.ok) {
      return res.status(403).json({ success: false, message: schedule.message });
    }

    const enrollment = await assertEnrollmentAccess(req, res, test.courseId);
    if (!enrollment) return;

    const submittedCount = await LmsTestAttempt.countDocuments({
      userId: req.user._id,
      testId: test._id,
      status: 'submitted'
    });

    if (submittedCount >= (test.maxAttempts || 1)) {
      return res.status(400).json({
        success: false,
        message: `Maximum attempts (${test.maxAttempts}) reached for this test`
      });
    }

    let attempt = await LmsTestAttempt.findOne({
      userId: req.user._id,
      testId: test._id,
      status: 'in_progress'
    });

    if (attempt?.questionSnapshot?.length) {
      return res.json({
        success: true,
        attemptId: attempt._id,
        startedAt: attempt.startedAt,
        durationInMinutes: test.durationInMinutes,
        test: formatTestListItem(test),
        questions: attempt.questionSnapshot.map(sanitizeQuestionForAttempt)
      });
    }

    const questions = await LmsTestQuestion.find({ testId: test._id, ...NOT_DELETED })
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    if (!questions.length) {
      return res.status(400).json({ success: false, message: 'Test has no questions yet' });
    }

    const snapshot = buildQuestionSnapshot(questions, test);

    if (!attempt) {
      attempt = await LmsTestAttempt.create({
        userId: req.user._id,
        courseId: test.courseId,
        testId: test._id,
        questionSnapshot: snapshot,
        answers: [],
        startedAt: new Date(),
        status: 'in_progress'
      });
    } else {
      attempt.questionSnapshot = snapshot;
      await attempt.save();
    }

    res.json({
      success: true,
      attemptId: attempt._id,
      startedAt: attempt.startedAt,
      durationInMinutes: test.durationInMinutes,
      test: formatTestListItem(test),
      questions: snapshot.map(sanitizeQuestionForAttempt)
    });
  } catch (error) {
    console.error('Start LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.submitTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.id);
    if (!test || !test.isPublished) {
      return res.status(404).json({ success: false, message: 'Test not found or not published' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, test.courseId);
    if (!enrollment) return;

    const attempt = await LmsTestAttempt.findOne({
      userId: req.user._id,
      testId: test._id,
      status: 'in_progress'
    });

    if (!attempt) {
      return res.status(400).json({
        success: false,
        message: 'No active attempt found. Call GET /api/tests/:id/start first'
      });
    }

    if (!attempt.questionSnapshot?.length) {
      return res.status(400).json({
        success: false,
        message: 'Attempt has no question snapshot. Restart the test.'
      });
    }

    const now = new Date();
    const allowedSeconds = test.durationInMinutes * 60;
    const elapsed = Math.floor((now - attempt.startedAt) / 1000);

    if (elapsed > allowedSeconds + 30) {
      return res.status(400).json({
        success: false,
        message: 'Time limit exceeded. Test auto-closed.',
        allowedSeconds
      });
    }

    const result = scoreAnswers(attempt.questionSnapshot, req.body.answers, test);

    attempt.answers = result.gradedAnswers;
    attempt.totalQuestions = result.totalQuestions;
    attempt.correctAnswers = result.correctAnswers;
    attempt.wrongAnswers = result.wrongAnswers;
    attempt.unanswered = result.unanswered;
    attempt.obtainedMarks = result.obtainedMarks;
    attempt.totalMarks = result.totalMarks;
    attempt.percentage = result.percentage;
    attempt.isPassed = result.isPassed;
    attempt.submittedAt = now;
    attempt.timeTakenInSeconds = elapsed;
    attempt.status = 'submitted';
    await attempt.save();

    res.json({
      success: true,
      attemptId: attempt._id,
      score: result.score,
      percentage: result.percentage,
      correctAnswers: result.correctAnswers,
      wrongAnswers: result.wrongAnswers,
      unanswered: result.unanswered,
      obtainedMarks: result.obtainedMarks,
      totalMarks: result.totalMarks,
      isPassed: result.isPassed,
      timeTakenInSeconds: elapsed
    });
  } catch (error) {
    console.error('Submit LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
