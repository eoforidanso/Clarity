import React, { useState, useEffect } from 'react';

const NETWORK_STATS = {
  labs: 277000,
  pharmacies: 95000,
  hies: 48,
  providers: 1200000,
  payers: 850,
  tefcaQhins: 7,
};

const INTEGRATIONS = [
  // Lab Networks
  { id: 'quest', name: 'Quest Diagnostics', type: 'Lab', icon: '🔬', status: 'connected', lastSync: '2 min ago', records: '12,847', protocol: 'HL7 FHIR R4' },
  { id: 'labcorp', name: 'LabCorp', type: 'Lab', icon: '🧪', status: 'connected', lastSync: '5 min ago', records: '9,234', protocol: 'HL7 v2.5.1' },
  { id: 'bioreference', name: 'BioReference Labs', type: 'Lab', icon: '🔬', status: 'connected', lastSync: '12 min ago', records: '3,891', protocol: 'HL7 FHIR R4' },
  { id: 'arup', name: 'ARUP Laboratories', type: 'Lab', icon: '🧬', status: 'pending', lastSync: 'Pending setup', records: '—', protocol: 'HL7 v2.5.1' },
  // Pharmacies
  { id: 'surescripts', name: 'Surescripts Network', type: 'Pharmacy', icon: '💊', status: 'connected', lastSync: 'Real-time', records: '95,000+ pharmacies', protocol: 'NCPDP SCRIPT 2017' },
  { id: 'cvs', name: 'CVS Caremark (Direct)', type: 'Pharmacy', icon: '🏪', status: 'connected', lastSync: '1 min ago', records: '9,900+ locations', protocol: 'NCPDP SCRIPT' },
  { id: 'walgreens', name: 'Walgreens (Direct)', type: 'Pharmacy', icon: '🏪', status: 'connected', lastSync: 'Real-time', records: '8,500+ locations', protocol: 'NCPDP SCRIPT' },
  // HIEs
  { id: 'commonwell', name: 'CommonWell Health Alliance', type: 'HIE', icon: '🏥', status: 'connected', lastSync: '30 min ago', records: '176M+ patients', protocol: 'IHE XCA/XCPD' },
  { id: 'carequality', name: 'Carequality Framework', type: 'HIE', icon: '🔗', status: 'connected', lastSync: '15 min ago', records: '200M+ patients', protocol: 'IHE XCA' },
  { id: 'directtrust', name: 'DirectTrust Messaging', type: 'HIE', icon: '📧', status: 'connected', lastSync: 'Active', records: 'Direct Secure Messaging', protocol: 'Direct Protocol' },
  // Clearinghouses & Payers
  { id: 'change', name: 'Change Healthcare', type: 'Clearinghouse', icon: '📋', status: 'connected', lastSync: '3 min ago', records: '850+ payers', protocol: 'X12 837/835' },
  { id: 'availity', name: 'Availity', type: 'Clearinghouse', icon: '💳', status: 'connected', lastSync: '7 min ago', records: '600+ payers', protocol: 'X12 270/271' },
  // Registries
  { id: 'cmsqpp', name: 'CMS Quality Payment Program', type: 'Registry', icon: '🏛️', status: 'connected', lastSync: 'Quarterly', records: 'MIPS Auto-Submit', protocol: 'QRDA III' },
  { id: 'immunization', name: 'State Immunization Registry', type: 'Registry', icon: '💉', status: 'connected', lastSync: '1 hr ago', records: '2,340 records', protocol: 'HL7 VXU' },
  { id: 'pdmp', name: 'State PDMP Integration', type: 'Registry', icon: '🔒', status: 'connected', lastSync: 'Real-time', records: 'Controlled Substance Rx', protocol: 'PMPInterConnect' },
  // TEFCA QHINs
  { id: 'tefca-epic', name: 'eHealth Exchange (TEFCA)', type: 'TEFCA', icon: '🌐', status: 'connected', lastSync: '10 min ago', records: '250M+ patients', protocol: 'TEFCA / IHE XCA' },
  { id: 'tefca-commonwell', name: 'CommonWell via TEFCA', type: 'TEFCA', icon: '🔗', status: 'connected', lastSync: '20 min ago', records: '176M+ patients', protocol: 'TEFCA QHIN-QHIN' },
  { id: 'tefca-konza', name: 'Konza National Network', type: 'TEFCA', icon: '🏛️', status: 'connected', lastSync: '45 min ago', records: '120M+ records', protocol: 'TEFCA / FHIR R4' },
  { id: 'tefca-medicity', name: 'Medicity / Aetna HIE', type: 'TEFCA', icon: '💼', status: 'pending', lastSync: 'Onboarding', records: '—', protocol: 'TEFCA / IHE' },
];

