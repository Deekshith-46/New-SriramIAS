const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  fileUrl: {
    url: String,
    public_id: String
  },
  thumbnail: {
    url: String,
    public_id: String
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResourceCategory',
    required: true
  },
  subCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    default: null
  },
  // Module-specific fields (only applicable per module)
  // NCERT: subject + class (plain text)
  // PYQ: paperId + yearId
  // Study Material: none (only categoryId + subCategoryId)
  subject: {
    type: String,
    trim: true,
    default: null
  },
  class: {
    type: String,
    trim: true,
    default: null
  },
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Filter',
    default: null
  },
  yearId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Filter',
    default: null
  },
  monthId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Filter',
    default: null
  },
  currentAffairsTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Filter',
    default: null
  },
  resourceType: {
    type: String,
    enum: ['PDF', 'ARTICLE', 'MAGAZINE', 'INFOGRAPHIC', 'VIDEO'],
    default: 'PDF'
  },
  // Metadata
  fileSize: String,
  fileType: String,
  downloads: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'DRAFT'],
    default: 'ACTIVE',
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    default: null
  }
}, { timestamps: true });

// Indexes for faster queries (module-specific)
resourceSchema.index({ categoryId: 1, subject: 1, class: 1 }); // NCERT
resourceSchema.index({ categoryId: 1, subCategoryId: 1, paperId: 1, yearId: 1 }); // PYQ
resourceSchema.index({ categoryId: 1, yearId: 1, monthId: 1, currentAffairsTypeId: 1 }); // Current Affairs
resourceSchema.index({ status: 1, isActive: 1 });

resourceSchema.pre('save', function syncResourceStatus() {
  if (this.status) {
    this.isActive = this.status === 'ACTIVE';
  }
});

module.exports = mongoose.model('Resource', resourceSchema);
