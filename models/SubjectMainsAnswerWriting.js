const mongoose = require('mongoose');
const {
  PUBLISH_STATUSES,
  MAINS_DURATION_PRESET_OPTIONS
} = require('../utils/facultyContentConstants');

const pdfSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    format: { type: String, default: 'pdf' },
    bytes: { type: Number, default: 0 }
  },
  { _id: false }
);

const subjectMainsAnswerWritingSchema = new mongoose.Schema(
  {
    mainsAnswerWritingId: {
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
    testName: {
      type: String,
      required: true,
      trim: true
    },
    scheduleDate: {
      type: Date,
      required: true
    },
    durationPreset: {
      type: String,
      enum: MAINS_DURATION_PRESET_OPTIONS,
      required: true
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 1
    },
    resultDate: {
      type: Date,
      required: true
    },
    questionsText: {
      type: String,
      required: true,
      trim: true
    },
    pdf: {
      type: pdfSchema,
      required: true
    },
    publishStatus: {
      type: String,
      enum: PUBLISH_STATUSES,
      default: 'DRAFT',
      index: true
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

subjectMainsAnswerWritingSchema.index({
  facultySubjectId: 1,
  folderId: 1,
  publishStatus: 1,
  isDeleted: 1
});
subjectMainsAnswerWritingSchema.index({ testName: 1 });

module.exports = mongoose.model('SubjectMainsAnswerWriting', subjectMainsAnswerWritingSchema);
