const mongoose = require('mongoose');

const courseSubjectSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
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
  order: {
    type: Number,
    default: 0
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
  deletedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

const subjectResponseTransform = (_doc, ret) => {
  delete ret.description;
  delete ret.order;
  delete ret.__v;
  return ret;
};

courseSubjectSchema.set('toJSON', { transform: subjectResponseTransform });
courseSubjectSchema.set('toObject', { transform: subjectResponseTransform });

courseSubjectSchema.index({ courseId: 1, order: 1 });

module.exports = mongoose.model('CourseSubject', courseSubjectSchema);
