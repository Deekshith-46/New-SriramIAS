const Subject = require('../models/Subject');
const { isValidObjectId } = require('./contentIdGenerator');

const NOT_DELETED = { isDeleted: false };

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const parseSort = (query, allowedFields, defaultField = 'createdAt') => {
  const sort = {};
  const field = allowedFields.includes(query.sortBy) ? query.sortBy : defaultField;
  sort[field] = query.sortOrder === 'asc' ? 1 : -1;
  return sort;
};

const findActiveSubject = async (subjectId) => {
  if (!isValidObjectId(subjectId)) return null;
  return Subject.findOne({
    _id: subjectId,
    status: 'ACTIVE',
    ...NOT_DELETED
  }).lean();
};

const validateActiveSubjectIds = async (subjectIds) => {
  if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
    return { ok: false, message: 'At least one subject is required' };
  }

  const unique = [...new Set(subjectIds.map(String))];
  for (const id of unique) {
    if (!isValidObjectId(id)) {
      return { ok: false, message: 'Invalid subject id in subjects array' };
    }
  }

  const subjects = await Subject.find({
    _id: { $in: unique },
    status: 'ACTIVE',
    ...NOT_DELETED
  })
    .select('_id subjectName subjectId')
    .lean();

  if (subjects.length !== unique.length) {
    return { ok: false, message: 'One or more subjects are invalid or inactive' };
  }

  return { ok: true, subjects };
};

module.exports = {
  NOT_DELETED,
  escapeRegex,
  parsePagination,
  parseSort,
  findActiveSubject,
  validateActiveSubjectIds
};
