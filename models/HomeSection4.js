const mongoose = require('mongoose');

const section4Schema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  images: [
    {
      type: String
    }
  ],
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for efficient queries
section4Schema.index({ order: 1 });
section4Schema.index({ isActive: 1 });

module.exports = mongoose.model('HomeSection4', section4Schema);
