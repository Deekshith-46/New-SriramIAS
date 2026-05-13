const mongoose = require('mongoose');

const testQuestionSchema = new mongoose.Schema({
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestPaper',
    required: true
  },
  questionNumber: {
    type: Number,
    required: true
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length === 4;
      },
      message: 'Must have exactly 4 options'
    }
  },
  correctAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  explanation: {
    type: String,
    trim: true
  },
  marks: {
    type: Number,
    default: 1,
    min: 0
  }
}, { timestamps: true });

// Compound index to ensure unique question numbers per paper
testQuestionSchema.index({ paperId: 1, questionNumber: 1 }, { unique: true });
testQuestionSchema.index({ paperId: 1 });

module.exports = mongoose.model('TestQuestion', testQuestionSchema);
