const mongoose = require('mongoose');

const parseNumericSuffix = (value, prefix) => {
  if (!value || typeof value !== 'string') return 0;
  const match = value.match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
  return match ? parseInt(match[1], 10) : 0;
};

const generateSequentialId = async (Model, field, prefix, pad = 3) => {
  const latest = await Model.findOne({
    [field]: new RegExp(`^${prefix}\\d+$`, 'i')
  })
    .sort({ [field]: -1 })
    .select(field)
    .lean();

  const next = parseNumericSuffix(latest?.[field], prefix) + 1;
  return `${prefix}${String(next).padStart(pad, '0')}`;
};

const generateProgramId = () => generateSequentialId(require('../models/Program'), 'programId', 'PRG');
const generateAcademicCategoryId = () =>
  generateSequentialId(require('../models/AcademicCategory'), 'categoryId', 'CAT');
const generateAcademicSubCategoryId = () =>
  generateSequentialId(require('../models/AcademicSubCategory'), 'subCategoryId', 'SUB');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

module.exports = {
  generateProgramId,
  generateAcademicCategoryId,
  generateAcademicSubCategoryId,
  isValidObjectId
};
