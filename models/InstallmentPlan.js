const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
  enrollmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true,
    unique: true
  },
  installments: [
    {
      installmentNo: { type: Number, required: true },
      amount:        { type: Number, required: true },
      dueDate:       { type: Date,   required: true },
      status: {
        type: String,
        enum: ['PENDING', 'PAID', 'OVERDUE'],
        default: 'PENDING'
      },
      paidAt: { type: Date, default: null },
      razorpayOrderId: { type: String, default: null },
      razorpayPaymentId: { type: String, default: null }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('InstallmentPlan', installmentSchema);
