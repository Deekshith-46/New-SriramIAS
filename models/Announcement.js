const mongoose = require("mongoose");

const AnnouncementSchema = new mongoose.Schema({

   title: {
      type: String,
      required: true,
      trim: true
   },

   description: {
      type: String,
      required: true
   },

   thumbnail: {
      url: String,
      public_id: String
   },

   pdf: {
      url: String,
      public_id: String,
      originalName: String
   },

   announcementType: {
      type: String,
      enum: ["general", "exam", "result", "important"],
      default: "general"
   },

   courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true
   },

   categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category"
   },

   centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center"
   },

   publishedAt: {
      type: Date,
      default: Date.now
   },

   createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
   },

   isActive: {
      type: Boolean,
      default: true
   }

}, {
   timestamps: true
});

// Index for efficient querying
AnnouncementSchema.index({ courseId: 1, publishedAt: -1 });
AnnouncementSchema.index({ centerId: 1, publishedAt: -1 });

module.exports = mongoose.model("Announcement", AnnouncementSchema);
