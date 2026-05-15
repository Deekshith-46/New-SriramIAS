const mongoose = require('mongoose');

const LiveClassSchema = new mongoose.Schema({
   // Class Information
   title: {
      type: String,
      required: [true, 'Class title is required'],
      trim: true
   },
   
   topic: {
      type: String,
      required: [true, 'Class topic is required'],
      trim: true
   },
   
   lectureTitle: {
      type: String,
      required: [true, 'Lecture title is required'],
      trim: true
   },
   
   subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true
   },
   
   // Schedule (Clean datetime approach)
   startDateTime: {
      type: Date,
      required: [true, 'Start date and time is required']
   },
   
   endDateTime: {
      type: Date,
      required: [true, 'End date and time is required']
   },
   
   durationInMinutes: {
      type: Number,
      required: [true, 'Duration is required']
   },
   
   // Thumbnail
   thumbnail: {
      url: String,
      public_id: String
   },
   
   // Relations
   courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required']
   },
   
   centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: [true, 'Center is required']
   },
   
   categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required']
   },
   
   // 100ms Room Details
   roomId: {
      type: String,
      required: [true, 'Room ID is required'],
      unique: true
   },
   
   roomName: {
      type: String,
      required: [true, 'Room name is required']
   },
   
   // Class Status
   status: {
      type: String,
      enum: ['scheduled', 'live', 'completed', 'cancelled'],
      default: 'scheduled'
   },
   
   // Teacher Information
   teacherName: {
      type: String,
      required: [true, 'Teacher name is required']
   },
   
   // Audit Fields
   createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required']
   },
   
   // Recording (Optional - for future)
   recording: {
      url: String,
      duration: Number,
      recordedAt: Date
   },
   
   // Metadata
   description: {
      type: String,
      default: ''
   },
   
   isActive: {
      type: Boolean,
      default: true
   }
}, {
   timestamps: true
});

// Essential indexes only
LiveClassSchema.index({ courseId: 1, startDateTime: 1 });
LiveClassSchema.index({ status: 1 });

module.exports = mongoose.model('LiveClass', LiveClassSchema);
