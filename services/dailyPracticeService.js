const CurrentAffair = require('../models/CurrentAffair');
const CurrentAffairQuestion = require('../models/CurrentAffairQuestion');
const { CATEGORIES, YEAR_OPTIONS } = require('../utils/currentAffairConstants');
const { MAINS_CATEGORIES } = require('../utils/dailyPracticeConstants');
const { normalizeMainsCategory } = require('../utils/currentAffairEnums');
const {
  parseBulkQuestionFile,
  buildCsvTemplate,
  normalizeCorrectAnswer
} = require('../utils/dailyPracticeBulkParser');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const cloudinary = require('../config/cloudinary');
const { formatCurrentAffairForEdit } = require('../utils/currentAffairEditHelpers');

const assertDailyPracticePaper = async (id) => {
  const paper = await CurrentAffair.findOne({
    _id: id,
    category: CATEGORIES.DAILY_PRACTICE_QUESTIONS
  });

  if (!paper) {
    const error = new Error('Daily practice paper not found');
    error.statusCode = 404;
    throw error;
  }

  return paper;
};

const syncSectionRange = async (currentAffairId) => {
  const questions = await CurrentAffairQuestion.find({ currentAffairId })
    .select('questionNumber')
    .lean();

  if (!questions.length) {
    await CurrentAffair.findByIdAndUpdate(currentAffairId, {
      $unset: { sectionFrom: '', sectionTo: '' }
    });
    return;
  }

  const numbers = questions.map((q) => q.questionNumber);
  await CurrentAffair.findByIdAndUpdate(currentAffairId, {
    sectionFrom: Math.min(...numbers),
    sectionTo: Math.max(...numbers)
  });
};

const validateQuestionPayload = (question, index = 0) => {
  const prefix = `questions[${index}]`;
  const errors = [];

  if (!question.questionNumber) {
    errors.push({ field: `${prefix}.questionNumber`, message: 'questionNumber is required' });
  }
  if (!question.question) {
    errors.push({ field: `${prefix}.question`, message: 'question is required' });
  }
  ['optionA', 'optionB', 'optionC', 'optionD'].forEach((field) => {
    if (!question[field]) {
      errors.push({ field: `${prefix}.${field}`, message: `${field} is required` });
    }
  });

  const correctAnswer = normalizeCorrectAnswer(question.correctAnswer);
  if (!correctAnswer) {
    errors.push({
      field: `${prefix}.correctAnswer`,
      message: 'correctAnswer must be A, B, C, or D'
    });
  }

  if (errors.length) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.errors = errors;
    throw error;
  }

  return {
    questionNumber: Number(question.questionNumber),
    question: String(question.question).trim(),
    optionA: String(question.optionA).trim(),
    optionB: String(question.optionB).trim(),
    optionC: String(question.optionC).trim(),
    optionD: String(question.optionD).trim(),
    correctAnswer,
    explanation: question.explanation ? String(question.explanation).trim() : ''
  };
};

const validatePaperPayload = (payload, { isBulkUpload = false } = {}) => {
  const errors = [];

  const mainsCategory = normalizeMainsCategory(payload.mainsCategory);
  if (!mainsCategory) {
    errors.push({
      field: 'mainsCategory',
      message: `mainsCategory must be one of: ${MAINS_CATEGORIES.join(', ')}`
    });
  }
  payload.mainsCategory = mainsCategory;
  if (!payload.paperName) {
    errors.push({ field: 'paperName', message: 'paperName is required' });
  }
  if (!payload.year) {
    errors.push({ field: 'year', message: 'year is required' });
  } else if (!YEAR_OPTIONS.includes(Number(payload.year))) {
    errors.push({
      field: 'year',
      message: `year must be one of: ${YEAR_OPTIONS.join(', ')}`
    });
  }
  if (!payload.month) {
    errors.push({ field: 'month', message: 'month is required' });
  }
  if (!payload.date) {
    errors.push({ field: 'date', message: 'date is required' });
  }

  if (!isBulkUpload) {
    if (!payload.sectionFrom || !payload.sectionTo) {
      errors.push({
        field: 'sectionFrom/sectionTo',
        message: 'sectionFrom and sectionTo are required'
      });
    } else if (Number(payload.sectionFrom) > Number(payload.sectionTo)) {
      errors.push({
        field: 'sectionTo',
        message: 'sectionTo must be greater than or equal to sectionFrom'
      });
    }
  } else if (
    payload.sectionFrom !== undefined &&
    payload.sectionFrom !== '' &&
    payload.sectionTo !== undefined &&
    payload.sectionTo !== ''
  ) {
    if (Number(payload.sectionFrom) > Number(payload.sectionTo)) {
      errors.push({
        field: 'sectionTo',
        message: 'sectionTo must be greater than or equal to sectionFrom'
      });
    }
  }

  if (payload.questions !== undefined && !Array.isArray(payload.questions)) {
    errors.push({ field: 'questions', message: 'questions must be an array' });
  }

  if (errors.length) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.errors = errors;
    throw error;
  }
};

const uploadQuestionImage = async (file) => {
  const uploaded = await uploadToCloudinary(file, 'current-affairs/question-images', 'image');
  return {
    imageUrl: uploaded.url,
    imagePublicId: uploaded.public_id
  };
};

const resolveCreateQuestions = (payload, bulkFile) => {
  const hasFile = Boolean(bulkFile);
  const hasManual = Array.isArray(payload.questions) && payload.questions.length > 0;

  if (hasFile && hasManual) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.errors = [
      {
        field: 'file',
        message: 'Provide either bulk upload file or questions[], not both'
      }
    ];
    throw error;
  }

  if (hasFile) {
    return parseBulkQuestionFile(bulkFile);
  }

  if (hasManual) {
    return payload.questions.map((q, index) => validateQuestionPayload(q, index));
  }

  return [];
};

