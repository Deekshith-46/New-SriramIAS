const NOT_DELETED = { isDeleted: false };

const resolveExamEndDate = (exam) => {
  if (exam.examEndDate) return new Date(exam.examEndDate);
  const end = new Date(exam.examDate);
  end.setHours(23, 59, 59, 999);
  return end;
};

/** UPCOMING | LIVE | COMPLETED — based on exam window */
const resolveExamScheduleStatus = (exam, now = new Date()) => {
  const start = new Date(exam.examDate);
  const end = resolveExamEndDate(exam);

  if (now < start) return 'UPCOMING';
  if (now > end) return 'COMPLETED';
  return 'LIVE';
};

const isExamWindowOpen = (exam, now = new Date()) => {
  const status = resolveExamScheduleStatus(exam, now);
  return status === 'LIVE';
};

const sumQuestionMarks = (questions = []) =>
  questions.reduce((sum, q) => sum + (q.marks ?? 1), 0);

const syncExamTotals = (questions, explicitTotalMarks) => {
  const computed = sumQuestionMarks(questions);
  return explicitTotalMarks > 0 ? explicitTotalMarks : computed;
};

const validateQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length < 1) {
    return 'At least one question is required';
  }

  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    if (!q?.question?.trim()) return `Question ${i + 1}: text is required`;
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return `Question ${i + 1}: at least two options are required`;
    }
    const correct = Number(q.correctAnswer);
    if (!Number.isInteger(correct) || correct < 0 || correct >= q.options.length) {
      return `Question ${i + 1}: correctAnswer must be a valid option index`;
    }
  }

  return null;
};

const sanitizeQuestionForStudent = (q) => ({
  _id: q._id,
  question: q.question,
  options: q.options,
  marks: q.marks ?? 1
});

const sanitizeExamForStudent = (exam) => ({
  _id: exam._id,
  course: exam.course,
  subject: exam.subject,
  title: exam.title,
  description: exam.description,
  examDate: exam.examDate,
  examEndDate: exam.examEndDate,
  durationInMinutes: exam.durationInMinutes,
  totalMarks: exam.totalMarks,
  passMarks: exam.passMarks,
  negativeMarks: exam.negativeMarks,
  maxAttempts: exam.maxAttempts,
  scheduleStatus: resolveExamScheduleStatus(exam),
  questions: (exam.questions || []).map(sanitizeQuestionForStudent)
});

const formatScheduleItem = (exam, attemptCount = 0) => ({
  _id: exam._id,
  title: exam.title,
  description: exam.description,
  examDate: exam.examDate,
  examEndDate: exam.examEndDate,
  durationInMinutes: exam.durationInMinutes,
  totalMarks: exam.totalMarks,
  passMarks: exam.passMarks,
  maxAttempts: exam.maxAttempts,
  scheduleStatus: resolveExamScheduleStatus(exam),
  attemptCount,
  attemptsRemaining: Math.max(0, (exam.maxAttempts || 1) - attemptCount),
  subject: exam.subject
    ? {
        _id: exam.subject._id,
        title: exam.subject.title
      }
    : null
});

const normalizeAnswerPayload = (questions, answersPayload) => {
  if (!Array.isArray(answersPayload)) return new Map();

  const map = new Map();

  if (answersPayload.length && typeof answersPayload[0] === 'object') {
    for (const row of answersPayload) {
      if (row?.questionId === undefined || row?.questionId === null) continue;
      const selected =
        row.selectedOption === null || row.selectedOption === undefined
          ? null
          : Number(row.selectedOption);
      map.set(String(row.questionId), selected);
    }
    return map;
  }

  questions.forEach((q, index) => {
    const raw = answersPayload[index];
    if (raw === undefined || raw === null) return;
    map.set(String(q._id), Number(raw));
  });

  return map;
};

const scoreTestExam = (exam, answerMap) => {
  const resultAnswers = [];
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let skippedAnswers = 0;
  let score = 0;

  const defaultNegative = exam.negativeMarks ?? 0;
  const totalMarks = exam.totalMarks || sumQuestionMarks(exam.questions);

  for (const question of exam.questions) {
    const qid = String(question._id);
    const hasSelection = answerMap.has(qid) && answerMap.get(qid) !== null;
    const selectedOption = hasSelection ? answerMap.get(qid) : null;

    if (!hasSelection) {
      skippedAnswers += 1;
      resultAnswers.push({
        questionId: question._id,
        selectedOption: null,
        isCorrect: false,
        obtainedMarks: 0
      });
      continue;
    }

    const isCorrect = selectedOption === question.correctAnswer;
    let obtainedMarks = 0;

    if (isCorrect) {
      correctAnswers += 1;
      obtainedMarks = question.marks ?? 1;
    } else {
      wrongAnswers += 1;
      const neg =
        question.negativeMarks > 0 ? question.negativeMarks : defaultNegative;
      obtainedMarks = neg > 0 ? -neg : 0;
    }

    score += obtainedMarks;
    resultAnswers.push({
      questionId: question._id,
      selectedOption,
      isCorrect,
      obtainedMarks
    });
  }

  score = Math.max(0, Math.round(score * 100) / 100);
  const percentage =
    totalMarks > 0 ? Math.round((score / totalMarks) * 10000) / 100 : 0;
  const resultStatus = score >= (exam.passMarks || 0) ? 'PASS' : 'FAIL';

  return {
    answers: resultAnswers,
    totalQuestions: exam.questions.length,
    correctAnswers,
    wrongAnswers,
    skippedAnswers,
    score,
    totalMarks,
    percentage,
    resultStatus
  };
};

const formatResultSummary = (result) => ({
  _id: result._id,
  testExam: result.testExam,
  course: result.course,
  totalQuestions: result.totalQuestions,
  correctAnswers: result.correctAnswers,
  wrongAnswers: result.wrongAnswers,
  skippedAnswers: result.skippedAnswers,
  score: result.score,
  totalMarks: result.totalMarks,
  percentage: result.percentage,
  resultStatus: result.resultStatus,
  attemptNumber: result.attemptNumber,
  timeTakenInSeconds: result.timeTakenInSeconds,
  submittedAt: result.submittedAt,
  createdAt: result.createdAt
});

module.exports = {
  NOT_DELETED,
  resolveExamEndDate,
  resolveExamScheduleStatus,
  isExamWindowOpen,
  sumQuestionMarks,
  syncExamTotals,
  validateQuestions,
  sanitizeQuestionForStudent,
  sanitizeExamForStudent,
  formatScheduleItem,
  normalizeAnswerPayload,
  scoreTestExam,
  formatResultSummary
};
