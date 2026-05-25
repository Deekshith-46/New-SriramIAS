const mongoose = require('mongoose');

const testResultAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    selectedOption: {
      type: Number,
      default: null
    },
    isCorrect: {
      type: Boolean,
      default: false
    },
    obtainedMarks: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const testResultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true
    },
    testExam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestExam',
      required: true,
      index: true
    },
    answers: [testResultAnswerSchema],
    totalQuestions: {
      type: Number,
      default: 0
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    wrongAnswers: {
      type: Number,
      default: 0
    },
    skippedAnswers: {
      type: Number,
      default: 0
    },
    score: {
      type: Number,
      default: 0
    },
    totalMarks: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    resultStatus: {
      type: String,
      enum: ['PASS', 'FAIL'],
      required: true
    },
    attemptNumber: {
      type: Number,
      default: 1,
      min: 1
    },
    timeTakenInSeconds: {
      type: Number,
      default: 0
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

testResultSchema.index({ student: 1, testExam: 1, createdAt: -1 });
testResultSchema.index({ student: 1, course: 1, createdAt: -1 });

module.exports = mongoose.model('TestResult', testResultSchema);
