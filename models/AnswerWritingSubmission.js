const mongoose = require('mongoose');

const answerWritingSubmissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnswerWritingQuestion',
      required: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    answerType: {
      type: String,
      enum: ['text', 'file'],
      required: true
    },
    answerText: {
      type: String,
      default: ''
    },
    answerFile: {
      url: String,
      public_id: String
    },
    submissionStatus: {
      type: String,
      enum: ['submitted', 'evaluated'],
      default: 'submitted'
    },
    evaluatorFeedback: {
      type: String,
      default: ''
    },
    evaluatedAnswerType: {
      type: String,
      enum: ['text', 'file'],
      default: null
    },
    evaluatedAnswerText: {
      type: String,
      default: ''
    },
    evaluatedAnswerFile: {
      url: String,
      public_id: String
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    evaluatedAt: Date,
    marks: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

answerWritingSubmissionSchema.index({ studentId: 1, questionId: 1 }, { unique: true });
answerWritingSubmissionSchema.index({ submissionStatus: 1, createdAt: -1 });
answerWritingSubmissionSchema.index({ courseId: 1, submissionStatus: 1 });

module.exports = mongoose.model('AnswerWritingSubmission', answerWritingSubmissionSchema);
