import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';

import LoginPage from './pages/LoginPage';
import GarconPage from './pages/GarconPage';
import KitchenPage from './pages/KitchenPage';
import AdminPage from './pages/AdminPage';
import SuperAdminPage from './pages/SuperAdminPage';
import CleanerPage from './pages/CleanerPage';
import StaffOrderPage from './pages/StaffOrderPage';
import ShiftGate from './components/ShiftGate';

const ROLE_ROUTES = {
  superadmin: '/superadmin',
  admin: '/admin',
  garcon: '/garcon',
  kitchen: '/kitchen',
  cleaner: '/cleaner'
};

const Guard = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const Home = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_ROUTES[user.role] || '/login'} replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Home />} />
            <Route path="/garcon" element={<Guard roles={['garcon']}><ShiftGate><GarconPage /></ShiftGate></Guard>} />
            <Route path="/kitchen" element={<Guard roles={['kitchen']}><ShiftGate><KitchenPage /></ShiftGate></Guard>} />
            <Route path="/admin" element={<Guard roles={['admin']}><AdminPage /></Guard>} />
            <Route path="/superadmin" element={<Guard roles={['superadmin']}><SuperAdminPage /></Guard>} />
            <Route path="/cleaner" element={<Guard roles={['cleaner']}><CleanerPage /></Guard>} />
            <Route path="/order" element={<StaffOrderPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
