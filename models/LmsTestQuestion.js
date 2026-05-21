const mongoose = require('mongoose');

const lmsTestQuestionSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsTest',
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
        validator: (arr) => Array.isArray(arr) && arr.length === 4,
        message: 'Exactly 4 options are required'
      }
    },
    correctAnswer: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
      validate: {
        validator: function (v) {
          return Array.isArray(this.options) && v >= 0 && v < this.options.length;
        },
        message: 'correctAnswer must be a valid option index (0–3)'
      }
    },
    explanation: {
      type: String,
      default: ''
    },
    marks: {
      type: Number,
      default: 1,
      min: 0
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: 0
    },
    questionImage: {
      url: String,
      public_id: String
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

lmsTestQuestionSchema.index({ testId: 1, createdAt: 1 });
lmsTestQuestionSchema.index({ testId: 1, isDeleted: 1 });

module.exports = mongoose.model('LmsTestQuestion', lmsTestQuestionSchema);
