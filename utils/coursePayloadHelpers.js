const safeParseJson = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const resolveCourseName = (body) => {
  const name = body.courseName || body.title;
  return name?.trim() || '';
};

const resolveCenterId = (body) => body.centerId || body.center || null;

const resolveProgramId = (body) => body.programId || body.program || null;

const resolveCategoryId = (body) => body.categoryId || body.academicCategory || null;

const resolveSubCategoryId = (body) => body.subCategoryId || body.academicSubCategory || null;

const resolveCourseStatus = (body) => {
  if (body.status === 'INACTIVE') return 'INACTIVE';
  if (body.status === 'ACTIVE') return 'ACTIVE';
  if (body.isActive === false || body.isActive === 'false') return 'INACTIVE';
  return 'ACTIVE';
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const courseListPopulate = [
  { path: 'center', select: 'centerName name city' },
  { path: 'program', select: 'programId programName' },
  { path: 'academicCategory', select: 'categoryId categoryName' },
  { path: 'academicSubCategory', select: 'subCategoryId subCategoryName' },
  { path: 'category', select: 'name' }
];

module.exports = {
  safeParseJson,
  resolveCourseName,
  resolveCenterId,
  resolveProgramId,
  resolveCategoryId,
  resolveSubCategoryId,
  resolveCourseStatus,
  escapeRegex,
  courseListPopulate
};
