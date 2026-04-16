import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/* ─── CareEverywhere — Health Information Exchange ────────── */

const CONNECTED_ORGS = [
  { id: 'org1', name: 'Northwestern Memorial Hospital', type: 'Hospital', network: 'CommonWell', city: 'Chicago, IL', status: 'connected', lastSync: '2026-04-15 07:00 AM', recordsAvailable: 1247, oid: '2.16.840.1.113883.3.1234' },
  { id: 'org2', name: 'Rush University Medical Center', type: 'Hospital', network: 'Carequality', city: 'Chicago, IL', status: 'connected', lastSync: '2026-04-15 06:30 AM', recordsAvailable: 893, oid: '2.16.840.1.113883.3.2345' },
  { id: 'org3', name: 'Advocate Health', type: 'Health System', network: 'CommonWell', city: 'Downers Grove, IL', status: 'connected', lastSync: '2026-04-14 11:00 PM', recordsAvailable: 2105, oid: '2.16.840.1.113883.3.3456' },
  { id: 'org4', name: 'UChicago Medicine', type: 'Academic Medical Center', network: 'eHealth Exchange', city: 'Chicago, IL', status: 'connected', lastSync: '2026-04-15 05:00 AM', recordsAvailable: 1560, oid: '2.16.840.1.113883.3.4567' },
  { id: 'org5', name: 'CVS/Caremark Pharmacy', type: 'Pharmacy', network: 'Surescripts', city: 'National', status: 'connected', lastSync: '2026-04-15 08:12 AM', recordsAvailable: 0, oid: '2.16.840.1.113883.3.5678' },
  { id: 'org6', name: 'Quest Diagnostics', type: 'Lab', network: 'Carequality', city: 'National', status: 'connected', lastSync: '2026-04-15 07:45 AM', recordsAvailable: 0, oid: '2.16.840.1.113883.3.6789' },
  { id: 'org7', name: 'Walgreens Pharmacy', type: 'Pharmacy', network: 'Surescripts', city: 'National', status: 'connected', lastSync: '2026-04-15 08:00 AM', recordsAvailable: 0, oid: '2.16.840.1.113883.3.7890' },
  { id: 'org8', name: 'Lurie Children\'s Hospital', type: 'Hospital', network: 'CommonWell', city: 'Chicago, IL', status: 'pending', lastSync: null, recordsAvailable: 0, oid: '2.16.840.1.113883.3.8901' },
  { id: 'org9', name: 'Illinois Dept of Public Health', type: 'Public Health', network: 'IHE', city: 'Springfield, IL', status: 'connected', lastSync: '2026-04-14 06:00 AM', recordsAvailable: 0, oid: '2.16.840.1.113883.3.9012' },
  { id: 'org10', name: 'Amita Health', type: 'Health System', network: 'CommonWell', city: 'Arlington Heights, IL', status: 'disconnected', lastSync: '2026-03-20 09:00 AM', recordsAvailable: 0, oid: '2.16.840.1.113883.3.0123' },
];

