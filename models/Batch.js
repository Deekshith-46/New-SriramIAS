const mongoose = require('mongoose');
const { BATCH_STATUSES, FEE_CURRENCIES } = require('../utils/batchFacultyConstants');

const batchSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      unique: true,
      trim: true
    },
    batchName: {
      type: String,
      required: true,
      trim: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true
    },
    commencementDate: {
      type: Date,
      default: null
    },
    durationInMonths: {
      type: Number,
      default: null,
      min: 0
    },
    batchStartDate: {
      type: Date,
      default: null
    },
    batchEndDate: {
      type: Date,
      default: null
    },
    bannerImage: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' }
    },
    fees: {
      currency: {
        type: String,
        enum: FEE_CURRENCIES,
        default: 'INR'
      },
      onlineAmount: { type: Number, default: 0, min: 0 },
      offlineAmount: { type: Number, default: 0, min: 0 },
      discountAmount: { type: Number, default: 0, min: 0 },
      onlineBulletPoints: [{ type: String, trim: true }],
      offlineBulletPoints: [{ type: String, trim: true }]
    },
    facultySubjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FacultySubject'
      }
    ],
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminAccess',
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: BATCH_STATUSES,
      default: 'UPCOMING'
    },
    totalStudents: {
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
    }
  },
  { timestamps: true }
);

batchSchema.index({ batchName: 1 });
batchSchema.index({ course: 1, status: 1, isDeleted: 1 });
batchSchema.index({ batchId: 1 });
batchSchema.index({ mentor: 1 });

module.exports = mongoose.model('Batch', batchSchema);
