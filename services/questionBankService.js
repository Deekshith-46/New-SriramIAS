const QuestionBank = require('../models/QuestionBank');
const cloudinary = require('../config/cloudinary');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const { buildPaginationResponse } = require('../middleware/resourceMiddleware');
const {
  QUESTION_TYPES,
  QUESTION_CATEGORY,
  QUESTION_DIFFICULTY,
  DUPLICATE_MODES
} = require('../utils/questionBankEnums');
const {
  generateQuestionCode,
  normalizeFormPayload,
  formatQuestionBankResponse,
  buildDuplicatePrefill
} = require('../utils/questionBankHelpers');
const {
  validateTypeSpecificFields,
  buildPersistPayload
} = require('../utils/questionBankTypeValidators');
const { parseBulkFile, buildTemplate } = require('../utils/questionBankBulkParser');
const {
  findDuplicateInBatch,
  findDuplicatesInDatabase
} = require('../utils/questionBankDuplicate');
const {
  getEditableFields,
  buildMergedUpdateBody,
  clearStaleTypeFields
} = require('../utils/questionBankEditableFields');

const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error) {
    console.error('Question bank image delete error:', error.message);
  }
};

const uploadQuestionImage = async (file) => {
  const uploaded = await uploadToCloudinary(file, 'question-bank/images', 'image');
  return { imageUrl: uploaded.url, imagePublicId: uploaded.public_id };
};

const validateQuestionPayload = (payload, row) => {
  const errors = [];
  validateTypeSpecificFields(payload, errors, row);
  if (errors.length) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.errors = errors;
    throw error;
  }
};

const buildListQuery = (queryParams) => {
  const query = {};
  const {
    type,
    category,
    subject,
    topic,
    difficulty,
    status,
    tags,
    search
  } = queryParams;

  if (type) query.type = type;
  if (category) query.category = category;
  if (subject) query.subject = new RegExp(`^${subject}$`, 'i');
  if (topic) query.topic = new RegExp(`^${topic}$`, 'i');
  if (difficulty) query.difficulty = difficulty;
  if (status) query.status = status;
  if (tags) query.tags = tags;

  if (search) {
    const term = search.trim();
    query.$or = [
      { questionCode: new RegExp(term, 'i') },
      { questionText: new RegExp(term, 'i') },
      { subject: new RegExp(term, 'i') },
      { topic: new RegExp(term, 'i') },
      { tags: new RegExp(term, 'i') }
    ];
  }

  return query;
};

const getAnalytics = async (filters = {}) => {
  const match = buildListQuery(filters);

  const [totalQuestions, easyCount, mediumHardAgg] = await Promise.all([
    QuestionBank.countDocuments(match),
    QuestionBank.countDocuments({ ...match, difficulty: 'EASY' }),
    QuestionBank.countDocuments({
      ...match,
      difficulty: { $in: ['MEDIUM', 'HARD'] }
    })
  ]);

  return {
    totalQuestions,
    easyCount,
    mediumHardCount: mediumHardAgg
  };
};

const listQuestions = async (queryParams, pagination, sort) => {
  const query = buildListQuery(queryParams);
  const allowedSort = [
    'createdAt',
    'questionCode',
    'subject',
    'difficulty',
    'usageCount',
    'type',
    'category'
  ];
  const sortField = allowedSort.includes(queryParams.sortBy)
    ? queryParams.sortBy
    : 'createdAt';
  const sortOrder = queryParams.sortOrder === 'asc' ? 1 : -1;

  const [items, total] = await Promise.all([
    QuestionBank.find(query)
      .sort({ [sortField]: sortOrder })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    QuestionBank.countDocuments(query)
  ]);

  return buildPaginationResponse(
    items.map(formatQuestionBankResponse),
    total,
    pagination.page,
    pagination.limit
  );
};

const getQuestionById = async (id) => {
  const doc = await QuestionBank.findById(id);
  if (!doc) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }
  return formatQuestionBankResponse(doc);
};

const createQuestion = async (body, imageFile, userId) => {
  const payload = normalizeFormPayload(body);
  validateQuestionPayload(payload);

  if (imageFile) {
    const image = await uploadQuestionImage(imageFile);
    Object.assign(payload, image);
  }

  const questionCode = await generateQuestionCode();
  const doc = await QuestionBank.create({
    ...buildPersistPayload(payload, { createdBy: userId }),
    questionCode
  });

  return formatQuestionBankResponse(doc);
};

const getEditableFieldsForType = async (type) => {
  const normalized = String(type || '').trim().toUpperCase();
  if (!QUESTION_TYPES.includes(normalized)) {
    const error = new Error('Invalid question type');
    error.statusCode = 400;
    throw error;
  }

  return {
    type: normalized,
    commonFields: getEditableFields(normalized).filter((field) =>
      ['category', 'status', 'subject', 'topic', 'difficulty', 'tags', 'questionText', 'explanation'].includes(
        field
      )
    ),
    typeSpecificFields: getEditableFields(normalized).filter(
      (field) =>
        !['category', 'status', 'subject', 'topic', 'difficulty', 'tags', 'questionText', 'explanation'].includes(
          field
        )
    ),
    imageField: 'image',
    removeImageField: 'removeImage',
    nonEditableFields: [
      '_id',
      'questionCode',
      'type',
      'usageCount',
      'createdBy',
      'updatedBy',
      'createdAt',
      'updatedAt'
    ]
  };
};

