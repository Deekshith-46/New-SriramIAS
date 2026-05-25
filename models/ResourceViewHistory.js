const mongoose = require('mongoose');

const resourceViewHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
      index: true
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

resourceViewHistorySchema.index({ userId: 1, viewedAt: -1 });
resourceViewHistorySchema.index({ resourceId: 1, viewedAt: -1 });

module.exports = mongoose.model('ResourceViewHistory', resourceViewHistorySchema);
