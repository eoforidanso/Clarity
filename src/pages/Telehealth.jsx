import React, { useState } from 'react';
import { usePatient } from '../contexts/PatientContext';

export default function Telehealth() {
  const { selectedPatient, appointments, patients } = usePatient();
  const [isInSession, setIsInSession] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [notes, setNotes] = useState('');

  // Send video link state
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendApt, setSendApt] = useState(null);
  const [sendMethod, setSendMethod] = useState('sms');
  const [linkSentFor, setLinkSentFor] = useState({});
  const [copied, setCopied] = useState(false);

  const getVideoLink = (apt) => `https://telehealth.clarity.health/room/${apt.id}`;

  const getPatientContact = (apt) => {
    if (!apt.patientId) return null;
    return patients?.find((p) => p.id === apt.patientId) || null;
  };

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendLink = (method) => {
    setLinkSentFor((prev) => ({ ...prev, [sendApt.id]: method }));
    setTimeout(() => {
      setShowSendModal(false);
      setSendApt(null);
    }, 1200);
  };

  const telehealthAppts = appointments.filter(a => a.visitType === 'Telehealth' && a.status !== 'Completed');

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { from: 'Provider', text: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setChatInput('');
  };

  const handleEndCall = () => {
    setIsInSession(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
  };

  if (!isInSession) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <h1>📹 Telehealth</h1>
          <p>HIPAA-compliant video visits</p>
        </div>

        <div className="alert alert-info mb-4">
          <strong>ℹ️ Telehealth Requirements:</strong> Ensure patient has provided informed consent for telehealth services. 
          Verify patient identity and confirm they are in a private, safe location before starting the session.
        </div>

        {/* Waiting Room */}
        <div className="card mb-4">
          <div className="card-header">
            <h2>🕐 Virtual Waiting Room</h2>
            <span className="badge badge-info">{telehealthAppts.length} scheduled</span>
          </div>
          <div className="card-body no-pad">
            <table className="data-table">
              <thead>
                <tr><th>Time</th><th>Patient</th><th>Reason</th><th>Status</th><th>Link</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {telehealthAppts.map((apt) => (
                  <tr key={apt.id}>
                    <td className="font-bold">{apt.time}</td>
                    <td className="font-semibold">{apt.patientName}</td>
                    <td className="text-sm">{apt.reason}</td>
                    <td>
                      <span className={`badge ${apt.status === 'Checked In' ? 'badge-success' : 'badge-info'}`}>
                        {apt.status === 'Checked In' ? '🟢 Ready' : apt.status}
                      </span>
                    </td>
                    <td>
                      {linkSentFor[apt.id] ? (
                        <span className="badge badge-success" style={{ fontSize: 11 }}>
                          ✅ Sent via {linkSentFor[apt.id].toUpperCase()}
                        </span>
                      ) : (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => { setSendApt(apt); setSendMethod('sms'); setShowSendModal(true); }}
                        >
                          📤 Send Link
                        </button>
                      )}
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      {linkSentFor[apt.id] && (
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ fontSize: 11 }}
                          onClick={() => { setSendApt(apt); setSendMethod('sms'); setShowSendModal(true); }}
                        >
                          Resend
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-primary"
                        style={{ background: '#7c3aed' }}
                        onClick={() => setIsInSession(true)}
                      >
                        📹 Start Session
                      </button>
                    </td>
                  </tr>
                ))}
                {telehealthAppts.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No telehealth appointments scheduled</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Start */}
        <div className="card">
          <div className="card-header">
            <h2>⚡ Quick Start</h2>
          </div>
          <div className="card-body">
            <p className="text-secondary mb-3">Start an ad-hoc telehealth session</p>
            <button className="btn btn-primary btn-lg" onClick={() => setIsInSession(true)}>
              📹 Start New Telehealth Session
            </button>
          </div>
        </div>

      {/* Send Video Link Modal */}
      {showSendModal && sendApt && (() => {
        const contact = getPatientContact(sendApt);
        const link = getVideoLink(sendApt);
        const isSent = linkSentFor[sendApt.id];
        const smsText = `Clarity Health: Your telehealth appointment is at ${sendApt.time}. Join here: ${link}`;
        const emailSubject = `Your Clarity Telehealth Visit Link – ${sendApt.time}`;
        const emailBody = `Dear ${sendApt.patientName},\n\nYour telehealth appointment is scheduled for ${sendApt.time}.\n\nJoin your visit using the secure link below:\n${link}\n\nIf you have any issues connecting, please call our office.\n\nClarity Health`;
        return (
          <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
            <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📤 Send Telehealth Link</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowSendModal(false)}>✕</button>
              </div>
              <div className="modal-body" style={{ display: 'grid', gap: 16 }}>
                {/* Patient & Appointment */}
                <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '12px 16px', border: '1px solid var(--border)' }}>
                  <div className="font-semibold" style={{ marginBottom: 6 }}>{sendApt.patientName}</div>
                  <div className="text-sm text-muted">
                    <span>🕐 {sendApt.time}</span>
                    <span style={{ margin: '0 8px' }}>·</span>
                    <span>{sendApt.reason}</span>
                  </div>
                </div>

                {/* Generated Link */}
                <div>
                  <div className="form-label">Secure Video Link</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      className="form-input"
                      readOnly
                      value={link}
                      style={{ flex: 1, fontSize: 12, color: 'var(--primary)' }}
                    />
                    <button
                      className={`btn btn-sm ${copied ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleCopyLink(link)}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {copied ? '✅ Copied' : '📋 Copy'}
                    </button>
                  </div>
                </div>

                {/* Send Method Toggle */}
                <div>
                  <div className="form-label">Send via</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className={`btn btn-sm ${sendMethod === 'sms' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSendMethod('sms')}
                    >
                      📱 Text Message (SMS)
                    </button>
                    <button
                      className={`btn btn-sm ${sendMethod === 'email' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSendMethod('email')}
                    >
                      ✉️ Email
                    </button>
                  </div>
                </div>

                {/* Contact Info */}
                {contact ? (
                  <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '10px 14px', border: '1px solid var(--border)', display: 'grid', gap: 4 }}>
                    {sendMethod === 'sms' ? (
                      <>
                        <div className="text-sm"><span className="text-muted">Cell:</span> <strong>{contact.cellPhone || contact.phone || 'N/A'}</strong></div>
                        {contact.phone && contact.cellPhone && (
                          <div className="text-sm"><span className="text-muted">Home:</span> {contact.phone}</div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm"><span className="text-muted">Email:</span> <strong>{contact.email || 'N/A'}</strong></div>
                    )}
                  </div>
                ) : (
                  <div className="alert alert-info" style={{ fontSize: 13 }}>
                    ℹ️ No patient record found. Provide contact info manually.
                  </div>
                )}

                {/* Preview */}
                <div>
                  <div className="form-label">Message Preview</div>
                  {sendMethod === 'sms' ? (
                    <div style={{ background: '#1a1a2e', color: '#e2e8f0', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 12, fontFamily: 'monospace', lineHeight: 1.6 }}>
                      {smsText}
                    </div>
                  ) : (
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 12, lineHeight: 1.6 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Subject: {emailSubject}</div>
                      <div style={{ whiteSpace: 'pre-line', color: 'var(--text-secondary)' }}>{emailBody}</div>
                    </div>
                  )}
                </div>

                {isSent && (
                  <div className="alert alert-success" style={{ fontSize: 13 }}>
                    ✅ Link already sent via {isSent.toUpperCase()} — you can resend below.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowSendModal(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleSendLink(sendMethod)}
                >
                  {sendMethod === 'sms' ? '📱 Send Text Message' : '✉️ Send Email'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      </div>
    );
  }

  return (
    <div className="telehealth-container">
      {/* Main Video */}
      <div className="video-main">
        <div className="placeholder-video">
          <div style={{ fontSize: 80, marginBottom: 16 }}>{isVideoOff ? '📵' : '👤'}</div>
          <h3 style={{ color: '#999', fontSize: 18 }}>
            {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Patient Video Feed'}
          </h3>
          <p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
            {isVideoOff ? 'Video is off' : 'Telehealth session in progress'}
          </p>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <span className="badge badge-success" style={{ fontSize: 12 }}>🔒 Encrypted</span>
            <span className="badge badge-info" style={{ fontSize: 12 }}>HIPAA Compliant</span>
          </div>
        </div>

        {/* PiP (Provider) */}
        <div className="video-pip">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32 }}>👨‍⚕️</div>
            <div style={{ color: '#999', fontSize: 11, marginTop: 4 }}>You</div>
          </div>
        </div>

        {/* Controls */}
        <div className="video-controls">
          <button
            className={`video-control-btn ${isMuted ? '' : ''}`}
            style={{ background: isMuted ? 'var(--danger)' : 'rgba(255,255,255,0.1)' }}
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>
          <button
            className={`video-control-btn`}
            style={{ background: isVideoOff ? 'var(--danger)' : 'rgba(255,255,255,0.1)' }}
            onClick={() => setIsVideoOff(!isVideoOff)}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? '📵' : '📹'}
          </button>
          <button
            className={`video-control-btn`}
            style={{ background: isScreenSharing ? 'var(--success)' : 'rgba(255,255,255,0.1)' }}
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            title="Share screen"
          >
            🖥️
          </button>
          <button className="video-control-btn end-call" onClick={handleEndCall} title="End call">
            📞
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="telehealth-sidebar">
        {/* Session Info */}
        <div className="card">
          <div className="card-header">
            <h2>📋 Session Info</h2>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: 8 }}>
              <div className="text-sm"><span className="text-muted">Duration:</span> <strong>Active</strong></div>
              <div className="text-sm"><span className="text-muted">Connection:</span> <span className="text-success font-bold">Excellent</span></div>
              <div className="text-sm"><span className="text-muted">Encryption:</span> <span className="badge badge-success">AES-256</span></div>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <h2>💬 Chat</h2>
          </div>
          <div className="card-body" style={{ flex: 1, overflow: 'auto', minHeight: 150 }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{msg.from} · {msg.time}</div>
                <div style={{ fontSize: 13, background: msg.from === 'Provider' ? 'var(--primary-light)' : 'var(--bg)', padding: '6px 10px', borderRadius: 'var(--radius)', display: 'inline-block' }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {chatMessages.length === 0 && (
              <div className="text-muted text-sm" style={{ textAlign: 'center', padding: 20 }}>
                No messages yet
              </div>
            )}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              placeholder="Type a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-sm btn-primary" onClick={handleSendChat}>Send</button>
          </div>
        </div>

        {/* Visit Notes */}
        <div className="card">
          <div className="card-header">
            <h2>📝 Visit Notes</h2>
          </div>
          <div className="card-body">
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Quick notes during the session..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
