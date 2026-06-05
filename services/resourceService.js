const mongoose = require('mongoose');
const ResourceCategory = require('../models/ResourceCategory');
const SubCategory = require('../models/SubCategory');
const Filter = require('../models/Filter');
const Resource = require('../models/Resource');
const MockTest = require('../models/MockTest');
const ResourceDownload = require('../models/ResourceDownload');
const ResourceViewHistory = require('../models/ResourceViewHistory');
const {
  MODULE_TYPES,
  FILTER_TYPES,
  CATEGORY_NAME_HINTS,
  FREE_RESOURCE_FILTER_KEYS
} = require('../utils/resourceConstants');
const {
  formatPortalResourceCard,
  formatPortalMockTestCard,
  formatPortalCurrentAffairsCard,
  formatPortalResourceDetail,
  formatMockTestQuestion,
  compact
} = require('../utils/resourceResponseFormatter');
const cache = require('../utils/resourcePortalCache');

const RESOURCE_POPULATE = [
  { path: 'categoryId', select: 'name moduleType' },
  { path: 'subCategoryId', select: 'name' },
  { path: 'paperId', select: 'value type' },
  { path: 'yearId', select: 'value type' },
  { path: 'monthId', select: 'value type' },
  { path: 'currentAffairsTypeId', select: 'value type' }
];

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

const activeCategoryFilter = () => ({ isActive: true });

/** Legacy CMS categories omit moduleType; treat as Free Resources unless tagged Current Affairs */
const freeResourcesCategoryQuery = () => ({
  ...activeCategoryFilter(),
  moduleType: { $ne: MODULE_TYPES.CURRENT_AFFAIRS }
});

const isFreeResourcesCategory = (category) =>
  Boolean(category?.isActive && category.moduleType !== MODULE_TYPES.CURRENT_AFFAIRS);

const findFreeResourcesCategory = (typeId) =>
  ResourceCategory.findOne({ _id: typeId, ...freeResourcesCategoryQuery() }).lean();

/** NCERT Books category — used for top-level subject/class filters on the portal tab */
const findNcertCategory = async (prefetchedTypes = []) => {
  const fromList = prefetchedTypes.find((c) => getCategoryKind(c) === 'NCERT');
  if (fromList) return fromList;

  return ResourceCategory.findOne({
    ...freeResourcesCategoryQuery(),
    name: { $regex: /ncert/i }
  })
    .select('_id name thumbnail moduleType')
    .lean();
};

const formatFilterOption = (f) => ({
  _id: f._id,
  value: f.value,
  type: f.type
});

