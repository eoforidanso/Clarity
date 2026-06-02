/**
 * Clarity EHR — Guided Demo Data
 * Rich fake data designed to show the system at its best.
 * Every number, every claim, every patient tells a story.
 */

const TODAY = new Date();
const dateStr = (offsetDays = 0) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};
const fmtDate = (offset = 0) => dateStr(offset);

// ── Demo Patients ─────────────────────────────────────────────────────────────
export const DEMO_PATIENTS = [
  {
    id: 'demo-p1', mrn: 'MRN-10001', firstName: 'Sarah', lastName: 'Mitchell',
    dob: '1988-07-14', age: 36, gender: 'Female', pronouns: 'She/Her',
    phone: '(312) 555-0142', cellPhone: '(312) 555-0142',
    email: 'sarah.mitchell@email.com',
    address: { street: '2847 N Clark St', city: 'Chicago', state: 'IL', zip: '60657' },
    insurance: { primary: { name: 'Blue Cross Blue Shield', memberId: 'BCB987654321', groupNumber: 'GRP-7700', copay: 25 } },
    pcp: 'Dr. Sarah Kim', assignedProvider: 'demo-u1',
    flags: [], lastVisit: fmtDate(-14), nextAppointment: fmtDate(0),
    isActive: true,
  },
  {
    id: 'demo-p2', mrn: 'MRN-10002', firstName: 'Marcus', lastName: 'Johnson',
    dob: '1979-03-22', age: 45, gender: 'Male', pronouns: 'He/Him',
    phone: '(773) 555-0289', cellPhone: '(773) 555-0289',
    email: 'marcus.j@email.com',
    address: { street: '1425 S Michigan Ave', city: 'Chicago', state: 'IL', zip: '60605' },
    insurance: { primary: { name: 'Aetna', memberId: 'AET112233445', groupNumber: 'GRP-4400', copay: 30 } },
    pcp: 'Dr. Raj Patel', assignedProvider: 'demo-u1',
    flags: ['High Risk'], lastVisit: fmtDate(-7), nextAppointment: fmtDate(0),
    isActive: true,
  },
  {
    id: 'demo-p3', mrn: 'MRN-10003', firstName: 'Elena', lastName: 'Rodriguez',
    dob: '1995-11-08', age: 29, gender: 'Female', pronouns: 'She/Her',
    phone: '(708) 555-0361', cellPhone: '(708) 555-0361',
    email: 'elena.r@email.com',
    address: { street: '884 W Diversey Pkwy', city: 'Chicago', state: 'IL', zip: '60614' },
    insurance: { primary: { name: 'UnitedHealthcare', memberId: 'UHC556677889', groupNumber: 'GRP-8800', copay: 20 } },
    pcp: 'Dr. Lisa Chen', assignedProvider: 'demo-u2',
    flags: [], lastVisit: fmtDate(-21), nextAppointment: fmtDate(0),
    isActive: true,
  },
  {
    id: 'demo-p4', mrn: 'MRN-10004', firstName: 'David', lastName: 'Kim',
    dob: '1967-05-30', age: 57, gender: 'Male', pronouns: 'He/Him',
    phone: '(847) 555-0473', cellPhone: '(847) 555-0473',
    email: 'dkim@email.com',
    address: { street: '3300 N Lake Shore Dr', city: 'Chicago', state: 'IL', zip: '60657' },
    insurance: { primary: { name: 'Cigna', memberId: 'CIG998877665', groupNumber: 'GRP-3300', copay: 40 } },
    pcp: 'Dr. Michael Torres', assignedProvider: 'demo-u1',
    flags: ['Veteran'], lastVisit: fmtDate(-3), nextAppointment: fmtDate(0),
    isActive: true,
  },
  {
    id: 'demo-p5', mrn: 'MRN-10005', firstName: 'Priya', lastName: 'Sharma',
    dob: '1991-09-15', age: 33, gender: 'Female', pronouns: 'She/Her',
    phone: '(312) 555-0587', cellPhone: '(312) 555-0587',
    email: 'priya.s@email.com',
    address: { street: '555 W Madison St', city: 'Chicago', state: 'IL', zip: '60661' },
    insurance: { primary: { name: 'Humana', memberId: 'HUM443322110', groupNumber: 'GRP-2200', copay: 35 } },
    pcp: 'Dr. James Walsh', assignedProvider: 'demo-u2',
    flags: [], lastVisit: fmtDate(-10), nextAppointment: fmtDate(1),
    isActive: true,
  },
  {
    id: 'demo-p6', mrn: 'MRN-10006', firstName: 'Thomas', lastName: 'Washington',
    dob: '1958-12-03', age: 66, gender: 'Male', pronouns: 'He/Him',
    phone: '(773) 555-0694', cellPhone: '(773) 555-0694',
    email: 'twashington@email.com',
    address: { street: '7200 S Cottage Grove', city: 'Chicago', state: 'IL', zip: '60619' },
    insurance: { primary: { name: 'Medicare', memberId: 'MDCR1A234567890', groupNumber: '', copay: 0 } },
    pcp: 'Dr. Angela Moore', assignedProvider: 'demo-u1',
    flags: ['Geriatric'], lastVisit: fmtDate(-5), nextAppointment: fmtDate(0),
    isActive: true,
  },
];

