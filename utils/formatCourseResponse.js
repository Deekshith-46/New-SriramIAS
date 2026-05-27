/**
 * Whitelist course fields for API responses.
 * Strips legacy MongoDB keys (fees, bannerImage, etc.) and subdocument _id values.
 */

const stripSubdocumentIds = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const { _id, ...rest } = item;
    return rest;
  });
};

const formatCourseResponse = (course) => {
  if (!course) return null;

  const doc =
    typeof course.toObject === 'function'
      ? course.toObject({ virtuals: true, flattenMaps: true })
      : { ...course };

  const formatted = {
    _id: doc._id,
    courseId: doc.courseId,
    courseName: doc.courseName,
    title: doc.title,
    slug: doc.slug,
    center: doc.center ?? null,
    program: doc.program ?? null,
    academicCategory: doc.academicCategory ?? null,
    academicSubCategory: doc.academicSubCategory ?? null,
    courseOverview: doc.courseOverview || '',
    keyFeatures: stripSubdocumentIds(doc.keyFeatures),
    whyChooseSection: {
      title: doc.whyChooseSection?.title || '',
      subtitle: doc.whyChooseSection?.subtitle || '',
      featureCards: stripSubdocumentIds(doc.whyChooseSection?.featureCards)
    },
    helpSections: stripSubdocumentIds(doc.helpSections),
    status: doc.status,
    isActive: doc.isActive,
    isFeatured: doc.isFeatured,
    isDeleted: doc.isDeleted,
    deletedAt: doc.deletedAt ?? null,
    createdBy: doc.createdBy ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };

  if (doc.category) {
    formatted.category = doc.category;
  }

  if (doc.extraFields && Object.keys(doc.extraFields).length > 0) {
    formatted.extraFields = doc.extraFields;
  }

  return formatted;
};

const formatCoursesList = (courses) => {
  if (!Array.isArray(courses)) return [];
  return courses.map((c) => formatCourseResponse(c));
};

module.exports = {
  formatCourseResponse,
  formatCoursesList
};
