import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import API from '../api';

export default function ShiftGate({ children }) {
  const { user } = useAuth();
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const pollRef = useRef(null);

  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const load = useCallback(async () => {
    try {
      const r = await API.get('/shift/today');
      setShift(r.data.shift);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  useSocket({
    shiftOpened:  s => { setShift(s); setLoading(false); },
    shiftClosed:  s => { setShift(s); setLoading(false); },
    shiftUpdated: s => { setShift(s); setLoading(false); },
  });

  const confirmArrival = async () => {
    setConfirming(true);
    try {
      const r = await API.put('/shift/cook-arrived');
      setShift(r.data);
    } catch {}
    finally { setConfirming(false); }
  };

  // All hooks above — admins pass through after hooks
  if (isAdmin) return children;

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.logo}>NEON</div>
        <div className="spinner" />
      </div>
    );
  }

  if (!shift || shift.status === 'pending') {
    return <WaitScreen icon="🔒" title="Смена не открыта" sub="Ожидайте открытия смены..." />;
  }

  if (shift.status === 'closed') {
    return <WaitScreen icon="🔒" title="Смена закрыта" sub="До свидания!" />;
  }

  const uid = user?._id?.toString();

  if (user?.role === 'kitchen') {
    const myCook = shift.cooks?.find(c => c.userId?.toString() === uid);
    if (!myCook) return <WaitScreen icon="⏳" title="Вы не выбраны" sub="Обратитесь к администратору" />;
    if (!myCook.arrived) {
      return (
        <div style={styles.center}>
          <div style={styles.logo}>NEON</div>
          <div style={styles.card}>
            <div style={styles.icon}>👨‍🍳</div>
            <div style={styles.title}>Смена открыта!</div>
            <div style={styles.sub}>Подтвердите что вы на месте</div>
            <button onClick={confirmArrival} disabled={confirming} style={styles.btn}>
              {confirming ? '...' : '✓ Я на месте'}
            </button>
          </div>
        </div>
      );
    }
    return children;
  }

  if (user?.role === 'garcon') {
    const selected = shift.garcons?.some(g => g.userId?.toString() === uid);
    if (!selected) return <WaitScreen icon="⏳" title="Вы не выبраны" sub="Обратитесь к администратору" />;
    const anyCookArrived = shift.cooks?.some(c => c.arrived) || shift.cookArrived;
    if (!anyCookArrived) {
      return <WaitScreen icon="👨‍🍳" title="Ожидаем повара" sub="Смена начнётся когда повар подтвердит приход" />;
    }
    return children;
  }

  return children;
}

function WaitScreen({ icon, title, sub }) {
  return (
    <div style={styles.center}>
      <div style={styles.logo}>NEON</div>
      <div style={styles.card}>
        <div style={styles.icon}>{icon}</div>
        <div style={styles.title}>{title}</div>
        <div style={styles.sub}>{sub}</div>
      </div>
    </div>
  );
}

const styles = {
  center: { minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0a0a0a', padding:24 },
  logo: { fontFamily:'Bebas Neue, sans-serif', fontSize:56, color:'#e8c84a', letterSpacing:6, marginBottom:32 },
  card: { background:'#111', border:'1px solid #222', borderRadius:16, padding:32, textAlign:'center', maxWidth:320, width:'100%' },
  icon: { fontSize:52, marginBottom:16 },
  title: { fontSize:20, fontWeight:700, color:'#f0f0f0', marginBottom:8 },
  sub: { fontSize:14, color:'#888', lineHeight:1.6, marginBottom:24 },
  btn: { width:'100%', padding:'15px', background:'#e8c84a', color:'#000', borderRadius:12, fontWeight:700, fontSize:17, border:'none', cursor:'pointer' },
};
