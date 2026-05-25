const mongoose = require('mongoose');

const centerSchema = new mongoose.Schema(
  {
    centerName: {
      type: String,
      required: true,
      trim: true
    },

    /** @deprecated Synced from centerName — used by legacy queries/populates */
    name: {
      type: String,
      trim: true
    },

    centerCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    address: {
      type: String,
      trim: true,
      default: ''
    },

    city: {
      type: String,
      required: true,
      trim: true
    },

    state: {
      type: String,
      required: true,
      trim: true
    },

    contactNumber: {
      type: String,
      trim: true,
      default: ''
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ''
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'DISABLED'],
      default: 'ACTIVE'
    },

    /** Text labels until frontend supports User refs */
    assignedAdmins: [
      {
        type: String,
        trim: true
      }
    ],

    centerAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

centerSchema.pre('validate', function syncLegacyName() {
  if (this.centerName) {
    this.name = this.centerName;
  } else if (this.name && !this.centerName) {
    this.centerName = this.name;
  }
  if (this.centerCode) {
    this.centerCode = String(this.centerCode).toUpperCase().trim();
  }
});

centerSchema.index({ centerName: 1 });
centerSchema.index({ city: 1 });
centerSchema.index({ status: 1, isDeleted: 1 });
centerSchema.index({ centerName: 'text', centerCode: 'text', city: 'text' });

module.exports = mongoose.model('Center', centerSchema);
