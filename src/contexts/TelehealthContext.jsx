import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const TelehealthContext = createContext(null);

export function TelehealthProvider({ children }) {
  // Session object: null | { apt, patient, consentRecord }
  const [activeSession, setActiveSession] = useState(null);

  // Media / session state shared across pages
  const [isMuted,      setIsMuted]      = useState(false);
  const [isVideoOff,   setIsVideoOff]   = useState(false);
  const [isRecording,  setIsRecording]  = useState(false);
  const [camError,     setCamError]     = useState(null); // 'denied' | 'unavailable' | null
  const [sessionTimer, setSessionTimer] = useState(0);
  const [streamReady,  setStreamReady]  = useState(false);

  // The live MediaStream — stored in a ref so it doesn't cause extra renders
  const localStreamRef = useRef(null);

  // ── Acquire / release camera when session starts or ends ──────────────
  useEffect(() => {
    if (!activeSession) {
      // Session ended: stop tracks and reset everything
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setStreamReady(false);
      setSessionTimer(0);
      setIsMuted(false);
      setIsVideoOff(false);
      setIsRecording(false);
      setCamError(null);
      return;
    }

    let cancelled = false;
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        setStreamReady(true);
      })
      .catch(err => {
        if (cancelled) return;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCamError('denied');
        } else {
          setCamError('unavailable');
        }
      });

    return () => { cancelled = true; };
  }, [activeSession]);

  // ── Session timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSession) return;
    const id = setInterval(() => setSessionTimer(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  // ── Sync mute state to audio tracks ──────────────────────────────────
  useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
  }, [isMuted]);

  // ── Sync camera state to video tracks ────────────────────────────────
  useEffect(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !isVideoOff; });
  }, [isVideoOff]);

  const startSession    = (sessionData) => setActiveSession(sessionData);
  const endSession      = ()            => setActiveSession(null);
  const toggleMute      = ()            => setIsMuted(m => !m);
  const toggleCamera    = ()            => setIsVideoOff(v => !v);
  const toggleRecording = ()            => setIsRecording(r => !r);

  return (
    <TelehealthContext.Provider value={{
      activeSession,
      startSession,
      endSession,
      isMuted,
      isVideoOff,
      isRecording,
      camError,
      sessionTimer,
      streamReady,
      localStreamRef,
      toggleMute,
      toggleCamera,
      toggleRecording,
    }}>
      {children}
    </TelehealthContext.Provider>
  );
}

export function useTelehealth() {
  const ctx = useContext(TelehealthContext);
  if (!ctx) throw new Error('useTelehealth must be used within TelehealthProvider');
  return ctx;
}
