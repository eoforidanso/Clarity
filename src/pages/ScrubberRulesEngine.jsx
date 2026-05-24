import React, { useState, useMemo } from 'react';

// ─── Rule Library ─────────────────────────────────────────────────────────────
const DEFAULT_RULES = [
  // Modifier rules
  { id: 'r001', category: 'Modifier', severity: 'error', payer: 'All', description: 'Modifier 25 required when E&M and psychotherapy billed same-day', trigger: 'E&M + Psychotherapy same-day', code: 'MOD-25', enabled: true, editable: false, hitCount: 14 },
  { id: 'r002', category: 'Modifier', severity: 'error', payer: 'Blue Cross Blue Shield', description: 'BCBS: Modifier 25 required on E&M when 90833 (interactive complexity add-on) is also billed', trigger: '99213/99214/99215 + 90833', code: 'MOD-25-BCBS', enabled: true, editable: false, hitCount: 7 },
  { id: 'r003', category: 'Modifier', severity: 'warning', payer: 'Aetna', description: 'Aetna telehealth requires Modifier 95. Verify POS code 02 or 10', trigger: 'Telehealth encounter', code: 'MOD-95-AET', enabled: true, editable: false, hitCount: 3 },
  { id: 'r004', category: 'Modifier', severity: 'info', payer: 'Medicare Part B', description: 'Medicare: append Modifier GP or GN for therapy service plans as required', trigger: '90837/90834/90832 + Medicare', code: 'MOD-GP-MCR', enabled: true, editable: false, hitCount: 5 },
  // Authorization rules
  { id: 'r005', category: 'Authorization', severity: 'error', payer: 'Anthem', description: 'Anthem requires prior authorization for psychiatric evaluations (90791, 90792)', trigger: '90791 or 90792 + Anthem', code: 'AUTH-ANTHEM-EVAL', enabled: true, editable: false, hitCount: 2 },
  { id: 'r006', category: 'Authorization', severity: 'warning', payer: 'Cigna', description: 'Cigna requires auth for intensive outpatient services (90853 > 3×/week)', trigger: '90853 high frequency', code: 'AUTH-CIGNA-IOP', enabled: true, editable: true, hitCount: 1 },
  { id: 'r007', category: 'Authorization', severity: 'warning', payer: 'UnitedHealthcare', description: 'UHC requires treatment plan on file for ongoing psychotherapy beyond 8 sessions', trigger: 'Psychotherapy >8 sessions', code: 'AUTH-UHC-TXPLAN', enabled: true, editable: true, hitCount: 4 },
  // Documentation rules
  { id: 'r008', category: 'Documentation', severity: 'warning', payer: 'UnitedHealthcare', description: 'UHC requires documented time for high-complexity E&M (99215)', trigger: '99215 + UHC', code: 'DOC-UHC-99215', enabled: true, editable: false, hitCount: 6 },
  { id: 'r009', category: 'Documentation', severity: 'error', payer: 'All', description: 'No ICD-10 diagnosis code — required for all claim submissions', trigger: 'Missing ICD-10', code: 'DOC-NODIAG', enabled: true, editable: false, hitCount: 9 },
  { id: 'r010', category: 'Documentation', severity: 'warning', payer: 'All', description: 'High-complexity E&M (99215) should have ≥2 supporting diagnoses', trigger: '99215 + <2 ICD codes', code: 'DOC-99215-DIAG', enabled: true, editable: false, hitCount: 4 },
  { id: 'r011', category: 'Documentation', severity: 'info', payer: 'All', description: 'New patient E&M (99202–99205) requires documented history, exam, and MDM', trigger: '99202–99205', code: 'DOC-NEWPT', enabled: true, editable: true, hitCount: 2 },
  // Coverage rules
  { id: 'r012', category: 'Coverage', severity: 'info', payer: 'Medicare Part B', description: 'Medicare: verify rendering provider NPI and Place of Service code on all claims', trigger: 'Medicare claim', code: 'COV-MCR-NPI', enabled: true, editable: false, hitCount: 11 },
  { id: 'r013', category: 'Coverage', severity: 'warning', payer: 'All', description: 'Verify patient eligibility and active coverage before submitting claim', trigger: 'All claims', code: 'COV-ELIG', enabled: true, editable: true, hitCount: 8 },
  { id: 'r014', category: 'Coverage', severity: 'error', payer: 'All', description: 'Missing member ID — required for payer claim submission', trigger: 'Missing member ID', code: 'COV-MEMBERID', enabled: true, editable: false, hitCount: 3 },
  // Bundling rules
  { id: 'r015', category: 'Bundling', severity: 'error', payer: 'All', description: 'CPT 90833 (add-on) cannot be billed without a primary E&M code on same date', trigger: '90833 without E&M', code: 'BNDL-90833', enabled: true, editable: false, hitCount: 5 },
  { id: 'r016', category: 'Bundling', severity: 'error', payer: 'All', description: '90791 and 90792 cannot both be billed on the same date of service', trigger: '90791 + 90792 same-day', code: 'BNDL-EVAL', enabled: true, editable: false, hitCount: 1 },
  { id: 'r017', category: 'Bundling', severity: 'warning', payer: 'All', description: '96127 (behavioral assessment) may be bundled with E&M by some payers — verify policy', trigger: '96127 + E&M', code: 'BNDL-96127', enabled: true, editable: true, hitCount: 3 },
  // Filing Limit rules
  { id: 'r018', category: 'Filing Limit', severity: 'error', payer: 'Blue Cross Blue Shield', description: 'BCBS: 180-day timely filing limit from date of service', trigger: 'Claim >180 days old', code: 'FILE-BCBS', enabled: true, editable: true, hitCount: 2 },
  { id: 'r019', category: 'Filing Limit', severity: 'error', payer: 'Aetna', description: 'Aetna: 180-day timely filing limit from date of service', trigger: 'Claim >180 days old', code: 'FILE-AET', enabled: true, editable: true, hitCount: 1 },
  { id: 'r020', category: 'Filing Limit', severity: 'error', payer: 'UnitedHealthcare', description: 'UHC: 90-day timely filing limit from date of service', trigger: 'Claim >90 days old', code: 'FILE-UHC', enabled: true, editable: true, hitCount: 3 },
  { id: 'r021', category: 'Filing Limit', severity: 'error', payer: 'Cigna', description: 'Cigna: 180-day timely filing limit from date of service', trigger: 'Claim >180 days old', code: 'FILE-CGN', enabled: true, editable: true, hitCount: 0 },
  { id: 'r022', category: 'Filing Limit', severity: 'error', payer: 'Medicare Part B', description: 'Medicare: 12-month timely filing limit from date of service', trigger: 'Claim >365 days old', code: 'FILE-MCR', enabled: true, editable: true, hitCount: 1 },
];

