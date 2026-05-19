// ملف: نموذج المخزون
// بيتتبع الكميات الموجودة في المطبخ لكل مكون
// بيتحدث تلقائياً لما أوردر يتأكد

const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  // اسم المكون (مثل: دجاج، بطاطس)
  name: { type: String, required: true, unique: true },
  // وحدة القياس
  unit: { type: String, enum: ['g','kg','pcs','ml','l'], default: 'g' },
  // الكمية الحالية الموجودة في المطبخ
  currentQty: { type: Number, default: 0 },
  // الحد الأدنى للتنبيه (لو وصلنا لده يبعت تحذير)
  minQty: { type: Number, default: 0 },
  // آخر تحديث
  updatedAt: { type: Date, default: Date.now }
});

// سجل حركات المخزون (دخل وخرج)
const stockLogSchema = new mongoose.Schema({
  // اسم المكون
  ingredientName: { type: String, required: true },
  // نوع الحركة: in=دخول, out=خروج (من أوردر), adjust=تعديل يدوي
  type: { type: String, enum: ['in','out','adjust'], required: true },
  // الكمية
  quantity: { type: Number, required: true },
  // السبب (في حالة النقص)
  reason: { type: String, default: '' },
  // مين عمل العملية
  by: { type: String, default: '' },
  // معرف الأوردر (لو الخصم من أوردر)
  orderId: { type: mongoose.Schema.Types.ObjectId, default: null },
  createdAt: { type: Date, default: Date.now }
});

const Stock = mongoose.model('Stock', stockSchema);
const StockLog = mongoose.model('StockLog', stockLogSchema);

module.exports = { Stock, StockLog };
