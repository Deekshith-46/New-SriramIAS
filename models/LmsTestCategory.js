const mongoose = require('mongoose');

const lmsTestCategorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      enum: ['weekly', 'daily', 'monthly'],
      required: true,
      unique: true,
      lowercase: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('LmsTestCategory', lmsTestCategorySchema);
