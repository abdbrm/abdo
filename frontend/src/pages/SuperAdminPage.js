import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useSocket } from '../hooks/useSocket';
import API from '../api';

const ROLES = { admin:'Администратор', garcon:'Официант', kitchen:'Кухня', cleaner:'Уборщик' };

export default function SuperAdminPage() {
  const { logout } = useAuth();
  const { settings, save } = useSettings();
  const [tab, setTab] = useState('settings');
  const [local, setLocal] = useState({});
  const [users, setUsers] = useState([]);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [online, setOnline] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [newUser, setNewUser] = useState({ username:'', password:'', role:'garcon', displayName:'', club:'neon' });
  const [showNewUser, setShowNewUser] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState('');
  const [newPwd, setNewPwd] = useState('');

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { setLocal(settings); }, [settings]);

  // Apply icon dynamically
  useEffect(() => {
    if (settings.appIcon) {
      const link = document.querySelector('link[rel="apple-touch-icon"]') || document.createElement('link');
      link.rel = 'apple-touch-icon';
      link.href = settings.appIcon;
      document.head.appendChild(link);
    }
    if (settings.appColor) {
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.appColor);
    }
  }, [settings.appIcon, settings.appColor]);

  useSocket({ onlineUsers: u => setOnline(u) });

  const loadAll = async () => {
    try {
      const [u, m, o, s] = await Promise.all([API.get('/auth/users'), API.get('/menu'), API.get('/orders/today'), API.get('/shift/schedule')]);
      setUsers(u.data); setMenu(m.data); setOrders(o.data); setSchedule(s.data);
    } catch {}
    try { const r = await fetch('/api/online'); const d = await r.json(); setOnline(d); } catch {}
  };

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),2500); };
  const saveSettings = async () => { try { await save(local); showToast('Сохранено ✓'); } catch { showToast('Ошибка'); } };

  const createUser = async () => {
    if (!newUser.username || !newUser.password) return;
    try { await API.post('/auth/users', newUser); setNewUser({username:'',password:'',role:'garcon',displayName:'',club:'neon'}); setShowNewUser(false); loadAll(); showToast('Пользователь создан ✓'); }
    catch (e) { showToast(e.response?.data?.message||'Ошибка'); }
  };

  const deleteUser = async id => {
    if (!window.confirm('Удалить?')) return;
    try { await API.delete(`/auth/users/${id}`); loadAll(); showToast('Удалено'); } catch {}
  };

  const saveMenuItem = async () => {
    if (!editItem) return;
    try {
      if (editItem._id && !editItem.isNew) await API.put(`/menu/${editItem._id}`, editItem);
      else await API.post('/menu', editItem);
      setEditItem(null); loadAll(); showToast('Сохранено ✓');
    } catch {}
  };

  const deleteMenuItem = async id => {
    if (!window.confirm('Удалить блюдо?')) return;
    try { await API.delete(`/menu/${id}`); loadAll(); } catch {}
  };

  const saveSchedule = async () => {
    try { await API.put('/shift/schedule', { days: schedule.days }); showToast('График сохранён ✓'); } catch { showToast('Ошибка'); }
  };

  const updateScheduleDay = (idx, val) => {
    setSchedule(p => ({ ...p, days: p.days.map((d,i) => i===idx ? {...d, cooks: val.split(',').map(s=>s.trim()).filter(Boolean)} : d) }));
  };

  const changePwd = async () => {
    if (newPwd.length < 4) return;
    try {
      const abdo = users.find(u => u.role === 'superadmin');
      if (abdo) { await API.put(`/auth/users/${abdo._id}`, { password: newPwd }); setNewPwd(''); showToast('Пароль изменён ✓'); }
    } catch { showToast('Ошибка'); }
  };

  const Toggle = ({ k, label, desc }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize:15, fontWeight:600 }}>{label}</div>
        {desc && <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{desc}</div>}
      </div>
      <button className={`toggle${local[k]?' on':''}`} onClick={() => setLocal(p=>({...p,[k]:!p[k]}))} />
    </div>
  );

  const today = new Date(Date.now()+3*3600*1000).toISOString().split('T')[0];

  return (
    <div className="page">
      <div className="topbar">
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <span className="logo" style={{fontSize:20}}>SUPER ADMIN</span>
          <span style={{background:'rgba(232,200,74,0.1)',color:'var(--gold)',padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:700}}>ABDO</span>
        </div>
        <button onClick={logout} style={{background:'none',color:'var(--text3)',fontSize:13}}>Выйти</button>
      </div>

      <div className="tabs">
        {[
          {k:'settings',l:'⚙️ Настройки'},
          {k:'visibility',l:'👁 Доступ'},
          {k:'users',l:'👥 Персонал'},
          {k:'menu',l:'📋 Меню'},
          {k:'schedule',l:'📅 График'},
          {k:'online',l:`🟢 Онлайн${online.length?` (${online.length})`:''}` },
          {k:'app',l:'📱 Приложение'},
        ].map(t=><button key={t.k} className={`tab${tab===t.k?' active':''}`} onClick={()=>setTab(t.k)}>{t.l}</button>)}
      </div>

      {/* SETTINGS */}
      {tab==='settings' && (
        <div style={{padding:16}}>
          <div className="section-title">Общие</div>
          {[
            {l:'Фраза для оценки официанта',k:'garconPrompt',ph:'Оцените обслуживание'},
            {l:'Количество столов',k:'tableCount',t:'number'},
            {l:'Соус по умолчанию',k:'defaultSauce'},
          ].map(f=>(
            <div key={f.k} style={{marginBottom:12}}>
              <div style={{fontSize:13,color:'var(--text3)',marginBottom:5}}>{f.l}</div>
              <input type={f.t||'text'} value={local[f.k]||''} placeholder={f.ph||''} onChange={e=>setLocal(p=>({...p,[f.k]:f.t==='number'?+e.target.value:e.target.value}))} />
            </div>
          ))}

          <div style={{marginBottom:12}}>
            <div style={{fontSize:13,color:'var(--text3)',marginBottom:5}}>Соусы (каждый с новой строки)</div>
            <textarea rows={7} value={(local.sauces||[]).join('\n')} onChange={e=>setLocal(p=>({...p,sauces:e.target.value.split('\n').filter(Boolean)}))} style={{resize:'none',fontSize:14}} />
          </div>

          <div className="section-title" style={{marginTop:20}}>QR-заказы для сотрудников</div>
          {[
            {l:'Номер для перевода',k:'transferPhone',ph:'+7 999 000-00-00'},
            {l:'Скидка для сотрудников (%)',k:'staffDiscount',t:'number'},
          ].map(f=>(
            <div key={f.k} style={{marginBottom:12}}>
              <div style={{fontSize:13,color:'var(--text3)',marginBottom:5}}>{f.l}</div>
              <input type={f.t||'text'} value={local[f.k]||''} placeholder={f.ph||''} onChange={e=>setLocal(p=>({...p,[f.k]:f.t==='number'?+e.target.value:e.target.value}))} />
            </div>
          ))}
          <div style={{background:'var(--bg2)',borderRadius:10,padding:12,border:'1px solid var(--border)',marginBottom:12}}>
            <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Ссылка для сотрудников:</div>
            <div style={{color:'var(--gold)',fontSize:14,wordBreak:'break-all'}}>{window.location.origin}/order</div>
          </div>

          <div className="section-title" style={{marginTop:20}}>Принтеры</div>
          {[
            {l:'IP принтера кухни',k:'kitchenPrinterIp',ph:'192.168.1.xx'},
            {l:'IP принтера чеков (Elvis)',k:'receiptPrinterIp',ph:'192.168.1.xx'},
          ].map(f=>(
            <div key={f.k} style={{marginBottom:12}}>
              <div style={{fontSize:13,color:'var(--text3)',marginBottom:5}}>{f.l}</div>
              <input value={local[f.k]||''} placeholder={f.ph} onChange={e=>setLocal(p=>({...p,[f.k]:e.target.value}))} />
            </div>
          ))}

          <div className="section-title" style={{marginTop:20}}>Звук уведомлений (кухня)</div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:13,color:'var(--text3)',marginBottom:5}}>Тип</div>
            <select value={local.notificationSound||'default'} onChange={e=>setLocal(p=>({...p,notificationSound:e.target.value}))}>
              <option value="default">По умолчанию (бип)</option>
              <option value="custom">Свой файл</option>
            </select>
          </div>
          {local.notificationSound==='custom' && (
            <div style={{marginBottom:12}}>
              <input type="file" accept="audio/*" onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setLocal(p=>({...p,notificationSoundUrl:ev.target.result}));r.readAsDataURL(f);}} style={{background:'none',border:'none',padding:0,color:'var(--text2)',fontSize:14}} />
            </div>
          )}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:13,color:'var(--text3)',marginBottom:5}}>Громкость: {local.notificationVolume||80}%</div>
            <input type="range" min="0" max="100" value={local.notificationVolume||80} onChange={e=>setLocal(p=>({...p,notificationVolume:+e.target.value}))} style={{width:'100%',accentColor:'var(--gold)'}} />
          </div>

          <button onClick={saveSettings} className="btn btn-gold" style={{width:'100%',padding:14}}>Сохранить ✓</button>
        </div>
      )}

      {/* VISIBILITY */}
      {tab==='visibility' && (
        <div style={{padding:16}}>
          <div className="section-title">Управление доступом</div>
          <div style={{fontSize:13,color:'var(--text3)',marginBottom:14}}>Включайте функции когда готовы</div>
          <Toggle k="showShiftManager" label="Управление сменой" desc="Кнопка открытия/закрытия у администратора" />
          <Toggle k="showStaffOrder" label="QR-меню для сотрудников" desc="Страница /order без входа" />
          <Toggle k="showStaffMenu" label="Меню персонала у администратора" desc="Вкладка меню персонала со скидкой" />
          <Toggle k="showStaffPayment" label="Оплата сотрудников" desc="Подтверждение переводов" />
          <Toggle k="showCleanerCall" label="Вызов уборщика" desc="Кнопка в кухне и у администратора" />
          <Toggle k="showCleanerPage" label="Страница уборщика" desc="Вход с ролью уборщика" />
          <Toggle k="showShiftPdf" label="Отчёты PDF" desc="Вкладка отчётов у администратора" />
          <button onClick={saveSettings} className="btn btn-gold" style={{width:'100%',padding:14,marginTop:20}}>Сохранить ✓</button>
        </div>
      )}

      {/* USERS */}
      {tab==='users' && (
        <div style={{padding:16}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}>
            <div className="section-title" style={{margin:0}}>Персонал</div>
            <button onClick={()=>setShowNewUser(!showNewUser)} className="btn btn-gold" style={{padding:'8px 14px',fontSize:13}}>+ Добавить</button>
          </div>
          {showNewUser && (
            <div className="card" style={{marginBottom:14}}>
              <div style={{fontWeight:700,marginBottom:12}}>Новый пользователь</div>
              {[{l:'Имя',k:'displayName'},{l:'Логин',k:'username'},{l:'Пароль',k:'password',t:'password'}].map(f=>(
                <div key={f.k} style={{marginBottom:10}}>
                  <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>{f.l}</div>
                  <input type={f.t||'text'} value={newUser[f.k]} onChange={e=>setNewUser(p=>({...p,[f.k]:e.target.value}))} />
                </div>
              ))}
              <div style={{marginBottom:10}}>
                <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Роль</div>
                <select value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}>
                  {Object.entries(ROLES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {newUser.role==='garcon' && (
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Клуб</div>
                  <select value={newUser.club} onChange={e=>setNewUser(p=>({...p,club:e.target.value}))}>
                    <option value="neon">Neon</option><option value="elvis">Elvis</option><option value="enot">Enot</option>
                  </select>
                </div>
              )}
              <button onClick={createUser} className="btn btn-gold" style={{width:'100%'}}>Создать</button>
            </div>
          )}
          {users.filter(u=>u.role!=='superadmin').map(u=>(
            <div key={u._id} className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{fontWeight:600,fontSize:15}}>{u.displayName||u.username}</div>
                  <div style={{fontSize:12,color:'var(--text3)'}}>@{u.username}</div>
                  <div style={{display:'flex',gap:6,marginTop:6}}>
                    <span style={{padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:600,background:'var(--bg4)',color:'var(--text2)'}}>{ROLES[u.role]||u.role}</span>
                    {u.club&&<span style={{padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:600,background:'var(--bg4)',color:'var(--gold)'}}>{u.club.toUpperCase()}</span>}
                  </div>
                </div>
                <button onClick={()=>deleteUser(u._id)} style={{padding:'6px 10px',borderRadius:6,fontSize:13,background:'rgba(231,76,60,0.1)',color:'var(--red)',border:'1px solid rgba(231,76,60,0.2)'}}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MENU */}
      {tab==='menu' && (
        <div style={{padding:16}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}>
            <div className="section-title" style={{margin:0}}>Меню</div>
            <button onClick={()=>setEditItem({name:'',category:'',price:0,weight:'',description:'',hasSauce:false,isNew:true})} className="btn btn-gold" style={{padding:'8px 14px',fontSize:13}}>+ Добавить</button>
          </div>
          {[...new Set(menu.map(i=>i.category))].map(cat=>(
            <div key={cat} style={{marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1.2,marginBottom:8}}>{cat}</div>
              {menu.filter(i=>i.category===cat).map(item=>(
                <div key={item._id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:600}}>{item.name}{item.hasSauce&&<span style={{fontSize:11,background:'rgba(232,200,74,0.1)',color:'var(--gold)',padding:'1px 6px',borderRadius:4,marginLeft:6}}>+соус</span>}</div>
                    <div style={{fontSize:12,color:'var(--gold)'}}>{item.price}₽{item.weight&&` · ${item.weight}`}</div>
                  </div>
                  <button onClick={()=>setEditItem({...item})} style={{padding:'6px 10px',borderRadius:6,fontSize:13,background:'var(--bg3)',color:'var(--text2)',border:'1px solid var(--border)'}}>✏</button>
                  <button onClick={()=>deleteMenuItem(item._id)} style={{padding:'6px 10px',borderRadius:6,fontSize:13,background:'rgba(231,76,60,0.1)',color:'var(--red)',border:'1px solid rgba(231,76,60,0.2)'}}>✕</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* SCHEDULE */}
      {tab==='schedule' && schedule && (
        <div style={{padding:16}}>
          <div className="section-title">График поваров на неделю</div>
          <div style={{fontSize:13,color:'var(--text3)',marginBottom:14}}>Обновляется каждый понедельник автоматически</div>
          {schedule.days.map((day,idx)=>(
            <div key={day.date} style={{background: day.date===today?'rgba(232,200,74,0.06)':'var(--bg2)', border:`1px solid ${day.date===today?'rgba(232,200,74,0.25)':'var(--border)'}`, borderRadius:10, padding:14, marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontWeight:700,fontSize:15}}>{day.dayName}</span>
                  {day.date===today && <span style={{fontSize:11,background:'rgba(232,200,74,0.15)',color:'var(--gold)',padding:'2px 8px',borderRadius:10,fontWeight:700}}>сегодня</span>}
                </div>
                <span style={{fontSize:12,color:'var(--text3)'}}>{day.date}</span>
              </div>
              <input placeholder="Имена поваров через запятую" value={(day.cooks||[]).join(', ')} onChange={e=>updateScheduleDay(idx,e.target.value)} style={{fontSize:14}} />
            </div>
          ))}
          <button onClick={saveSchedule} className="btn btn-gold" style={{width:'100%',padding:14,marginTop:8}}>Сохранить график ✓</button>
        </div>
      )}

      {/* ONLINE */}
      {tab==='online' && (
        <div style={{padding:16}}>
          <div className="section-title">Кто онлайн сейчас</div>
          {!online.length ? <div className="empty">Никого нет онлайн</div> : online.map((u,i)=>(
            <div key={i} className="card" style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:'var(--green)',flexShrink:0}} />
              <div>
                <div style={{fontWeight:600}}>{u.displayName||u.username}</div>
                <div style={{fontSize:12,color:'var(--text3)'}}>{ROLES[u.role]||u.role}{u.club?` · ${u.club.toUpperCase()}`:''}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* APP */}
      {tab==='app' && (
        <div style={{padding:16}}>
          <div className="section-title">Приложение</div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:13,color:'var(--text3)',marginBottom:5}}>Название</div>
            <input value={local.appName||'NEON'} onChange={e=>setLocal(p=>({...p,appName:e.target.value}))} />
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:13,color:'var(--text3)',marginBottom:5}}>Основной цвет</div>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <input type="color" value={local.appColor||'#e8c84a'} onChange={e=>setLocal(p=>({...p,appColor:e.target.value}))} style={{width:56,height:40,padding:2,border:'1px solid var(--border)',borderRadius:8,background:'var(--bg3)',cursor:'pointer'}} />
              <input value={local.appColor||'#e8c84a'} onChange={e=>setLocal(p=>({...p,appColor:e.target.value}))} style={{flex:1}} />
            </div>
          </div>

          <div className="section-title" style={{marginTop:20}}>Цвета клубов в отчётах</div>
          {[{k:'colorNeon',l:'Neon',d:'#00cc99'},{k:'colorElvis',l:'Elvis',d:'#cc3333'},{k:'colorEnot',l:'Enot',d:'#7766cc'}].map(c=>(
            <div key={c.k} style={{marginBottom:12}}>
              <div style={{fontSize:13,color:'var(--text3)',marginBottom:5}}>{c.l}</div>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <input type="color" value={local[c.k]||c.d} onChange={e=>setLocal(p=>({...p,[c.k]:e.target.value}))} style={{width:56,height:40,padding:2,border:'1px solid var(--border)',borderRadius:8,background:'var(--bg3)',cursor:'pointer'}} />
                <input value={local[c.k]||c.d} onChange={e=>setLocal(p=>({...p,[c.k]:e.target.value}))} style={{flex:1}} />
              </div>
            </div>
          ))}

          <div className="section-title" style={{marginTop:20}}>Иконка приложения</div>
          <div style={{marginBottom:12}}>
            <input type="file" accept="image/*" onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setLocal(p=>({...p,appIcon:ev.target.result}));r.readAsDataURL(f);}} style={{background:'none',border:'none',padding:0,color:'var(--text2)',fontSize:14}} />
            {local.appIcon && <img src={local.appIcon} alt="" style={{width:80,height:80,borderRadius:16,marginTop:10,objectFit:'cover'}} />}
          </div>

          <div className="section-title" style={{marginTop:20}}>Пароль Abdo</div>
          <div style={{display:'flex',gap:8,marginBottom:20}}>
            <input type="password" placeholder="Новый пароль" value={newPwd} onChange={e=>setNewPwd(e.target.value)} style={{flex:1}} />
            <button onClick={changePwd} disabled={newPwd.length<4} className="btn btn-gold" style={{padding:'10px 16px',whiteSpace:'nowrap'}}>Сменить</button>
          </div>

          <button onClick={saveSettings} className="btn btn-gold" style={{width:'100%',padding:14}}>Сохранить всё ✓</button>

          <div style={{marginTop:28,padding:16,background:'var(--bg2)',borderRadius:10,border:'1px solid var(--border)',textAlign:'center'}}>
            <div style={{fontFamily:'Bebas Neue, sans-serif',fontSize:28,color:'var(--gold)',letterSpacing:2}}>NEON v3.0</div>
            <div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>Система управления рестораном</div>
          </div>
        </div>
      )}

      {/* Edit menu item modal */}
      {editItem && (
        <div className="modal-overlay" onClick={()=>setEditItem(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700,fontSize:18,marginBottom:14}}>{editItem.isNew?'Новое блюдо':'Редактировать'}</div>
            {[{l:'Название',k:'name'},{l:'Категория',k:'category'},{l:'Цена (₽)',k:'price',t:'number'},{l:'Вес',k:'weight'},{l:'Описание',k:'description'}].map(f=>(
              <div key={f.k} style={{marginBottom:10}}>
                <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>{f.l}</div>
                <input type={f.t||'text'} value={editItem[f.k]||''} onChange={e=>setEditItem(p=>({...p,[f.k]:f.t==='number'?+e.target.value:e.target.value}))} />
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderTop:'1px solid var(--border)',marginTop:4}}>
              <div>
                <div style={{fontSize:15,fontWeight:600}}>Выбор соуса</div>
                <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>Официант выбирает соус при заказе</div>
              </div>
              <button className={`toggle${editItem.hasSauce?' on':''}`} onClick={()=>setEditItem(p=>({...p,hasSauce:!p.hasSauce}))} />
            </div>
            <button onClick={saveMenuItem} className="btn btn-gold" style={{width:'100%',marginTop:14}}>Сохранить</button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
