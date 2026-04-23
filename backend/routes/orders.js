const router = require('express').Router();
const Order = require('../models/Order');
const { auth, role } = require('../middleware/auth');

const moscowNow = () => new Date(Date.now() + 3*3600*1000);
const todayRange = () => {
  const m = moscowNow();
  const start = new Date(m); start.setUTCHours(0,0,0,0); 
  const startUTC = new Date(start.getTime() - 3*3600*1000);
  const endUTC = new Date(startUTC.getTime() + 24*3600*1000 - 1);
  return { start: startUTC, end: endUTC };
};

router.get('/today', auth, async (req, res) => {
  try {
    const { start, end } = todayRange();
    const query = { createdAt: { $gte: start, $lte: end } };
    if (req.user.role === 'garcon') query.club = req.user.club;
    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/summary', auth, role('admin','superadmin'), async (req, res) => {
  try {
    const { start, end } = todayRange();
    const orders = await Order.find({ createdAt: { $gte: start, $lte: end }, status: { $ne: 'pending' } }).sort({ createdAt: -1 });
    const total = orders.reduce((s,o) => s + o.items.reduce((ss,i) => ss + i.price*i.quantity, 0), 0);
    const byClub = { neon:0, elvis:0, enot:0 };
    orders.forEach(o => { if (byClub[o.club] !== undefined) byClub[o.club] += o.items.reduce((s,i) => s+i.price*i.quantity, 0); });
    res.json({ total, byClub, recent: orders.slice(0,30), count: orders.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, role('garcon'), async (req, res) => {
  try {
    const order = new Order({
      ...req.body,
      club: req.user.club,
      garconId: req.user._id,
      garconName: req.user.displayName || req.user.username
    });
    await order.save();
    const io = req.app.get('io');
    io.emit('newOrder', order);
    io.emit('notify', { type:'order', msg:`Заказ — стол ${order.tableNumber} (${order.club.toUpperCase()})`, order });
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/status', auth, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    const io = req.app.get('io');
    io.emit('orderUpdated', order);
    if (req.body.status === 'ready') {
      io.emit('notify', { type:'ready', msg:`Готов — стол ${order.tableNumber}`, order });
    }
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/payment', auth, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { screenshotUrl: req.body.screenshotUrl, paymentAmount: req.body.amount }, { new: true });
    req.app.get('io').emit('paymentReceived', order);
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/confirm-payment', auth, role('admin','superadmin'), async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { paymentConfirmed: true }, { new: true });
    req.app.get('io').emit('paymentConfirmed', order);
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// QR staff order (no auth)
router.post('/staff', async (req, res) => {
  try {
    const order = new Order({ ...req.body, club: req.body.club || 'neon', garconName: 'Сотрудник', isStaffOrder: true });
    await order.save();
    const io = req.app.get('io');
    io.emit('newOrder', order);
    io.emit('notify', { type:'staffOrder', msg:`Заказ сотрудника — стол ${order.tableNumber}`, order });
    res.json({ ok: true, orderId: order._id });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
