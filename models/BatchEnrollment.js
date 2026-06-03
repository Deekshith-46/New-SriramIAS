const mongoose = require('mongoose');
const {
  PAYMENT_STATUSES,
  ENROLLMENT_STATUSES
} = require('../utils/enrollmentErpConstants');

const batchEnrollmentSchema = new mongoose.Schema(
  {
    enrollmentId: {
      type: String,
      unique: true,
      trim: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
      index: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'PENDING'
    },
    attendancePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    courseProgressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ENROLLMENT_STATUSES,
      default: 'ACTIVE'
    },
    transferredFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null
    },
    transferredTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null
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

batchEnrollmentSchema.index({ batch: 1, status: 1, isDeleted: 1 });
batchEnrollmentSchema.index({ student: 1, status: 1, isDeleted: 1 });
batchEnrollmentSchema.index({ paymentStatus: 1, status: 1 });

module.exports = mongoose.model('BatchEnrollment', batchEnrollmentSchema);
