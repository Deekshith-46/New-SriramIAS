const mongoose = require('mongoose');

const mainsAnswerWritingPdfDownloadSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
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
    downloadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

mainsAnswerWritingPdfDownloadSchema.index(
  { mainsAnswerWritingId: 1, studentId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'MainsAnswerWritingPdfDownload',
  mainsAnswerWritingPdfDownloadSchema
);
