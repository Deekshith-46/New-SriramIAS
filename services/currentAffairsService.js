const mongoose = require('mongoose');
const TestCategory = require('../models/TestCategory');
const TestContent = require('../models/TestContent');
const TestPaper = require('../models/TestPaper');
const ResourceViewHistory = require('../models/ResourceViewHistory');
const ResourceDownload = require('../models/ResourceDownload');
const cache = require('../utils/resourcePortalCache');

const MONTH_NAMES = [
  '',
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
];

const monthLabel = (month) => {
  if (month === null || month === undefined || month === '') return null;
  const asNum = parseInt(month, 10);
  if (!Number.isNaN(asNum) && asNum >= 1 && asNum <= 12) return MONTH_NAMES[asNum];
  return String(month);
};

const resolveMonthNumber = (input) => {
  if (input === null || input === undefined || input === '') return null;
  const asNum = parseInt(input, 10);
  if (!Number.isNaN(asNum) && asNum >= 1 && asNum <= 12) return asNum;
  const idx = MONTH_NAMES.findIndex(
    (name, i) => i > 0 && name.toLowerCase() === String(input).trim().toLowerCase()
  );
  return idx > 0 ? idx : null;
};

const formatTypeOption = (cat) => ({
  _id: cat._id,
  name: cat.name,
  slug: cat.slug,
  categoryType: cat.type,
  image: cat.image?.url || null
});

const formatContentCard = (doc) => ({
  _id: doc._id,
  itemType: 'content',
  title: doc.title,
  pdfUrl: doc.file?.url || null,
  year: doc.year,
  month: monthLabel(doc.month),
  monthValue: doc.month ?? null,
  type: doc.categoryId?.name || null,
  typeId: doc.categoryId?._id || doc.categoryId,
  description: doc.description || ''
});

const formatPaperCard = (doc) => ({
  _id: doc._id,
  itemType: 'exam',
  title: doc.title,
  pdfUrl: null,
  year: doc.year,
  month: monthLabel(doc.month),
  monthValue: doc.month ?? null,
  type: doc.categoryId?.name || null,
  typeId: doc.categoryId?._id || doc.categoryId,
  duration: doc.duration,
  totalMarks: doc.totalMarks,
  date: doc.date,
  description: doc.description || ''
});

const getCurrentAffairsFilters = async () => {
  const cacheKey = cache.buildKey('portal:ca:filters', {});
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const categories = await TestCategory.find({ status: 'ACTIVE' }).sort({ name: 1 }).lean();

  const [contentYears, paperYears, contentMonths, papers] = await Promise.all([
    TestContent.distinct('year', { isActive: true }),
    TestPaper.distinct('year', { isActive: true }),
    TestContent.distinct('month', { isActive: true, month: { $ne: null } }),
    TestPaper.find({ isActive: true }).select('month').lean()
  ]);

  const yearSet = new Set([...contentYears, ...paperYears]);
  const years = [...yearSet]
    .sort((a, b) => b - a)
    .map((y) => ({ _id: String(y), value: String(y) }));

  const monthSet = new Set();
  contentMonths.forEach((m) => {
    if (m !== null && m !== undefined) monthSet.add(resolveMonthNumber(m));
  });
  papers.forEach((p) => {
    if (p.month !== null && p.month !== undefined && p.month !== '') {
      const resolved = resolveMonthNumber(p.month);
      if (resolved) monthSet.add(resolved);
    }
  });

  const months = [...monthSet]
    .filter(Boolean)
    .sort((a, b) => b - a)
    .map((m) => ({
      _id: String(m),
      value: String(m),
      label: MONTH_NAMES[m]
    }));

  const payload = {
    years,
    months,
    types: categories.map(formatTypeOption)
  };

  cache.set(cacheKey, payload);
  return payload;
};

const buildContentFilter = (query, categoryId) => {
  const filter = { isActive: true };
  if (categoryId) filter.categoryId = categoryId;

  const year = query.yearId || query.year;
  if (year) filter.year = parseInt(year, 10);

  const monthNum = resolveMonthNumber(query.monthId || query.month);
  if (monthNum) filter.month = monthNum;

  return filter;
};

const buildPaperFilter = (query, categoryId) => {
  const filter = { isActive: true };
  if (categoryId) filter.categoryId = categoryId;

  const year = query.yearId || query.year;
  if (year) filter.year = parseInt(year, 10);

  const monthInput = query.monthId || query.month;
  if (monthInput !== undefined && monthInput !== '') {
    const monthNum = resolveMonthNumber(monthInput);
    if (monthNum) {
      filter.$or = [{ month: String(monthNum) }, { month: monthNum }];
    } else {
      filter.month = String(monthInput);
    }
  }

  return filter;
};

const getCurrentAffairsResources = async (query = {}) => {
  const cacheKey = cache.buildKey('portal:ca:resources', query);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const categoryId = query.typeId || query.categoryId;
  let category = null;

  if (categoryId) {
    category = await TestCategory.findOne({ _id: categoryId, status: 'ACTIVE' }).lean();
    if (!category) return [];
  }

  const data = [];

  const loadContent = !category || category.type === 'CONTENT';
  const loadPapers = !category || category.type === 'EXAM';

  if (loadContent) {
    const contents = await TestContent.find(buildContentFilter(query, categoryId))
      .populate('categoryId', 'name slug type')
      .sort({ year: -1, month: -1, createdAt: -1 })
      .lean();
    data.push(...contents.map(formatContentCard));
  }

  if (loadPapers) {
    const papers = await TestPaper.find(buildPaperFilter(query, categoryId))
      .populate('categoryId', 'name slug type')
      .sort({ date: -1 })
      .lean();
    data.push(...papers.map(formatPaperCard));
  }

  if (!categoryId) {
    data.sort((a, b) => (b.year || 0) - (a.year || 0));
  }

  cache.set(cacheKey, data);
  return data;
};

const findItemById = async (id) => {
  const content = await TestContent.findOne({ _id: id, isActive: true })
    .populate('categoryId', 'name slug type')
    .lean();
  if (content) {
    return { itemType: 'content', raw: content, formatted: formatContentCard(content) };
  }

  const paper = await TestPaper.findOne({ _id: id, isActive: true })
    .populate('categoryId', 'name slug type')
    .lean();
  if (paper) {
    return { itemType: 'exam', raw: paper, formatted: formatPaperCard(paper) };
  }

  return null;
};

const getCurrentAffairsById = async (id) => {
  const found = await findItemById(id);
  return found?.formatted || null;
};

const trackCurrentAffairsView = async (id, userId = null) => {
  const found = await findItemById(id);
  if (!found) return null;

  if (found.itemType === 'content') {
    await ResourceViewHistory.create({ userId, resourceId: id });
    return { ...found.formatted, viewUrl: found.formatted.pdfUrl };
  }

  return {
    ...found.formatted,
    viewUrl: null,
    message: 'Exam papers open via test attempt flow, not PDF view'
  };
};

const recordCurrentAffairsDownload = async (id, userId = null) => {
  const found = await findItemById(id);
  if (!found || found.itemType !== 'content') return null;

  await ResourceDownload.create({ userId, resourceId: id });

  return {
    _id: found.raw._id,
    title: found.raw.title,
    downloadUrl: found.raw.file?.url || null
  };
};

module.exports = {
  getCurrentAffairsFilters,
  getCurrentAffairsResources,
  getCurrentAffairsById,
  trackCurrentAffairsView,
  recordCurrentAffairsDownload
};
