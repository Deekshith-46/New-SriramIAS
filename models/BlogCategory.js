const mongoose = require('mongoose');
const slugify = require('slugify');

const BlogCategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Category name is required'],
    unique: true,
    trim: true
  },
  slug: { 
    type: String,
    trim: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }
}, { timestamps: true });

// Indexes for performance
BlogCategorySchema.index({ slug: 1 }, { unique: true });
BlogCategorySchema.index({ isActive: 1 });

// Generate unique slug before saving
BlogCategorySchema.pre('save', async function() {
  if (this.isModified('name')) {
    let slug = slugify(this.name, { lower: true, strict: true });
    const count = await mongoose.models.BlogCategory.countDocuments({ slug: new RegExp(`^${slug}`, 'i') });
    this.slug = count ? `${slug}-${count + 1}` : slug;
  }
});

module.exports = mongoose.model("BlogCategory", BlogCategorySchema);