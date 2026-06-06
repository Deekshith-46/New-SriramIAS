const {
  QUESTION_TYPES,
  QUESTION_CATEGORY,
  QUESTION_STATUS,
  QUESTION_DIFFICULTY,
  MCQ_CORRECT_ANSWER,
  ASSERTION_REASON_ANSWER,
  normalizeAssertionAnswer
} = require('./questionBankEnums');
const {
  normalizeNumericalAnswer,
  normalizeMcqAnswer
} = require('./questionBankHelpers');

const pushError = (errors, field, message, row) => {
  errors.push(row ? { row, field, message } : { field, message });
};

const validateCommonFields = (data, errors, row) => {
  if (!data.category || !QUESTION_CATEGORY.includes(data.category)) {
    pushError(errors, 'category', 'category must be PRELIMS or MAINS', row);
  }
  if (!data.type || !QUESTION_TYPES.includes(data.type)) {
    pushError(errors, 'type', 'Invalid question type', row);
  }
  if (!data.subject) {
    pushError(errors, 'subject', 'subject is required', row);
  }
  if (!data.topic) {
    pushError(errors, 'topic', 'topic is required', row);
  }
  if (!data.difficulty || !QUESTION_DIFFICULTY.includes(data.difficulty)) {
    pushError(errors, 'difficulty', 'difficulty must be EASY, MEDIUM, or HARD', row);
  }
  if (data.status && !QUESTION_STATUS.includes(data.status)) {
    pushError(errors, 'status', 'status must be ACTIVE or INACTIVE', row);
  }
  if (!data.questionText) {
    pushError(errors, 'questionText', 'questionText is required', row);
  }
};

const validateTypeSpecificFields = (data, errors, row) => {
  validateCommonFields(data, errors, row);

  switch (data.type) {
    case 'MCQ': {
      ['optionA', 'optionB', 'optionC', 'optionD'].forEach((field) => {
        if (!data[field]) pushError(errors, field, `${field} is required`, row);
      });
      const answer = normalizeMcqAnswer(data.correctAnswer);
      if (!answer || !MCQ_CORRECT_ANSWER.includes(answer)) {
        pushError(errors, 'correctAnswer', 'correctAnswer must be A, B, C, or D', row);
      } else {
        data.correctAnswer = answer;
      }
      break;
    }
    case 'NUMERICAL': {
      const num = normalizeNumericalAnswer(data.numericalAnswer);
      if (!num) {
        pushError(errors, 'numericalAnswer', 'numericalAnswer must be a valid number', row);
      } else {
        data.numericalAnswer = num;
      }
      break;
    }
    case 'MATCH_THE_FOLLOWING': {
      if (!data.matchData?.prompt) {
        pushError(errors, 'prompt', 'prompt is required', row);
      }
      if (!data.matchData?.pairs?.length || data.matchData.pairs.length < 2) {
        pushError(errors, 'pairs', 'At least 2 match pairs are required', row);
      } else {
        data.matchData.pairs.forEach((pair, index) => {
          if (!pair.left || !pair.right) {
            pushError(
              errors,
              `pairs[${index}]`,
              'Each pair must have left and right values',
              row
            );
          }
        });
      }
      break;
    }
    case 'ASSERTION_REASON': {
      if (!data.assertion) pushError(errors, 'assertion', 'assertion is required', row);
      if (!data.reason) pushError(errors, 'reason', 'reason is required', row);
      const answer = normalizeAssertionAnswer(
        data.assertionAnswer || data.correctAnswer
      );
      if (!answer || !ASSERTION_REASON_ANSWER.includes(answer)) {
        pushError(errors, 'correctAnswer', 'Invalid assertion-reason correct answer', row);
      } else {
        data.assertionAnswer = answer;
      }
      break;
    }
    case 'DESCRIPTIVE':
      break;
    default:
      pushError(errors, 'type', 'Unsupported question type', row);
  }

  return errors.length === 0;
};

const buildPersistPayload = (data, meta = {}) => {
  const doc = {
    category: data.category,
    type: data.type,
    subject: data.subject,
    topic: data.topic,
    difficulty: data.difficulty,
    tags: data.tags || [],
    status: data.status || 'ACTIVE',
    questionText: data.questionText,
    explanation: data.explanation || undefined,
    imageUrl: data.imageUrl,
    imagePublicId: data.imagePublicId,
    createdBy: meta.createdBy,
    updatedBy: meta.updatedBy
  };

  if (data.type === 'MCQ') {
    Object.assign(doc, {
      optionA: data.optionA,
      optionB: data.optionB,
      optionC: data.optionC,
      optionD: data.optionD,
      correctAnswer: data.correctAnswer
    });
  }

  if (data.type === 'NUMERICAL') {
    doc.numericalAnswer = data.numericalAnswer;
  }

  if (data.type === 'MATCH_THE_FOLLOWING') {
    doc.matchData = data.matchData;
  }

  if (data.type === 'ASSERTION_REASON') {
    doc.assertion = data.assertion;
    doc.reason = data.reason;
    doc.assertionAnswer = data.assertionAnswer;
  }

  return doc;
};

module.exports = {
  validateTypeSpecificFields,
  buildPersistPayload,
  validateCommonFields
};
