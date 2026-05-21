const mongoose = require('mongoose');

const lectureQuizAttemptSchema = new mongoose.Schema({
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
  answers: [{
    questionIndex: Number,
    selectedOption: Number,
    isCorrect: Boolean
  }],
  score: Number,
  totalQuestions: Number
}, { timestamps: true });

lectureQuizAttemptSchema.index({ userId: 1, lectureId: 1, createdAt: -1 });

module.exports = mongoose.model('LectureQuizAttempt', lectureQuizAttemptSchema);
