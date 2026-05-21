const mongoose = require('mongoose');

const courseProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  completedLectures: {
    type: Number,
    default: 0
  },
  totalLectures: {
    type: Number,
    default: 0
  },
  progressPercent: {
    type: Number,
    default: 0
  },
  completedSubjects: {
    type: Number,
    default: 0
  },
  totalSubjects: {
    type: Number,
    default: 0
  },
  lastOpenedLectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecordedLecture',
    default: null
  },
  lastWatchedAt: Date
}, { timestamps: true });

courseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('CourseProgress', courseProgressSchema);
