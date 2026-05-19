import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useSound } from '../hooks/useSound';
import API from '../api';

export default function CleanerPage() {
  const { logout } = useAuth();
  const { notify, requestPermission } = useSound();
  const [calls, setCalls] = useState([]);

  useEffect(() => { requestPermission(); load(); }, []);

  useSocket({
    cleanerCall: c => { setCalls(p=>[c,...p]); notify(`Вызов — ${c.location}`); },
    cleanerUpdated: c => setCalls(p => c.status==='done' ? p.filter(x=>x._id!==c._id) : p.map(x=>x._id===c._id?c:x)),
  });

  const load = async () => { try{const r=await API.get('/cleaner');setCalls(r.data);}catch{} };

  const ack = async (id, eta) => {
    try { await API.put(`/cleaner/${id}/ack`, {etaMinutes:eta}); load(); } catch {}
  };

  const done = async id => {
    try { await API.put(`/cleaner/${id}/done`); setCalls(p=>p.filter(c=>c._id!==id)); } catch {}
  };

  return (
    <div className="page">
      <div className="topbar">
        <span className="logo">УБОРЩИК</span>
        <button onClick={logout} style={{background:'none',color:'var(--text3)',fontSize:13}}>Выйти</button>
      </div>
      <div style={{padding:16}}>
        {!calls.length ? (
          <div style={{textAlign:'center',marginTop:80}}>
            <div style={{fontSize:56,marginBottom:16}}>🧹</div>
            <div style={{color:'var(--text3)',fontSize:16}}>Ожидание вызова...</div>
          </div>
        ) : calls.map(call=>(
          <div key={call._id} className="card">
            <div style={{fontSize:22,fontWeight:700,marginBottom:6}}>📍 {call.location}</div>
            <div style={{fontSize:13,color:'var(--text3)',marginBottom:12}}>Вызвал: {call.calledBy}</div>
            {call.adminReply && (
              <div style={{background:'rgba(232,200,74,0.08)',border:'1px solid rgba(232,200,74,0.25)',borderRadius:8,padding:'10px 12px',marginBottom:12,color:'var(--gold)',fontSize:14}}>
                💬 {call.adminReply}
              </div>
            )}
            {call.status==='pending' ? (
              <>
                <div style={{fontSize:14,color:'var(--text2)',marginBottom:10}}>Когда придёте?</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                  {[5,10,15,20].map(m=>(
                    <button key={m} onClick={()=>ack(call._id,m)} style={{padding:'12px 6px',borderRadius:8,fontSize:15,fontWeight:700,background:'var(--bg3)',color:'var(--text)',border:'1px solid var(--border)'}}>{m} мин</button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{color:'var(--green)',fontWeight:600,marginBottom:10}}>✓ Буду через {call.etaMinutes} мин</div>
                <button onClick={()=>done(call._id)} className="btn btn-green" style={{width:'100%'}}>✓ Убрал, готово</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
