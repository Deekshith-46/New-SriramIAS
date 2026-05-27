const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    courseId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },

    courseName: {
      type: String,
      trim: true
    },

    title: {
      type: String,
      trim: true
    },

    slug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },

    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      default: null
    },

    /** @deprecated Legacy global category — old records only */
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },

    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      default: null
    },
    academicCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicCategory',
      default: null
    },
    academicSubCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSubCategory',
      default: null
    },

    courseOverview: {
      type: String,
      default: ''
    },

    keyFeatures: [
      {
        _id: false,
        image: { type: String, default: '' },
        points: [{ type: String, trim: true }]
      }
    ],

    whyChooseSection: {
      title: { type: String, default: '' },
      subtitle: { type: String, default: '' },
      featureCards: [
        {
          _id: false,
          image: { type: String, default: '' },
          featureTitle: { type: String, default: '' },
          displayOrder: { type: Number, default: 0 },
          featureDescription: { type: String, default: '' },
          highlightOnWebsite: { type: Boolean, default: false }
        }
      ]
    },

    helpSections: [
      {
        _id: false,
        displayOrder: { type: Number, default: 0 },
        video: { type: String, default: '' },
        image1: { type: String, default: '' },
        image2: { type: String, default: '' }
      }
    ],

    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
    },

    extraFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    isActive: {
      type: Boolean,
      default: true
    },
    isFeatured: {
      type: Boolean,
      default: false
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        const legacyKeys = [
          'description',
          'batchStartDate',
          'batchEndDate',
          'duration',
          'accessValidityInDays',
          'recordedContentValidityInDays',
          'fees',
          'modes',
          'bannerImage',
          'highlightImage',
          'sectionImage',
          'galleryImages',
          'promoVideo',
          'brochure',
          'keyHighlights',
          'whyChoose',
          'howItHelps',
          'features'
        ];
        for (const key of legacyKeys) {
          delete ret[key];
        }
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

courseSchema.pre('save', async function syncCourseDerivedFields() {
  const displayName = this.courseName || this.title;
  if (displayName) {
    this.courseName = displayName;
    this.title = displayName;
  }

  if (this.status) {
    this.isActive = this.status === 'ACTIVE';
  }

  if (this.title && !this.slug) {
    this.slug =
      this.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now();
  }
});

courseSchema.index({ center: 1, category: 1 });
courseSchema.index({ center: 1, program: 1, academicCategory: 1, academicSubCategory: 1 });
courseSchema.index({ isActive: 1, status: 1 });
courseSchema.index({ isDeleted: 1, status: 1 });
courseSchema.index({ courseName: 1 });
courseSchema.index({ title: 1 });

module.exports = mongoose.model('Course', courseSchema);
