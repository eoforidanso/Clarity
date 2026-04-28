import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const VOICE_COMMANDS = [
  { phrases: ['go to dashboard', 'open dashboard', 'show dashboard'], action: 'navigate', target: '/dashboard', label: 'Dashboard' },
  { phrases: ['go to schedule', 'open schedule', 'show schedule', 'show appointments'], action: 'navigate', target: '/schedule', label: 'Schedule' },
  { phrases: ['open inbox', 'show inbox', 'go to inbox', 'check messages'], action: 'navigate', target: '/inbox', label: 'Inbox' },
  { phrases: ['patient search', 'find patient', 'search patients', 'look up patient'], action: 'navigate', target: '/patients', label: 'Patient Search' },
  { phrases: ['open prescribe', 'e-prescribe', 'write prescription', 'new prescription'], action: 'navigate', target: '/prescribe', label: 'E-Prescribe' },
  { phrases: ['open telehealth', 'start telehealth', 'video visit', 'start video'], action: 'navigate', target: '/telehealth', label: 'Telehealth' },
  { phrases: ['show analytics', 'open analytics', 'view analytics'], action: 'navigate', target: '/analytics', label: 'Analytics' },
  { phrases: ['care gaps', 'show care gaps', 'open care gaps'], action: 'navigate', target: '/care-gaps', label: 'Care Gaps' },
  { phrases: ['billing', 'open billing', 'billing dashboard'], action: 'navigate', target: '/billing-dashboard', label: 'Billing' },
  { phrases: ['claims', 'open claims', 'claims management'], action: 'navigate', target: '/claims-management', label: 'Claims' },
  { phrases: ['settings', 'open settings', 'preferences'], action: 'navigate', target: '/settings', label: 'Settings' },
  { phrases: ['smart phrases', 'open smart phrases', 'dot phrases'], action: 'navigate', target: '/smart-phrases', label: 'Smart Phrases' },
  { phrases: ['staff messaging', 'open messaging', 'message staff'], action: 'navigate', target: '/staff-messaging', label: 'Staff Messaging' },
  { phrases: ['referrals', 'open referrals'], action: 'navigate', target: '/referrals', label: 'Referrals' },
  { phrases: ['lab tracking', 'open labs', 'lab orders'], action: 'navigate', target: '/lab-tracking', label: 'Lab Tracking' },
  { phrases: ['triage', 'ai triage', 'patient triage'], action: 'navigate', target: '/ai-triage', label: 'AI Triage' },
  { phrases: ['check in', 'patient check in', 'self check in'], action: 'navigate', target: '/patient-checkin', label: 'Patient Check-In' },
  { phrases: ['cost estimator', 'estimate cost', 'patient cost'], action: 'navigate', target: '/cost-estimator', label: 'Cost Estimator' },
  // Actions
  { phrases: ['refresh', 'reload page'], action: 'refresh', label: 'Refresh Page' },
  { phrases: ['scroll up', 'page up'], action: 'scrollUp', label: 'Scroll Up' },
  { phrases: ['scroll down', 'page down'], action: 'scrollDown', label: 'Scroll Down' },
  { phrases: ['help', 'show commands', 'what can you do', 'voice help'], action: 'help', label: 'Show Help' },
];