// ── Today's Schedule — full day, mix of telehealth + in-person ────────────────
export const DEMO_APPOINTMENTS = [

  // ── Morning — Dr. Danso ──────────────────────────────────────────────────────
  { id: 'demo-apt1',  patientId: 'demo-p1', patientName: 'Sarah Mitchell',         provider: 'demo-u1', providerName: 'Dr. Danso',       date: fmtDate(0), time: '08:00', duration: 30, type: 'Medication Review',   status: 'Completed',  reason: 'Buspirone 10mg follow-up — anxiety symptoms, side effect check',               visitType: 'In-Person', room: 'Room 2' },
  { id: 'demo-apt2',  patientId: 'demo-p2', patientName: 'Marcus Johnson',         provider: 'demo-u1', providerName: 'Dr. Danso',       date: fmtDate(0), time: '09:00', duration: 30, type: 'Medication Review',   status: 'Checked In', reason: 'Sertraline 100mg — 3-month follow-up, PHQ-9 score 11',                        visitType: 'In-Person', room: 'Room 3' },
  { id: 'demo-apt3',  patientId: 'demo-p4', patientName: 'David Kim',              provider: 'demo-u1', providerName: 'Dr. Danso',       date: fmtDate(0), time: '10:00', duration: 30, type: 'Follow-Up',           status: 'In Progress',reason: 'PTSD — Prazosin 2mg titration, nightmare frequency review, PCL-5',            visitType: 'In-Person', room: 'Room 3' },
  { id: 'demo-apt4',  patientId: 'demo-p6', patientName: 'Thomas Washington',      provider: 'demo-u1', providerName: 'Dr. Danso',       date: fmtDate(0), time: '11:00', duration: 45, type: 'Follow-Up',           status: 'Confirmed',  reason: 'Depression + cognitive decline — MoCA retest, caregiver present',             visitType: 'In-Person', room: 'Room 2' },
  { id: 'demo-apt5',  patientId: 'demo-p5', patientName: 'Priya Sharma',           provider: 'demo-u1', providerName: 'Dr. Danso',       date: fmtDate(0), time: '11:30', duration: 30, type: 'Medication Review',   status: 'Confirmed',  reason: 'Venlafaxine 75mg — GAD management, tolerability check',                       visitType: 'Telehealth', room: 'Virtual' },

  // ── Afternoon — Dr. Danso ────────────────────────────────────────────────────
  { id: 'demo-apt6',  patientId: null,       patientName: 'New Patient — Jordan Lee',provider: 'demo-u1', providerName: 'Dr. Danso',      date: fmtDate(0), time: '13:00', duration: 60, type: 'New Patient',         status: 'Confirmed',  reason: 'Initial psychiatric evaluation — OCD symptoms, intrusive thoughts, GAD',      visitType: 'In-Person', room: 'Room 3' },
  { id: 'demo-apt7',  patientId: 'demo-p3', patientName: 'Elena Rodriguez',        provider: 'demo-u1', providerName: 'Dr. Danso',       date: fmtDate(0), time: '14:00', duration: 30, type: 'Follow-Up',           status: 'Scheduled',  reason: 'Wellbutrin SR 150mg — depression adjunct, energy and motivation review',       visitType: 'Telehealth', room: 'Virtual' },
  { id: 'demo-apt8',  patientId: 'demo-p1', patientName: 'Sarah Mitchell',         provider: 'demo-u1', providerName: 'Dr. Danso',       date: fmtDate(0), time: '15:00', duration: 30, type: 'Medication Review',   status: 'Scheduled',  reason: 'Buspirone dose adjustment — headaches resolving, increase to 15mg?',           visitType: 'Telehealth', room: 'Virtual' },
  { id: 'demo-apt9',  patientId: null,       patientName: 'New Patient — Maya Chen', provider: 'demo-u1', providerName: 'Dr. Danso',     date: fmtDate(0), time: '16:00', duration: 60, type: 'New Patient',         status: 'Scheduled',  reason: 'Initial eval — postpartum depression, 3 months postpartum, sleep disturbance', visitType: 'In-Person', room: 'Room 2' },

  // ── Morning — April T., LCSW ────────────────────────────────────────────────
  { id: 'demo-apt10', patientId: 'demo-p3', patientName: 'Elena Rodriguez',        provider: 'demo-u2', providerName: 'April T., LCSW',  date: fmtDate(0), time: '08:30', duration: 50, type: 'Individual Therapy',  status: 'Completed',  reason: 'EMDR Session 6 — bilateral stimulation, trauma memory reprocessing',           visitType: 'Telehealth', room: 'Virtual' },
  { id: 'demo-apt11', patientId: 'demo-p2', patientName: 'Marcus Johnson',         provider: 'demo-u2', providerName: 'April T., LCSW',  date: fmtDate(0), time: '09:30', duration: 50, type: 'Individual Therapy',  status: 'Checked In', reason: 'MET/CBT Session 8 — relapse prevention, urge surfing, coping skills review',   visitType: 'In-Person', room: 'Room 5' },
  { id: 'demo-apt12', patientId: 'demo-p5', patientName: 'Priya Sharma',           provider: 'demo-u2', providerName: 'April T., LCSW',  date: fmtDate(0), time: '10:30', duration: 50, type: 'Individual Therapy',  status: 'In Progress',reason: 'DBT Skills Session 5 — distress tolerance, TIPP technique practice',            visitType: 'Telehealth', room: 'Virtual' },
  { id: 'demo-apt13', patientId: 'demo-p6', patientName: 'Thomas Washington',      provider: 'demo-u2', providerName: 'April T., LCSW',  date: fmtDate(0), time: '11:30', duration: 50, type: 'Individual Therapy',  status: 'Confirmed',  reason: 'CBT for late-life depression — behavioral activation, pleasant events log',    visitType: 'In-Person', room: 'Room 4' },

  // ── Afternoon — April T., LCSW ──────────────────────────────────────────────
  { id: 'demo-apt14', patientId: 'demo-p1', patientName: 'Sarah Mitchell',         provider: 'demo-u2', providerName: 'April T., LCSW',  date: fmtDate(0), time: '13:00', duration: 50, type: 'Individual Therapy',  status: 'Scheduled',  reason: 'CBT Session 11 — cognitive restructuring, automatic thought records',          visitType: 'In-Person', room: 'Room 5' },
  { id: 'demo-apt15', patientId: 'demo-p4', patientName: 'David Kim',              provider: 'demo-u2', providerName: 'April T., LCSW',  date: fmtDate(0), time: '14:00', duration: 50, type: 'Individual Therapy',  status: 'Scheduled',  reason: 'CPT Session 4 — stuck point log review, trauma impact statement work',         visitType: 'Telehealth', room: 'Virtual' },
  { id: 'demo-apt16', patientId: null,       patientName: 'Group — Anxiety (6 pts)', provider: 'demo-u2', providerName: 'April T., LCSW',date: fmtDate(0), time: '15:00', duration: 90, type: 'Group Therapy',       status: 'Scheduled',  reason: 'Weekly Anxiety Management Group — exposure hierarchy, breathing techniques',   visitType: 'In-Person', room: 'Group Room A' },

  // ── Tomorrow — Dr. Danso ─────────────────────────────────────────────────────
  { id: 'demo-tmw1',  patientId: 'demo-p2', patientName: 'Marcus Johnson',         provider: 'demo-u1', providerName: 'Dr. Danso',       date: fmtDate(1), time: '09:00', duration: 30, type: 'Medication Review',   status: 'Scheduled',  reason: 'Naltrexone 50mg — AUD management, craving diary review',                      visitType: 'In-Person', room: 'Room 3' },
  { id: 'demo-tmw2',  patientId: 'demo-p5', patientName: 'Priya Sharma',           provider: 'demo-u1', providerName: 'Dr. Danso',       date: fmtDate(1), time: '10:00', duration: 30, type: 'Follow-Up',           status: 'Confirmed',  reason: 'GAD-7 follow-up — Venlafaxine efficacy, sleep quality assessment',            visitType: 'Telehealth', room: 'Virtual' },
  { id: 'demo-tmw3',  patientId: null,       patientName: 'New Patient — Aisha Cole',provider: 'demo-u1', providerName: 'Dr. Danso',     date: fmtDate(1), time: '11:00', duration: 60, type: 'New Patient',         status: 'Scheduled',  reason: 'Initial eval — bipolar II screening, mood swings, hypomanic episodes',        visitType: 'In-Person', room: 'Room 2' },
  { id: 'demo-tmw4',  patientId: 'demo-p4', patientName: 'David Kim',              provider: 'demo-u1', providerName: 'Dr. Danso',       date: fmtDate(1), time: '14:00', duration: 30, type: 'Follow-Up',           status: 'Scheduled',  reason: 'PTSD 6-week check — nightmares resolved 60%, Prazosin tolerance good',        visitType: 'Telehealth', room: 'Virtual' },

  // ── Tomorrow — April T., LCSW ────────────────────────────────────────────────
  { id: 'demo-tmw5',  patientId: 'demo-p3', patientName: 'Elena Rodriguez',        provider: 'demo-u2', providerName: 'April T., LCSW',  date: fmtDate(1), time: '09:30', duration: 50, type: 'Individual Therapy',  status: 'Confirmed',  reason: 'EMDR Session 7 — processing phase, resource installation',                    visitType: 'Telehealth', room: 'Virtual' },
  { id: 'demo-tmw6',  patientId: 'demo-p1', patientName: 'Sarah Mitchell',         provider: 'demo-u2', providerName: 'April T., LCSW',  date: fmtDate(1), time: '11:00', duration: 50, type: 'Individual Therapy',  status: 'Scheduled',  reason: 'CBT Session 12 — behavioral experiment design, social anxiety exposure',      visitType: 'In-Person', room: 'Room 5' },
  { id: 'demo-tmw7',  patientId: 'demo-p6', patientName: 'Thomas Washington',      provider: 'demo-u2', providerName: 'April T., LCSW',  date: fmtDate(1), time: '13:00', duration: 50, type: 'Individual Therapy',  status: 'Scheduled',  reason: 'Late-life depression — activity scheduling, family communication strategies', visitType: 'Telehealth', room: 'Virtual' },
];

