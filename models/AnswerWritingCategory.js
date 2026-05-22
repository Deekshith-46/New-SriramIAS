const mongoose = require('mongoose');

const answerWritingCategorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AnswerWritingCategory', answerWritingCategorySchema);
