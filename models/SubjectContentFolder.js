const mongoose = require('mongoose');
const {
  FACULTY_CATEGORIES,
  FOLDER_STATUSES
} = require('../utils/facultyContentConstants');

const subjectContentFolderSchema = new mongoose.Schema(
  {
    folderId: {
      type: String,
      unique: true,
      trim: true
    },
    facultySubjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FacultySubject',
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: FACULTY_CATEGORIES,
      required: true,
      index: true
    },
    folderName: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: FOLDER_STATUSES,
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
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

subjectContentFolderSchema.index(
  { facultySubjectId: 1, category: 1, folderName: 1, isDeleted: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

module.exports = mongoose.model('SubjectContentFolder', subjectContentFolderSchema);
