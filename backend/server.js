const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.set('io', io);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/shift', require('./routes/shift'));
app.use('/api/cleaner', require('./routes/cleaner'));
// نظام المخزون الجديد
app.use('/api/stock', require('./routes/stock'));

app.get('/ping', (req, res) => res.json({ ok: true }));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Online users tracking
const onlineUsers = new Map();
io.on('connection', socket => {
  socket.on('userOnline', data => {
    onlineUsers.set(socket.id, { ...data, since: new Date() });
    io.emit('onlineUsers', Array.from(onlineUsers.values()));
  });
  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    io.emit('onlineUsers', Array.from(onlineUsers.values()));
  });
});

app.get('/api/online', (req, res) => res.json(Array.from(onlineUsers.values())));

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('MongoDB connected');
  await seed();
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server on port ${PORT}`));
}).catch(err => console.error('MongoDB error:', err.message));

async function seed() {
  const User = require('./models/User');
  const MenuItem = require('./models/MenuItem');

  // Seed superadmin
  const existing = await User.findOne({ username: 'abdo' });
  if (!existing) {
    await new User({ username: 'abdo', password: 'neon2024', role: 'superadmin', displayName: 'Abdo' }).save();
    console.log('Superadmin created: abdo / neon2024');
  } else {
    console.log('Superadmin exists');
  }

  // Seed menu
  const count = await MenuItem.countDocuments();
  if (count === 0) {
    await seedMenu(MenuItem);
    console.log('Menu seeded');
  }
}

async function seedMenu(MenuItem) {
  const menu = [
    { name:'Нарезка лимона', category:'Холодные закуски', price:100 , ingredients: [{"inventoryName": "Лимон", "quantity": 100, "unit": "г"}]},
    { name:'Нарезка апельсина', category:'Холодные закуски', price:100 , ingredients: [{"inventoryName": "Апельсин", "quantity": 100, "unit": "г"}]},
    { name:'Овощная тарелка', category:'Холодные закуски', price:500, weight:'300г', description:'свежий помидор, огурец, болгарский перец, редис, маслины, соус песто' , ingredients: [{"inventoryName": "Помидоры", "quantity": 60, "unit": "г"}, {"inventoryName": "Огурцы", "quantity": 60, "unit": "г"}, {"inventoryName": "Болгарский перец", "quantity": 50, "unit": "г"}, {"inventoryName": "Редис", "quantity": 40, "unit": "г"}, {"inventoryName": "Оливки", "quantity": 30, "unit": "г"}]},
    { name:'Тарелка с солёными', category:'Холодные закуски', price:550, weight:'400г', description:'маринованные шампиньоны, томаты, корнишоны, лук, капуста, морковь по-корейски' , ingredients: [{"inventoryName": "Грибы маринованные", "quantity": 80, "unit": "г"}, {"inventoryName": "Помидоры маринованные", "quantity": 80, "unit": "г"}, {"inventoryName": "Огурцы маринованные", "quantity": 80, "unit": "г"}, {"inventoryName": "Морковь по-корейски", "quantity": 60, "unit": "г"}, {"inventoryName": "Капуста маринованная", "quantity": 60, "unit": "г"}, {"inventoryName": "Черемша маринованная", "quantity": 40, "unit": "г"}]},
    { name:'Мясная тарелка', category:'Холодные закуски', price:600, weight:'300г', description:'колбаса п/к, с/к, ветчина, буженина, пастрома, маслины, помидоры черри, хрен' , ingredients: [{"inventoryName": "Полукопчёная колбаса", "quantity": 50, "unit": "г"}, {"inventoryName": "Сырокопчёная колбаса", "quantity": 50, "unit": "г"}, {"inventoryName": "Ветчина", "quantity": 50, "unit": "г"}, {"inventoryName": "Буженина", "quantity": 50, "unit": "г"}, {"inventoryName": "Пастрома", "quantity": 50, "unit": "г"}, {"inventoryName": "Оливки", "quantity": 20, "unit": "г"}, {"inventoryName": "Помидоры черри", "quantity": 30, "unit": "г"}]},
    { name:'Сырное ассорти', category:'Холодные закуски', price:600, weight:'300г', description:'брынза, голландский, российский, гауда, пармезан, грецкий орех, виноград, мёд' , ingredients: [{"inventoryName": "Фета", "quantity": 50, "unit": "г"}, {"inventoryName": "Голландский", "quantity": 50, "unit": "г"}, {"inventoryName": "Российский", "quantity": 50, "unit": "г"}, {"inventoryName": "Гауда", "quantity": 50, "unit": "г"}, {"inventoryName": "Пармезан", "quantity": 50, "unit": "г"}, {"inventoryName": "Виноград", "quantity": 30, "unit": "г"}, {"inventoryName": "Мёд", "quantity": 20, "unit": "г"}]},
    { name:'Фруктовое ассорти', category:'Холодные закуски', price:550, weight:'400г', description:'яблоко, груша, киви, апельсин, виноград, сахарная пудра, мята' , ingredients: [{"inventoryName": "Яблоко", "quantity": 80, "unit": "г"}, {"inventoryName": "Груша", "quantity": 80, "unit": "г"}, {"inventoryName": "Киви", "quantity": 60, "unit": "г"}, {"inventoryName": "Апельсин", "quantity": 80, "unit": "г"}, {"inventoryName": "Виноград", "quantity": 80, "unit": "г"}]},
    { name:'Сэндвич с курицей', category:'Холодные закуски', price:300, weight:'180г', description:'курица, айсберг, помидор, сыр' , ingredients: [{"inventoryName": "Хлеб для сэндвичей", "quantity": 60, "unit": "г"}, {"inventoryName": "Курица", "quantity": 70, "unit": "г"}, {"inventoryName": "Айсберг", "quantity": 20, "unit": "г"}, {"inventoryName": "Помидоры", "quantity": 20, "unit": "г"}, {"inventoryName": "Для сэндвичей", "quantity": 20, "unit": "г"}]},
    { name:'Сэндвич с ветчиной и сыром', category:'Холодные закуски', price:300, weight:'180г', description:'ветчина, айсберг, помидор, сыр' , ingredients: [{"inventoryName": "Хлеб для сэндвичей", "quantity": 60, "unit": "г"}, {"inventoryName": "Ветчина", "quantity": 70, "unit": "г"}, {"inventoryName": "Айсберг", "quantity": 20, "unit": "г"}, {"inventoryName": "Помидоры", "quantity": 20, "unit": "г"}, {"inventoryName": "Для сэндвичей", "quantity": 20, "unit": "г"}]},
    { name:'Четыре сыра', category:'Пицца', price:500, weight:'600г', description:'голландский, моцарелла, пармезан, брынза, соус белый' , ingredients: [{"inventoryName": "Голландский", "quantity": 50, "unit": "г"}, {"inventoryName": "Моцарелла", "quantity": 80, "unit": "г"}, {"inventoryName": "Пармезан", "quantity": 40, "unit": "г"}, {"inventoryName": "Фета", "quantity": 40, "unit": "г"}]},
    { name:'Маргарита', category:'Пицца', price:500, weight:'600г', description:'помидор, моцарелла, соус красный' , ingredients: [{"inventoryName": "Помидоры", "quantity": 80, "unit": "г"}, {"inventoryName": "Моцарелла", "quantity": 100, "unit": "г"}]},
    { name:'Карбонара', category:'Пицца', price:600, weight:'600г', description:'бекон, ветчина, моцарелла, соус белый, желток' , ingredients: [{"inventoryName": "Бекон", "quantity": 60, "unit": "г"}, {"inventoryName": "Ветчина", "quantity": 60, "unit": "г"}, {"inventoryName": "Моцарелла", "quantity": 80, "unit": "г"}, {"inventoryName": "Яйца", "quantity": 1, "unit": "шт"}, {"inventoryName": "Сливки", "quantity": 30, "unit": "мл"}]},
    { name:'Охотская', category:'Пицца', price:600, weight:'600г', description:'колбаса п/к, с/к, моцарелла, соус красный' , ingredients: [{"inventoryName": "Полукопчёная колбаса", "quantity": 60, "unit": "г"}, {"inventoryName": "Сырокопчёная колбаса", "quantity": 60, "unit": "г"}, {"inventoryName": "Моцарелла", "quantity": 80, "unit": "г"}]},
    { name:'Фермерская', category:'Пицца', price:600, weight:'600г', description:'курица, ветчина, грибы, моцарелла, соус белый' , ingredients: [{"inventoryName": "Курица", "quantity": 80, "unit": "г"}, {"inventoryName": "Ветчина", "quantity": 50, "unit": "г"}, {"inventoryName": "Грибы", "quantity": 50, "unit": "г"}, {"inventoryName": "Моцарелла", "quantity": 80, "unit": "г"}]},
    { name:'Баварская', category:'Пицца', price:600, weight:'600г', description:'колбаса п/к, ветчина, курица, пастрома, бекон, моцарелла, соус красный' , ingredients: [{"inventoryName": "Полукопчёная колбаса", "quantity": 40, "unit": "г"}, {"inventoryName": "Ветчина", "quantity": 40, "unit": "г"}, {"inventoryName": "Курица", "quantity": 40, "unit": "г"}, {"inventoryName": "Пастрома", "quantity": 40, "unit": "г"}, {"inventoryName": "Бекон", "quantity": 40, "unit": "г"}, {"inventoryName": "Моцарелла", "quantity": 80, "unit": "г"}]},
    { name:'Греческий', category:'Салаты', price:400, weight:'300г', description:'огурец, черри, болгарский перец, маслины, айсберг, фета, соус песто' , ingredients: [{"inventoryName": "Огурцы", "quantity": 60, "unit": "г"}, {"inventoryName": "Помидоры черри", "quantity": 60, "unit": "г"}, {"inventoryName": "Болгарский перец", "quantity": 40, "unit": "г"}, {"inventoryName": "Оливки", "quantity": 30, "unit": "г"}, {"inventoryName": "Айсберг", "quantity": 40, "unit": "г"}, {"inventoryName": "Фета", "quantity": 60, "unit": "г"}]},
    { name:'Цезарь с курицей', category:'Салаты', price:450, weight:'200г', description:'курица, гренки, айсберг, черри, пармезан, фирменный соус' , ingredients: [{"inventoryName": "Курица", "quantity": 80, "unit": "г"}, {"inventoryName": "Хлеб для гренок", "quantity": 30, "unit": "г"}, {"inventoryName": "Айсберг", "quantity": 50, "unit": "г"}, {"inventoryName": "Помидоры черри", "quantity": 30, "unit": "г"}, {"inventoryName": "Пармезан", "quantity": 20, "unit": "г"}]},
    { name:'Цезарь с тунцом', category:'Салаты', price:500, weight:'300г', description:'тунец, гренки, айсберг, черри, пармезан, фирменный соус' , ingredients: [{"inventoryName": "Тунец", "quantity": 80, "unit": "г"}, {"inventoryName": "Хлеб для гренок", "quantity": 30, "unit": "г"}, {"inventoryName": "Айсберг", "quantity": 50, "unit": "г"}, {"inventoryName": "Помидоры черри", "quantity": 30, "unit": "г"}, {"inventoryName": "Пармезан", "quantity": 20, "unit": "г"}]},
    { name:'Салат с беконом и сыром', category:'Салаты', price:500, weight:'280г', description:'бекон, голландский, айсберг, черри, гренки, соус сладкий чили, лимон' , ingredients: [{"inventoryName": "Бекон", "quantity": 60, "unit": "г"}, {"inventoryName": "Голландский", "quantity": 50, "unit": "г"}, {"inventoryName": "Айсберг", "quantity": 50, "unit": "г"}, {"inventoryName": "Помидоры черри", "quantity": 30, "unit": "г"}, {"inventoryName": "Хлеб для гренок", "quantity": 30, "unit": "г"}]},
    { name:'Салат «Нежный»', category:'Салаты', price:400, weight:'280г', description:'курица, кукуруза, пармезан, листья салата, черри, майонезно-горчичный соус' , ingredients: [{"inventoryName": "Курица", "quantity": 80, "unit": "г"}, {"inventoryName": "Кукуруза", "quantity": 40, "unit": "г"}, {"inventoryName": "Пармезан", "quantity": 20, "unit": "г"}, {"inventoryName": "Айсберг", "quantity": 50, "unit": "г"}, {"inventoryName": "Помидоры черри", "quantity": 30, "unit": "г"}]},
    { name:'Болоньезе', category:'Паста', price:550, weight:'300г', description:'говяжий фарш, томаты, томатная паста, пармезан, итальянские травы', hasSauce:false , ingredients: [{"inventoryName": "Паста", "quantity": 100, "unit": "г"}, {"inventoryName": "Помидоры", "quantity": 80, "unit": "г"}, {"inventoryName": "Пармезан", "quantity": 20, "unit": "г"}]},
    { name:'Карбонара', category:'Паста', price:500, weight:'300г', description:'бекон, ветчина, пармезан, сливки, черри, желток, итальянские травы', hasSauce:false , ingredients: [{"inventoryName": "Паста", "quantity": 100, "unit": "г"}, {"inventoryName": "Бекон", "quantity": 50, "unit": "г"}, {"inventoryName": "Ветчина", "quantity": 50, "unit": "г"}, {"inventoryName": "Пармезан", "quantity": 20, "unit": "г"}, {"inventoryName": "Сливки", "quantity": 50, "unit": "мл"}, {"inventoryName": "Помидоры черри", "quantity": 30, "unit": "г"}, {"inventoryName": "Яйца", "quantity": 1, "unit": "шт"}]},
    { name:'Курица-грибы', category:'Паста', price:450, weight:'300г', description:'курица, грибы, сливки, черри, пармезан, зелень', hasSauce:false , ingredients: [{"inventoryName": "Паста", "quantity": 100, "unit": "г"}, {"inventoryName": "Курица", "quantity": 80, "unit": "г"}, {"inventoryName": "Грибы", "quantity": 60, "unit": "г"}, {"inventoryName": "Сливки", "quantity": 50, "unit": "мл"}, {"inventoryName": "Помидоры черри", "quantity": 30, "unit": "г"}, {"inventoryName": "Пармезан", "quantity": 20, "unit": "г"}, {"inventoryName": "Зелень", "quantity": 10, "unit": "г"}]},
    { name:'Скоблянка', category:'Горячие блюда', price:500, weight:'400г', description:'курица, картофельные дольки, болгарский перец, шампиньоны, сливки, зелёный лук', hasSauce:true , ingredients: [{"inventoryName": "Курица", "quantity": 120, "unit": "г"}, {"inventoryName": "Картофель дольки", "quantity": 120, "unit": "г"}, {"inventoryName": "Болгарский перец", "quantity": 40, "unit": "г"}, {"inventoryName": "Грибы", "quantity": 60, "unit": "г"}, {"inventoryName": "Сливки", "quantity": 50, "unit": "мл"}, {"inventoryName": "Зелень", "quantity": 10, "unit": "г"}]},
    { name:'Сковородка с курицей и овощами', category:'Горячие блюда', price:500, weight:'400г', description:'курица, картофельные дольки, помидор, болгарский перец, зелень', hasSauce:true , ingredients: [{"inventoryName": "Курица", "quantity": 150, "unit": "г"}, {"inventoryName": "Картофель дольки", "quantity": 120, "unit": "г"}, {"inventoryName": "Помидоры", "quantity": 50, "unit": "г"}, {"inventoryName": "Болгарский перец", "quantity": 50, "unit": "г"}, {"inventoryName": "Зелень", "quantity": 10, "unit": "г"}]},
    { name:'Сковородка с курицей и грибами', category:'Горячие блюда', price:500, weight:'400г', description:'курица, картофельные дольки, шампиньоны, пармезан, зелень', hasSauce:true , ingredients: [{"inventoryName": "Курица", "quantity": 150, "unit": "г"}, {"inventoryName": "Картофель дольки", "quantity": 120, "unit": "г"}, {"inventoryName": "Грибы", "quantity": 60, "unit": "г"}, {"inventoryName": "Пармезан", "quantity": 20, "unit": "г"}, {"inventoryName": "Зелень", "quantity": 10, "unit": "г"}]},
    { name:'Пивной сет', category:'Закуски к пиву', price:1300, weight:'600г', description:'картофель фри, палочки, наггетсы, гренки чесночные, луковые кольца, сыр косичка', hasSauce:true , ingredients: [{"inventoryName": "Картофель фри", "quantity": 100, "unit": "г"}, {"inventoryName": "Картофельные палочки", "quantity": 5, "unit": "шт"}, {"inventoryName": "Наггетсы", "quantity": 5, "unit": "шт"}, {"inventoryName": "Хлеб чёрный", "quantity": 80, "unit": "г"}, {"inventoryName": "Сыр косичка", "quantity": 80, "unit": "г"}]},
    { name:'Мясная закуска к пиву', category:'Закуски к пиву', price:1500, weight:'800г', description:'рёбрышки свиные, уши свиные, охотские колбаски, стрипсы, наггетсы, мясные чипсы', hasSauce:true , ingredients: [{"inventoryName": "Рёбра", "quantity": 150, "unit": "г"}, {"inventoryName": "Уши", "quantity": 100, "unit": "г"}, {"inventoryName": "Чипсы мясные", "quantity": 60, "unit": "г"}, {"inventoryName": "Стрипсы куриные", "quantity": 3, "unit": "шт"}, {"inventoryName": "Наггетсы", "quantity": 5, "unit": "шт"}]},
    { name:'Куриные стрипсы', category:'Закуски к пиву', price:400, weight:'6шт', hasSauce:true , ingredients: [{"inventoryName": "Стрипсы куриные", "quantity": 6, "unit": "шт"}]},
    { name:'Наггетсы', category:'Закуски к пиву', price:350, weight:'10шт', hasSauce:true , ingredients: [{"inventoryName": "Наггетсы", "quantity": 10, "unit": "шт"}]},
    { name:'Луковые кольца', category:'Закуски к пиву', price:350, weight:'10шт', hasSauce:true },
    { name:'Картофельные палочки', category:'Закуски к пиву', price:250, weight:'10шт', hasSauce:true , ingredients: [{"inventoryName": "Картофельные палочки", "quantity": 10, "unit": "шт"}]},
    { name:'Картофель фри', category:'Закуски к пиву', price:200, weight:'180г', hasSauce:true , ingredients: [{"inventoryName": "Картофель фри", "quantity": 180, "unit": "г"}]},
    { name:'Картофель айдахо', category:'Закуски к пиву', price:200, weight:'180г', hasSauce:true , ingredients: [{"inventoryName": "Картофель дольки", "quantity": 180, "unit": "г"}]},
    { name:'Гренки чесночные', category:'Закуски к пиву', price:200, weight:'120г', hasSauce:true , ingredients: [{"inventoryName": "Хлеб чёрный", "quantity": 120, "unit": "г"}]},
    { name:'Жареные пельмени куриные', category:'Закуски к пиву', price:300, weight:'200г', hasSauce:true , ingredients: [{"inventoryName": "Пельмени", "quantity": 200, "unit": "г"}]},
    { name:'Сыр косичка', category:'Закуски к пиву', price:200, weight:'80г' , ingredients: [{"inventoryName": "Сыр косичка", "quantity": 80, "unit": "г"}]},
    { name:'Сыр косичка с лимоном', category:'Закуски к пиву', price:250, weight:'100г' , ingredients: [{"inventoryName": "Сыр косичка", "quantity": 100, "unit": "г"}, {"inventoryName": "Лимон", "quantity": 20, "unit": "г"}]},
    { name:'Соус в ассортименте', category:'Закуски к пиву', price:50, weight:'30г' },
    { name:'Чипсы «Лэйс»', category:'Снеки', price:200, weight:'70г' },
    { name:'Сухарики «Кириешки»', category:'Снеки', price:100, weight:'30г' },
    { name:'Фисташки', category:'Снеки', price:250, weight:'25г' },
    { name:'Арахис', category:'Снеки', price:150 },
    { name:'Шоколад Milka', category:'Снеки', price:200 },
  ];
  await MenuItem.insertMany(menu.map((item, i) => ({ ...item, order: i, hasSauce: item.hasSauce || false })));
}
