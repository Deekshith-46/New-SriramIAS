const MAINS_CATEGORIES = Object.freeze(['Prelims', 'Mains', 'Both']);

const CORRECT_ANSWER_OPTIONS = Object.freeze(['A', 'B', 'C', 'D']);

const BULK_TEMPLATE_HEADERS = Object.freeze([
  'questionNumber',
  'question',
  'optionA',
  'optionB',
  'optionC',
  'optionD',
  'correctAnswer',
  'explanation'
]);

const BULK_MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const QUESTION_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

module.exports = {
  MAINS_CATEGORIES,
  CORRECT_ANSWER_OPTIONS,
  BULK_TEMPLATE_HEADERS,
  BULK_MAX_FILE_SIZE_BYTES,
  QUESTION_IMAGE_MAX_BYTES
};
