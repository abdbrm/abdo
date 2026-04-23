import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../api';

const Ctx = createContext({});

const DEFAULTS = {
  appName: 'NEON', appColor: '#e8c84a', appIcon: null,
  garconPrompt: '', tableCount: 15,
  sauces: ['Сырный','Кетчуп','Чесночный','Горчица','Терияки','Кисло-сладкий','Сладкий чили'],
  defaultSauce: 'Сырный', transferPhone: '', staffDiscount: 0,
  notificationSound: 'default', notificationVolume: 80, notificationSoundUrl: null,
  kitchenPrinterIp: '', receiptPrinterIp: '',
  colorNeon: '#00aaff', colorElvis: '#8B6348', colorEnot: '#e03535',
  showStaffOrder: false, showStaffPayment: false, showShiftManager: false,
  showCleanerCall: false, showCleanerPage: false, showShiftPdf: false, showStaffMenu: false
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    const token = localStorage.getItem('neon_token');
    if (token) API.get('/settings').then(r => setSettings(r.data)).catch(() => {});
  }, []);

  const save = async (updates) => {
    setSettings(p => ({ ...p, ...updates }));
    await API.put('/settings', updates);
  };

  return <Ctx.Provider value={{ settings, save, setSettings }}>{children}</Ctx.Provider>;
};

export const useSettings = () => useContext(Ctx);
