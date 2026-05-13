const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  phone: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    trim: true,
    lowercase: true
  },

  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center'
  },

  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },

  targetYear: {
    type: String,
    trim: true
  },

  expectation: {
    type: String,
    trim: true
  },

  status: {
    type: String,
    enum: ['new', 'contacted', 'converted', 'closed'],
    default: 'new'
  },

  notes: {
    type: String,
    trim: true
  },

  // Track who handled this enquiry
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Track enquiry source (which form was used)
  source: {
    type: String,
    enum: ['main', 'course', 'demo'],
    default: 'main'
  },

  // Spam prevention
  lastEnquiryAt: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

// Index for faster queries
enquirySchema.index({ phone: 1 });
enquirySchema.index({ status: 1 });
enquirySchema.index({ course: 1 });
enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ center: 1, category: 1 }); // For reporting/analytics

module.exports = mongoose.model('Enquiry', enquirySchema);
