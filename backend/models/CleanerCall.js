const mongoose = require('mongoose');

const cleanerCallSchema = new mongoose.Schema({
  calledBy: String,
  calledByRole: String,
  location: String,
  status: { type: String, enum: ['pending','acknowledged','done'], default: 'pending' },
  etaMinutes: Number,
  adminReply: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CleanerCall', cleanerCallSchema);
