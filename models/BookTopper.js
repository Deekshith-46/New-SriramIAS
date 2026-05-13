const mongoose = require('mongoose');

const BookTopperSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  videoUrl: {
    type: String,
    required: [true, 'Video URL is required']
  },
  videoPublicId: {
    type: String,
    required: [true, 'Video Public ID is required']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for faster queries
BookTopperSchema.index({ isActive: 1 });

module.exports = mongoose.model('BookTopper', BookTopperSchema);
