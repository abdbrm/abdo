// ملف: StockPage.js
// صفحة إدارة المخزون
// - الأدمن يشوف الكميات الموجودة ويسجل الدخول
// - الطباخ يعمل عد ويسجل الفروقات مع الأسباب
// - abdo يحدد وصفات الأصناف (مكونات كل صنف)

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api';

export default function StockPage() {
  const { user } = useAuth();
  const [stock, setStock] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [menu, setMenu] = useState([]);
  const [tab, setTab] = useState('stock'); // stock | add | recipes | log
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addForm, setAddForm] = useState({ name: '', quantity: '', unit: 'g', reason: '' });
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [toast, setToast] = useState('');

  const isSuperAdmin = user?.role === 'superadmin';

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // تحميل البيانات
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, r, m] = await Promise.all([
        API.get('/stock'),
        API.get('/stock/recipes'),
        API.get('/menu')
      ]);
      setStock(s.data);
      setRecipes(r.data);
      setMenu(m.data);
    } catch {}
    setLoading(false);
  };

  const loadLog = async () => {
    try {
      const r = await API.get('/stock/log');
      setLog(r.data);
    } catch {}
  };

  // إضافة بضاعة جديدة
  const handleAdd = async () => {
    if (!addForm.name || !addForm.quantity) return showToast('اكتب الاسم والكمية');
    try {
      await API.post('/stock/add', addForm);
      showToast('✓ تمت الإضافة');
      setAddForm({ name: '', quantity: '', unit: 'g', reason: '' });
      loadAll();
    } catch { showToast('خطأ'); }
  };

  // تعديل الكمية بعد العد
  const handleAdjust = async () => {
    if (!adjustQty || !adjustReason) return showToast('اكتب الكمية والسبب');
    try {
      await API.post('/stock/adjust', {
        name: adjustItem.name,
        newQty: Number(adjustQty),
        reason: adjustReason
      });
      showToast('✓ تم التعديل');
      setAdjustItem(null);
      setAdjustQty('');
      setAdjustReason('');
      loadAll();
    } catch { showToast('خطأ'); }
  };

  const unitLabel = (u) => ({ g:'جم', kg:'كج', pcs:'قطعة', ml:'مل', l:'لتر' }[u] || u);

  const isLow = (item) => item.minQty > 0 && item.currentQty <= item.minQty;

  if (loading) return <div style={styles.center}><div className="spinner" /></div>;

  return (
    <div className="page">
      {/* Header */}
      <div className="topbar">
        <span className="logo">المخزون</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {stock.filter(isLow).length > 0 && (
            <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
              ⚠️ {stock.filter(isLow).length} تحذير
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab${tab==='stock'?' active':''}`} onClick={() => setTab('stock')}>المخزون</button>
        <button className={`tab${tab==='add'?' active':''}`} onClick={() => setTab('add')}>إضافة</button>
        {isSuperAdmin && <button className={`tab${tab==='recipes'?' active':''}`} onClick={() => setTab('recipes')}>الوصفات</button>}
        <button className={`tab${tab==='log'?' active':''}`} onClick={() => { setTab('log'); loadLog(); }}>السجل</button>
      </div>

      {/* تاب المخزون الحالي */}
      {tab === 'stock' && (
        <div style={{ padding: 16 }}>
          {stock.length === 0 ? (
            <div className="empty">مفيش مكونات متسجلة لسه</div>
          ) : stock.map(item => (
            <div key={item._id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0', borderBottom: '1px solid var(--border)',
              background: isLow(item) ? 'rgba(231,76,60,0.05)' : 'transparent'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {isLow(item) && <span style={{ color: 'var(--red)', marginRight: 6 }}>⚠️</span>}
                  {item.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  الحد الأدنى: {item.minQty} {unitLabel(item.unit)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: isLow(item) ? 'var(--red)' : 'var(--gold)' }}>
                  {item.currentQty} {unitLabel(item.unit)}
                </div>
                <button
                  onClick={() => { setAdjustItem(item); setAdjustQty(String(item.currentQty)); }}
                  style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text3)', marginTop: 4 }}
                >
                  تعديل
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* تاب الإضافة */}
      {tab === 'add' && (
        <div style={{ padding: 16 }}>
          <div className="section-title">تسجيل دخول بضاعة</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* اختيار المكون */}
            <div>
              <div style={styles.label}>اسم المكون</div>
              <input
                list="stock-names"
                value={addForm.name}
                onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                placeholder="دجاج، بطاطس..."
                style={styles.input}
              />
              <datalist id="stock-names">
                {stock.map(s => <option key={s._id} value={s.name} />)}
              </datalist>
            </div>

            {/* الكمية */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={styles.label}>الكمية</div>
                <input
                  type="number"
                  value={addForm.quantity}
                  onChange={e => setAddForm(p => ({ ...p, quantity: e.target.value }))}
                  placeholder="0"
                  style={styles.input}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.label}>الوحدة</div>
                <select
                  value={addForm.unit}
                  onChange={e => setAddForm(p => ({ ...p, unit: e.target.value }))}
                  style={styles.input}
                >
                  <option value="g">جرام</option>
                  <option value="kg">كيلو</option>
                  <option value="pcs">قطعة</option>
                  <option value="ml">مل</option>
                  <option value="l">لتر</option>
                </select>
              </div>
            </div>

            {/* ملاحظة */}
            <div>
              <div style={styles.label}>ملاحظة (اختياري)</div>
              <input
                value={addForm.reason}
                onChange={e => setAddForm(p => ({ ...p, reason: e.target.value }))}
                placeholder="مثلاً: توريد جديد"
                style={styles.input}
              />
            </div>

            <button onClick={handleAdd} className="btn btn-gold" style={{ padding: 15, fontSize: 15 }}>
              ✓ تسجيل الإضافة
            </button>
          </div>
        </div>
      )}

      {/* تاب الوصفات - لـ abdo فقط */}
      {tab === 'recipes' && isSuperAdmin && (
        <RecipesTab menu={menu} recipes={recipes} onSave={loadAll} showToast={showToast} />
      )}

      {/* تاب السجل */}
      {tab === 'log' && (
        <div style={{ padding: 16 }}>
          <div className="section-title">سجل الحركات</div>
          {log.length === 0 ? <div className="empty">مفيش حركات</div> : log.map(l => (
            <div key={l._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>{l.ingredientName}</span>
                <span style={{
                  color: l.type === 'in' ? 'var(--green)' : l.type === 'out' ? 'var(--red)' : 'var(--gold)',
                  fontWeight: 700
                }}>
                  {l.type === 'in' ? '+' : l.type === 'out' ? '-' : '~'}{l.quantity}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                {l.reason} {l.by ? `· ${l.by}` : ''}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                {new Date(l.createdAt).toLocaleString('ru')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal تعديل الكمية بعد العد */}
      {adjustItem && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{adjustItem.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
              الحالي: {adjustItem.currentQty} {unitLabel(adjustItem.unit)}
            </div>

            <div style={styles.label}>الكمية الفعلية بعد العد</div>
            <input
              type="number"
              value={adjustQty}
              onChange={e => setAdjustQty(e.target.value)}
              style={{ ...styles.input, fontSize: 22, fontWeight: 700, textAlign: 'center' }}
              autoFocus
            />

            {Number(adjustQty) !== adjustItem.currentQty && (
              <div style={{ marginTop: 12 }}>
                <div style={styles.label}>سبب الفرق *</div>
                <select
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  style={styles.input}
                >
                  <option value="">اختار السبب...</option>
                  <option value="خطأ في العد السابق">خطأ في العد السابق</option>
                  <option value="تلف / انكسار">تلف / انكسار</option>
                  <option value="وصف من المطبخ">وصف من المطبخ</option>
                  <option value="إضافة غير مسجلة">إضافة غير مسجلة</option>
                  <option value="فرق في الوزن">فرق في الوزن</option>
                  <option value="سرقة">سرقة</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handleAdjust} className="btn btn-gold" style={{ flex: 1 }}>حفظ</button>
              <button onClick={() => setAdjustItem(null)} className="btn btn-dark" style={{ flex: 1 }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

// ==========================================
// كومبوننت الوصفات - لـ abdo فقط
// بيحدد مكونات كل صنف في المنيو
// ==========================================
function RecipesTab({ menu, recipes, onSave, showToast }) {
  const [selected, setSelected] = useState(null);
  const [ingredients, setIngredients] = useState([]);

  const getRecipe = (menuItemId) => recipes.find(r => r.menuItemId === menuItemId);

  const selectItem = (item) => {
    setSelected(item);
    const recipe = getRecipe(item._id);
    setIngredients(recipe?.ingredients || [{ name: '', quantity: '', unit: 'g' }]);
  };

  const addIngredient = () => setIngredients(p => [...p, { name: '', quantity: '', unit: 'g' }]);
  const removeIngredient = (i) => setIngredients(p => p.filter((_, idx) => idx !== i));
  const updateIngredient = (i, field, val) => {
    setIngredients(p => p.map((ing, idx) => idx === i ? { ...ing, [field]: val } : ing));
  };

  const save = async () => {
    try {
      await API.post('/stock/recipes', {
        menuItemId: selected._id,
        menuItemName: selected.name,
        ingredients: ingredients.filter(i => i.name && i.quantity)
      });
      showToast('✓ تم الحفظ');
      onSave();
    } catch { showToast('خطأ'); }
  };

  return (
    <div style={{ padding: 16 }}>
      <div className="section-title">وصفات الأصناف</div>
      <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text3)' }}>
        حدد مكونات كل صنف عشان المخزون يتخصم تلقائياً
      </div>

      {/* قائمة الأصناف */}
      {!selected ? (
        menu.map(item => {
          const hasRecipe = !!getRecipe(item._id);
          return (
            <div key={item._id}
              onClick={() => selectItem(item)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
            >
              <span style={{ fontSize: 14 }}>{item.name}</span>
              <span style={{ fontSize: 12, color: hasRecipe ? 'var(--green)' : 'var(--text3)' }}>
                {hasRecipe ? '✓ محدد' : 'لم يحدد بعد'}
              </span>
            </div>
          );
        })
      ) : (
        <div>
          <button onClick={() => setSelected(null)} style={{ marginBottom: 12, background: 'none', color: 'var(--gold)', fontSize: 14, border: 'none', cursor: 'pointer' }}>
            ← رجوع
          </button>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{selected.name}</div>

          {ingredients.map((ing, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input
                value={ing.name}
                onChange={e => updateIngredient(i, 'name', e.target.value)}
                placeholder="اسم المكون"
                style={{ ...styles.input, flex: 2, margin: 0 }}
              />
              <input
                type="number"
                value={ing.quantity}
                onChange={e => updateIngredient(i, 'quantity', e.target.value)}
                placeholder="الكمية"
                style={{ ...styles.input, flex: 1, margin: 0 }}
              />
              <select
                value={ing.unit}
                onChange={e => updateIngredient(i, 'unit', e.target.value)}
                style={{ ...styles.input, flex: 1, margin: 0 }}
              >
                <option value="g">جم</option>
                <option value="kg">كج</option>
                <option value="pcs">قطعة</option>
                <option value="ml">مل</option>
                <option value="l">لتر</option>
              </select>
              <button onClick={() => removeIngredient(i)} style={{ color: 'var(--red)', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
          ))}

          <button onClick={addIngredient} className="btn btn-dark" style={{ width: '100%', marginBottom: 12 }}>+ إضافة مكون</button>
          <button onClick={save} className="btn btn-gold" style={{ width: '100%', padding: 14 }}>✓ حفظ الوصفة</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, color: 'var(--text3)', marginBottom: 6, fontWeight: 600 },
  input: { width: '100%', padding: '12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 15, boxSizing: 'border-box' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: 'var(--bg2)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 380 },
  toast: { position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 20px', fontSize: 14, fontWeight: 600, zIndex: 9999 }
};
