const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  parentName: {
    type: String,
    trim: true
  },
  parentMobile: {
    type: String,
    sparse: true,
    unique: true,
    trim: true
  },
  parentEmail: {
    type: String,
    sparse: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  parentMobileVerified: {
    type: Boolean,
    default: false
  },
  parentEmailVerified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
