const mongoose = require('mongoose');
const { CORRECT_ANSWER_OPTIONS } = require('../utils/dailyPracticeConstants');

const currentAffairQuestionSchema = new mongoose.Schema(
  {
    currentAffairId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CurrentAffair',
      required: true,
      index: true
    },
    questionNumber: {
      type: Number,
      required: true,
      min: 1
    },
    question: {
      type: String,
      required: true,
      trim: true
    },
    optionA: { type: String, required: true, trim: true },
    optionB: { type: String, required: true, trim: true },
    optionC: { type: String, required: true, trim: true },
    optionD: { type: String, required: true, trim: true },
    correctAnswer: {
      type: String,
      enum: CORRECT_ANSWER_OPTIONS,
      required: true
    },
    explanation: {
      type: String,
      trim: true
    },
    imageUrl: { type: String },
    imagePublicId: { type: String }
  },
  { timestamps: true }
);

currentAffairQuestionSchema.index(
  { currentAffairId: 1, questionNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'CurrentAffairQuestion',
  currentAffairQuestionSchema,
  'current_affair_questions'
);
