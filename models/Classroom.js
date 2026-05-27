const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema(
  {
    classroomId: {
      type: String,
      unique: true,
      trim: true
    },
    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: true,
      index: true
    },
    city: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'City',
      required: true,
      index: true
    },
    classroomName: {
      type: String,
      required: true,
      trim: true
    },
    classroomCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    capacity: {
      type: Number,
      default: 0,
      min: 0
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

classroomSchema.index({ center: 1, city: 1, status: 1, isDeleted: 1 });
classroomSchema.index({ classroomName: 1 });

module.exports = mongoose.model('Classroom', classroomSchema);
