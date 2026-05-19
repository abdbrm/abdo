// ملف: routes/stock.js
// كل الـ endpoints الخاصة بالمخزون والمكونات
// - عرض المخزون الحالي
// - إضافة/تعديل المكونات
// - تسجيل دخول بضاعة جديدة
// - عرض سجل الحركات

const router = require('express').Router();
const { Stock, StockLog } = require('../models/Stock');
const Recipe = require('../models/Ingredient');
const { auth, role } = require('../middleware/auth');

// ==========================================
// عرض كل المخزون الحالي
// ==========================================
router.get('/', auth, role('admin','superadmin','kitchen'), async (req, res) => {
  try {
    const stock = await Stock.find().sort({ name: 1 });
    res.json(stock);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ==========================================
// عرض المخزون اللي وصل للحد الأدنى (تحذيرات)
// ==========================================
router.get('/alerts', auth, role('admin','superadmin'), async (req, res) => {
  try {
    // جيب كل المكونات اللي كميتها أقل من أو تساوي الحد الأدنى
    const alerts = await Stock.find({ $expr: { $lte: ['$currentQty', '$minQty'] } });
    res.json(alerts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ==========================================
// إضافة أو تعديل مكون في المخزون
// ==========================================
router.post('/', auth, role('admin','superadmin'), async (req, res) => {
  try {
    const { name, unit, currentQty, minQty } = req.body;
    // لو موجود اتحدث، لو مش موجود اتعمل جديد
    const stock = await Stock.findOneAndUpdate(
      { name },
      { name, unit, currentQty, minQty, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(stock);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ==========================================
// تسجيل دخول بضاعة جديدة للمطبخ
// بيعمله الأدمن أو الطباخ
// ==========================================
router.post('/add', auth, role('admin','superadmin','kitchen'), async (req, res) => {
  try {
    const { name, quantity, unit, reason } = req.body;
    
    // تحديث الكمية في المخزون
    const stock = await Stock.findOneAndUpdate(
      { name },
      { 
        $inc: { currentQty: quantity },
        updatedAt: new Date(),
        ...(unit && { unit })
      },
      { upsert: true, new: true }
    );

    // تسجيل الحركة في السجل
    await StockLog.create({
      ingredientName: name,
      type: 'in',
      quantity,
      reason: reason || 'إضافة يدوية',
      by: req.user.displayName || req.user.username
    });

    // إرسال تحديث live للكل
    const io = req.app.get('io');
    io.emit('stockUpdated', stock);

    res.json(stock);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ==========================================
// تعديل يدوي في الكمية (تصحيح بعد العد)
// ==========================================
router.post('/adjust', auth, role('admin','superadmin','kitchen'), async (req, res) => {
  try {
    const { name, newQty, reason } = req.body;
    
    const stock = await Stock.findOne({ name });
    if (!stock) return res.status(404).json({ message: 'المكون مش موجود' });
    
    const diff = newQty - stock.currentQty;
    stock.currentQty = newQty;
    stock.updatedAt = new Date();
    await stock.save();

    // سجل التعديل مع السبب
    await StockLog.create({
      ingredientName: name,
      type: 'adjust',
      quantity: Math.abs(diff),
      reason: reason || 'تعديل بعد العد',
      by: req.user.displayName || req.user.username
    });

    const io = req.app.get('io');
    io.emit('stockUpdated', stock);

    res.json(stock);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ==========================================
// عرض سجل الحركات (دخل وخرج)
// ==========================================
router.get('/log', auth, role('admin','superadmin'), async (req, res) => {
  try {
    const { ingredient, limit = 50 } = req.query;
    const query = ingredient ? { ingredientName: ingredient } : {};
    const logs = await StockLog.find(query).sort({ createdAt: -1 }).limit(parseInt(limit));
    res.json(logs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ==========================================
// عرض وصفات الأصناف (مكونات كل صنف)
// ==========================================
router.get('/recipes', auth, async (req, res) => {
  try {
    const recipes = await Recipe.find();
    res.json(recipes);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ==========================================
// حفظ وصفة صنف معين
// ==========================================
router.post('/recipes', auth, role('superadmin'), async (req, res) => {
  try {
    const { menuItemId, menuItemName, ingredients } = req.body;
    const recipe = await Recipe.findOneAndUpdate(
      { menuItemId },
      { menuItemId, menuItemName, ingredients },
      { upsert: true, new: true }
    );
    res.json(recipe);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ==========================================
// خصم المخزون تلقائياً لما أوردر يتأكد
// بيتنادى من orders.js
// ==========================================
router.post('/deduct', auth, async (req, res) => {
  try {
    const { items, orderId } = req.body;
    const Recipe = require('../models/Ingredient');
    
    for (const item of items) {
      // جيب الوصفة بتاعت الصنف ده
      const recipe = await Recipe.findOne({ menuItemId: item.menuItemId });
      if (!recipe) continue;
      
      // خصم كل مكون
      for (const ing of recipe.ingredients) {
        const totalToDeduct = ing.quantity * item.quantity;
        
        await Stock.findOneAndUpdate(
          { name: ing.name },
          { $inc: { currentQty: -totalToDeduct }, updatedAt: new Date() }
        );
        
        await StockLog.create({
          ingredientName: ing.name,
          type: 'out',
          quantity: totalToDeduct,
          reason: `أوردر: ${item.name}`,
          orderId
        });
      }
    }
    
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
