import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';

// AI OCR extraction simulated results by category
const AI_EXTRACT_RESULTS = {
  'Insurance Cards': {
    fields: [
      { label: 'Insurance Company', value: 'Blue Cross Blue Shield of IL', confidence: 98 },
      { label: 'Member ID', value: 'XBC-9847562', confidence: 97 },
      { label: 'Group Number', value: 'GRP-44210', confidence: 95 },
      { label: 'Plan Type', value: 'PPO', confidence: 99 },
      { label: 'Copay (Specialist)', value: '$35', confidence: 92 },
      { label: 'Effective Date', value: '01/01/2026', confidence: 96 },
    ]
  },
  'Referral Letters': {
    fields: [
      { label: 'Referring Provider', value: 'Dr. Robert Smith, MD', confidence: 96 },
      { label: 'Referring NPI', value: '1234567890', confidence: 94 },
      { label: 'Referral Reason', value: 'Major Depressive Disorder — medication management', confidence: 89 },
      { label: 'ICD-10 Code', value: 'F33.1 — Major Depressive Disorder, Recurrent, Moderate', confidence: 93 },
      { label: 'Authorized Visits', value: '12', confidence: 97 },
      { label: 'Valid Through', value: '10/01/2026', confidence: 95 },
    ]
  },
  'Lab Reports': {
    fields: [
      { label: 'Test Name', value: 'Comprehensive Metabolic Panel (CMP)', confidence: 98 },
      { label: 'Glucose', value: '92 mg/dL (Normal: 70-100)', confidence: 97 },
      { label: 'BUN', value: '14 mg/dL (Normal: 7-20)', confidence: 96 },
      { label: 'Creatinine', value: '0.9 mg/dL (Normal: 0.7-1.3)', confidence: 98 },
      { label: 'TSH', value: '2.4 mIU/L (Normal: 0.4-4.0)', confidence: 95 },
      { label: 'Collection Date', value: '04/10/2026', confidence: 99 },
    ]
  },
  'Clinical Notes': {
    fields: [
      { label: 'Note Type', value: 'Progress Note — Psychiatric Follow-Up', confidence: 94 },
      { label: 'Diagnosis', value: 'F41.1 — Generalized Anxiety Disorder', confidence: 91 },
      { label: 'Medications Referenced', value: 'Sertraline 100mg, Hydroxyzine 25mg PRN', confidence: 88 },
      { label: 'Next Appointment', value: '4 weeks follow-up', confidence: 86 },
      { label: 'Provider', value: 'Dr. Irina S., MD', confidence: 95 },
    ]
  },
  'Discharge Summaries': {
    fields: [
      { label: 'Facility', value: 'Northwestern Memorial Hospital', confidence: 97 },
      { label: 'Admission Date', value: '03/28/2026', confidence: 98 },
      { label: 'Discharge Date', value: '04/02/2026', confidence: 98 },
      { label: 'Primary Diagnosis', value: 'F32.2 — Major Depressive Episode, Severe', confidence: 93 },
      { label: 'Discharge Medications', value: 'Fluoxetine 40mg, Trazodone 50mg HS, Lorazepam 0.5mg PRN', confidence: 90 },
      { label: 'Follow-Up Instructions', value: 'Outpatient psychiatry within 7 days', confidence: 91 },
    ]
  },
  default: {
    fields: [
      { label: 'Document Type', value: 'Clinical Document', confidence: 85 },
      { label: 'Patient Name (Detected)', value: 'James Anderson', confidence: 92 },
      { label: 'Date on Document', value: '04/10/2026', confidence: 94 },
      { label: 'Key Text Extracted', value: 'Authorization approved for behavioral health services', confidence: 82 },
    ]
  },
};

const DOC_CATEGORIES = [
  'All', 'Insurance Cards', 'Referral Letters', 'Consent Forms', 'Lab Reports',
  'Prior Authorizations', 'Clinical Notes', 'Discharge Summaries', 'Other',
];

