import React, { useState, useRef, useCallback } from 'react';
import { usePatient } from '../contexts/PatientContext';

const MAX_SIZE_MB = 5;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export default function PatientPhotoUpload({ patient, onClose }) {
  const { updatePatientPhoto } = usePatient();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(patient.photo || null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const processFile = useCallback((file) => {
    setError('');
    if (!file) return;
    if (!ALLOWED.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic)$/i)) {
      setError('Only JPEG, PNG, WebP, or HEIC files are accepted.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e) => processFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const API = import.meta.env.VITE_API_URL || '/api';

  const savePhotoToDb = async (photoUrl) => {
    try {
      await fetch(`${API}/patients/${patient.id}/photo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ photoUrl }),
      });
    } catch { /* non-critical — context already updated */ }
  };

  const handleSave = () => {
    if (!preview || preview === patient.photo) { onClose(); return; }
    setSaving(true);
    const img = new Image();
    img.onload = async () => {
      const maxDim = 400;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const resized = canvas.toDataURL('image/jpeg', 0.85);
      // Save to React context (instant UI update)
      updatePatientPhoto(patient.id, resized);
      // Persist to DB
      await savePhotoToDb(resized);
      setSaving(false);
      setSaved(true);
      setTimeout(onClose, 900);
    };
    img.src = preview;
  };

  const handleRemove = async () => {
    updatePatientPhoto(patient.id, null);
    await savePhotoToDb(null);
    try { localStorage.removeItem(`clarity_pt_photo_${patient.id}`); } catch { /* ok */ }
    onClose();
  };

  const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460,
        boxShadow: '0 24px 60px rgba(0,0,0,0.28)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Patient Photo</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {patient.firstName} {patient.lastName} · MRN {patient.mrn}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: '#94a3b8', padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '24px 22px' }}>

          {/* Preview + drop zone */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
            {/* Current photo preview */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {preview ? (
                <img src={preview} alt="Preview" style={{ width: 100, height: 100, borderRadius: 10,
                  objectFit: 'cover', border: '2px solid #e2e8f0', display: 'block' }} />
              ) : (
                <div style={{ width: 100, height: 100, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, fontWeight: 800, color: '#fff', border: '2px solid #e2e8f0' }}>
                  {initials}
                </div>
              )}
              {preview && (
                <button onClick={() => setPreview(null)}
                  style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                    borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none',
                    cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}
                  title="Remove photo" aria-label="Remove photo">×</button>
              )}
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                flex: 1, border: `2px dashed ${dragging ? '#6366f1' : '#cbd5e1'}`,
                borderRadius: 10, padding: '20px 16px', textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.15s',
                background: dragging ? '#f5f3ff' : '#f8fafc',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                {dragging ? 'Drop to upload' : 'Drop photo here'}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
                or click to browse
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>
                JPEG · PNG · WebP · HEIC · Max {MAX_SIZE_MB} MB
              </div>
            </div>
          </div>

          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,.heic"
            style={{ display: 'none' }} onChange={handleFileChange} />

          {/* Webcam hint */}
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            HIPAA reminder: only upload photos with documented patient consent
          </div>

          {error && (
            <div style={{ marginBottom: 14, padding: '9px 12px', background: '#fef2f2',
              border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626',
              display: 'flex', alignItems: 'center', gap: 6 }}>
              ⚠ {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {patient.photo && (
                <button onClick={handleRemove}
                  style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>
                  Remove Photo
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose}
                style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !preview || saved}
                style={{ padding: '7px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  border: 'none', background: saved ? '#22c55e' : '#0891b2', color: '#fff',
                  cursor: saving || saved ? 'default' : 'pointer',
                  opacity: !preview ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Photo'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
