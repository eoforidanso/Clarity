import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

const TelehealthContext = createContext(null);

export function TelehealthProvider({ children }) {
  const [activeSession, setActiveSession] = useState(null);

  const [isMuted,      setIsMuted]      = useState(false);
  const [isVideoOff,   setIsVideoOff]   = useState(false);
  const [isRecording,  setIsRecording]  = useState(false);
  const [camError,     setCamError]     = useState(null); // 'denied' | 'unavailable' | 'insecure' | 'audio-only' | null
  const [sessionTimer, setSessionTimer] = useState(0);
  const [streamReady,  setStreamReady]  = useState(false);
  const [audioOnly,    setAudioOnly]    = useState(false); // true when video failed but audio succeeded

  // Available devices for selection
  const [videoDevices,      setVideoDevices]      = useState([]);
  const [audioDevices,      setAudioDevices]      = useState([]);
  const [selectedVideoId,   setSelectedVideoId]   = useState('');
  const [selectedAudioId,   setSelectedAudioId]   = useState('');

  const localStreamRef  = useRef(null);
  const acquiringRef    = useRef(false); // prevent concurrent acquisition

  // ── Enumerate available media devices ──────────────────────────────────
  const enumerateDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vids = devices.filter(d => d.kind === 'videoinput');
      const auds = devices.filter(d => d.kind === 'audioinput');
      setVideoDevices(vids);
      setAudioDevices(auds);
      if (vids.length && !selectedVideoId) setSelectedVideoId(vids[0].deviceId);
      if (auds.length && !selectedAudioId) setSelectedAudioId(auds[0].deviceId);
    } catch {
      // Enumeration failed — not critical
    }
  }, [selectedVideoId, selectedAudioId]);

  // ── Core: acquire camera + mic ──────────────────────────────────────────
  const acquireStream = useCallback(async ({ videoDeviceId, audioDeviceId } = {}) => {
    if (acquiringRef.current) return;
    acquiringRef.current = true;

    // Stop any existing tracks before re-acquiring
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setStreamReady(false);
    setCamError(null);
    setAudioOnly(false);

    // Require HTTPS (getUserMedia doesn't work on plain HTTP except localhost)
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
    if (!navigator.mediaDevices?.getUserMedia || !isSecure) {
      setCamError('insecure');
      acquiringRef.current = false;
      return;
    }

    const videoConstraints = videoDeviceId
      ? { deviceId: { exact: videoDeviceId } }
      : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } };

    const audioConstraints = audioDeviceId
      ? { deviceId: { exact: audioDeviceId }, echoCancellation: true, noiseSuppression: true }
      : { echoCancellation: true, noiseSuppression: true };

    try {
      // Attempt full video + audio
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
      });
      localStreamRef.current = stream;

      // Listen for physical device disconnect
      stream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          // Only fire if session is still active
          if (localStreamRef.current) {
            setCamError(track.kind === 'video' ? 'unavailable' : 'unavailable');
            setStreamReady(false);
          }
        });
      });

      setStreamReady(true);
      await enumerateDevices(); // refresh device list now that permission is granted
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCamError('denied');
        acquiringRef.current = false;
        return;
      }

      // Video unavailable — try audio-only fallback
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        localStreamRef.current = audioStream;
        setAudioOnly(true);
        setCamError('audio-only');
        setIsVideoOff(true);
        setStreamReady(true);
        await enumerateDevices();
      } catch {
        // Both video and audio failed
        setCamError('unavailable');
      }
    } finally {
      acquiringRef.current = false;
    }
  }, [enumerateDevices]);

  // ── Retry camera access (called from UI) ───────────────────────────────
  const retryCam = useCallback(() => {
    if (!activeSession) return;
    acquireStream({ videoDeviceId: selectedVideoId || undefined, audioDeviceId: selectedAudioId || undefined });
  }, [activeSession, acquireStream, selectedVideoId, selectedAudioId]);

  // ── Switch camera/mic device ───────────────────────────────────────────
  const switchVideoDevice = useCallback((deviceId) => {
    setSelectedVideoId(deviceId);
    if (activeSession) acquireStream({ videoDeviceId: deviceId, audioDeviceId: selectedAudioId || undefined });
  }, [activeSession, acquireStream, selectedAudioId]);

  const switchAudioDevice = useCallback((deviceId) => {
    setSelectedAudioId(deviceId);
    if (activeSession) acquireStream({ videoDeviceId: selectedVideoId || undefined, audioDeviceId: deviceId });
  }, [activeSession, acquireStream, selectedVideoId]);

  // ── Acquire / release on session start/end ─────────────────────────────
  useEffect(() => {
    if (!activeSession) {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setStreamReady(false);
      setSessionTimer(0);
      setIsMuted(false);
      setIsVideoOff(false);
      setIsRecording(false);
      setCamError(null);
      setAudioOnly(false);
      acquiringRef.current = false;
      return;
    }
    acquireStream();
  }, [activeSession]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Listen for device changes (plug/unplug) ────────────────────────────
  useEffect(() => {
    const handler = () => enumerateDevices();
    navigator.mediaDevices?.addEventListener('devicechange', handler);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', handler);
  }, [enumerateDevices]);

  // ── Session timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSession) return;
    const id = setInterval(() => setSessionTimer(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  // ── Sync mute/camera state to tracks ──────────────────────────────────
  useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
  }, [isMuted]);

  useEffect(() => {
    if (audioOnly) return; // can't re-enable video if only audio was acquired
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !isVideoOff; });
  }, [isVideoOff, audioOnly]);

  const startSession    = (data) => setActiveSession(data);
  const endSession      = ()     => setActiveSession(null);
  const toggleMute      = ()     => setIsMuted(m => !m);
  const toggleCamera    = ()     => { if (!audioOnly) setIsVideoOff(v => !v); };
  const toggleRecording = ()     => setIsRecording(r => !r);

  return (
    <TelehealthContext.Provider value={{
      activeSession,
      startSession,
      endSession,
      isMuted,
      isVideoOff,
      isRecording,
      camError,
      audioOnly,
      sessionTimer,
      streamReady,
      localStreamRef,
      videoDevices,
      audioDevices,
      selectedVideoId,
      selectedAudioId,
      toggleMute,
      toggleCamera,
      toggleRecording,
      retryCam,
      switchVideoDevice,
      switchAudioDevice,
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
