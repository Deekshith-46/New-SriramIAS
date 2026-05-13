const mongoose = require('mongoose');

const successStorySchema = new mongoose.Schema({
  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true
  },
  thumbnail: {
    url: String,
    public_id: String
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  rank: {
    type: String,
    required: true,
    trim: true
  }
}, { timestamps: true });

// Index for efficient queries
successStorySchema.index({ center: 1 });

module.exports = mongoose.model('SuccessStory', successStorySchema);
