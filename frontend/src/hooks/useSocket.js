import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(window.location.origin, {
      transports: ['polling', 'websocket'],
      reconnectionDelay: 3000
    });
  }
  return socket;
};

export const useSocket = (events = {}) => {
  const ref = useRef(events);
  ref.current = events;

  useEffect(() => {
    const s = getSocket();
    const handlers = {};
    Object.entries(ref.current).forEach(([ev, fn]) => {
      handlers[ev] = (...args) => ref.current[ev]?.(...args);
      s.on(ev, handlers[ev]);
    });
    return () => Object.entries(handlers).forEach(([ev, fn]) => s.off(ev, fn));
  }, []);
};

export const emitOnline = (user) => {
  if (!user) return;
  setTimeout(() => {
    getSocket().emit('userOnline', {
      userId: user._id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      club: user.club
    });
  }, 800);
};
