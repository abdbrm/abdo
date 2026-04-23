const mongoose = require('mongoose');

const weekScheduleSchema = new mongoose.Schema({
  weekStart: { type: String, required: true, unique: true },
  days: [{
    date: String,
    dayName: String,
    cooks: [String]
  }],
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WeekSchedule', weekScheduleSchema);
