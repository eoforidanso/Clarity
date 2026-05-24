import React, { useState, useMemo, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const REASON_CATEGORIES = ['Coding', 'Eligibility', 'Timely Filing', 'Authorization', 'Duplicate', 'Medical Necessity', 'Documentation'];

const ASSIGNED_STAFF = ['Sandra Williams', 'Chris Lee', 'April Torres', 'Joseph Park', 'Unassigned'];

const PAYER_PATTERNS = {
  'Blue Cross Blue Shield': {
    topReasons: ['CO-4 Modifier mismatch', 'CO-97 Payment included in primary', 'PR-1 Deductible'],
    tips: 'BCBS commonly denies 90833/90834 add-ons without modifier 25 on the E&M. Always attach a clear 2-step note and cite MDM time.',
    appealWindow: 90,
  },
  'Aetna': {
    topReasons: ['CO-11 Diagnosis inconsistent', 'CO-29 Timely filing', 'PR-96 Non-covered service'],
    tips: 'Aetna requires prior auth for 90791 and telehealth 95 modifier. Submit appeals via Availity with clinical notes attached.',
    appealWindow: 60,
  },
  'UnitedHealthcare': {
    topReasons: ['CO-167 Diagnosis not covered', 'CO-4 Modifier required', 'CO-197 Pre-certification required'],
    tips: 'UHC denies psychotherapy without documented medical necessity. Include GAD-7 / PHQ-9 scores in appeal packets.',
    appealWindow: 60,
  },
  'Cigna': {
    topReasons: ['CO-50 Not medically necessary', 'CO-119 Max benefits reached', 'CO-4 Modifier'],
    tips: 'Cigna requires bundled modifiers for same-day E&M + therapy. Use modifier 59 or XE and include session notes.',
    appealWindow: 90,
  },
  'Medicare Part B': {
    topReasons: ['CO-4 Modifier', 'CO-109 Claim not covered by plan', 'CO-22 Coordination of benefits'],
    tips: 'Medicare uses Noridian/Novitas EDI. Appeals must cite LCD for psychiatric CPTs. Submit Redetermination within 120 days.',
    appealWindow: 120,
  },
  'Anthem': {
    topReasons: ['CO-4 Modifier 25 documentation', 'CO-49 Limit exceeded', 'CO-29 Timely filing'],
    tips: 'Anthem requires detailed session notes for therapy codes. 90837 needs explicit time documentation.',
    appealWindow: 90,
  },
};

const APPEAL_TEMPLATES = {
  'Coding': {
    subject: 'Appeal: Coding / Modifier Error',
    letter: (d) => `To Whom It May Concern,\n\nWe are writing to appeal the denial of Claim #${d.claimNumber} for patient ${d.patientName} (DOS: ${d.dos}).\n\nDenial Reason: ${d.denialReason} (${d.denialCode})\n\nThis denial appears to be the result of a coding or modifier discrepancy. We have reviewed the original claim and believe the services were billed correctly per CMS and AMA guidelines.\n\nSpecifically:\n• The procedure code(s) billed are supported by the clinical documentation attached hereto.\n• Any modifiers used reflect the actual clinical circumstances of the encounter.\n• The ICD-10-CM diagnosis code(s) are consistent with the treating provider's clinical findings.\n\nPlease find enclosed:\n  1. Complete clinical notes for the date of service\n  2. Corrected CMS-1500 claim form (if applicable)\n  3. Relevant coding guideline references\n\nWe respectfully request reconsideration and reprocessing of this claim.\n\nSincerely,\nClarity Behavioral Health — Billing Department`,
  },
  'Eligibility': {
    subject: 'Appeal: Eligibility Verification',
    letter: (d) => `To Whom It May Concern,\n\nWe are appealing the denial of Claim #${d.claimNumber} for patient ${d.patientName} dated ${d.dos} on eligibility grounds.\n\nDenial Code: ${d.denialCode}\n\nWe verified patient eligibility via your provider portal on the date of service and confirmed active coverage. A screenshot of the eligibility response is attached.\n\nEnclosed documentation:\n  1. Eligibility verification confirmation (Date: ${d.dos})\n  2. Copy of patient insurance card on file\n  3. Pre-authorization confirmation (if applicable)\n\nWe request immediate reprocessing of this claim.`,
  },
  'Timely Filing': {
    subject: 'Appeal: Timely Filing — Supporting Documentation',
    letter: (d) => `To Whom It May Concern,\n\nThis letter serves as an appeal for Claim #${d.claimNumber} denied for timely filing (${d.denialCode}).\n\nWe respectfully dispute this denial and submit the following evidence that the claim was filed within the contractual timely filing period:\n\n  1. Original claim submission confirmation / clearinghouse acknowledgement (attached)\n  2. EDI 277 acknowledgement showing claim received by payer\n  3. Any prior payment history demonstrating ongoing active provider relationship\n\nPer our records, the claim was submitted on or before the required deadline. We request you review the attached evidence and reprocess accordingly.`,
  },
  'Authorization': {
    subject: 'Appeal: Prior Authorization / Medical Necessity',
    letter: (d) => `To Whom It May Concern,\n\nWe are appealing Claim #${d.claimNumber} for ${d.patientName} (DOS: ${d.dos}) denied for lack of prior authorization.\n\nClinical Summary:\nThe treating provider determined that the service rendered was medically necessary. The clinical documentation included herein establishes:\n  • Patient diagnosis consistent with covered services\n  • Treatment plan aligned with evidence-based clinical guidelines\n  • Documented patient presentation requiring the level of care billed\n\nIf a prior authorization was overlooked in error, we request a retroactive authorization review based on the medical necessity documentation attached.\n\nEnclosed: Clinical notes, DSM-5 diagnosis summary, treatment plan, and provider attestation.`,
  },
  'Duplicate': {
    subject: 'Appeal: Duplicate Claim Denial',
    letter: (d) => `To Whom It May Concern,\n\nWe are writing regarding Claim #${d.claimNumber} denied as a duplicate (${d.denialCode}).\n\nUpon review, we believe this denial was made in error. The referenced claim represents a unique encounter and should not be classified as a duplicate based on the following:\n\n  • The date of service, CPT code, and provider differ from any previously adjudicated claim\n  • Attached is the original claim with unique encounter details\n  • No duplicate service was rendered\n\nPlease review and reprocess this claim separately from any prior submission.`,
  },
  'Medical Necessity': {
    subject: 'Appeal: Medical Necessity Documentation',
    letter: (d) => `To Whom It May Concern,\n\nThis letter is a formal appeal of the medical necessity denial for Claim #${d.claimNumber}, patient ${d.patientName} (DOS: ${d.dos}).\n\nThe treating provider has documented clear medical necessity for the services rendered. Supporting evidence includes:\n\n  1. PHQ-9 / GAD-7 screening scores demonstrating clinical acuity\n  2. DSM-5 diagnosis and treatment plan\n  3. Progress notes documenting patient response and ongoing need\n  4. Provider clinical attestation of medical necessity\n\nWe request a peer-to-peer clinical review if additional information is required. Please contact our Medical Director at billing@clarity-ehr.org.`,
  },
  'Documentation': {
    subject: 'Appeal: Missing / Insufficient Documentation',
    letter: (d) => `To Whom It May Concern,\n\nWe are appealing Claim #${d.claimNumber} denied for insufficient documentation (${d.denialCode}).\n\nEnclosed is a complete supplemental documentation packet including:\n  1. Full clinical notes for the date of service\n  2. Signed provider attestation\n  3. Referral documentation (if applicable)\n  4. Updated CMS-1500 with all required fields completed\n\nWe believe this additional documentation fully supports the services billed and request reprocessing of the claim.`,
  },
};

const PRIORITY_STYLES = {
  urgent: { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444', border: '#fca5a5' },
  high:   { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b', border: '#fde68a' },
  medium: { bg: '#eff6ff', color: '#1e40af', dot: '#3b82f6', border: '#bfdbfe' },
  low:    { bg: '#f0fdf4', color: '#166534', dot: '#22c55e', border: '#bbf7d0' },
};

const STATUS_STYLES = {
  pending:   { bg: '#eff6ff', color: '#1e40af', label: 'Pending' },
  appealing: { bg: '#fef3c7', color: '#92400e', label: 'In Appeal' },
  resolved:  { bg: '#f0fdf4', color: '#166534', label: 'Resolved' },
  closed:    { bg: '#f3f4f6', color: '#6b7280', label: 'Closed' },
};

// ─── Mock Data ─────────────────────────────────────────────────────────────────

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const TODAY = '2026-05-23';

const MOCK_DENIALS = [
  { id: 'd-1', claimNumber: 'CLM-2026-0441', patientName: 'James Anderson', mrn: 'MRN-00001', dos: '2026-04-14', denialDate: '2026-04-22', appealDeadline: addDays('2026-04-22', 90), denialCode: 'CO-4', denialReason: 'Modifier 25 required on E&M when billed same-day as psychotherapy', reasonCategory: 'Coding', amount: 260.00, priority: 'high', status: 'pending', payer: 'Blue Cross Blue Shield', assignedTo: 'Sandra Williams', cptCodes: ['99214', '90833'], icdCodes: ['F33.1'], provider: 'Dr. Chris Lee', notes: '' },
  { id: 'd-2', claimNumber: 'CLM-2026-0438', patientName: 'Maria Garcia', mrn: 'MRN-00002', dos: '2026-04-14', denialDate: '2026-04-21', appealDeadline: addDays('2026-04-21', 60), denialCode: 'CO-29', denialReason: 'Timely filing limit exceeded — claim submitted after 90-day window', reasonCategory: 'Timely Filing', amount: 207.00, priority: 'urgent', status: 'pending', payer: 'Aetna', assignedTo: 'Sandra Williams', cptCodes: ['90837', '96127'], icdCodes: ['F41.1'], provider: 'April Torres, LCSW', notes: '' },
  { id: 'd-3', claimNumber: 'CLM-2026-0419', patientName: 'Aisha Patel', mrn: 'MRN-00006', dos: '2026-04-12', denialDate: '2026-04-20', appealDeadline: addDays('2026-04-20', 90), denialCode: 'CO-197', denialReason: 'Prior authorization required — 90791 diagnostic evaluation not pre-authorized', reasonCategory: 'Authorization', amount: 275.00, priority: 'high', status: 'appealing', payer: 'Anthem', assignedTo: 'Chris Lee', cptCodes: ['90791'], icdCodes: ['F31.31'], provider: 'Dr. Chris Lee', notes: 'Peer-to-peer review requested 2026-04-28. Awaiting callback from Anthem UM.' },
  { id: 'd-4', claimNumber: 'CLM-2026-0402', patientName: 'Robert Wilson', mrn: 'MRN-00005', dos: '2026-04-11', denialDate: '2026-04-19', appealDeadline: addDays('2026-04-19', 120), denialCode: 'CO-50', denialReason: 'Service not medically necessary per Medicare LCD for psychiatric services', reasonCategory: 'Medical Necessity', amount: 225.00, priority: 'urgent', status: 'pending', payer: 'Medicare Part B', assignedTo: 'Unassigned', cptCodes: ['99215'], icdCodes: ['F32.2'], provider: 'Dr. Chris Lee', notes: '' },
  { id: 'd-5', claimNumber: 'CLM-2026-0388', patientName: 'Emily Chen', mrn: 'MRN-00004', dos: '2026-04-13', denialDate: '2026-04-18', appealDeadline: addDays('2026-04-18', 90), denialCode: 'CO-11', denialReason: 'Diagnosis code inconsistent with procedure — F90.2 not linked to 99214', reasonCategory: 'Coding', amount: 175.00, priority: 'medium', status: 'appealing', payer: 'Cigna', assignedTo: 'April Torres', cptCodes: ['99214'], icdCodes: ['F90.2', 'F41.1'], provider: 'Joseph Park', notes: 'Resubmitted with corrected diagnosis linkage on 2026-04-25.' },
  { id: 'd-6', claimNumber: 'CLM-2026-0371', patientName: 'James Anderson', mrn: 'MRN-00001', dos: '2026-03-28', denialDate: '2026-04-05', appealDeadline: addDays('2026-04-05', 90), denialCode: 'CO-4', denialReason: 'Duplicate claim — identical DOS and CPT billed within 7-day window', reasonCategory: 'Duplicate', amount: 175.00, priority: 'low', status: 'resolved', payer: 'Blue Cross Blue Shield', assignedTo: 'Sandra Williams', cptCodes: ['99214'], icdCodes: ['F33.1'], provider: 'Dr. Chris Lee', notes: 'Confirmed duplicate — original claim CLM-2026-0339 was paid. Closed.' },
  { id: 'd-7', claimNumber: 'CLM-2026-0355', patientName: 'Sophia Martinez', mrn: 'MRN-00009', dos: '2026-03-20', denialDate: '2026-03-28', appealDeadline: addDays('2026-03-28', 60), denialCode: 'CO-97', denialReason: 'Member ID not found — subscriber not active on date of service', reasonCategory: 'Eligibility', amount: 195.00, priority: 'high', status: 'pending', payer: 'Aetna', assignedTo: 'Sandra Williams', cptCodes: ['90837'], icdCodes: ['F43.10'], provider: 'April Torres, LCSW', notes: '' },
  { id: 'd-8', claimNumber: 'CLM-2026-0341', patientName: 'Michael Brown', mrn: 'MRN-00007', dos: '2026-03-15', denialDate: '2026-03-22', appealDeadline: addDays('2026-03-22', 90), denialCode: 'CO-167', denialReason: 'Diagnosis not on covered diagnosis list for this benefit plan', reasonCategory: 'Medical Necessity', amount: 130.00, priority: 'medium', status: 'closed', payer: 'UnitedHealthcare', assignedTo: 'Chris Lee', cptCodes: ['99213'], icdCodes: ['F41.0'], provider: 'Dr. Chris Lee', notes: 'Appeal unsuccessful. Patient notified for self-pay.' },
  { id: 'd-9', claimNumber: 'CLM-2026-0318', patientName: 'Dorothy Wilson', mrn: 'MRN-00008', dos: '2026-03-10', denialDate: '2026-03-18', appealDeadline: addDays('2026-03-18', 90), denialCode: 'PR-96', denialReason: 'Documentation insufficient — session notes do not support 53+ min psychotherapy', reasonCategory: 'Documentation', amount: 195.00, priority: 'high', status: 'appealing', payer: 'UnitedHealthcare', assignedTo: 'Sandra Williams', cptCodes: ['90837'], icdCodes: ['F33.2'], provider: 'April Torres, LCSW', notes: 'Full session notes resubmitted with time attestation on 2026-03-25.' },
  { id: 'd-10', claimNumber: 'CLM-2026-0299', patientName: 'Carlos Rivera', mrn: 'MRN-00010', dos: '2026-03-05', denialDate: '2026-03-12', appealDeadline: addDays('2026-03-12', 60), denialCode: 'CO-119', denialReason: 'Maximum benefit for outpatient mental health reached for plan year', reasonCategory: 'Eligibility', amount: 207.00, priority: 'medium', status: 'resolved', payer: 'Cigna', assignedTo: 'April Torres', cptCodes: ['90837'], icdCodes: ['F43.10'], provider: 'April Torres, LCSW', notes: 'Patient switched to self-pay rate. Balance collected.' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date(TODAY)) / 86400000);
}

function daysOpenFn(denialDate) {
  return Math.ceil((new Date(TODAY) - new Date(denialDate)) / 86400000);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(n) {
  return '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function deadlineUrgency(dateStr) {
  const d = daysUntil(dateStr);
  if (d === null) return null;
  if (d < 0) return 'overdue';
  if (d <= 14) return 'critical';
  if (d <= 30) return 'warning';
  return 'ok';
}

function copyToClipboard(text) {
  navigator.clipboard && navigator.clipboard.writeText(text).catch(() => {});
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriorityChip({ priority }) {
  const s = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: s.bg, color: s.color, border: '1px solid ' + s.border, textTransform: 'uppercase' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot }} />
      {priority}
    </span>
  );
}

function StatusChip({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function DeadlineCell({ dateStr, status }) {
  if (status === 'resolved' || status === 'closed') return <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span>;
  const d = daysUntil(dateStr);
  const urg = deadlineUrgency(dateStr);
  const styleMap = {
    overdue:  { color: '#dc2626', fontWeight: 800 },
    critical: { color: '#d97706', fontWeight: 700 },
    warning:  { color: '#0284c7', fontWeight: 600 },
    ok:       { color: '#374151', fontWeight: 500 },
  };
  const st = styleMap[urg] || styleMap.ok;
  return (
    <span style={{ fontSize: 11, ...st }}>
      {fmtDate(dateStr)}
      {urg === 'overdue'  && <div style={{ fontSize: 9, color: '#dc2626' }}>OVERDUE</div>}
      {urg === 'critical' && <div style={{ fontSize: 9, color: '#d97706' }}>{d}d left</div>}
      {urg === 'warning'  && <div style={{ fontSize: 9, color: '#0284c7' }}>{d}d left</div>}
    </span>
  );
}

function DenialTableHead({ onSelectAll, allSelected, someSelected }) {
  return (
    <thead>
      <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
        <th style={{ padding: '10px 12px', width: 36 }}>
          <input type="checkbox" checked={allSelected}
            ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
            onChange={onSelectAll}
            style={{ accentColor: 'var(--primary)', cursor: 'pointer' }} />
        </th>
        {['Claim #', 'Patient', 'DOS', 'Denial Reason', 'Category', 'Amount', 'Priority', 'Status', 'Appeal Deadline', 'Assigned To', 'Actions'].map(h => (
          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
        ))}
      </tr>
    </thead>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DenialManagement() {
  const [denials, setDenials] = useState(MOCK_DENIALS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterAssigned, setFilterAssigned] = useState('All');
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedDenial, setSelectedDenial] = useState(null);
  const [drawerTab, setDrawerTab] = useState('details');
  const [appealTemplate, setAppealTemplate] = useState('');
  const [appealLetter, setAppealLetter] = useState('');
  const [appealPriority, setAppealPriority] = useState('medium');
  const [bulkAssignTarget, setBulkAssignTarget] = useState('');
  const [toast, setToast] = useState(null);
  const [hovered, setHovered] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return denials.filter(d => {
      if (filterStatus !== 'All' && d.status !== filterStatus) return false;
      if (filterPriority !== 'All' && d.priority !== filterPriority) return false;
      if (filterCategory !== 'All' && d.reasonCategory !== filterCategory) return false;
      if (filterAssigned !== 'All' && d.assignedTo !== filterAssigned) return false;
      if (search) {
        const q = search.toLowerCase();
        return d.patientName.toLowerCase().includes(q) ||
          d.claimNumber.toLowerCase().includes(q) ||
          d.payer.toLowerCase().includes(q) ||
          d.denialReason.toLowerCase().includes(q);
      }
      return true;
    });
  }, [denials, filterStatus, filterPriority, filterCategory, filterAssigned, search]);

  const stats = useMemo(() => ({
    total: denials.length,
    atRisk: denials.filter(d => d.status === 'pending' || d.status === 'appealing').reduce((s, d) => s + d.amount, 0),
    overdue: denials.filter(d => daysUntil(d.appealDeadline) !== null && daysUntil(d.appealDeadline) < 0 && d.status === 'pending').length,
    thisWeek: denials.filter(d => daysOpenFn(d.denialDate) <= 7).length,
    resolved: denials.filter(d => d.status === 'resolved').length,
    recovered: denials.filter(d => d.status === 'resolved').reduce((s, d) => s + d.amount, 0),
  }), [denials]);

  const grouped = useMemo(() => {
    if (!groupByCategory) return null;
    const groups = {};
    for (const d of filtered) {
      if (!groups[d.reasonCategory]) groups[d.reasonCategory] = [];
      groups[d.reasonCategory].push(d);
    }
    return groups;
  }, [filtered, groupByCategory]);

  // ── Selection ─────────────────────────────────────────────────────────────

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(d => d.id)));
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const startAppeal = (denial) => {
    setSelectedDenial(denial);
    setDrawerTab('appeal');
    const cat = denial.reasonCategory;
    const tmpl = APPEAL_TEMPLATES[cat] || APPEAL_TEMPLATES['Coding'];
    setAppealTemplate(cat);
    setAppealLetter(tmpl.letter(denial));
    setAppealPriority(denial.priority === 'urgent' ? 'high' : denial.priority);
  };

  const loadTemplate = (category) => {
    if (!selectedDenial) return;
    const tmpl = APPEAL_TEMPLATES[category] || APPEAL_TEMPLATES['Coding'];
    setAppealTemplate(category);
    setAppealLetter(tmpl.letter(selectedDenial));
  };

  const submitAppeal = () => {
    setDenials(prev => prev.map(d => d.id === selectedDenial.id
      ? { ...d, status: 'appealing', notes: (d.notes ? d.notes + ' | ' : '') + 'Appeal submitted ' + TODAY + '.' }
      : d));
    showToast('📤 Appeal submitted for ' + selectedDenial.patientName + ' — ' + selectedDenial.claimNumber);
    setSelectedDenial(null);
  };

  const markResolved = (id) => {
    setDenials(prev => prev.map(d => d.id === id ? { ...d, status: 'resolved' } : d));
    showToast('✅ Denial marked as resolved');
  };

  const markResolvedBulk = () => {
    setDenials(prev => prev.map(d => selectedIds.has(d.id) ? { ...d, status: 'resolved' } : d));
    showToast('✅ ' + selectedIds.size + ' denial(s) marked resolved');
    setSelectedIds(new Set());
  };

  const assignBulk = () => {
    if (!bulkAssignTarget) return;
    setDenials(prev => prev.map(d => selectedIds.has(d.id) ? { ...d, assignedTo: bulkAssignTarget } : d));
    showToast('👤 ' + selectedIds.size + ' denial(s) assigned to ' + bulkAssignTarget);
    setSelectedIds(new Set());
    setBulkAssignTarget('');
  };

  const exportCSV = () => {
    const rows = filtered.filter(d => selectedIds.size === 0 || selectedIds.has(d.id));
    const header = ['Claim #', 'Patient', 'DOS', 'Denial Date', 'Appeal Deadline', 'Reason', 'Category', 'Amount', 'Priority', 'Status', 'Assigned To', 'Payer'];
    const csv = [header, ...rows.map(d => [
      d.claimNumber, d.patientName, d.dos, d.denialDate, d.appealDeadline,
      '"' + d.denialReason + '"', d.reasonCategory, d.amount, d.priority, d.status, d.assignedTo, d.payer,
    ])].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'denials-export.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('📥 CSV exported');
  };

  // ── Row renderer ──────────────────────────────────────────────────────────

  const renderRow = (denial) => {
    const isSelected = selectedIds.has(denial.id);
    const isHov = hovered === denial.id;
    const urg = deadlineUrgency(denial.appealDeadline);
    const rowBg = isSelected ? '#eff6ff' : isHov ? '#f9fafb' : (urg === 'overdue' && denial.status === 'pending') ? '#fff7f7' : '#fff';

    return (
      <tr key={denial.id}
        onMouseEnter={() => setHovered(denial.id)}
        onMouseLeave={() => setHovered(null)}
        style={{ background: rowBg, transition: 'background 0.12s', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
        <td style={{ padding: '10px 12px', width: 36 }} onClick={e => { e.stopPropagation(); toggleSelect(denial.id); }}>
          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(denial.id)} style={{ accentColor: 'var(--primary)', cursor: 'pointer' }} />
        </td>
        <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap' }} onClick={() => { setSelectedDenial(denial); setDrawerTab('details'); }}>
          {denial.claimNumber}
        </td>
        <td style={{ padding: '10px 12px' }} onClick={() => { setSelectedDenial(denial); setDrawerTab('details'); }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{denial.patientName}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{denial.mrn}</div>
        </td>
        <td style={{ padding: '10px 12px', fontSize: 12 }} onClick={() => { setSelectedDenial(denial); setDrawerTab('details'); }}>
          {fmtDate(denial.dos)}
        </td>
        <td style={{ padding: '10px 12px', maxWidth: 240 }} onClick={() => { setSelectedDenial(denial); setDrawerTab('details'); }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 2 }}>{denial.denialCode}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{denial.denialReason}</div>
        </td>
        <td style={{ padding: '10px 12px' }} onClick={() => { setSelectedDenial(denial); setDrawerTab('details'); }}>
          <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: '#f3f4f6', color: '#374151', fontWeight: 600, border: '1px solid #e5e7eb' }}>
            {denial.reasonCategory}
          </span>
        </td>
        <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: 13 }} onClick={() => { setSelectedDenial(denial); setDrawerTab('details'); }}>
          {fmtMoney(denial.amount)}
        </td>
        <td style={{ padding: '10px 12px' }} onClick={() => { setSelectedDenial(denial); setDrawerTab('details'); }}>
          <PriorityChip priority={denial.priority} />
        </td>
        <td style={{ padding: '10px 12px' }} onClick={() => { setSelectedDenial(denial); setDrawerTab('details'); }}>
          <StatusChip status={denial.status} />
        </td>
        <td style={{ padding: '10px 12px' }} onClick={() => { setSelectedDenial(denial); setDrawerTab('details'); }}>
          <DeadlineCell dateStr={denial.appealDeadline} status={denial.status} />
        </td>
        <td style={{ padding: '10px 12px', fontSize: 12 }} onClick={() => { setSelectedDenial(denial); setDrawerTab('details'); }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: denial.assignedTo === 'Unassigned' ? '#f3f4f6' : '#dbeafe', color: denial.assignedTo === 'Unassigned' ? '#9ca3af' : '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 9, flexShrink: 0 }}>
              {denial.assignedTo === 'Unassigned' ? '?' : denial.assignedTo.split(' ').map(w => w[0]).join('')}
            </span>
            <span style={{ fontSize: 11 }}>{denial.assignedTo}</span>
          </div>
        </td>
        <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: 4 }}>
            {denial.status === 'pending' && (
              <button onClick={() => startAppeal(denial)}
                style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ✍️ Start Appeal
              </button>
            )}
            {denial.status === 'appealing' && (
              <button onClick={() => markResolved(denial.id)}
                style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, background: '#059669', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                ✅ Resolve
              </button>
            )}
            <button onClick={() => { setSelectedDenial(denial); setDrawerTab('details'); }}
              style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontWeight: 600, cursor: 'pointer' }}>
              View
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>

      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'error' ? '#dc2626' : '#059669', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', maxWidth: 400 }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>⚠️ Denial Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Track denials, manage appeals, recover revenue — with payer-specific insights</p>
        </div>
        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: '1px solid var(--border)', background: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          📥 Export CSV
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '⚠️', value: stats.total, label: 'Total Denials', color: '#374151' },
          { icon: '💸', value: fmtMoney(stats.atRisk), label: 'At Risk ($)', color: '#dc2626' },
          { icon: '🕐', value: stats.overdue, label: 'Deadline Overdue', color: '#d97706' },
          { icon: '🆕', value: stats.thisWeek, label: 'This Week', color: '#0284c7' },
          { icon: '✅', value: stats.resolved, label: 'Resolved', color: '#059669' },
          { icon: '💰', value: fmtMoney(stats.recovered), label: 'Recovered', color: '#059669' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px' }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="form-input" placeholder="🔍 Search patient, claim, payer, reason…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, fontSize: 13 }} />
        {[
          { label: 'Status', value: filterStatus, onChange: setFilterStatus, options: ['All', 'pending', 'appealing', 'resolved', 'closed'] },
          { label: 'Priority', value: filterPriority, onChange: setFilterPriority, options: ['All', 'urgent', 'high', 'medium', 'low'] },
          { label: 'Category', value: filterCategory, onChange: setFilterCategory, options: ['All', ...REASON_CATEGORIES] },
          { label: 'Assigned To', value: filterAssigned, onChange: setFilterAssigned, options: ['All', ...ASSIGNED_STAFF] },
        ].map(f => (
          <select key={f.label} className="form-input" value={f.value} onChange={e => f.onChange(e.target.value)} style={{ fontSize: 12, padding: '6px 10px', minWidth: 130 }}>
            {f.options.map(o => <option key={o} value={o}>{o === 'All' ? f.label + ': All' : o}</option>)}
          </select>
        ))}
        <button onClick={() => setGroupByCategory(v => !v)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (groupByCategory ? 'var(--primary)' : 'var(--border)'), background: groupByCategory ? 'var(--primary-light)' : '#fff', color: groupByCategory ? 'var(--primary)' : 'var(--text-secondary)', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {groupByCategory ? '✦ Grouped' : '▤ Group by Category'}
        </button>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div style={{ background: '#1e40af', color: '#fff', borderRadius: 10, padding: '10px 16px', marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{selectedIds.size} selected</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={bulkAssignTarget} onChange={e => setBulkAssignTarget(e.target.value)}
              style={{ fontSize: 12, padding: '5px 10px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 7 }}>
              <option value="" style={{ color: '#000' }}>Assign to…</option>
              {ASSIGNED_STAFF.map(s => <option key={s} value={s} style={{ color: '#000' }}>{s}</option>)}
            </select>
            <button onClick={assignBulk} disabled={!bulkAssignTarget}
              style={{ padding: '5px 14px', borderRadius: 7, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
              👤 Assign
            </button>
          </div>
          <button onClick={markResolvedBulk}
            style={{ padding: '5px 14px', borderRadius: 7, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
            ✅ Mark Resolved
          </button>
          <button onClick={exportCSV}
            style={{ padding: '5px 14px', borderRadius: 7, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
            📥 Export Selected
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            style={{ padding: '5px 10px', borderRadius: 7, background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginLeft: 'auto' }}>
            ✕ Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        {groupByCategory && grouped ? (
          Object.entries(grouped).map(([cat, rows]) => (
            <div key={cat}>
              <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>{cat}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', background: '#e2e8f0', borderRadius: 10, padding: '1px 8px', fontWeight: 600 }}>{rows.length} denial{rows.length !== 1 ? 's' : ''}</span>
                <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, marginLeft: 4 }}>{fmtMoney(rows.reduce((s, d) => s + d.amount, 0))} at risk</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <DenialTableHead onSelectAll={selectAll} allSelected={selectedIds.size === filtered.length && filtered.length > 0} someSelected={selectedIds.size > 0 && selectedIds.size < filtered.length} />
                <tbody>{rows.map(d => renderRow(d))}</tbody>
              </table>
            </div>
          ))
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <DenialTableHead onSelectAll={selectAll} allSelected={selectedIds.size === filtered.length && filtered.length > 0} someSelected={selectedIds.size > 0 && selectedIds.size < filtered.length} />
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={12} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No denials match the current filters</td></tr>
                : filtered.map(d => renderRow(d))
              }
            </tbody>
          </table>
        )}
      </div>

      {/* Detail / Appeal drawer */}
      {selectedDenial && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedDenial(null); }}>
          <div style={{ width: 560, maxWidth: '95vw', height: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)' }}>

            {/* Drawer header */}
            <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #1e40af, #1d4ed8)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>{selectedDenial.claimNumber}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{selectedDenial.patientName} · {fmtDate(selectedDenial.dos)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <PriorityChip priority={selectedDenial.priority} />
                <button onClick={() => setSelectedDenial(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 800, fontSize: 18, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            </div>

            {/* Drawer tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              {[['details', '📋 Details'], ['appeal', '✍️ Appeal'], ['payer', '🏥 Payer Insights']].map(([tab, label]) => (
                <button key={tab} onClick={() => setDrawerTab(tab)}
                  style={{ flex: 1, padding: '10px 6px', border: 'none', background: drawerTab === tab ? '#eff6ff' : 'transparent', color: drawerTab === tab ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: drawerTab === tab ? 700 : 500, fontSize: 11, cursor: 'pointer', borderBottom: '2px solid ' + (drawerTab === tab ? 'var(--primary)' : 'transparent') }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

              {/* ── Details tab ── */}
              {drawerTab === 'details' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                    {[
                      ['Patient', selectedDenial.patientName], ['MRN', selectedDenial.mrn],
                      ['Date of Service', fmtDate(selectedDenial.dos)], ['Denial Date', fmtDate(selectedDenial.denialDate)],
                      ['Payer', selectedDenial.payer], ['Claim Amount', fmtMoney(selectedDenial.amount)],
                      ['Provider', selectedDenial.provider], ['Assigned To', selectedDenial.assignedTo],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: 14, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', marginBottom: 4 }}>Denial Reason</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>{selectedDenial.denialCode}</div>
                    <div style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.5 }}>{selectedDenial.denialReason}</div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: '#f3f4f6', color: '#374151', fontWeight: 600 }}>{selectedDenial.reasonCategory}</span>
                      <StatusChip status={selectedDenial.status} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 5 }}>CPT Codes</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {selectedDenial.cptCodes.map(c => <span key={c} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, background: '#eff6ff', color: '#1e40af', fontWeight: 700 }}>{c}</span>)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 5 }}>ICD-10</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {selectedDenial.icdCodes.map(c => <span key={c} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>{c}</span>)}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: 12, borderRadius: 9, background: '#f8fafc', border: '1px solid var(--border)', marginBottom: 16 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Appeal Deadline</div>
                    <DeadlineCell dateStr={selectedDenial.appealDeadline} status={selectedDenial.status} />
                    {selectedDenial.status === 'pending' && daysUntil(selectedDenial.appealDeadline) !== null && daysUntil(selectedDenial.appealDeadline) <= 30 && daysUntil(selectedDenial.appealDeadline) > 0 && (
                      <div style={{ marginTop: 8, fontSize: 11, color: '#d97706', fontWeight: 600 }}>
                        ⏰ Act soon — only {daysUntil(selectedDenial.appealDeadline)} days remaining to appeal this claim.
                      </div>
                    )}
                  </div>

                  {selectedDenial.notes ? (
                    <div style={{ padding: 12, borderRadius: 9, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 16 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Notes</div>
                      <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.5 }}>{selectedDenial.notes}</div>
                    </div>
                  ) : null}

                  {selectedDenial.status === 'pending' && (
                    <button onClick={() => startAppeal(selectedDenial)} style={{ width: '100%', padding: 12, borderRadius: 10, background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      ✍️ Start Appeal for This Claim
                    </button>
                  )}
                  {selectedDenial.status === 'appealing' && (
                    <button onClick={() => { markResolved(selectedDenial.id); setSelectedDenial(null); }} style={{ width: '100%', padding: 12, borderRadius: 10, background: '#059669', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      ✅ Mark as Resolved
                    </button>
                  )}
                </div>
              )}

              {/* ── Appeal tab ── */}
              {drawerTab === 'appeal' && (
                <div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>📄 Template</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      {REASON_CATEGORIES.map(cat => (
                        <button key={cat} onClick={() => loadTemplate(cat)}
                          style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, border: '1px solid ' + (appealTemplate === cat ? 'var(--primary)' : 'var(--border)'), background: appealTemplate === cat ? 'var(--primary-light)' : '#fff', color: appealTemplate === cat ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div style={{ padding: '10px 14px', borderRadius: 9, background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)', border: '1px solid #bfdbfe', marginBottom: 12 }}>
                      <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 3, fontSize: 12 }}>🤖 AI Suggestion</div>
                      <div style={{ fontSize: 12, color: '#1e3a8a', lineHeight: 1.5 }}>
                        Based on denial code <strong>{selectedDenial.denialCode}</strong> and payer <strong>{selectedDenial.payer}</strong>:
                        {' '}<em>{PAYER_PATTERNS[selectedDenial.payer] ? PAYER_PATTERNS[selectedDenial.payer].tips : 'Submit clinical notes with a signed provider attestation of medical necessity.'}</em>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 10, color: '#3b82f6' }}>
                        Suggested template: <strong>{selectedDenial.reasonCategory}</strong> · Appeal window: <strong>{(PAYER_PATTERNS[selectedDenial.payer] || {}).appealWindow || 90} days</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Priority</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['low', 'medium', 'high', 'urgent'].map(p => (
                        <button key={p} onClick={() => setAppealPriority(p)}
                          style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, fontWeight: 700, textTransform: 'capitalize', cursor: 'pointer', border: '1px solid ' + (appealPriority === p ? PRIORITY_STYLES[p].dot : 'var(--border)'), background: appealPriority === p ? PRIORITY_STYLES[p].bg : '#fff', color: appealPriority === p ? PRIORITY_STYLES[p].color : 'var(--text-secondary)' }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>Appeal Letter</div>
                      <button onClick={() => copyToClipboard(appealLetter)} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>📋 Copy</button>
                    </div>
                    <textarea value={appealLetter} onChange={e => setAppealLetter(e.target.value)} rows={14}
                      style={{ width: '100%', fontSize: 12, fontFamily: 'inherit', padding: 12, borderRadius: 9, border: '1px solid var(--border)', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box', color: '#1f2937' }} />
                  </div>

                  <button onClick={submitAppeal}
                    style={{ width: '100%', padding: 12, borderRadius: 10, background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    📤 Submit Appeal
                  </button>
                </div>
              )}

              {/* ── Payer Insights tab ── */}
              {drawerTab === 'payer' && (function() {
                const info = PAYER_PATTERNS[selectedDenial.payer];
                return (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{selectedDenial.payer}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Payer-specific denial patterns and appeal guidance</div>
                    </div>
                    {info ? (
                      <>
                        <div style={{ padding: 14, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: 14 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', marginBottom: 8 }}>Common Denial Reasons</div>
                          {info.topReasons.map((r, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                              <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#1e40af', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                              <span style={{ fontSize: 12, color: '#1e3a8a' }}>{r}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ padding: 14, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 14 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: 6 }}>💡 Appeal Tips</div>
                          <div style={{ fontSize: 12, color: '#14532d', lineHeight: 1.6 }}>{info.tips}</div>
                        </div>
                        <div style={{ padding: 14, borderRadius: 10, background: '#fff7ed', border: '1px solid #fed7aa', marginBottom: 14 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', marginBottom: 6 }}>⏱ Appeal Window</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#9a3412' }}>{info.appealWindow} days</div>
                          <div style={{ fontSize: 11, color: '#c2410c', marginTop: 2 }}>from denial date to submit appeal</div>
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        No payer-specific patterns on file.<br />
                        <span style={{ fontSize: 11 }}>Consult your payer contract or contact Provider Relations.</span>
                      </div>
                    )}
                    <button onClick={() => { setDrawerTab('appeal'); loadTemplate(selectedDenial.reasonCategory); }}
                      style={{ width: '100%', padding: 11, borderRadius: 10, background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      ✍️ Go to Appeal Builder →
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
