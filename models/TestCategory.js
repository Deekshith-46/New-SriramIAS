const mongoose = require('mongoose');

const testCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['CONTENT', 'EXAM']
  },
  image: {
    url: String,
    public_id: String
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  description: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// Index for efficient queries
testCategorySchema.index({ slug: 1 });
testCategorySchema.index({ type: 1 });
testCategorySchema.index({ status: 1 });

module.exports = mongoose.model('TestCategory', testCategorySchema);
