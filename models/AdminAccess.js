const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SESSION_TIMEOUTS = [
  '15_MINUTES',
  '30_MINUTES',
  '1_HOUR',
  '2_HOURS',
  '8_HOURS'
];

const adminAccessSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    officialEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    contactNumber: {
      type: String,
      required: true,
      trim: true
    },

    employeeId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },

    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
      index: true
    },

    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: true,
      index: true
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },

    accountStatus: {
      type: Boolean,
      default: true,
      index: true
    },

    twoFactorEnabled: {
      type: Boolean,
      default: false
    },

    loginAlertEnabled: {
      type: Boolean,
      default: false
    },

    sessionTimeout: {
      type: String,
      enum: SESSION_TIMEOUTS,
      default: '1_HOUR'
    },

    lastLoginAt: {
      type: Date,
      default: null
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  { timestamps: true }
);

adminAccessSchema.index({ accountStatus: 1 });
adminAccessSchema.index({ fullName: 'text', officialEmail: 'text', employeeId: 'text' });

adminAccessSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

adminAccessSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('AdminAccess', adminAccessSchema);
module.exports.SESSION_TIMEOUTS = SESSION_TIMEOUTS;