const MOCK_DOCS = [
  { id: 'd1', name: 'Insurance_Card_Front.jpg', category: 'Insurance Cards', patient: 'p1', patientName: 'James Anderson', size: '245 KB', uploadedBy: 'Kelly Chen', uploadDate: '2026-04-10', type: 'image/jpeg' },
  { id: 'd2', name: 'Referral_Dr_Smith.pdf', category: 'Referral Letters', patient: 'p2', patientName: 'Maria Garcia', size: '128 KB', uploadedBy: 'Dr. Chris L.', uploadDate: '2026-04-08', type: 'application/pdf' },
  { id: 'd3', name: 'Consent_HIPAA.pdf', category: 'Consent Forms', patient: 'p1', patientName: 'James Anderson', size: '89 KB', uploadedBy: 'Kelly Chen', uploadDate: '2026-04-05', type: 'application/pdf' },
  { id: 'd4', name: 'Lab_CBC_Results.pdf', category: 'Lab Reports', patient: 'p3', patientName: 'David Thompson', size: '156 KB', uploadedBy: 'System', uploadDate: '2026-04-12', type: 'application/pdf' },
  { id: 'd5', name: 'PriorAuth_Vyvanse.pdf', category: 'Prior Authorizations', patient: 'p4', patientName: 'Ashley Kim', size: '203 KB', uploadedBy: 'Dr. Chris L.', uploadDate: '2026-04-11', type: 'application/pdf' },
  { id: 'd6', name: 'ProgressNote_040126.pdf', category: 'Clinical Notes', patient: 'p2', patientName: 'Maria Garcia', size: '95 KB', uploadedBy: 'Dr. Chris L.', uploadDate: '2026-04-01', type: 'application/pdf' },
  { id: 'd7', name: 'Telehealth_Consent.pdf', category: 'Consent Forms', patient: 'p5', patientName: 'Dorothy Wilson', size: '72 KB', uploadedBy: 'Kelly Chen', uploadDate: '2026-03-28', type: 'application/pdf' },
  { id: 'd8', name: 'Insurance_Card_Back.jpg', category: 'Insurance Cards', patient: 'p1', patientName: 'James Anderson', size: '198 KB', uploadedBy: 'Kelly Chen', uploadDate: '2026-04-10', type: 'image/jpeg' },
];

function FileIcon({ type }) {
  if (type?.includes('pdf')) return <span style={{ fontSize: 24 }}>📄</span>;
  if (type?.includes('image')) return <span style={{ fontSize: 24 }}>🖼️</span>;
  if (type?.includes('word') || type?.includes('doc')) return <span style={{ fontSize: 24 }}>📝</span>;
  return <span style={{ fontSize: 24 }}>📎</span>;
}

