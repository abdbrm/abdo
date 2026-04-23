import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useSocket } from '../hooks/useSocket';
import { useSound } from '../hooks/useSound';
import API from '../api';

const CC = { neon:'#00ffcc', elvis:'#ff6b6b', enot:'#a29bfe' };
const moscowTime = d => new Date(new Date(d).getTime()+3*3600*1000).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'});

export default function AdminPage() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { notify } = useSound();
  const [tab, setTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ total:0, byClub:{}, recent:[], count:0 });
  const [users, setUsers] = useState([]);
  const [cleanerCalls, setCleanerCalls] = useState([]);
  const [shiftData, setShiftData] = useState(null);
  const [showShift, setShowShift] = useState(false);
  const [closeRequest, setCloseRequest] = useState(false);
  const [toast, setToast] = useState('');
  const [menu, setMenu] = useState([]);
  const [invHistory, setInvHistory] = useState([]);
  const [invDate, setInvDate] = useState(null);
  const [invDetail, setInvDetail] = useState(null);
  const [staffDiscount, setStaffDiscount] = useState(settings.staffDiscount || 0);
  const [savingDiscount, setSavingDiscount] = useState(false);

  useEffect(() => { loadAll(); }, []);

  useSocket({
    newOrder: o => { setOrders(p => [o,...p]); loadSummary(); notify(`Заказ — стол ${o.tableNumber}`); },
    orderUpdated: o => { setOrders(p => p.map(x => x._id===o._id?o:x)); loadSummary(); },
    cleanerCall: c => { if(settings.showCleanerCall){setCleanerCalls(p=>[c,...p]); notify(`Вызов уборщика — ${c.location}`);} },
    cleanerUpdated: c => setCleanerCalls(p => p.map(x => x._id===c._id?c:x).filter(x=>x.status!=='done')),
    shiftCloseRequest: s => { setCloseRequest(true); setShiftData(s); notify('Повар запрашивает закрытие смены!'); },
    shiftOpened: s => setShiftData(s),
    shiftUpdated: s => setShiftData(s),
    shiftClosed: s => { setShiftData(s); setCloseRequest(false); },
    paymentReceived: o => { loadOrders(); if(settings.showStaffPayment) notify(`Оплата сотрудника — стол ${o.tableNumber}`); }
  });

  const loadAll = async () => { loadOrders(); loadSummary(); loadUsers(); loadMenu(); loadCleanerCalls(); loadShift(); loadInvHistory(); };
  const loadOrders = async () => { try{const r=await API.get('/orders/today');setOrders(r.data);}catch{} };
  const loadSummary = async () => { try{const r=await API.get('/orders/summary');setSummary(r.data);}catch{} };
  const loadUsers = async () => { try{const r=await API.get('/auth/users');setUsers(r.data);}catch{} };
  const loadMenu = async () => { try{const r=await API.get('/menu');setMenu(r.data);}catch{} };
  const loadCleanerCalls = async () => { try{const r=await API.get('/cleaner');setCleanerCalls(r.data);}catch{} };
  const loadShift = async () => { try{const r=await API.get('/shift/today');const s=r.data.shift;setShiftData(s);if(s?.closeRequestedBy&&s?.status==='open')setCloseRequest(true);}catch{} };
  const loadInvHistory = async () => { try{const r=await API.get('/inventory/history');setInvHistory(r.data);}catch{} };

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''), 2500); };

  const updateClub = async (uid, club) => {
    try { await API.put(`/auth/users/${uid}`, {club}); setUsers(p=>p.map(u=>u._id===uid?{...u,club}:u)); showToast('Клуб обновлён ✓'); } catch {}
  };

  const confirmPayment = async id => {
    try { await API.put(`/orders/${id}/confirm-payment`); loadOrders(); showToast('Оплата подтверждена ✓'); } catch {}
  };

  const confirmClose = async () => {
    try { await API.put('/shift/close-confirm'); setCloseRequest(false); setShowShift(false); showToast('Смена закрыта'); } catch {}
  };

  const loadInvDetail = async date => {
    try { const r = await API.get(`/inventory/date/${date}`); setInvDetail(r.data); setInvDate(date); } catch {}
  };

  const saveDiscount = async () => {
    setSavingDiscount(true);
    try { await API.put('/settings', { staffDiscount: Number(staffDiscount) }); showToast('Скидка сохранена ✓'); }
    catch { showToast('Ошибка'); }
    finally { setSavingDiscount(false); }
  };

  const activeOrders = orders.filter(o=>['pending','confirmed'].includes(o.status));
  const pendingPay = settings.showStaffPayment ? orders.filter(o=>o.isStaffOrder&&!o.paymentConfirmed) : [];

  return (
    <div className="page">
      <div className="topbar">
        <span className="logo">АДМИН</span>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          {activeOrders.length>0 && <span style={{background:'rgba(232,200,74,0.1)',color:'var(--gold)',padding:'2px 10px',borderRadius:20,fontSize:12,fontWeight:700}}>{activeOrders.length}</span>}
          {settings.showShiftManager && (
            <button onClick={()=>setShowShift(true)} style={{ background: closeRequest?'var(--red)':'rgba(232,200,74,0.1)', color: closeRequest?'#fff':'var(--gold)', border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, fontWeight:700, animation: closeRequest?'pulse 1s infinite':'' }}>
              {closeRequest ? '⚠ Закрыть' : '▶ Смена'}
            </button>
          )}
          <button onClick={logout} style={{background:'none',color:'var(--text3)',fontSize:13}}>Выйти</button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab${tab==='dashboard'?' active':''}`} onClick={()=>setTab('dashboard')}>📊 Сводка</button>
        <button className={`tab${tab==='orders'?' active':''}`} onClick={()=>setTab('orders')}>Заказы{activeOrders.length?` (${activeOrders.length})`:''}</button>
        <button className={`tab${tab==='menu'?' active':''}`} onClick={()=>setTab('menu')}>Меню</button>
        {settings.showStaffMenu && <button className={`tab${tab==='staffmenu'?' active':''}`} onClick={()=>setTab('staffmenu')}>Меню персонала</button>}
        <button className={`tab${tab==='staff'?' active':''}`} onClick={()=>setTab('staff')}>Персонал</button>
        <button className={`tab${tab==='inv'?' active':''}`} onClick={()=>setTab('inv')}>Запасы</button>
        {settings.showStaffPayment&&pendingPay.length>0 && <button className={`tab${tab==='pay'?' active':''}`} onClick={()=>setTab('pay')}>Оплата ({pendingPay.length})</button>}
        {settings.showCleanerCall&&cleanerCalls.length>0 && <button className={`tab${tab==='clean'?' active':''}`} onClick={()=>setTab('clean')}>Уборщик ({cleanerCalls.length})</button>}
        {settings.showShiftPdf && <button className={`tab${tab==='pdf'?' active':''}`} onClick={()=>setTab('pdf')}>PDF</button>}
      </div>

      {/* DASHBOARD */}
      {tab==='dashboard' && (
        <div style={{padding:16}}>
          <div style={{background:'var(--bg2)',borderRadius:14,padding:24,marginBottom:14,border:'1px solid var(--border)',textAlign:'center'}}>
            <div style={{fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:8}}>Выручка сегодня</div>
            <div style={{fontFamily:'Bebas Neue, sans-serif',fontSize:52,color:'var(--gold)',letterSpacing:2,lineHeight:1}}>{(summary.total||0).toLocaleString('ru')} ₽</div>
            <div style={{fontSize:13,color:'var(--text3)',marginTop:6}}>{summary.count||0} заказов</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
            {[{k:'neon',l:'Neon'},{k:'elvis',l:'Elvis'},{k:'enot',l:'Enot'}].map(c=>(
              <div key={c.k} style={{background:'var(--bg2)',borderRadius:10,padding:12,border:`1px solid ${CC[c.k]}33`,textAlign:'center'}}>
                <div style={{fontSize:12,color:CC[c.k],fontWeight:700,marginBottom:4}}>{c.l}</div>
                <div style={{fontSize:15,fontWeight:700}}>{(summary.byClub?.[c.k]||0).toLocaleString('ru')} ₽</div>
              </div>
            ))}
          </div>
          <div className="section-title">Последние заказы</div>
          {!(summary.recent?.length) ? <div className="empty">Заказов нет</div> : summary.recent.map(o=>(
            <div key={o._id} style={{background:'var(--bg2)',borderRadius:10,padding:12,marginBottom:8,border:'1px solid var(--border)',borderLeft:`3px solid ${CC[o.club]||'var(--gold)'}`}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontWeight:700}}>Стол #{o.tableNumber}</span>
                  <span style={{fontSize:12,color:CC[o.club],fontWeight:700}}>{(o.club||'').toUpperCase()}</span>
                </div>
                <div style={{display:'flex',gap:10,alignItems:'center'}}>
                  <span style={{color:'var(--gold)',fontWeight:700}}>{o.items.reduce((s,i)=>s+i.price*i.quantity,0)} ₽</span>
                  <span style={{fontSize:12,color:'var(--text3)'}}>{moscowTime(o.createdAt)}</span>
                </div>
              </div>
              <div style={{fontSize:12,color:'var(--text3)'}}>{o.items.map(i=>`${i.quantity}× ${i.name}`).join(', ')}</div>
            </div>
          ))}
        </div>
      )}

      {/* ORDERS */}
      {tab==='orders' && (
        <div style={{padding:16}}>
          {!orders.length?<div className="empty">Заказов нет</div>:orders.map(o=>(
            <div key={o._id} className="card" style={{borderLeft:`3px solid ${CC[o.club]||'var(--gold)'}`}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <div style={{display:'flex',gap:8}}>
                  <span style={{fontWeight:700}}>Стол #{o.tableNumber}</span>
                  <span style={{fontSize:12,color:CC[o.club],fontWeight:700}}>{(o.club||'').toUpperCase()}</span>
                  {o.isStaffOrder&&<span style={{fontSize:11,background:'rgba(52,152,219,0.15)',color:'var(--blue)',padding:'1px 6px',borderRadius:4,fontWeight:700}}>СОТР.</span>}
                </div>
                <span style={{fontSize:12,fontWeight:700,color:o.status==='pending'?'var(--gold)':o.status==='confirmed'?'var(--blue)':o.status==='ready'?'var(--green)':'var(--text3)'}}>{o.status==='pending'?'Ожидает':o.status==='confirmed'?'Готовится':o.status==='ready'?'Готов':'Выдан'}</span>
              </div>
              <div style={{fontSize:12,color:'var(--text3)'}}>{o.items.map(i=>`${i.quantity}× ${i.name}`).join(', ')}</div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>{o.garconName} · {moscowTime(o.createdAt)}</div>
            </div>
          ))}
        </div>
      )}

      {/* MENU */}
      {tab==='menu' && (
        <div style={{padding:16}}>
          <div className="section-title">Меню (только просмотр)</div>
          {[...new Set(menu.map(i=>i.category))].map(cat=>(
            <div key={cat} style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>{cat}</div>
              {menu.filter(i=>i.category===cat).map(item=>(
                <div key={item._id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',opacity:item.available?1:0.5}}>
                  <div>
                    <span style={{fontSize:14,fontWeight:500}}>{item.name}</span>
                    {!item.available&&<span style={{fontSize:11,color:'var(--red)',marginLeft:6}}>нет</span>}
                    {item.hasSauce&&<span style={{fontSize:11,color:'var(--gold)',marginLeft:6}}>+соус</span>}
                  </div>
                  <span style={{color:'var(--gold)',fontWeight:700}}>{item.price}₽</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* STAFF MENU */}
      {tab==='staffmenu' && (
        <div style={{padding:16}}>
          {/* Discount section */}
          <div style={{background:'var(--bg2)',borderRadius:14,padding:16,marginBottom:18,border:'1px solid var(--border)'}}>
            <div style={{fontSize:12,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Скидка на меню персонала</div>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <div style={{position:'relative',flex:1}}>
                <input
                  type="number" min="0" max="100"
                  value={staffDiscount}
                  onChange={e=>setStaffDiscount(e.target.value)}
                  style={{width:'100%',padding:'12px 36px 12px 14px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,color:'var(--text)',fontSize:18,fontWeight:700,boxSizing:'border-box'}}
                />
                <span style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',fontSize:18,color:'var(--gold)',fontWeight:700}}>%</span>
              </div>
              <button onClick={saveDiscount} disabled={savingDiscount} className="btn btn-gold" style={{padding:'12px 20px',fontSize:14,flexShrink:0}}>
                {savingDiscount ? '...' : '✓ Сохранить'}
              </button>
            </div>
            {staffDiscount > 0 && (
              <div style={{marginTop:10,padding:'8px 12px',background:'rgba(232,200,74,0.08)',borderRadius:8,fontSize:13,color:'var(--gold)',textAlign:'center',fontWeight:600}}>
                Персонал платит {100-Number(staffDiscount)}% от цены
              </div>
            )}
          </div>

          {/* Menu items view with discounted prices */}
          <div className="section-title">Меню персонала</div>
          {[...new Set(menu.map(i=>i.category))].map(cat=>(
            <div key={cat} style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>{cat}</div>
              {menu.filter(i=>i.category===cat).map(item=>{
                const disc = Number(staffDiscount)||0;
                const discPrice = disc ? Math.round(item.price*(1-disc/100)) : item.price;
                return (
                  <div key={item._id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid var(--border)',opacity:item.available?1:0.45}}>
                    <div>
                      <span style={{fontSize:14,fontWeight:500}}>{item.name}</span>
                      {!item.available&&<span style={{fontSize:11,color:'var(--red)',marginLeft:6}}>нет</span>}
                      {item.hasSauce&&<span style={{fontSize:11,color:'var(--gold)',marginLeft:6}}>+соус</span>}
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      {disc>0 && <div style={{fontSize:11,color:'var(--text3)',textDecoration:'line-through'}}>{item.price}₽</div>}
                      <div style={{fontWeight:700,color:disc>0?'var(--green)':'var(--gold)',fontSize:15}}>{discPrice}₽</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* STAFF */}
      {tab==='staff' && (
        <div style={{padding:16}}>
          <div className="section-title">Официанты</div>
          {users.filter(u=>u.role==='garcon').map(u=>(
            <div key={u._id} className="card">
              <div style={{fontWeight:600,marginBottom:10}}>{u.displayName||u.username}</div>
              <div style={{display:'flex',gap:8}}>
                {['neon','elvis','enot'].map(club=>(
                  <button key={club} onClick={()=>updateClub(u._id,club)} style={{flex:1,padding:'9px 6px',borderRadius:8,fontSize:13,fontWeight:700,background:u.club===club?`${CC[club]}18`:'var(--bg3)',color:u.club===club?CC[club]:'var(--text3)',border:`1px solid ${u.club===club?CC[club]:'var(--border)'}`}}>{club.toUpperCase()}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* INVENTORY HISTORY */}
      {tab==='inv' && (
        <div style={{padding:16}}>
          <div className="section-title">Журнал запасов</div>
          {invDate && invDetail ? (
            <>
              <button onClick={()=>{setInvDate(null);setInvDetail(null);}} className="btn btn-dark" style={{marginBottom:14,fontSize:13}}>← Назад к списку</button>
              <div style={{background:'var(--bg2)',borderRadius:10,padding:14,border:'1px solid var(--border)',marginBottom:10}}>
                <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{invDate}</div>
                {invDetail.cookNames?.length>0 && <div style={{fontSize:13,color:'var(--text3)',marginBottom:8}}>Повар: {invDetail.cookNames.join(', ')}</div>}
                <div style={{fontSize:12,color:invDetail.shift==='closed'?'var(--green)':'var(--yellow)',fontWeight:600,marginBottom:12}}>{invDetail.shift==='closed'?'✓ Смена закрыта':'Смена открыта'}</div>
                {/* PDF buttons for this date */}
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button onClick={()=>printInvPDF(invDetail, settings)} style={{flex:1,padding:'10px',borderRadius:8,fontSize:13,fontWeight:600,background:'rgba(232,200,74,0.1)',color:'var(--gold)',border:'1px solid rgba(232,200,74,0.3)',cursor:'pointer'}}>📄 Запасы PDF</button>
                  <button onClick={()=>printSalesPDF(invDate, orders, settings)} style={{flex:1,padding:'10px',borderRadius:8,fontSize:13,fontWeight:600,background:'rgba(52,152,219,0.1)',color:'var(--blue)',border:'1px solid rgba(52,152,219,0.3)',cursor:'pointer'}}>💰 Продажи PDF</button>
                </div>
              </div>
              {[...new Set(invDetail.items.map(i=>i.category))].map(cat=>(
                <div key={cat} style={{marginBottom:18}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>{cat}</div>
                  {invDetail.items.filter(i=>i.category===cat).map(item=>{
                    const cons=()=>{const y=parseFloat(item.yesterdayValue),c=parseFloat(item.currentValue);if(isNaN(y)||isNaN(c))return'—';const d=c-y;return(d>=0?'+':'')+d.toFixed(1);};
                    const SC={green:'var(--green)',yellow:'var(--yellow)',red:'var(--red)'};
                    return(
                      <div key={item._id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                        <div style={{flex:1,fontSize:13}}>{item.name}</div>
                        <div style={{fontSize:12,color:'var(--text3)',width:42,textAlign:'center'}}>{item.yesterdayValue!==''?item.yesterdayValue:'—'}</div>
                        <div style={{fontSize:13,fontWeight:600,width:42,textAlign:'center'}}>{item.currentValue!==''?item.currentValue:'—'}</div>
                        <div style={{fontSize:11,width:36,textAlign:'center',color:cons()!=='—'&&parseFloat(cons())<0?'var(--red)':'var(--text3)'}}>{cons()}</div>
                        <div style={{width:12,height:12,borderRadius:'50%',background:SC[item.status]||'var(--text3)',flexShrink:0}} />
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          ) : (
            <>
              {!invHistory.length ? <div className="empty">Записей нет</div> : invHistory.map(r=>(
                <button key={r._id} onClick={()=>loadInvDetail(r.date)} style={{width:'100%',padding:'14px 16px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:10,marginBottom:8,textAlign:'left',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:15,color:'var(--text)'}}>{r.date}</div>
                    {r.cookNames?.length>0 && <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>{r.cookNames.join(', ')}</div>}
                  </div>
                  <span style={{fontSize:12,fontWeight:600,color:r.shift==='closed'?'var(--green)':'var(--yellow)'}}>{r.shift==='closed'?'✓ Закрыта':'Открыта'}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* PAYMENTS */}
      {tab==='pay' && settings.showStaffPayment && (
        <div style={{padding:16}}>
          <div className="section-title">Ожидают подтверждения</div>
          {!pendingPay.length ? <div className="empty">Нет</div> : pendingPay.map(o=>(
            <div key={o._id} className="card" style={{border:'1px solid rgba(52,152,219,0.3)'}}>
              <div style={{fontWeight:600,marginBottom:8}}>Стол #{o.tableNumber} · {o.paymentAmount}₽</div>
              {o.screenshotUrl && <img src={o.screenshotUrl} alt="" style={{width:'100%',borderRadius:8,marginBottom:10,maxHeight:300,objectFit:'contain',background:'#000'}} />}
              <button onClick={()=>confirmPayment(o._id)} className="btn btn-green" style={{width:'100%'}}>✓ Подтвердить</button>
            </div>
          ))}
        </div>
      )}

      {/* CLEANER */}
      {tab==='clean' && settings.showCleanerCall && (
        <CleanerView calls={cleanerCalls} onUpdate={loadCleanerCalls} />
      )}

      {/* PDF REPORTS */}
      {tab==='pdf' && settings.showShiftPdf && (
        <ReportsView orders={orders} summary={summary} settings={settings} />
      )}

      {/* SHIFT MANAGER MODAL */}
      {showShift && (
        <div className="modal-overlay" onClick={()=>setShowShift(false)}>
          <div className="modal" style={{maxHeight:'88vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700,fontSize:18,marginBottom:14}}>Управление сменой</div>
            <ShiftManager shiftData={shiftData} users={users} closeRequest={closeRequest} onConfirmClose={confirmClose} onUpdate={loadShift} onClose={()=>setShowShift(false)} showToast={showToast} />
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}

function ShiftManager({ shiftData, users, closeRequest, onConfirmClose, onUpdate, onClose, showToast }) {
  const [selGarcons, setSelGarcons] = useState([]);
  const [selCooks, setSelCooks] = useState([]);
  const [opening, setOpening] = useState(false);
  const [todayCooks, setTodayCooks] = useState([]);
  const CC = { neon:'#00ffcc', elvis:'#ff6b6b', enot:'#a29bfe' };

  useEffect(() => {
    if (shiftData) { setSelGarcons(shiftData.garcons||[]); setSelCooks(shiftData.cooks||[]); }
    API.get('/shift/today').then(r => setTodayCooks(r.data.todayCooks||[])).catch(()=>{});
  }, [shiftData]);

  const open = async () => {
    if (!selCooks.length) { showToast('Выберите повара'); return; }
    if (!selGarcons.length) { showToast('Выберите официанта'); return; }
    setOpening(true);
    try { await API.post('/shift/open', { garcons: selGarcons, cooks: selCooks }); onUpdate(); showToast('Смена открыта ✓'); onClose(); }
    catch { showToast('Ошибка'); }
    finally { setOpening(false); }
  };

  const garcons = users.filter(u=>u.role==='garcon');
  const cooks = users.filter(u=>u.role==='kitchen');
  const isOpen = shiftData?.status === 'open';

  const toggleCook = u => {
    const ex = selCooks.find(c=>c.userId?.toString()===u._id);
    if (ex) setSelCooks(p=>p.filter(c=>c.userId?.toString()!==u._id));
    else setSelCooks(p=>[...p,{userId:u._id,displayName:u.displayName||u.username,arrived:false}]);
  };

  const setGarconClub = (u, club) => {
    const ex = selGarcons.find(g=>g.userId?.toString()===u._id);
    if (ex) setSelGarcons(p=>p.map(g=>g.userId?.toString()===u._id?{...g,club}:g));
    else setSelGarcons(p=>[...p,{userId:u._id,displayName:u.displayName||u.username,club}]);
  };

  const removeGarcon = uid => setSelGarcons(p=>p.filter(g=>g.userId?.toString()!==uid));

  return (
    <div>
      {closeRequest && (
        <div style={{background:'rgba(231,76,60,0.12)',border:'1px solid rgba(231,76,60,0.35)',borderRadius:12,padding:14,marginBottom:16}}>
          <div style={{fontWeight:700,color:'var(--red)',marginBottom:8}}>🔔 Повар запрашивает закрытие смены</div>
          <button onClick={onConfirmClose} className="btn btn-red" style={{width:'100%'}}>✓ Подтвердить закрытие</button>
        </div>
      )}

      {isOpen && (
        <div style={{background:'rgba(46,204,113,0.08)',border:'1px solid rgba(46,204,113,0.25)',borderRadius:10,padding:12,marginBottom:14}}>
          <div style={{color:'var(--green)',fontWeight:700,marginBottom:4}}>✓ Смена открыта</div>
          <div style={{fontSize:13,color:'var(--text3)'}}>
            Поваров на месте: {shiftData?.cooks?.filter(c=>c.arrived).length||0}/{shiftData?.cooks?.length||0}
            {shiftData?.cookArrived&&<span style={{color:'var(--green)',marginLeft:8}}>✓ все на месте</span>}
          </div>
        </div>
      )}

      {todayCooks.length>0 && (
        <div style={{background:'rgba(232,200,74,0.06)',border:'1px solid rgba(232,200,74,0.2)',borderRadius:10,padding:12,marginBottom:14}}>
          <div style={{fontSize:12,color:'var(--text3)',marginBottom:3}}>По графику сегодня:</div>
          <div style={{fontWeight:700,color:'var(--gold)'}}>{todayCooks.join(', ')} — сегодня</div>
        </div>
      )}

      <div className="section-title">Повара</div>
      {cooks.map(u=>{
        const sel=selCooks.find(c=>c.userId?.toString()===u._id);
        return(
          <div key={u._id} onClick={()=>!isOpen&&toggleCook(u)} className="card" style={{border:`1px solid ${sel?'var(--gold)':'var(--border)'}`,cursor:isOpen?'default':'pointer',background:sel?'rgba(232,200,74,0.06)':'var(--bg2)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:600}}>{u.displayName||u.username}</div>
                {sel&&<div style={{fontSize:12,color:sel.arrived?'var(--green)':'var(--text3)',marginTop:2}}>{sel.arrived?'✓ На месте':'Ожидаем...'}</div>}
              </div>
              {sel&&<span style={{color:'var(--gold)',fontSize:20}}>✓</span>}
            </div>
          </div>
        );
      })}

      <div className="section-title" style={{marginTop:16}}>Официанты</div>
      {garcons.map(u=>{
        const sel=selGarcons.find(g=>g.userId?.toString()===u._id);
        return(
          <div key={u._id} className="card" style={{border:`1px solid ${sel?'var(--gold)':'var(--border)'}`}}>
            <div style={{fontWeight:600,marginBottom:sel?10:0}}>{u.displayName||u.username}</div>
            {sel ? (
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {['neon','elvis','enot'].map(club=>(
                  <button key={club} onClick={()=>!isOpen&&setGarconClub(u,club)} style={{flex:1,padding:'8px',borderRadius:8,fontSize:13,fontWeight:700,background:sel.club===club?`${CC[club]}18`:'var(--bg3)',color:sel.club===club?CC[club]:'var(--text3)',border:`1px solid ${sel.club===club?CC[club]:'var(--border)'}`}}>{club.toUpperCase()}</button>
                ))}
                {!isOpen&&<button onClick={()=>removeGarcon(u._id)} style={{padding:'8px 10px',borderRadius:8,background:'rgba(231,76,60,0.1)',color:'var(--red)',border:'1px solid rgba(231,76,60,0.2)',fontSize:13}}>✕</button>}
              </div>
            ) : !isOpen && (
              <button onClick={()=>setGarconClub(u,u.club||'neon')} className="btn btn-dark" style={{width:'100%',marginTop:6,fontSize:13}}>+ Добавить</button>
            )}
          </div>
        );
      })}

      {!isOpen && (
        <button onClick={open} disabled={opening} className="btn btn-gold" style={{width:'100%',padding:15,fontSize:15,marginTop:16}}>
          {opening ? '...' : '▶ Открыть смену'}
        </button>
      )}
      <button onClick={onClose} className="btn btn-dark" style={{width:'100%',marginTop:10}}>Закрыть</button>
    </div>
  );
}

function CleanerView({ calls, onUpdate }) {
  const [replyModal, setReplyModal] = useState(null);
  const reply = async (id, msg) => {
    try { await API.put(`/cleaner/${id}/reply`, {reply:msg}); setReplyModal(null); onUpdate(); } catch {}
  };
  const done = async id => {
    try { await API.put(`/cleaner/${id}/done`); onUpdate(); } catch {}
  };
  return (
    <div style={{padding:16}}>
      <div className="section-title">Вызовы уборщика</div>
      {!calls.length ? <div className="empty">Нет активных вызовов</div> : calls.map(c=>(
        <div key={c._id} className="card">
          <div style={{fontWeight:600,fontSize:15,marginBottom:4}}>{c.location}</div>
          <div style={{fontSize:13,color:'var(--text3)',marginBottom:10}}>
            {c.calledBy} · {c.status==='acknowledged'?`Придёт через ${c.etaMinutes} мин`:'Ожидает'}
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setReplyModal(c)} className="btn btn-dark" style={{flex:1,fontSize:13}}>Ответить</button>
            <button onClick={()=>done(c._id)} className="btn btn-green" style={{flex:1,fontSize:13}}>Готово</button>
          </div>
        </div>
      ))}
      {replyModal && (
        <div className="modal-overlay" onClick={()=>setReplyModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700,fontSize:18,marginBottom:14}}>Ответ уборщику</div>
            {['Срочно нужен в Elvis','Срочно нужен в Neon','Срочно нужен в Enot','Срочно нужен на кухне'].map(msg=>(
              <button key={msg} onClick={()=>reply(replyModal._id,msg)} style={{width:'100%',padding:'13px 16px',background:'var(--bg3)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:10,textAlign:'left',fontSize:14,marginBottom:8,cursor:'pointer'}}>{msg}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function printInvPDF(inv, settings) {
  const w = window.open('','_blank'); if(!w) return;
  const style = `body{font-family:'Segoe UI',Arial,sans-serif;padding:28px;color:#1a1a1a}h2{margin-bottom:16px;font-size:22px}.date{color:#888;font-size:13px;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f5f5f5;padding:9px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#666}td{padding:9px 12px;border-bottom:1px solid #f0f0f0}.cat{background:#f9f9f9;font-weight:700;font-size:11px;color:#666;text-transform:uppercase}.g{color:#16a34a}.y{color:#ca8a04}.r{color:#dc2626}`;
  const cats = [...new Set(inv.items.map(i=>i.category))];
  let rows = '';
  cats.forEach(cat => {
    rows += `<tr><td colspan="5" class="cat" style="padding:8px 12px">${cat}</td></tr>`;
    inv.items.filter(i=>i.category===cat).forEach(item => {
      const y=parseFloat(item.yesterdayValue),c=parseFloat(item.currentValue);
      const cons = !isNaN(y)&&!isNaN(c) ? ((c-y>=0?'+':'')+(c-y).toFixed(1)) : '—';
      const dot = {green:'●',yellow:'●',red:'●'}[item.status]||'';
      const dc = {green:'g',yellow:'y',red:'r'}[item.status]||'';
      rows += `<tr><td>${item.name}</td><td>${item.yesterdayValue||'—'}</td><td><b>${item.currentValue||'—'}</b></td><td>${cons}</td><td class="${dc}">${dot}</td></tr>`;
    });
  });
  const cook = inv.cookNames?.join(', ') || '';
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${style}</style></head><body><h2>Запасы — ${inv.date}</h2><div class="date">${cook?`Повар: ${cook} · `:''}${inv.shift==='closed'?'Смена закрыта':'Смена открыта'}</div><table><thead><tr><th>Продукт</th><th>Вчера</th><th>Сейчас</th><th>Расход</th><th>Статус</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

function printSalesPDF(date, orders, settings) {
  const w = window.open('','_blank'); if(!w) return;
  const cc = { neon: settings.colorNeon||'#00cc99', elvis: settings.colorElvis||'#cc3333', enot: settings.colorEnot||'#7766cc' };
  const style = `body{font-family:'Segoe UI',Arial,sans-serif;padding:28px;color:#1a1a1a}h2{margin-bottom:4px;font-size:22px}.sub{color:#888;font-size:13px;margin-bottom:20px}.total{background:#0a0a0a;color:#fff;border-radius:10px;padding:16px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;font-size:13px}.amount{font-size:26px;font-weight:900;color:#e8c84a}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f5f5f5;padding:9px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#666}td{padding:9px 12px;border-bottom:1px solid #f0f0f0}`;
  const dayOrders = orders.filter(o=>o.status!=='pending');
  const total = dayOrders.reduce((s,o)=>s+o.items.reduce((ss,i)=>ss+i.price*i.quantity,0),0);
  let byClub = '';
  ['neon','elvis','enot'].forEach(club=>{
    const co=dayOrders.filter(o=>o.club===club);
    const t=co.reduce((s,o)=>s+o.items.reduce((ss,i)=>ss+i.price*i.quantity,0),0);
    byClub+=`<tr><td style="color:${cc[club]};font-weight:700">${club.toUpperCase()}</td><td>${co.length}</td><td><b>${t.toLocaleString('ru')} ₽</b></td></tr>`;
  });
  const rows = dayOrders.map(o=>`<tr><td>${new Date(new Date(o.createdAt).getTime()+3*3600*1000).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}</td><td style="color:${cc[o.club]||'#666'};font-weight:700">${(o.club||'').toUpperCase()}</td><td>Стол #${o.tableNumber}</td><td style="font-size:12px;color:#666;max-width:180px">${o.items.map(i=>`${i.quantity}× ${i.name}`).join(', ')}</td><td><b>${o.items.reduce((s,i)=>s+i.price*i.quantity,0)} ₽</b></td></tr>`).join('');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${style}</style></head><body><h2>Продажи — ${date}</h2><div class="sub">${dayOrders.length} заказов</div><div class="total"><span>Общая выручка</span><span class="amount">${total.toLocaleString('ru')} ₽</span></div><table><thead><tr><th>Клуб</th><th>Заказов</th><th>Выручка</th></tr></thead><tbody>${byClub}</tbody></table><br><table><thead><tr><th>Время</th><th>Клуб</th><th>Стол</th><th>Позиции</th><th>Сумма</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

function ReportsView({ orders, summary, settings }) {
  const cc = { neon: settings.colorNeon||'#00cc99', elvis: settings.colorElvis||'#cc3333', enot: settings.colorEnot||'#7766cc' };
  const today = new Date(Date.now()+3*3600*1000).toLocaleDateString('ru',{day:'2-digit',month:'long',year:'numeric'});

  const buildHTML = (content) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:'Segoe UI',Arial,sans-serif;padding:28px;color:#1a1a1a;}.hdr{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #0a0a0a;padding-bottom:14px;margin-bottom:20px}.logo{font-size:36px;font-weight:900;letter-spacing:5px}.date{font-size:13px;color:#888}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f5f5f5;padding:9px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#666}td{padding:9px 12px;border-bottom:1px solid #f0f0f0}.total{background:#0a0a0a;color:#fff;border-radius:10px;padding:18px 22px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}.amount{font-size:30px;font-weight:900;color:#e8c84a}.cat{background:#f9f9f9;font-weight:700;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.8px}</style></head><body>${content}<script>window.onload=()=>window.print()</script></body></html>`;

  const openPDF = type => {
    const w = window.open('','_blank'); if(!w) return;
    let content = '';
    if (type === 'total') {
      const rows = ['neon','elvis','enot'].map(club => {
        const co = orders.filter(o=>o.club===club&&o.status!=='pending');
        const t = co.reduce((s,o)=>s+o.items.reduce((ss,i)=>ss+i.price*i.quantity,0),0);
        return `<tr><td style="color:${cc[club]};font-weight:700">${club.toUpperCase()}</td><td>${co.length}</td><td><b>${t.toLocaleString('ru')} ₽</b></td></tr>`;
      }).join('');
      content = `<div class="hdr"><div class="logo">NEON</div><div class="date">Итоги продаж · ${today}</div></div><div class="total"><span>Общая выручка</span><span class="amount">${(summary.total||0).toLocaleString('ru')} ₽</span></div><table><thead><tr><th>Клуб</th><th>Заказов</th><th>Выручка</th></tr></thead><tbody>${rows}</tbody></table>`;
    } else {
      const club = type;
      const co = orders.filter(o=>o.club===club&&o.status!=='pending');
      const total = co.reduce((s,o)=>s+o.items.reduce((ss,i)=>ss+i.price*i.quantity,0),0);
      const rows = co.map(o=>`<tr><td>${new Date(new Date(o.createdAt).getTime()+3*3600*1000).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}</td><td>Стол #${o.tableNumber}</td><td style="max-width:200px;font-size:12px;color:#666">${o.items.map(i=>`${i.quantity}× ${i.name}`).join(', ')}</td><td><b>${o.items.reduce((s,i)=>s+i.price*i.quantity,0)} ₽</b></td></tr>`).join('');
      content = `<div class="hdr"><div class="logo" style="color:${cc[club]}">${club.toUpperCase()}</div><div class="date">${today}</div></div><div class="total" style="background:${cc[club]}"><span>Выручка</span><span class="amount" style="color:#fff">${total.toLocaleString('ru')} ₽</span></div><table><thead><tr><th>Время</th><th>Стол</th><th>Позиции</th><th>Сумма</th></tr></thead><tbody>${rows}</tbody></table>`;
    }
    w.document.write(buildHTML(content)); w.document.close();
  };

  return (
    <div style={{padding:16}}>
      <div className="section-title">Отчёты</div>
      {[{k:'total',l:'💰 Итого продаж'},{k:'neon',l:'🟢 Neon'},{k:'elvis',l:'🔴 Elvis'},{k:'enot',l:'🟣 Enot'}].map(r=>(
        <button key={r.k} onClick={()=>openPDF(r.k)} className="btn btn-dark" style={{width:'100%',justifyContent:'flex-start',padding:'14px 16px',fontSize:15,marginBottom:8}}>{r.l} — PDF</button>
      ))}
    </div>
  );
}
