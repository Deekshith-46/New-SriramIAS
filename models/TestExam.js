const mongoose = require('mongoose');

const testExamQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true
    },
    options: {
      type: [String],
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 2,
        message: 'At least two options are required'
      }
    },
    correctAnswer: {
      type: Number,
      required: true,
      min: 0
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
    }
  },
  { _id: true }
);

const testExamSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseSubject',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    examDate: {
      type: Date,
      required: true
    },
    examEndDate: {
      type: Date,
      default: null
    },
    durationInMinutes: {
      type: Number,
      default: 60,
      min: 1
    },
    totalMarks: {
      type: Number,
      default: 0,
      min: 0
    },
    passMarks: {
      type: Number,
      default: 40,
      min: 0
    },
    negativeMarks: {
      type: Number,
      default: 0.25,
      min: 0
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: 1
    },
    questions: [testExamQuestionSchema],
    isPublished: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

testExamSchema.index({ course: 1, examDate: 1, isDeleted: 1 });
testExamSchema.index({ course: 1, isPublished: 1, isActive: 1, isDeleted: 1 });

module.exports = mongoose.model('TestExam', testExamSchema);
