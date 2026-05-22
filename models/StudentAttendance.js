const mongoose = require('mongoose');

const studentAttendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: true
    },
    attendanceDate: {
      type: Date,
      required: true
    },
    checkInTime: Date,
    checkOutTime: Date,
    attendanceStatus: {
      type: String,
      enum: ['present', 'absent', 'leave', 'half_day'],
      default: 'present'
    },
    leaveReason: {
      type: String,
      default: ''
    },
    totalDurationInMinutes: {
      type: Number,
      default: 0
    },
    isCheckInDone: {
      type: Boolean,
      default: false
    },
    isCheckOutDone: {
      type: Boolean,
      default: false
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

studentAttendanceSchema.index({ studentId: 1, attendanceDate: 1 }, { unique: true });
studentAttendanceSchema.index({ centerId: 1, attendanceDate: 1 });
studentAttendanceSchema.index({ courseId: 1, attendanceDate: 1 });

module.exports = mongoose.model('StudentAttendance', studentAttendanceSchema);