const CATEGORIES = ['All Categories', 'Modifier', 'Authorization', 'Documentation', 'Coverage', 'Bundling', 'Filing Limit'];
const PAYERS = ['All Payers', 'All', 'Blue Cross Blue Shield', 'Aetna', 'UnitedHealthcare', 'Cigna', 'Anthem', 'Medicare Part B'];
const SEVERITIES = ['All Severities', 'error', 'warning', 'info'];
const CPT_OPTIONS = ['99213','99214','99215','90792','90791','96127','90837','90834','90832','90833','90853','99202','99203','99204','99205'];
const PAYER_TEST_OPTIONS = ['Blue Cross Blue Shield','Aetna','UnitedHealthcare','Cigna','Anthem','Medicare Part B'];

const CPT_DESC = {
  '99213': 'Office Visit, Low Complexity',
  '99214': 'Office Visit, Moderate Complexity',
  '99215': 'Office Visit, High Complexity',
  '90792': 'Psychiatric Eval w/ Medical Services',
  '90791': 'Psychiatric Diagnostic Evaluation',
  '96127': 'Brief Behavioral Assessment',
  '90837': 'Psychotherapy, 60 min',
  '90834': 'Psychotherapy, 45 min',
  '90832': 'Psychotherapy, 30 min',
  '90833': 'Psychotherapy Add-On (Interactive Complexity)',
  '90853': 'Group Psychotherapy',
  '99202': 'New Patient, Straightforward',
  '99203': 'New Patient, Low Complexity',
  '99204': 'New Patient, Moderate Complexity',
  '99205': 'New Patient, High Complexity',
};

