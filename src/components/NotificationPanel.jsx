import React, { useEffect, useRef } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function NotificationPanel() {
  const { notifications, showPanel, closePanel, markAsRead, markAllRead, clearAll, unreadCount } = useNotifications();
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest('.notif-bell-btn')) {
        closePanel();
      }
    };
    if (showPanel) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPanel, closePanel]);

  if (!showPanel) return null;

  return (
    <div className="notification-panel" ref={panelRef}>
      <div className="notification-panel-header">
        <h3>🔔 Notifications</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <button className="btn btn-sm btn-ghost" onClick={markAllRead}>Mark all read</button>
          )}
          {notifications.length > 0 && (
            <button className="btn btn-sm btn-ghost" onClick={clearAll} style={{ color: 'var(--text-muted)' }}>Clear</button>
          )}
        </div>
      </div>
      <div className="notification-panel-body">
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
            <p style={{ fontSize: 13 }}>No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`notification-item ${n.read ? '' : 'unread'}`}
              onClick={() => markAsRead(n.id)}
            >
              <div className="notification-item-icon" style={{ background: n.bg, color: n.color }}>{n.icon}</div>
              <div className="notification-item-body">
                <div className="notification-item-title">{n.title}</div>
                <div className="notification-item-message">{n.message}</div>
                <div className="notification-item-time">{timeAgo(n.timestamp)}</div>
              </div>
              {!n.read && <div className="notification-unread-dot" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
