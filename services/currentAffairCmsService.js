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
const { buildPaginationResponse } = require('../middleware/resourceMiddleware');

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
      { description: regex }
    ];
  }

  return query;
};

const createCurrentAffair = async (payload, file, createdBy) => {
  const data = {
    category: payload.category,
    year: payload.year,
    month: payload.month,
    description: payload.description || undefined,
    status: payload.status !== undefined ? payload.status : true,
    createdBy: createdBy || undefined
  };

  if (payload.category === CATEGORIES.MONTHLY_MAGAZINE) {
    data.magazineName = payload.magazineName;
    data.title = payload.magazineName;
  } else {
    data.title = payload.title;
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
  return formatCurrentAffairResponse(currentAffair);
};

const getAllCurrentAffairs = async (queryParams, pagination, sort) => {
  const query = buildListQuery(queryParams);

  const [items, total] = await Promise.all([
    CurrentAffair.find(query)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('createdBy', 'name email role')
      .lean(),
    CurrentAffair.countDocuments(query)
  ]);

  const formattedItems = items.map((item) => formatCurrentAffairResponse(item));

  return buildPaginationResponse(
    formattedItems,
    total,
    pagination.page,
    pagination.limit
  );
};

const getCurrentAffairById = async (id) => {
  const currentAffair = await CurrentAffair.findById(id).populate(
    'createdBy',
    'name email role'
  );

  if (!currentAffair) {
    const error = new Error('Current affair not found');
    error.statusCode = 404;
    throw error;
  }

  return formatCurrentAffairResponse(currentAffair);
};

const updateCurrentAffair = async (id, payload, file) => {
  const currentAffair = await CurrentAffair.findById(id);

  if (!currentAffair) {
    const error = new Error('Current affair not found');
    error.statusCode = 404;
    throw error;
  }

  const nextCategory = payload.category || currentAffair.category;

  if (payload.category !== undefined) {
    currentAffair.category = payload.category;
  }

  if (payload.year !== undefined) {
    currentAffair.year = payload.year;
  }

  if (payload.month !== undefined) {
    currentAffair.month = payload.month;
  }

  if (payload.description !== undefined) {
    currentAffair.description = payload.description;
  }

  if (payload.status !== undefined) {
    currentAffair.status = payload.status;
  }

  if (nextCategory === CATEGORIES.MONTHLY_MAGAZINE) {
    if (payload.magazineName !== undefined) {
      currentAffair.magazineName = payload.magazineName;
      currentAffair.title = payload.magazineName;
    }
  } else if (payload.title !== undefined) {
    currentAffair.title = payload.title;
  }

  if (file) {
    await deleteCloudinaryPdf(currentAffair.pdfPublicId);
    const uploaded = await uploadPdfToCloudinary(file);
    currentAffair.pdfUrl = uploaded.pdfUrl;
    currentAffair.pdfPublicId = uploaded.pdfPublicId;
    currentAffair.imageUrl = uploaded.imageUrl;
  } else if (
    PDF_REQUIRED_CATEGORIES.includes(nextCategory) &&
    !currentAffair.pdfUrl
  ) {
    const error = new Error('PDF file is required for this category');
    error.statusCode = 400;
    throw error;
  }

  await currentAffair.save();
  return formatCurrentAffairResponse(currentAffair);
};

const deleteCurrentAffair = async (id) => {
  const currentAffair = await CurrentAffair.findById(id);

  if (!currentAffair) {
    const error = new Error('Current affair not found');
    error.statusCode = 404;
    throw error;
  }

  const formatted = formatCurrentAffairResponse(currentAffair);

  if (currentAffair.pdfPublicId) {
    await deleteCloudinaryPdf(currentAffair.pdfPublicId);
  }

  await CurrentAffairQuestion.deleteMany({ currentAffairId: id });
  await CurrentAffair.deleteOne({ _id: id });

  return formatted;
};

const updateStatus = async (id, status) => {
  const currentAffair = await CurrentAffair.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  ).populate('createdBy', 'name email role');

  if (!currentAffair) {
    const error = new Error('Current affair not found');
    error.statusCode = 404;
    throw error;
  }

  return formatCurrentAffairResponse(currentAffair);
};

module.exports = {
  createCurrentAffair,
  getAllCurrentAffairs,
  getCurrentAffairById,
  updateCurrentAffair,
  deleteCurrentAffair,
  updateStatus
};