const PATIENT_EXTERNAL_RECORDS = {
  p1: [
    { id: 'er1', source: 'Northwestern Memorial Hospital', type: 'CCD', date: '2026-03-10', docType: 'Continuity of Care Document', category: 'Summary', status: 'reviewed', reviewedBy: 'Dr. Chris L.', reviewedDate: '2026-03-12', highlights: ['Cardiology consult — normal echo', 'Lipid panel — LDL 142 (high)', 'Metoprolol 25mg prescribed for palpitations'] },
    { id: 'er2', source: 'Quest Diagnostics', type: 'Lab', date: '2026-04-01', docType: 'Lab Results', category: 'Laboratory', status: 'new', reviewedBy: null, reviewedDate: null, highlights: ['CBC — within normal limits', 'CMP — Glucose 108 (slightly elevated)', 'TSH — 2.4 (normal)', 'Lithium level — 0.8 mEq/L (therapeutic)'] },
    { id: 'er3', source: 'CVS/Caremark Pharmacy', type: 'Rx', date: '2026-04-05', docType: 'Medication History', category: 'Pharmacy', status: 'reviewed', reviewedBy: 'Nurse Kelly', reviewedDate: '2026-04-06', highlights: ['Sertraline 100mg — last filled 3/28', 'Lithium 600mg — last filled 3/25', 'Trazodone 50mg PRN — last filled 2/15'] },
    { id: 'er4', source: 'Rush University Medical Center', type: 'CCD', date: '2026-02-15', docType: 'ED Visit Summary', category: 'Emergency', status: 'reviewed', reviewedBy: 'Dr. Chris L.', reviewedDate: '2026-02-18', highlights: ['ED visit 2/14 — chest pain (non-cardiac)', 'EKG normal sinus rhythm', 'Troponin negative x2', 'Discharged with follow-up'] },
  ],
  p2: [
    { id: 'er5', source: 'Advocate Health', type: 'CCD', date: '2026-03-20', docType: 'PCP Visit Summary', category: 'Summary', status: 'new', reviewedBy: null, reviewedDate: null, highlights: ['Annual physical — BMI 24.2', 'A1C 5.4 (normal)', 'Referred for anxiety management', 'Updated immunizations'] },
    { id: 'er6', source: 'Walgreens Pharmacy', type: 'Rx', date: '2026-04-08', docType: 'Medication History', category: 'Pharmacy', status: 'reviewed', reviewedBy: 'Dr. Chris L.', reviewedDate: '2026-04-09', highlights: ['Escitalopram 10mg — last filled 4/1', 'Hydroxyzine 25mg PRN — last filled 3/20'] },
  ],
  p3: [
    { id: 'er7', source: 'UChicago Medicine', type: 'CCD', date: '2026-04-10', docType: 'Psychiatry Consult Note', category: 'Consult', status: 'new', reviewedBy: null, reviewedDate: null, highlights: ['Second opinion — treatment-resistant depression', 'Recommended TMS evaluation', 'Genetic testing suggested (CYP2D6/CYP2C19)', 'Current regimen: Venlafaxine 225mg + Mirtazapine 15mg'] },
    { id: 'er8', source: 'Quest Diagnostics', type: 'Lab', date: '2026-04-12', docType: 'Lab Results', category: 'Laboratory', status: 'new', reviewedBy: null, reviewedDate: null, highlights: ['Hepatic panel — AST 28, ALT 32 (normal)', 'Valproic acid level — 72 mcg/mL (therapeutic)', 'CBC with diff — all WNL'] },
  ],
};

const QUERY_LOG = [
  { id: 'q1', patient: 'James Anderson', patientId: 'p1', queried: '2026-04-15 07:30 AM', queriedBy: 'Dr. Chris L.', organizations: 4, docsReceived: 2, status: 'complete', networks: ['CommonWell', 'Carequality', 'Surescripts'] },
  { id: 'q2', patient: 'Maria Garcia', patientId: 'p2', queried: '2026-04-14 02:15 PM', queriedBy: 'Nurse Kelly', organizations: 3, docsReceived: 1, status: 'complete', networks: ['CommonWell', 'Surescripts'] },
  { id: 'q3', patient: 'Robert Chen', patientId: 'p3', queried: '2026-04-15 08:00 AM', queriedBy: 'Dr. Chris L.', organizations: 5, docsReceived: 3, status: 'in-progress', networks: ['CommonWell', 'Carequality', 'eHealth Exchange'] },
  { id: 'q4', patient: 'Ashley Kim', patientId: 'p4', queried: '2026-04-13 10:00 AM', queriedBy: 'April Torres, LCSW', organizations: 2, docsReceived: 0, status: 'no-results', networks: ['CommonWell'] },
];

const NETWORKS = ['All', 'CommonWell', 'Carequality', 'eHealth Exchange', 'Surescripts', 'IHE'];
const DOC_CATEGORIES = ['All', 'Summary', 'Laboratory', 'Pharmacy', 'Emergency', 'Consult', 'Imaging', 'Referral'];