const TYPE_FILTERS = ['All', 'Lab', 'Pharmacy', 'HIE', 'Clearinghouse', 'Registry', 'TEFCA'];

export default function NetworkIntegrations() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [dedupStats, setDedupStats] = useState({ scanned: 0, duplicates: 0, merged: 0, pending: 0, running: false, complete: false });
  const [dedupDetails, setDedupDetails] = useState([]);

  const runDedup = () => {
    setDedupStats({ scanned: 0, duplicates: 0, merged: 0, pending: 0, running: true, complete: false });
    setDedupDetails([]);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step <= 8) {
        setDedupStats(prev => ({
          ...prev,
          scanned: prev.scanned + Math.floor(Math.random() * 5000 + 2000),
          duplicates: prev.duplicates + (step % 2 === 0 ? Math.floor(Math.random() * 3 + 1) : 0),
        }));
      } else {
        clearInterval(interval);
        const details = [
          { id: 1, patient: 'James Anderson', sources: ['CommonWell', 'eHealth Exchange'], field: 'Name + DOB match', confidence: 98, action: 'Auto-Merged' },
          { id: 2, patient: 'Maria Garcia', sources: ['Carequality', 'Konza Network'], field: 'MRN + SSN-last4 match', confidence: 95, action: 'Auto-Merged' },
          { id: 3, patient: 'David Thompson', sources: ['Quest Diagnostics', 'Internal'], field: 'Name similar + DOB match', confidence: 87, action: 'Pending Review' },
          { id: 4, patient: 'Ashley Kim', sources: ['LabCorp', 'CommonWell'], field: 'Insurance ID match', confidence: 92, action: 'Auto-Merged' },
          { id: 5, patient: 'Dorothy Wilson', sources: ['DirectTrust', 'Internal'], field: 'Phone + Address match', confidence: 82, action: 'Pending Review' },
        ];
        setDedupDetails(details);
        setDedupStats({
          scanned: 34892,
          duplicates: 5,
          merged: 3,
          pending: 2,
          running: false,
          complete: true,
        });
      }
    }, 500);
  };

  const filtered = INTEGRATIONS.filter(i => {
    if (filter !== 'All' && i.type !== filter) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const connectedCount = INTEGRATIONS.filter(i => i.status === 'connected').length;

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>🌐 Network & Clinical Integrations</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Connected to {NETWORK_STATS.labs.toLocaleString()}+ labs, {NETWORK_STATS.pharmacies.toLocaleString()}+ pharmacies, and {NETWORK_STATS.hies} HIE networks
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm">🔄 Refresh All Connections</button>
          <button className="btn btn-primary btn-sm">+ Add Integration</button>
        </div>
      </div>

      {/* Network Stats */}
      <div className="network-panel" style={{ marginBottom: 20 }}>
        <div className="network-panel-header">
          <h3>🌐 athenaNet™ Network Coverage</h3>
          <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: 12 }}>
            {connectedCount}/{INTEGRATIONS.length} Active
          </span>
        </div>
        <div className="network-stat-row" style={{ justifyContent: 'space-around', padding: '18px 24px' }}>
          <div className="network-stat">
            <div className="num">{NETWORK_STATS.labs.toLocaleString()}+</div>
            <div className="lbl">Lab Locations</div>
          </div>
          <div className="network-stat">
            <div className="num">{NETWORK_STATS.pharmacies.toLocaleString()}+</div>
            <div className="lbl">Pharmacies</div>
          </div>
          <div className="network-stat">
            <div className="num">{NETWORK_STATS.hies}</div>
            <div className="lbl">HIE Networks</div>
          </div>
          <div className="network-stat">
            <div className="num">{NETWORK_STATS.providers.toLocaleString()}+</div>
            <div className="lbl">Provider Directory</div>
          </div>
          <div className="network-stat">
            <div className="num">{NETWORK_STATS.payers}</div>
            <div className="lbl">Payer Connections</div>
          </div>
          <div className="network-stat">
            <div className="num">{NETWORK_STATS.tefcaQhins}</div>
            <div className="lbl">TEFCA QHINs</div>
          </div>
        </div>
      </div>

      {/* TEFCA Network Connectivity */}
      <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                🏛️ TEFCA — Trusted Exchange Framework & Common Agreement
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.9 }}>
                Nationwide health information exchange via ONC-designated QHINs
              </p>
            </div>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
              ✓ TEFCA Participant
            </span>
          </div>
        </div>
        <div className="card-body" style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 14, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>Active</div>
              <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>Exchange Status</div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>3 QHINs</div>
              <div style={{ fontSize: 11, color: '#1e40af', marginTop: 2 }}>Connected Networks</div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, background: '#faf5ff', border: '1px solid #e9d5ff', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed' }}>546M+</div>
              <div style={{ fontSize: 11, color: '#5b21b6', marginTop: 2 }}>Reachable Records</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
            <strong>Supported Exchange Purposes:</strong>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Treatment', icon: '🩺', active: true },
              { label: 'Payment', icon: '💳', active: true },
              { label: 'Health Care Operations', icon: '🏥', active: true },
              { label: 'Public Health', icon: '🏛️', active: true },
              { label: 'Individual Access Services', icon: '👤', active: true },
              { label: 'Government Benefits', icon: '📋', active: false },
            ].map(ep => (
              <span key={ep.label} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: ep.active ? '#f0fdf4' : '#f5f5f5',
                color: ep.active ? '#16a34a' : '#999',
                border: `1px solid ${ep.active ? '#bbf7d0' : '#e5e5e5'}`,
              }}>
                {ep.icon} {ep.label} {ep.active ? '✓' : '—'}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
            <strong>TEFCA Capabilities:</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { cap: 'Query-Based Document Exchange (QBD)', status: '✅ Active' },
              { cap: 'Message Delivery (Direct Secure)', status: '✅ Active' },
              { cap: 'Patient Record Locate & Retrieve', status: '✅ Active' },
              { cap: 'Cross-QHIN Patient Matching', status: '✅ Active' },
              { cap: 'Bulk Data Export (FHIR)', status: '🔄 In Progress' },
              { cap: 'Event Notifications (ADT)', status: '🔄 In Progress' },
            ].map(c => (
              <div key={c.cap} style={{
                padding: '8px 12px', borderRadius: 8, background: '#fafbfc',
                border: '1px solid var(--border)', fontSize: 11, display: 'flex',
                justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>{c.cap}</span>
                <span style={{ fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Record Deduplication Engine */}
      <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              🔗 AI Record Deduplication Engine
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.9 }}>
              Detect and merge duplicate patient records across all connected networks
            </p>
          </div>
          <button onClick={runDedup} disabled={dedupStats.running}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 12,
              background: dedupStats.running ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.95)',
              color: dedupStats.running ? '#fff' : '#b45309', cursor: dedupStats.running ? 'not-allowed' : 'pointer',
            }}>
            {dedupStats.running ? '⏳ Scanning...' : '🔍 Run Dedup Scan'}
          </button>
        </div>
        <div className="card-body" style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 14, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{dedupStats.scanned.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: '#1e40af', marginTop: 2 }}>Records Scanned</div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, background: '#fef3c7', border: '1px solid #fde68a', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#b45309' }}>{dedupStats.duplicates}</div>
              <div style={{ fontSize: 11, color: '#92400e', marginTop: 2 }}>Duplicates Found</div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{dedupStats.merged}</div>
              <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>Auto-Merged</div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, background: '#faf5ff', border: '1px solid #e9d5ff', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed' }}>{dedupStats.pending}</div>
              <div style={{ fontSize: 11, color: '#5b21b6', marginTop: 2 }}>Pending Review</div>
            </div>
          </div>
          {dedupStats.running && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ background: '#fef3c7', borderRadius: 8, height: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, #f59e0b, #f97316)', borderRadius: 8, width: `${Math.min((dedupStats.scanned / 35000) * 100, 100)}%`, transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: 11, color: '#b45309', marginTop: 4, textAlign: 'center' }}>Scanning records across {connectedCount} connected networks...</div>
            </div>
          )}
          {dedupDetails.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: '#fffbeb', borderBottom: '1px solid #fde68a', fontSize: 11, fontWeight: 700, color: '#92400e' }}>
                🔍 Duplicate Records Detected
              </div>
              {dedupDetails.map((d, i) => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderBottom: i < dedupDetails.length - 1 ? '1px solid var(--border-light)' : 'none',
                  fontSize: 12,
                }}>
                  <span style={{ fontSize: 16 }}>{d.action === 'Auto-Merged' ? '✅' : '⚠️'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{d.patient}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.sources.join(' ↔ ')} · {d.field}</div>
                  </div>
                  <div style={{
                    padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                    background: d.confidence >= 90 ? '#dcfce7' : '#fef3c7',
                    color: d.confidence >= 90 ? '#16a34a' : '#b45309',
                  }}>{d.confidence}% match</div>
                  <span className={`badge ${d.action === 'Auto-Merged' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 10 }}>
                    {d.action}
                  </span>
                  {d.action === 'Pending Review' && (
                    <button className="btn btn-sm btn-primary" style={{ fontSize: 10, padding: '3px 10px' }}
                      onClick={() => {
                        setDedupDetails(prev => prev.map(x => x.id === d.id ? {...x, action: 'Auto-Merged'} : x));
                        setDedupStats(prev => ({...prev, merged: prev.merged + 1, pending: prev.pending - 1}));
                      }}>
                      Merge
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        {TYPE_FILTERS.map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)}>{f}</button>
        ))}
        <div style={{ flex: 1 }} />
        <input className="form-input" placeholder="Search integrations..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ width: 240, fontSize: 12 }} />
      </div>

      {/* Integration Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14 }}>
        {filtered.map(integration => (
          <div key={integration.id} className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: integration.status === 'connected' ? '#f0fdf4' : '#fffbeb',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                border: `1.5px solid ${integration.status === 'connected' ? '#bbf7d0' : '#fde68a'}`,
              }}>
                {integration.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {integration.name}
                  <span className={`network-status-dot ${integration.status}`} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {integration.type} · {integration.protocol}
                </div>
              </div>
              <span className={`badge ${integration.status === 'connected' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 10 }}>
                {integration.status === 'connected' ? '✓ Connected' : '⏳ Pending'}
              </span>
            </div>
            <div style={{
              padding: '10px 18px', background: 'var(--bg)', borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)',
            }}>
              <span>📊 {integration.records}</span>
              <span>🕐 {integration.lastSync}</span>
            </div>
          </div>
        ))}
      </div>

      {/* FHIR Capability Statement */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h2>🔥 FHIR R4 Capability Statement</h2>
          <span className="badge badge-success">Certified ONC 2015 Edition Cures Update</span>
        </div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { resource: 'Patient', ops: 'CRUD + Search', icon: '👤' },
            { resource: 'Encounter', ops: 'CRUD + Search', icon: '📋' },
            { resource: 'Observation', ops: 'CRUD + Search', icon: '📊' },
            { resource: 'MedicationRequest', ops: 'CRUD + Search', icon: '💊' },
            { resource: 'AllergyIntolerance', ops: 'CRUD + Search', icon: '⚠️' },
            { resource: 'Condition', ops: 'CRUD + Search', icon: '🩺' },
            { resource: 'DiagnosticReport', ops: 'Read + Search', icon: '🔬' },
            { resource: 'Immunization', ops: 'CRUD + Search', icon: '💉' },
            { resource: 'Procedure', ops: 'CRUD + Search', icon: '🏥' },
            { resource: 'DocumentReference', ops: 'CRUD + Search', icon: '📄' },
            { resource: 'ClinicalNote', ops: 'Read + Search', icon: '📝' },
            { resource: 'Provenance', ops: 'Read', icon: '🔒' },
          ].map(r => (
            <div key={r.resource} style={{
              padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
              background: '#fafbfc', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>{r.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{r.resource}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.ops}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
