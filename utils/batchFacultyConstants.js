const FACULTY_CATEGORIES = [
  'LIVE_CLASS',
  'RECORDING',
  'PRELIMS_TEST',
  'MAINS_ANSWER_WRITING',
  'PDF'
];

/** Legacy enum values stored before category split (TEST → PRELIMS_TEST). */
const LEGACY_FACULTY_CATEGORY_MAP = {
  TEST: 'PRELIMS_TEST'
};

const normalizeFacultyCategories = (categories = []) => {
  const normalized = categories
    .map((c) => {
      const upper = String(c || '').trim().toUpperCase();
      return LEGACY_FACULTY_CATEGORY_MAP[upper] || upper;
    })
    .filter((c) => FACULTY_CATEGORIES.includes(c));
  return [...new Set(normalized)];
};

const BATCH_STATUSES = [
  'ACTIVE',
  'UPCOMING',
  'INACTIVE',
  'COMPLETED',
  'ARCHIVED',
  'CANCELLED'
];

const FEE_CURRENCIES = ['INR', 'USD', 'EUR'];

module.exports = {
  FACULTY_CATEGORIES,
  LEGACY_FACULTY_CATEGORY_MAP,
  normalizeFacultyCategories,
  BATCH_STATUSES,
  FEE_CURRENCIES
};
