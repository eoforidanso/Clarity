import React, { useState } from 'react';

const API_ENDPOINTS = [
  // Auth
  { group: 'Authentication', method: 'POST', path: '/api/auth/login', desc: 'Authenticate user and receive JWT token', params: 'username, password', response: '{ token, user }' },
  { group: 'Authentication', method: 'POST', path: '/api/auth/2fa', desc: 'Verify two-factor authentication code', params: 'userId, code', response: '{ verified, token }' },
  { group: 'Authentication', method: 'POST', path: '/api/auth/logout', desc: 'Invalidate current session token', params: 'Authorization header', response: '{ success }' },
  // Patients
  { group: 'Patients', method: 'GET', path: '/api/patients', desc: 'List all patients with optional search and pagination', params: 'search?, page?, limit?', response: '{ patients[], total, page }' },
  { group: 'Patients', method: 'GET', path: '/api/patients/:id', desc: 'Get patient details by ID including demographics', params: 'id (path)', response: '{ patient }' },
  { group: 'Patients', method: 'POST', path: '/api/patients', desc: 'Create a new patient record', params: 'firstName, lastName, dob, gender, mrn, ...', response: '{ patient, id }' },
  { group: 'Patients', method: 'PUT', path: '/api/patients/:id', desc: 'Update patient demographics and details', params: 'id (path), fields to update', response: '{ patient }' },
  // Appointments
  { group: 'Appointments', method: 'GET', path: '/api/appointments', desc: 'List appointments with date range and provider filters', params: 'startDate?, endDate?, providerId?', response: '{ appointments[] }' },
  { group: 'Appointments', method: 'POST', path: '/api/appointments', desc: 'Schedule a new appointment', params: 'patientId, providerId, dateTime, type, duration', response: '{ appointment }' },
  { group: 'Appointments', method: 'PUT', path: '/api/appointments/:id', desc: 'Update appointment status or details', params: 'id (path), status?, dateTime?', response: '{ appointment }' },
  // Encounters
  { group: 'Clinical', method: 'GET', path: '/api/encounters/:patientId', desc: 'Get all encounters for a patient', params: 'patientId (path)', response: '{ encounters[] }' },
  { group: 'Clinical', method: 'POST', path: '/api/encounters', desc: 'Create a new clinical encounter with SOAP note', params: 'patientId, type, subjective, mse, assessment, plan, ...', response: '{ encounter }' },
  // Medications
  { group: 'Clinical', method: 'GET', path: '/api/medications/:patientId', desc: 'Get active and historical medications for patient', params: 'patientId (path), status?', response: '{ medications[] }' },
  { group: 'Clinical', method: 'POST', path: '/api/eprescribe', desc: 'Submit electronic prescription via Surescripts', params: 'patientId, medication, dosage, pharmacy, ...', response: '{ prescription, trackingId }' },
  // Labs
  { group: 'Clinical', method: 'GET', path: '/api/labs/:patientId', desc: 'Get lab results for a patient', params: 'patientId (path)', response: '{ labs[] }' },
  { group: 'Clinical', method: 'POST', path: '/api/orders', desc: 'Place a lab or imaging order', params: 'patientId, orderType, tests[], urgency', response: '{ order }' },
  // Billing
  { group: 'Billing', method: 'POST', path: '/api/claims', desc: 'Submit insurance claim (X12 837P)', params: 'encounterId, icd10[], cpt[], payer, ...', response: '{ claim, trackingId }' },
  { group: 'Billing', method: 'GET', path: '/api/claims', desc: 'List claims with status filters', params: 'status?, dateRange?, payerId?', response: '{ claims[], totals }' },
  { group: 'Billing', method: 'GET', path: '/api/eligibility/:patientId', desc: 'Real-time insurance eligibility check (X12 270/271)', params: 'patientId (path), payerId', response: '{ eligible, copay, deductible, ... }' },
  // Analytics
  { group: 'Analytics', method: 'GET', path: '/api/analytics/dashboard', desc: 'Get dashboard metrics and KPIs', params: 'dateRange?, providerId?', response: '{ metrics, charts }' },
  { group: 'Analytics', method: 'GET', path: '/api/analytics/quality', desc: 'Get quality measure scores (MIPS/HEDIS)', params: 'measureId?, period?', response: '{ measures[], scores }' },
  // Messaging
  { group: 'Messaging', method: 'GET', path: '/api/inbox', desc: 'Get inbox messages for current user', params: 'Authorization header', response: '{ messages[] }' },
  { group: 'Messaging', method: 'POST', path: '/api/messaging/send', desc: 'Send a staff or patient message', params: 'to, subject, body, priority?', response: '{ message }' },
  // FHIR
  { group: 'FHIR R4', method: 'GET', path: '/fhir/r4/Patient/:id', desc: 'FHIR R4 Patient resource read', params: 'id (path)', response: 'FHIR Patient Resource JSON' },
  { group: 'FHIR R4', method: 'GET', path: '/fhir/r4/Encounter', desc: 'FHIR R4 Encounter search', params: 'patient?, date?, status?', response: 'FHIR Bundle' },
  { group: 'FHIR R4', method: 'GET', path: '/fhir/r4/Observation', desc: 'FHIR R4 Observation (labs/vitals) search', params: 'patient?, category?, code?', response: 'FHIR Bundle' },
  { group: 'FHIR R4', method: 'GET', path: '/fhir/r4/MedicationRequest', desc: 'FHIR R4 MedicationRequest search', params: 'patient?, status?', response: 'FHIR Bundle' },
  { group: 'FHIR R4', method: 'GET', path: '/fhir/r4/metadata', desc: 'FHIR R4 Capability Statement', params: 'none', response: 'CapabilityStatement Resource' },
];

