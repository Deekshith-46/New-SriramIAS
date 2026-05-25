const Role = require('../models/Role');

const formatRoleForAdmin = (doc) => {
  const r = doc?.toObject ? doc.toObject() : { ...doc };
  return {
    _id: r._id,
    roleTitle: r.roleTitle,
    roleCode: r.roleCode,
    status: r.status || 'ACTIVE',
    createdBy: r.createdBy || null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
};

const buildRoleListQuery = ({ search = '', status } = {}) => {
  const query = {};

  if (status && status !== 'ALL') {
    query.status = status;
  }

  const term = String(search).trim();
  if (term) {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ roleTitle: regex }, { roleCode: regex }];
  }

  return query;
};

const findRoleById = (id) => Role.findById(id);

module.exports = {
  formatRoleForAdmin,
  buildRoleListQuery,
  findRoleById
};
