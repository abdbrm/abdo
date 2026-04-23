import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_ROUTES = { superadmin:'/superadmin', admin:'/admin', garcon:'/garcon', kitchen:'/kitchen', cleaner:'/cleaner' };

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const user = await login(username.trim(), password);
      navigate(ROLE_ROUTES[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка входа');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0a0a0a', padding:24 }}>
      <div style={{ marginBottom:40, textAlign:'center' }}>
        <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:80, letterSpacing:10, color:'#e8c84a', lineHeight:1, textShadow:'0 0 60px rgba(232,200,74,0.25)' }}>NEON</div>
        <div style={{ color:'#444', fontSize:12, letterSpacing:4, marginTop:6 }}>СИСТЕМА УПРАВЛЕНИЯ</div>
      </div>

      <form onSubmit={submit} style={{ width:'100%', maxWidth:360 }}>
        <input type="text" placeholder="Логин" value={username} onChange={e => setUsername(e.target.value)}
          autoComplete="username" style={{ marginBottom:10 }} />
        <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)}
          autoComplete="current-password" style={{ marginBottom:14 }} />
        {error && (
          <div style={{ background:'rgba(231,76,60,0.12)', border:'1px solid rgba(231,76,60,0.3)', borderRadius:8, padding:'10px 14px', marginBottom:12, color:'#ff6b6b', fontSize:14 }}>
            {error}
          </div>
        )}
        <button type="submit" disabled={loading} className="btn btn-gold" style={{ width:'100%', padding:15, fontSize:16, borderRadius:10 }}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
