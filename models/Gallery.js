const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true
  },
  images: [{
    url: String,
    public_id: String
  }]
}, { timestamps: true });

// Ensure maximum 6 images validation
gallerySchema.path('images').validate(function(images) {
  return images.length <= 6;
}, 'Gallery cannot have more than 6 images');

// Index for efficient queries
gallerySchema.index({ center: 1 });

module.exports = mongoose.model('Gallery', gallerySchema);
