const mongoose = require('mongoose');
const { PDF_VISIBILITY_STATUSES } = require('../utils/facultyContentConstants');

const pdfFileSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    format: { type: String, default: 'pdf' },
    bytes: { type: Number, default: 0 }
  },
  { _id: false }
);

const subjectPdfSchema = new mongoose.Schema(
  {
    subjectPdfId: {
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
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubjectContentFolder',
      required: true,
      index: true
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
      index: true
    },
    pdfTitle: {
      type: String,
      required: true,
      trim: true
    },
    tags: {
      type: [String],
      default: []
    },
    visibility: {
      type: String,
      enum: PDF_VISIBILITY_STATUSES,
      default: 'DRAFT',
      index: true
    },
    pdf: {
      type: pdfFileSchema,
      required: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0
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

subjectPdfSchema.index({ facultySubjectId: 1, folderId: 1, visibility: 1, isDeleted: 1 });
subjectPdfSchema.index({ pdfTitle: 1 });

module.exports = mongoose.model('SubjectPdf', subjectPdfSchema);
