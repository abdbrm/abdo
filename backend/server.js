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
    { name:'Нарезка лимона', category:'Холодные закуски', price:100 },
    { name:'Нарезка апельсина', category:'Холодные закуски', price:100 },
    { name:'Овощная тарелка', category:'Холодные закуски', price:500, weight:'300г', description:'свежий помидор, огурец, болгарский перец, редис, маслины, соус песто' },
    { name:'Тарелка с солёными', category:'Холодные закуски', price:550, weight:'400г', description:'маринованные шампиньоны, томаты, корнишоны, лук, капуста, морковь по-корейски' },
    { name:'Мясная тарелка', category:'Холодные закуски', price:600, weight:'300г', description:'колбаса п/к, с/к, ветчина, буженина, пастрома, маслины, помидоры черри, хрен' },
    { name:'Сырное ассорти', category:'Холодные закуски', price:600, weight:'300г', description:'брынза, голландский, российский, гауда, пармезан, грецкий орех, виноград, мёд' },
    { name:'Фруктовое ассорти', category:'Холодные закуски', price:550, weight:'400г', description:'яблоко, груша, киви, апельсин, виноград, сахарная пудра, мята' },
    { name:'Сэндвич с курицей', category:'Холодные закуски', price:300, weight:'180г', description:'курица, айсберг, помидор, сыр' },
    { name:'Сэндвич с ветчиной и сыром', category:'Холодные закуски', price:300, weight:'180г', description:'ветчина, айсберг, помидор, сыр' },
    { name:'Четыре сыра', category:'Пицца', price:500, weight:'600г', description:'голландский, моцарелла, пармезан, брынза, соус белый' },
    { name:'Маргарита', category:'Пицца', price:500, weight:'600г', description:'помидор, моцарелла, соус красный' },
    { name:'Карбонара', category:'Пицца', price:600, weight:'600г', description:'бекон, ветчина, моцарелла, соус белый, желток' },
    { name:'Охотская', category:'Пицца', price:600, weight:'600г', description:'колбаса п/к, с/к, моцарелла, соус красный' },
    { name:'Фермерская', category:'Пицца', price:600, weight:'600г', description:'курица, ветчина, грибы, моцарелла, соус белый' },
    { name:'Баварская', category:'Пицца', price:600, weight:'600г', description:'колбаса п/к, ветчина, курица, пастрома, бекон, моцарелла, соус красный' },
    { name:'Греческий', category:'Салаты', price:400, weight:'300г', description:'огурец, черри, болгарский перец, маслины, айсберг, фета, соус песто' },
    { name:'Цезарь с курицей', category:'Салаты', price:450, weight:'200г', description:'курица, гренки, айсберг, черри, пармезан, фирменный соус' },
    { name:'Цезарь с тунцом', category:'Салаты', price:500, weight:'300г', description:'тунец, гренки, айсберг, черри, пармезан, фирменный соус' },
    { name:'Салат с беконом и сыром', category:'Салаты', price:500, weight:'280г', description:'бекон, голландский, айсберг, черри, гренки, соус сладкий чили, лимон' },
    { name:'Салат «Нежный»', category:'Салаты', price:400, weight:'280г', description:'курица, кукуруза, пармезан, листья салата, черри, майонезно-горчичный соус' },
    { name:'Болоньезе', category:'Паста', price:550, weight:'300г', description:'говяжий фарш, томаты, томатная паста, пармезан, итальянские травы', hasSauce:false },
    { name:'Карбонара', category:'Паста', price:500, weight:'300г', description:'бекон, ветчина, пармезан, сливки, черри, желток, итальянские травы', hasSauce:false },
    { name:'Курица-грибы', category:'Паста', price:450, weight:'300г', description:'курица, грибы, сливки, черри, пармезан, зелень', hasSauce:false },
    { name:'Скоблянка', category:'Горячие блюда', price:500, weight:'400г', description:'курица, картофельные дольки, болгарский перец, шампиньоны, сливки, зелёный лук', hasSauce:true },
    { name:'Сковородка с курицей и овощами', category:'Горячие блюда', price:500, weight:'400г', description:'курица, картофельные дольки, помидор, болгарский перец, зелень', hasSauce:true },
    { name:'Сковородка с курицей и грибами', category:'Горячие блюда', price:500, weight:'400г', description:'курица, картофельные дольки, шампиньоны, пармезан, зелень', hasSauce:true },
    { name:'Пивной сет', category:'Закуски к пиву', price:1300, weight:'600г', description:'картофель фри, палочки, наггетсы, гренки чесночные, луковые кольца, сыр косичка', hasSauce:true },
    { name:'Мясная закуска к пиву', category:'Закуски к пиву', price:1500, weight:'800г', description:'рёбрышки свиные, уши свиные, охотские колбаски, стрипсы, наггетсы, мясные чипсы', hasSauce:true },
    { name:'Куриные стрипсы', category:'Закуски к пиву', price:400, weight:'6шт', hasSauce:true },
    { name:'Наггетсы', category:'Закуски к пиву', price:350, weight:'10шт', hasSauce:true },
    { name:'Луковые кольца', category:'Закуски к пиву', price:350, weight:'10шт', hasSauce:true },
    { name:'Картофельные палочки', category:'Закуски к пиву', price:250, weight:'10шт', hasSauce:true },
    { name:'Картофель фри', category:'Закуски к пиву', price:200, weight:'180г', hasSauce:true },
    { name:'Картофель айдахо', category:'Закуски к пиву', price:200, weight:'180г', hasSauce:true },
    { name:'Гренки чесночные', category:'Закуски к пиву', price:200, weight:'120г', hasSauce:true },
    { name:'Жареные пельмени куриные', category:'Закуски к пиву', price:300, weight:'200г', hasSauce:true },
    { name:'Сыр косичка', category:'Закуски к пиву', price:200, weight:'80г' },
    { name:'Сыр косичка с лимоном', category:'Закуски к пиву', price:250, weight:'100г' },
    { name:'Соус в ассортименте', category:'Закуски к пиву', price:50, weight:'30г' },
    { name:'Чипсы «Лэйс»', category:'Снеки', price:200, weight:'70г' },
    { name:'Сухарики «Кириешки»', category:'Снеки', price:100, weight:'30г' },
    { name:'Фисташки', category:'Снеки', price:250, weight:'25г' },
    { name:'Арахис', category:'Снеки', price:150 },
    { name:'Шоколад Milka', category:'Снеки', price:200 },
  ];
  await MenuItem.insertMany(menu.map((item, i) => ({ ...item, order: i, hasSauce: item.hasSauce || false })));
}
