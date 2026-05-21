const mongoose = require('mongoose');

const lmsTestSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsTestCategory',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    durationInMinutes: {
      type: Number,
      required: true,
      min: 1
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    totalMarks: {
      type: Number,
      default: 0
    },
    passMarks: {
      type: Number,
      default: 0
    },
    negativeMarkPerWrongAnswer: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: 1
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    shuffleOptions: {
      type: Boolean,
      default: false
    },
    instructions: {
      type: String,
      default: ''
    },
    startDateTime: Date,
    endDateTime: Date,
    isPublished: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

lmsTestSchema.index({ courseId: 1, categoryId: 1, isDeleted: 1 });
lmsTestSchema.index({ courseId: 1, isPublished: 1, isDeleted: 1 });

module.exports = mongoose.model('LmsTest', lmsTestSchema);
