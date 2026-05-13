const mongoose = require('mongoose');

const homePageSchema = new mongoose.Schema({

  // SECTION 1: Toppers (Title & Subtitle only - toppers in separate collection)
  section1: {
    title: {
      type: String,
      trim: true
    },
    subTitle: {
      type: String,
      trim: true
    }
  },

  // SECTION 2: Learning Programs (Title only - cards in separate collection)
  section2: {
    title: {
      type: String,
      trim: true
    }
  },

  // SECTION 3: Videos (Legacy - can be deleted)
  section3: {
    type: mongoose.Schema.Types.Mixed,
    default: undefined
  }

}, { timestamps: true, strict: false });

module.exports = mongoose.model('HomePage', homePageSchema);
