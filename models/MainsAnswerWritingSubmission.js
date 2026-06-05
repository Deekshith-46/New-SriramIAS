const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' }
  },
  { _id: false }
);

const mainsAnswerWritingSubmissionSchema = new mongoose.Schema(
  {
    mainsAnswerWritingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubjectMainsAnswerWriting',
      required: true,
      index: true
    },
    facultySubjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FacultySubject',
      required: true,
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
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
      type: fileSchema,
      default: undefined
    },

    submissionStatus: {
      type: String,
      enum: ['submitted', 'evaluated'],
      default: 'submitted',
      index: true
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
      type: fileSchema,
      default: undefined
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminAccess',
      default: null,
      index: true
    },
    evaluatedAt: {
      type: Date,
      default: null
    },
    marks: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

mainsAnswerWritingSubmissionSchema.index(
  { mainsAnswerWritingId: 1, studentId: 1 },
  { unique: true }
);
mainsAnswerWritingSubmissionSchema.index({ facultySubjectId: 1, submissionStatus: 1, createdAt: -1 });

module.exports = mongoose.model('MainsAnswerWritingSubmission', mainsAnswerWritingSubmissionSchema);

