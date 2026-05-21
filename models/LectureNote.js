const mongoose = require('mongoose');

const lectureNoteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecordedLecture',
    required: true
  },
  noteText: {
    type: String,
    default: '',
    maxlength: 20000
  }
}, { timestamps: true });

lectureNoteSchema.index({ userId: 1, lectureId: 1 }, { unique: true });

module.exports = mongoose.model('LectureNote', lectureNoteSchema);
