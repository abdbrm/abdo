import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../api';
import { emitOnline } from '../hooks/useSocket';

const Ctx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('neon_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('neon_token');
    if (token) {
      API.get('/auth/me')
        .then(r => { setUser(r.data); localStorage.setItem('neon_user', JSON.stringify(r.data)); emitOnline(r.data); })
        .catch(() => { localStorage.removeItem('neon_token'); localStorage.removeItem('neon_user'); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const r = await API.post('/auth/login', { username, password });
    localStorage.setItem('neon_token', r.data.token);
    localStorage.setItem('neon_user', JSON.stringify(r.data.user));
    setUser(r.data.user);
    emitOnline(r.data.user);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem('neon_token');
    localStorage.removeItem('neon_user');
    setUser(null);
  };

  return <Ctx.Provider value={{ user, login, logout, loading }}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);
