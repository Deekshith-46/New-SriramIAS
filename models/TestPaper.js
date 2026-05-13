const mongoose = require('mongoose');

const testPaperSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestCategory',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  mainsCategory: {
    type: String,
    enum: ['Mains', 'Prelims', 'Both'],
    default: 'Both'
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },
  totalMarks: {
    type: Number,
    default: 0
  },
  negativeMarks: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for efficient queries
testPaperSchema.index({ categoryId: 1 });
testPaperSchema.index({ date: 1 });
testPaperSchema.index({ isActive: 1 });

module.exports = mongoose.model('TestPaper', testPaperSchema);
