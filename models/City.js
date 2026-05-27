const mongoose = require('mongoose');

const citySchema = new mongoose.Schema(
  {
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: true,
      index: true
    },
    cityAddress: {
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

citySchema.index({ centerId: 1, status: 1, isDeleted: 1 });
citySchema.index({ cityAddress: 1 });

module.exports = mongoose.model('City', citySchema);
