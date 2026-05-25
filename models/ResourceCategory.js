const mongoose = require('mongoose');

const resourceCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  thumbnail: {
    url: String,
    public_id: String
  },
  description: String,
  moduleType: {
    type: String,
    enum: ['CURRENT_AFFAIRS', 'FREE_RESOURCES'],
    default: 'FREE_RESOURCES',
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('ResourceCategory', resourceCategorySchema);
