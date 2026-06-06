const mongoose = require('mongoose');
const {
  PUBLISH_STATUSES,
  LIVE_CLASS_TIMEZONES,
  CLASS_STATUSES,
  REPEAT_TYPES,
  WEEKDAYS,
  MONTHLY_PATTERNS
} = require('../utils/facultyContentConstants');

const recurrenceSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    repeatType: {
      type: String,
      enum: [...REPEAT_TYPES, null],
      default: null
    },
    repeatEvery: { type: Number, default: 1, min: 1 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    weekdays: [{ type: String, enum: WEEKDAYS }],
    monthlyPattern: {
      type: String,
      enum: [...MONTHLY_PATTERNS, null],
      default: null
    },
    excludedDates: [{ type: Date }],
    paused: { type: Boolean, default: false },
    pausedUntil: { type: Date, default: null },
    notes: { type: String, default: '', trim: true }
  },
  { _id: false }
);

const subjectLiveClassSchema = new mongoose.Schema(
  {
    liveClassId: {
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
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: true,
      index: true
    },
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      required: true,
      index: true
    },
    classTitle: {
      type: String,
      required: true,
      trim: true
    },
    scheduledDate: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true,
      trim: true
    },
    durationHours: { type: Number, default: 0, min: 0 },
    durationMinutes: { type: Number, default: 0, min: 0, max: 59 },
    durationSeconds: { type: Number, default: 0, min: 0, max: 59 },
    timezone: {
      type: String,
      enum: LIVE_CLASS_TIMEZONES,
      required: true,
      default: 'Asia/Kolkata',
      trim: true
    },
    attendanceEnabled: {
      type: Boolean,
      default: true
    },
    publishStatus: {
      type: String,
      enum: PUBLISH_STATUSES,
      default: 'DRAFT',
      index: true
    },
    classStatus: {
      type: String,
      enum: CLASS_STATUSES,
      default: 'UPCOMING',
      index: true
    },
    recurrence: {
      type: recurrenceSchema,
      default: () => ({ enabled: false })
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

subjectLiveClassSchema.index({ facultySubjectId: 1, folderId: 1, publishStatus: 1, isDeleted: 1 });
subjectLiveClassSchema.index({ classTitle: 1 });

module.exports = mongoose.model('SubjectLiveClass', subjectLiveClassSchema);
