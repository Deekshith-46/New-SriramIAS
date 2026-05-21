const mongoose = require('mongoose');

const questionSnapshotSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsTestQuestion',
      required: true
    },
    question: String,
    options: [String],
    correctAnswer: Number,
    explanation: String,
    marks: Number,
    negativeMarks: Number,
    questionImage: {
      url: String,
      public_id: String
    }
  },
  { _id: false }
);

const lmsTestAttemptSchema = new mongoose.Schema(
  {
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
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsTest',
      required: true
    },
    questionSnapshot: [questionSnapshotSchema],
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'LmsTestQuestion'
        },
        selectedOption: Number,
        isCorrect: Boolean,
        obtainedMarks: Number
      }
    ],
    totalQuestions: Number,
    correctAnswers: Number,
    wrongAnswers: Number,
    unanswered: Number,
    obtainedMarks: Number,
    totalMarks: Number,
    percentage: Number,
    isPassed: Boolean,
    startedAt: Date,
    submittedAt: Date,
    timeTakenInSeconds: Number,
    status: {
      type: String,
      enum: ['in_progress', 'submitted'],
      default: 'in_progress'
    }
  },
  { timestamps: true }
);

lmsTestAttemptSchema.index({ userId: 1, testId: 1 });
lmsTestAttemptSchema.index({ userId: 1, submittedAt: -1 });
lmsTestAttemptSchema.index({ testId: 1, status: 1 });

module.exports = mongoose.model('LmsTestAttempt', lmsTestAttemptSchema);
