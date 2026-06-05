const CATEGORIES = Object.freeze({
  CURRENT_AFFAIRS: 'CURRENT_AFFAIRS',
  MONTHLY_MAGAZINE: 'MONTHLY_MAGAZINE',
  INFOGRAPHICS: 'INFOGRAPHICS',
  MONTHLY_RECAP: 'MONTHLY_RECAP',
  DAILY_PRACTICE_QUESTIONS: 'DAILY_PRACTICE_QUESTIONS'
});

const CATEGORY_LIST = Object.values(CATEGORIES);

const PDF_REQUIRED_CATEGORIES = Object.freeze([
  CATEGORIES.MONTHLY_MAGAZINE,
  CATEGORIES.INFOGRAPHICS,
  CATEGORIES.MONTHLY_RECAP
]);

const MONTHS = Object.freeze([
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]);

const CLOUDINARY_FOLDER = 'current-affairs';
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

module.exports = {
  CATEGORIES,
  CATEGORY_LIST,
  PDF_REQUIRED_CATEGORIES,
  MONTHS,
  CLOUDINARY_FOLDER,
  MAX_PDF_SIZE_BYTES
};