export default function DocumentManagement() {
  const { currentUser } = useAuth();
  const { patients, selectedPatient } = usePatient();
  const [documents, setDocuments] = useState(MOCK_DOCS);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [showUpload, setShowUpload] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: '', category: 'Other', patient: '', notes: '' });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [extractingId, setExtractingId] = useState(null);
  const [extractedData, setExtractedData] = useState({});
  const [extractProgress, setExtractProgress] = useState(0);

  const handleAIExtract = (doc) => {
    setExtractingId(doc.id);
    setExtractProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25 + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        const result = AI_EXTRACT_RESULTS[doc.category] || AI_EXTRACT_RESULTS.default;
        setExtractedData(prev => ({ ...prev, [doc.id]: result }));
        setExtractingId(null);
      }
      setExtractProgress(Math.min(progress, 100));
    }, 400);
  };

  const handleSaveToChart = (docId) => {
    alert('✅ Extracted data saved to patient chart successfully!\n\nDiscrete data fields have been mapped to the appropriate chart sections (demographics, insurance, medications, labs, diagnoses).');
    setExtractedData(prev => {
      const next = { ...prev };
      next[docId] = { ...next[docId], saved: true };
      return next;
    });
  };

  const filtered = documents.filter(d => {
    if (category !== 'All' && d.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.name.toLowerCase().includes(q) || d.patientName.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
    }
    return true;
  });

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles(prev => [...prev, ...files]);
    setShowUpload(true);
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleUploadSubmit = () => {
    const newDocs = uploadedFiles.map((f, i) => ({
      id: `d${documents.length + i + 1}`,
      name: f.name,
      category: uploadForm.category,
      patient: uploadForm.patient || selectedPatient?.id || '',
      patientName: patients.find(p => p.id === uploadForm.patient)?.firstName + ' ' + patients.find(p => p.id === uploadForm.patient)?.lastName || 'Unassigned',
      size: `${Math.round(f.size / 1024)} KB`,
      uploadedBy: `${currentUser?.firstName} ${currentUser?.lastName}`,
      uploadDate: new Date().toISOString().split('T')[0],
      type: f.type,
    }));
    setDocuments(prev => [...newDocs, ...prev]);
    setShowUpload(false);
    setUploadedFiles([]);
    setUploadForm({ name: '', category: 'Other', patient: '', notes: '' });
  };

  const handleDelete = (id) => {
    if (confirm('Delete this document?')) {
      setDocuments(prev => prev.filter(d => d.id !== id));
    }
  };

  const totalSize = documents.reduce((s, d) => s + parseInt(d.size), 0);

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>📂 Document Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Upload, organize, and manage clinical documents, insurance cards, referrals, and consent forms.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>📤 Upload Document</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div className="stat-card row blue fade-in"><div className="stat-icon blue">📂</div><div className="stat-info"><h3>{documents.length}</h3><p>Total Documents</p></div></div>
        <div className="stat-card row green fade-in"><div className="stat-icon green">📄</div><div className="stat-info"><h3>{documents.filter(d=>d.type?.includes('pdf')).length}</h3><p>PDF Files</p></div></div>
        <div className="stat-card row teal fade-in"><div className="stat-icon teal">🖼️</div><div className="stat-info"><h3>{documents.filter(d=>d.type?.includes('image')).length}</h3><p>Images</p></div></div>
        <div className="stat-card row yellow fade-in"><div className="stat-icon yellow">💾</div><div className="stat-info"><h3>{Math.round(totalSize / 1024 * 10) / 10} MB</h3><p>Total Storage</p></div></div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, width: 260 }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {DOC_CATEGORIES.map(c => (
            <button key={c} className={`btn btn-sm ${category === c ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCategory(c)} style={{ fontSize: 11 }}>{c}</button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`doc-dropzone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} />
        <div style={{ fontSize: 32, marginBottom: 8 }}>📤</div>
        <p style={{ fontWeight: 600, fontSize: 14 }}>Drag & drop files here or click to browse</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supports PDF, JPG, PNG, DOC — Max 25MB per file</p>
      </div>

      {/* Documents table */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-body no-pad">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Document Name</th>
                  <th>Category</th>
                  <th>Patient</th>
                  <th>Uploaded By</th>
                  <th>Date</th>
                  <th>Size</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No documents found</td></tr>
                ) : filtered.map(d => (
                  <tr key={d.id}>
                    <td><FileIcon type={d.type} /></td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</td>
                    <td><span className="badge badge-info">{d.category}</span></td>
                    <td style={{ fontSize: 12 }}>{d.patientName}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.uploadedBy}</td>
                    <td style={{ fontSize: 12 }}>{d.uploadDate}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.size}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm btn-ghost" title="AI Extract Data" onClick={() => handleAIExtract(d)}
                          style={{ color: extractedData[d.id] ? '#16a34a' : '#7c3aed' }}>
                          {extractedData[d.id] ? '✅' : '🧠'}
                        </button>
                        <button className="btn btn-sm btn-ghost" title="Download" onClick={() => alert('Download: ' + d.name)}>⬇️</button>
                        <button className="btn btn-sm btn-ghost" title="Preview" onClick={() => alert('Preview: ' + d.name)}>👁️</button>
                        <button className="btn btn-sm btn-ghost" title="Delete" onClick={() => handleDelete(d.id)} style={{ color: 'var(--danger)' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI Data Extraction Panel */}
      {extractingId && (
        <div className="card" style={{ marginTop: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>🧠 AI Document Extraction — Processing...</h3>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ background: '#f5f3ff', borderRadius: 8, height: 8, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #7c3aed, #a855f7)', borderRadius: 8, width: `${extractProgress}%`, transition: 'width 0.3s' }} />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', color: '#7c3aed', fontSize: 12, fontWeight: 600 }}>
              <span>📊 OCR Scanning...</span>
              <span>🔍 NLP Analysis...</span>
              <span>🗂️ Field Mapping...</span>
            </div>
          </div>
        </div>
      )}

      {Object.entries(extractedData).filter(([_, d]) => !d.saved).map(([docId, data]) => {
        const doc = documents.find(d => d.id === docId);
        if (!doc) return null;
        return (
          <div key={docId} className="card" style={{ marginTop: 16, overflow: 'hidden', border: '2px solid #7c3aed30' }}>
            <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>🧠 AI Extracted Data — {doc.name}</h3>
                <p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.8 }}>Category: {doc.category} · Patient: {doc.patientName}</p>
              </div>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                ✅ Extraction Complete
              </span>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {data.fields.map((f, i) => (
                  <div key={i} style={{ padding: '10px 14px', borderRadius: 8, background: '#faf5ff', border: '1px solid #e9d5ff' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{f.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{f.value}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#e9d5ff' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: f.confidence >= 95 ? '#16a34a' : f.confidence >= 90 ? '#f59e0b' : '#ef4444', width: `${f.confidence}%` }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: f.confidence >= 95 ? '#16a34a' : f.confidence >= 90 ? '#f59e0b' : '#ef4444' }}>
                        {f.confidence}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-sm btn-secondary" onClick={() => setExtractedData(prev => { const n = {...prev}; delete n[docId]; return n; })}>
                  Dismiss
                </button>
                <button className="btn btn-sm btn-primary" onClick={() => handleSaveToChart(docId)} style={{ background: '#7c3aed' }}>
                  💾 Save to Patient Chart
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-backdrop" onClick={() => setShowUpload(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>📤 Upload Documents</h3>
              <button className="modal-close" onClick={() => setShowUpload(false)}>✕</button>
            </div>
            <div className="modal-body">
              {uploadedFiles.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Selected Files</label>
                  {uploadedFiles.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg)', borderRadius: 6, marginBottom: 4, fontSize: 12 }}>
                      <span>📎</span>
                      <span style={{ flex: 1 }}>{f.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{Math.round(f.size / 1024)} KB</span>
                      <button onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Category</label>
                <select value={uploadForm.category} onChange={e => setUploadForm({...uploadForm, category: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
                  {DOC_CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Patient</label>
                <select value={uploadForm.patient} onChange={e => setUploadForm({...uploadForm, patient: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
                  <option value="">— Select Patient —</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.lastName}, {p.firstName} (MRN {p.mrn})</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Notes</label>
                <textarea value={uploadForm.notes} onChange={e => setUploadForm({...uploadForm, notes: e.target.value})}
                  rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, resize: 'vertical' }}
                  placeholder="Optional notes about this document..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUploadSubmit} disabled={uploadedFiles.length === 0}>Upload {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
