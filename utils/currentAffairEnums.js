/**
 * Production enum constants for Current Affairs CMS.
 * API + DB store UPPER_SNAKE / UPPER values; UI labels may differ.
 */
const CURRENT_AFFAIR_CATEGORIES = Object.freeze({
  CURRENT_AFFAIRS: 'CURRENT_AFFAIRS',
  MONTHLY_MAGAZINE: 'MONTHLY_MAGAZINE',
  INFOGRAPHICS: 'INFOGRAPHICS',
  MONTHLY_RECAP: 'MONTHLY_RECAP',
  DAILY_PRACTICE_QUESTIONS: 'DAILY_PRACTICE_QUESTIONS'
});

const CURRENT_AFFAIR_CATEGORY_LIST = Object.freeze(
  Object.values(CURRENT_AFFAIR_CATEGORIES)
);

const MAINS_CATEGORIES = Object.freeze({
  PRELIMS: 'PRELIMS',
  MAINS: 'MAINS'
});

const MAINS_CATEGORY_LIST = Object.freeze(Object.values(MAINS_CATEGORIES));

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

/** UI year dropdown: 2026–2031 */
const YEAR_OPTIONS = Object.freeze([2026, 2027, 2028, 2029, 2030, 2031]);

const PDF_REQUIRED_CATEGORIES = Object.freeze([
  CURRENT_AFFAIR_CATEGORIES.CURRENT_AFFAIRS,
  CURRENT_AFFAIR_CATEGORIES.MONTHLY_MAGAZINE,
  CURRENT_AFFAIR_CATEGORIES.INFOGRAPHICS,
  CURRENT_AFFAIR_CATEGORIES.MONTHLY_RECAP
]);

const YEAR_MONTH_REQUIRED_CATEGORIES = Object.freeze([
  CURRENT_AFFAIR_CATEGORIES.MONTHLY_MAGAZINE,
  CURRENT_AFFAIR_CATEGORIES.INFOGRAPHICS,
  CURRENT_AFFAIR_CATEGORIES.MONTHLY_RECAP
]);

const CORRECT_ANSWER_OPTIONS = Object.freeze(['A', 'B', 'C', 'D']);

/** Matches UI bulk-upload sheet column headers */
const BULK_TEMPLATE_HEADERS = Object.freeze([
  'Question No',
  'Question',
  'Option 1',
  'Option 2',
  'Option 3',
  'Option 4',
  'Correct Answer',
  'Explanation'
]);

const normalizeMainsCategory = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'PRELIMS' || raw === 'PRELIM') return MAINS_CATEGORIES.PRELIMS;
  if (raw === 'MAINS') return MAINS_CATEGORIES.MAINS;
  if (value === 'Prelims') return MAINS_CATEGORIES.PRELIMS;
  if (value === 'Mains') return MAINS_CATEGORIES.MAINS;
  return null;
};

module.exports = {
  CURRENT_AFFAIR_CATEGORIES,
  CURRENT_AFFAIR_CATEGORY_LIST,
  MAINS_CATEGORIES,
  MAINS_CATEGORY_LIST,
  MONTHS,
  YEAR_OPTIONS,
  PDF_REQUIRED_CATEGORIES,
  YEAR_MONTH_REQUIRED_CATEGORIES,
  CORRECT_ANSWER_OPTIONS,
  BULK_TEMPLATE_HEADERS,
  normalizeMainsCategory
};
