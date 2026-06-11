import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import './styles/global.css'

// Sentry error monitoring — only active when VITE_SENTRY_DSN is set (production)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Capture 10% of sessions as performance traces in production
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    // Do NOT send user PII to Sentry — strip identifying fields
    beforeSend(event) {
      if (event.user) {
        // Only keep the role, never name or email
        event.user = { role: event.user?.extra?.role };
      }
      return event;
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Service worker: unregister all stale registrations — no SW needed in dev
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    }).catch(() => {});
  });
}
