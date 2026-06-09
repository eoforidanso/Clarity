import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const NotificationContext = createContext(null);

/* ── Notification Types ──────────────────────────────── */
const NOTIFICATION_TYPES = {
  info: { icon: 'ℹ️', color: 'var(--info)', bg: 'var(--info-light)' },
  success: { icon: '✅', color: 'var(--success)', bg: 'var(--success-light)' },
  warning: { icon: '⚠️', color: 'var(--warning)', bg: 'var(--warning-light)' },
  error: { icon: '🚨', color: 'var(--danger)', bg: 'var(--danger-light)' },
  message: { icon: '💬', color: 'var(--primary)', bg: 'var(--primary-light)' },
  lab: { icon: '🔬', color: 'var(--purple)', bg: 'var(--purple-light)' },
  appointment: { icon: '📅', color: 'var(--teal)', bg: 'var(--teal-light)' },
  order: { icon: '📋', color: 'var(--orange)', bg: 'var(--orange-light)' },
};

let idCounter = 0;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const timerRefs = useRef({});

  // Recalculate unread count
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // Add a notification + show a toast
  const addNotification = useCallback((notification) => {
    const id = `notif-${++idCounter}`;
    const now = new Date();
    const newNotif = {
      id,
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      read: false,
      timestamp: now,
      timeStr: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      action: notification.action || null,
      ...NOTIFICATION_TYPES[notification.type || 'info'],
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50)); // keep max 50

    // Show toast
    const toastId = `toast-${id}`;
    setToasts(prev => [...prev, { ...newNotif, toastId }]);
    timerRefs.current[toastId] = setTimeout(() => {
      dismissToast(toastId);
    }, 5000);

    return id;
  }, []);

  const dismissToast = useCallback((toastId) => {
    if (timerRefs.current[toastId]) {
      clearTimeout(timerRefs.current[toastId]);
      delete timerRefs.current[toastId];
    }
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const togglePanel = useCallback(() => {
    setShowPanel(prev => !prev);
  }, []);

  const closePanel = useCallback(() => {
    setShowPanel(false);
  }, []);

  // Demo notifications removed — notifications loaded from backend API only

  return (
    <NotificationContext.Provider value={{
      notifications, toasts, unreadCount, showPanel,
      addNotification, dismissToast, markAsRead, markAllRead,
      clearAll, togglePanel, closePanel,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
