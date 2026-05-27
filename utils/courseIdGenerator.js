const mongoose = require('mongoose');
const Course = require('../models/Course');

const parseNumericSuffix = (value, prefix) => {
  if (!value || typeof value !== 'string') return 0;
  const match = value.match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
  return match ? parseInt(match[1], 10) : 0;
};

const generateCourseId = async () => {
  const latest = await Course.findOne({
    courseId: /^CRS\d+$/i
  })
    .sort({ courseId: -1 })
    .select('courseId')
    .lean();

  const next = parseNumericSuffix(latest?.courseId, 'CRS') + 1;
  return `CRS${String(next).padStart(3, '0')}`;
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

module.exports = { generateCourseId, isValidObjectId };
