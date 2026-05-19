const router = require('express').Router();
const MenuItem = require('../models/MenuItem');
const Settings = require('../models/Settings');
const { auth, role } = require('../middleware/auth');

const adminCanEdit = async () => {
  const s = await Settings.findOne({ key: 'adminCanEditMenu' });
  return s?.value === true;
};

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

router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      if (req.user.role !== 'admin') return res.status(403).json({ message: 'Нет доступа' });
      const ok = await adminCanEdit();
      if (!ok) return res.status(403).json({ message: 'Администратору не разрешено редактировать меню' });
    }
    const item = new MenuItem(req.body);
    await item.save();
    res.json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      if (req.user.role !== 'admin') return res.status(403).json({ message: 'Нет доступа' });
      const ok = await adminCanEdit();
      if (!ok) return res.status(403).json({ message: 'Администратору не разрешено редактировать меню' });
    }
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      if (req.user.role !== 'admin') return res.status(403).json({ message: 'Нет доступа' });
      const ok = await adminCanEdit();
      if (!ok) return res.status(403).json({ message: 'Администратору не разрешено редактировать меню' });
    }
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/ingredients', auth, role('superadmin'), async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { ingredients: req.body.ingredients },
      { new: true }
    );
    res.json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/public', async (req, res) => {
  try {
    const items = await MenuItem.find({ available: true }).sort({ category:1, order:1 });
    res.json(items);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
