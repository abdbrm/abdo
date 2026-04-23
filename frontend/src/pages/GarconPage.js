import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useSocket } from '../hooks/useSocket';
import { useSound } from '../hooks/useSound';
import API from '../api';

const CLUB_COLORS = { neon:'#00ffcc', elvis:'#ff6b6b', enot:'#a29bfe' };

export default function GarconPage() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { notify } = useSound();
  const [menu, setMenu] = useState([]);
  const [unavail, setUnavail] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [table, setTable] = useState(null);
  const [comment, setComment] = useState('');
  const [tab, setTab] = useState('tables');
  const [catFilter, setCatFilter] = useState(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);

  const clubColor = CLUB_COLORS[user?.club] || 'var(--gold)';
  const tables = Array.from({ length: settings.tableCount || 15 }, (_, i) => i + 1);

  useEffect(() => {
    if ('Notification' in window) Notification.requestPermission();
    loadMenu(); loadOrders();
  }, []);

  useSocket({
    menuUpdated: () => loadMenu(),
    orderUpdated: order => {
      setOrders(p => p.map(o => o._id === order._id ? order : o));
      if (order.status === 'ready' && (order.garconId === user?._id || order.garconName === (user?.displayName || user?.username))) {
        notify(`✓ Готов — стол #${order.tableNumber}`);
      }
      if (order.status === 'delivered' && settings.garconPrompt && (order.garconId === user?._id || order.garconName === (user?.displayName || user?.username))) {
        setRating(0); setShowRating(true);
      }
    }
  });

  const loadMenu = async () => {
    try {
      const [m, u] = await Promise.all([API.get('/menu'), API.get('/menu/unavailable')]);
      setMenu(m.data);
      setUnavail(u.data.map(i => i._id));
    } catch {}
  };

  const loadOrders = async () => {
    try { const r = await API.get('/orders/today'); setOrders(r.data); } catch {}
  };

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const cats = [...new Set(menu.map(i => i.category))];
  const filtered = menu.filter(i => !catFilter || i.category === catFilter);

  const addToCart = (item, sauce = null) => {
    const id = item._id + (sauce || '');
    setCart(p => {
      const ex = p.find(c => c._id === id);
      if (ex) return p.map(c => c._id === id ? { ...c, qty: c.qty + 1 } : c);
      return [...p, { ...item, _id: id, origId: item._id, qty: 1, sauce, note: '' }];
    });
  };

  const updateQty = (id, delta) => setCart(p => p.map(c => c._id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  const updateNote = (id, v) => setCart(p => p.map(c => c._id === id ? { ...c, note: v } : c));

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const sendOrder = async () => {
    if (!cart.length || !table) return;
    setSending(true);
    try {
      await API.post('/orders', {
        tableNumber: table,
        items: cart.map(i => ({ menuItemId: i.origId, name: i.name, quantity: i.qty, price: i.price, sauce: i.sauce, note: i.note })),
        comment
      });
      setCart([]); setComment(''); setTab('tables');
      showToast('✓ Заказ отправлен');
      loadOrders();
    } catch { showToast('Ошибка отправки'); }
    finally { setSending(false); }
  };

  const myOrders = orders.filter(o => o.garconId === user?._id || o.garconName === (user?.displayName || user?.username));
  const pending = myOrders.filter(o => ['pending','confirmed'].includes(o.status)).length;
  const ready = myOrders.filter(o => o.status === 'ready').length;

  return (
    <div className="page">
      {/* Topbar */}
      <div className="topbar">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span className="logo">NEON</span>
          <span style={{ background: clubColor+'22', color: clubColor, padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>
            {(user?.club||'').toUpperCase()}
          </span>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {ready > 0 && (
            <span style={{ background:'var(--green)', color:'#000', borderRadius:20, padding:'4px 10px', fontSize:12, fontWeight:700, animation:'ring 1.5s infinite' }}>
              🔔 {ready} готово
            </span>
          )}
          <button onClick={logout} style={{ background:'none', color:'var(--text3)', fontSize:13 }}>Выйти</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { k:'tables', l:'🪑 Столы' },
          { k:'menu', l:'📋 Меню', d:!table },
          { k:'cart', l:`🛒${cartCount ? ` (${cartCount})` : ''}`, d:!table },
          { k:'orders', l:`📦${pending ? ` (${pending})` : ''}` },
        ].map(t => (
          <button key={t.k} className={`tab${tab===t.k?' active':''}`} onClick={() => !t.d && setTab(t.k)} style={{ opacity: t.d ? 0.35 : 1 }}>
            {t.l}
          </button>
        ))}
      </div>

      {table && tab !== 'tables' && (
        <div style={{ background:'var(--bg3)', padding:'8px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text2)' }}>
          Стол <span style={{ color: clubColor, fontWeight:700, fontSize:15 }}>#{table}</span>
          <span style={{ marginLeft:'auto', fontSize:12, color:'var(--text3)', cursor:'pointer' }} onClick={() => { setTable(null); setTab('tables'); setCart([]); }}>Сменить</span>
        </div>
      )}

      {/* TABLES */}
      {tab === 'tables' && (
        <div className="section">
          <div className="section-title">Выберите стол</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
            {tables.map(n => {
              const hasOrder = myOrders.some(o => o.tableNumber === n && ['pending','confirmed','ready'].includes(o.status));
              const isReady = myOrders.some(o => o.tableNumber === n && o.status === 'ready');
              return (
                <button key={n} onClick={() => { setTable(n); setTab('menu'); }} style={{
                  aspectRatio:'1', borderRadius:10,
                  background: isReady ? 'rgba(46,204,113,0.15)' : hasOrder ? 'rgba(232,200,74,0.08)' : 'var(--bg3)',
                  border: `2px solid ${isReady ? 'var(--green)' : hasOrder ? 'var(--gold)' : 'var(--border)'}`,
                  color: isReady ? 'var(--green)' : hasOrder ? 'var(--gold)' : 'var(--text2)',
                  fontSize:20, fontWeight:700, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2
                }}>
                  {n}
                  {isReady && <span style={{ fontSize:9 }}>ГОТОВО</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* MENU */}
      {tab === 'menu' && (
        <div>
          <div style={{ display:'flex', overflowX:'auto', gap:8, padding:'12px 16px', scrollbarWidth:'none' }}>
            <button onClick={() => setCatFilter(null)} style={{ padding:'6px 14px', borderRadius:20, fontSize:13, fontWeight:600, whiteSpace:'nowrap', background:!catFilter?'var(--gold)':'var(--bg3)', color:!catFilter?'#000':'var(--text2)', border:'1px solid var(--border)' }}>Все</button>
            {cats.map(c => (
              <button key={c} onClick={() => setCatFilter(c)} style={{ padding:'6px 14px', borderRadius:20, fontSize:13, fontWeight:600, whiteSpace:'nowrap', background:catFilter===c?'var(--gold)':'var(--bg3)', color:catFilter===c?'#000':'var(--text2)', border:'1px solid var(--border)' }}>{c}</button>
            ))}
          </div>
          <div style={{ padding:'0 16px 80px' }}>
            {filtered.map(item => {
              const isUnavail = unavail.includes(item._id);
              const inCart = cart.filter(c => c.origId === item._id).reduce((s,c) => s+c.qty, 0);
              return (
                <div key={item._id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border)', opacity: isUnavail ? 0.4 : 1 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:600 }}>{item.name} {isUnavail && <span style={{ fontSize:11, color:'var(--red)' }}>нет</span>}</div>
                    {item.description && <div style={{ fontSize:12, color:'var(--text3)', marginTop:2, lineHeight:1.4 }}>{item.description}</div>}
                    <div style={{ display:'flex', gap:8, marginTop:4, alignItems:'center' }}>
                      <span style={{ color:'var(--gold)', fontWeight:700 }}>{item.price}₽</span>
                      {item.weight && <span style={{ fontSize:12, color:'var(--text3)' }}>{item.weight}</span>}
                    </div>
                  </div>
                  {!isUnavail && (
                    <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
                      {item.hasSauce && settings.sauces?.length > 0
                        ? <SauceBtn sauces={settings.sauces} def={settings.defaultSauce} onAdd={s => addToCart(item, s)} />
                        : <button onClick={() => addToCart(item)} style={{ width:36, height:36, borderRadius:8, background:'var(--gold)', color:'#000', fontSize:22, fontWeight:700 }}>+</button>
                      }
                      {inCart > 0 && <span style={{ fontSize:11, color:'var(--gold)', fontWeight:700 }}>×{inCart}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {cartCount > 0 && (
            <div style={{ position:'fixed', bottom:0, left:0, right:0, padding:12, background:'var(--bg)', borderTop:'1px solid var(--border)' }}>
              <button onClick={() => setTab('cart')} className="btn btn-gold" style={{ width:'100%', padding:14, fontSize:15 }}>
                Корзина · {cartCount} поз. · {cartTotal}₽
              </button>
            </div>
          )}
        </div>
      )}

      {/* CART */}
      {tab === 'cart' && (
        <div className="section">
          {!cart.length ? <div className="empty">Корзина пуста</div> : (
            <>
              {cart.map(item => (
                <div key={item._id} className="card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600 }}>{item.name}</div>
                      {item.sauce && <div style={{ fontSize:12, color:'var(--text3)' }}>Соус: {item.sauce}</div>}
                      <div style={{ color:'var(--gold)', fontWeight:700, marginTop:4 }}>{item.price*item.qty}₽</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <button onClick={() => updateQty(item._id,-1)} style={{ width:32,height:32,borderRadius:6,background:'var(--bg4)',color:'var(--text)',fontSize:18 }}>−</button>
                      <span style={{ fontWeight:700, minWidth:20, textAlign:'center' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item._id,1)} style={{ width:32,height:32,borderRadius:6,background:'var(--gold)',color:'#000',fontSize:18 }}>+</button>
                    </div>
                  </div>
                  <input placeholder="Примечание..." value={item.note} onChange={e => updateNote(item._id, e.target.value)} style={{ fontSize:14, padding:'6px 10px' }} />
                </div>
              ))}
              <textarea placeholder="Общий комментарий..." value={comment} onChange={e => setComment(e.target.value)} rows={3} style={{ marginBottom:12, fontSize:14, resize:'none' }} />
              <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderTop:'1px solid var(--border)', marginBottom:12 }}>
                <span style={{ color:'var(--text2)' }}>Итого</span>
                <span style={{ color:'var(--gold)', fontWeight:700, fontSize:18 }}>{cartTotal}₽</span>
              </div>
              <button onClick={sendOrder} disabled={sending} className="btn btn-gold" style={{ width:'100%', padding:14, fontSize:15 }}>
                {sending ? 'Отправка...' : `✓ На кухню — стол #${table}`}
              </button>
            </>
          )}
        </div>
      )}

      {/* ORDERS */}
      {tab === 'orders' && (
        <div className="section">
          <div className="section-title">Мои заказы сегодня</div>
          {!myOrders.length ? <div className="empty">Заказов пока нет</div> : myOrders.map(o => <OrderCard key={o._id} order={o} />)}
        </div>
      )}

      {/* Rating modal */}
      {showRating && settings.garconPrompt && (
        <div className="modal-overlay" onClick={() => setShowRating(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign:'center', padding:'8px 0 8px' }}>
              <div style={{ fontSize:15, color:'var(--text2)', marginBottom:20, lineHeight:1.6 }}>{settings.garconPrompt}</div>
              <div style={{ display:'flex', justifyContent:'center', gap:12, marginBottom:24 }}>
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setRating(s)} style={{ fontSize:36, background:'none', border:'none', cursor:'pointer', opacity: rating>=s ? 1 : 0.25, transform: rating>=s ? 'scale(1.1)' : 'scale(1)', transition:'all 0.15s' }}>⭐</button>
                ))}
              </div>
              <button onClick={() => setShowRating(false)} className="btn btn-gold" style={{ width:'100%' }}>
                {rating > 0 ? `Отправить (${rating}/5)` : 'Пропустить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function SauceBtn({ sauces, def, onAdd }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(def || sauces[0]);
  return (
    <div style={{ position:'relative' }}>
      <div style={{ display:'flex', gap:2 }}>
        <button onClick={() => onAdd(sel)} style={{ padding:'6px 10px', borderRadius:'8px 0 0 8px', background:'var(--gold)', color:'#000', fontSize:12, fontWeight:700 }}>+{sel}</button>
        <button onClick={() => setOpen(!open)} style={{ padding:'6px 8px', borderRadius:'0 8px 8px 0', background:'var(--gold-dim)', color:'#000', fontSize:11 }}>▼</button>
      </div>
      {open && (
        <div style={{ position:'absolute', right:0, top:'100%', marginTop:4, zIndex:50, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, minWidth:150, overflow:'hidden', boxShadow:'var(--shadow)' }}>
          {sauces.map(s => (
            <button key={s} onClick={() => { setSel(s); setOpen(false); }} style={{ width:'100%', padding:'10px 14px', textAlign:'left', fontSize:14, background: s===sel?'var(--bg4)':'none', color: s===sel?'var(--gold)':'var(--text)', borderBottom:'1px solid var(--border)' }}>{s}</button>
          ))}
          <button onClick={() => { onAdd(null); setOpen(false); }} style={{ width:'100%', padding:'10px 14px', textAlign:'left', fontSize:14, color:'var(--text3)' }}>Без соуса</button>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }) {
  const STATUS = { pending:'Ожидает', confirmed:'Готовится', ready:'✓ Готов!', delivered:'Доставлен' };
  const COLORS = { pending:'var(--gold)', confirmed:'var(--blue)', ready:'var(--green)', delivered:'var(--text3)' };
  const moscowTime = d => new Date(new Date(d).getTime()+3*3600*1000).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'});
  return (
    <div className="card" style={{ borderLeft: `3px solid ${order.status==='ready'?'var(--green)':'var(--border)'}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontWeight:700 }}>Стол #{order.tableNumber}</span>
        <span style={{ color:COLORS[order.status], fontWeight:700, fontSize:13 }}>{STATUS[order.status]}</span>
      </div>
      {order.items.map((i,idx) => (
        <div key={idx} style={{ fontSize:13, color:'var(--text2)', marginBottom:2 }}>
          {i.quantity}× {i.name}{i.sauce && <span style={{ color:'var(--text3)' }}> · {i.sauce}</span>}
        </div>
      ))}
      <div style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>{moscowTime(order.createdAt)}</div>
    </div>
  );
}
