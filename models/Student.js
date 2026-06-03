const mongoose = require('mongoose');
const { ACADEMIC_STUDENT_STATUSES } = require('../utils/enrollmentErpConstants');

/**
 * Unified student master record.
 * - Portal students: linked via userId (User collection)
 * - ERP / batch-only students: userId optional until signup links the account
 */
const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      unique: true,
      trim: true,
      sparse: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      sparse: true,
      unique: true
    },
    studentName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      sparse: true
    },
    mobileNumber: {
      type: String,
      trim: true,
      default: '',
      sparse: true
    },
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      default: null,
      index: true
    },
    parentName: {
      type: String,
      trim: true
    },
    parentMobile: {
      type: String,
      trim: true,
      sparse: true
    },
    parentEmail: {
      type: String,
      sparse: true,
      lowercase: true,
      trim: true
    },
    parentMobileVerified: {
      type: Boolean,
      default: false
    },
    parentEmailVerified: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ACADEMIC_STUDENT_STATUSES,
      default: 'ACTIVE'
    }
  },
  { timestamps: true }
);

studentSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string', $ne: '' } }
  }
);
studentSchema.index(
  { mobileNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { mobileNumber: { $type: 'string', $ne: '' } }
  }
);
studentSchema.index({ status: 1 });
studentSchema.index({ studentName: 1 });

module.exports = mongoose.model('Student', studentSchema);
