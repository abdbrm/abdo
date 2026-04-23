import { useRef, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';

export const useSound = () => {
  const { settings } = useSettings();
  const ctxRef = useRef(null);

  const play = useCallback(() => {
    const vol = (settings.notificationVolume || 80) / 100;
    if (settings.notificationSoundUrl) {
      const a = new Audio(settings.notificationSoundUrl);
      a.volume = vol; a.play().catch(() => {});
      return;
    }
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = ctxRef.current;
      const beep = (freq, start, dur) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'sine';
        g.gain.setValueAtTime(vol * 0.35, ctx.currentTime + start);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      beep(880, 0, 0.18); beep(1100, 0.22, 0.18); beep(880, 0.44, 0.25);
    } catch {}
  }, [settings]);

  const notify = useCallback((msg) => {
    play();
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('NEON', { body: msg, icon: '/icon-192.png' });
    }
  }, [play]);

  const requestPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  return { play, notify, requestPermission };
};
