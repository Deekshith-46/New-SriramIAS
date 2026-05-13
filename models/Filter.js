const mongoose = require('mongoose');

const filterSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['SUBJECT', 'CLASS', 'PAPER', 'YEAR']
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResourceCategory',
    required: true
  },
  subCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    default: null
  }
}, { timestamps: true });

// Compound unique index to prevent duplicate filters
filterSchema.index(
  { type: 1, value: 1, categoryId: 1, subCategoryId: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('Filter', filterSchema);
