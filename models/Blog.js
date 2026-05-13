const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  languageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Language',
    required: true
  },
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  thumbnail: {
    url: String,
    public_id: String
  },
  images: [{
    url: String,
    public_id: String
  }],
  date: {
    type: Date
  },
  year: {
    type: Number
  },
  month: {
    type: Number,
    min: 1,
    max: 12
  },
  isActive: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Indexes for faster queries
blogSchema.index({ languageId: 1, paperId: 1 });
blogSchema.index({ year: 1, month: 1 });
blogSchema.index({ year: 1, month: 1, date: 1 });
blogSchema.index({ isActive: 1 });
blogSchema.index({ slug: 1 });

module.exports = mongoose.model('Blog', blogSchema);
