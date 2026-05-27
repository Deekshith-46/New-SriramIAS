const mongoose = require('mongoose');

const academicCategorySchema = new mongoose.Schema(
  {
    categoryId: {
      type: String,
      unique: true,
      trim: true
    },
    categoryName: {
      type: String,
      required: true,
      trim: true
    },
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: true
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
    }
  },
  { timestamps: true }
);

academicCategorySchema.index(
  { centerId: 1, programId: 1, categoryName: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);
academicCategorySchema.index({ centerId: 1, programId: 1, status: 1 });

module.exports = mongoose.model('AcademicCategory', academicCategorySchema);
