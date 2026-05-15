const mongoose = require("mongoose");

const AnnouncementReadSchema = new mongoose.Schema({

   announcementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Announcement",
      required: true
   },

   userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
   },

   readAt: {
      type: Date,
      default: Date.now
   }

}, {
   timestamps: true
});

// Unique compound index - prevents duplicate read records
AnnouncementReadSchema.index({
   announcementId: 1,
   userId: 1
}, {
   unique: true
});

module.exports = mongoose.model("AnnouncementRead", AnnouncementReadSchema);
