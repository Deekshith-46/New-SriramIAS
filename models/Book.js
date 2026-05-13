const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  authorNames: [{
    type: String,
    required: [true, 'At least one author is required']
  }],
  subjects: [{
    type: String,
    required: [true, 'At least one subject is required']
  }],
  summary: {
    type: String,
    required: [true, 'Book summary is required'],
    maxlength: [2000, 'Summary cannot exceed 2000 characters']
  },
  image: {
    url: {
      type: String,
      required: [true, 'Book image is required']
    },
    publicId: {
      type: String
    }
  },
  fullPrice: {
    type: Number,
    required: [true, 'Full price is required'],
    min: [0, 'Price cannot be negative']
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  discountedPrice: {
    type: Number,
    required: [true, 'Discounted price is required'],
    min: [0, 'Discounted price cannot be negative']
  },
  isBestSeller: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for faster queries
BookSchema.index({ isActive: 1, isBestSeller: 1, createdAt: -1 });
BookSchema.index({ subjects: 1 });

module.exports = mongoose.model('Book', BookSchema);
