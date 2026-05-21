const LmsTest = require('../models/LmsTest');
const LmsTestQuestion = require('../models/LmsTestQuestion');
const { getCourseForAdmin } = require('../utils/courseAccess');
const { NOT_DELETED, syncTestTotals } = require('../utils/lmsTestHelpers');
const { sanitizeText, sanitizeOptionalText } = require('../utils/sanitizeText');

const QUESTION_SORT = { createdAt: 1, _id: 1 };

const findActiveTest = async (testId) =>
  LmsTest.findOne({ _id: testId, ...NOT_DELETED });

const parseOptions = (options) => {
  const optionList = Array.isArray(options) ? options : JSON.parse(options);
  if (optionList.length !== 4) {
    return { error: 'Exactly 4 options are required' };
  }
  return { optionList: optionList.map((o) => sanitizeText(o)) };
};

const normalizeQuestionInput = (raw, indexLabel = '') => {
  const prefix = indexLabel ? `${indexLabel}: ` : '';

  if (!raw.question || raw.options === undefined || raw.correctAnswer === undefined) {
    return {
      error: `${prefix}question, options, and correctAnswer are required`
    };
  }

  const parsed = parseOptions(raw.options);
  if (parsed.error) {
    return { error: `${prefix}${parsed.error}` };
  }

  const correctIdx = Number(raw.correctAnswer);
  if (correctIdx < 0 || correctIdx >= 4) {
    return {
      error: `${prefix}correctAnswer must be between 0 and 3`
    };
  }

  return {
    data: {
      question: sanitizeText(raw.question),
      options: parsed.optionList,
      correctAnswer: correctIdx,
      explanation: sanitizeOptionalText(raw.explanation) || '',
      marks: raw.marks ?? 1,
      negativeMarks: raw.negativeMarks ?? 0,
      questionImage: raw.questionImage || undefined
    }
  };
};

const assertTestAccess = async (req, res, testId) => {
  const test = await findActiveTest(testId);
  if (!test) {
    res.status(404).json({ success: false, message: 'Test not found' });
    return null;
  }
  const course = await getCourseForAdmin(req, res, test.courseId);
  if (!course) return null;
  return test;
};

exports.createQuestion = async (req, res) => {
  try {
    const { testId } = req.body;
    if (!testId) {
      return res.status(400).json({ success: false, message: 'testId is required' });
    }

    const test = await assertTestAccess(req, res, testId);
    if (!test) return;

    const normalized = normalizeQuestionInput(req.body);
    if (normalized.error) {
      return res.status(400).json({ success: false, message: normalized.error });
    }

    const doc = await LmsTestQuestion.create({
      testId,
      ...normalized.data
    });

    const totals = await syncTestTotals(testId);

    res.status(201).json({
      success: true,
      message: 'Question added',
      data: doc,
      testTotals: totals
    });
  } catch (error) {
    console.error('Create LMS test question error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createQuestionsBulk = async (req, res) => {
  try {
    const { testId, questions } = req.body;

    if (!testId) {
      return res.status(400).json({ success: false, message: 'testId is required' });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'questions must be a non-empty array'
      });
    }

    const test = await assertTestAccess(req, res, testId);
    if (!test) return;

    const docsToInsert = [];
    for (let i = 0; i < questions.length; i += 1) {
      const normalized = normalizeQuestionInput(questions[i], `questions[${i}]`);
      if (normalized.error) {
        return res.status(400).json({ success: false, message: normalized.error });
      }
      docsToInsert.push({ testId, ...normalized.data });
    }

    const created = await LmsTestQuestion.insertMany(docsToInsert);
    const totals = await syncTestTotals(testId);

    res.status(201).json({
      success: true,
      message: `${created.length} question(s) added`,
      count: created.length,
      data: created,
      testTotals: totals
    });
  } catch (error) {
    console.error('Bulk create LMS test questions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getQuestionsByTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    const questions = await LmsTestQuestion.find({ testId: test._id, ...NOT_DELETED })
      .sort(QUESTION_SORT)
      .lean();

    res.json({
      success: true,
      count: questions.length,
      data: questions
    });
  } catch (error) {
    console.error('Get LMS test questions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const QUESTION_UPDATE_FIELDS = [
  'question',
  'options',
  'correctAnswer',
  'explanation',
  'marks',
  'negativeMarks',
  'questionImage'
];

exports.updateQuestion = async (req, res) => {
  try {
    const question = await LmsTestQuestion.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const test = await findActiveTest(question.testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    const updates = {};
    for (const key of QUESTION_UPDATE_FIELDS) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          'Provide at least one field to update: question, options, correctAnswer, explanation, marks, negativeMarks, questionImage'
      });
    }

    if (updates.question) updates.question = sanitizeText(updates.question);
    if (updates.explanation !== undefined) {
      updates.explanation = sanitizeOptionalText(updates.explanation) || '';
    }

    if (updates.options !== undefined) {
      const parsed = parseOptions(updates.options);
      if (parsed.error) {
        return res.status(400).json({ success: false, message: parsed.error });
      }
      updates.options = parsed.optionList;
    }

    const optionCount = updates.options ? updates.options.length : question.options.length;
    if (updates.correctAnswer !== undefined) {
      const correctIdx = Number(updates.correctAnswer);
      if (correctIdx < 0 || correctIdx >= optionCount) {
        return res.status(400).json({
          success: false,
          message: `correctAnswer must be between 0 and ${optionCount - 1}`
        });
      }
      updates.correctAnswer = correctIdx;
    } else if (updates.options) {
      if (question.correctAnswer >= updates.options.length) {
        return res.status(400).json({
          success: false,
          message: 'Update correctAnswer when changing options'
        });
      }
    }

    const updated = await LmsTestQuestion.findByIdAndUpdate(question._id, updates, {
      new: true,
      runValidators: true
    });

    const totals = await syncTestTotals(question.testId);

    res.json({
      success: true,
      message: 'Question updated',
      data: updated,
      testTotals: totals
    });
  } catch (error) {
    console.error('Update LMS test question error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await LmsTestQuestion.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const test = await findActiveTest(question.testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    await LmsTestQuestion.deleteOne({ _id: question._id });

    const totals = await syncTestTotals(question.testId);

    res.json({
      success: true,
      message: 'Question deleted',
      testTotals: totals
    });
  } catch (error) {
    console.error('Delete LMS test question error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
