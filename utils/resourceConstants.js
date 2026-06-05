const MODULE_TYPES = {
  CURRENT_AFFAIRS: 'CURRENT_AFFAIRS',
  FREE_RESOURCES: 'FREE_RESOURCES'
};

const RESOURCE_TYPES = ['PDF', 'ARTICLE', 'MAGAZINE', 'INFOGRAPHIC', 'VIDEO'];

const FILTER_TYPES = {
  SUBJECT: 'SUBJECT',
  CLASS: 'CLASS',
  PAPER: 'PAPER',
  YEAR: 'YEAR',
  MONTH: 'MONTH',
  CURRENT_AFFAIRS_TYPE: 'CURRENT_AFFAIRS_TYPE'
};

const CATEGORY_NAME_HINTS = {
  NCERT: 'ncert',
  PYQ: ['previous year', 'pyq', 'question paper', 'question papers'],
  STUDY_MATERIAL: ['study material', 'study materials'],
  MOCK_TEST: ['mock test', 'mock tests', 'free mock']
};

const FREE_RESOURCE_FILTER_KEYS = {
  NCERT: [],
  PYQ: ['SUB_CATEGORY', 'PAPER', 'YEAR'],
  STUDY_MATERIAL: ['SUB_CATEGORY'],
  MOCK_TEST: ['SUB_CATEGORY'],
  GENERIC: []
};

const RESOURCE_STATUSES = ['ACTIVE', 'INACTIVE', 'DRAFT'];

const normalizeResourceStatus = (value, defaultStatus = 'ACTIVE') => {
  if (value === undefined || value === null || value === '') return defaultStatus;

  const key = String(value).trim().toUpperCase().replace(/[\s-]+/g, '_');
  const aliases = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    IN_ACTIVE: 'INACTIVE',
    DRAFT: 'DRAFT'
  };

  return aliases[key] || null;
};

module.exports = {
  MODULE_TYPES,
  RESOURCE_TYPES,
  RESOURCE_STATUSES,
  normalizeResourceStatus,
  FILTER_TYPES,
  CATEGORY_NAME_HINTS,
  FREE_RESOURCE_FILTER_KEYS
};
