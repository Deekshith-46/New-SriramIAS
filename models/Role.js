const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    roleTitle: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    roleCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

roleSchema.index({ roleTitle: 'text', roleCode: 'text' });
roleSchema.index({ status: 1 });

module.exports = mongoose.model('Role', roleSchema);
