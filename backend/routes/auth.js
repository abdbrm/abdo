const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth, role } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, active: true });
    if (!user) return res.status(401).json({ message: 'Неверный логин или пароль' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Неверный логин или пароль' });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { _id: user._id, username: user.username, role: user.role, club: user.club, displayName: user.displayName } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', auth, (req, res) => res.json(req.user));

router.get('/users', auth, role('superadmin','admin'), async (req, res) => {
  try {
    const users = await User.find({ active: true }).select('-password');
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/users', auth, role('superadmin'), async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.json({ _id: user._id, username: user.username, role: user.role, club: user.club, displayName: user.displayName });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/users/:id', auth, role('superadmin','admin'), async (req, res) => {
  try {
    const update = {};
    if (req.user.role === 'superadmin') {
      if (req.body.displayName !== undefined) update.displayName = req.body.displayName;
      if (req.body.club !== undefined) update.club = req.body.club;
      if (req.body.active !== undefined) update.active = req.body.active;
      if (req.body.password) update.password = await bcrypt.hash(req.body.password, 10);
    } else {
      if (req.body.club !== undefined) update.club = req.body.club;
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    res.json(user);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/users/:id', auth, role('superadmin'), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
