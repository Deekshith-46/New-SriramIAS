const mongoose = require('mongoose');

const permissionFeatureSchema = new mongoose.Schema(
  {
    featureKey: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    featureTitle: {
      type: String,
      required: true,
      trim: true
    },
    allowed: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const permissionMatrixSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
      index: true
    },

    moduleKey: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true
    },

    moduleTitle: {
      type: String,
      required: true,
      trim: true
    },

    permissions: {
      type: [permissionFeatureSchema],
      default: []
    }
  },
  { timestamps: true }
);

permissionMatrixSchema.index({ roleId: 1, moduleKey: 1 }, { unique: true });

module.exports = mongoose.model('PermissionMatrix', permissionMatrixSchema);