// ── Inbox Messages ────────────────────────────────────────────────────────────
export const DEMO_INBOX = [
  { id: 'demo-msg1', type: 'Rx Refill Request', from: 'Walgreens Pharmacy — N Michigan Ave', to: 'demo-u1', patient: 'demo-p2', patientName: 'Marcus Johnson', subject: 'Refill Request: Sertraline 100mg #90', body: 'Patient requesting refill of Sertraline 100mg #90. Last filled 60 days ago. 0 refills remaining on current script. Patient reports medication is working well — no side effects.', date: fmtDate(0), time: '07:45', read: false, urgent: false, priority: 'Normal', status: 'Pending' },
  { id: 'demo-msg2', type: 'Lab Result', from: 'Quest Diagnostics', to: 'demo-u1', patient: 'demo-p4', patientName: 'David Kim', subject: 'Lab Results Ready: CMP, CBC, TSH', body: 'Lab results now available for David Kim. Notable: TSH 0.3 (low), CBC within normal limits, CMP normal. Please review thyroid panel.', date: fmtDate(0), time: '08:12', read: false, urgent: true, priority: 'High', status: 'Pending' },
  { id: 'demo-msg3', type: 'Patient Message', from: 'Sarah Mitchell', to: 'demo-u1', patient: 'demo-p1', patientName: 'Sarah Mitchell', subject: 'Side effects — new medication', body: 'Dr. Danso, I started the Buspirone 10mg on Monday and I\'ve been experiencing headaches and dizziness in the morning. Should I continue taking it? Is this normal to go away? Thank you.', date: fmtDate(0), time: '09:33', read: false, urgent: false, priority: 'Normal', status: 'Pending' },
  { id: 'demo-msg4', type: 'Prior Auth', from: 'Aetna Insurance', to: 'demo-u1', patient: 'demo-p2', patientName: 'Marcus Johnson', subject: 'PA Required: Intensive Outpatient Program', body: 'Prior authorization is required for the ordered Intensive Outpatient Program (IOP) — 10 sessions per month. Please submit H0015 clinical documentation supporting medical necessity including PHQ-9, GAD-7 scores, and treatment history.', date: fmtDate(-1), time: '14:20', read: true, urgent: true, priority: 'High', status: 'In Progress' },
  { id: 'demo-msg5', type: 'Rx Refill Request', from: 'CVS Pharmacy — Lakeview', to: 'demo-u1', patient: 'demo-p4', patientName: 'David Kim', subject: 'Refill Request: Prazosin 2mg (30-day)', body: 'Patient requesting 30-day refill of Prazosin 2mg for PTSD-related nightmares. Last filled 28 days ago. Patient reports significant reduction in nightmare frequency on current dose.', date: fmtDate(0), time: '10:05', read: false, urgent: false, priority: 'Normal', status: 'Pending' },
  { id: 'demo-msg6', type: 'Check-in Alert', from: 'Front Desk', to: 'demo-u1', patient: 'demo-p2', patientName: 'Marcus Johnson', subject: 'Marcus Johnson has checked in — Room 3', body: 'Marcus Johnson checked in at 8:52 AM. Vitals taken: BP 128/82, HR 74, weight 187 lbs. PHQ-9 completed in waiting room — score 11 (moderate). Patient ready in Room 3.', date: fmtDate(0), time: '08:52', read: false, urgent: false, priority: 'Normal', status: 'Pending' },
];