export default function CareEverywhere() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState('records');
  const [selectedPatient, setSelectedPatient] = useState('p1');
  const [networkFilter, setNetworkFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [queryStatus, setQueryStatus] = useState(null); // null | 'querying' | 'complete'
  const [showOrgDetail, setShowOrgDetail] = useState(null);
  const [consentStatus, setConsentStatus] = useState({ p1: true, p2: true, p3: true, p4: false, p5: false });

  const patients = [
    { id: 'p1', name: 'James Anderson' }, { id: 'p2', name: 'Maria Garcia' },
    { id: 'p3', name: 'Robert Chen' }, { id: 'p4', name: 'Ashley Kim' },
    { id: 'p5', name: 'Dorothy Wilson' },
  ];

  const records = PATIENT_EXTERNAL_RECORDS[selectedPatient] || [];
  const filteredRecords = records.filter(r => {
    if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;
    return true;
  });

  const filteredOrgs = CONNECTED_ORGS.filter(o => {
    if (networkFilter !== 'All' && o.network !== networkFilter) return false;
    return true;
  });

  const newRecordsCount = records.filter(r => r.status === 'new').length;

  const runQuery = () => {
    setQueryStatus('querying');
    setTimeout(() => setQueryStatus('complete'), 2500);
  };

  const markReviewed = (recordId) => {
    // In real app this would update backend
    alert(`Record ${recordId} marked as reviewed by ${currentUser.firstName} ${currentUser.lastName}`);
  };

  const statusBadge = (status) => {
    const cfg = {
      connected: { bg: '#dcfce7', color: '#16a34a', label: 'CONNECTED' },
      pending: { bg: '#fef3c7', color: '#d97706', label: 'PENDING' },
      disconnected: { bg: '#fee2e2', color: '#dc2626', label: 'DISCONNECTED' },
    };
    const c = cfg[status] || cfg.disconnected;
    return <span style={{ background: c.bg, color: c.color, padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>{c.label}</span>;
  };

  const tabs = [
    { id: 'records', label: '📄 Patient Records', badge: newRecordsCount },
    { id: 'network', label: '🌐 Network Directory' },
    { id: 'queries', label: '🔍 Query Log' },
    { id: 'consent', label: '✍️ Consent Management' },
    { id: 'analytics', label: '📊 Exchange Analytics' },
  ];

  return (
    <div className="page-padding">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>🌐 CareEverywhere — Health Information Exchange</h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>Query, receive, and review external patient records across connected health networks</p>
        </div>
      </div>

      {/* Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Connected Orgs', value: CONNECTED_ORGS.filter(o => o.status === 'connected').length, icon: '🏥', color: '#10b981' },
          { label: 'Networks Active', value: 5, icon: '🌐', color: '#3b82f6' },
          { label: 'Records Available', value: CONNECTED_ORGS.reduce((a, o) => a + o.recordsAvailable, 0).toLocaleString(), icon: '📄', color: '#8b5cf6' },
          { label: 'Unreviewed', value: Object.values(PATIENT_EXTERNAL_RECORDS).flat().filter(r => r.status === 'new').length, icon: '🆕', color: '#f59e0b' },
          { label: 'Queries Today', value: QUERY_LOG.filter(q => q.queried.startsWith('2026-04-15')).length, icon: '🔍', color: '#06b6d4' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: tab === t.id ? 800 : 600, color: tab === t.id ? '#2563eb' : '#64748b', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent', cursor: 'pointer', marginBottom: -2, position: 'relative' }}>
            {t.label}
            {t.badge > 0 && <span style={{ position: 'absolute', top: 2, right: -2, background: '#ef4444', color: '#fff', borderRadius: 99, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ─── Patient Records Tab ─── */}
      {tab === 'records' && (
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Patient</label>
              <select value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} className="form-input" style={{ minWidth: 200 }}>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Category</label>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="form-input">
                {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              {!consentStatus[selectedPatient] && (
                <span style={{ background: '#fef3c7', color: '#d97706', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>⚠️ HIE consent not on file</span>
              )}
              <button onClick={runQuery} disabled={queryStatus === 'querying' || !consentStatus[selectedPatient]} className="btn btn-primary">
                {queryStatus === 'querying' ? '⏳ Querying Networks…' : '🔍 Query External Records'}
              </button>
            </div>
          </div>

          {queryStatus === 'complete' && (
            <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>Query complete — {filteredRecords.length} documents received from {new Set(filteredRecords.map(r => r.source)).size} organizations</span>
              <button onClick={() => setQueryStatus(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#166534' }}>✕</button>
            </div>
          )}

          {filteredRecords.length === 0 ? (
            <div className="card" style={{ padding: 50, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>No external records found</div>
              <div style={{ fontSize: 13 }}>Click "Query External Records" to search connected networks</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {filteredRecords.map(rec => {
                const isExpanded = expandedRecord === rec.id;
                return (
                  <div key={rec.id} className="card" style={{ padding: 0, overflow: 'hidden', border: rec.status === 'new' ? '1px solid #3b82f6' : undefined }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', background: rec.status === 'new' ? '#eff6ff' : '#fff' }} onClick={() => setExpandedRecord(isExpanded ? null : rec.id)}>
                      <div style={{ fontSize: 22, marginRight: 14 }}>
                        {rec.category === 'Laboratory' ? '🔬' : rec.category === 'Pharmacy' ? '💊' : rec.category === 'Emergency' ? '🚑' : rec.category === 'Consult' ? '👩‍⚕️' : '📋'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{rec.docType}</span>
                          {rec.status === 'new' && <span style={{ background: '#3b82f6', color: '#fff', padding: '1px 8px', borderRadius: 99, fontSize: 9, fontWeight: 800 }}>NEW</span>}
                          <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600 }}>{rec.category}</span>
                          <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600 }}>{rec.type}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          🏥 {rec.source} · 📅 {rec.date}
                          {rec.reviewedBy && <> · ✅ Reviewed by {rec.reviewedBy} on {rec.reviewedDate}</>}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: '#94a3b8', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : '' }}>▼</span>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0 16px 16px', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ marginTop: 12, marginBottom: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>📋 Key Highlights:</div>
                          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#334155', lineHeight: 1.8 }}>
                            {rec.highlights.map((h, i) => <li key={i}>{h}</li>)}
                          </ul>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {rec.status === 'new' && (
                            <button onClick={() => markReviewed(rec.id)} className="btn btn-sm btn-primary">✅ Mark as Reviewed</button>
                          )}
                          <button className="btn btn-sm btn-secondary">📥 Import to Chart</button>
                          <button className="btn btn-sm btn-secondary">🖨️ Print</button>
                          <button className="btn btn-sm btn-secondary">📄 View Full Document (C-CDA)</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Network Directory Tab ─── */}
      {tab === 'network' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {NETWORKS.map(n => (
              <button key={n} onClick={() => setNetworkFilter(n)} className={`btn btn-sm ${networkFilter === n ? 'btn-primary' : 'btn-secondary'}`}>{n}</button>
            ))}
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Organization</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Type</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Network</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Last Sync</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map(org => (
                  <tr key={org.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{org.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{org.city} · OID: {org.oid}</div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{ background: '#f1f5f9', padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, color: '#475569' }}>{org.type}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{ background: '#eff6ff', padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, color: '#2563eb' }}>{org.network}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{statusBadge(org.status)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, color: '#64748b' }}>{org.lastSync || '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {org.status === 'connected' && <button className="btn btn-sm btn-secondary">🔄 Sync</button>}
                      {org.status === 'pending' && <button className="btn btn-sm btn-primary">✅ Approve</button>}
                      {org.status === 'disconnected' && <button className="btn btn-sm btn-primary">🔗 Reconnect</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16 }}>
            <button className="btn btn-secondary">➕ Request New Connection</button>
          </div>
        </div>
      )}

      {/* ─── Query Log Tab ─── */}
      {tab === 'queries' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Patient</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Queried By</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Date/Time</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Networks</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Orgs Queried</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Docs Received</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {QUERY_LOG.map(q => (
                <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>{q.patient}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b' }}>{q.queriedBy}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, color: '#64748b' }}>{q.queried}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {q.networks.map(n => <span key={n} style={{ background: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: 99, fontSize: 9, fontWeight: 600 }}>{n}</span>)}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>{q.organizations}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: q.docsReceived > 0 ? '#10b981' : '#94a3b8' }}>{q.docsReceived}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span style={{
                      background: q.status === 'complete' ? '#dcfce7' : q.status === 'in-progress' ? '#dbeafe' : '#fee2e2',
                      color: q.status === 'complete' ? '#16a34a' : q.status === 'in-progress' ? '#2563eb' : '#dc2626',
                      padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, textTransform: 'uppercase'
                    }}>{q.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Consent Management Tab ─── */}
      {tab === 'consent' && (
        <div>
          <div className="card" style={{ padding: 16, marginBottom: 16, background: '#eff6ff', border: '1px solid #93c5fd' }}>
            <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
              <strong>📋 HIE Consent Policy:</strong> Patients must provide written consent before their records can be shared via Health Information Exchange networks.
              Under 42 CFR Part 2, substance use disorder records require <strong>specific, separate consent</strong>. Mental health records may have additional state-level protections.
            </div>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Patient</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>HIE Consent</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>42 CFR Part 2</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Mental Health (State)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{p.name}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{ background: consentStatus[p.id] ? '#dcfce7' : '#fee2e2', color: consentStatus[p.id] ? '#16a34a' : '#dc2626', padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
                        {consentStatus[p.id] ? '✅ GRANTED' : '❌ NOT ON FILE'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>N/A</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{ background: consentStatus[p.id] ? '#dcfce7' : '#fef3c7', color: consentStatus[p.id] ? '#16a34a' : '#d97706', padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
                        {consentStatus[p.id] ? '✅ GRANTED' : '⚠️ PENDING'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {consentStatus[p.id] ? (
                        <button onClick={() => setConsentStatus(prev => ({ ...prev, [p.id]: false }))} className="btn btn-sm btn-secondary">🚫 Revoke</button>
                      ) : (
                        <button onClick={() => setConsentStatus(prev => ({ ...prev, [p.id]: true }))} className="btn btn-sm btn-primary">✍️ Record Consent</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Exchange Analytics Tab ─── */}
      {tab === 'analytics' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Total Queries (30d)', value: '284', color: '#3b82f6', trend: '↑ 18%' },
              { label: 'Documents Received', value: '1,847', color: '#10b981', trend: '↑ 22%' },
              { label: 'Avg Response Time', value: '3.2s', color: '#8b5cf6', trend: '↓ 0.8s' },
              { label: 'Import Rate', value: '73%', color: '#f59e0b', trend: '↑ 5%' },
            ].map((m, i) => (
              <div key={i} className="card" style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{m.label}</div>
                <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginTop: 4 }}>{m.trend}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 14px' }}>📊 Documents by Source Type</h3>
              {[
                { type: 'Hospitals', pct: 42, color: '#3b82f6' },
                { type: 'Labs', pct: 28, color: '#10b981' },
                { type: 'Pharmacies', pct: 18, color: '#8b5cf6' },
                { type: 'Specialists', pct: 8, color: '#f59e0b' },
                { type: 'Public Health', pct: 4, color: '#06b6d4' },
              ].map((s, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    <span>{s.type}</span><span style={{ color: s.color }}>{s.pct}%</span>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99 }}>
                    <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 14px' }}>🌐 Network Usage</h3>
              {[
                { network: 'CommonWell Health Alliance', queries: 142, color: '#3b82f6' },
                { network: 'Carequality', queries: 89, color: '#8b5cf6' },
                { network: 'Surescripts', queries: 67, color: '#10b981' },
                { network: 'eHealth Exchange', queries: 34, color: '#f59e0b' },
                { network: 'IHE Profiles', queries: 12, color: '#06b6d4' },
              ].map((n, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{n.network}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: n.color }}>{n.queries} queries</span>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance Metrics */}
          <div className="card" style={{ marginTop: 16, padding: 20, background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', borderRadius: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 14px', color: '#fff' }}>🔒 Interoperability Compliance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
              {[
                { label: 'ONC TEFCA', status: 'Compliant', color: '#10b981' },
                { label: 'FHIR R4', status: 'Certified', color: '#10b981' },
                { label: '21st Century Cures', status: 'Compliant', color: '#10b981' },
                { label: 'Information Blocking', status: '0 Violations', color: '#10b981' },
                { label: 'Patient Access API', status: 'Active', color: '#10b981' },
              ].map((c, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: c.color }}>✅</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{c.label}</div>
                  <div style={{ fontSize: 10, color: c.color, fontWeight: 700 }}>{c.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