const CAT_STYLE = {
  Modifier:       { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Authorization:  { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  Documentation:  { bg: '#f3e8ff', color: '#6d28d9', border: '#c4b5fd' },
  Coverage:       { bg: '#ecfdf5', color: '#065f46', border: '#6ee7b7' },
  Bundling:       { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
  'Filing Limit': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
};

const SEV_ICON  = { error: '⛔', warning: '⚠️', info: 'ℹ️' };
const SEV_COLOR = { error: '#dc2626', warning: '#d97706', info: '#0284c7' };
const SEV_BG    = { error: '#fef2f2', warning: '#fef3c7', info: '#eff6ff' };

// ─── Live scrubber (mirrors ClaimsManagement logic + extra rules) ──────────────
function runFullScrubber(cptCodes, icdCodes, payer, rules) {
  const results = [];
  const isEM    = (c) => ['99213','99214','99215','99202','99203','99204','99205'].includes(c);
  const isPsy   = (c) => ['90837','90834','90832','90853'].includes(c);
  const hasEM   = cptCodes.some(isEM);
  const hasPsy  = cptCodes.some(isPsy);

  // MOD-25
  if (rules.find(r => r.code === 'MOD-25' && r.enabled) && hasEM && hasPsy)
    results.push({ ruleCode: 'MOD-25', level: 'error', msg: 'Modifier 25 required: E&M billed same-day as psychotherapy.' });

  // MOD-25-BCBS
  if (rules.find(r => r.code === 'MOD-25-BCBS' && r.enabled) && payer === 'Blue Cross Blue Shield' && (hasEM) && cptCodes.includes('90833'))
    results.push({ ruleCode: 'MOD-25-BCBS', level: 'error', msg: 'BCBS: Modifier 25 required on E&M when 90833 is billed same-day.' });

  // MOD-95-AET
  if (rules.find(r => r.code === 'MOD-95-AET' && r.enabled) && payer === 'Aetna')
    results.push({ ruleCode: 'MOD-95-AET', level: 'warning', msg: 'Aetna: If telehealth, Modifier 95 required — verify POS 02/10.' });

  // MOD-GP-MCR
  if (rules.find(r => r.code === 'MOD-GP-MCR' && r.enabled) && payer === 'Medicare Part B' && cptCodes.some(c => ['90837','90834','90832'].includes(c)))
    results.push({ ruleCode: 'MOD-GP-MCR', level: 'info', msg: 'Medicare: append Modifier GP or GN for therapy service plan documentation.' });

  // AUTH-ANTHEM-EVAL
  if (rules.find(r => r.code === 'AUTH-ANTHEM-EVAL' && r.enabled) && payer === 'Anthem' && (cptCodes.includes('90791') || cptCodes.includes('90792')))
    results.push({ ruleCode: 'AUTH-ANTHEM-EVAL', level: 'error', msg: 'Anthem: prior authorization required for 90791/90792 before submitting.' });

  // AUTH-UHC-TXPLAN
  if (rules.find(r => r.code === 'AUTH-UHC-TXPLAN' && r.enabled) && payer === 'UnitedHealthcare' && hasPsy)
    results.push({ ruleCode: 'AUTH-UHC-TXPLAN', level: 'warning', msg: 'UHC: treatment plan on file required for ongoing psychotherapy beyond session 8.' });

  // DOC-NODIAG
  if (rules.find(r => r.code === 'DOC-NODIAG' && r.enabled) && (!icdCodes || icdCodes.length === 0))
    results.push({ ruleCode: 'DOC-NODIAG', level: 'error', msg: 'No ICD-10 code provided — required for all claim submissions.' });

  // DOC-UHC-99215
  if (rules.find(r => r.code === 'DOC-UHC-99215' && r.enabled) && payer === 'UnitedHealthcare' && cptCodes.includes('99215'))
    results.push({ ruleCode: 'DOC-UHC-99215', level: 'warning', msg: 'UHC: documented time must appear in note to support 99215.' });

  // DOC-99215-DIAG
  if (rules.find(r => r.code === 'DOC-99215-DIAG' && r.enabled) && cptCodes.includes('99215') && (!icdCodes || icdCodes.length < 2))
    results.push({ ruleCode: 'DOC-99215-DIAG', level: 'warning', msg: 'High-complexity E&M (99215): ensure ≥2 supporting diagnoses are documented.' });

  // DOC-NEWPT
  if (rules.find(r => r.code === 'DOC-NEWPT' && r.enabled) && cptCodes.some(c => ['99202','99203','99204','99205'].includes(c)))
    results.push({ ruleCode: 'DOC-NEWPT', level: 'info', msg: 'New patient E&M requires documented history, physical exam, and medical decision making.' });

  // COV-MCR-NPI
  if (rules.find(r => r.code === 'COV-MCR-NPI' && r.enabled) && payer === 'Medicare Part B')
    results.push({ ruleCode: 'COV-MCR-NPI', level: 'info', msg: 'Medicare: confirm rendering provider NPI and Place of Service on claim.' });

  // BNDL-90833
  if (rules.find(r => r.code === 'BNDL-90833' && r.enabled) && cptCodes.includes('90833') && !hasEM)
    results.push({ ruleCode: 'BNDL-90833', level: 'error', msg: 'CPT 90833 is an add-on code — must be billed with a primary E&M code.' });

  // BNDL-EVAL
  if (rules.find(r => r.code === 'BNDL-EVAL' && r.enabled) && cptCodes.includes('90791') && cptCodes.includes('90792'))
    results.push({ ruleCode: 'BNDL-EVAL', level: 'error', msg: '90791 and 90792 cannot both be billed on the same date of service.' });

  // BNDL-96127
  if (rules.find(r => r.code === 'BNDL-96127' && r.enabled) && cptCodes.includes('96127') && hasEM)
    results.push({ ruleCode: 'BNDL-96127', level: 'warning', msg: '96127 may be bundled with E&M by some payers — verify payer policy before submitting.' });

  return results;
}

// ─── New Rule Modal ───────────────────────────────────────────────────────────
function NewRuleModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    category: 'Documentation',
    severity: 'warning',
    payer: 'All',
    description: '',
    trigger: '',
    code: '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const canSave = form.description.trim() && form.trigger.trim() && form.code.trim();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 540 }}>
        <div className="modal-header">
          <h3>➕ Create Custom Rule</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Category *</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="form-input">
                {['Modifier','Authorization','Documentation','Coverage','Bundling','Filing Limit'].map(c =>
                  <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Severity *</label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)} className="form-input">
                <option value="error">⛔ Error</option>
                <option value="warning">⚠️ Warning</option>
                <option value="info">ℹ️ Info</option>
              </select>
            </div>
            <div>
              <label className="form-label">Payer Scope *</label>
              <select value={form.payer} onChange={e => set('payer', e.target.value)} className="form-input">
                {PAYERS.filter(p => p !== 'All Payers').map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Rule Code *</label>
              <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} className="form-input" placeholder="e.g. CUSTOM-001" style={{ fontFamily: 'monospace' }} />
            </div>
          </div>
          <div>
            <label className="form-label">Trigger Condition *</label>
            <input value={form.trigger} onChange={e => set('trigger', e.target.value)} className="form-input" placeholder="e.g. 99215 + missing HPI documentation" />
          </div>
          <div>
            <label className="form-label">Rule Description *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} className="form-input" rows={3} placeholder="Describe what this rule checks and what action is required..." style={{ resize: 'vertical' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!canSave} onClick={() => {
            onSave({ ...form, id: 'r-custom-' + Date.now(), enabled: true, editable: true, hitCount: 0 });
            onClose();
          }}>Save Rule</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Rule Modal ──────────────────────────────────────────────────────────
function EditRuleModal({ rule, onClose, onSave }) {
  const [form, setForm] = useState({ ...rule });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 540 }}>
        <div className="modal-header">
          <h3>✏️ Edit Rule — <code style={{ fontSize: 12 }}>{rule.code}</code></h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="form-input">
                {['Modifier','Authorization','Documentation','Coverage','Bundling','Filing Limit'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Severity</label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)} className="form-input">
                <option value="error">⛔ Error</option>
                <option value="warning">⚠️ Warning</option>
                <option value="info">ℹ️ Info</option>
              </select>
            </div>
            <div>
              <label className="form-label">Payer Scope</label>
              <select value={form.payer} onChange={e => set('payer', e.target.value)} className="form-input">
                {PAYERS.filter(p => p !== 'All Payers').map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Trigger Condition</label>
            <input value={form.trigger} onChange={e => set('trigger', e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="form-label">Rule Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} className="form-input" rows={3} style={{ resize: 'vertical' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onSave(form); onClose(); }}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ScrubberRulesEngine() {
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [catFilter, setCatFilter] = useState('All Categories');
  const [payerFilter, setPayerFilter] = useState('All Payers');
  const [sevFilter, setSevFilter] = useState('All Severities');
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [toast, setToast] = useState(null);

  // ── Live test panel state ──────────────────────────────────────────────────
  const [testPayer, setTestPayer] = useState('Blue Cross Blue Shield');
  const [testCpts, setTestCpts] = useState([]);
  const [testIcds, setTestIcds] = useState('F33.1');
  const [testResult, setTestResult] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const toggleCpt = (code) => setTestCpts(prev =>
    prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
  );

  const runTest = () => {
    const icdList = testIcds.split(',').map(s => s.trim()).filter(Boolean);
    const results = runFullScrubber(testCpts, icdList, testPayer, rules);
    setTestResult({ payer: testPayer, cpts: testCpts, icds: icdList, results, ranAt: new Date().toLocaleTimeString() });
  };

  const filteredRules = useMemo(() => rules.filter(r => {
    if (catFilter !== 'All Categories' && r.category !== catFilter) return false;
    if (payerFilter !== 'All Payers' && r.payer !== payerFilter) return false;
    if (sevFilter !== 'All Severities' && r.severity !== sevFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.description.toLowerCase().includes(q) &&
          !r.code.toLowerCase().includes(q) &&
          !r.trigger.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [rules, catFilter, payerFilter, sevFilter, search]);

  const stats = useMemo(() => ({
    total: rules.length,
    enabled: rules.filter(r => r.enabled).length,
    errors: rules.filter(r => r.severity === 'error').length,
    warnings: rules.filter(r => r.severity === 'warning').length,
    totalHits: rules.reduce((s, r) => s + (r.hitCount || 0), 0),
    byCategory: CATEGORIES.slice(1).map(c => ({ cat: c, count: rules.filter(r => r.category === c).length })),
  }), [rules]);

  const toggleRule = (id) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    const r = rules.find(x => x.id === id);
    showToast(`Rule ${r?.code} ${r?.enabled ? 'disabled' : 'enabled'}.`, 'info');
  };

  const saveNew = (newRule) => {
    setRules(prev => [...prev, newRule]);
    showToast(`Custom rule "${newRule.code}" created.`);
  };

  const saveEdit = (updated) => {
    setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
    showToast(`Rule "${updated.code}" updated.`);
  };

  const deleteRule = (id) => {
    const r = rules.find(x => x.id === id);
    if (!window.confirm(`Delete rule "${r?.code}"? This cannot be undone.`)) return;
    setRules(prev => prev.filter(x => x.id !== id));
    showToast(`Rule "${r?.code}" deleted.`, 'info');
  };

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'info' ? '#0284c7' : '#059669', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', maxWidth: 420 }}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🔍 Scrubber Rules Engine</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Manage claim validation rules, test code combinations, and build custom rules</p>
        </div>
        <button className="btn btn-primary" style={{ fontSize: 13, fontWeight: 700 }} onClick={() => setShowNewModal(true)}>
          ➕ New Rule
        </button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Rules', value: stats.total, accent: '#6366f1' },
          { label: 'Enabled', value: stats.enabled, accent: '#10b981' },
          { label: 'Disabled', value: stats.total - stats.enabled, accent: '#6b7280' },
          { label: 'Error Rules', value: stats.errors, accent: '#ef4444' },
          { label: 'Warning Rules', value: stats.warnings, accent: '#f59e0b' },
          { label: 'Lifetime Hits', value: stats.totalHits, accent: '#3b82f6', sub: 'YTD' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', borderLeft: '4px solid ' + s.accent }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Category distribution bar ───────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Rules by Category</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {stats.byCategory.map(({ cat, count }) => {
            const cs = CAT_STYLE[cat] || { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
            return (
              <button key={cat}
                onClick={() => setCatFilter(catFilter === cat ? 'All Categories' : cat)}
                style={{ background: catFilter === cat ? cs.color : cs.bg, color: catFilter === cat ? '#fff' : cs.color, border: '1px solid ' + cs.border, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                {cat} <span style={{ opacity: 0.8, fontWeight: 600 }}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Live Test Panel ─────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)', borderRadius: 14, padding: '18px 20px', marginBottom: '1.25rem', color: '#fff' }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>🧪 Live Claim Tester</div>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 200px auto', gap: 12, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.8, marginBottom: 5 }}>Payer</div>
            <select value={testPayer} onChange={e => { setTestPayer(e.target.value); setTestResult(null); }}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer' }}>
              {PAYER_TEST_OPTIONS.map(p => <option key={p} value={p} style={{ color: '#000' }}>{p}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.8, marginBottom: 5 }}>CPT Codes (select one or more)</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CPT_OPTIONS.map(code => (
                <button key={code} onClick={() => { toggleCpt(code); setTestResult(null); }}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.35)', background: testCpts.includes(code) ? '#fff' : 'rgba(255,255,255,0.1)', color: testCpts.includes(code) ? '#1d4ed8' : '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.1s' }}>
                  {code}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.8, marginBottom: 5 }}>ICD-10 Codes (comma-separated)</div>
            <input value={testIcds} onChange={e => { setTestIcds(e.target.value); setTestResult(null); }}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.35)', fontSize: 12, background: 'rgba(255,255,255,0.15)', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
              placeholder="F33.1, F41.1" />
          </div>
          <button onClick={runTest} disabled={testCpts.length === 0}
            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: testCpts.length === 0 ? 'rgba(255,255,255,0.2)' : '#fff', color: testCpts.length === 0 ? 'rgba(255,255,255,0.5)' : '#1d4ed8', fontWeight: 800, fontSize: 13, cursor: testCpts.length === 0 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
            Run Scrubber ▶
          </button>
        </div>

        {testResult && (
          <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                Results for {testResult.payer} · CPT: {testResult.cpts.join(', ')} · ICD: {testResult.icds.join(', ')}
              </div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Ran at {testResult.ranAt}</div>
            </div>
            {testResult.results.length === 0 ? (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(16,185,129,0.5)', fontWeight: 700, fontSize: 13 }}>
                ✅ Clean — no scrubber rules triggered for this combination.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {testResult.results.map((r, i) => (
                  <div key={i} style={{ padding: '10px 14px', borderRadius: 8, background: r.level === 'error' ? 'rgba(239,68,68,0.25)' : r.level === 'warning' ? 'rgba(245,158,11,0.25)' : 'rgba(59,130,246,0.25)', border: '1px solid ' + (r.level === 'error' ? 'rgba(239,68,68,0.5)' : r.level === 'warning' ? 'rgba(245,158,11,0.5)' : 'rgba(59,130,246,0.5)') }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{SEV_ICON[r.level]}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: 4 }}>{r.level}</span>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', opacity: 0.8 }}>{r.ruleCode}</span>
                    </div>
                    <div style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>{r.msg}</div>
                  </div>
                ))}
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>
                  {testResult.results.filter(r => r.level === 'error').length} error(s) · {testResult.results.filter(r => r.level === 'warning').length} warning(s) · {testResult.results.filter(r => r.level === 'info').length} info — {testResult.results.some(r => r.level === 'error') ? 'resolve errors before submitting.' : 'claim may proceed with caution.'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, 160px) 80px', gap: 10, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Search Rules</div>
            <input className="form-input" placeholder="Code, description, trigger…" value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 13 }} />
          </div>
          <div>
            <label className="form-label">Category</label>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="form-input" style={{ fontSize: 12 }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Payer</label>
            <select value={payerFilter} onChange={e => setPayerFilter(e.target.value)} className="form-input" style={{ fontSize: 12 }}>
              {PAYERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Severity</label>
            <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} className="form-input" style={{ fontSize: 12 }}>
              {SEVERITIES.map(s => <option key={s} value={s}>{s === 'All Severities' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <button onClick={() => { setSearch(''); setCatFilter('All Categories'); setPayerFilter('All Payers'); setSevFilter('All Severities'); }}
            className="btn btn-secondary" style={{ height: 38, fontSize: 12 }}>
            Clear
          </button>
        </div>
      </div>

      {/* ── Rules Table ─────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Rules Library ({filteredRules.length})</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rules.filter(r => r.enabled).length} of {rules.length} rules active</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', background: '#f8fafc' }}>
                {['On/Off', 'Code', 'Category', 'Severity', 'Payer Scope', 'Description', 'Trigger', 'Hits', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Hits' ? 'right' : 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRules.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32 }}>🔍</div>
                  <p style={{ margin: '8px 0 0' }}>No rules match your filters.</p>
                </td></tr>
              ) : filteredRules.map((rule, i) => {
                const cs = CAT_STYLE[rule.category] || { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
                return (
                  <tr key={rule.id} style={{ borderBottom: '1px solid var(--border)', background: !rule.enabled ? '#f9fafb' : i % 2 === 1 ? '#fafafa' : '#fff', opacity: rule.enabled ? 1 : 0.55 }}>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => toggleRule(rule.id)}
                        style={{ width: 36, height: 20, borderRadius: 10, border: 'none', background: rule.enabled ? '#10b981' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                        title={rule.enabled ? 'Disable rule' : 'Enable rule'}>
                        <span style={{ position: 'absolute', top: 2, left: rule.enabled ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                      </button>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <code style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, color: '#475569', fontWeight: 700 }}>{rule.code}</code>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: cs.bg, color: cs.color, border: '1px solid ' + cs.border, padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{rule.category}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: SEV_COLOR[rule.severity], fontWeight: 700, fontSize: 12 }}>
                        {SEV_ICON[rule.severity]} {rule.severity.charAt(0).toUpperCase() + rule.severity.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 11, color: rule.payer === 'All' ? '#6b7280' : '#1e293b', fontWeight: rule.payer === 'All' ? 400 : 600 }}>
                        {rule.payer === 'All' ? 'All Payers' : rule.payer}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: 280 }}>
                      <div style={{ fontSize: 12, color: '#1e293b', lineHeight: 1.4 }}>{rule.description}</div>
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: 180 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{rule.trigger}</span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: rule.hitCount > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                      {rule.hitCount}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {rule.editable && (
                          <button onClick={() => setEditRule(rule)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}>Edit</button>
                        )}
                        {rule.editable && (
                          <button onClick={() => deleteRule(rule.id)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: 'none', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                        )}
                        {!rule.editable && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>System</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showNewModal && <NewRuleModal onClose={() => setShowNewModal(false)} onSave={saveNew} />}
      {editRule && <EditRuleModal rule={editRule} onClose={() => setEditRule(null)} onSave={saveEdit} />}
    </div>
  );
}
