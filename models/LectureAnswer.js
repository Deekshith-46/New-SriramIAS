const mongoose = require('mongoose');

const lectureAnswerSchema = new mongoose.Schema({
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
  answerText: {
    type: String,
    default: ''
  }
}, { timestamps: true });

lectureAnswerSchema.index({ userId: 1, lectureId: 1 }, { unique: true });

module.exports = mongoose.model('LectureAnswer', lectureAnswerSchema);
