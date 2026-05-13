const mongoose = require('mongoose');

const homeTopperSchema = new mongoose.Schema({
  image: {
    type: String,  // Cloudinary URL
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  rank: {
    type: String,
    required: true,
    trim: true  // e.g., "AIR 08"
  },
  description: {
    type: String,
    trim: true  // e.g., "GS Foundation Course 2025"
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for efficient queries
homeTopperSchema.index({ isActive: 1 });

module.exports = mongoose.model('HomeTopper', homeTopperSchema);
