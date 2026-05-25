const mongoose = require('mongoose');

const resourceDownloadSchema = new mongoose.Schema(
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
    downloadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

resourceDownloadSchema.index({ resourceId: 1, downloadedAt: -1 });
resourceDownloadSchema.index({ userId: 1, resourceId: 1 });

module.exports = mongoose.model('ResourceDownload', resourceDownloadSchema);
