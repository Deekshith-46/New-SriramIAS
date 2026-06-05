const mongoose = require('mongoose');
const {
  QUESTION_TYPES,
  QUESTION_CATEGORY,
  QUESTION_STATUS,
  QUESTION_DIFFICULTY,
  MCQ_CORRECT_ANSWER,
  ASSERTION_REASON_ANSWER
} = require('../utils/questionBankEnums');

const matchPairSchema = new mongoose.Schema(
  {
    left: { type: String, required: true, trim: true },
    right: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const matchDataSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true, trim: true },
    pairs: { type: [matchPairSchema], default: [] }
  },
  { _id: false }
);

const questionBankSchema = new mongoose.Schema(
  {
    questionCode: {
      type: String,
      unique: true,
      trim: true,
      index: true
    },
    category: {
      type: String,
      enum: QUESTION_CATEGORY,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: QUESTION_TYPES,
      required: true,
      index: true
    },
    subject: { type: String, required: true, trim: true, index: true },
    topic: { type: String, required: true, trim: true, index: true },
    difficulty: {
      type: String,
      enum: QUESTION_DIFFICULTY,
      required: true,
      index: true
    },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: QUESTION_STATUS,
      default: 'ACTIVE',
      index: true
    },
    questionText: { type: String, required: true, trim: true },
    explanation: { type: String, trim: true },
    imageUrl: { type: String },
    imagePublicId: { type: String },
    usageCount: { type: Number, default: 0, min: 0 },
    optionA: { type: String, trim: true },
    optionB: { type: String, trim: true },
    optionC: { type: String, trim: true },
    optionD: { type: String, trim: true },
    correctAnswer: { type: String, trim: true },
    numericalAnswer: { type: String, trim: true },
    matchData: { type: matchDataSchema },
    assertion: { type: String, trim: true },
    reason: { type: String, trim: true },
    assertionAnswer: {
      type: String,
      enum: ASSERTION_REASON_ANSWER
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

questionBankSchema.index({ type: 1, category: 1, status: 1 });
questionBankSchema.index({ tags: 1 });
questionBankSchema.index(
  { questionText: 'text', subject: 'text', topic: 'text', questionCode: 'text' },
  { name: 'question_bank_text_search' }
);

module.exports = mongoose.model('QuestionBank', questionBankSchema, 'question_bank');
