const mongoose = require('mongoose');
const { CATEGORY_LIST, MONTHS } = require('../utils/currentAffairConstants');
const { MAINS_CATEGORY_LIST } = require('../utils/currentAffairEnums');

const currentAffairSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: CATEGORY_LIST,
      required: [true, 'Category is required']
    },
    title: {
      type: String,
      trim: true
    },
    magazineName: {
      type: String,
      trim: true
    },
    year: {
      type: Number
    },
    month: {
      type: String,
      enum: MONTHS
    },
    description: {
      type: String,
      trim: true
    },
    mainsCategory: {
      type: String,
      enum: MAINS_CATEGORY_LIST
    },
    paperName: {
      type: String,
      trim: true
    },
    date: {
      type: Date
    },
    sectionFrom: {
      type: Number,
      min: 1
    },
    sectionTo: {
      type: Number,
      min: 1
    },
    pdfUrl: {
      type: String
    },
    pdfPublicId: {
      type: String
    },
    imageUrl: {
      type: String
    },
    status: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

currentAffairSchema.index({ category: 1 });
currentAffairSchema.index({ year: 1 });
currentAffairSchema.index({ month: 1 });
currentAffairSchema.index({ status: 1, createdAt: -1 });
currentAffairSchema.index({ title: 'text', magazineName: 'text', description: 'text' });

module.exports = mongoose.model('CurrentAffair', currentAffairSchema, 'current_affairs');
