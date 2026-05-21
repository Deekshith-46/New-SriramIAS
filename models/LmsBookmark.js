const mongoose = require('mongoose');

const lmsBookmarkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    bookmarkType: {
      type: String,
      enum: ['recording', 'test'],
      required: true
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    thumbnail: {
      url: String,
      public_id: String
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

lmsBookmarkSchema.index({ userId: 1, bookmarkType: 1, createdAt: -1 });
lmsBookmarkSchema.index({ userId: 1, referenceId: 1, bookmarkType: 1 }, { unique: true });

module.exports = mongoose.model('LmsBookmark', lmsBookmarkSchema);
