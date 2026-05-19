// ملف: نموذج المكونات
// كل مكون له اسم ووحدة قياس (جرام، قطعة، لتر...)
// كل صنف في المنيو مربوط بمكونات وكميات محددة

const mongoose = require('mongoose');

// مكونات كل صنف في المنيو
const recipeSchema = new mongoose.Schema({
  // معرف الصنف في المنيو
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  // اسم الصنف (للعرض فقط)
  menuItemName: { type: String, default: '' },
  // قائمة المكونات والكميات
  ingredients: [{
    // اسم المكون (مثل: دجاج، بطاطس، جبن)
    name: { type: String, required: true },
    // الكمية المطلوبة لكل وجبة
    quantity: { type: Number, required: true },
    // وحدة القياس: g=جرام, kg=كيلو, pcs=قطعة, ml=مل, l=لتر
    unit: { type: String, enum: ['g','kg','pcs','ml','l'], default: 'g' }
  }]
});

module.exports = mongoose.model('Recipe', recipeSchema);
