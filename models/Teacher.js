const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    teacherId: {
      type: String,
      unique: true,
      trim: true
    },
    teacherName: {
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
    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
      }
    ],
    description: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
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

teacherSchema.index({ teacherName: 1 });
teacherSchema.index({ centerId: 1, status: 1, isDeleted: 1 });
teacherSchema.index({ subjects: 1, status: 1, isDeleted: 1 });
teacherSchema.index({ status: 1, isDeleted: 1 });

module.exports = mongoose.model('Teacher', teacherSchema);