export default function VoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();
  const recognitionRef = useRef(null);
  const feedbackTimeout = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const current = event.results[event.results.length - 1];
        const text = current[0].transcript.toLowerCase().trim();
        setTranscript(text);

        if (current.isFinal) {
          processCommand(text);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setFeedback({ type: 'error', message: `Error: ${event.error}` });
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  const processCommand = useCallback((text) => {
    let matched = null;

    for (const cmd of VOICE_COMMANDS) {
      for (const phrase of cmd.phrases) {
        if (text.includes(phrase)) {
          matched = cmd;
          break;
        }
      }
      if (matched) break;
    }

    const entry = { text, time: new Date(), matched: !!matched, label: matched?.label };
    setHistory(prev => [entry, ...prev].slice(0, 10));

    if (!matched) {
      setFeedback({ type: 'warning', message: `Command not recognized: "${text}"` });
      clearFeedbackAfter(3000);
      return;
    }

    switch (matched.action) {
      case 'navigate':
        setFeedback({ type: 'success', message: `Navigating to ${matched.label}...` });
        setTimeout(() => navigate(matched.target), 500);
        clearFeedbackAfter(2000);
        break;
      case 'refresh':
        setFeedback({ type: 'success', message: 'Refreshing page...' });
        setTimeout(() => window.location.reload(), 600);
        break;
      case 'scrollUp':
        window.scrollBy({ top: -400, behavior: 'smooth' });
        setFeedback({ type: 'success', message: 'Scrolling up' });
        clearFeedbackAfter(1500);
        break;
      case 'scrollDown':
        window.scrollBy({ top: 400, behavior: 'smooth' });
        setFeedback({ type: 'success', message: 'Scrolling down' });
        clearFeedbackAfter(1500);
        break;
      case 'help':
        setShowHelp(true);
        setFeedback({ type: 'success', message: 'Showing available commands' });
        clearFeedbackAfter(2000);
        break;
      default:
        break;
    }
  }, [navigate]);

  const clearFeedbackAfter = (ms) => {
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    feedbackTimeout.current = setTimeout(() => setFeedback(null), ms);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setFeedback({ type: 'error', message: 'Speech recognition not supported in this browser' });
      clearFeedbackAfter(3000);
      return;
    }

    if (isListening) {
      recognitionRef.current.abort();
      setIsListening(false);
    } else {
      setTranscript('');
      setFeedback(null);
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Keyboard shortcut: Ctrl+Shift+V to toggle voice assistant
  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="voice-assistant-fab"
        title="Voice Assistant (Ctrl+Shift+V)"
      >
        🎙️
      </button>
    );
  }

  return (
    <div className="voice-assistant-panel">
      <div className="voice-assistant-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🎙️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Voice Assistant</div>
            <div style={{ fontSize: 10, opacity: 0.8 }}>Hands-free EHR navigation</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowHelp(!showHelp)} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
            borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
          }}>❓</button>
          <button onClick={() => setIsOpen(false)} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
            borderRadius: 6, padding: '3px 8px', fontSize: 13, cursor: 'pointer',
          }}>✕</button>
        </div>
      </div>

      <div className="voice-assistant-body">
        {/* Mic button */}
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <button
            onClick={toggleListening}
            className={`voice-mic-btn ${isListening ? 'listening' : ''}`}
          >
            {isListening ? '⏹️' : '🎤'}
          </button>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
            {isListening ? 'Listening... speak a command' : 'Tap to start listening'}
          </div>
        </div>

        {/* Live transcript */}
        {transcript && (
          <div style={{
            padding: '8px 12px', borderRadius: 8, background: '#f0f9ff',
            border: '1px solid #bae6fd', fontSize: 13, textAlign: 'center',
            marginBottom: 12, fontStyle: 'italic', color: '#0369a1',
          }}>
            "{transcript}"
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div style={{
            padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12,
            background: feedback.type === 'success' ? '#f0fdf4' : feedback.type === 'error' ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : feedback.type === 'error' ? '#fecaca' : '#fde68a'}`,
            color: feedback.type === 'success' ? '#166534' : feedback.type === 'error' ? '#991b1b' : '#92400e',
          }}>
            {feedback.type === 'success' ? '✅' : feedback.type === 'error' ? '❌' : '⚠️'} {feedback.message}
          </div>
        )}

        {/* Help / Commands list */}
        {showHelp && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
              AVAILABLE COMMANDS
            </div>
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
              {VOICE_COMMANDS.map((cmd, i) => (
                <div key={i} style={{
                  padding: '4px 8px', fontSize: 11, display: 'flex',
                  justifyContent: 'space-between', borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>"{cmd.phrases[0]}"</span>
                  <span style={{ fontWeight: 600 }}>{cmd.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
              RECENT COMMANDS
            </div>
            {history.map((h, i) => (
              <div key={i} style={{
                padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6,
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 10 }}>{h.matched ? '✅' : '❌'}</span>
                <span style={{ flex: 1, color: 'var(--text-primary)' }}>"{h.text}"</span>
                {h.label && <span style={{ color: 'var(--primary)', fontWeight: 600 }}>→ {h.label}</span>}
                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                  {h.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        padding: '8px 12px', borderTop: '1px solid var(--border)',
        fontSize: 10, color: 'var(--text-muted)', textAlign: 'center',
      }}>
        Ctrl+Shift+V to toggle · Say "help" for commands
      </div>
    </div>
  );
}
