const mongoose = require('mongoose');

const lectureProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecordedLecture',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  watchedDuration: {
    type: Number,
    default: 0
  },
  totalDuration: {
    type: Number,
    default: 0
  },
  progressPercent: {
    type: Number,
    default: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  lastWatchedAt: Date
}, { timestamps: true });

lectureProgressSchema.index({ userId: 1, lectureId: 1 }, { unique: true });
lectureProgressSchema.index({ userId: 1, courseId: 1 });

module.exports = mongoose.model('LectureProgress', lectureProgressSchema);
