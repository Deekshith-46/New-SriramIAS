const mongoose = require('mongoose');

const homeVideoSchema = new mongoose.Schema({
  videoUrl: {
    type: String,
    required: true,
    trim: true
  },
  videoThumbnail: {
    type: String, // URL only (NO file upload)
    required: true,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('HomeVideo', homeVideoSchema);
