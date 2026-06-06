const mongoose = require('mongoose');

const examPatternInstructionSchema = new mongoose.Schema(
  {
    instructionId: {
      type: String,
      unique: true,
      trim: true
    },
    instructionDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
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

examPatternInstructionSchema.index({ status: 1, isDeleted: 1 });
examPatternInstructionSchema.index({ instructionDescription: 'text' });

module.exports = mongoose.model('ExamPatternInstruction', examPatternInstructionSchema);
