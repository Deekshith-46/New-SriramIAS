const mongoose = require('mongoose');

const blogContentSchema = new mongoose.Schema({
  blogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  }
}, { timestamps: true });

// Index for faster queries
blogContentSchema.index({ blogId: 1, order: 1 });

module.exports = mongoose.model('BlogContent', blogContentSchema);