// ── Clearinghouse — Claims in Flight ──────────────────────────────────────────
export const DEMO_CLAIMS = [
  { id: 'demo-clm1', claimId: 'CLM-2026-4421', patientName: 'Sarah Mitchell', payerName: 'Blue Cross Blue Shield', payerId: 'BCBS', status: 'acknowledged', totalCharge: 350.00, submittedAt: new Date(Date.now() - 2 * 3600000).toISOString(), ackCode: 'A', procedureCode: '90837', icd10: 'F41.1' },
  { id: 'demo-clm2', claimId: 'CLM-2026-4419', patientName: 'Marcus Johnson', payerName: 'Aetna', payerId: '60054', status: 'transmitted', totalCharge: 275.00, submittedAt: new Date(Date.now() - 4 * 3600000).toISOString(), procedureCode: '90837', icd10: 'F32.1' },
  { id: 'demo-clm3', claimId: 'CLM-2026-4418', patientName: 'Elena Rodriguez', payerName: 'UnitedHealthcare', payerId: 'UHC', status: 'acknowledged', totalCharge: 350.00, submittedAt: new Date(Date.now() - 6 * 3600000).toISOString(), ackCode: 'A', procedureCode: '90837', icd10: 'F43.10' },
  { id: 'demo-clm4', claimId: 'CLM-2026-4412', patientName: 'David Kim', payerName: 'Cigna', payerId: '77013', status: 'failed', totalCharge: 225.00, submittedAt: new Date(Date.now() - 48 * 3600000).toISOString(), failReason: 'Missing prior authorization for 90837', procedureCode: '90837', icd10: 'F43.10' },
  { id: 'demo-clm5', claimId: 'CLM-2026-4408', patientName: 'Thomas Washington', payerName: 'Medicare', payerId: 'MDCR', status: 'acknowledged', totalCharge: 275.00, submittedAt: new Date(Date.now() - 72 * 3600000).toISOString(), ackCode: 'A', procedureCode: '90833', icd10: 'F32.2' },
  { id: 'demo-clm6', claimId: 'CLM-2026-4401', patientName: 'Priya Sharma', payerName: 'Humana', payerId: 'HUMANA', status: 'queued', totalCharge: 350.00, submittedAt: new Date(Date.now() - 15 * 60000).toISOString(), procedureCode: '90837', icd10: 'F40.10' },
];

