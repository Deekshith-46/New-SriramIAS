const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true
  },
  image: {
    url: String,
    public_id: String
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  }
}, { timestamps: true });

// Index for efficient queries
facultySchema.index({ center: 1 });

module.exports = mongoose.model('Faculty', facultySchema);
