const mongoose = require('mongoose');
const Center = require('../models/Center');
const Program = require('../models/Program');
const AcademicCategory = require('../models/AcademicCategory');
const AcademicSubCategory = require('../models/AcademicSubCategory');
const { isValidObjectId } = require('./academicIdGenerator');

const ACTIVE_CENTER_FILTER = { isDeleted: false, status: 'ACTIVE' };

const toObjectId = (id) => {
  if (!isValidObjectId(id)) return null;
  return new mongoose.Types.ObjectId(id);
};

const findActiveCenter = async (centerId) => {
  const oid = toObjectId(centerId);
  if (!oid) return null;
  return Center.findOne({ _id: oid, ...ACTIVE_CENTER_FILTER }).lean();
};

const findActiveProgram = async (programId) => {
  const oid = toObjectId(programId);
  if (!oid) return null;
  return Program.findOne({ _id: oid, status: 'ACTIVE' }).lean();
};

const programIncludesCenter = (program, centerId) => {
  if (!program?.centers?.length) return false;
  const target = String(centerId);
  return program.centers.some((c) => String(c) === target);
};

const validateProgramCenterLink = async (programId, centerId) => {
  const [center, program] = await Promise.all([
    findActiveCenter(centerId),
    findActiveProgram(programId)
  ]);

  if (!center) {
    return { ok: false, status: 400, message: 'Invalid or inactive center' };
  }
  if (!program) {
    return { ok: false, status: 400, message: 'Invalid or inactive program' };
  }
  if (!programIncludesCenter(program, centerId)) {
    return {
      ok: false,
      status: 400,
      message: 'Selected program is not available for the selected center'
    };
  }

  return { ok: true, center, program };
};

const validateCategoryForHierarchy = async ({ centerId, programId, categoryId }) => {
  const linkCheck = await validateProgramCenterLink(programId, centerId);
  if (!linkCheck.ok) return linkCheck;

  const category = await AcademicCategory.findOne({
    _id: categoryId,
    centerId,
    programId,
    status: 'ACTIVE'
  }).lean();

  if (!category) {
    return {
      ok: false,
      status: 400,
      message: 'Invalid category selection for the selected center and program'
    };
  }

  return { ok: true, ...linkCheck, category };
};

const getCreatedByFromRequest = (req) => req.adminAccess?._id || req.user?._id || null;

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = {
  ACTIVE_CENTER_FILTER,
  toObjectId,
  findActiveCenter,
  findActiveProgram,
  programIncludesCenter,
  validateProgramCenterLink,
  validateCategoryForHierarchy,
  getCreatedByFromRequest,
  escapeRegex,
  AcademicCategory,
  AcademicSubCategory,
  Program,
  Center
};