// ── ERA Payments ──────────────────────────────────────────────────────────────
export const DEMO_ERA = [
  { id: 'demo-era1', checkNumber: 'CHK-892341', checkDate: fmtDate(-1), payerName: 'Blue Cross Blue Shield', totalPaid: 3250.00, claimCount: 12, postStatus: 'posted',
    claims: [
      { claimId: 'CLM-2026-4388', patientName: 'Sarah Mitchell', charged: 350, paid: 280, contractualAdj: 70, patientResp: 25, status: 'paid' },
      { claimId: 'CLM-2026-4389', patientName: 'David Kim', charged: 275, paid: 220, contractualAdj: 55, patientResp: 20, status: 'paid' },
      { claimId: 'CLM-2026-4390', patientName: 'Priya Sharma', charged: 350, paid: 0, contractualAdj: 0, patientResp: 0, status: 'denied', denialReason: 'Auth not on file' },
    ]
  },
  { id: 'demo-era2', checkNumber: 'CHK-445892', checkDate: fmtDate(0), payerName: 'Aetna', totalPaid: 1840.00, claimCount: 8, postStatus: 'unposted',
    claims: [
      { claimId: 'CLM-2026-4395', patientName: 'Marcus Johnson', charged: 350, paid: 298, contractualAdj: 52, patientResp: 30, status: 'paid' },
      { claimId: 'CLM-2026-4396', patientName: 'Elena Rodriguez', charged: 275, paid: 242, contractualAdj: 33, patientResp: 20, status: 'partial' },
    ]
  },
];

