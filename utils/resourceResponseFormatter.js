const { CATEGORY_NAME_HINTS, MODULE_TYPES } = require('./resourceConstants');

const matchesName = (name, hint) => {
  const n = (name || '').toLowerCase();
  if (Array.isArray(hint)) return hint.some((h) => n.includes(h));
  return n.includes(hint);
};

const getCategoryKind = (category) => {
  if (!category) return 'GENERIC';
  if (category.moduleType === MODULE_TYPES.CURRENT_AFFAIRS) return 'CURRENT_AFFAIRS';
  if (matchesName(category.name, CATEGORY_NAME_HINTS.NCERT)) return 'NCERT';
  if (matchesName(category.name, CATEGORY_NAME_HINTS.PYQ)) return 'PYQ';
  if (matchesName(category.name, CATEGORY_NAME_HINTS.STUDY_MATERIAL)) return 'STUDY_MATERIAL';
  if (matchesName(category.name, CATEGORY_NAME_HINTS.MOCK_TEST)) return 'MOCK_TEST';
  return 'GENERIC';
};

/** Infer module from saved filter fields when category name is generic. */
const resolveResourceKind = (category, plain = {}) => {
  const byCategory = getCategoryKind(category);
  if (byCategory !== 'GENERIC') return byCategory;
  if (plain.paperId && plain.yearId) return 'PYQ';
  if (plain.subject && plain.class) return 'NCERT';
  if (plain.yearId && (plain.monthId || plain.currentAffairsTypeId)) return 'CURRENT_AFFAIRS';
  return 'GENERIC';
};

const appendFilterRefs = (payload, plain, kind = 'GENERIC') => {
  setRefPair(payload, 'subCategoryId', 'subCategory', plain.subCategoryId);
  setRefPair(payload, 'paperId', 'paper', plain.paperId);
  setRefPair(payload, 'yearId', 'year', plain.yearId);
  setRefPair(payload, 'monthId', 'month', plain.monthId);
  setRefPair(payload, 'typeId', 'type', plain.currentAffairsTypeId);
};

/** Always return a plain 24-char id string (never a populated subdocument). */
const toRefId = (field) => {
  if (!field) return undefined;
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field._id != null) {
    return String(field._id);
  }
  if (typeof field.toString === 'function') {
    const name = field.constructor?.name;
    if (name === 'ObjectId' || name === 'ObjectID') {
      return field.toString();
    }
  }
  return undefined;
};

const refId = (field) => toRefId(field);

const refName = (field) => {
  if (!field) return undefined;
  if (typeof field === 'string' || typeof field === 'number') return undefined;
  if (field.name != null && field.name !== '') return field.name;
  if (field.value != null && field.value !== '') return field.value;
  return undefined;
};

/** Set id + human-readable label together (id first, then label). */
const setRefPair = (payload, idKey, labelKey, field) => {
  const id = toRefId(field);
  if (!id) return;
  payload[idKey] = id;
  const label = refName(field);
  if (label) payload[labelKey] = label;
};

const toPlainResource = (doc) => {
  if (!doc) return doc;
  if (typeof doc.toObject === 'function') {
    return doc.toObject({ depopulate: false, virtuals: false });
  }
  return { ...doc };
};

const compact = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
        return false;
      }
      return true;
    })
  );

const resourceStatus = (plain) => plain.status || (plain.isActive ? 'ACTIVE' : 'INACTIVE');

/** CMS response / request label per resource type. */
const getTitleFieldKey = (kind) => {
  switch (kind) {
    case 'NCERT':
      return 'bookName';
    case 'PYQ':
      return 'paperName';
    case 'STUDY_MATERIAL':
      return 'materialName';
    default:
      return 'title';
  }
};

const resolveResourceTitle = (body = {}, kind = 'GENERIC') => {
  const bookName = (body.bookName || '').trim();
  const paperName = (body.paperName || '').trim();
  const materialName = (body.materialName || '').trim();
  const title = (body.title || '').trim();

  switch (kind) {
    case 'NCERT':
      return bookName || title;
    case 'PYQ':
      return paperName || title || bookName;
    case 'STUDY_MATERIAL':
      return materialName || title || bookName;
    default:
      return title || bookName || paperName || materialName;
  }
};

const applyKindFields = (payload, kind, plain) => {
  if (kind === 'NCERT') {
    payload.subject = plain.subject;
    payload.class = plain.class;
  } else if (kind === 'PYQ') {
    setRefPair(payload, 'subCategoryId', 'subCategory', plain.subCategoryId);
    setRefPair(payload, 'paperId', 'paper', plain.paperId);
    setRefPair(payload, 'yearId', 'year', plain.yearId);
  } else if (kind === 'STUDY_MATERIAL') {
    setRefPair(payload, 'subCategoryId', 'subCategory', plain.subCategoryId);
  } else if (kind === 'MOCK_TEST') {
    setRefPair(payload, 'subCategoryId', 'subCategory', plain.subCategoryId);
    setRefPair(payload, 'paperId', 'paper', plain.paperId);
  } else if (kind === 'CURRENT_AFFAIRS') {
    setRefPair(payload, 'yearId', 'year', plain.yearId);
    setRefPair(payload, 'monthId', 'month', plain.monthId);
    setRefPair(payload, 'typeId', 'type', plain.currentAffairsTypeId);
  }
};

