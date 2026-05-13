const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MockTest',
    required: true
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    selectedAnswer: String,
    isCorrect: Boolean,
    marksObtained: {
      type: Number,
      default: 0
    }
  }],
  score: {
    type: Number,
    required: true
  },
  totalMarks: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  wrongAnswers: {
    type: Number,
    default: 0
  },
  skippedQuestions: {
    type: Number,
    default: 0
  },
  percentage: Number,
  passed: Boolean,
  timeTaken: Number, // in seconds
  startedAt: Date,
  completedAt: Date
}, { timestamps: true });

// Calculate percentage before saving - using async/await pattern
resultSchema.pre('save', async function() {
  if (this.score !== undefined && this.totalMarks && this.totalMarks > 0) {
    this.percentage = parseFloat(((this.score / this.totalMarks) * 100).toFixed(2));
  }
});

module.exports = mongoose.model('Result', resultSchema);
