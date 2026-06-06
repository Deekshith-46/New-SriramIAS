const { CATEGORIES } = require('./currentAffairConstants');
const { formatCurrentAffairResponse } = require('./currentAffairHelpers');

const EDITABLE_FIELDS = Object.freeze({
  [CATEGORIES.CURRENT_AFFAIRS]: ['title', 'pdf', 'status'],
  [CATEGORIES.MONTHLY_MAGAZINE]: ['title', 'year', 'month', 'pdf', 'status'],
  [CATEGORIES.INFOGRAPHICS]: ['title', 'year', 'month', 'pdf', 'status'],
  [CATEGORIES.MONTHLY_RECAP]: ['title', 'year', 'month', 'pdf', 'status'],
  [CATEGORIES.DAILY_PRACTICE_QUESTIONS]: [
    'mainsCategory',
    'paperName',
    'year',
    'month',
    'date',
    'sectionFrom',
    'sectionTo',
    'status'
  ]
});

const formatDateForEdit = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

/**
 * Full record for Edit screen — all stored + category-specific editable field list.
 */
const formatCurrentAffairForEdit = (doc, extras = {}) => {
  const base = formatCurrentAffairResponse(doc);
  if (!base) return null;

  const category = base.category;
  const editableFields = EDITABLE_FIELDS[category] || [];

  const data = {
    _id: base._id,
    category: base.category,
    title: base.title || null,
    year: base.year ?? null,
    month: base.month || null,
    description: base.description || null,
    pdfUrl: base.pdfUrl || null,
    imageUrl: base.imageUrl || null,
    status: base.status ?? true,
    createdBy: base.createdBy || null,
    updatedBy: base.updatedBy || null,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    editableFields
  };

  if (category === CATEGORIES.CURRENT_AFFAIRS) {
    data.year = null;
    data.month = null;
    data.description = null;
  }

  if (category === CATEGORIES.DAILY_PRACTICE_QUESTIONS) {
    data.mainsCategory = base.mainsCategory || null;
    data.paperName = base.paperName || base.title || null;
    data.title = data.paperName;
    data.date = formatDateForEdit(base.date);
    data.questions = extras.questions || [];
    data.questionCount = extras.questionCount ?? data.questions.length;

    if (data.questions.length) {
      const numbers = data.questions.map((q) => q.questionNumber);
      data.sectionFrom = Math.min(...numbers);
      data.sectionTo = Math.max(...numbers);
    } else {
      data.sectionFrom = base.sectionFrom ?? null;
      data.sectionTo = base.sectionTo ?? null;
    }
    data.editableFields = [
      ...editableFields,
      'questions'
    ];
  }

  return data;
};

const sanitizeUpdatePayload = (payload, category) => {
  const next = { ...payload };

  if (category === CATEGORIES.CURRENT_AFFAIRS) {
    delete next.year;
    delete next.month;
    delete next.description;
    delete next.mainsCategory;
    delete next.paperName;
    delete next.date;
    delete next.sectionFrom;
    delete next.sectionTo;
  } else if (category === CATEGORIES.DAILY_PRACTICE_QUESTIONS) {
    delete next.description;
  } else {
    delete next.mainsCategory;
    delete next.paperName;
    delete next.date;
    delete next.sectionFrom;
    delete next.sectionTo;
  }

  return next;
};

module.exports = {
  EDITABLE_FIELDS,
  formatCurrentAffairForEdit,
  sanitizeUpdatePayload,
  formatDateForEdit
};
