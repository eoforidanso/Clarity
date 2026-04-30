import React, { useRef, useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTelehealth } from '../contexts/TelehealthContext';

const fmtTimer = (s) =>
  `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function FloatingPiP() {
  const {
    activeSession,
    isMuted,
    isVideoOff,
    camError,
    sessionTimer,
    streamReady,
    localStreamRef,
    toggleMute,
    toggleCamera,
    endSession,
  } = useTelehealth();

  const navigate  = useNavigate();
  const location  = useLocation();
  const videoRef  = useRef(null);
  // Callback ref: attaches stream the instant the <video> element enters the DOM.
  const setVideoRef = useCallback((el) => {
    videoRef.current = el;
    if (el && localStreamRef.current) {
      el.srcObject = localStreamRef.current;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pipRef    = useRef(null);
  const dragRef   = useRef({ dragging: false });
  const [pos, setPos] = useState(null); // null = CSS default (bottom-right)
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Secondary: re-attach when stream becomes ready (element already mounted)
  useEffect(() => {
    if (videoRef.current && localStreamRef.current) {
      videoRef.current.srcObject = localStreamRef.current;
    }
  }, [streamReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag: mousedown on the header bar ────────────────────────────────
  const onHeaderMouseDown = useCallback((e) => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    const rect = pipRef.current.getBoundingClientRect();
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top,
    };

    const onMove = (e) => {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newLeft = Math.max(0, Math.min(dragRef.current.startLeft + dx, window.innerWidth  - 272));
      const newTop  = Math.max(0, Math.min(dragRef.current.startTop  + dy, window.innerHeight - 230));
      setPos({ left: newLeft, top: newTop });
    };

    const onUp = () => {
      dragRef.current.dragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  }, []);

  // ── Don't render when no session or already on /telehealth ───────────
  const isOnTelehealth = location.pathname === '/telehealth' ||
                         location.pathname.endsWith('/telehealth');
  if (!activeSession || isOnTelehealth) return null;

  const posStyle = pos
    ? { left: pos.left, top: pos.top }
    : { bottom: 90, right: 20 };

  const handleEndConfirm = () => {
    setConfirmEnd(false);
    endSession();
    navigate('/telehealth');
  };

  return ReactDOM.createPortal(
    <div
      ref={pipRef}
      className="telehealth-floating-pip"
      style={{ position: 'fixed', zIndex: 9999, ...posStyle }}
    >
      {/* ── Header / drag handle ──────────────────────────────── */}
      <div className="tfp-header" onMouseDown={onHeaderMouseDown}>
        <span className="tfp-live">🔴 LIVE</span>
        <span className="tfp-timer">{fmtTimer(sessionTimer)}</span>
        <span className="tfp-patient" title={activeSession.apt.patientName}>
          {activeSession.apt.patientName}
        </span>
        <button
          className="tfp-icon-btn"
          title="Return to full session"
          onClick={() => navigate('/telehealth')}
        >
          ↗
        </button>
      </div>

      {/* ── Video area ────────────────────────────────────────── */}
      <div className="tfp-video-area">
        {!camError && !isVideoOff && streamReady ? (
          <video ref={setVideoRef} autoPlay playsInline muted className="tfp-video" />
        ) : (
          <div className="tfp-video-placeholder">
            <span style={{ fontSize: 30 }}>
              {camError ? '⚠️' : isVideoOff ? '📵' : '📹'}
            </span>
            <span className="tfp-video-label">
              {camError === 'denied'       ? 'Camera access denied'
                : camError === 'unavailable' ? 'No camera detected'
                : isVideoOff               ? 'Camera off'
                :                            'Connecting…'}
            </span>
          </div>
        )}
        <span className="tfp-you-label">You {isMuted ? '🔇' : '🎤'}</span>
      </div>

      {/* ── Controls ─────────────────────────────────────────── */}
      {confirmEnd ? (
        <div className="tfp-confirm">
          <span className="tfp-confirm-text">End session?</span>
          <button className="tfp-confirm-yes" onClick={handleEndConfirm}>End</button>
          <button className="tfp-confirm-no"  onClick={() => setConfirmEnd(false)}>Cancel</button>
        </div>
      ) : (
        <div className="tfp-controls">
          <button
            className={`tfp-ctrl-btn${isMuted ? ' active' : ''}`}
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>
          <button
            className={`tfp-ctrl-btn${isVideoOff ? ' active' : ''}`}
            onClick={toggleCamera}
            title={isVideoOff ? 'Camera on' : 'Camera off'}
          >
            {isVideoOff ? '📵' : '📹'}
          </button>
          <button
            className="tfp-ctrl-btn tfp-return"
            onClick={() => navigate('/telehealth')}
            title="Return to full session"
          >
            ↗ Return to Session
          </button>
          <button
            className="tfp-ctrl-btn tfp-end"
            onClick={() => setConfirmEnd(true)}
            title="End session"
          >
            ✕
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
