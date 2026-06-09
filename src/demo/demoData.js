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
// Cleared for production use — patients will be loaded from backend API
export const DEMO_PATIENTS = [];

// ── Today's Schedule — full day, mix of telehealth + in-person ────────────────
// Cleared for production use — appointments will be loaded from backend API
export const DEMO_APPOINTMENTS = [];

/* ── ORIGINAL DEMO DATA (commented out for production) ──────────────────────
export const DEMO_APPOINTMENTS_ARCHIVE = [
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
*/ // End of archived demo data

// ── Inbox Messages ────────────────────────────────────────────────────────────
// Cleared for production use — messages will be loaded from backend API
export const DEMO_INBOX = [];
  { id: 'demo-msg1', type: 'Rx Refill Request', from: 'Walgreens Pharmacy — N Michigan Ave', to: 'demo-u1', patient: 'demo-p2', patientName: 'Marcus Johnson', subject: 'Refill Request: Sertraline 100mg #90', body: 'Patient requesting refill of Sertraline 100mg #90. Last filled 60 days ago. 0 refills remaining on current script. Patient reports medication is working well — no side effects.', date: fmtDate(0), time: '07:45', read: false, urgent: false, priority: 'Normal', status: 'Pending' },
  { id: 'demo-msg2', type: 'Lab Result', from: 'Quest Diagnostics', to: 'demo-u1', patient: 'demo-p4', patientName: 'David Kim', subject: 'Lab Results Ready: CMP, CBC, TSH', body: 'Lab results now available for David Kim. Notable: TSH 0.3 (low), CBC within normal limits, CMP normal. Please review thyroid panel.', date: fmtDate(0), time: '08:12', read: false, urgent: true, priority: 'High', status: 'Pending' },
  { id: 'demo-msg3', type: 'Patient Message', from: 'Sarah Mitchell', to: 'demo-u1', patient: 'demo-p1', patientName: 'Sarah Mitchell', subject: 'Side effects — new medication', body: 'Dr. Danso, I started the Buspirone 10mg on Monday and I\'ve been experiencing headaches and dizziness in the morning. Should I continue taking it? Is this normal to go away? Thank you.', date: fmtDate(0), time: '09:33', read: false, urgent: false, priority: 'Normal', status: 'Pending' },
  { id: 'demo-msg4', type: 'Prior Auth', from: 'Aetna Insurance', to: 'demo-u1', patient: 'demo-p2', patientName: 'Marcus Johnson', subject: 'PA Required: Intensive Outpatient Program', body: 'Prior authorization is required for the ordered Intensive Outpatient Program (IOP) — 10 sessions per month. Please submit H0015 clinical documentation supporting medical necessity including PHQ-9, GAD-7 scores, and treatment history.', date: fmtDate(-1), time: '14:20', read: true, urgent: true, priority: 'High', status: 'In Progress' },
  { id: 'demo-msg5', type: 'Rx Refill Request', from: 'CVS Pharmacy — Lakeview', to: 'demo-u1', patient: 'demo-p4', patientName: 'David Kim', subject: 'Refill Request: Prazosin 2mg (30-day)', body: 'Patient requesting 30-day refill of Prazosin 2mg for PTSD-related nightmares. Last filled 28 days ago. Patient reports significant reduction in nightmare frequency on current dose.', date: fmtDate(0), time: '10:05', read: false, urgent: false, priority: 'Normal', status: 'Pending' },
  { id: 'demo-msg6', type: 'Check-in Alert', from: 'Front Desk', to: 'demo-u1', patient: 'demo-p2', patientName: 'Marcus Johnson', subject: 'Marcus Johnson has checked in — Room 3', body: 'Marcus Johnson checked in at 8:52 AM. Vitals taken: BP 128/82, HR 74, weight 187 lbs. PHQ-9 completed in waiting room — score 11 (moderate). Patient ready in Room 3.', date: fmtDate(0), time: '08:52', read: false, urgent: false, priority: 'Normal', status: 'Pending' },
];

// ── Clearinghouse — Claims in Flight ──────────────────────────────────────────
// Cleared for production use — claims will be loaded from backend API
export const DEMO_CLAIMS = [];

// ── ERA Payments ──────────────────────────────────────────────────────────────
// Cleared for production use — ERA data will be loaded from backend API
export const DEMO_ERA = [];

// ── Eligibility Checks ────────────────────────────────────────────────────────
// Cleared for production use — eligibility data will be loaded from backend API
export const DEMO_ELIGIBILITY = [];

// ── RCM Analytics ─────────────────────────────────────────────────────────────
// Cleared for production use — analytics will be loaded from backend API
export const DEMO_RCM = null;

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
