const FACULTY_CATEGORIES = [
  'LIVE_CLASS',
  'RECORDING',
  'PRELIMS_TEST',
  'MAINS_ANSWER_WRITING',
  'PDF'
];

const FACULTY_CATEGORY_LABELS = {
  LIVE_CLASS: 'Live Class',
  RECORDING: 'Recording',
  PRELIMS_TEST: 'Prelims Test',
  MAINS_ANSWER_WRITING: 'Mains Answer Writing',
  PDF: 'PDF'
};

const getFacultyCategoryOptions = () =>
  FACULTY_CATEGORIES.map((value) => ({
    value,
    label: FACULTY_CATEGORY_LABELS[value] || value
  }));

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
  FACULTY_CATEGORY_LABELS,
  getFacultyCategoryOptions,
  LEGACY_FACULTY_CATEGORY_MAP,
  normalizeFacultyCategories,
  BATCH_STATUSES,
  FEE_CURRENCIES
};
