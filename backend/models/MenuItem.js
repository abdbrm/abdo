const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  weight: { type: String, default: '' },
  description: { type: String, default: '' },
  available: { type: Boolean, default: true },
  hasSauce: { type: Boolean, default: false },
  order: { type: Number, default: 0 }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
