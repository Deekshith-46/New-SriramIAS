const mongoose = require('mongoose');
const slugify = require('slugify');

const ArticleSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Article title is required'],
    trim: true
  },
  slug: { 
    type: String,
    trim: true
  },

  description: {
    type: String,
    trim: true
  },
  
  content: {
    type: String,
    required: [true, 'Article content is required']
  },

  thumbnail: {
    url: String,
    public_id: String
  },

  images: [
    {
      url: String,
      public_id: String
    }
  ],

  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BlogCategory",
    required: [true, 'Category is required']
  },

  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  isActive: { 
    type: Boolean, 
    default: true 
  },

  views: { 
    type: Number, 
    default: 0 
  },

  readTime: { 
    type: Number // in minutes
  }
}, { timestamps: true });

// Indexes for performance
ArticleSchema.index({ categoryId: 1, createdAt: -1 });
ArticleSchema.index({ slug: 1 }, { unique: true });
ArticleSchema.index({ title: 'text', description: 'text' });
ArticleSchema.index({ isActive: 1, createdAt: -1 });

// Generate unique slug before saving
ArticleSchema.pre('save', async function() {
  if (this.isModified('title')) {
    let slug = slugify(this.title, { lower: true, strict: true });
    const count = await mongoose.models.Article.countDocuments({ slug: new RegExp(`^${slug}`, 'i') });
    this.slug = count ? `${slug}-${count + 1}` : slug;
  }
});

// Validate max 5 images
ArticleSchema.pre('save', async function() {
  if (this.images && this.images.length > 5) {
    throw new Error('Maximum 5 images allowed per article');
  }
});

// Increment views method (atomic operation to prevent race conditions)
ArticleSchema.methods.incrementViews = async function() {
  await mongoose.models.Article.findByIdAndUpdate(this._id, {
    $inc: { views: 1 }
  });
};

module.exports = mongoose.model("Article", ArticleSchema);