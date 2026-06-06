const CurrentAffair = require('../models/CurrentAffair');
const CurrentAffairQuestion = require('../models/CurrentAffairQuestion');
const {
  CATEGORIES,
  PDF_REQUIRED_CATEGORIES
} = require('../utils/currentAffairConstants');
const {
  uploadPdfToCloudinary,
  deleteCloudinaryPdf,
  formatCurrentAffairResponse
} = require('../utils/currentAffairHelpers');
const {
  formatCurrentAffairForEdit,
  sanitizeUpdatePayload
} = require('../utils/currentAffairEditHelpers');
const { buildPaginationResponse } = require('../middleware/resourceMiddleware');
const { deleteCloudinaryImage, syncSectionRange } = require('./dailyPracticeService');

const buildListQuery = ({ category, year, month, search, status }) => {
  const query = {};

  if (category) {
    query.category = category;
  }

  if (year) {
    query.year = Number(year);
  }

  if (month) {
    query.month = month;
  }

  if (status !== undefined && status !== '') {
    query.status = status === 'true' || status === true;
  }

  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [
      { title: regex },
      { magazineName: regex },
      { paperName: regex },
      { description: regex }
    ];
  }

  return query;
};

const loadQuestionsForPaper = async (paperId) => {
  const questions = await CurrentAffairQuestion.find({ currentAffairId: paperId })
    .sort({ questionNumber: 1 })
    .lean();
  return { questions, questionCount: questions.length };
};

const buildEditResponse = async (doc) => {
  if (!doc) return null;

  let paper = doc;
  let extras = {};
  if (doc.category === CATEGORIES.DAILY_PRACTICE_QUESTIONS) {
    await syncSectionRange(doc._id);
    paper = (await CurrentAffair.findById(doc._id)) || doc;
    extras = await loadQuestionsForPaper(doc._id);
  }

  return formatCurrentAffairForEdit(paper, extras);
};

const createCurrentAffair = async (payload, file, createdBy) => {
  const data = {
    category: payload.category,
    description: payload.description || undefined,
    status: payload.status !== undefined ? payload.status : true,
    createdBy: createdBy || undefined,
    title: payload.title
  };

  if (payload.category !== CATEGORIES.CURRENT_AFFAIRS) {
    if (payload.year !== undefined) data.year = payload.year;
    if (payload.month !== undefined) data.month = payload.month;
  }

  if (file) {
    const uploaded = await uploadPdfToCloudinary(file);
    data.pdfUrl = uploaded.pdfUrl;
    data.pdfPublicId = uploaded.pdfPublicId;
    data.imageUrl = uploaded.imageUrl;
  } else if (PDF_REQUIRED_CATEGORIES.includes(payload.category)) {
    const error = new Error('PDF file is required for this category');
    error.statusCode = 400;
    throw error;
  }

  const currentAffair = await CurrentAffair.create(data);
  return buildEditResponse(currentAffair);
};

const getAllCurrentAffairs = async (queryParams, pagination, sort) => {
  const query = buildListQuery(queryParams);

  const [items, total] = await Promise.all([
    CurrentAffair.find(query)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .lean(),
    CurrentAffair.countDocuments(query)
  ]);

  const dailyPracticeIds = items
    .filter((item) => item.category === CATEGORIES.DAILY_PRACTICE_QUESTIONS)
    .map((item) => item._id);

  let formattedItems;
  if (dailyPracticeIds.length) {
    const allQuestions = await CurrentAffairQuestion.find({
      currentAffairId: { $in: dailyPracticeIds }
    })
      .sort({ questionNumber: 1 })
      .lean();

    const questionsByPaper = allQuestions.reduce((acc, question) => {
      const key = String(question.currentAffairId);
      if (!acc[key]) acc[key] = [];
      acc[key].push(question);
      return acc;
    }, {});

    formattedItems = items.map((item) => {
      if (item.category !== CATEGORIES.DAILY_PRACTICE_QUESTIONS) {
        return formatCurrentAffairResponse(item);
      }

      const paperQuestions = questionsByPaper[String(item._id)] || [];
      return formatCurrentAffairForEdit(item, {
        questions: paperQuestions,
        questionCount: paperQuestions.length
      });
    });
  } else {
    formattedItems = items.map((item) => formatCurrentAffairResponse(item));
  }

  return buildPaginationResponse(
    formattedItems,
    total,
    pagination.page,
    pagination.limit
  );
};

