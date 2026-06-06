const {
  NOT_DELETED,
  escapeRegex,
  parsePagination,
  parseSort
} = require('./contentMastersHelpers');

const INSTRUCTION_MAX_LENGTH = 2000;

const SORT_PRESETS = {
  createdOn_newest: { sortBy: 'createdAt', sortOrder: 'desc' },
  createdOn_oldest: { sortBy: 'createdAt', sortOrder: 'asc' },
  modifiedOn_newest: { sortBy: 'updatedAt', sortOrder: 'desc' },
  modifiedOn_oldest: { sortBy: 'updatedAt', sortOrder: 'asc' },
  sectionName_az: { sortBy: 'sectionName', sortOrder: 'asc' },
  sectionName_za: { sortBy: 'sectionName', sortOrder: 'desc' },
  languageName_az: { sortBy: 'languageName', sortOrder: 'asc' },
  languageName_za: { sortBy: 'languageName', sortOrder: 'desc' }
};

const formatDateOnly = (value) => {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
};

const normalizeStatus = (status, fallback = 'ACTIVE') => {
  if (status === undefined || status === null || status === '') return fallback;
  const normalized = String(status).trim().toUpperCase();
  if (normalized === 'INACTIVE') return 'INACTIVE';
  if (normalized === 'ACTIVE') return 'ACTIVE';
  return null;
};

const parseTestConfigSort = (query, allowedFields, defaultField = 'createdAt') => {
  if (query.sortPreset && SORT_PRESETS[query.sortPreset]) {
    return parseSort(SORT_PRESETS[query.sortPreset], allowedFields, defaultField);
  }
  return parseSort(query, allowedFields, defaultField);
};

const buildStatusFilter = (status) => {
  const query = { ...NOT_DELETED };
  const normalized = normalizeStatus(status, null);
  if (normalized) query.status = normalized;
  return query;
};

const applySearchFilter = (query, search, fields) => {
  const trimmed = String(search || '').trim();
  if (!trimmed) return query;

  const regex = new RegExp(escapeRegex(trimmed), 'i');
  query.$or = fields.map((field) => ({ [field]: regex }));
  return query;
};

module.exports = {
  INSTRUCTION_MAX_LENGTH,
  SORT_PRESETS,
  NOT_DELETED,
  parsePagination,
  formatDateOnly,
  normalizeStatus,
  parseTestConfigSort,
  buildStatusFilter,
  applySearchFilter
};
