const mongoose = require('mongoose');

const programSchema = new mongoose.Schema(
  {
    programId: {
      type: String,
      unique: true,
      trim: true
    },
    programName: {
      type: String,
      required: true,
      trim: true
    },
    centers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Center',
        required: true
      }
    ],
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminAccess'
    }
  },
  { timestamps: true }
);

programSchema.index({ programName: 1 });
programSchema.index({ centers: 1, status: 1 });

module.exports = mongoose.model('Program', programSchema);