/** CMS — PDF resources (NCERT, PYQ, Study Material, Current Affairs). */
const formatCmsResourceResponse = (doc, categoryOverride = null) => {
  if (!doc) return null;

  const category = categoryOverride || doc.categoryId;
  const plain = toPlainResource(doc);
  const kind = resolveResourceKind(category, plain);
  const titleKey = getTitleFieldKey(kind);

  const categoryRef = categoryOverride || plain.categoryId;

  const payload = {
    _id: plain._id,
    [titleKey]: plain.title,
    status: resourceStatus(plain),
    fileUrl: plain.fileUrl?.url ? plain.fileUrl : undefined,
    description: plain.description || undefined,
    thumbnail: plain.thumbnail?.url ? plain.thumbnail : undefined,
    downloads: plain.downloads,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };

  setRefPair(payload, 'categoryId', 'category', categoryRef);
  applyKindFields(payload, kind, plain);
  appendFilterRefs(payload, plain, kind);
  return compact(payload);
};

const formatMockTestQuestion = (question, isAdmin = false) => {
  const plain = question?.toObject ? question.toObject() : question;
  const payload = {
    _id: plain._id,
    question: plain.question,
    options: plain.options,
    marks: plain.marks,
    negativeMarks: plain.negativeMarks
  };

  if (isAdmin) {
    payload.correctAnswer = plain.correctAnswer;
    payload.explanation = plain.explanation;
  }

  return compact(payload);
};

/** CMS — mock tests. */
const formatMockTestCmsResponse = (doc, options = {}) => {
  const { includeQuestions = false, isAdmin = false } = options;
  const plain = doc?.toObject ? doc.toObject() : { ...doc };

  const payload = {
    _id: plain._id,
    title: plain.title,
    duration: plain.duration,
    passingMarks: plain.passingMarks,
    totalMarks: plain.totalMarks,
    status: resourceStatus(plain),
    questionCount: plain.questionIds?.length ?? plain.questions?.length,
    description: plain.description || undefined,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };

  setRefPair(payload, 'categoryId', 'category', plain.categoryId);
  setRefPair(payload, 'subCategoryId', 'subCategory', plain.subCategoryId);
  setRefPair(payload, 'paperId', 'paper', plain.paperId);
  setRefPair(payload, 'yearId', 'year', plain.yearId);
  setRefPair(payload, 'subjectId', 'subject', plain.subjectId);

  if (includeQuestions) {
    const questions = plain.questions || plain.questionIds || [];
    payload.questions = questions.map((q) => formatMockTestQuestion(q, isAdmin));
  }

  return compact(payload);
};

/** Portal — free resource file cards. */
const formatPortalResourceCard = (doc) => {
  const plain = toPlainResource(doc);
  const kind = resolveResourceKind(plain.categoryId, plain);
  const titleKey = getTitleFieldKey(kind);

  const payload = {
    _id: plain._id,
    itemType: 'file',
    [titleKey]: plain.title,
    pdfUrl: plain.fileUrl?.url || undefined,
    thumbnail: plain.thumbnail?.url || undefined,
    category: refName(plain.categoryId),
    downloads: plain.downloads,
    status: resourceStatus(plain)
  };

  applyKindFields(payload, kind, plain, { idFields: false });
  appendFilterRefs(payload, plain, kind);
  return compact(payload);
};

/** Portal — mock test cards. */
const formatPortalMockTestCard = (doc) => {
  const plain = doc?.toObject ? doc.toObject() : { ...doc };

  return compact({
    _id: plain._id,
    itemType: 'mock_test',
    title: plain.title,
    category: refName(plain.categoryId),
    subCategory: refName(plain.subCategoryId),
    paper: refName(plain.paperId),
    duration: plain.duration,
    totalMarks: plain.totalMarks,
    passingMarks: plain.passingMarks,
    questionCount: plain.questionIds?.length || 0,
    status: resourceStatus(plain)
  });
};

/** Portal — current affairs cards. */
const formatPortalCurrentAffairsCard = (doc) =>
  compact({
    _id: doc._id,
    title: doc.title,
    pdfUrl: doc.fileUrl?.url || undefined,
    thumbnail: doc.thumbnail?.url || undefined,
    year: refName(doc.yearId),
    month: refName(doc.monthId),
    type: refName(doc.currentAffairsTypeId),
    downloads: doc.downloads || 0,
    status: resourceStatus(doc)
  });

/** Portal — resource detail (extends card with optional metadata). */
const formatPortalResourceDetail = (doc, formatter) => {
  const payload = {
    ...formatter(doc),
    description: doc.description || undefined,
    fileType: doc.fileType || undefined,
    fileSize: doc.fileSize || undefined,
    categoryId: refId(doc.categoryId)
  };

  return compact(payload);
};

module.exports = {
  compact,
  getCategoryKind,
  resolveResourceKind,
  getTitleFieldKey,
  resolveResourceTitle,
  toRefId,
  refId,
  formatCmsResourceResponse,
  formatMockTestCmsResponse,
  formatMockTestQuestion,
  formatPortalResourceCard,
  formatPortalMockTestCard,
  formatPortalCurrentAffairsCard,
  formatPortalResourceDetail
};
