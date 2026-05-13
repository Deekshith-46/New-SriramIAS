const mongoose = require('mongoose');

const FeaturedArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  mainImage: {
    url: {
      type: String,
      required: [true, 'Main image URL is required']
    },
    publicId: {
      type: String
    }
  },
  secondaryImage: {
    url: {
      type: String,
      required: [true, 'Secondary image URL is required']
    },
    publicId: {
      type: String
    }
  },
  authorName: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Index for faster queries
FeaturedArticleSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('FeaturedArticle', FeaturedArticleSchema);
