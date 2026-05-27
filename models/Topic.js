const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema(
  {
    topicId: {
      type: String,
      unique: true,
      trim: true
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    topicName: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
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

topicSchema.index({ subject: 1, topicName: 1 });
topicSchema.index({ subject: 1, status: 1, isDeleted: 1 });
topicSchema.index({ topicName: 1 });

module.exports = mongoose.model('Topic', topicSchema);
