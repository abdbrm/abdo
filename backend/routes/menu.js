const router = require('express').Router();
const MenuItem = require('../models/MenuItem');
const { auth, role } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const items = await MenuItem.find({}).sort({ category:1, order:1 });
    res.json(items);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/unavailable', auth, async (req, res) => {
  try {
    const items = await MenuItem.find({ available: false });
    res.json(items);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/available', auth, role('kitchen','admin','superadmin'), async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, { available: req.body.available }, { new: true });
    req.app.get('io').emit('menuUpdated', item);
    res.json(item);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, role('admin','superadmin'), async (req, res) => {
  try {
    const item = new MenuItem(req.body);
    await item.save();
    res.json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', auth, role('admin','superadmin'), async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', auth, role('admin','superadmin'), async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Public menu for QR
router.get('/public', async (req, res) => {
  try {
    const items = await MenuItem.find({ available: true }).sort({ category:1, order:1 });
    res.json(items);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
