const router = require('express').Router();
const CleanerCall = require('../models/CleanerCall');
const { auth, role } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const calls = await CleanerCall.find({ status: { $ne: 'done' } }).sort({ createdAt: -1 });
    res.json(calls);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, role('kitchen','admin','superadmin'), async (req, res) => {
  try {
    const call = await CleanerCall.create({ calledBy: req.user.displayName || req.user.username, calledByRole: req.user.role, location: req.body.location });
    req.app.get('io').emit('cleanerCall', call);
    req.app.get('io').emit('notify', { type:'cleaner', msg:`Вызов уборщика — ${call.location}` });
    res.json(call);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/ack', auth, role('cleaner'), async (req, res) => {
  try {
    const call = await CleanerCall.findByIdAndUpdate(req.params.id, { status:'acknowledged', etaMinutes: req.body.etaMinutes }, { new: true });
    req.app.get('io').emit('cleanerUpdated', call);
    res.json(call);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/reply', auth, role('admin','superadmin'), async (req, res) => {
  try {
    const call = await CleanerCall.findByIdAndUpdate(req.params.id, { adminReply: req.body.reply }, { new: true });
    req.app.get('io').emit('cleanerUpdated', call);
    res.json(call);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/done', auth, async (req, res) => {
  try {
    const call = await CleanerCall.findByIdAndUpdate(req.params.id, { status:'done' }, { new: true });
    req.app.get('io').emit('cleanerUpdated', call);
    res.json(call);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
