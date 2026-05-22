const mongoose = require('mongoose');

const answerWritingQuestionSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseSubject',
      required: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnswerWritingCategory',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    question: {
      type: String,
      required: true
    },
    questionPaperPdf: {
      url: String,
      public_id: String
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

answerWritingQuestionSchema.index({ courseId: 1, subjectId: 1, categoryId: 1 });
answerWritingQuestionSchema.index({ courseId: 1, isPublished: 1 });

module.exports = mongoose.model('AnswerWritingQuestion', answerWritingQuestionSchema);
