const mongoose = require('mongoose');

const batchTransferSchema = new mongoose.Schema(
  {
    transferId: {
      type: String,
      unique: true,
      trim: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicStudent',
      required: true,
      index: true
    },
    fromBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true
    },
    toBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true
    },
    fromEnrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BatchEnrollment',
      required: true
    },
    toEnrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BatchEnrollment',
      required: true
    },
    effectiveTransferDate: {
      type: Date,
      default: Date.now
    },
    transferReason: {
      type: String,
      default: ''
    },
    transferAttendanceRecords: {
      type: Boolean,
      default: false
    },
    transferFeeRecords: {
      type: Boolean,
      default: false
    },
    transferTestRecords: {
      type: Boolean,
      default: false
    },
    transferredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

batchTransferSchema.index({ student: 1, fromBatch: 1, toBatch: 1 });

module.exports = mongoose.model('BatchTransfer', batchTransferSchema);