const GROUPS = [...new Set(API_ENDPOINTS.map(e => e.group))];

const METHOD_COLORS = {
  GET: { bg: '#dcfce7', color: '#16a34a' },
  POST: { bg: '#dbeafe', color: '#2563eb' },
  PUT: { bg: '#fef3c7', color: '#b45309' },
  DELETE: { bg: '#fef2f2', color: '#dc2626' },
};

export default function APIDocumentation() {
  const [expandedGroup, setExpandedGroup] = useState('Authentication');
  const [search, setSearch] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);

  const filtered = search
    ? API_ENDPOINTS.filter(e => e.path.toLowerCase().includes(search.toLowerCase()) || e.desc.toLowerCase().includes(search.toLowerCase()))
    : API_ENDPOINTS;

  const groupedEndpoints = GROUPS.reduce((acc, g) => {
    acc[g] = filtered.filter(e => e.group === g);
    return acc;
  }, {});

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>🔧 API Documentation</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            RESTful API reference for Clarity EHR — FHIR R4 compliant, SMART on FHIR authorized
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-success" style={{ fontSize: 11 }}>API v2.0</span>
          <span className="badge badge-info" style={{ fontSize: 11 }}>FHIR R4</span>
          <span className="badge badge-warning" style={{ fontSize: 11 }}>OAuth 2.0 / JWT</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div className="stat-card row blue fade-in"><div className="stat-icon blue">🔧</div><div className="stat-info"><h3>{API_ENDPOINTS.length}</h3><p>Total Endpoints</p></div></div>
        <div className="stat-card row green fade-in"><div className="stat-icon green">🔥</div><div className="stat-info"><h3>{API_ENDPOINTS.filter(e => e.group === 'FHIR R4').length}</h3><p>FHIR Resources</p></div></div>
        <div className="stat-card row teal fade-in"><div className="stat-icon teal">📊</div><div className="stat-info"><h3>{GROUPS.length}</h3><p>API Groups</p></div></div>
        <div className="stat-card row yellow fade-in"><div className="stat-icon yellow">🔒</div><div className="stat-info"><h3>OAuth 2.0</h3><p>Auth Protocol</p></div></div>
      </div>

      {/* Authentication Info */}
      <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, #1e293b, #334155)', color: '#fff' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>🔐 Authentication</h3>
        </div>
        <div className="card-body" style={{ padding: 16 }}>
          <div style={{ fontFamily: 'monospace', background: '#1e293b', color: '#4ade80', padding: 14, borderRadius: 8, fontSize: 12, lineHeight: 1.8 }}>
            <div style={{ color: '#94a3b8' }}># Request a JWT token</div>
            <div>POST /api/auth/login</div>
            <div>Content-Type: application/json</div>
            <div style={{ color: '#fbbf24', marginTop: 4 }}>{'{'} "username": "your_username", "password": "your_password" {'}'}</div>
            <div style={{ color: '#94a3b8', marginTop: 8 }}># Use the token in subsequent requests</div>
            <div>Authorization: Bearer {'<token>'}</div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 10, background: 'var(--bg)', borderRadius: 6 }}>
              <strong>Token Expiry:</strong> 8 hours (configurable)
            </div>
            <div style={{ padding: 10, background: 'var(--bg)', borderRadius: 6 }}>
              <strong>Rate Limit:</strong> 1000 requests/minute per token
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input className="form-input" placeholder="Search endpoints — path, description..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ width: '100%', fontSize: 13 }} />
      </div>

      {/* Endpoint Groups */}
      {GROUPS.map(group => {
        const endpoints = groupedEndpoints[group];
        if (!endpoints || endpoints.length === 0) return null;
        const isExpanded = expandedGroup === group;
        return (
          <div key={group} className="card" style={{ marginBottom: 12, overflow: 'hidden' }}>
            <button onClick={() => setExpandedGroup(isExpanded ? null : group)}
              style={{
                width: '100%', padding: '14px 20px', border: 'none', cursor: 'pointer',
                background: isExpanded ? 'var(--primary-light)' : 'var(--bg-white)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontWeight: 700, fontSize: 14, color: 'var(--text-primary)',
              }}>
              <span>{group} ({endpoints.length})</span>
              <span style={{ fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>
            </button>
            {isExpanded && (
              <div>
                {endpoints.map((ep, i) => (
                  <div key={i} style={{
                    padding: '12px 20px', borderTop: '1px solid var(--border-light)',
                    cursor: 'pointer', background: selectedEndpoint === ep.path ? '#f8fafc' : 'transparent',
                  }}
                    onClick={() => setSelectedEndpoint(selectedEndpoint === ep.path ? null : ep.path)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800,
                        background: METHOD_COLORS[ep.method]?.bg || '#f5f5f5',
                        color: METHOD_COLORS[ep.method]?.color || '#666',
                        fontFamily: 'monospace',
                      }}>{ep.method}</span>
                      <code style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{ep.path}</code>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 58 }}>{ep.desc}</div>
                    {selectedEndpoint === ep.path && (
                      <div style={{ marginTop: 10, marginLeft: 58, padding: 12, borderRadius: 8, background: '#1e293b', color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.8 }}>
                        <div><span style={{ color: '#94a3b8' }}>Parameters: </span><span style={{ color: '#fbbf24' }}>{ep.params}</span></div>
                        <div><span style={{ color: '#94a3b8' }}>Response: </span><span style={{ color: '#4ade80' }}>{ep.response}</span></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Webhook & SDK Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 20 }}>
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>🔔 Webhooks</h3>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Register webhooks for real-time notifications:
            <ul style={{ paddingLeft: 16, marginTop: 8 }}>
              <li>patient.created / patient.updated</li>
              <li>appointment.scheduled / appointment.cancelled</li>
              <li>encounter.signed / encounter.amended</li>
              <li>claim.submitted / claim.adjudicated</li>
              <li>lab.result.received</li>
            </ul>
          </div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>📦 SDKs & Libraries</h3>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Official client libraries available:
            <ul style={{ paddingLeft: 16, marginTop: 8 }}>
              <li>JavaScript / TypeScript (npm: @clarity/sdk)</li>
              <li>Python (pip: clarity-ehr)</li>
              <li>C# / .NET (NuGet: Clarity.Client)</li>
              <li>Java (Maven: com.clarity:ehr-client)</li>
              <li>SMART on FHIR Launch Framework</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