// ── Eligibility Checks ────────────────────────────────────────────────────────
export const DEMO_ELIGIBILITY = [
  { id: 'demo-elig1', subscriberName: 'Mitchell, Sarah', payerName: 'Blue Cross Blue Shield', status: 'received', isActive: true, deductible: 500, deductibleMet: 380, copay: 25, checkedAt: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: 'demo-elig2', subscriberName: 'Johnson, Marcus', payerName: 'Aetna', status: 'received', isActive: true, deductible: 750, deductibleMet: 750, copay: 30, checkedAt: new Date(Date.now() - 45 * 60000).toISOString() },
  { id: 'demo-elig3', subscriberName: 'Kim, David', payerName: 'Cigna', status: 'received', isActive: false, deductible: 1000, deductibleMet: 0, copay: 40, checkedAt: new Date(Date.now() - 2 * 3600000).toISOString(), inactiveReason: 'Coverage terminated 2026-05-31' },
];

// ── RCM Analytics ─────────────────────────────────────────────────────────────
export const DEMO_RCM = {
  periodDays: 90,
  kpis: {
    totalClaimsSubmitted: 284,
    totalCharged: 94200.00,
    totalCollected: 76482.00,
    totalOutstanding: 12840.00,
    totalDenied: 4878.00,
    collectionRate: 81.2,
    denialRate: 5.2,
    cleanClaimRate: 94.8,
    daysInAR: 23,
    avgReimbursementRate: 79.4,
    priorAuthApprovalRate: 87.5,
    attachmentComplianceRate: 96.2,
  },
  arAging: [
    { label: '0–30 days',   claimCount: 38, totalBalance: 8420.00, percentage: 65.6 },
    { label: '31–60 days',  claimCount: 12, totalBalance: 2840.00, percentage: 22.1 },
    { label: '61–90 days',  claimCount: 5,  totalBalance: 980.00,  percentage: 7.6 },
    { label: '91–120 days', claimCount: 2,  totalBalance: 480.00,  percentage: 3.7 },
    { label: '120+ days',   claimCount: 1,  totalBalance: 120.00,  percentage: 0.9 },
  ],
  monthlyTrend: [
    { month: 'Jan', submitted: 41, paid: 39, denied: 2, totalCharged: 13650, totalCollected: 11220, cleanClaimRate: 95.1 },
    { month: 'Feb', submitted: 38, paid: 36, denied: 2, totalCharged: 12540, totalCollected: 10180, cleanClaimRate: 94.7 },
    { month: 'Mar', submitted: 47, paid: 44, denied: 3, totalCharged: 15540, totalCollected: 12560, cleanClaimRate: 93.6 },
    { month: 'Apr', submitted: 52, paid: 50, denied: 2, totalCharged: 17160, totalCollected: 14080, cleanClaimRate: 96.2 },
    { month: 'May', submitted: 56, paid: 53, denied: 3, totalCharged: 18480, totalCollected: 15240, cleanClaimRate: 94.6 },
    { month: 'Jun', submitted: 50, paid: 47, denied: 3, totalCharged: 16830, totalCollected: 13202, cleanClaimRate: 94.0 },
  ],
};

// ── Demo user (prescriber) ────────────────────────────────────────────────────
export const DEMO_USER = {
  id: 'demo-u1',
  username: 'demo',
  firstName: 'Demo',
  lastName: 'User',
  role: 'prescriber',
  credentials: 'MD',
  specialty: 'Psychiatry',
  npi: '1234567890',
  email: 'demo@clarity-ehr.com',
  twoFactorEnabled: false,
  locationId: 'loc1',
  name: 'Demo User, MD',
  isDemo: true,
};
