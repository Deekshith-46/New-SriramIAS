const LmsTest = require('../models/LmsTest');
const LmsTestQuestion = require('../models/LmsTestQuestion');

const NOT_DELETED = { isDeleted: false };

const DEFAULT_CATEGORIES = [
  { title: 'Weekly Test', slug: 'weekly' },
  { title: 'Daily Test', slug: 'daily' },
  { title: 'Monthly Test', slug: 'monthly' }
];

const shuffleArray = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const buildSnapshotFromQuestion = (q) => ({
  questionId: q._id,
  question: q.question,
  options: [...q.options],
  correctAnswer: q.correctAnswer,
  explanation: q.explanation || '',
  marks: q.marks ?? 1,
  negativeMarks: q.negativeMarks ?? 0,
  questionImage: q.questionImage?.url
    ? { url: q.questionImage.url, public_id: q.questionImage.public_id }
    : undefined
});

/** Apply option shuffle; returns new snapshot rows with remapped correctAnswer */
const applyOptionShuffle = (snapshots) =>
  snapshots.map((snap) => {
    const indexed = snap.options.map((text, idx) => ({ text, idx }));
    const shuffled = shuffleArray(indexed);
    const newOptions = shuffled.map((o) => o.text);
    const newCorrect = shuffled.findIndex((o) => o.idx === snap.correctAnswer);
    return { ...snap, options: newOptions, correctAnswer: newCorrect };
  });

const buildQuestionSnapshot = (questions, test) => {
  let rows = questions.map(buildSnapshotFromQuestion);
  if (test.shuffleQuestions) {
    rows = shuffleArray(rows);
  }
  if (test.shuffleOptions) {
    rows = applyOptionShuffle(rows);
  }
  return rows;
};

const sanitizeQuestionForAttempt = (snap) => ({
  _id: snap.questionId,
  question: snap.question,
  options: snap.options,
  marks: snap.marks,
  questionImage: snap.questionImage?.url ? { url: snap.questionImage.url } : undefined
});

const isTestWithinSchedule = (test) => {
  const now = new Date();
  if (test.startDateTime && now < new Date(test.startDateTime)) {
    return { ok: false, message: 'Test has not started yet' };
  }
  if (test.endDateTime && now > new Date(test.endDateTime)) {
    return { ok: false, message: 'Test has ended' };
  }
  return { ok: true };
};

const syncTestTotals = async (testId) => {
  const questions = await LmsTestQuestion.find({ testId, ...NOT_DELETED }).lean();
  const totalQuestions = questions.length;
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  await LmsTest.findByIdAndUpdate(testId, { totalQuestions, totalMarks });
  return { totalQuestions, totalMarks };
};

const scoreAnswers = (snapshotQuestions, answerPayload, test) => {
  const answerMap = new Map(
    (answerPayload || []).map((a) => [String(a.questionId), a.selectedOption])
  );

  const gradedAnswers = [];
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let unanswered = 0;
  let obtainedMarks = 0;
  const totalMarks = snapshotQuestions.reduce((s, q) => s + (q.marks || 0), 0);
  const defaultNegative = test.negativeMarkPerWrongAnswer || 0;

  for (const q of snapshotQuestions) {
    const qid = String(q.questionId);
    const hasSelection =
      answerMap.has(qid) && answerMap.get(qid) !== null && answerMap.get(qid) !== undefined;
    const selectedOption = hasSelection ? Number(answerMap.get(qid)) : null;

    if (!hasSelection) {
      unanswered += 1;
      gradedAnswers.push({
        questionId: q.questionId,
        selectedOption: null,
        isCorrect: false,
        obtainedMarks: 0
      });
      continue;
    }

    const isCorrect = selectedOption === q.correctAnswer;
    let marksForQuestion = 0;

    if (isCorrect) {
      correctAnswers += 1;
      marksForQuestion = q.marks || 0;
    } else {
      wrongAnswers += 1;
      const neg = q.negativeMarks > 0 ? q.negativeMarks : defaultNegative;
      marksForQuestion = neg > 0 ? -neg : 0;
    }

    obtainedMarks += marksForQuestion;
    gradedAnswers.push({
      questionId: q.questionId,
      selectedOption,
      isCorrect,
      obtainedMarks: marksForQuestion
    });
  }

  obtainedMarks = Math.max(0, obtainedMarks);
  const percentage =
    totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 10000) / 100 : 0;
  const isPassed = obtainedMarks >= (test.passMarks || 0);

  return {
    gradedAnswers,
    totalQuestions: snapshotQuestions.length,
    correctAnswers,
    wrongAnswers,
    unanswered,
    obtainedMarks,
    totalMarks,
    percentage,
    isPassed,
    score: obtainedMarks
  };
};

const formatQuestionForReview = (snap, answerRow) => ({
  _id: snap.questionId,
  question: snap.question,
  options: snap.options,
  correctAnswer: snap.correctAnswer,
  explanation: snap.explanation,
  marks: snap.marks,
  negativeMarks: snap.negativeMarks,
  questionImage: snap.questionImage,
  selectedOption: answerRow?.selectedOption ?? null,
  isCorrect: answerRow?.isCorrect ?? false,
  obtainedMarks: answerRow?.obtainedMarks ?? 0
});

module.exports = {
  NOT_DELETED,
  DEFAULT_CATEGORIES,
  shuffleArray,
  buildQuestionSnapshot,
  sanitizeQuestionForAttempt,
  isTestWithinSchedule,
  syncTestTotals,
  scoreAnswers,
  formatQuestionForReview
};
