// ملف: routes/shift.js
// كل عمليات الوردية
// الوردية النشطة دايماً هي اللي status: 'open'
// كل وردية جديدة بياخد shiftNumber تسلسلي تلقائي

const router = require('express').Router();
const Shift = require('../models/Shift');
const WeekSchedule = require('../models/WeekSchedule');
const Order = require('../models/Order');
const { auth, role } = require('../middleware/auth');

// تاريخ موسكو الحالي
const moscowDate = () => new Date(Date.now() + 3*3600*1000).toISOString().split('T')[0];

// بداية الأسبوع (الاثنين) بتوقيت موسكو
const getMoscowMonday = () => {
  const m = new Date(Date.now() + 3*3600*1000);
  const day = m.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  m.setUTCDate(m.getUTCDate() + diff);
  return m.toISOString().split('T')[0];
};

const DAY_NAMES = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];

// جيب الرقم التسلسلي الجديد للوردية
const getNextShiftNumber = async () => {
  const last = await Shift.findOne().sort({ shiftNumber: -1 });
  return last ? last.shiftNumber + 1 : 1;
};

// ==========================================
// جيب الوردية النشطة أو الأخيرة
// ==========================================
router.get('/today', auth, async (req, res) => {
  try {
    const date = moscowDate();
    // الوردية النشطة هي اللي status: 'open'
    let shift = await Shift.findOne({ status: 'open' }).sort({ shiftNumber: -1 });
    // لو مفيش وردية مفتوحة، جيب الأخيرة
    if (!shift) shift = await Shift.findOne().sort({ shiftNumber: -1 });
    const weekStart = getMoscowMonday();
    const schedule = await WeekSchedule.findOne({ weekStart });
    const todayCooks = schedule?.days?.find(d => d.date === date)?.cooks || [];
    res.json({ shift: shift || null, todayCooks, date });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ==========================================
// فتح وردية جديدة
// ==========================================
router.post('/open', auth, role('admin','superadmin'), async (req, res) => {
  try {
    // تأكد مفيش وردية مفتوحة دلوقتي
    const existing = await Shift.findOne({ status: 'open' });
    if (existing) return res.status(400).json({ message: 'في وردية مفتوحة بالفعل' });

    const shiftNumber = await getNextShiftNumber();
    const date = moscowDate();

    const shift = new Shift({
      shiftNumber,
      date,
      garcons: req.body.garcons || [],
      cooks: req.body.cooks || [],
      status: 'open',
      openedAt: new Date(),
      openedBy: req.user.displayName || req.user.username,
      cookArrived: false,
      closeRequestedBy: null
    });

    await shift.save();
    const io = req.app.get('io');
    io.emit('shiftOpened', shift);
    io.emit('notify', { type:'shift', msg:`Смена #${shiftNumber} открыта!` });
    res.json(shift);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ==========================================
// الطباخ يسجل وصوله
// ==========================================
router.put('/cook-arrived', auth, role('kitchen'), async (req, res) => {
  try {
    const shift = await Shift.findOne({ status: 'open' }).sort({ shiftNumber: -1 });
    if (!shift) return res.status(404).json({ message: 'مفيش وردية مفتوحة' });
    const cook = shift.cooks.find(c => c.userId?.toString() === req.user._id.toString());
    if (cook) cook.arrived = true;
    if (shift.cooks.every(c => c.arrived)) shift.cookArrived = true;
    await shift.save();
    const io = req.app.get('io');
    io.emit('shiftUpdated', shift);
    io.emit('notify', { type:'cook', msg:`Повар ${req.user.displayName || req.user.username} на месте!` });
    res.json(shift);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ==========================================
// الطباخ يطلب قفل الوردية
// ==========================================
router.put('/close-request', auth, role('kitchen'), async (req, res) => {
  try {
    const shift = await Shift.findOne({ status: 'open' }).sort({ shiftNumber: -1 });
    if (!shift) return res.status(404).json({ message: 'مفيش وردية مفتوحة' });
    shift.closeRequestedBy = req.user.displayName || req.user.username;
    await shift.save();
    const io = req.app.get('io');
    io.emit('shiftCloseRequest', shift);
    io.emit('notify', { type:'closeRequest', msg:`${shift.closeRequestedBy} запрашивает закрытие смены` });
    res.json(shift);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ==========================================
// الأدمن يقفل الوردية
// ==========================================
router.put('/close-confirm', auth, role('admin','superadmin'), async (req, res) => {
  try {
    const shift = await Shift.findOne({ status: 'open' }).sort({ shiftNumber: -1 });
    if (!shift) return res.status(404).json({ message: 'مفيش وردية مفتوحة' });
    shift.status = 'closed';
    shift.closedAt = new Date();
    shift.closedBy = req.user.displayName || req.user.username;
    await shift.save();
    const io = req.app.get('io');
    io.emit('shiftClosed', shift);
    io.emit('notify', { type:'shiftClosed', msg:`Смена #${shift.shiftNumber} закрыта!` });
    res.json(shift);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ==========================================
// تقرير وردية تفصيلي
// بيتعمل بـ shiftNumber أو الوردية النشطة
// ==========================================
router.get('/report', auth, async (req, res) => {
  try {
    const { shiftNumber } = req.query;
    let shift;
    if (shiftNumber) {
      shift = await Shift.findOne({ shiftNumber: parseInt(shiftNumber) });
    } else {
      // الوردية النشطة أو الأخيرة
      shift = await Shift.findOne({ status: 'open' }).sort({ shiftNumber: -1 });
      if (!shift) shift = await Shift.findOne().sort({ shiftNumber: -1 });
    }
    if (!shift) return res.status(404).json({ message: 'مفيش وردية' });

    const start = shift.openedAt;
    const end = shift.closedAt || new Date();

    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
      status: { $ne: 'cancelled' }
    });

    const total = orders.reduce((s, o) => s + (o.total || 0), 0);

    // تفاصيل كل جارسون
    const garconMap = {};
    orders.forEach(o => {
      const name = o.garconName || 'Unknown';
      const club = o.club || '';
      const key = `${name}|${club}`;
      if (!garconMap[key]) garconMap[key] = { name, club, total: 0, orders: 0, items: {} };
      garconMap[key].total += o.total || 0;
      garconMap[key].orders += 1;
      (o.items || []).forEach(i => {
        if (!garconMap[key].items[i.name]) garconMap[key].items[i.name] = 0;
        garconMap[key].items[i.name] += i.quantity || 1;
      });
    });

    // كل الأصناف
    const itemMap = {};
    orders.forEach(o => {
      (o.items || []).forEach(i => {
        if (!itemMap[i.name]) itemMap[i.name] = { qty: 0, revenue: 0 };
        itemMap[i.name].qty += i.quantity || 1;
        itemMap[i.name].revenue += (i.price || 0) * (i.quantity || 1);
      });
    });

    const allItems = Object.entries(itemMap)
      .map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue }))
      .sort((a, b) => b.qty - a.qty);

    const byGarcon = Object.values(garconMap).sort((a, b) => b.total - a.total);

    res.json({
      shiftNumber: shift.shiftNumber,
      date: shift.date,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      ordersCount: orders.length,
      total,
      byGarcon,
      allItems
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ==========================================
// قائمة الورديات السابقة
// ==========================================
router.get('/history', auth, role('admin','superadmin'), async (req, res) => {
  try {
    const shifts = await Shift.find().sort({ shiftNumber: -1 }).limit(30);
    res.json(shifts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ==========================================
// جدول الأسبوع
// ==========================================
router.get('/schedule', auth, async (req, res) => {
  try {
    const weekStart = getMoscowMonday();
    let schedule = await WeekSchedule.findOne({ weekStart });
    if (!schedule) {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart + 'T12:00:00Z');
        d.setUTCDate(d.getUTCDate() + i);
        const date = d.toISOString().split('T')[0];
        return { date, dayName: DAY_NAMES[d.getUTCDay()], cooks: [] };
      });
      schedule = await WeekSchedule.create({ weekStart, days });
    }
    res.json(schedule);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/schedule', auth, role('superadmin'), async (req, res) => {
  try {
    const weekStart = getMoscowMonday();
    const schedule = await WeekSchedule.findOneAndUpdate(
      { weekStart },
      { days: req.body.days, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(schedule);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