const resolveSectionRange = (payload, questions, isBulkUpload) => {
  let sectionFrom =
    payload.sectionFrom !== undefined && payload.sectionFrom !== ''
      ? Number(payload.sectionFrom)
      : undefined;
  let sectionTo =
    payload.sectionTo !== undefined && payload.sectionTo !== ''
      ? Number(payload.sectionTo)
      : undefined;

  if (isBulkUpload && questions.length) {
    const numbers = questions.map((q) => q.questionNumber);
    sectionFrom = sectionFrom ?? Math.min(...numbers);
    sectionTo = sectionTo ?? Math.max(...numbers);
  }

  return { sectionFrom, sectionTo };
};

const createDailyPracticePaper = async (payload, createdBy, bulkFile) => {
  const isBulkUpload = Boolean(bulkFile);
  validatePaperPayload(payload, { isBulkUpload });

  const questions = resolveCreateQuestions(payload, bulkFile);
  const { sectionFrom, sectionTo } = resolveSectionRange(
    payload,
    questions,
    isBulkUpload
  );

  const paperData = {
    category: CATEGORIES.DAILY_PRACTICE_QUESTIONS,
    title: payload.paperName,
    paperName: payload.paperName,
    mainsCategory: payload.mainsCategory,
    year: Number(payload.year),
    month: payload.month,
    date: new Date(payload.date),
    description: payload.description || undefined,
    status: payload.status !== undefined ? payload.status : true,
    createdBy: createdBy || undefined
  };

  if (sectionFrom !== undefined) paperData.sectionFrom = sectionFrom;
  if (sectionTo !== undefined) paperData.sectionTo = sectionTo;

  const paper = await CurrentAffair.create(paperData);

  let questionDocs = [];
  if (questions.length) {
    questionDocs = await CurrentAffairQuestion.insertMany(
      questions.map((q) => ({ ...q, currentAffairId: paper._id }))
    );
    await syncSectionRange(paper._id);
  }

  const refreshedPaper = await CurrentAffair.findById(paper._id);

  return formatCurrentAffairForEdit(refreshedPaper || paper, {
    questions: questionDocs.map((q) => (q.toObject ? q.toObject() : q)),
    questionCount: questionDocs.length
  });
};

const getMainsCategories = () => MAINS_CATEGORIES;

const downloadBulkTemplate = () => buildCsvTemplate();

const bulkUploadQuestions = async (currentAffairId, file, replace = false) => {
  await assertDailyPracticePaper(currentAffairId);

  let startFrom = 1;
  if (!replace) {
    const last = await CurrentAffairQuestion.findOne({ currentAffairId })
      .sort({ questionNumber: -1 })
      .select('questionNumber')
      .lean();
    startFrom = (last?.questionNumber ?? 0) + 1;
  }

  const questions = parseBulkQuestionFile(file, { startFrom });

  if (replace) {
    await CurrentAffairQuestion.deleteMany({ currentAffairId });
  }

  try {
    const created = await CurrentAffairQuestion.insertMany(
      questions.map((q) => ({ ...q, currentAffairId }))
    );

    await syncSectionRange(currentAffairId);

    return {
      count: created.length,
      questions: created
    };
  } catch (error) {
    if (error.code === 11000) {
      const err = new Error('Duplicate questionNumber found for this paper');
      err.statusCode = 400;
      throw err;
    }
    throw error;
  }
};

const getQuestionsByPaper = async (currentAffairId) => {
  await assertDailyPracticePaper(currentAffairId);

  const questions = await CurrentAffairQuestion.find({ currentAffairId })
    .sort({ questionNumber: 1 })
    .lean();

  return questions;
};

const addQuestionToPaper = async (currentAffairId, payload, imageFile) => {
  await assertDailyPracticePaper(currentAffairId);
  const questionData = validateQuestionPayload(payload);

  if (imageFile) {
    const image = await uploadQuestionImage(imageFile);
    Object.assign(questionData, image);
  }

  const created = await CurrentAffairQuestion.create({
    ...questionData,
    currentAffairId
  });

  await syncSectionRange(currentAffairId);

  return created;
};

const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error) {
    console.error('Question image delete error:', error.message);
  }
};

const updateQuestionOnPaper = async (currentAffairId, questionId, payload, imageFile) => {
  await assertDailyPracticePaper(currentAffairId);

  const existing = await CurrentAffairQuestion.findOne({
    _id: questionId,
    currentAffairId
  });

  if (!existing) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }

  const questionData = validateQuestionPayload(payload);
  Object.assign(existing, questionData);

  if (imageFile) {
    await deleteCloudinaryImage(existing.imagePublicId);
    const image = await uploadQuestionImage(imageFile);
    existing.imageUrl = image.imageUrl;
    existing.imagePublicId = image.imagePublicId;
  }

  await existing.save();
  await syncSectionRange(currentAffairId);
  return existing;
};

const deleteQuestionFromPaper = async (currentAffairId, questionId) => {
  await assertDailyPracticePaper(currentAffairId);

  const existing = await CurrentAffairQuestion.findOne({
    _id: questionId,
    currentAffairId
  });

  if (!existing) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }

  await deleteCloudinaryImage(existing.imagePublicId);
  await existing.deleteOne();
  await syncSectionRange(currentAffairId);
  return existing;
};

module.exports = {
  assertDailyPracticePaper,
  syncSectionRange,
  getMainsCategories,
  downloadBulkTemplate,
  createDailyPracticePaper,
  bulkUploadQuestions,
  getQuestionsByPaper,
  addQuestionToPaper,
  updateQuestionOnPaper,
  deleteQuestionFromPaper,
  deleteCloudinaryImage
};