const dedupeFilters = (filters) => {
  const seen = new Set();
  return filters.filter((f) => {
    const key = `${f.type}:${f.value}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const escapeRegex = (value) => String(value).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const textEqualsFilter = (value) => ({
  $regex: new RegExp(`^${escapeRegex(value)}$`, 'i')
});

const getCategoryIdsByModule = async (moduleType) => {
  const cats = await ResourceCategory.find({ moduleType, ...activeCategoryFilter() })
    .select('_id')
    .lean();
  return cats.map((c) => c._id);
};

const resolveFilterRef = async ({ filterType, idParam, valueParam, categoryIds }) => {
  const raw = idParam ?? valueParam;
  if (raw === undefined || raw === null || raw === '') return null;

  const query = {
    type: filterType,
    categoryId: { $in: categoryIds },
    isActive: true
  };

  if (mongoose.Types.ObjectId.isValid(String(raw))) {
    const byId = await Filter.findOne({ ...query, _id: raw }).select('_id').lean();
    if (byId) return byId._id;
  }

  const byValue = await Filter.findOne({
    ...query,
    value: { $regex: new RegExp(`^${String(raw).trim()}$`, 'i') }
  })
    .select('_id')
    .lean();

  return byValue?._id || null;
};

const groupFiltersByType = (filters) =>
  filters.reduce((acc, f) => {
    if (!acc[f.type]) acc[f.type] = [];
    acc[f.type].push(formatFilterOption(f));
    return acc;
  }, {});

const formatCurrentAffairsCard = formatPortalCurrentAffairsCard;
const formatFreeResourceCard = formatPortalResourceCard;
const formatMockTestCard = formatPortalMockTestCard;

const formatResourceDetail = (doc, formatter) => formatPortalResourceDetail(doc, formatter);

// ——— Current Affairs (portal tab) ———

const getCurrentAffairsFilters = async () => {
  const cacheKey = cache.buildKey('portal:ca:filters', {});
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const categoryIds = await getCategoryIdsByModule(MODULE_TYPES.CURRENT_AFFAIRS);
  const filters = dedupeFilters(
    await Filter.find({ categoryId: { $in: categoryIds }, isActive: true })
      .sort({ type: 1, value: 1 })
      .lean()
  );
  const grouped = groupFiltersByType(filters);

  const payload = {
    years: grouped[FILTER_TYPES.YEAR] || [],
    months: grouped[FILTER_TYPES.MONTH] || [],
    types: grouped[FILTER_TYPES.CURRENT_AFFAIRS_TYPE] || []
  };

  cache.set(cacheKey, payload);
  return payload;
};

const buildCurrentAffairsResourceFilter = async (query = {}) => {
  const categoryIds = await getCategoryIdsByModule(MODULE_TYPES.CURRENT_AFFAIRS);
  const filter = { isActive: true, categoryId: { $in: categoryIds } };

  const yearId = await resolveFilterRef({
    filterType: FILTER_TYPES.YEAR,
    idParam: query.yearId,
    valueParam: query.year,
    categoryIds
  });
  const monthId = await resolveFilterRef({
    filterType: FILTER_TYPES.MONTH,
    idParam: query.monthId,
    valueParam: query.month,
    categoryIds
  });
  const typeId = await resolveFilterRef({
    filterType: FILTER_TYPES.CURRENT_AFFAIRS_TYPE,
    idParam: query.typeId,
    valueParam: query.type,
    categoryIds
  });

  if (yearId) filter.yearId = yearId;
  if (monthId) filter.monthId = monthId;
  if (typeId) filter.currentAffairsTypeId = typeId;

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } }
    ];
  }

  return filter;
};

const getCurrentAffairsResources = async (query = {}) => {
  const cacheKey = cache.buildKey('portal:ca:resources', query);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const filter = await buildCurrentAffairsResourceFilter(query);
  const resources = await Resource.find(filter)
    .populate(RESOURCE_POPULATE)
    .sort({ createdAt: -1 })
    .lean();

  const data = resources.map(formatCurrentAffairsCard);
  cache.set(cacheKey, data);
  return data;
};

// ——— Free Resources (portal tab) ———

const getFreeResourcesFilters = async (query = {}) => {
  const cacheKey = cache.buildKey('portal:fr:filters:v3', query);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const types = await ResourceCategory.find(freeResourcesCategoryQuery())
    .select('name thumbnail moduleType')
    .sort({ name: 1 })
    .lean();

  const ncertCategory = await findNcertCategory(types);

  const payload = {
    ncertTypeId: ncertCategory?._id || null,
    types: types.map((c) => ({
      _id: c._id,
      name: c.name,
      thumbnail: c.thumbnail?.url || null,
      kind: getCategoryKind(c)
    }))
  };

  cache.set(cacheKey, payload);
  return payload;
};

const getFreeResourcesDynamicFilters = async (typeId) => {
  if (!typeId) return { error: 'typeId is required (categoryId)' };

  const cacheKey = cache.buildKey('portal:fr:dynamic-filters', { typeId });
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const category = await findFreeResourcesCategory(typeId);
  if (!category) return null;

  const kind = getCategoryKind(category);
  const filterKeys = FREE_RESOURCE_FILTER_KEYS[kind] || FREE_RESOURCE_FILTER_KEYS.GENERIC;

  const filters = await Filter.find({ categoryId: category._id, isActive: true })
    .sort({ type: 1, value: 1 })
    .lean();
  const grouped = groupFiltersByType(filters);

  const subCategories = filterKeys.includes('SUB_CATEGORY')
    ? await SubCategory.find({ categoryId: category._id, isActive: true })
        .select('name')
        .sort({ name: 1 })
        .lean()
    : [];

  const payload = {
    typeId: category._id,
    typeName: category.name,
    kind,
    filters: filterKeys,
    subCategories: subCategories.map((s) => ({ _id: s._id, name: s.name })),
    papers: grouped[FILTER_TYPES.PAPER] || [],
    years: grouped[FILTER_TYPES.YEAR] || []
  };

  cache.set(cacheKey, payload);
  return payload;
};

const buildFreeResourcesResourceFilter = async (query = {}) => {
  const typeId = query.typeId;
  if (!typeId) return { error: 'typeId is required (this is the categoryId)' };

  const category = await findFreeResourcesCategory(typeId);
  if (!category) return null;

  const filter = { isActive: true, categoryId: category._id };
  const kind = getCategoryKind(category);

  if (query.subject) filter.subject = textEqualsFilter(query.subject);
  if (query.class) filter.class = textEqualsFilter(query.class);
  if (query.subCategoryId) filter.subCategoryId = query.subCategoryId;
  if (query.paperId) filter.paperId = query.paperId;
  if (query.yearId) filter.yearId = query.yearId;

  if (kind === 'PYQ' && !query.subCategoryId && !query.paperId && !query.yearId) {
    // allow list without sub-filters
  }

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } }
    ];
  }

  return { filter, category, kind };
};

const getFreeResourcesResources = async (query = {}) => {
  const built = await buildFreeResourcesResourceFilter(query);
  if (!built) return { error: 'Invalid typeId (category not found)' };
  if (built.error) return built;

  const cacheKey = cache.buildKey('portal:fr:resources', query);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let data;

  if (built.kind === 'MOCK_TEST') {
    const mockFilter = { isActive: true, categoryId: built.category._id };
    if (query.subCategoryId) mockFilter.subCategoryId = query.subCategoryId;
    if (query.paperId) mockFilter.paperId = query.paperId;
    if (query.yearId) mockFilter.yearId = query.yearId;
    if (query.search) {
      mockFilter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } }
      ];
    }

    const mockTests = await MockTest.find(mockFilter)
      .populate('categoryId', 'name moduleType')
      .populate('subCategoryId', 'name')
      .populate('subjectId', 'value type')
      .populate('paperId', 'value type')
      .populate('yearId', 'value type')
      .select('title description duration totalMarks passingMarks questionIds categoryId subCategoryId subjectId paperId yearId createdAt')
      .sort({ createdAt: -1 })
      .lean();

    data = mockTests.map(formatMockTestCard);
  } else {
    const resources = await Resource.find(built.filter)
      .populate(RESOURCE_POPULATE)
      .sort({ createdAt: -1 })
      .lean();

    data = resources.map(formatFreeResourceCard);
  }

  cache.set(cacheKey, data);
  return data;
};

// ——— Shared detail / view / download ———

const getResourceByModule = async (id, moduleType, formatter) => {
  const resource = await Resource.findOne({ _id: id, isActive: true })
    .populate(RESOURCE_POPULATE)
    .lean();

  if (!resource?.categoryId) return null;

  if (moduleType === MODULE_TYPES.CURRENT_AFFAIRS) {
    if (resource.categoryId.moduleType !== MODULE_TYPES.CURRENT_AFFAIRS) return null;
  } else if (!isFreeResourcesCategory(resource.categoryId)) {
    return null;
  }

  return formatResourceDetail(resource, formatter);
};

const getMockTestDetail = async (id) => {
  const mockTest = await MockTest.findOne({ _id: id, isActive: true })
    .populate('categoryId', 'name moduleType isActive')
    .populate('subCategoryId', 'name')
    .populate('subjectId', 'value type')
    .populate('paperId', 'value type')
    .populate('yearId', 'value type')
    .populate('questionIds')
    .lean();

  if (!mockTest?.categoryId || !isFreeResourcesCategory(mockTest.categoryId)) return null;

  return compact({
    ...formatPortalMockTestCard(mockTest),
    description: mockTest.description || undefined,
    categoryId: mockTest.categoryId._id,
    questions: (mockTest.questionIds || []).map((q) => formatMockTestQuestion(q, false))
  });
};

const getCurrentAffairsById = (id) =>
  getResourceByModule(id, MODULE_TYPES.CURRENT_AFFAIRS, formatCurrentAffairsCard);

const getFreeResourceById = async (id) => {
  const file = await getResourceByModule(id, MODULE_TYPES.FREE_RESOURCES, formatFreeResourceCard);
  if (file) return file;
  return getMockTestDetail(id);
};

const trackResourceView = async (id, moduleType, userId = null) => {
  let detail;
  if (moduleType === MODULE_TYPES.CURRENT_AFFAIRS) {
    detail = await getResourceByModule(id, moduleType, formatCurrentAffairsCard);
  } else {
    detail = await getFreeResourceById(id);
  }
  if (!detail) return null;
  if (detail.itemType !== 'mock_test') {
    await ResourceViewHistory.create({ userId, resourceId: id });
  }
  return {
    ...detail,
    viewUrl: detail.itemType === 'mock_test' ? null : detail.pdfUrl
  };
};

const recordResourceDownload = async (id, moduleType, userId = null) => {
  const resource = await Resource.findOne({ _id: id, isActive: true })
    .populate('categoryId', 'moduleType')
    .lean();

  if (!resource?.categoryId) return null;
  if (moduleType === MODULE_TYPES.CURRENT_AFFAIRS) {
    if (resource.categoryId.moduleType !== MODULE_TYPES.CURRENT_AFFAIRS) return null;
  } else if (!isFreeResourcesCategory(resource.categoryId)) {
    return null;
  }

  const updated = await Resource.findOneAndUpdate(
    { _id: id },
    { $inc: { downloads: 1 } },
    { new: true }
  )
    .select('title fileUrl downloads')
    .lean();

  await ResourceDownload.create({ userId, resourceId: id });
  cache.invalidatePrefix('portal:ca:');
  cache.invalidatePrefix('portal:fr:');

  return {
    _id: updated._id,
    title: updated.title,
    downloadUrl: updated.fileUrl?.url || null,
    downloads: updated.downloads
  };
};

// ——— CMS helpers (unchanged) ———

const buildPortalResourceQuery = async (query = {}) => {
  const {
    moduleType,
    categoryId,
    subCategoryId,
    subject,
    class: className,
    paperId,
    yearId,
    monthId,
    typeId,
    search,
    resourceType
  } = query;

  const filter = { isActive: true };

  if (categoryId) {
    filter.categoryId = categoryId;
  } else if (moduleType) {
    const cats = await ResourceCategory.find({ moduleType, ...activeCategoryFilter() }).select('_id');
    filter.categoryId = { $in: cats.map((c) => c._id) };
  }

  if (subCategoryId) filter.subCategoryId = subCategoryId;
  if (subject) filter.subject = textEqualsFilter(subject);
  if (className) filter.class = textEqualsFilter(className);
  if (paperId) filter.paperId = paperId;
  if (yearId) filter.yearId = yearId;
  if (monthId) filter.monthId = monthId;
  if (typeId) filter.currentAffairsTypeId = typeId;
  if (resourceType) filter.resourceType = resourceType;

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  return filter;
};

module.exports = {
  getCategoryKind,
  getCurrentAffairsFilters,
  getCurrentAffairsResources,
  getCurrentAffairsById,
  getFreeResourcesFilters,
  getFreeResourcesDynamicFilters,
  getFreeResourcesResources,
  getFreeResourceById,
  trackResourceView,
  recordResourceDownload,
  buildPortalResourceQuery,
  MODULE_TYPES
};
