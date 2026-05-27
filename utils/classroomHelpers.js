const City = require('../models/City');
const { isValidObjectId } = require('./contentIdGenerator');
const { findActiveCenter } = require('./academicHierarchyHelpers');
const { NOT_DELETED } = require('./contentMastersHelpers');

const resolveCenterId = (body) => body.center ?? body.centerId ?? null;
const resolveCityId = (body) => body.city ?? body.cityId ?? null;

const validateCityBelongsToCenter = async (centerId, cityId) => {
  if (!isValidObjectId(centerId) || !isValidObjectId(cityId)) {
    return { ok: false, message: 'Invalid center or city id' };
  }

  const center = await findActiveCenter(centerId);
  if (!center) {
    return { ok: false, message: 'Invalid or inactive center' };
  }

  const city = await City.findOne({
    _id: cityId,
    centerId: center._id,
    status: 'ACTIVE',
    ...NOT_DELETED
  }).lean();

  if (!city) {
    return {
      ok: false,
      message: 'City does not belong to the selected center or is inactive'
    };
  }

  return { ok: true, center, city };
};

const validateCapacity = (capacity) => {
  if (capacity === undefined || capacity === null || capacity === '') {
    return { ok: true, value: 0 };
  }
  const n = Number(capacity);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, message: 'Invalid capacity. Must be zero or a positive number.' };
  }
  return { ok: true, value: Math.floor(n) };
};

module.exports = {
  resolveCenterId,
  resolveCityId,
  validateCityBelongsToCenter,
  validateCapacity
};
