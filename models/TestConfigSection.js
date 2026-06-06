const mongoose = require('mongoose');

const testConfigSectionSchema = new mongoose.Schema(
  {
    sectionId: {
      type: String,
      unique: true,
      trim: true
    },
    sectionName: {
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

testConfigSectionSchema.index({ status: 1, isDeleted: 1 });
testConfigSectionSchema.index({ sectionName: 1 });

module.exports = mongoose.model('TestConfigSection', testConfigSectionSchema);
