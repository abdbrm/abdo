import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useSocket } from '../hooks/useSocket';
import { useSound } from '../hooks/useSound';
import API from '../api';

const CLUB_COLORS = { neon:'#00ffcc', elvis:'#ff6b6b', enot:'#a29bfe' };
const NEXT = { pending:'confirmed', confirmed:'ready', ready:'delivered' };
const STATUS_LABEL = { pending:'Новый', confirmed:'Готовится', ready:'Готов', delivered:'Выдан' };

export default function KitchenPage() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { notify, requestPermission } = useSound();
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [inventory, setInventory] = useState(null);
  const [tab, setTab] = useState('active');
  const [cleanerModal, setCleanerModal] = useState(false);
  const [cleanerLoc, setCleanerLoc] = useState('Кухня');
  const [closeModal, setCloseModal] = useState(false);

  useEffect(() => { requestPermission(); loadAll(); }, []);

  const printOrder = async (order) => {
    try {
      await fetch('http://localhost:3001/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
    } catch (e) {
      console.warn('Print failed:', e.message);
    }
  };

  useSocket({
    newOrder: o => { setOrders(p => [o, ...p]); notify(`Новый заказ — стол ${o.tableNumber} (${(o.club||'').toUpperCase()})`); printOrder(o); },
    orderUpdated: o => setOrders(p => p.map(x => x._id===o._id ? o : x)),
    menuUpdated: () => API.get('/menu').then(r => setMenu(r.data)).catch(() => {})
  });

  const loadAll = async () => {
    try {
      const [o, m, i] = await Promise.all([API.get('/orders/today'), API.get('/menu'), API.get('/inventory/today')]);
      setOrders(o.data); setMenu(m.data); setInventory(i.data);
    } catch {}
  };

  const updateStatus = async (id, status) => {
    try { await API.put(`/orders/${id}/status`, { status }); } catch {}
  };

  const toggleAvail = async (id, available) => {
    try { await API.put(`/menu/${id}/available`, { available }); setMenu(p => p.map(i => i._id===id ? {...i, available} : i)); } catch {}
  };

  const callCleaner = async () => {
    try { await API.post('/cleaner', { location: cleanerLoc }); setCleanerModal(false); } catch {}
  };

  const requestClose = async () => {
    try { await API.put('/shift/close-request'); setCloseModal(false); notify('Запрос на закрытие отправлен'); } catch {}
  };

  const active = orders.filter(o => ['pending','confirmed'].includes(o.status));
  const ready = orders.filter(o => o.status === 'ready');

  return (
    <div className="page">
      <div className="topbar">
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <span className="logo">КУХНЯ</span>
          {active.length > 0 && <span style={{ background:'rgba(232,200,74,0.1)', color:'var(--gold)', padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>{active.length}</span>}
        </div>
        <button onClick={logout} style={{ background:'none', color:'var(--text3)', fontSize:13 }}>Выйти</button>
      </div>

      <div className="tabs">
        <button className={`tab${tab==='active'?' active':''}`} onClick={() => setTab('active')}>Заказы ({active.length})</button>
        <button className={`tab${tab==='ready'?' active':''}`} onClick={() => setTab('ready')}>Готово ({ready.length})</button>
        <button className={`tab${tab==='avail'?' active':''}`} onClick={() => setTab('avail')}>Наличие</button>
        <button className={`tab${tab==='inv'?' active':''}`} onClick={() => setTab('inv')}>Запасы</button>
      </div>

      {/* Action buttons */}
      <div style={{ display:'flex', gap:8, padding:'10px 16px', borderBottom:'1px solid var(--border)' }}>
        {settings.showCleanerCall && (
          <button onClick={() => setCleanerModal(true)} className="btn btn-dark" style={{ flex:1, fontSize:13 }}>🧹 Уборщик</button>
        )}
        {settings.showShiftManager && (
          <button onClick={() => setCloseModal(true)} className="btn btn-red" style={{ flex:1, fontSize:13 }}>🔒 Закрыть смену</button>
        )}
      </div>

      {tab === 'active' && (
        <div style={{ padding:16 }}>
          {!active.length ? <div className="empty">Нет активных заказов</div> : active.map(o => <KitchenCard key={o._id} order={o} onNext={updateStatus} />)}
        </div>
      )}

      {tab === 'ready' && (
        <div style={{ padding:16 }}>
          {!ready.length ? <div className="empty">Нет готовых заказов</div> : ready.map(o => <KitchenCard key={o._id} order={o} onNext={updateStatus} />)}
        </div>
      )}

      {tab === 'avail' && (
        <div style={{ padding:16 }}>
          <div className="section-title">Отметьте отсутствующие блюда</div>
          {[...new Set(menu.map(i => i.category))].map(cat => (
            <div key={cat} style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{cat}</div>
              {menu.filter(i => i.category===cat).map(item => (
                <div key={item._id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg2)', borderRadius:8, marginBottom:6, border:`1px solid ${item.available?'var(--border)':'rgba(231,76,60,0.3)'}`, opacity: item.available?1:0.75 }}>
                  <span style={{ fontSize:14 }}>{item.name}</span>
                  <button onClick={() => toggleAvail(item._id, !item.available)} style={{ padding:'6px 14px', borderRadius:6, fontSize:13, fontWeight:700, background: item.available?'rgba(231,76,60,0.12)':'rgba(46,204,113,0.12)', color: item.available?'var(--red)':'var(--green)', border: `1px solid ${item.available?'rgba(231,76,60,0.3)':'rgba(46,204,113,0.3)'}` }}>
                    {item.available ? 'Нет в наличии' : 'Есть в наличии'}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'inv' && inventory && (
        <InventoryView inventory={inventory} onReload={() => API.get('/inventory/today').then(r => setInventory(r.data))} cookName={user?.displayName || user?.username} />
      )}

      {cleanerModal && (
        <div className="modal-overlay" onClick={() => setCleanerModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight:700, fontSize:18, marginBottom:14 }}>🧹 Вызов уборщика</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
              {['Кухня','Neon','Elvis','Enot','Туалет','Вход'].map(loc => (
                <button key={loc} onClick={() => setCleanerLoc(loc)} style={{ padding:'12px 16px', borderRadius:8, textAlign:'left', fontSize:15, background: cleanerLoc===loc?'rgba(232,200,74,0.1)':'var(--bg3)', color: cleanerLoc===loc?'var(--gold)':'var(--text)', border:`1px solid ${cleanerLoc===loc?'var(--gold)':'var(--border)'}` }}>{loc}</button>
              ))}
            </div>
            <button onClick={callCleaner} className="btn btn-gold" style={{ width:'100%' }}>Вызвать</button>
          </div>
        </div>
      )}

      {closeModal && (
        <div className="modal-overlay" onClick={() => setCloseModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight:700, fontSize:18, marginBottom:12 }}>🔒 Закрыть смену?</div>
            <div style={{ fontSize:14, color:'var(--text3)', marginBottom:20 }}>Запрос уйдёт администратору. Он должен подтвердить закрытие.</div>
            <button onClick={requestClose} className="btn btn-red" style={{ width:'100%', marginBottom:8 }}>Отправить запрос</button>
            <button onClick={() => setCloseModal(false)} className="btn btn-dark" style={{ width:'100%' }}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}

function KitchenCard({ order, onNext }) {
  const cc = CLUB_COLORS[order.club] || 'var(--gold)';
  const elapsed = Math.floor((Date.now() - new Date(order.createdAt)) / 60000);
  const moscowTime = d => new Date(new Date(d).getTime()+3*3600*1000).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'});
  return (
    <div style={{ background:'var(--bg2)', borderRadius:12, padding:16, marginBottom:12, border:`1px solid ${order.status==='pending'?'rgba(232,200,74,0.35)':'var(--border)'}`, borderLeft:`4px solid ${cc}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
        <div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:22 }}>Стол #{order.tableNumber}</span>
            <span style={{ color:cc, fontSize:13, fontWeight:700 }}>{(order.club||'').toUpperCase()}</span>
            {order.isStaffOrder && <span style={{ background:'rgba(52,152,219,0.15)', color:'var(--blue)', padding:'1px 6px', borderRadius:4, fontSize:11, fontWeight:700 }}>СОТР.</span>}
          </div>
          <div style={{ fontSize:12, color:'var(--text3)' }}>{order.garconName} · {moscowTime(order.createdAt)} · {elapsed}мин</div>
        </div>
        <span style={{ padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:700, background: order.status==='pending'?'rgba(232,200,74,0.1)':order.status==='confirmed'?'rgba(52,152,219,0.1)':'rgba(46,204,113,0.1)', color: order.status==='pending'?'var(--gold)':order.status==='confirmed'?'var(--blue)':'var(--green)' }}>
          {STATUS_LABEL[order.status]}
        </span>
      </div>
      {order.items.map((item, i) => (
        <div key={i} style={{ padding:'7px 0', borderTop: i>0?'1px solid var(--border)':'' }}>
          <div style={{ display:'flex', gap:8 }}>
            <span style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:20, color:'var(--gold)' }}>{item.quantity}×</span>
            <span style={{ fontSize:16, fontWeight:600 }}>{item.name}</span>
          </div>
          {item.sauce && <div style={{ fontSize:13, color:'var(--text3)', marginLeft:28 }}>Соус: {item.sauce}</div>}
          {item.note && <div style={{ fontSize:13, color:'var(--yellow)', marginLeft:28 }}>⚠ {item.note}</div>}
        </div>
      ))}
      {order.comment && <div style={{ marginTop:10, padding:'8px 10px', background:'var(--bg4)', borderRadius:6, fontSize:13, color:'var(--yellow)', fontStyle:'italic' }}>💬 {order.comment}</div>}
      {order.status !== 'delivered' && (
        <button onClick={() => onNext(order._id, NEXT[order.status])} style={{ marginTop:12, width:'100%', padding:12, borderRadius:8, fontSize:15, fontWeight:700, background: order.status==='confirmed'?'rgba(46,204,113,0.15)':'rgba(232,200,74,0.12)', color: order.status==='confirmed'?'var(--green)':'var(--gold)', border:`1px solid ${order.status==='confirmed'?'rgba(46,204,113,0.3)':'rgba(232,200,74,0.3)'}` }}>
          {order.status==='pending'?'✓ Принять':order.status==='confirmed'?'✓ Готово!':'✓ Выдан'}
        </button>
      )}
    </div>
  );
}

function InventoryView({ inventory, onReload, cookName }) {
  const [items, setItems] = useState(inventory.items || []);
  const inputRefs = useRef({});

  useEffect(() => setItems(inventory.items || []), [inventory]);

  const update = async (itemId, field, value) => {
    try {
      const r = await API.put(`/inventory/${inventory._id}/item/${itemId}`, { [field]: value });
      setItems(r.data.items);
    } catch {}
  };

  const setAllLikeYesterday = async () => {
    for (const item of items) {
      if (item.yesterdayValue !== '') await API.put(`/inventory/${inventory._id}/item/${item._id}`, { currentValue: item.yesterdayValue });
    }
    onReload();
  };

  const closeShift = async () => {
    if (!window.confirm('Закрыть смену?')) return;
    try { await API.put(`/inventory/${inventory._id}/close`, { cookNames: [cookName] }); onReload(); } catch {}
  };

  const cats = [...new Set(items.map(i => i.category))];
  const flatItems = cats.flatMap(cat => items.filter(i => i.category === cat));

  return (
    <div style={{ padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
        <div className="section-title" style={{ margin:0 }}>{inventory.shift==='closed'?'🔒 Смена закрыта':'📦 Запасы'}</div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={setAllLikeYesterday} style={{ padding:'7px 12px', borderRadius:8, fontSize:13, fontWeight:600, background:'rgba(232,200,74,0.1)', color:'var(--gold)', border:'1px solid rgba(232,200,74,0.3)' }}>↩ Как вчера</button>
          {inventory.shift==='open' && <button onClick={closeShift} style={{ padding:'7px 12px', borderRadius:8, fontSize:13, fontWeight:600, background:'rgba(231,76,60,0.12)', color:'var(--red)', border:'1px solid rgba(231,76,60,0.3)' }}>Закрыть</button>}
        </div>
      </div>

      {cats.map(cat => (
        <div key={cat} style={{ marginBottom:22 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:6, paddingBottom:4, borderBottom:'1px solid var(--border)' }}>{cat}</div>
          {items.filter(i => i.category===cat).map((item, idx) => {
            const catItems = items.filter(i => i.category===cat);
            const nextItem = catItems[idx+1] || flatItems[flatItems.indexOf(item)+1];
            return (
              <InvRow key={item._id} item={item} disabled={inventory.shift==='closed'}
                onUpdate={update}
                onEnter={() => { if (nextItem && inputRefs.current[nextItem._id]) inputRefs.current[nextItem._id].focus(); }}
                inputRef={el => inputRefs.current[item._id] = el}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function InvRow({ item, onUpdate, disabled, inputRef, onEnter }) {
  const [val, setVal] = useState(String(item.currentValue ?? ''));
  useEffect(() => setVal(String(item.currentValue ?? '')), [item.currentValue]);

  const save = () => onUpdate(item._id, 'currentValue', val);
  const cons = () => {
    const y = parseFloat(item.yesterdayValue), c = parseFloat(val);
    if (isNaN(y) || isNaN(c)) return '—';
    const d = c-y; return (d>=0?'+':'')+d.toFixed(1);
  };
  const c = cons();
  const SC = { green:'var(--green)', yellow:'var(--yellow)', red:'var(--red)' };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
      <div style={{ flex:1, fontSize:14 }}>{item.name}</div>
      <div style={{ width:42, fontSize:12, color:'var(--text3)', textAlign:'center' }}>{item.yesterdayValue!==''?item.yesterdayValue:'—'}</div>
      <input ref={inputRef} disabled={disabled} value={val} onChange={e => setVal(e.target.value)} onBlur={save}
        onKeyDown={e => { if(e.key==='Enter'){save();onEnter();e.preventDefault();} }}
        placeholder="..." style={{ width:76, textAlign:'center', fontSize:14, padding:'7px 6px' }} />
      <div style={{ width:38, fontSize:12, textAlign:'center', fontWeight:600, color: c!=='—'&&parseFloat(c)<0?'var(--red)':'var(--text3)' }}>{c}</div>
      <div style={{ display:'flex', gap:3, alignItems:'center' }}>
        {['green','yellow','red'].map(s => (
          <button key={s} onClick={() => onUpdate(item._id,'status',s)} style={{ width:18, height:18, borderRadius:'50%', background:SC[s], border: item.status===s?'2px solid #fff':'2px solid transparent', opacity: item.status===s?1:0.3 }} />
        ))}
        <button onClick={() => onUpdate(item._id,'currentValue',item.yesterdayValue)} title="Как вчера" style={{ width:20, height:20, borderRadius:5, background:'var(--bg4)', border:'1px solid var(--border)', fontSize:10, color:'var(--text3)' }}>↩</button>
      </div>
    </div>
  );
}
