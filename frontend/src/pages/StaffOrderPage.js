import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PUB = axios.create({ baseURL: '/api' });

export default function StaffOrderPage() {
  const [menu, setMenu] = useState([]);
  const [cfg, setCfg] = useState({});
  const [cart, setCart] = useState([]);
  const [view, setView] = useState('menu');
  const [cat, setCat] = useState(null);
  const [comment, setComment] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    PUB.get('/settings/public').then(r=>setCfg(r.data)).catch(()=>{});
    PUB.get('/menu/public').then(r=>setMenu(r.data)).catch(()=>{});
  }, []);

  if (!cfg.staffMenuVisible) {
    return (
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#0a0a0a',gap:16,fontFamily:'Inter,sans-serif'}}>
        <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:64,color:'#e8c84a',letterSpacing:8}}>NEON</div>
        <div style={{color:'#555',fontSize:14}}>Меню недоступно</div>
      </div>
    );
  }

  const disc = cfg.staffDiscount || 0;
  const discPrice = p => disc ? Math.round(p * (1 - disc/100)) : p;

  const cats = [...new Set(menu.map(i=>i.category))];
  const filtered = menu.filter(i=>!cat||i.category===cat);
  const count = cart.reduce((s,i)=>s+i.qty,0);
  const total = cart.reduce((s,i)=>s+discPrice(i.price)*i.qty,0);
  const origTotal = cart.reduce((s,i)=>s+i.price*i.qty,0);

  const add = item => setCart(p=>{const ex=p.find(c=>c._id===item._id);if(ex)return p.map(c=>c._id===item._id?{...c,qty:c.qty+1}:c);return[...p,{...item,qty:1}];});
  const upd = (id,d) => setCart(p=>p.map(c=>c._id===id?{...c,qty:Math.max(0,c.qty+d)}:c).filter(c=>c.qty>0));

  const onFile = e => {
    const f=e.target.files[0]; if(!f)return;
    const r=new FileReader(); r.onload=ev=>{setScreenshot(ev.target.result);setPreview(ev.target.result);}; r.readAsDataURL(f);
  };

  const send = async () => {
    setSending(true);
    try {
      await PUB.post('/orders/staff', {
        tableNumber:0, club:'neon',
        items: cart.map(i=>({menuItemId:i._id,name:i.name,quantity:i.qty,price:discPrice(i.price)})),
        comment, screenshotUrl:screenshot, paymentAmount:total
      });
      setView('done');
    } catch { alert('Ошибка, попробуйте снова'); }
    setSending(false);
  };

  const S = {
    page:{minHeight:'100vh',background:'#0a0a0a',color:'#f0f0f0',paddingBottom:80,fontFamily:'Inter,sans-serif'},
    hdr:{background:'#111',borderBottom:'1px solid #222',padding:'13px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100},
    logo:{fontFamily:'Bebas Neue,sans-serif',fontSize:28,color:'#e8c84a',letterSpacing:3},
    back:{background:'#1a1a1a',color:'#888',border:'1px solid #2a2a2a',borderRadius:8,padding:'7px 14px',fontSize:14,cursor:'pointer'},
    cartBtn:{background:'#e8c84a',color:'#000',border:'none',borderRadius:8,padding:'8px 16px',fontWeight:700,fontSize:14,cursor:'pointer'},
    catBtn:(a)=>({padding:'6px 14px',borderRadius:20,fontSize:13,fontWeight:600,whiteSpace:'nowrap',background:a?'#e8c84a':'#1a1a1a',color:a?'#000':'#888',border:'1px solid #2a2a2a',cursor:'pointer'}),
    addBtn:{width:36,height:36,borderRadius:8,background:'#e8c84a',color:'#000',border:'none',fontSize:22,fontWeight:700,cursor:'pointer'},
    qBtn:(type)=>({width:32,height:32,borderRadius:6,background:type==='+'?'#e8c84a':'#1a1a1a',color:type==='+'?'#000':'#f0f0f0',border:type==='+'?'none':'1px solid #2a2a2a',fontSize:18,cursor:'pointer'}),
  };

  if (view === 'done') return (
    <div style={{...S.page,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,padding:24}}>
      <div style={{fontSize:64}}>✅</div>
      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:32,color:'#e8c84a',letterSpacing:2}}>Заказ отправлен!</div>
      <div style={{color:'#888',textAlign:'center',fontSize:15}}>Ваш заказ принят и передан на кухню</div>
      <button onClick={()=>{setCart([]);setView('menu');setScreenshot(null);setPreview(null);setComment('');}} style={{padding:'14px 32px',borderRadius:10,background:'#e8c84a',color:'#000',fontWeight:700,fontSize:16,border:'none',cursor:'pointer',marginTop:8}}>Новый заказ</button>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.hdr}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={S.logo}>{cfg.appName||'NEON'}</span>
          {disc>0 && <span style={{fontSize:14,color:'#e8c84a',fontWeight:700,background:'rgba(232,200,74,0.1)',padding:'3px 10px',borderRadius:20}}>−{disc}%</span>}
        </div>
        {view==='menu' && count>0 && <button style={S.cartBtn} onClick={()=>setView('cart')}>🛒 {count} · {total}₽</button>}
        {view!=='menu' && <button style={S.back} onClick={()=>setView(view==='payment'?'cart':'menu')}>← Назад</button>}
      </div>

      {view==='menu' && (
        <>
          <div style={{display:'flex',overflowX:'auto',gap:8,padding:'12px 16px',scrollbarWidth:'none'}}>
            <button style={S.catBtn(!cat)} onClick={()=>setCat(null)}>Все</button>
            {cats.map(c=><button key={c} style={S.catBtn(cat===c)} onClick={()=>setCat(c)}>{c}</button>)}
          </div>
          <div style={{padding:'0 16px 16px'}}>
            {filtered.map(item=>{
              const inC=cart.find(c=>c._id===item._id);
              const dp=discPrice(item.price);
              return (
                <div key={item._id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid #1a1a1a'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:600}}>{item.name}</div>
                    {item.description&&<div style={{fontSize:12,color:'#555',marginTop:2,lineHeight:1.4}}>{item.description}</div>}
                    <div style={{display:'flex',gap:8,marginTop:4,alignItems:'center'}}>
                      <span style={{color:'#e8c84a',fontWeight:700,fontSize:15}}>{dp}₽</span>
                      {disc>0&&<span style={{color:'#555',fontSize:12,textDecoration:'line-through'}}>{item.price}₽</span>}
                      {item.weight&&<span style={{color:'#555',fontSize:12}}>{item.weight}</span>}
                    </div>
                  </div>
                  {inC ? (
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <button style={S.qBtn('-')} onClick={()=>upd(item._id,-1)}>−</button>
                      <span style={{fontWeight:700,minWidth:20,textAlign:'center'}}>{inC.qty}</span>
                      <button style={S.qBtn('+')} onClick={()=>upd(item._id,1)}>+</button>
                    </div>
                  ) : (
                    <button style={S.addBtn} onClick={()=>add(item)}>+</button>
                  )}
                </div>
              );
            })}
          </div>
          {count>0 && (
            <div style={{position:'fixed',bottom:0,left:0,right:0,padding:12,background:'#0a0a0a',borderTop:'1px solid #1a1a1a'}}>
              <button onClick={()=>setView('cart')} style={{width:'100%',padding:14,borderRadius:10,background:'#e8c84a',color:'#000',fontWeight:700,fontSize:15,border:'none',cursor:'pointer'}}>
                Корзина · {count} поз. · {total}₽
              </button>
            </div>
          )}
        </>
      )}

      {view==='cart' && (
        <div style={{padding:16}}>
          <div style={{fontSize:11,fontWeight:700,color:'#555',textTransform:'uppercase',letterSpacing:1.5,marginBottom:12}}>Ваш заказ</div>
          {cart.map(item=>(
            <div key={item._id} style={{background:'#111',borderRadius:10,padding:12,marginBottom:10,border:'1px solid #1a1a1a'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:15}}>{item.name}</div>
                  <div style={{display:'flex',gap:8,marginTop:4,alignItems:'center'}}>
                    <span style={{color:'#e8c84a',fontWeight:700}}>{discPrice(item.price)*item.qty}₽</span>
                    {disc>0&&<span style={{color:'#555',fontSize:12,textDecoration:'line-through'}}>{item.price*item.qty}₽</span>}
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <button style={S.qBtn('-')} onClick={()=>upd(item._id,-1)}>−</button>
                  <span style={{fontWeight:700,minWidth:20,textAlign:'center'}}>{item.qty}</span>
                  <button style={S.qBtn('+')} onClick={()=>upd(item._id,1)}>+</button>
                </div>
              </div>
            </div>
          ))}
          <textarea placeholder="Комментарий..." value={comment} onChange={e=>setComment(e.target.value)} rows={3}
            style={{width:'100%',background:'#111',border:'1px solid #222',color:'#f0f0f0',borderRadius:8,padding:'10px 14px',fontSize:14,resize:'none',fontFamily:'Inter,sans-serif',marginTop:8}} />
          <div style={{display:'flex',justifyContent:'space-between',padding:'14px 0',borderTop:'1px solid #1a1a1a',marginTop:10}}>
            <span style={{color:'#888'}}>Итого{disc>0?` (−${disc}%)`:''}</span>
            <span style={{color:'#e8c84a',fontWeight:700,fontSize:18}}>{total}₽</span>
          </div>
          <button onClick={()=>setView('payment')} style={{width:'100%',padding:14,borderRadius:10,background:'#e8c84a',color:'#000',fontWeight:700,fontSize:15,border:'none',cursor:'pointer'}}>
            Перейти к оплате
          </button>
        </div>
      )}

      {view==='payment' && (
        <div style={{padding:16}}>
          <div style={{background:'#111',borderRadius:14,padding:22,marginBottom:16,border:'1px solid #222',textAlign:'center'}}>
            <div style={{fontSize:13,color:'#888',marginBottom:8}}>Переведите на номер</div>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:34,color:'#e8c84a',letterSpacing:2}}>{cfg.transferPhone||'—'}</div>
            <div style={{fontSize:26,fontWeight:700,marginTop:12}}>{total}₽</div>
            {disc>0&&<div style={{fontSize:13,color:'#2ecc71',marginTop:4}}>Скидка {disc}% применена</div>}
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:13,color:'#888',marginBottom:10}}>Прикрепите скриншот перевода</div>
            <label style={{display:'block',padding:20,borderRadius:10,border:'2px dashed #2a2a2a',textAlign:'center',cursor:'pointer',background:'#111'}}>
              {preview ? <img src={preview} alt="" style={{width:'100%',borderRadius:8,maxHeight:300,objectFit:'contain'}} /> : (
                <div><div style={{fontSize:32,marginBottom:8}}>📸</div><div style={{color:'#555',fontSize:14}}>Нажмите для загрузки</div></div>
              )}
              <input type="file" accept="image/*" onChange={onFile} style={{display:'none'}} />
            </label>
          </div>
          <button onClick={send} disabled={sending||!screenshot} style={{width:'100%',padding:14,borderRadius:10,fontSize:15,fontWeight:700,border:'none',cursor:screenshot?'pointer':'not-allowed',background:screenshot?'#e8c84a':'#2a2a2a',color:screenshot?'#000':'#555'}}>
            {sending?'Отправка...':'✓ Отправить заказ'}
          </button>
          {!screenshot&&<div style={{textAlign:'center',color:'#555',fontSize:13,marginTop:8}}>Прикрепите скриншот перевода</div>}
        </div>
      )}
    </div>
  );
}
