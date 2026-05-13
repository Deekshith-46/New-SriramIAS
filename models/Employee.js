const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permissions: [{
    type: String
  }],
  center: {
    type: String,
    enum: ['Hyderabad', 'New Delhi', 'Pune']
  }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
