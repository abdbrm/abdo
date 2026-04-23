const router = require('express').Router();
const Shift = require('../models/Shift');
const WeekSchedule = require('../models/WeekSchedule');
const { auth, role } = require('../middleware/auth');

const moscowDate = () => new Date(Date.now() + 3*3600*1000).toISOString().split('T')[0];

const getMoscowMonday = () => {
  const m = new Date(Date.now() + 3*3600*1000);
  const day = m.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  m.setUTCDate(m.getUTCDate() + diff);
  return m.toISOString().split('T')[0];
};

const DAY_NAMES = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];

router.get('/today', auth, async (req, res) => {
  try {
    const date = moscowDate();
    const shift = await Shift.findOne({ date });
    const weekStart = getMoscowMonday();
    const schedule = await WeekSchedule.findOne({ weekStart });
    const todayCooks = schedule?.days?.find(d => d.date === date)?.cooks || [];
    res.json({ shift: shift || null, todayCooks, date });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/open', auth, role('admin','superadmin'), async (req, res) => {
  try {
    const date = moscowDate();
    let shift = await Shift.findOne({ date });
    if (!shift) shift = new Shift({ date });
    shift.garcons = req.body.garcons || [];
    shift.cooks = req.body.cooks || [];
    shift.status = 'open';
    shift.openedAt = new Date();
    shift.openedBy = req.user.displayName || req.user.username;
    shift.cookArrived = false;
    shift.closeRequestedBy = null;
    await shift.save();
    const io = req.app.get('io');
    io.emit('shiftOpened', shift);
    io.emit('notify', { type:'shift', msg:'Смена открыта!' });
    res.json(shift);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/cook-arrived', auth, role('kitchen'), async (req, res) => {
  try {
    const shift = await Shift.findOne({ date: moscowDate() });
    if (!shift) return res.status(404).json({ message: 'Смена не найдена' });
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

router.put('/close-request', auth, role('kitchen'), async (req, res) => {
  try {
    const shift = await Shift.findOne({ date: moscowDate() });
    if (!shift) return res.status(404).json({ message: 'Смена не найдена' });
    shift.closeRequestedBy = req.user.displayName || req.user.username;
    await shift.save();
    const io = req.app.get('io');
    io.emit('shiftCloseRequest', shift);
    io.emit('notify', { type:'closeRequest', msg:`${shift.closeRequestedBy} запрашивает закрытие смены` });
    res.json(shift);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/close-confirm', auth, role('admin','superadmin'), async (req, res) => {
  try {
    const shift = await Shift.findOneAndUpdate(
      { date: moscowDate() },
      { status:'closed', closedAt: new Date(), closedBy: req.user.displayName || req.user.username },
      { new: true }
    );
    const io = req.app.get('io');
    io.emit('shiftClosed', shift);
    io.emit('notify', { type:'shiftClosed', msg:'Смена закрыта!' });
    res.json(shift);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Week schedule
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
    const schedule = await WeekSchedule.findOneAndUpdate({ weekStart }, { days: req.body.days, updatedAt: new Date() }, { upsert: true, new: true });
    res.json(schedule);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