const updateQuestion = async (id, body, imageFile, userId) => {
  const existing = await QuestionBank.findById(id);
  if (!existing) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }

  const { mergedBody, updatedFields, removeImage } = buildMergedUpdateBody(existing, body);

  if (!updatedFields.length && !imageFile && !removeImage) {
    const error = new Error('At least one editable field, image, or removeImage is required');
    error.statusCode = 400;
    throw error;
  }

  const payload = normalizeFormPayload(mergedBody);
  validateQuestionPayload(payload);

  const persistPayload = buildPersistPayload(payload, { updatedBy: userId });

  if (imageFile) {
    await deleteCloudinaryImage(existing.imagePublicId);
    const image = await uploadQuestionImage(imageFile);
    Object.assign(persistPayload, image);
  } else if (removeImage) {
    await deleteCloudinaryImage(existing.imagePublicId);
    persistPayload.imageUrl = undefined;
    persistPayload.imagePublicId = undefined;
  } else {
    persistPayload.imageUrl = existing.imageUrl;
    persistPayload.imagePublicId = existing.imagePublicId;
  }

  clearStaleTypeFields(existing, payload.type);
  Object.assign(existing, persistPayload);
  await existing.save();

  return formatQuestionBankResponse(existing);
};

const deleteQuestion = async (id) => {
  const existing = await QuestionBank.findById(id);
  if (!existing) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }

  const snapshot = formatQuestionBankResponse(existing);
  await deleteCloudinaryImage(existing.imagePublicId);
  await QuestionBank.deleteOne({ _id: id });

  return snapshot;
};

const updateStatus = async (id, status, userId) => {
  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    const error = new Error('status must be ACTIVE or INACTIVE');
    error.statusCode = 400;
    throw error;
  }

  const doc = await QuestionBank.findByIdAndUpdate(
    id,
    { status, updatedBy: userId },
    { new: true }
  );
  if (!doc) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }
  return formatQuestionBankResponse(doc);
};

const duplicateQuestion = async (id) => {
  const doc = await QuestionBank.findById(id).lean();
  if (!doc) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }
  return buildDuplicatePrefill(doc);
};

const getDistinctValues = async (field, extraMatch = {}) => {
  const values = await QuestionBank.distinct(field, extraMatch);
  return values.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));
};

const getFilterOptions = async (query = {}) => {
  const match = {};
  if (query.subject) match.subject = new RegExp(`^${query.subject}$`, 'i');

  const [subjects, topics, tags] = await Promise.all([
    getDistinctValues('subject'),
    getDistinctValues('topic', match),
    QuestionBank.distinct('tags', match)
  ]);

  return {
    types: QUESTION_TYPES,
    categories: QUESTION_CATEGORY,
    difficulties: QUESTION_DIFFICULTY,
    subjects,
    topics,
    tags: tags.flat().filter(Boolean).sort()
  };
};

const validateBulkFile = async (file) => {
  const { rows, errors, totalRows } = parseBulkFile(file);
  const batchDupes = findDuplicateInBatch(rows);
  const dbDupes = await findDuplicatesInDatabase(rows);

  const duplicateRows = batchDupes.length + dbDupes.length;
  const invalidRows = errors.length;
  const validRows = totalRows - invalidRows;

  return {
    totalRows,
    validRows: Math.max(0, validRows),
    invalidRows,
    duplicateRows,
    duplicates: [...batchDupes, ...dbDupes],
    errors,
    canImport: invalidRows === 0
  };
};

const importBulkFile = async (file, duplicateMode, userId) => {
  if (!DUPLICATE_MODES.includes(duplicateMode)) {
    const error = new Error('duplicateMode must be SKIP or UPLOAD_ANYWAY');
    error.statusCode = 400;
    throw error;
  }

  const validation = await validateBulkFile(file);
  if (!validation.canImport) {
    const error = new Error('Bulk upload validation failed');
    error.statusCode = 400;
    error.data = validation;
    throw error;
  }

  const { rows } = parseBulkFile(file);
  const batchDupes = findDuplicateInBatch(rows);
  const dbDupes = await findDuplicatesInDatabase(rows);
  const duplicateRowSet = new Set([
    ...batchDupes.map((d) => d.row),
    ...dbDupes.map((d) => d.row)
  ]);

  let insertedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const questionCodes = [];
  const errors = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const line = row.sourceRow || index + 2;
    const isDuplicate = duplicateRowSet.has(line);

    if (isDuplicate && duplicateMode === 'SKIP') {
      skippedCount += 1;
      continue;
    }

    try {
      const questionCode = await generateQuestionCode();
      const created = await QuestionBank.create({
        ...buildPersistPayload(row, { createdBy: userId }),
        questionCode
      });
      insertedCount += 1;
      questionCodes.push(created.questionCode);
    } catch (err) {
      failedCount += 1;
      errors.push({ row: line, message: err.message });
    }
  }

  return {
    insertedCount,
    duplicateCount: batchDupes.length + dbDupes.length,
    skippedCount,
    failedCount,
    questionCodes,
    errors
  };
};

const incrementQuestionBankUsage = async (questionIds = []) => {
  if (!questionIds.length) return;
  await QuestionBank.updateMany(
    { _id: { $in: questionIds } },
    { $inc: { usageCount: 1 } }
  );
};

module.exports = {
  getAnalytics,
  listQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  getEditableFieldsForType,
  deleteQuestion,
  updateStatus,
  duplicateQuestion,
  getFilterOptions,
  buildTemplate,
  validateBulkFile,
  importBulkFile,
  incrementQuestionBankUsage
};
