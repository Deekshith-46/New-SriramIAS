const mongoose = require('mongoose');

const testConfigLanguageSchema = new mongoose.Schema(
  {
    languageId: {
      type: String,
      unique: true,
      trim: true
    },
    languageName: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

testConfigLanguageSchema.index({ status: 1, isDeleted: 1 });
testConfigLanguageSchema.index({ languageName: 1 });

module.exports = mongoose.model('TestConfigLanguage', testConfigLanguageSchema);
