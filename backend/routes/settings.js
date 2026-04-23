const router = require('express').Router();
const Settings = require('../models/Settings');
const { auth, role } = require('../middleware/auth');

const DEFAULTS = {
  appName: 'NEON',
  appColor: '#e8c84a',
  appIcon: null,
  garconPrompt: '',
  tableCount: 15,
  sauces: ['Сырный','Кетчуп','Чесночный','Горчица','Терияки','Кисло-сладкий','Сладкий чили'],
  defaultSauce: 'Сырный',
  transferPhone: '',
  staffDiscount: 0,
  notificationSound: 'default',
  notificationVolume: 80,
  notificationSoundUrl: null,
  kitchenPrinterIp: '',
  receiptPrinterIp: '',
  colorNeon: '#00aaff',
  colorElvis: '#8B6348',
  colorEnot: '#e03535',
  showStaffOrder: false,
  showStaffPayment: false,
  showShiftManager: false,
  showCleanerCall: false,
  showCleanerPage: false,
  showShiftPdf: false,
  showStaffMenu: false
};

router.get('/', auth, async (req, res) => {
  try {
    const list = await Settings.find({});
    const result = { ...DEFAULTS };
    list.forEach(s => { result[s.key] = s.value; });
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/', auth, role('superadmin'), async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await Settings.findOneAndUpdate({ key }, { value }, { upsert: true });
    }
    req.app.get('io').emit('settingsUpdated', req.body);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Public settings for QR page
router.get('/public', async (req, res) => {
  try {
    const list = await Settings.find({ key: { $in: ['appName','transferPhone','staffDiscount','showStaffOrder'] } });
    const result = {};
    list.forEach(s => { result[s.key] = s.value; });
    res.json({
      appName: result.appName || 'NEON',
      transferPhone: result.transferPhone || '',
      staffDiscount: result.staffDiscount || 0,
      staffMenuVisible: result.showStaffOrder || false
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
