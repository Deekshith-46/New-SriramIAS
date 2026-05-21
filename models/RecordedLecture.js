const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    validate: {
      validator: (v) => Array.isArray(v) && v.length === 4 && v.every((o) => String(o).trim()),
      message: 'Each quiz question must have exactly 4 non-empty options'
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
    default: ''
  }
}, { _id: false });

const cheatSheetSchema = new mongoose.Schema({
  title: String,
  paragraph: String,
  pdf: {
    url: String,
    public_id: String
  }
}, { _id: false });

const mainsQuestionSchema = new mongoose.Schema({
  question: String
}, { _id: false });

const recordedLectureSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseSubject',
    required: true,
    index: true
  },
  lectureTitle: {
    type: String,
    required: true,
    trim: true
  },
  lectureDescription: {
    type: String,
    default: ''
  },
  thumbnail: {
    url: String,
    public_id: String
  },
  video: {
    url: String,
    public_id: String,
    duration: Number
  },
  order: {
    type: Number,
    default: 0
  },
  cheatSheet: cheatSheetSchema,
  topicQuiz: [quizQuestionSchema],
  mainsQuestion: mainsQuestionSchema,
  isPreviewFree: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  publishedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

recordedLectureSchema.index({ courseId: 1, subjectId: 1, order: 1 });

module.exports = mongoose.model('RecordedLecture', recordedLectureSchema);