const getCurrentAffairById = async (id) => {
  const currentAffair = await CurrentAffair.findOne({ _id: id })
    .populate('createdBy', 'name email role')
    .populate('updatedBy', 'name email role');

  if (!currentAffair) {
    const error = new Error('Current affair not found');
    error.statusCode = 404;
    throw error;
  }

  return buildEditResponse(currentAffair);
};

const updateCurrentAffair = async (id, payload, file, updatedBy) => {
  const currentAffair = await CurrentAffair.findOne({ _id: id });

  if (!currentAffair) {
    const error = new Error('Current affair not found');
    error.statusCode = 404;
    throw error;
  }

  const category = currentAffair.category;
  const updates = sanitizeUpdatePayload(payload, category);

  if (updates.category !== undefined && updates.category !== category) {
    const error = new Error('Category cannot be changed on update');
    error.statusCode = 400;
    throw error;
  }
  delete updates.category;

  if (updates.title !== undefined) {
    currentAffair.title = updates.title;
  }

  if (updates.year !== undefined) {
    currentAffair.year = updates.year;
  }

  if (updates.month !== undefined) {
    currentAffair.month = updates.month;
  }

  if (updates.description !== undefined) {
    currentAffair.description = updates.description;
  }

  if (updates.status !== undefined) {
    currentAffair.status = updates.status;
  }

  if (category === CATEGORIES.DAILY_PRACTICE_QUESTIONS) {
    if (updates.paperName !== undefined) {
      currentAffair.paperName = updates.paperName;
      currentAffair.title = updates.paperName;
    }
    if (updates.mainsCategory !== undefined) {
      currentAffair.mainsCategory = updates.mainsCategory;
    }
    if (updates.date !== undefined) {
      currentAffair.date = new Date(updates.date);
    }
    if (updates.sectionFrom !== undefined) {
      currentAffair.sectionFrom = updates.sectionFrom;
    }
    if (updates.sectionTo !== undefined) {
      currentAffair.sectionTo = updates.sectionTo;
    }
  }

  if (category === CATEGORIES.CURRENT_AFFAIRS) {
    currentAffair.year = null;
    currentAffair.month = null;
    currentAffair.description = null;
  }

  if (file) {
    if (currentAffair.pdfPublicId) {
      await deleteCloudinaryPdf(currentAffair.pdfPublicId);
    }
    const uploaded = await uploadPdfToCloudinary(file);
    currentAffair.pdfUrl = uploaded.pdfUrl;
    currentAffair.pdfPublicId = uploaded.pdfPublicId;
    currentAffair.imageUrl = uploaded.imageUrl;
  }

  if (updatedBy) {
    currentAffair.updatedBy = updatedBy;
  }

  await currentAffair.save();

  const refreshed = await CurrentAffair.findById(id)
    .populate('createdBy', 'name email role')
    .populate('updatedBy', 'name email role');

  return buildEditResponse(refreshed);
};

const deleteCurrentAffair = async (id) => {
  const currentAffair = await CurrentAffair.findOne({ _id: id });

  if (!currentAffair) {
    const error = new Error('Current affair not found');
    error.statusCode = 404;
    throw error;
  }

  const deletedSnapshot = await buildEditResponse(currentAffair);

  if (currentAffair.pdfPublicId) {
    await deleteCloudinaryPdf(currentAffair.pdfPublicId);
  }

  const questions = await CurrentAffairQuestion.find({ currentAffairId: id })
    .select('imagePublicId')
    .lean();

  await Promise.all(
    questions.map((q) => deleteCloudinaryImage(q.imagePublicId))
  );
  await CurrentAffairQuestion.deleteMany({ currentAffairId: id });
  await CurrentAffair.deleteOne({ _id: id });

  return deletedSnapshot;
};

const updateStatus = async (id, status, updatedBy) => {
  const update = { status };
  if (updatedBy) update.updatedBy = updatedBy;

  const currentAffair = await CurrentAffair.findOneAndUpdate(
    { _id: id },
    update,
    { new: true }
  )
    .populate('createdBy', 'name email role')
    .populate('updatedBy', 'name email role');

  if (!currentAffair) {
    const error = new Error('Current affair not found');
    error.statusCode = 404;
    throw error;
  }

  return buildEditResponse(currentAffair);
};

module.exports = {
  createCurrentAffair,
  getAllCurrentAffairs,
  getCurrentAffairById,
  updateCurrentAffair,
  deleteCurrentAffair,
  updateStatus,
  buildEditResponse
};
