const QUESTION_TYPES = Object.freeze([
  'MCQ',
  'NUMERICAL',
  'MATCH_THE_FOLLOWING',
  'ASSERTION_REASON',
  'DESCRIPTIVE'
]);

const QUESTION_CATEGORY = Object.freeze(['PRELIMS', 'MAINS']);

const QUESTION_STATUS = Object.freeze(['ACTIVE', 'INACTIVE']);

const QUESTION_DIFFICULTY = Object.freeze(['EASY', 'MEDIUM', 'HARD']);

const MCQ_CORRECT_ANSWER = Object.freeze(['A', 'B', 'C', 'D']);

const ASSERTION_REASON_ANSWER = Object.freeze([
  'BOTH_TRUE_REASON_EXPLAINS',
  'BOTH_TRUE_REASON_NOT_EXPLAINS',
  'ASSERTION_TRUE_REASON_FALSE',
  'ASSERTION_FALSE_REASON_TRUE'
]);

const ASSERTION_ANSWER_LABELS = Object.freeze({
  BOTH_TRUE_REASON_EXPLAINS: 'Both true & R explains A',
  BOTH_TRUE_REASON_NOT_EXPLAINS: 'Both true but R not explanation',
  ASSERTION_TRUE_REASON_FALSE: 'A true, R false',
  ASSERTION_FALSE_REASON_TRUE: 'A false, R true'
});

const BULK_TEMPLATE_TYPES = Object.freeze({
  mcq: 'MCQ',
  numerical: 'NUMERICAL',
  'match-the-following': 'MATCH_THE_FOLLOWING',
  'assertion-reason': 'ASSERTION_REASON',
  descriptive: 'DESCRIPTIVE'
});

const DUPLICATE_MODES = Object.freeze(['SKIP', 'UPLOAD_ANYWAY']);

const TYPE_ALIASES = {
  mcq: 'MCQ',
  numerical: 'NUMERICAL',
  'match the following': 'MATCH_THE_FOLLOWING',
  'match_the_following': 'MATCH_THE_FOLLOWING',
  'assertion reason': 'ASSERTION_REASON',
  'assertion_reason': 'ASSERTION_REASON',
  descriptive: 'DESCRIPTIVE'
};

const normalizeQuestionType = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const upper = raw.toUpperCase().replace(/\s+/g, '_');
  if (QUESTION_TYPES.includes(upper)) return upper;
  const alias = TYPE_ALIASES[raw.toLowerCase()];
  return alias || null;
};

const normalizeCategory = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'PRELIMS' || raw === 'MAINS') return raw;
  return null;
};

const normalizeStatus = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'ACTIVE' || raw === 'INACTIVE') return raw;
  if (raw === 'TRUE') return 'ACTIVE';
  if (raw === 'FALSE') return 'INACTIVE';
  return null;
};

const normalizeDifficulty = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  if (QUESTION_DIFFICULTY.includes(raw)) return raw;
  const map = { EASY: 'EASY', MEDIUM: 'MEDIUM', HARD: 'HARD' };
  const title = String(value || '').trim();
  if (title === 'Easy') return 'EASY';
  if (title === 'Medium') return 'MEDIUM';
  if (title === 'Hard') return 'HARD';
  return map[raw] || null;
};

const normalizeAssertionAnswer = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const upper = raw.toUpperCase().replace(/\s+/g, '_');
  if (ASSERTION_REASON_ANSWER.includes(upper)) return upper;

  const compact = raw.toLowerCase();
  if (compact.includes('both') && compact.includes('explains')) {
    return 'BOTH_TRUE_REASON_EXPLAINS';
  }
  if (compact.includes('both') && (compact.includes('not') || compact.includes('no explanation'))) {
    return 'BOTH_TRUE_REASON_NOT_EXPLAINS';
  }
  if (compact.includes('a is true') && compact.includes('r is false')) {
    return 'ASSERTION_TRUE_REASON_FALSE';
  }
  if (compact.includes('a is false') && compact.includes('r is true')) {
    return 'ASSERTION_FALSE_REASON_TRUE';
  }
  if (compact.includes('a true') && compact.includes('r false')) {
    return 'ASSERTION_TRUE_REASON_FALSE';
  }
  if (compact.includes('a false') && compact.includes('r true')) {
    return 'ASSERTION_FALSE_REASON_TRUE';
  }
  return null;
};

module.exports = {
  QUESTION_TYPES,
  QUESTION_CATEGORY,
  QUESTION_STATUS,
  QUESTION_DIFFICULTY,
  MCQ_CORRECT_ANSWER,
  ASSERTION_REASON_ANSWER,
  ASSERTION_ANSWER_LABELS,
  BULK_TEMPLATE_TYPES,
  DUPLICATE_MODES,
  normalizeQuestionType,
  normalizeCategory,
  normalizeStatus,
  normalizeDifficulty,
  normalizeAssertionAnswer
};
