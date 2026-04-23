const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending','open','closed'], default: 'pending' },
  garcons: [{
    userId: mongoose.Schema.Types.ObjectId,
    displayName: String,
    club: String
  }],
  cooks: [{
    userId: mongoose.Schema.Types.ObjectId,
    displayName: String,
    arrived: { type: Boolean, default: false }
  }],
  cookArrived: { type: Boolean, default: false },
  openedAt: Date,
  openedBy: String,
  closeRequestedBy: String,
  closedAt: Date,
  closedBy: String
});

module.exports = mongoose.model('Shift', shiftSchema);
