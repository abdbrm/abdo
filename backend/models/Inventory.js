const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  yesterdayValue: { type: mongoose.Schema.Types.Mixed, default: '' },
  currentValue: { type: mongoose.Schema.Types.Mixed, default: '' },
  status: { type: String, enum: ['green','yellow','red'], default: 'green' },
  order: { type: Number, default: 0 }
});

const inventorySchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  cookNames: [{ type: String }],
  shift: { type: String, enum: ['open','closed'], default: 'open' },
  items: [itemSchema],
  closedAt: { type: Date },
  closedBy: { type: String }
});

module.exports = mongoose.model('Inventory', inventorySchema);
