import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.toastId} className={`toast toast-${t.type}`} onClick={() => dismissToast(t.toastId)}>
          <div className="toast-icon">{t.icon}</div>
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            <div className="toast-message">{t.message}</div>
          </div>
          <button className="toast-close" onClick={(e) => { e.stopPropagation(); dismissToast(t.toastId); }}>✕</button>
        </div>
      ))}
    </div>
  );
}
