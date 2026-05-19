// ملف: models/Shift.js
// نموذج الوردية
// كل وردية ليها رقم تسلسلي shiftNumber بيزيد أوتوماتيك
// الوردية النشطة هي اللي status: 'open'
// التاريخ بيفضل للتسجيل بس مش unique

const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  // رقم الوردية التسلسلي — بيزيد أوتوماتيك
  shiftNumber: { type: Number, required: true, unique: true },
  // تاريخ الوردية — للتسجيل والعرض فقط
  date: { type: String, required: true },
  // حالة الوردية
  status: { type: String, enum: ['pending','open','closed'], default: 'pending' },
  // الجارسونات المختارين في الوردية
  garcons: [{
    userId: mongoose.Schema.Types.ObjectId,
    displayName: String,
    club: String
  }],
  // الطباخين المختارين في الوردية
  cooks: [{
    userId: mongoose.Schema.Types.ObjectId,
    displayName: String,
    arrived: { type: Boolean, default: false }
  }],
  // هل وصل طباخ على الأقل؟
  cookArrived: { type: Boolean, default: false },
  // بيانات الفتح والقفل
  openedAt: Date,
  openedBy: String,
  closeRequestedBy: String,
  closedAt: Date,
  closedBy: String
});

module.exports = mongoose.model('Shift', shiftSchema);
