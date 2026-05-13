const mongoose = require('mongoose');

const centerDataSchema = new mongoose.Schema({
  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  thumbnail: {
    url: String,
    public_id: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for efficient queries
centerDataSchema.index({ isActive: 1 });

module.exports = mongoose.model('CenterData', centerDataSchema);
