const mongoose = require('mongoose');
const {
  FACULTY_CATEGORIES,
  normalizeFacultyCategories
} = require('../utils/batchFacultyConstants');

const facultySubjectSchema = new mongoose.Schema(
  {
    facultySubjectId: {
      type: String,
      unique: true,
      trim: true
    },
    subjectName: {
      type: String,
      required: true,
      trim: true
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    topics: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic'
      }
    ],
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true
    },
    categories: [
      {
        type: String,
        enum: FACULTY_CATEGORIES
      }
    ],
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

facultySubjectSchema.index({ subject: 1, teacher: 1, status: 1, isDeleted: 1 });
facultySubjectSchema.index({ subjectName: 1 });

facultySubjectSchema.pre('save', function normalizeLegacyCategories() {
  if (Array.isArray(this.categories) && this.categories.length) {
    this.categories = normalizeFacultyCategories(this.categories);
  }
});

module.exports = mongoose.model('FacultySubject', facultySubjectSchema);
