const mongoose = require('mongoose');

const academicSubCategorySchema = new mongoose.Schema(
  {
    subCategoryId: {
      type: String,
      unique: true,
      trim: true
    },
    subCategoryName: {
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
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicCategory',
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

academicSubCategorySchema.index(
  { centerId: 1, programId: 1, categoryId: 1, subCategoryName: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);
academicSubCategorySchema.index({ centerId: 1, programId: 1, categoryId: 1, status: 1 });

module.exports = mongoose.model('AcademicSubCategory', academicSubCategorySchema);
