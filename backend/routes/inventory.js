const router = require('express').Router();
const Inventory = require('../models/Inventory');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const { auth, role } = require('../middleware/auth');

const moscowDate = () => new Date(Date.now() + 3*3600*1000).toISOString().split('T')[0];

const DEFAULT_ITEMS = [
  { category:'Сыры', names:['Моцарелла','Пармезан','Голландский','Фета','Гауда','Российский','Сыр косичка','Для сэндвичей'] },
  { category:'Мясная нарезка', names:['Ветчина','Буженина','Бекон','Уши','Пастрома','Сырокопчёная колбаса','Полукопчёная колбаса','Рёбра','Чипсы мясные'] },
  { category:'Соусы', names:['Соус сырный','Хрен','Соус терияки','Соус кисло-сладкий','Чесночный','Горчица','Майонез','Кетчуп'] },
  { category:'Заморозка', names:['Картофель фри','Картофель дольки','Картофельные палочки','Наггетсы','Стрипсы куриные','Пельмени'] },
  { category:'Овощи', names:['Помидоры','Огурцы','Болгарский перец','Помидоры черри','Редис','Зелень','Грибы','Айсберг'] },
  { category:'Хлеб', names:['Хлеб чёрный','Хлеб для сэндвичей','Хлеб для гренок'] },
  { category:'Фрукты', names:['Яблоко','Виноград','Груша','Апельсин','Киви'] },
  { category:'Маринованное', names:['Морковь по-корейски','Капуста маринованная','Помидоры маринованные','Огурцы маринованные','Черемша маринованная','Грибы маринованные','Оливки'] },
  { category:'Разное', names:['Яйца','Кукуруза','Тунец','Сливки','Мука','Паста','Соль','Сахар','Мёд','Соевый соус','Масло для фритюра'] }
];

function buildDefaultItems() {
  let items = [], order = 0;
  DEFAULT_ITEMS.forEach(cat => cat.names.forEach(name => items.push({ name, category: cat.category, yesterdayValue:'', currentValue:'', status:'green', order: order++ })));
  return items;
}

async function calcExpectedConsumption(date) {
  try {
    const start = new Date(date + 'T00:00:00+03:00');
    const end = new Date(date + 'T23:59:59+03:00');
    const orders = await Order.find({ createdAt: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } });
    const menuItems = await MenuItem.find({ ingredients: { $exists: true, $ne: [] } });
    const menuMap = {};
    menuItems.forEach(m => { menuMap[m.name] = m.ingredients || []; });
    const consumption = {};
    orders.forEach(order => {
      (order.items || []).forEach(orderItem => {
        const ingredients = menuMap[orderItem.name] || [];
        ingredients.forEach(ing => {
          if (!consumption[ing.inventoryName]) consumption[ing.inventoryName] = 0;
          consumption[ing.inventoryName] += ing.quantity * (orderItem.quantity || 1);
        });
      });
    });
    return consumption;
  } catch { return {}; }
}

router.get('/today', auth, async (req, res) => {
  try {
    const date = moscowDate();
    let inv = await Inventory.findOne({ date });
    if (!inv) {
      const yesterday = new Date(Date.now() + 3*3600*1000);
      yesterday.setDate(yesterday.getDate() - 1);
      const yDate = yesterday.toISOString().split('T')[0];
      const prev = await Inventory.findOne({ date: yDate });
      const items = prev
        ? prev.items.map(i => ({ name:i.name, category:i.category, yesterdayValue: i.currentValue !== '' ? i.currentValue : i.yesterdayValue, currentValue:'', status:i.status, order:i.order }))
        : buildDefaultItems();
      inv = await Inventory.create({ date, items });
    }
    const expectedConsumption = await calcExpectedConsumption(date);
    res.json({ ...inv.toObject(), expectedConsumption });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/history', auth, role('admin','superadmin','kitchen'), async (req, res) => {
  try {
    const records = await Inventory.find({}, 'date shift cookNames closedAt').sort({ date: -1 }).limit(60);
    res.json(records);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/date/:date', auth, async (req, res) => {
  try {
    const inv = await Inventory.findOne({ date: req.params.date });
    if (!inv) return res.status(404).json({ message: 'Не найдено' });
    const expectedConsumption = await calcExpectedConsumption(req.params.date);
    res.json({ ...inv.toObject(), expectedConsumption });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/item/:itemId', auth, role('kitchen'), async (req, res) => {
  try {
    const inv = await Inventory.findById(req.params.id);
    const item = inv.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Не найдено' });
    Object.assign(item, req.body);
    await inv.save();
    res.json(inv);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/:id/item', auth, role('kitchen'), async (req, res) => {
  try {
    const inv = await Inventory.findById(req.params.id);
    inv.items.push(req.body);
    await inv.save();
    res.json(inv);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/close', auth, role('kitchen'), async (req, res) => {
  try {
    const inv = await Inventory.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: 'Не найдено' });
    const expectedConsumption = await calcExpectedConsumption(inv.date);
    const discrepancies = [];
    inv.items.forEach(item => {
      const expected = expectedConsumption[item.name];
      if (expected === undefined) return;
      const yesterday = parseFloat(item.yesterdayValue);
      const current = parseFloat(item.currentValue);
      if (isNaN(yesterday) || isNaN(current)) return;
      const actualConsumed = yesterday - current;
      const diff = actualConsumed - expected;
      if (Math.abs(diff) > 0.01) {
        discrepancies.push({ name: item.name, expected: +expected.toFixed(2), actual: +actualConsumed.toFixed(2), diff: +diff.toFixed(2) });
      }
    });
    inv.shift = 'closed';
    inv.closedAt = new Date();
    inv.closedBy = req.user.displayName || req.user.username;
    inv.cookNames = req.body.cookNames || [];
    inv.discrepancies = discrepancies;
    await inv.save();
    res.json({ ...inv.toObject(), expectedConsumption, discrepancies });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
