const { normalizeQuestionType } = require('./questionBankEnums');
const { formatQuestionBankResponse } = require('./questionBankHelpers');

const COMMON_EDITABLE_FIELDS = Object.freeze([
  'category',
  'status',
  'subject',
  'topic',
  'difficulty',
  'tags',
  'questionText',
  'explanation'
]);

const TYPE_EDITABLE_FIELDS = Object.freeze({
  MCQ: ['optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer'],
  NUMERICAL: ['numericalAnswer'],
  MATCH_THE_FOLLOWING: [
    'prompt',
    'left1',
    'left2',
    'left3',
    'left4',
    'right1',
    'right2',
    'right3',
    'right4'
  ],
  ASSERTION_REASON: ['assertion', 'reason', 'correctAnswer', 'assertionAnswer'],
  DESCRIPTIVE: []
});

const PROTECTED_BODY_FIELDS = Object.freeze([
  '_id',
  'id',
  'questionCode',
  'questionPreview',
  'usageCount',
  'createdBy',
  'updatedBy',
  'createdAt',
  'updatedAt',
  'imageUrl',
  'imagePublicId',
  'type',
  'questionType',
  'matchData',
  'left',
  'right'
]);

const STALE_FIELDS_BY_TYPE = Object.freeze({
  MCQ: ['numericalAnswer', 'matchData', 'assertion', 'reason', 'assertionAnswer'],
  NUMERICAL: [
    'optionA',
    'optionB',
    'optionC',
    'optionD',
    'correctAnswer',
    'matchData',
    'assertion',
    'reason',
    'assertionAnswer'
  ],
  MATCH_THE_FOLLOWING: [
    'optionA',
    'optionB',
    'optionC',
    'optionD',
    'correctAnswer',
    'numericalAnswer',
    'assertion',
    'reason',
    'assertionAnswer'
  ],
  ASSERTION_REASON: [
    'optionA',
    'optionB',
    'optionC',
    'optionD',
    'correctAnswer',
    'numericalAnswer',
    'matchData'
  ],
  DESCRIPTIVE: [
    'optionA',
    'optionB',
    'optionC',
    'optionD',
    'correctAnswer',
    'numericalAnswer',
    'matchData',
    'assertion',
    'reason',
    'assertionAnswer'
  ]
});

const getEditableFields = (type) => [
  ...COMMON_EDITABLE_FIELDS,
  ...(TYPE_EDITABLE_FIELDS[type] || [])
];

const isFieldProvided = (body, field) =>
  Object.prototype.hasOwnProperty.call(body, field);

const parseRemoveImageFlag = (value) =>
  value === true || value === 'true' || value === '1';

const existingToFormBody = (existing) => {
  const body = {
    category: existing.category,
    type: existing.type,
    status: existing.status,
    subject: existing.subject,
    topic: existing.topic,
    difficulty: existing.difficulty,
    tags: (existing.tags || []).join(','),
    questionText: existing.questionText,
    explanation: existing.explanation || ''
  };

  switch (existing.type) {
    case 'MCQ':
      body.optionA = existing.optionA;
      body.optionB = existing.optionB;
      body.optionC = existing.optionC;
      body.optionD = existing.optionD;
      body.correctAnswer = existing.correctAnswer;
      break;
    case 'NUMERICAL':
      body.numericalAnswer = existing.numericalAnswer;
      break;
    case 'MATCH_THE_FOLLOWING':
      body.prompt = existing.prompt || existing.matchData?.prompt || existing.questionText;
      for (let i = 1; i <= 4; i += 1) {
        body[`left${i}`] = existing[`left${i}`] || '';
        body[`right${i}`] = existing[`right${i}`] || '';
      }
      break;
    case 'ASSERTION_REASON':
      body.assertion = existing.assertion;
      body.reason = existing.reason;
      body.correctAnswer = existing.correctAnswer;
      break;
    default:
      break;
  }

  return body;
};

const sanitizeUpdateBody = (body, existingType) => {
  const incomingType = body.type || body.questionType;
  if (incomingType) {
    const normalized = normalizeQuestionType(incomingType);
    if (normalized && normalized !== existingType) {
      const error = new Error('Question type cannot be changed on update');
      error.statusCode = 400;
      throw error;
    }
  }

  const allowed = new Set([...getEditableFields(existingType), 'removeImage']);
  const sanitized = {};

  Object.entries(body).forEach(([key, value]) => {
    if (PROTECTED_BODY_FIELDS.includes(key)) return;
    if (!allowed.has(key)) return;
    if (!isFieldProvided(body, key)) return;
    sanitized[key] = value;
  });

  return sanitized;
};

const buildMergedUpdateBody = (existingDoc, requestBody) => {
  const existing = formatQuestionBankResponse(existingDoc);
  const sanitized = sanitizeUpdateBody(requestBody, existing.type);
  const updatedFields = Object.keys(sanitized).filter((key) => key !== 'removeImage');
  const mergedBody = existingToFormBody(existing);

  updatedFields.forEach((key) => {
    mergedBody[key] = sanitized[key];
  });

  return {
    mergedBody,
    updatedFields,
    removeImage: parseRemoveImageFlag(sanitized.removeImage)
  };
};

const clearStaleTypeFields = (doc, type) => {
  (STALE_FIELDS_BY_TYPE[type] || []).forEach((field) => {
    doc.set(field, undefined);
  });
};

module.exports = {
  COMMON_EDITABLE_FIELDS,
  TYPE_EDITABLE_FIELDS,
  getEditableFields,
  buildMergedUpdateBody,
  clearStaleTypeFields
};
