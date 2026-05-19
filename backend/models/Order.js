const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  menuItemId: mongoose.Schema.Types.ObjectId,
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, default: 0 },
  sauce: { type: String, default: null },
  note: { type: String, default: '' }
});

const orderSchema = new mongoose.Schema({
  tableNumber: { type: Number, required: true },
  club: { type: String, enum: ['neon','elvis','enot'], required: true },
  garconId: mongoose.Schema.Types.ObjectId,
  garconName: { type: String, default: '' },
  items: [itemSchema],
  comment: { type: String, default: '' },
  status: { type: String, enum: ['pending','confirmed','ready','delivered'], default: 'pending' },
  isStaffOrder: { type: Boolean, default: false },
  screenshotUrl: { type: String, default: null },
  paymentAmount: { type: Number, default: 0 },
  paymentConfirmed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
