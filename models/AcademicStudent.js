const mongoose = require('mongoose');
const { ACADEMIC_STUDENT_STATUSES } = require('../utils/enrollmentErpConstants');

const academicStudentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      unique: true,
      trim: true
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
      default: ''
    },
    mobileNumber: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ACADEMIC_STUDENT_STATUSES,
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

academicStudentSchema.index({ email: 1 });
academicStudentSchema.index({ mobileNumber: 1 });
academicStudentSchema.index({ studentName: 1 });
academicStudentSchema.index({ status: 1, isDeleted: 1 });

module.exports = mongoose.model('AcademicStudent', academicStudentSchema);
