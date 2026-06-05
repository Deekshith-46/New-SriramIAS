const CurrentAffair = require('../models/CurrentAffair');
const CurrentAffairQuestion = require('../models/CurrentAffairQuestion');
const { CATEGORIES } = require('../utils/currentAffairConstants');
const { MAINS_CATEGORIES } = require('../utils/dailyPracticeConstants');
const {
  parseBulkQuestionFile,
  buildCsvTemplate,
  normalizeCorrectAnswer
} = require('../utils/dailyPracticeBulkParser');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const cloudinary = require('../config/cloudinary');
const { formatCurrentAffairResponse } = require('../utils/currentAffairHelpers');

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

const validatePaperPayload = (payload) => {
  const errors = [];

  if (!payload.mainsCategory || !MAINS_CATEGORIES.includes(payload.mainsCategory)) {
    errors.push({
      field: 'mainsCategory',
      message: `mainsCategory must be one of: ${MAINS_CATEGORIES.join(', ')}`
    });
  }
  if (!payload.paperName) {
    errors.push({ field: 'paperName', message: 'paperName is required' });
  }
  if (!payload.year) {
    errors.push({ field: 'year', message: 'year is required' });
  }
  if (!payload.month) {
    errors.push({ field: 'month', message: 'month is required' });
  }
  if (!payload.date) {
    errors.push({ field: 'date', message: 'date is required' });
  }
  if (!payload.sectionFrom || !payload.sectionTo) {
    errors.push({ field: 'sectionFrom/sectionTo', message: 'sectionFrom and sectionTo are required' });
  } else if (Number(payload.sectionFrom) > Number(payload.sectionTo)) {
    errors.push({ field: 'sectionTo', message: 'sectionTo must be greater than or equal to sectionFrom' });
  }

  if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
    errors.push({ field: 'questions', message: 'At least one question is required' });
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

const createDailyPracticePaper = async (payload, createdBy) => {
  validatePaperPayload(payload);

  const questions = payload.questions.map((q, index) => validateQuestionPayload(q, index));

  const paper = await CurrentAffair.create({
    category: CATEGORIES.DAILY_PRACTICE_QUESTIONS,
    title: payload.paperName,
    paperName: payload.paperName,
    mainsCategory: payload.mainsCategory,
    year: Number(payload.year),
    month: payload.month,
    date: new Date(payload.date),
    sectionFrom: Number(payload.sectionFrom),
    sectionTo: Number(payload.sectionTo),
    description: payload.description || undefined,
    status: payload.status !== undefined ? payload.status : true,
    createdBy: createdBy || undefined
  });

  const questionDocs = await CurrentAffairQuestion.insertMany(
    questions.map((q) => ({ ...q, currentAffairId: paper._id }))
  );

  return {
    paper: formatCurrentAffairResponse(paper),
    questions: questionDocs,
    questionCount: questionDocs.length
  };
};

const getMainsCategories = () => MAINS_CATEGORIES;

const downloadBulkTemplate = () => buildCsvTemplate();

const bulkUploadQuestions = async (currentAffairId, file, replace = false) => {
  await assertDailyPracticePaper(currentAffairId);
  const questions = parseBulkQuestionFile(file);

  if (replace) {
    await CurrentAffairQuestion.deleteMany({ currentAffairId });
  }

  try {
    const created = await CurrentAffairQuestion.insertMany(
      questions.map((q) => ({ ...q, currentAffairId }))
    );

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

module.exports = {
  getMainsCategories,
  downloadBulkTemplate,
  createDailyPracticePaper,
  bulkUploadQuestions,
  getQuestionsByPaper,
  addQuestionToPaper,
  deleteCloudinaryImage
};
