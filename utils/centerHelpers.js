const Center = require('../models/Center');

const ACTIVE_CENTER_FILTER = { isDeleted: false };

const formatCenterForAdmin = (doc) => {
  const c = doc?.toObject ? doc.toObject() : { ...doc };
  const admins = Array.isArray(c.assignedAdmins) ? c.assignedAdmins.filter(Boolean) : [];

  return {
    _id: c._id,
    centerName: c.centerName || c.name,
    centerCode: c.centerCode,
    address: c.address || '',
    city: c.city || '',
    state: c.state || '',
    contactNumber: c.contactNumber || '',
    email: c.email || '',
    status: c.status || 'ACTIVE',
    assignedAdmins: admins,
    assignedAdminsDisplay: admins.join(', '),
    createdBy: c.createdBy || null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  };
};

/** Optional field — omit, null, "", or [] all mean no assigned admins */
const normalizeAssignedAdmins = (value) => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) {
    const list = value.map((v) => String(v).trim()).filter(Boolean);
    return list.length ? list : undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const list = trimmed
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    return list.length ? list : undefined;
  }
  return undefined;
};

const buildCenterListQuery = ({ search = '', status } = {}) => {
  const query = { ...ACTIVE_CENTER_FILTER };

  if (status && status !== 'ALL') {
    query.status = status;
  }

  const term = String(search).trim();
  if (term) {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { centerName: regex },
      { name: regex },
      { centerCode: regex },
      { city: regex }
    ];
  }

  return query;
};

const findActiveCenterById = (id) =>
  Center.findOne({ _id: id, ...ACTIVE_CENTER_FILTER });

const findCentersByNameHint = async (hint) => {
  if (!hint) return [];
  const regex = new RegExp(String(hint).trim(), 'i');
  return Center.find({
    ...ACTIVE_CENTER_FILTER,
    $or: [{ centerName: regex }, { name: regex }, { city: regex }, { centerCode: regex }]
  }).select('_id centerName name city centerCode');
};

module.exports = {
  ACTIVE_CENTER_FILTER,
  formatCenterForAdmin,
  normalizeAssignedAdmins,
  buildCenterListQuery,
  findActiveCenterById,
  findCentersByNameHint
};
