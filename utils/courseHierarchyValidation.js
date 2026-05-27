const Program = require('../models/Program');
const AcademicCategory = require('../models/AcademicCategory');
const AcademicSubCategory = require('../models/AcademicSubCategory');
const { findActiveCenter } = require('./academicHierarchyHelpers');
const { isValidObjectId } = require('./courseIdGenerator');

/**
 * Validates Center → Program → Category → SubCategory chain for course create/update.
 */
const validateCourseHierarchy = async ({
  centerId,
  programId,
  categoryId,
  subCategoryId
}) => {
  const invalidHierarchy = (reason) => ({
    ok: false,
    status: 400,
    message: 'Invalid hierarchy selection',
    reason
  });

  if (!isValidObjectId(centerId)) {
    return invalidHierarchy('Invalid centerId');
  }
  if (!isValidObjectId(programId)) {
    return invalidHierarchy('Invalid programId');
  }
  if (!isValidObjectId(categoryId)) {
    return invalidHierarchy('Invalid categoryId');
  }
  if (!isValidObjectId(subCategoryId)) {
    return invalidHierarchy('Invalid subCategoryId');
  }

  const center = await findActiveCenter(centerId);
  if (!center) {
    return invalidHierarchy('Center not found or inactive');
  }

  const program = await Program.findOne({ _id: programId, status: 'ACTIVE' }).lean();
  if (!program) {
    return invalidHierarchy('Program not found or inactive');
  }

  const programHasCenter = (program.centers || []).some((c) => String(c) === String(centerId));
  if (!programHasCenter) {
    return invalidHierarchy('Program is not linked to the selected center');
  }

  const category = await AcademicCategory.findOne({
    _id: categoryId,
    centerId,
    programId,
    status: 'ACTIVE'
  }).lean();

  if (!category) {
    return invalidHierarchy('Category does not match center and program');
  }

  const subCategory = await AcademicSubCategory.findOne({
    _id: subCategoryId,
    centerId,
    programId,
    categoryId,
    status: 'ACTIVE'
  }).lean();

  if (!subCategory) {
    return invalidHierarchy('SubCategory does not match center, program, and category');
  }

  return { ok: true, center, program, category, subCategory };
};

module.exports = { validateCourseHierarchy };
