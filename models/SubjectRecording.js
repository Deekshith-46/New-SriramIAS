const mongoose = require('mongoose');
const { RECORDING_VISIBILITY_STATUSES } = require('../utils/facultyContentConstants');

const subjectRecordingSchema = new mongoose.Schema(
  {
    recordingId: {
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
    lessonName: {
      type: String,
      required: true,
      trim: true
    },
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: true,
      index: true
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
      index: true
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
      index: true
    },
    tags: {
      type: [String],
      default: []
    },
    visibility: {
      type: String,
      enum: RECORDING_VISIBILITY_STATUSES,
      default: 'DRAFT',
      index: true
    },
    recording: {
      url: { type: String, required: true },
      publicId: { type: String, default: '' },
      durationSeconds: { type: Number, default: 0 },
      format: { type: String, default: '' },
      bytes: { type: Number, default: 0 }
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

subjectRecordingSchema.index({ facultySubjectId: 1, folderId: 1, visibility: 1, isDeleted: 1 });
subjectRecordingSchema.index({ lessonName: 1 });

module.exports = mongoose.model('SubjectRecording', subjectRecordingSchema);
