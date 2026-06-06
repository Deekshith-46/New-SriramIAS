const { generateQuestionBankCode } = require('./contentIdGenerator');
const {
  ASSERTION_ANSWER_LABELS,
  normalizeQuestionType,
  normalizeCategory,
  normalizeStatus,
  normalizeDifficulty,
  normalizeAssertionAnswer,
  MCQ_CORRECT_ANSWER
} = require('./questionBankEnums');

const generateQuestionCode = async () => generateQuestionBankCode();

const parseTags = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((t) => String(t).trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
};

const normalizeTextKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const buildQuestionPreview = (text, max = 120) => {
  const raw = String(text || '').trim();
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max)}...`;
};

const parseMatchPairsFromForm = (body) => {
  const prompt = String(body.prompt || '').trim();
  const pairs = [];

  for (let i = 1; i <= 4; i += 1) {
    const left = String(body[`left${i}`] || '').trim();
    const right = String(body[`right${i}`] || '').trim();
    if (left || right) {
      pairs.push({ left, right });
    }
  }

  return { prompt, pairs };
};

const parseMatchPairsFromColumns = (leftColumn, rightColumn, correctMapping) => {
  const leftItems = String(leftColumn || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const rightItems = String(rightColumn || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!leftItems.length || !rightItems.length) {
    return { error: 'leftColumn and rightColumn are required' };
  }
  if (leftItems.length !== rightItems.length) {
    return { error: 'leftColumn and rightColumn must have the same number of items' };
  }

  const mappingStr = String(correctMapping || '').trim();
  const mappingPairs = mappingStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const pairs = [];

  if (mappingPairs.length) {
    mappingPairs.forEach((entry) => {
      const match = entry.match(/^([A-D]|\d+)\s*[-:]\s*([A-D]|\d+)$/i);
      if (!match) {
        return;
      }
      let leftIndex;
      let rightIndex;
      const leftToken = match[1].toUpperCase();
      const rightToken = match[2].toUpperCase();

      if (/^[A-D]$/.test(leftToken)) {
        leftIndex = leftToken.charCodeAt(0) - 65;
      } else {
        leftIndex = Number(leftToken) - 1;
      }

      if (/^[A-D]$/.test(rightToken)) {
        rightIndex = rightToken.charCodeAt(0) - 65;
      } else {
        rightIndex = Number(rightToken) - 1;
      }

      if (
        leftIndex >= 0 &&
        leftIndex < leftItems.length &&
        rightIndex >= 0 &&
        rightIndex < rightItems.length
      ) {
        pairs.push({ left: leftItems[leftIndex], right: rightItems[rightIndex] });
      }
    });
  }

  if (!pairs.length) {
    leftItems.forEach((left, index) => {
      pairs.push({ left, right: rightItems[index] });
    });
  }

  return { pairs };
};

const normalizeMcqAnswer = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  if (MCQ_CORRECT_ANSWER.includes(raw)) return raw;
  const num = Number(raw);
  if (!Number.isNaN(num) && num >= 1 && num <= 4) {
    return MCQ_CORRECT_ANSWER[num - 1];
  }
  return null;
};

const normalizeNumericalAnswer = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null;
  return raw;
};

const normalizeFormPayload = (body) => {
  const type = normalizeQuestionType(body.type || body.questionType);
  const payload = {
    category: normalizeCategory(body.category),
    type,
    status: normalizeStatus(body.status) || 'ACTIVE',
    subject: String(body.subject || '').trim(),
    topic: String(body.topic || '').trim(),
    difficulty: normalizeDifficulty(body.difficulty),
    tags: parseTags(body.tags),
    questionText: String(body.questionText || '').trim(),
    explanation: body.explanation ? String(body.explanation).trim() : '',
    optionA: body.optionA ? String(body.optionA).trim() : undefined,
    optionB: body.optionB ? String(body.optionB).trim() : undefined,
    optionC: body.optionC ? String(body.optionC).trim() : undefined,
    optionD: body.optionD ? String(body.optionD).trim() : undefined,
    numericalAnswer: body.numericalAnswer
      ? normalizeNumericalAnswer(body.numericalAnswer)
      : undefined,
    assertion: body.assertion ? String(body.assertion).trim() : undefined,
    reason: body.reason ? String(body.reason).trim() : undefined
  };

  if (type === 'MCQ') {
    payload.correctAnswer = body.correctAnswer
      ? normalizeMcqAnswer(body.correctAnswer)
      : undefined;
  }

  if (type === 'ASSERTION_REASON') {
    payload.assertionAnswer = body.correctAnswer
      ? normalizeAssertionAnswer(body.correctAnswer)
      : body.assertionAnswer
        ? normalizeAssertionAnswer(body.assertionAnswer)
        : undefined;
  }

  if (type === 'MATCH_THE_FOLLOWING') {
    const { prompt, pairs } = parseMatchPairsFromForm(body);
    payload.matchData = { prompt, pairs };
  }

  return payload;
};

const formatQuestionBankResponse = (doc) => {
  if (!doc) return null;
  const base = doc.toObject ? doc.toObject() : doc;

  const response = {
    _id: base._id,
    questionCode: base.questionCode,
    category: base.category,
    type: base.type,
    subject: base.subject,
    topic: base.topic,
    difficulty: base.difficulty,
    tags: base.tags || [],
    status: base.status,
    questionText: base.questionText,
    questionPreview: buildQuestionPreview(base.questionText),
    explanation: base.explanation || null,
    imageUrl: base.imageUrl || null,
    usageCount: base.usageCount ?? 0,
    createdBy: base.createdBy || null,
    updatedBy: base.updatedBy || null,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt
  };

  if (base.type === 'MCQ') {
    Object.assign(response, {
      optionA: base.optionA,
      optionB: base.optionB,
      optionC: base.optionC,
      optionD: base.optionD,
      correctAnswer: base.correctAnswer
    });
  }

  if (base.type === 'NUMERICAL') {
    response.numericalAnswer = base.numericalAnswer;
  }

  if (base.type === 'MATCH_THE_FOLLOWING' && base.matchData) {
    response.matchData = base.matchData;
    response.prompt = base.matchData.prompt;
    base.matchData.pairs?.forEach((pair, index) => {
      response[`left${index + 1}`] = pair.left;
      response[`right${index + 1}`] = pair.right;
    });
  }

  if (base.type === 'ASSERTION_REASON') {
    response.assertion = base.assertion;
    response.reason = base.reason;
    response.correctAnswer = base.assertionAnswer;
    response.correctAnswerLabel =
      ASSERTION_ANSWER_LABELS[base.assertionAnswer] || null;
  }

  return response;
};

const buildDuplicatePrefill = (doc) => {
  const formatted = formatQuestionBankResponse(doc);
  delete formatted._id;
  delete formatted.questionCode;
  delete formatted.createdAt;
  delete formatted.updatedAt;
  delete formatted.usageCount;
  formatted.status = 'ACTIVE';
  return formatted;
};

module.exports = {
  generateQuestionCode,
  parseTags,
  normalizeTextKey,
  buildQuestionPreview,
  parseMatchPairsFromForm,
  parseMatchPairsFromColumns,
  normalizeMcqAnswer,
  normalizeNumericalAnswer,
  normalizeFormPayload,
  formatQuestionBankResponse,
  buildDuplicatePrefill
};
