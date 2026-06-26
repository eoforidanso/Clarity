import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';
import PatientBanner from '../components/PatientBanner';
import PharmacySelectorDrawer from '../components/PharmacySelectorDrawer';
import PDMPDrawer from '../components/PDMPDrawer';
import { patients as patientsApi, users as usersApi } from '../services/api';
import { getControlledSchedule } from '../utils/controlledSubstances';
import { generateILPmpReport } from '../utils/pmpMock';
import BTGGuard from '../components/BTGGuard';
import { ILLINOIS_LABS, getLabProximityInfo } from '../data/illinoisLabs';
import { checkInteractions } from '../data/drugInteractions';
import { resolvePharmacy, resolveSigSuggestions, getActiveMedContext } from '../utils/rxAutoPopulate';
import AssessmentScorer from '../components/AssessmentScorer';
import SafetyPlanBuilder from '../components/SafetyPlanBuilder';
import MedAdherenceTimeline from '../components/MedAdherenceTimeline';
import PriorAuthDrawer from '../components/PriorAuthDrawer';
import PatientPortalInbox from '../components/PatientPortalInbox';
import DiagnosisOrderComposer from '../components/DiagnosisOrderComposer';

import ChartSummary from './chart/ChartSummary';
import Demographics from './chart/Demographics';
import Allergies from './chart/Allergies';
import ProblemList from './chart/ProblemList';
import Vitals from './chart/Vitals';
import Medications from './chart/Medications';
import Orders from './chart/Orders';
import Assessments from './chart/Assessments';
import Immunizations from './chart/Immunizations';
import LabResults from './chart/LabResults';
import Encounters from './chart/Encounters';
import PatientStatus, { getPatientStatusRecord } from './chart/PatientStatus';

// ── Role capability matrix ───────────────────────────────────────────────────
const ROLE_CAPABILITIES = {
  prescriber:  { canViewMeds: true,  canPrescribe: true,  canOrder: true  },
  therapist:   { canViewMeds: true,  canPrescribe: false, canOrder: false },
  front_desk:  { canViewMeds: true,  canPrescribe: false, canOrder: false },
  nurse:       { canViewMeds: true,  canPrescribe: false, canOrder: false },
  biller:      { canViewMeds: false, canPrescribe: false, canOrder: false },
  admin:       { canViewMeds: true,  canPrescribe: false, canOrder: false },
  patient:     { canViewMeds: false, canPrescribe: false, canOrder: false },
};

export function getCapabilities(user) {
  if (!user) return ROLE_CAPABILITIES.patient;
  const base = ROLE_CAPABILITIES[user.role] ?? ROLE_CAPABILITIES.patient;
  if (user.prescriptive_authority === false) return { ...base, canPrescribe: false, canOrder: false };
  return base;
}

export function hasPrescriptiveAuthority(user) {
  return getCapabilities(user).canPrescribe;
}

const ALL_CHART_TABS = [
  { key: 'summary',      icon: '📋', shortLabel: 'Summary',       label: '📋 Summary',       component: ChartSummary  },
  { key: 'encounters',   icon: '🗒️', shortLabel: 'Encounters',    label: '🗒️ Encounters',     component: Encounters    },
  { key: 'demographics', icon: '👤', shortLabel: 'Demographics',  label: '👤 Demographics',   component: Demographics  },
  { key: 'allergies',    icon: '⚠️', shortLabel: 'Allergies',     label: '⚠️ Allergies',       component: Allergies     },
  { key: 'problems',     icon: '🩺', shortLabel: 'Problems',      label: '🩺 Problems',        component: ProblemList   },
  { key: 'vitals',       icon: '💓', shortLabel: 'Vitals',        label: '💓 Vitals',          component: Vitals        },
  { key: 'medications',  icon: '💊', shortLabel: 'Medications',   label: '💊 Medications',     component: Medications,  requiresCap: 'canViewMeds' },
  { key: 'orders',       icon: '📝', shortLabel: 'Orders',        label: '📝 Orders',          component: Orders,       requiresCap: 'canOrder'    },
  { key: 'assessments',  icon: '📊', shortLabel: 'Assessments',   label: '📊 Assessments',     component: Assessments  },
  { key: 'immunizations',icon: '💉', shortLabel: 'Immunizations', label: '💉 Immunizations',   component: Immunizations },
  { key: 'labs',         icon: '🔬', shortLabel: 'Labs',          label: '🔬 Labs',            component: LabResults    },
  { key: 'status',       icon: '🚫', shortLabel: 'Status',        label: '🚫 Patient Status',  component: PatientStatus },
];

function getVisibleTabs(user) {
  const caps = getCapabilities(user);
  return ALL_CHART_TABS.filter(t => !t.requiresCap || caps[t.requiresCap]);
}

// Keep alias for existing references
const chartTabs = ALL_CHART_TABS;

// ── Chart-side slot picker modal ─────────────────────────────────────────────
function ChartSlotModal({ patient, providers, existingAppts, currentUser, onSave, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const isProviderRole = ['prescriber', 'nurse', 'therapist'].includes(currentUser?.role);
  const defaultProvider = isProviderRole
    ? (providers.find(p => p.id === currentUser?.id) ? currentUser.id : (providers[0]?.id ?? ''))
    : (providers[0]?.id ?? '');

  const [date, setDate]               = useState(today);
  const [providerId, setProviderId]   = useState(defaultProvider);
  const [duration, setDuration]       = useState(30);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [aptType, setAptType]         = useState('Office Visit');
  const [visitType, setVisitType]     = useState('Follow-up');
  const [reason, setReason]           = useState('');
  const [saving, setSaving]           = useState(false);

  const toMins = t => { if (!t) return NaN; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fmtTime12 = t => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  // Map every blocked 15-min chunk → { name } for this provider/date
  const bookedMap = useMemo(() => {
    const map = {};
    existingAppts
      .filter(a => a.provider === providerId && a.date === date && a.status !== 'Cancelled' && a.status !== 'No Show' && a.time)
      .forEach(a => {
        const start = toMins(a.time);
        const dur   = Number(a.duration || 30);
        for (let m = start; m < start + dur; m += 15) {
          const key = `${String(Math.floor(m / 60)).padStart(2,'0')}:${String(m % 60).padStart(2,'0')}`;
          if (!map[key]) map[key] = { name: (a.patientName || '').split(' ')[0] || 'Pt' };
        }
      });
    return map;
  }, [existingAppts, providerId, date]);

  // 30-min slots 7 AM – 8 PM
  const slots = useMemo(() => {
    const result = [];
    for (let m = 7 * 60; m < 20 * 60; m += 30) {
      result.push(`${String(Math.floor(m / 60)).padStart(2,'0')}:${String(m % 60).padStart(2,'0')}`);
    }
    return result;
  }, []);

  const isSlotOpen = useCallback(slotTime => {
    const start = toMins(slotTime);
    for (let m = start; m < start + duration; m += 15) {
      if (bookedMap[`${String(Math.floor(m / 60)).padStart(2,'0')}:${String(m % 60).padStart(2,'0')}`]) return false;
    }
    return true;
  }, [bookedMap, duration]);

  const handleConfirm = async () => {
    if (!selectedSlot || !providerId || saving) return;
    setSaving(true);
    const prov = providers.find(p => p.id === providerId);
    await onSave({
      patientId:    patient?.id,
      patientName:  patient ? `${patient.firstName} ${patient.lastName}` : '',
      provider:     providerId,
      providerName: prov ? `${prov.firstName} ${prov.lastName}${prov.credentials ? ', ' + prov.credentials : ''}` : '',
      date,
      time:         selectedSlot,
      duration,
      type:         aptType,
      visitType,
      reason,
      status:       'Scheduled',
    });
    setSaving(false);
    onClose();
  };

  const APPT_TYPES  = ['Office Visit', 'Telehealth', 'New Patient', 'Follow-up', 'Procedure', 'Lab Only'];
  const VISIT_TYPES = ['Follow-up', 'New Patient', 'Annual Wellness', 'Urgent', 'Consultation', 'Preventive'];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'#fff', borderRadius:14, width:540, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#4f46e5', color:'#fff', borderRadius:'14px 14px 0 0' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15 }}>📅 Schedule Appointment</div>
            <div style={{ fontSize:12, opacity:0.85, marginTop:2 }}>
              {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'} · patient locked
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.18)', border:'none', color:'#fff', borderRadius:6, width:28, height:28, fontSize:18, cursor:'pointer', lineHeight:1 }}>×</button>
        </div>

        {/* Controls */}
        <div style={{ padding:'14px 20px 10px', borderBottom:'1px solid #f3f4f6', display:'flex', flexWrap:'wrap', gap:10 }}>
          <div style={{ flex:1, minWidth:130 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#6b7280', display:'block', marginBottom:3 }}>DATE</label>
            <input type="date" value={date} min={today}
              onChange={e => { setDate(e.target.value); setSelectedSlot(null); }}
              style={{ width:'100%', border:'1.5px solid #d1d5db', borderRadius:7, padding:'6px 8px', fontSize:13, fontFamily:'inherit', boxSizing:'border-box' }} />
          </div>
          <div style={{ flex:2, minWidth:190 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#6b7280', display:'block', marginBottom:3 }}>PROVIDER</label>
            <select value={providerId}
              onChange={e => { setProviderId(e.target.value); setSelectedSlot(null); }}
              style={{ width:'100%', border:'1.5px solid #d1d5db', borderRadius:7, padding:'6px 8px', fontSize:13, fontFamily:'inherit', boxSizing:'border-box' }}>
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.credentials ? `, ${p.credentials}` : ''}</option>
              ))}
            </select>
          </div>
          <div style={{ width:'100%' }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#6b7280', display:'block', marginBottom:4 }}>DURATION</label>
            <div style={{ display:'flex', gap:6 }}>
              {[15, 30, 45, 60, 90].map(d => (
                <button key={d} type="button"
                  onClick={() => { setDuration(d); setSelectedSlot(null); }}
                  style={{ padding:'4px 14px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer',
                    border: `1.5px solid ${duration === d ? '#4f46e5' : '#d1d5db'}`,
                    background: duration === d ? '#ede9fe' : '#f9fafb',
                    color: duration === d ? '#4f46e5' : '#6b7280' }}>
                  {d}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Slot grid */}
        <div style={{ overflowY:'auto', flex:1, padding:'14px 20px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', marginBottom:10, textTransform:'uppercase', letterSpacing:0.5 }}>
            Open slots — {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
            {slots.map(slot => {
              const open = isSlotOpen(slot);
              const isSelected = selectedSlot === slot;
              const booked = bookedMap[slot];
              return (
                <button key={slot} type="button" disabled={!open}
                  onClick={() => open && setSelectedSlot(isSelected ? null : slot)}
                  style={{
                    padding:'9px 4px', borderRadius:8, fontSize:12, fontWeight:700,
                    cursor: open ? 'pointer' : 'not-allowed', textAlign:'center',
                    border: `1.5px solid ${isSelected ? '#4f46e5' : open ? '#86efac' : '#fca5a5'}`,
                    background: isSelected ? '#4f46e5' : open ? '#f0fdf4' : '#fef2f2',
                    color: isSelected ? '#fff' : open ? '#15803d' : '#991b1b',
                    opacity: open ? 1 : 0.75, transition:'all 0.12s',
                  }}>
                  {fmtTime12(slot)}
                  {!open && booked && (
                    <div style={{ fontSize:9, fontWeight:500, marginTop:2, opacity:0.8 }}>{booked.name}</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Detail fields shown after slot selection */}
          {selectedSlot && (
            <div style={{ marginTop:16, padding:14, background:'#f8fafc', borderRadius:10, border:'1.5px solid #e2e8f0' }}>
              <div style={{ fontWeight:700, fontSize:13, color:'#1e293b', marginBottom:12 }}>
                {fmtTime12(selectedSlot)} · {duration} min
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'#6b7280', display:'block', marginBottom:3 }}>APPOINTMENT TYPE</label>
                  <select value={aptType} onChange={e => setAptType(e.target.value)}
                    style={{ width:'100%', border:'1.5px solid #d1d5db', borderRadius:7, padding:'6px 8px', fontSize:12, fontFamily:'inherit', boxSizing:'border-box' }}>
                    {APPT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'#6b7280', display:'block', marginBottom:3 }}>VISIT TYPE</label>
                  <select value={visitType} onChange={e => setVisitType(e.target.value)}
                    style={{ width:'100%', border:'1.5px solid #d1d5db', borderRadius:7, padding:'6px 8px', fontSize:12, fontFamily:'inherit', boxSizing:'border-box' }}>
                    {VISIT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'#6b7280', display:'block', marginBottom:3 }}>REASON FOR VISIT</label>
                <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="e.g. medication review, annual follow-up…"
                  style={{ width:'100%', border:'1.5px solid #d1d5db', borderRadius:7, padding:'6px 8px', fontSize:12, fontFamily:'inherit', boxSizing:'border-box' }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px', borderTop:'1px solid #e5e7eb', display:'flex', justifyContent:'flex-end', gap:10, background:'#fafafa', borderRadius:'0 0 14px 14px' }}>
          <button type="button" onClick={onClose}
            style={{ padding:'8px 18px', borderRadius:8, border:'1.5px solid #d1d5db', background:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', color:'#374151' }}>
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={!selectedSlot || saving}
            style={{ padding:'8px 22px', borderRadius:8, border:'none', fontSize:13, fontWeight:700,
              cursor: selectedSlot && !saving ? 'pointer' : 'not-allowed',
              background: selectedSlot ? '#4f46e5' : '#e5e7eb',
              color: selectedSlot ? '#fff' : '#9ca3af',
              opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : '📅 Confirm Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChartPage() {
  const { patientId, tab } = useParams();
  const { currentUser } = useAuth();
  const {
    openChart, selectedPatient, updateStickyNote, allergies, problemList, vitalSigns, meds,
    immunizations, labResults, assessmentScores, orders, addOrder, encounters,
    inboxMessages, appointments, addAppointment,
  } = usePatient();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);

  // ── Chart-side slot-picker scheduling ─────────────────────────────────
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotProviders, setSlotProviders] = useState([]);
  useEffect(() => {
    usersApi.directory().then(data => {
      if (Array.isArray(data)) setSlotProviders(data.filter(u => ['prescriber', 'nurse', 'therapist'].includes(u.role)));
    }).catch(() => {});
  }, []);
  const [activePanel, setActivePanel] = useState(null); // 'quickview' | 'ordergroup' | 'export' | 'forms'
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);

  // ── Sticky Note ──────────────────────────────────────────
  const [stickyOpen, setStickyOpen] = useState(false);
  const [stickyPos, setStickyPos] = useState({ x: 60, y: 120 });
  const [stickyMinimized, setStickyMinimized] = useState(false);
  const stickyDragRef = useRef(null);
  const stickyDragging = useRef(false);
  const stickyOffset = useRef({ x: 0, y: 0 });

  // Note lives in PatientContext — no local state, no effects needed.
  const stickyText = selectedPatient?.stickyNote ?? '';
  const setStickyText = (note) => updateStickyNote(selectedPatient?.id, note);
  const [stickySaveStatus, setStickySaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const stickySaveTimerRef = useRef(null);
  const saveStickyNote = useCallback(async () => {
    if (!selectedPatient?.id) return;
    setStickySaveStatus('saving');
    try {
      await patientsApi.updateStickyNote(selectedPatient.id, stickyText);
      setStickySaveStatus('saved');
    } catch {
      setStickySaveStatus('error');
    }
    clearTimeout(stickySaveTimerRef.current);
    stickySaveTimerRef.current = setTimeout(() => setStickySaveStatus(null), 2500);
  }, [selectedPatient?.id, stickyText]);

  const onStickyMouseDown = (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
    stickyDragging.current = true;
    stickyOffset.current = { x: e.clientX - stickyPos.x, y: e.clientY - stickyPos.y };
    document.addEventListener('mousemove', onStickyMouseMove);
    document.addEventListener('mouseup', onStickyMouseUp);
  };
  const onStickyMouseMove = (e) => {
    if (!stickyDragging.current) return;
    setStickyPos({ x: e.clientX - stickyOffset.current.x, y: e.clientY - stickyOffset.current.y });
  };
  const onStickyMouseUp = () => {
    stickyDragging.current = false;
    document.removeEventListener('mousemove', onStickyMouseMove);
    document.removeEventListener('mouseup', onStickyMouseUp);
  };

  // ── Encounter Timer (Athena-style) ────────────────────────
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef(null);

  const startTimer = () => {
    if (timerRunning) return;
    setTimerRunning(true);
    timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
  };
  const stopTimer = () => {
    setTimerRunning(false);
    clearInterval(timerRef.current);
  };
  const resetTimer = () => {
    stopTimer();
    setTimerSeconds(0);
  };
  const formatTimer = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Auto-start timer when switching to encounters tab
  useEffect(() => {
    if (tab === 'encounters' && !timerRunning && timerSeconds === 0) {
      startTimer();
    }
  }, [tab]);

  // Cleanup timer
  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Order group state ────────────────────────────────────
  const [orderGroupName, setOrderGroupName] = useState('');
  const BLANK_ORDER = { type: 'Lab', priority: 'Routine', notes: '', description: '', labPanel: '', labNetwork: '', labAddress: '', labPhone: '', _labSearch: '', medName: '', medDose: '', medRoute: 'Oral', medFrequency: '', medQuantity: '30', medRefills: '0', medSig: '', medDispenseAsWritten: false, medPharmacy: '', medPharmAddress: '', medPharmPhone: '', medPharmFax: '', imgModality: 'X-ray', imgBodyPart: '', imgLaterality: 'N/A', imgReason: '', refSpecialty: 'Psychiatry', refProvider: '', refReason: '',
    // ── Auto-populate tracking ─────────────────────────────────────────────
    _pharmAutoSource: null,     // sourceLabel string when pharmacy was auto-filled
    _showActiveMeds: false,     // collapsible active-meds panel
    _sigSuggestions: [],        // [{ sig, source, label }]
  };
  const [orderGroupItems, setOrderGroupItems] = useState([{ ...BLANK_ORDER }]);
  const [orderGroupSaved, setOrderGroupSaved] = useState(false);
  const [showPatientLetter, setShowPatientLetter] = useState(false);
  const [patientLetter, setPatientLetter] = useState({ subject: '', body: '', delivery: 'portal' });
  const [letterTemplateOpen, setLetterTemplateOpen] = useState(false);

  // ── Patient Letters panel state ──────────────────────────
  const [lettersDelivery, setLettersDelivery] = useState('portal');
  const [lettersSubject, setLettersSubject] = useState('');
  const [lettersBody, setLettersBody] = useState('');
  const [lettersSent, setLettersSent] = useState(false);
  const [lettersCategoryFilter, setLettersCategoryFilter] = useState('all');
  const [lettersSearch, setLettersSearch] = useState('');

  // ── Referral panel state ─────────────────────────────────
  const [referralData, setReferralData] = useState({ specialty: 'Psychiatry', provider: '', reason: '', urgency: 'Routine', notes: '', delivery: 'fax' });
  const [referralSent, setReferralSent] = useState(false);

  // ── Quick Labs panel state ───────────────────────────────
  const [selectedLabs, setSelectedLabs] = useState([]);
  const [labPriority, setLabPriority] = useState('Routine');
  const [labNotes, setLabNotes] = useState('');
  const [labsSent, setLabsSent] = useState(false);
  const [quickLabSearch, setQuickLabSearch] = useState('');
  const [quickLabSelected, setQuickLabSelected] = useState(null);
  const [showQuickLabDrop, setShowQuickLabDrop] = useState(false);

  // ── Pharmacy drawer ──────────────────────────────────────
  const [pharmDrawerOpen,      setPharmDrawerOpen]      = useState(false);
  const [pharmDrawerTargetIdx, setPharmDrawerTargetIdx] = useState(null);

  // ── PDMP state ─────────────────────────────────────────────────────────────
  const [pdmpOpen,         setPdmpOpen]         = useState(false);
  const [pdmpReport,       setPdmpReport]        = useState(null);
  const [pdmpTargetIdx,    setPdmpTargetIdx]     = useState(null);
  const [pdmpMedName,      setPdmpMedName]       = useState('');
  const [pdmpAcknowledged, setPdmpAcknowledged] = useState({});   // { orderIdx: true }
  const [pdmpRequering,    setPdmpRequering]     = useState(false);

  // ── Assessment Scorer ────────────────────────────────────
  const [assessScorerOpen,  setAssessScorerOpen]  = useState(false);
  const [assessmentHistory, setAssessmentHistory] = useState({});

  // ── Safety Plan ──────────────────────────────────────────
  const [safetyPlanOpen,  setSafetyPlanOpen]  = useState(false);
  const [safetyPlanData,  setSafetyPlanData]  = useState(null);

  // ── Adherence Timeline ───────────────────────────────────
  const [adherenceOpen, setAdherenceOpen] = useState(false);

  // ── Prior Auth Drawer ────────────────────────────────────
  const [priorAuthOpen, setPriorAuthOpen] = useState(false);
  const [priorAuthList, setPriorAuthList] = useState([]);

  // ── Patient Portal Inbox ─────────────────────────────────
  const [portalInboxOpen, setPortalInboxOpen] = useState(false);

  // ── Split-pane left rail ──────────────────────────────────
  const [railCollapsed, setRailCollapsed] = useState(() => {
    try { return localStorage.getItem('chart_rail_collapsed') === '1'; } catch { return false; }
  });
  const toggleRail = () => setRailCollapsed(v => {
    const next = !v;
    try { localStorage.setItem('chart_rail_collapsed', next ? '1' : '0'); } catch { /* */ }
    return next;
  });

  // ── Diagnoses & Orders Composer ──────────────────────────
  const [composerOpen, setComposerOpen] = useState(false);

  // ── Lab location dropdown ────────────────────────────────
  const [labDropdownIdx, setLabDropdownIdx] = useState(null);

  // ── Sample letter templates ──────────────────────────────
  const PRACTICE_NAME    = 'Advanced Practice Medical Group';
  const PRACTICE_ADDRESS = '2280 Hicks Rd Suite 508, Rolling Meadows, IL 60008';
  const PRACTICE_PHONE   = '(847) 371-5200';

  const getLetterTemplates = () => {
    const providerName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}${currentUser?.credentials ? ', ' + currentUser.credentials : ''}`;
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const practiceBlock = `${PRACTICE_NAME}\n${PRACTICE_ADDRESS}\nPhone: ${PRACTICE_PHONE}`;
    const patName = `${p.firstName} ${p.lastName}`;
    const patDOB = p.dob;
    const patProbs = patProblems.map(pr => pr.name || pr.problem).join(', ') || 'N/A';
    const patMedsList = patMeds.map(m => `${m.name} ${m.dose || ''}`).join(', ') || 'N/A';

    return [
      // ── Clinical Documentation ──────────────────────────
      {
        id: 'encounter-summary',
        icon: '📋',
        label: 'Encounter / Visit Summary',
        category: 'clinical',
        subject: 'Visit Summary',
        body: `${today}\n\nDear ${p.firstName},\n\nThank you for your visit on ${today}. Below is a summary of your appointment:\n\nPATIENT: ${patName} (DOB: ${patDOB}, MRN: ${p.mrn})\n\nDIAGNOSES:\n${patProblems.length > 0 ? patProblems.map(pr => `  • ${pr.name || pr.problem}${pr.icd10 ? ' (' + pr.icd10 + ')' : ''}`).join('\n') : '  • See chart for details'}\n\nCURRENT MEDICATIONS:\n${patMeds.length > 0 ? patMeds.map(m => `  • ${m.name} ${m.dose || ''} ${m.route || ''} ${m.frequency || ''}`).join('\n') : '  • No active medications'}\n\nPLAN:\n• [Treatment plan details]\n• [Medication changes if any]\n• [Follow-up instructions]\n\nNEXT APPOINTMENT: ${p.nextAppointment || '[To be scheduled]'}\n\nIf you experience any worsening symptoms, side effects, or have questions about your treatment plan, please contact our office immediately.\n\nFor emergencies, call 911 or go to your nearest emergency room.\nSuicide & Crisis Lifeline: 988\n\nSincerely,\n${providerName}\n${practiceBlock}`,
      },
      {
        id: 'problem-list',
        icon: '🩺',
        label: 'Patient Problem List',
        category: 'clinical',
        subject: 'Patient Problem List Summary',
        body: `${today}\n\nPATIENT PROBLEM LIST\n${'═'.repeat(40)}\n\nPatient: ${patName}\nDOB: ${patDOB}\nMRN: ${p.mrn}\nGenerated by: ${providerName}\n\nACTIVE PROBLEMS:\n${patProblems.length > 0 ? patProblems.map((pr, i) => `  ${i + 1}. ${pr.name || pr.problem}${pr.icd10 ? '  [' + pr.icd10 + ']' : ''}${pr.onset ? '  (Onset: ' + pr.onset + ')' : ''}${pr.status ? '  Status: ' + pr.status : ''}`).join('\n') : '  No active problems documented.'}\n\nCURRENT MEDICATIONS:\n${patMeds.length > 0 ? patMeds.map((m, i) => `  ${i + 1}. ${m.name} ${m.dose || ''} ${m.route || ''} ${m.frequency || ''}`).join('\n') : '  No active medications.'}\n\nALLERGIES:\n${patAllergies.length > 0 ? patAllergies.map(a => `  • ${a.allergen || a.name || a} — ${a.reaction || 'Reaction not specified'} (${a.severity || 'Severity unknown'})`).join('\n') : '  NKDA (No Known Drug Allergies)'}\n\nThis summary was generated from the electronic health record and is current as of the date listed above.\n\n— ${providerName}`,
      },
      {
        id: 'medication-list',
        icon: '💊',
        label: 'Medication List Letter',
        category: 'clinical',
        subject: 'Current Medication List',
        body: `${today}\n\nTo Whom It May Concern,\n\nRE: ${patName} (DOB: ${patDOB}, MRN: ${p.mrn})\n\nThe following is a current medication list for ${patName}, as maintained in our clinical records:\n\nCURRENT MEDICATIONS:\n${patMeds.length > 0 ? patMeds.map((m, i) => `  ${i + 1}. ${m.name} ${m.dose || ''} ${m.route || ''} ${m.frequency || ''}\n     Indication: ${patProblems[0]?.name || '[See chart]'}`).join('\n') : '  No active medications on file.'}\n\nALLERGIES / ADVERSE REACTIONS:\n${patAllergies.length > 0 ? patAllergies.map(a => `  • ${a.allergen || a.name} — ${a.reaction || 'Unknown'} (${a.severity || 'Unknown severity'})`).join('\n') : '  NKDA — No Known Drug Allergies'}\n\nThis medication list is current as of ${today} and was generated from the electronic health record.\n\nSincerely,\n${providerName}\nNPI: ${currentUser?.npi || '[NPI Number]'}\n${practiceBlock}`,
      },
      {
        id: 'treatment-verification',
        icon: '✅',
        label: 'Treatment / Attendance Verification',
        category: 'clinical',
        subject: 'Verification of Mental Health Treatment',
        body: `${today}\n\nTo Whom It May Concern,\n\nThis letter serves as verification that ${patName} (DOB: ${patDOB}) is currently an active patient at our practice and is receiving ongoing mental health treatment.\n\nTREATMENT DETAILS:\n• Patient Name: ${patName}\n• Date of Birth: ${patDOB}\n• Treatment Start Date: [Date]\n• Frequency of Visits: [Weekly / Biweekly / Monthly]\n• Treatment Type: [Medication Management / Psychotherapy / Both]\n• Currently Active in Care: Yes\n\nThis information is provided at the patient's request and with their written authorization. Specific clinical details have been omitted to protect patient confidentiality unless otherwise authorized.\n\nIf you have any questions, please contact our office.\n\nSincerely,\n${providerName}\nNPI: ${currentUser?.npi || '[NPI Number]'}\n${practiceBlock}`,
      },

      // ── Work & Employment ───────────────────────────────
      {
        id: 'fmla',
        icon: '🏥',
        label: 'FMLA / Medical Leave of Absence',
        category: 'work',
        subject: 'Medical Leave of Absence — FMLA Documentation',
        body: `${today}\n\nTo Whom It May Concern,\n\nRE: Family and Medical Leave Act (FMLA) Certification for ${patName}\n\nI am the treating physician/provider for ${patName} (DOB: ${patDOB}), who has been under my care for a serious health condition.\n\nFMLA CERTIFICATION:\n• Condition: [Diagnosis / Mental Health Condition — do not specify without patient consent]\n• Date Condition Commenced: [Date]\n• Probable Duration of Condition: [Duration]\n• Medical Necessity for Leave: Yes\n\nLEAVE DETAILS:\n[ ] Continuous leave\n[ ] Intermittent leave — estimated frequency: [e.g., 2 days per month]\n[ ] Reduced schedule — estimated hours: [e.g., 20 hours/week]\n\nEstimated return to full duty: [Date or "Ongoing"]\n\nThis patient is unable to perform the essential functions of their position due to the medical condition described above.\n\nSincerely,\n${providerName}\nNPI: ${currentUser?.npi || '[NPI Number]'}\n${practiceBlock}`,
      },
      {
        id: 'return-work',
        icon: '💼',
        label: 'Return to Work Clearance',
        category: 'work',
        subject: 'Return to Work Medical Clearance',
        body: `${today}\n\nTo Whom It May Concern,\n\nThis letter is to certify that ${patName} (DOB: ${patDOB}) has been under my care and was absent from work from [Start Date] through [End Date] due to a medical/mental health condition.\n\nCLEARANCE:\nI am pleased to confirm that ${p.firstName} is now medically cleared to return to work effective [Return Date].\n\nWORK RESTRICTIONS (if applicable):\n[ ] No restrictions — full duty\n[ ] Light duty for [duration]: [specify restrictions]\n[ ] Modified schedule: [hours/days]\n[ ] No [specify tasks] until [date]\n\nRecommendations:\n• Follow-up appointment scheduled for: [Date]\n• [Any additional workplace accommodations]\n\nPlease contact our office if you need further clarification.\n\nSincerely,\n${providerName}\n${practiceBlock}`,
      },
      {
        id: 'work-restrictions',
        icon: '⚠️',
        label: 'Work Restrictions / Modified Duty',
        category: 'work',
        subject: 'Work Restriction Letter',
        body: `${today}\n\nTo Whom It May Concern,\n\nRE: Work Restrictions for ${patName} (DOB: ${patDOB})\n\nThis letter is to inform you that ${patName} is currently under my psychiatric/medical care and requires the following work restrictions due to a medical condition:\n\nREQUIRED RESTRICTIONS (effective ${today} through [End Date]):\n• [ ] No night shifts / No shift work\n• [ ] Maximum [__] hours per day / [__] hours per week\n• [ ] No high-stress environments or time-critical deadlines\n• [ ] Remote work accommodation preferred\n• [ ] Flexible start time (preferred start no earlier than [time])\n• [ ] Reduced workload — no more than [__]% of standard duties\n• [ ] No customer-facing responsibilities\n• [ ] Other: [specify]\n\nThese restrictions are medically necessary and are expected to be temporary. The patient will be reassessed at their next appointment.\n\nSincerely,\n${providerName}\n${practiceBlock}`,
      },
      {
        id: 'work-absence-excuse',
        icon: '📅',
        label: 'Work Absence / Excused Absence',
        category: 'work',
        subject: 'Medical Excuse — Absence from Work',
        body: `${today}\n\nTo Whom It May Concern,\n\nThis letter certifies that ${patName} (DOB: ${patDOB}) was seen in our office and/or was under medical care and unable to report to work on the following date(s):\n\n• Date(s) of Absence: [Date or Date Range]\n• Reason: Medical appointment / Medical condition requiring rest\n\n${p.firstName} is expected to return to work on: [Return Date]\n\nPlease excuse ${p.firstName}'s absence from work as medically necessary.\n\nSincerely,\n${providerName}\n${practiceBlock}`,
      },

      // ── School ──────────────────────────────────────────
      {
        id: 'return-school',
        icon: '🎓',
        label: 'Return to School Clearance',
        category: 'school',
        subject: 'Return to School Medical Clearance',
        body: `${today}\n\nTo Whom It May Concern,\n\nThis letter is to certify that ${patName} (DOB: ${patDOB}) has been under my psychiatric/medical care.\n\n${p.firstName} was unable to attend school/classes from [Start Date] through [End Date] due to a medical/mental health condition requiring treatment.\n\nI am pleased to confirm that ${p.firstName} is now medically cleared to return to school effective [Return Date].\n\nRecommendations for transition back:\n• [Any academic accommodations needed]\n• [Gradual return schedule if applicable]\n• [Follow-up appointment scheduled for: Date]\n\nPlease provide any attendance or academic make-up accommodations as needed during this transition period.\n\nIf you have any questions or need additional information, please contact our office.\n\nSincerely,\n${providerName}\n${practiceBlock}`,
      },
      {
        id: 'school-accommodation',
        icon: '🏫',
        label: 'School Academic Accommodation',
        category: 'school',
        subject: 'Request for Academic Accommodation — Medical Documentation',
        body: `${today}\n\nTo Whom It May Concern,\n\nI am writing on behalf of my patient, ${patName} (DOB: ${patDOB}), who is currently receiving treatment for a mental health condition at our practice.\n\nBased on my clinical evaluation, I am requesting the following academic accommodations in accordance with the Americans with Disabilities Act (ADA) and/or Section 504:\n\nREQUESTED ACCOMMODATIONS:\n• [ ] Extended time on tests and assignments (1.5x or 2x)\n• [ ] Quiet, distraction-reduced testing environment\n• [ ] Flexible attendance / excused absences for medical appointments\n• [ ] Extended deadlines for assignments\n• [ ] Preferred seating\n• [ ] Note-taking assistance\n• [ ] Access to recorded lectures\n• [ ] Reduced course load (if applicable)\n• Other: [specify]\n\nThese accommodations are medically necessary and will enable ${p.firstName} to access their education on an equal basis. This condition is expected to be ongoing.\n\nSincerely,\n${providerName}\nNPI: ${currentUser?.npi || '[NPI Number]'}\n${practiceBlock}`,
      },
      {
        id: 'school-absence-excuse',
        icon: '📝',
        label: 'School Absence Excuse',
        category: 'school',
        subject: 'Medical Excuse — School Absence',
        body: `${today}\n\nTo Whom It May Concern,\n\nThis letter certifies that ${patName} (DOB: ${patDOB}) is a patient under my care and was unable to attend school on the following date(s):\n\n• Date(s) of Absence: [Date or Date Range]\n• Reason: Medical appointment / Illness requiring rest\n\n${p.firstName} is expected to return to school on: [Return Date]\n\nPlease excuse ${p.firstName}'s absence(s) as medically necessary and allow make-up work accordingly.\n\nSincerely,\n${providerName}\n${practiceBlock}`,
      },

      // ── Housing ─────────────────────────────────────────
      {
        id: 'esa',
        icon: '🐾',
        label: 'Emotional Support Animal (ESA)',
        category: 'housing',
        subject: 'Emotional Support Animal Letter',
        body: `${today}\n\nTo Whom It May Concern,\n\nI am writing to confirm that ${patName} (DOB: ${patDOB}) is a patient currently under my care. I am a licensed mental health provider and have been treating ${p.firstName} for a diagnosed mental health condition.\n\nBased on my professional assessment, ${p.firstName} has a disability-related need for an Emotional Support Animal (ESA). The presence of an ESA is a critical component of ${p.firstName}'s treatment plan and provides therapeutic benefit by alleviating one or more identified symptoms of their condition, including but not limited to:\n\n• Reduction of anxiety and panic symptoms\n• Mitigation of depressive episodes\n• Improvement in overall emotional regulation\n• Enhanced sense of security and stability\n\nUnder the Fair Housing Act (FHA), ${p.firstName} is entitled to reasonable accommodation to keep an emotional support animal in their residence, even in housing with a "no pets" policy, without being charged additional pet fees or deposits.\n\nThis letter is valid for one year from the date of issuance. Please feel free to contact me if you have any questions.\n\nSincerely,\n${providerName}\nLicense #: [License Number]\n${practiceBlock}`,
      },
      {
        id: 'housing-accommodation',
        icon: '🏠',
        label: 'Housing Disability Accommodation',
        category: 'housing',
        subject: 'Request for Reasonable Housing Accommodation',
        body: `${today}\n\nTo Whom It May Concern,\n\nRE: Request for Reasonable Accommodation under the Fair Housing Act\n\nI am the treating provider for ${patName} (DOB: ${patDOB}), who has a disability as defined under the Fair Housing Act and the Americans with Disabilities Act.\n\n${p.firstName}'s disability substantially limits one or more major life activities. As a result, the following housing accommodations are medically necessary:\n\nREQUESTED ACCOMMODATIONS:\n• [ ] Ground-floor unit (mobility/panic disorder)\n• [ ] Unit away from high-traffic areas (sensory sensitivity/PTSD)\n• [ ] Permission to have an emotional support animal\n• [ ] Reserved/accessible parking space\n• [ ] Modified lease terms for medical necessity\n• Other: [specify]\n\nI confirm that there is a nexus between ${p.firstName}'s disability and the accommodation requested above. Denial of this accommodation would negatively impact ${p.firstName}'s health and well-being.\n\nSincerely,\n${providerName}\nNPI: ${currentUser?.npi || '[NPI Number]'}\n${practiceBlock}`,
      },

      // ── Legal & Benefits ────────────────────────────────
      {
        id: 'disability',
        icon: '🛡️',
        label: 'Disability Documentation (SSA/SSDI)',
        category: 'legal',
        subject: 'Medical Documentation — Disability Determination',
        body: `${today}\n\nTo Whom It May Concern,\n\nRE: Medical Documentation for Disability Determination\nPatient: ${patName} (DOB: ${patDOB})\n\nI am the treating mental health provider for ${patName} and am providing this letter in support of ${p.firstName}'s disability claim.\n\nCLINICAL FINDINGS:\n• Diagnoses: ${patProbs}\n• Duration of Treatment: [Start Date — Present]\n• Functional Limitations:\n  — Difficulty maintaining concentration and focus\n  — Impaired ability to manage stress and workplace demands\n  — [List other specific limitations]\n  — Unable to engage in substantial gainful activity due to the above\n\nFREQUENCY OF TREATMENT:\n• Currently seen [frequency] for [medication management / therapy]\n• Current medications: ${patMedsList}\n\nCONCLUSION:\nBased on my clinical assessment, ${patName}'s psychiatric condition significantly impairs their ability to maintain full-time employment. I support ${p.firstName}'s application for disability benefits.\n\nPlease do not hesitate to contact my office for additional records or documentation.\n\nSincerely,\n${providerName}\nNPI: ${currentUser?.npi || '[NPI Number]'}\n${practiceBlock}`,
      },
      {
        id: 'short-long-disability',
        icon: '📄',
        label: 'Short/Long-Term Disability Insurance',
        category: 'legal',
        subject: 'Physician Statement — Disability Insurance Claim',
        body: `${today}\n\nTo Whom It May Concern,\n\nRE: Disability Insurance Claim — ${patName} (DOB: ${patDOB})\nInsurance Claim #: [Claim Number]\n\nI am the treating provider for ${patName}. This letter is provided in support of ${p.firstName}'s claim for [short-term / long-term] disability benefits.\n\nCLINICAL INFORMATION:\n• Primary Diagnosis: [Diagnosis]\n• ICD-10 Code: [Code]\n• Date First Treated: [Date]\n• Date Disability Commenced: [Date]\n• Expected Duration: [Duration or "Indefinite — to be reassessed"]\n\nFUNCTIONAL LIMITATIONS:\n${p.firstName} is currently unable to perform the following due to their condition:\n• [Specific job function limitations]\n• Unable to maintain a full work schedule\n• Unable to manage occupational stress at current level\n\nThis disability is [temporary / permanent] and is expected to prevent ${p.firstName} from performing their occupational duties during the specified period.\n\nSincerely,\n${providerName}\nNPI: ${currentUser?.npi || '[NPI Number]'}\n${practiceBlock}`,
      },
      {
        id: 'ada-accommodation',
        icon: '♿',
        label: 'ADA Workplace Accommodation',
        category: 'legal',
        subject: 'ADA Reasonable Accommodation Letter',
        body: `${today}\n\nTo Whom It May Concern,\n\nI am writing on behalf of my patient, ${patName} (DOB: ${patDOB}), who is currently under my care for the treatment of a mental health condition.\n\nBased on my clinical evaluation and ongoing treatment, ${p.firstName} has a condition that substantially limits one or more major life activities. In accordance with the Americans with Disabilities Act (ADA) and/or Section 504 of the Rehabilitation Act, I am recommending the following reasonable accommodations:\n\n• [ ] Flexible schedule (start/end times or breaks for treatment)\n• [ ] Work-from-home / remote work option\n• [ ] Reduced workload or modified job duties\n• [ ] Quiet workspace or private office\n• [ ] Frequent short breaks during the workday\n• [ ] Additional time for tasks requiring concentration\n• Other: [Accommodation]\n\nThese accommodations are medically necessary and directly related to ${p.firstName}'s condition. They will enable ${p.firstName} to perform essential functions of their role.\n\nSincerely,\n${providerName}\nNPI: ${currentUser?.npi || '[NPI Number]'}\n${practiceBlock}`,
      },
      {
        id: 'insurance-appeal',
        icon: '⚖️',
        label: 'Insurance Appeal — Medical Necessity',
        category: 'legal',
        subject: 'Appeal: Medical Necessity for Continued Treatment',
        body: `${today}\n\nVia Fax / Certified Mail\n\n[Insurance Company Name]\n[Address]\n\nRE: Appeal for Medical Necessity\nMember Name: ${patName}\nMember ID: ${p.insurance?.primary?.memberId || '[Member ID]'}\nGroup #: ${p.insurance?.primary?.groupNumber || '[Group Number]'}\nClaim/Reference #: [Reference Number]\n\nDear Appeals Review Board,\n\nI am writing to appeal the denial of [service/medication/treatment] for my patient, ${patName}, on the grounds of medical necessity.\n\nCLINICAL JUSTIFICATION:\n• Diagnosis: ${patProbs}\n• Treatment Requested: [Specific treatment/medication]\n• Why Medically Necessary: [Clinical rationale]\n• Alternative Treatments Tried and Failed:\n  — [Treatment 1: dates, doses, outcome]\n  — [Treatment 2: dates, doses, outcome]\n• Risk of Denial: Without this treatment, ${p.firstName} faces significant risk of [hospitalization / worsening symptoms / functional decline].\n\nSupporting clinical documentation is enclosed. I respectfully request a peer-to-peer review if denial is upheld.\n\nSincerely,\n${providerName}\nNPI: ${currentUser?.npi || '[NPI Number]'}\n${practiceBlock}`,
      },
      {
        id: 'legal-court',
        icon: '⚖️',
        label: 'Court / Legal Documentation',
        category: 'legal',
        subject: 'Psychiatric Letter for Legal Proceedings',
        body: `${today}\n\nTo Whom It May Concern,\n\nRE: ${patName} (DOB: ${patDOB})\nCase/Docket #: [Case Number]\n\nI am the treating [psychiatrist / mental health provider] for ${patName} and have been providing care since [Date].\n\nThis letter is provided at the patient's request for use in legal proceedings.\n\nCLINICAL SUMMARY:\n• Diagnoses: ${patProbs}\n• Current treatment: [Medication Management / Therapy]\n• Treatment compliance: [Good / Fair / Poor]\n• Current functional status: [Brief description]\n\nCLINICAL OPINION:\n[Specify the clinical opinion relevant to the legal matter, e.g., fitness to stand trial, capacity, mental state, etc.]\n\nIMPORTANT NOTE: This letter represents my clinical opinion as the treating provider and is not a substitute for a formal forensic psychiatric evaluation.\n\nSincerely,\n${providerName}\nNPI: ${currentUser?.npi || '[NPI Number]'}\n${practiceBlock}`,
      },

      // ── Travel ──────────────────────────────────────────
      {
        id: 'travel-medication',
        icon: '✈️',
        label: 'Travel / Medication Letter (TSA/Airport)',
        category: 'travel',
        subject: 'Traveling with Prescription Medication — Physician Letter',
        body: `${today}\n\nTo Whom It May Concern,\n\nThis letter is to confirm that ${patName} (DOB: ${patDOB}) is a patient under my care and has been prescribed the following medications as part of their ongoing medical treatment:\n\nPRESCRIBED MEDICATIONS FOR TRAVEL:\n${patMeds.length > 0 ? patMeds.map(m => `  • ${m.name} ${m.dose || ''} — ${m.frequency || ''}`).join('\n') : '  • [Medication Name, Dose, Frequency]'}\n\nThese medications are medically necessary and must be kept with the patient at all times, including during air travel. Some medications may require special handling (e.g., refrigeration, syringes, or liquid quantities exceeding standard TSA limits).\n\nI respectfully request that security personnel and customs officials allow ${patName} to travel with these medications.\n\nFor questions, please contact our office.\n\nSincerely,\n${providerName}\nNPI: ${currentUser?.npi || '[NPI Number]'}\nPhone: ${PRACTICE_PHONE}\n${practiceBlock}`,
      },
      {
        id: 'travel-international',
        icon: '🌍',
        label: 'International Travel / Controlled Substances',
        category: 'travel',
        subject: 'International Travel — Controlled Substance Documentation',
        body: `${today}\n\nTo Whom It May Concern / To the Relevant Customs Authority,\n\nRE: Medical Documentation for International Travel with Controlled Substances\n\nI certify that ${patName} (DOB: ${patDOB}, Passport #: [Passport Number]) is a patient under my care and has been prescribed the following controlled substance(s) as medically necessary:\n\nCONTROLLED MEDICATIONS:\n${patMeds.filter(m => m.controlled || m.schedule).length > 0 ? patMeds.filter(m => m.controlled || m.schedule).map(m => `  • ${m.name} ${m.dose || ''} — ${m.frequency || ''}\n    Schedule: [Schedule II/III/IV/V]\n    Quantity for Travel: [30-day supply]`).join('\n') : '  • [Medication Name]\n    [Schedule and dose]\n    [Quantity for travel]'}\n\nThe patient has a legitimate medical need for these medications and is carrying the quantity necessary for the duration of their travel ([Travel Dates]).\n\nThis documentation is provided to assist the patient in clearing customs and complying with international regulations regarding controlled substances.\n\nSincerely,\n${providerName}\nDEA #: ${currentUser?.deaNumber || '[DEA Number]'}\nNPI: ${currentUser?.npi || '[NPI Number]'}\n${practiceBlock}`,
      },

      // ── Special Programs ────────────────────────────────
      {
        id: 'prior-auth',
        icon: '📋',
        label: 'Prior Authorization Support Letter',
        category: 'clinical',
        subject: 'Prior Authorization — Medical Necessity',
        body: `${today}\n\nTo Whom It May Concern,\n\nRE: Prior Authorization Request for ${patName} (DOB: ${patDOB})\nMember ID: ${p.insurance?.primary?.memberId || '[Member ID]'}\nInsurance: ${p.insurance?.primary?.name || '[Insurance]'}\n\nI am requesting prior authorization for the following:\n\nSERVICE / MEDICATION REQUESTED: [Name]\nCPT / NDC Code: [Code]\nFrequency / Duration: [e.g., Weekly x 12 weeks]\n\nCLINICAL JUSTIFICATION:\n• Primary Diagnosis: ${patProbs}\n• Why this treatment is medically necessary: [Rationale]\n• Previous treatments tried (step therapy):\n  — [Treatment 1, dates, outcome]\n  — [Treatment 2, dates, outcome]\n• Anticipated outcome without treatment: [Risk]\n\nSupporting records are available upon request. Please process urgently as delays may result in clinical deterioration.\n\nSincerely,\n${providerName}\nNPI: ${currentUser?.npi || '[NPI Number]'}\n${practiceBlock}`,
      },
      {
        id: 'spravato',
        icon: '💉',
        label: 'Spravato (Esketamine) Letter',
        category: 'clinical',
        subject: 'Spravato (Esketamine) Treatment Authorization',
        body: `${today}\n\nTo Whom It May Concern,\n\nRE: ${patName} (DOB: ${patDOB})\n\nI am writing to document the medical necessity for Spravato® (esketamine) nasal spray treatment for my patient, ${patName}.\n\nCLINICAL JUSTIFICATION:\n${p.firstName} has been diagnosed with Treatment-Resistant Depression (TRD). ${p.firstName} has had an inadequate response to at least two adequate trials of oral antidepressant medications, including:\n\n• [Medication 1, dose, duration, response]\n• [Medication 2, dose, duration, response]\n\nCurrent psychiatric medications:\n${patMedsList}\n\nSPRAVATO TREATMENT PLAN:\n• Induction Phase (Weeks 1-4): 56 mg or 84 mg intranasally, twice weekly\n• Maintenance Phase: Once weekly or every 2 weeks, based on response\n• All treatments administered in a certified healthcare setting with 2-hour post-dose monitoring per REMS requirements\n\nThe patient has been enrolled in the Spravato REMS program and meets all eligibility criteria.\n\nPlease contact our office for any additional clinical documentation needed for prior authorization.\n\nSincerely,\n${providerName}\nDEA #: ${currentUser?.deaNumber || '[DEA Number]'}\n${practiceBlock}`,
      },

      // ── Administrative ──────────────────────────────────
      {
        id: 'accommodation',
        icon: '🤝',
        label: 'General Accommodation Request',
        category: 'admin',
        subject: 'Accommodation Letter',
        body: `${today}\n\nTo Whom It May Concern,\n\nI am writing on behalf of my patient, ${patName} (DOB: ${patDOB}), who is currently under my care for the treatment of a mental health condition.\n\nBased on my clinical evaluation and ongoing treatment, ${p.firstName} has a condition that substantially limits one or more major life activities. In accordance with the Americans with Disabilities Act (ADA) and/or Section 504 of the Rehabilitation Act, I am recommending the following reasonable accommodations:\n\n• [Accommodation 1]\n• [Accommodation 2]\n• [Accommodation 3]\n\nThese accommodations are medically necessary and directly related to ${p.firstName}'s condition. They will enable ${p.firstName} to perform essential functions and participate fully in their activities.\n\nPlease do not hesitate to contact our office if you require additional information.\n\nSincerely,\n${providerName}\nNPI: ${currentUser?.npi || '[NPI Number]'}\n${practiceBlock}`,
      },
      {
        id: 'thank-you',
        icon: '💛',
        label: 'Thank You Letter',
        category: 'admin',
        subject: 'Thank You for Your Visit',
        body: `${today}\n\nDear ${p.firstName},\n\nThank you for choosing our practice for your mental health care. It was a pleasure seeing you at your recent appointment.\n\nYour health and well-being are our top priority, and we value the trust you place in our team. We are committed to supporting you on your wellness journey.\n\nAs a reminder:\n• Your next appointment is: ${p.nextAppointment || '[Please call to schedule]'}\n• Continue taking all medications as prescribed\n• Don't hesitate to reach out if you have any questions or concerns between visits\n\nWe encourage you to use the patient portal for:\n• Secure messaging with your care team\n• Reviewing your visit summaries and lab results\n• Requesting prescription refills\n• Scheduling appointments\n\nThank you again for trusting us with your care. We look forward to seeing you at your next visit.\n\nWarm regards,\n${providerName}\n${practiceBlock}`,
      },
      {
        id: 'discharge',
        icon: '📤',
        label: 'Discharge from Practice',
        category: 'admin',
        subject: 'Notice of Discharge from Practice',
        body: `${today}\n\nDear ${p.firstName},\n\nVIA CERTIFIED MAIL / RETURN RECEIPT REQUESTED\n\nRE: Notification of Termination of Provider-Patient Relationship\n\nI am writing to inform you that I will no longer be able to serve as your healthcare provider, effective [Date — typically 30 days from letter date].\n\nREASON: [Select one: Non-compliance with treatment plan / Missed appointments / Other — specify]\n\nUntil the effective date, I will continue to provide necessary care. To ensure continuity of your treatment, I recommend the following:\n\n1. FIND A NEW PROVIDER: Contact your insurance company for a list of in-network mental health providers in your area, or visit psychologytoday.com.\n\n2. PRESCRIPTION COVERAGE: I will provide a [30/60/90]-day supply of your current medications to bridge until you establish care with a new provider.\n\nCurrent medications:\n${patMedsList}\n\n3. MEDICAL RECORDS: You may request a copy of your records by submitting a signed release of information to our office.\n\n4. CRISIS RESOURCES:\n   • 988 Suicide & Crisis Lifeline: Call or text 988\n   • Crisis Text Line: Text HOME to 741741\n   • Nearest Emergency Room\n\nThis letter will be retained in your medical record.\n\nSincerely,\n${providerName}\n${practiceBlock}`,
      },
    ];
  };

  // ── Forms state ──────────────────────────────────────────
  const [formDelivery, setFormDelivery] = useState('portal');
  const [formsSent, setFormsSent] = useState(false);
  const [selectedForms, setSelectedForms] = useState([]);

  // ── Export state ─────────────────────────────────────────
  const [exportSections, setExportSections] = useState(['demographics', 'problems', 'medications', 'allergies', 'vitals', 'labs', 'assessments', 'immunizations']);
  const [exportFormat, setExportFormat] = useState('PDF');
  const [exportStarted, setExportStarted] = useState(false);

  useEffect(() => {
    if (patientId) {
      openChart(patientId);
    }
  }, [patientId, openChart]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!selectedPatient) {
    return (
      <div className="empty-state">
        <h3>No Patient Selected</h3>
        <p>Search for a patient to open their chart.</p>
        <button className="btn btn-primary mt-4" onClick={() => navigate('/patients')}>
          Search Patients
        </button>
      </div>
    );
  }

  const p = selectedPatient;
  const caps = getCapabilities(currentUser);
  const visibleTabs = getVisibleTabs(currentUser);

  // Redirect to summary if user lands on a tab they lack capability for
  const activeTab = (() => {
    const requested = tab || 'summary';
    const tabDef = ALL_CHART_TABS.find(t => t.key === requested);
    if (tabDef?.requiresCap && !caps[tabDef.requiresCap]) return 'summary';
    return requested;
  })();

  const ActiveComponent = visibleTabs.find((t) => t.key === activeTab)?.component || ChartSummary;

  const patAllergies = allergies[patientId] || [];
  const patProblems = problemList[patientId] || [];
  const patVitals = vitalSigns[patientId] || [];
  const patMeds = meds[patientId] || [];
  const patLabs = labResults[patientId] || [];
  const patAssessments = assessmentScores[patientId] || [];
  const patImmunizations = immunizations[patientId] || [];
  const patOrders = orders[patientId] || [];
  const patEncounters = encounters[patientId] || [];

  const openPanel = (panel) => {
    setActivePanel(panel);
    setMenuOpen(false);
    setOrderGroupSaved(false);
    setFormsSent(false);
    setExportStarted(false);
  };

  const closePanel = () => setActivePanel(null);

  // ── Panel print utility ──────────────────────────────────
  const openPrintWindow = (html) => {
    const win = window.open('', '_blank', 'width=960,height=720');
    if (!win) { alert('Please allow pop-ups to print.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  };

  const buildPrintShell = (title, body) => {
    const css = `
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:28px 36px}
      h1{font-size:19px;font-weight:800;color:#1d4ed8;letter-spacing:-.5px}
      h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#374151;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin:16px 0 6px}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1d4ed8;padding-bottom:12px;margin-bottom:14px}
      .practice{font-size:11px;color:#6b7280;margin-top:3px;line-height:1.6}
      .meta{text-align:right;font-size:11px;color:#6b7280;line-height:1.6}
      .ptbox{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-bottom:14px;display:grid;grid-template-columns:1fr 1fr;gap:3px 16px;font-size:12px}
      .ptname{font-size:16px;font-weight:800;grid-column:1/-1;margin-bottom:4px}
      .lbl{color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.3px}
      .val{font-weight:500}
      .span2{grid-column:1/-1}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px}
      th{background:#f1f5f9;padding:6px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#475569;border:1px solid #e2e8f0}
      td{padding:7px 10px;border:1px solid #e2e8f0;vertical-align:top}
      tr:nth-child(even) td{background:#f8fafc}
      .badge{display:inline-block;font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px}
      .badge-lab{background:#dbeafe;color:#1e40af}
      .badge-rx{background:#d1fae5;color:#065f46}
      .badge-img{background:#fef3c7;color:#92400e}
      .badge-ref{background:#ede9fe;color:#5b21b6}
      .badge-proc{background:#fce7f3;color:#831843}
      .badge-allergy{background:#fee2e2;color:#991b1b}
      .nkda{color:#16a34a;font-weight:700}
      .sig-block{margin-top:36px;border-top:1px solid #cbd5e1;padding-top:12px;display:flex;gap:48px}
      .sig-line{border-bottom:1px solid #374151;width:220px;margin-top:32px;margin-bottom:3px}
      .sig-caption{font-size:10px;color:#6b7280}
      @media print{body{padding:20px}}
    `;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>${title}</title><style>${css}</style></head><body>${body}</body></html>`;
  };

  const printPanel = (panelKey, extra = {}) => {
    if (!p) return;
    const now   = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
    const provName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}${currentUser?.credentials ? ', ' + currentUser.credentials : ''}`.trim();
    const provNpi  = currentUser?.npi || '—';

    const HDR = `<div class="hdr">
      <div><h1>${PRACTICE_NAME}</h1><div class="practice">${PRACTICE_ADDRESS} &nbsp;·&nbsp; ${PRACTICE_PHONE}</div></div>
      <div class="meta">${provName}<br/>NPI: ${provNpi}<br/>${dateStr} &nbsp;${timeStr}</div>
    </div>`;

    const allergyStr = patAllergies.length
      ? patAllergies.map(a => `<span class="badge badge-allergy">${a.allergen || a.name}</span>`).join(' ')
      : '<span class="nkda">✓ NKDA</span>';

    const PT = `<div class="ptbox">
      <div class="ptname">${p.lastName}, ${p.firstName}</div>
      <div><div class="lbl">DOB</div><div class="val">${p.dob}</div></div>
      <div><div class="lbl">Sex</div><div class="val">${p.gender}</div></div>
      <div><div class="lbl">MRN</div><div class="val">${p.mrn}</div></div>
      <div><div class="lbl">Phone</div><div class="val">${p.phone || '—'}</div></div>
      <div><div class="lbl">Insurance</div><div class="val">${p.insurance?.primary?.name || '—'}</div></div>
      <div><div class="lbl">Member ID</div><div class="val">${p.insurance?.primary?.memberId || '—'}</div></div>
      <div class="span2"><div class="lbl">Allergies</div><div style="margin-top:2px">${allergyStr}</div></div>
      ${p.preferredPharmacy ? `<div class="span2"><div class="lbl">Preferred Pharmacy</div><div class="val">${p.preferredPharmacy}${p.preferredPharmacyPhone ? ' · ' + p.preferredPharmacyPhone : ''}${p.preferredPharmacyFax ? ' · Fax: ' + p.preferredPharmacyFax : ''}</div></div>` : ''}
    </div>`;

    const SIG = `<div class="sig-block">
      <div><div class="sig-line"></div><div class="sig-caption">Ordered by — ${provName}</div></div>
      <div><div class="sig-line"></div><div class="sig-caption">Signature</div></div>
      <div><div class="sig-line"></div><div class="sig-caption">Date / Time</div></div>
    </div>`;

    let body = '';
    let title = `${panelKey} — ${p.lastName}, ${p.firstName}`;

    if (panelKey === 'quickview') {
      title = `Chart Snapshot — ${p.lastName}, ${p.firstName}`;
      const activeProbs = patProblems.filter(pr => pr.status === 'Active');
      const activeMeds  = patMeds.filter(m => m.status === 'Active');
      const lv = patVitals[0];
      body = `${HDR}${PT}
        <h2>Active Problems (${activeProbs.length})</h2>
        ${activeProbs.length ? `<table><tr><th>#</th><th>Problem</th><th>ICD-10</th><th>Status</th><th>Onset</th></tr>${activeProbs.map((pr,i) => `<tr><td>${i+1}</td><td><strong>${pr.name||pr.problem||'—'}</strong></td><td>${pr.icd10||pr.code||'—'}</td><td>${pr.status||'Active'}</td><td>${pr.onset||'—'}</td></tr>`).join('')}</table>` : '<p style="color:#6b7280;margin-top:4px">No active problems documented.</p>'}
        <h2>Active Medications (${activeMeds.length})</h2>
        ${activeMeds.length ? `<table><tr><th>#</th><th>Medication</th><th>Dose</th><th>Route</th><th>Frequency</th><th>Sig</th></tr>${activeMeds.map((m,i) => `<tr><td>${i+1}</td><td><strong>${m.name}</strong></td><td>${m.dose||'—'}</td><td>${m.route||'—'}</td><td>${m.frequency||'—'}</td><td style="font-size:11px">${m.sig||'—'}</td></tr>`).join('')}</table>` : '<p style="color:#6b7280;margin-top:4px">No active medications.</p>'}
        <h2>Allergies &amp; Adverse Reactions</h2>
        ${patAllergies.length ? `<table><tr><th>Allergen</th><th>Reaction</th><th>Severity</th><th>Type</th></tr>${patAllergies.map(a => `<tr><td><strong>${a.allergen||a.name||'—'}</strong></td><td>${a.reaction||'—'}</td><td>${a.severity||'—'}</td><td>${a.type||'—'}</td></tr>`).join('')}</table>` : '<p class="nkda" style="margin-top:4px">✓ NKDA — No Known Drug Allergies</p>'}
        <h2>Latest Vitals</h2>
        ${lv ? `<table><tr><th>BP</th><th>HR</th><th>Temp</th><th>SpO2</th><th>Weight</th><th>BMI</th><th>Recorded</th></tr><tr><td>${lv.bp||'—'}</td><td>${lv.hr||'—'}</td><td>${lv.temp||'—'}°</td><td>${lv.spo2||'—'}%</td><td>${lv.weight||'—'}</td><td>${lv.bmi||'—'}</td><td>${lv.date||'—'}</td></tr></table>` : '<p style="color:#6b7280;margin-top:4px">No vitals on record.</p>'}
        <h2>Care Team &amp; Upcoming</h2>
        <table><tr><th>Next Appointment</th><th>PCP</th><th>Assigned Provider</th><th>Pending Orders</th></tr>
        <tr><td>${p.nextAppointment||'—'}</td><td>${p.pcp||'—'}</td><td>${p.assignedProvider||'—'}</td><td>${patOrders.filter(o=>o.status==='Pending').length}</td></tr></table>`;
    }

    else if (panelKey === 'ordergroup') {
      title = `Order Group — ${p.lastName}, ${p.firstName}`;
      const validItems = orderGroupItems.filter(i => getOrderDescription(i).trim());
      const badgeClass = (t) => t==='Lab'?'badge-lab':t==='Medication'?'badge-rx':t==='Imaging'?'badge-img':t==='Referral'?'badge-ref':'badge-proc';
      const rows = validItems.map((item, i) => {
        let det = '';
        if (item.type === 'Medication') {
          det = [
            item.medName && `<strong>${item.medName}</strong>${item.medDose ? ' ' + item.medDose : ''}`,
            item.medRoute && item.medFrequency && `${item.medRoute} · ${item.medFrequency}`,
            item.medSig && `<em>${item.medSig}</em>`,
            (item.medQuantity || item.medRefills) && `Qty: ${item.medQuantity||'?'} · Refills: ${item.medRefills||'0'}`,
            item.medDispenseAsWritten && `<strong>DAW</strong>`,
            item.medPharmacy && `📍 ${item.medPharmacy}${item.medPharmAddress ? '<br/>' + item.medPharmAddress : ''}${item.medPharmPhone ? '<br/>📞 ' + item.medPharmPhone : ''}${item.medPharmFax ? ' · Fax: ' + item.medPharmFax : ''}`,
          ].filter(Boolean).join('<br/>');
        } else if (item.type === 'Lab') {
          det = [
            `<strong>${item.labPanel||item.description||'—'}</strong>`,
            item.labNetwork && `🏥 ${item.labNetwork}${item.labAddress ? '<br/>' + item.labAddress : ''}${item.labPhone ? '<br/>📞 ' + item.labPhone : ''}`,
          ].filter(Boolean).join('<br/>');
        } else if (item.type === 'Imaging') {
          det = [`<strong>${[item.imgModality, item.imgBodyPart, item.imgLaterality!=='N/A'?item.imgLaterality:''].filter(Boolean).join(' — ')}</strong>`, item.imgReason && `Indication: ${item.imgReason}`].filter(Boolean).join('<br/>');
        } else if (item.type === 'Referral') {
          det = [`<strong>${item.refSpecialty}</strong>`, item.refProvider && `To: ${item.refProvider}`, item.refReason && `Reason: ${item.refReason}`].filter(Boolean).join('<br/>');
        } else {
          det = `<strong>${item.description||'—'}</strong>`;
        }
        return `<tr><td style="width:32px;text-align:center">${i+1}</td><td style="width:90px"><span class="badge ${badgeClass(item.type)}">${item.type}</span></td><td>${det}</td><td style="width:70px">${item.priority||'Routine'}</td><td style="font-size:11px;color:#6b7280">${item.notes||'—'}</td></tr>`;
      }).join('');
      body = `${HDR}${PT}
        <h2>Orders (${validItems.length} item${validItems.length!==1?'s':''})</h2>
        <table><tr><th>#</th><th>Type</th><th>Details</th><th>Priority</th><th>Notes</th></tr>
          ${rows||'<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:16px">No orders</td></tr>'}
        </table>
        ${SIG}`;
    }

    else if (panelKey === 'letters') {
      title = `Patient Letter — ${p.lastName}, ${p.firstName}`;
      const addrLine = [p.address?.street, p.address?.city && p.address?.state ? p.address.city + ', ' + p.address.state + ' ' + (p.address.zip||'') : ''].filter(Boolean).join('<br/>');
      body = `${HDR}
        <div style="font-size:12px;color:#6b7280;margin-bottom:20px">${dateStr}</div>
        ${addrLine ? `<div style="margin-bottom:20px;font-size:13px"><strong>${p.firstName} ${p.lastName}</strong><br/>${addrLine}</div>` : `<div style="margin-bottom:20px;font-size:13px"><strong>RE: ${p.firstName} ${p.lastName} (DOB: ${p.dob}, MRN: ${p.mrn})</strong></div>`}
        ${lettersSubject ? `<div style="font-size:13px;font-weight:700;margin-bottom:20px;border-left:3px solid #1d4ed8;padding-left:10px">RE: ${lettersSubject}</div>` : ''}
        <div style="white-space:pre-wrap;font-size:13px;line-height:1.8;min-height:200px">${lettersBody || '[Letter body not entered]'}</div>
        <div style="margin-top:48px">
          <div style="border-bottom:1px solid #374151;width:240px;margin-bottom:4px"></div>
          <div style="font-size:12px">${provName}</div>
          <div style="font-size:11px;color:#6b7280">NPI: ${provNpi}</div>
        </div>`;
    }

    else if (panelKey === 'referral') {
      title = `Referral — ${p.lastName}, ${p.firstName}`;
      const activeProbs = patProblems.filter(pr => pr.status === 'Active');
      const activeMeds  = patMeds.filter(m => m.status === 'Active');
      body = `${HDR}${PT}
        <h2>Referral Details</h2>
        <table>
          <tr><td class="lbl" style="width:35%">Specialty</td><td><strong>${referralData.specialty||'—'}</strong></td></tr>
          <tr><td class="lbl">Provider / Facility</td><td>${referralData.provider||'—'}</td></tr>
          <tr><td class="lbl">Urgency</td><td>${referralData.urgency||'Routine'}</td></tr>
          <tr><td class="lbl">Reason for Referral</td><td>${(referralData.reason||'—').replace(/\n/g,'<br/>')}</td></tr>
          <tr><td class="lbl">Clinical Notes</td><td>${(referralData.notes||'—').replace(/\n/g,'<br/>')}</td></tr>
          <tr><td class="lbl">Delivery Method</td><td>${referralData.delivery||'—'}</td></tr>
        </table>
        <h2>Clinical Context</h2>
        <table>
          <tr><td class="lbl" style="width:35%">Active Diagnoses</td><td>${activeProbs.map(pr=>`${pr.name||pr.problem||'—'}${pr.icd10?' ('+pr.icd10+')':''}`).join(', ')||'—'}</td></tr>
          <tr><td class="lbl">Current Medications</td><td>${activeMeds.map(m=>`${m.name} ${m.dose||''}`).join(', ')||'—'}</td></tr>
          <tr><td class="lbl">Insurance</td><td>${p.insurance?.primary?.name||'—'} · ID: ${p.insurance?.primary?.memberId||'—'}</td></tr>
          <tr><td class="lbl">PCP</td><td>${p.pcp||'—'}</td></tr>
        </table>
        ${SIG}`;
    }

    else if (panelKey === 'quicklabs') {
      title = `Lab Order — ${p.lastName}, ${p.firstName}`;
      const resolvedPanels = extra.panels || [];
      const rows = resolvedPanels.map((lab,i) => `<tr><td>${i+1}</td><td><strong>${lab.label}</strong></td><td style="font-size:11px">${lab.tests}</td><td style="font-size:11px;font-style:italic">${lab.indication}</td></tr>`).join('');
      body = `${HDR}${PT}
        <h2>Lab Orders (${resolvedPanels.length} panel${resolvedPanels.length!==1?'s':''}) — Priority: ${labPriority}</h2>
        <table><tr><th>#</th><th>Panel</th><th>Components</th><th>Indication</th></tr>
          ${rows||'<tr><td colspan="4" style="text-align:center;color:#6b7280;padding:16px">No labs selected</td></tr>'}
        </table>
        ${(quickLabNetwork||quickLabAddress) ? `<div style="margin-top:12px;padding:8px 12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;font-size:12px"><strong>Send to:</strong> ${[quickLabNetwork,quickLabAddress].filter(Boolean).join(' — ')}</div>` : ''}
        ${labNotes ? `<div style="margin-top:10px;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:12px"><strong>Notes:</strong> ${labNotes}</div>` : ''}
        ${SIG}`;
    }

    if (body) openPrintWindow(buildPrintShell(title, body));
  };

  // ── Order Group handlers ─────────────────────────────────
  const addOrderGroupItem = (preset = null) => {
    setOrderGroupItems(prev => [...prev, preset ? { ...BLANK_ORDER, ...preset } : { ...BLANK_ORDER }]);
  };
  const updateOrderGroupItem = (index, field, value) => {
    setOrderGroupItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };
  const removeOrderGroupItem = (index) => {
    setOrderGroupItems(prev => prev.filter((_, i) => i !== index));
  };
  const getOrderDescription = (item) => {
    if (item.type === 'Medication') {
      const parts = [item.medName, item.medDose, item.medRoute, item.medFrequency].filter(Boolean);
      return parts.join(' ') || item.description;
    }
    if (item.type === 'Lab') return item.labPanel || item.description;
    if (item.type === 'Imaging') return [item.imgModality, item.imgBodyPart, item.imgLaterality !== 'N/A' ? item.imgLaterality : ''].filter(Boolean).join(' — ') || item.description;
    if (item.type === 'Referral') return [item.refSpecialty, item.refProvider].filter(Boolean).join(' — ') || item.description;
    return item.description;
  };
  const submitOrderGroup = () => {
    const validItems = orderGroupItems.filter(i => getOrderDescription(i).trim());
    if (validItems.length === 0) return;
    validItems.forEach(item => {
      addOrder(patientId, {
        type: item.type,
        description: getOrderDescription(item),
        priority: item.priority,
        notes: item.notes,
        ...(item.type === 'Medication' ? { medDose: item.medDose, medRoute: item.medRoute, medFrequency: item.medFrequency, medQuantity: item.medQuantity, medRefills: item.medRefills, medSig: item.medSig, medDispenseAsWritten: item.medDispenseAsWritten } : {}),
        groupName: orderGroupName || 'Untitled Group',
        status: 'Pending',
        orderedDate: new Date().toISOString().split('T')[0],
        orderedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      });
    });
    setOrderGroupSaved(true);
    setTimeout(() => { setOrderGroupItems([{ ...BLANK_ORDER }]); setOrderGroupName(''); setShowPatientLetter(false); setPatientLetter({ subject: '', body: '', delivery: 'portal' }); }, 1500);
  };

  // ── Export handler ───────────────────────────────────────
  const handleExport = () => {
    setExportStarted(true);
    // Build text content for export
    const lines = [`Chart Export — ${p.lastName}, ${p.firstName} (MRN ${p.mrn})`, `Generated: ${new Date().toLocaleString()}`, `Format: ${exportFormat}`, ''];
    if (exportSections.includes('demographics')) {
      lines.push('══ DEMOGRAPHICS ══', `Name: ${p.lastName}, ${p.firstName}`, `DOB: ${p.dob} | Age: ${p.age} | Gender: ${p.gender}`, `Phone: ${p.phone || '—'} | Email: ${p.email || '—'}`, `Insurance: ${p.insurance?.primary?.name || '—'}`, `Preferred Pharmacy: ${p.preferredPharmacy || '—'}${p.preferredPharmacyPhone ? ' | Ph: ' + p.preferredPharmacyPhone : ''}${p.preferredPharmacyFax ? ' | Fax: ' + p.preferredPharmacyFax : ''}`, '');
    }
    if (exportSections.includes('allergies')) {
      lines.push('══ ALLERGIES ══');
      patAllergies.length ? patAllergies.forEach(a => lines.push(`  • ${a.allergen || a.name || a} (${a.severity || 'Unknown severity'}) — ${a.reaction || '—'}`)) : lines.push('  NKDA');
      lines.push('');
    }
    if (exportSections.includes('problems')) {
      lines.push('══ PROBLEM LIST ══');
      patProblems.length ? patProblems.forEach(pr => lines.push(`  • ${pr.name || pr.problem} (${pr.status || 'Active'})`)) : lines.push('  No active problems');
      lines.push('');
    }
    if (exportSections.includes('medications')) {
      lines.push('══ MEDICATIONS ══');
      patMeds.length ? patMeds.forEach(m => lines.push(`  • ${m.name} ${m.dose || ''} ${m.route || ''} ${m.frequency || ''}`)) : lines.push('  No active medications');
      lines.push('');
    }
    if (exportSections.includes('vitals')) {
      lines.push('══ VITALS (most recent) ══');
      const v = patVitals[0];
      v ? lines.push(`  Date: ${v.date} | BP: ${v.bp} | HR: ${v.hr} | Temp: ${v.temp}°F | SpO2: ${v.spo2}% | BMI: ${v.bmi}`) : lines.push('  No vitals recorded');
      lines.push('');
    }
    if (exportSections.includes('labs')) {
      lines.push('══ LAB RESULTS (recent) ══');
      patLabs.slice(0, 10).forEach(l => lines.push(`  • ${l.test || l.name} — ${l.result || '—'} ${l.unit || ''} (${l.date})`));
      if (!patLabs.length) lines.push('  No lab results');
      lines.push('');
    }
    if (exportSections.includes('assessments')) {
      lines.push('══ ASSESSMENTS ══');
      patAssessments.slice(0, 10).forEach(a => lines.push(`  • ${a.tool || a.name}: Score ${a.score} — ${a.interpretation} (${a.date})`));
      if (!patAssessments.length) lines.push('  No assessments');
      lines.push('');
    }
    if (exportSections.includes('immunizations')) {
      lines.push('══ IMMUNIZATIONS ══');
      patImmunizations.forEach(i => lines.push(`  • ${i.vaccine || i.name} (${i.date})`));
      if (!patImmunizations.length) lines.push('  No immunizations');
      lines.push('');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chart_export_${p.mrn}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Forms & screeners ────────────────────────────────────
  const availableForms = [
    { id: 'phq9', name: 'PHQ-9 (Depression)', icon: '📊' },
    { id: 'gad7', name: 'GAD-7 (Anxiety)', icon: '📊' },
    { id: 'cssrs', name: 'C-SSRS (Suicide Risk)', icon: '🚨' },
    { id: 'auditc', name: 'AUDIT-C (Alcohol)', icon: '📊' },
    { id: 'dast10', name: 'DAST-10 (Drug Abuse)', icon: '📊' },
    { id: 'pcl5', name: 'PCL-5 (PTSD)', icon: '📊' },
    { id: 'mdq', name: 'MDQ (Bipolar Screening)', icon: '📊' },
    { id: 'consent', name: 'Informed Consent for Treatment', icon: '📝' },
    { id: 'hipaa', name: 'HIPAA Acknowledgment', icon: '📝' },
    { id: 'roi', name: 'Release of Information', icon: '📝' },
    { id: 'intake', name: 'New Patient Intake Form', icon: '📝' },
    { id: 'telehealth-consent', name: 'Telehealth Consent', icon: '📝' },
    { id: 'safety-plan', name: 'Safety Plan Template', icon: '🛡️' },
    { id: 'med-history', name: 'Medication History Form', icon: '💊' },
    { id: 'social-det', name: 'Social Determinants of Health', icon: '🏠' },
  ];
  const toggleForm = (id) => {
    setSelectedForms(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };
  const handleSendForms = () => {
    if (selectedForms.length === 0) return;
    setFormsSent(true);
    setTimeout(() => { setSelectedForms([]); }, 2000);
  };

  // ── Shared panel styles ──────────────────────────────────
  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000,
    display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.15s ease',
  };
  const panelStyle = {
    width: 480, maxWidth: '95vw', background: '#ffffff', height: '100%',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
    animation: 'slideInRight 0.2s ease',
  };
  const panelHeaderStyle = {
    padding: '18px 20px 14px', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  };
  const panelBodyStyle = { flex: 1, overflow: 'auto', padding: '16px 20px' };
  const centeredOverlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
    display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
    overflowY: 'auto', padding: '24px 16px', animation: 'fadeIn 0.15s ease',
  };

  // ── Toggle export sections ───────────────────────────────
  const toggleExportSection = (sec) => {
    setExportSections(prev => prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]);
  };

  const patStatusRecord = getPatientStatusRecord(patientId);
  const isPatientInactive = patStatusRecord && patStatusRecord.status !== 'active';
  const STATUS_BANNER_STYLES = {
    deceased:    { bg: '#1e1b1b', border: '#7f1d1d', color: '#fca5a5', icon: '🕊️' },
    discharged:  { bg: '#451a03', border: '#f59e0b', color: '#fde68a', icon: '📤' },
    transferred: { bg: '#2e1065', border: '#a78bfa', color: '#e9d5ff', icon: '🔀' },
    lost_to_fu:  { bg: '#1c1917', border: '#78716c', color: '#d6d3d1', icon: '❓' },
    on_hold:     { bg: '#0c1a2e', border: '#3b82f6', color: '#bfdbfe', icon: '⏸️' },
  };
  const bannerStyle = isPatientInactive ? STATUS_BANNER_STYLES[patStatusRecord.status] : null;

  // ── PDMP callbacks ────────────────────────────────────────
  const openPdmp = (idx, medName, schedule) => {
    const report = generateILPmpReport(p, medName, schedule);
    setPdmpReport(report);
    setPdmpTargetIdx(idx);
    setPdmpMedName(medName);
    setPdmpOpen(true);
  };

  const handlePdmpAcknowledge = () => {
    setPdmpAcknowledged(prev => ({ ...prev, [pdmpTargetIdx]: true }));
  };

  const handlePdmpRequery = () => {
    setPdmpRequering(true);
    setTimeout(() => {
      const fresh = generateILPmpReport(p, pdmpMedName, getControlledSchedule(pdmpMedName));
      setPdmpReport(fresh);
      setPdmpRequering(false);
    }, 1600);
  };

  // ── Pharmacy drawer callback ─────────────────────────────
  const handlePharmacySelect = (pharmacy) => {
    const addr = [
      pharmacy.address1,
      pharmacy.address2,
      pharmacy.city && `${pharmacy.city}${pharmacy.state ? ', ' + pharmacy.state : ''} ${pharmacy.zip}`,
    ].filter(Boolean).join(', ');
    setOrderGroupItems(prev => prev.map((item, i) => i !== pharmDrawerTargetIdx ? item : {
      ...item,
      medPharmacy:      pharmacy.name,
      medPharmAddress:  addr.replace(/, $/, ''),
      medPharmPhone:    pharmacy.phone,
      medPharmFax:      pharmacy.fax,
      _pharmAutoSource: null,   // manual selection — clear auto label
    }));
  };

  return (
    <div className="athena-chart-layout">
      <PatientBanner />

      {/* Pharmacy Selector Drawer */}
      <PharmacySelectorDrawer
        isOpen={pharmDrawerOpen}
        onClose={() => setPharmDrawerOpen(false)}
        onSelect={handlePharmacySelect}
        onSetDefault={(ph) => {
          /* Persist default to patient record if needed */
          console.info('Default pharmacy set:', ph.name);
        }}
        recentlyUsedIds={[]}
        patientAddress={p?.address ?? null}
      />

      <PDMPDrawer
        isOpen={pdmpOpen}
        onClose={() => setPdmpOpen(false)}
        onAcknowledge={handlePdmpAcknowledge}
        onRequery={handlePdmpRequery}
        isRequering={pdmpRequering}
        report={pdmpReport}
        medName={pdmpMedName}
      />

      {/* Inactive patient banner */}
      {isPatientInactive && bannerStyle && (
        <div style={{ background: bannerStyle.bg, borderBottom: '2px solid ' + bannerStyle.border, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 10 }}>
          <span style={{ fontSize: 18 }}>{bannerStyle.icon}</span>
          <span style={{ color: bannerStyle.color, fontWeight: 800, fontSize: 13 }}>
            INACTIVE — {(patStatusRecord.status || '').toUpperCase().replace('_', ' ')}
          </span>
          {patStatusRecord.status === 'deceased' && patStatusRecord.dateOfDeath && (
            <span style={{ color: bannerStyle.color, fontSize: 12, opacity: 0.8 }}>· Date of death: {patStatusRecord.dateOfDeath}</span>
          )}
          {patStatusRecord.status === 'discharged' && patStatusRecord.dischargeDate && (
            <span style={{ color: bannerStyle.color, fontSize: 12, opacity: 0.8 }}>· Discharged: {patStatusRecord.dischargeDate}{patStatusRecord.dischargeReason ? ' — ' + patStatusRecord.dischargeReason : ''}</span>
          )}
          {patStatusRecord.status === 'transferred' && patStatusRecord.transferTo && (
            <span style={{ color: bannerStyle.color, fontSize: 12, opacity: 0.8 }}>· To: {patStatusRecord.transferTo}</span>
          )}
          <span style={{ marginLeft: 'auto', color: bannerStyle.color, fontSize: 11, opacity: 0.7 }}>⚠️ Scheduling blocked · New Rx restricted</span>
          <button onClick={() => navigate(`/chart/${patientId}/status`)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, background: 'transparent', border: '1px solid ' + bannerStyle.border, color: bannerStyle.color, cursor: 'pointer', fontWeight: 700 }}>View Status →</button>
        </div>
      )}

      {/* ── Split-Pane Clinical Workspace ────────────── */}
      <div className="chart-split-workspace">

        {/* Left rail — vertical section nav (no toggle here; toggle lives in toolbar) */}
        <nav className={`chart-left-rail${railCollapsed ? ' collapsed' : ''}`} aria-label="Chart sections">
          {getVisibleTabs(currentUser).map((t) => (
            <button
              key={t.key}
              className={`chart-nav-item${activeTab === t.key ? ' active' : ''}`}
              onClick={() => navigate(`/chart/${patientId}/${t.key}`)}
              title={railCollapsed ? t.shortLabel : undefined}
            >
              <span className="chart-nav-icon">{t.icon}</span>
              {!railCollapsed && <span className="chart-nav-label">{t.shortLabel}</span>}
            </button>
          ))}
        </nav>

        {/* Right pane — toolbar + scrollable content */}
        <div className="chart-right-pane">
          <div className="chart-pane-toolbar">
            {/* Rail toggle lives here so Summary and Composer share the same row */}
            <button className="chart-rail-toggle-inline" onClick={toggleRail} title={railCollapsed ? 'Expand navigation' : 'Collapse navigation'}>
              {railCollapsed ? '›' : '‹'}
            </button>
            <div className="athena-chart-actions-bar" style={{ borderLeft: 'none', marginLeft: 0 }}>
          {/* ── Clinical Tools ── */}
          <button
            className="athena-toolbar-btn composer-trigger-btn"
            onClick={() => setComposerOpen(true)}
            title="Diagnoses & Orders Composer"
          >
            ✦ Composer
          </button>
          <button
            className="athena-toolbar-btn"
            onClick={() => setPortalInboxOpen(true)}
            title="Patient Portal Messages"
            style={{ position: 'relative' }}
          >
            💬 Messages
          </button>
          <button
            className="athena-toolbar-btn"
            onClick={() => setPriorAuthOpen(true)}
            title="Prior Authorization Tracker"
          >
            📋 Prior Auth
          </button>
          <button
            className="athena-toolbar-btn"
            onClick={() => setAssessScorerOpen(true)}
            title="PHQ-9 / GAD-7 / C-SSRS Auto-Scoring"
          >
            📊 Assessments
          </button>
          <button
            className="athena-toolbar-btn"
            onClick={() => setSafetyPlanOpen(true)}
            title="Stanley-Brown Safety Plan Builder"
          >
            🛡 Safety Plan
          </button>
          <button
            className="athena-toolbar-btn"
            onClick={() => setAdherenceOpen(true)}
            title="Medication Adherence & Refill Timeline"
          >
            💊 Adherence
          </button>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              className={`athena-toolbar-btn ${menuOpen ? 'active' : ''}`}
              onClick={(e) => {
                if (!menuOpen) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMenuPosition({ top: rect.bottom + 6, left: rect.right - 260 });
                }
                setMenuOpen(!menuOpen);
              }}
              title="Order Set"
              style={{ fontSize: 16, padding: '12px 24px', fontWeight: 700 }}
            >
              <span>📦</span> Order Set
            </button>

            {menuOpen && (
              <div className="athena-dropdown-menu" style={{ position: 'fixed', top: `${menuPosition.top}px`, left: `${menuPosition.left}px`, display: 'block', visibility: 'visible', width: 280 }}>
                {[
                  { key: 'quickview',  icon: '👁️', label: 'Quick View',     desc: 'At-a-glance chart snapshot' },
                  ...(currentUser?.role !== 'therapist' ? [{ key: 'ordergroup', icon: '📦', label: 'Order Group', desc: 'Batch lab, imaging & referral orders' }] : []),
                  { key: 'letters',    icon: '📝', label: 'Patient Letters', desc: 'FMLA, disability, ESA & more' },
                  { key: 'referral',   icon: '🔗', label: 'Referral',        desc: 'Send to specialist or facility' },
                  { key: 'quicklabs',  icon: '🧪', label: 'Quick Labs',      desc: 'Common lab panels in one click' },
                  { key: 'export',     icon: '📤', label: 'Chart Export',    desc: 'Download chart data' },
                  { key: 'forms',      icon: '📨', label: 'Send Forms',      desc: 'Patient forms & screeners' },
                ].map((item, i, arr) => (
                  <div
                    key={item.key}
                    className="athena-dropdown-item"
                    onClick={() => openPanel(item.key)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="athena-dropdown-icon">{item.icon}</span>
                    <div className="athena-dropdown-content">
                      <div className="athena-dropdown-label">{item.label}</div>
                      <div className="athena-dropdown-desc">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
            </div>
          </div>

          {/* ── Chart Content Area ──────────────────────── */}
          <div className="athena-chart-content">
            <BTGGuard patientId={patientId}>
              <ActiveComponent patientId={patientId} />
            </BTGGuard>
          </div>
        </div>{/* end chart-right-pane */}
      </div>{/* end chart-split-workspace */}

      {/* ── Diagnoses & Orders Composer ─────────────────────── */}
      <DiagnosisOrderComposer
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        patientId={patientId}
      />

      {/* ═══════════════════════════════════════════════════════
          SLIDE-OUT PANELS
          ═══════════════════════════════════════════════════════ */}

      {/* ── Quick View ──────────────────────────────────────── */}
      {activePanel === 'quickview' && (
        <div style={overlayStyle} onClick={closePanel}>
          <div style={panelStyle} onClick={e => e.stopPropagation()}>
            <div style={panelHeaderStyle}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>👁️ Quick View — {p.lastName}, {p.firstName}</h3>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => printPanel('quickview')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>🖨️ Print</button>
                <button onClick={closePanel} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>
            </div>
            <div style={panelBodyStyle}>
              {/* Demographics snapshot */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Demographics</div>
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12 }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>DOB:</span> {p.dob}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Age:</span> {p.age}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Sex:</span> {p.gender}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Pronouns:</span> {p.pronouns || '—'}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> {p.phone || '—'}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> {p.email || '—'}</div>
                    <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text-muted)' }}>Insurance:</span> {p.insurance?.primary?.name || '—'} ({p.insurance?.primary?.memberId || '—'})</div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <span style={{ color: 'var(--text-muted)' }}>💊 Preferred Pharmacy:</span>{' '}
                      {p.preferredPharmacy ? (
                        <strong>{p.preferredPharmacy}{p.preferredPharmacyPhone ? ` · ${p.preferredPharmacyPhone}` : ''}{p.preferredPharmacyFax ? ` · Fax: ${p.preferredPharmacyFax}` : ''}</strong>
                      ) : <span style={{ color: 'var(--text-muted)' }}>Not on file</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Allergies */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Allergies ({patAllergies.length})</div>
                <div className="card" style={{ padding: 12 }}>
                  {patAllergies.length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 700 }}>✅ NKDA</span>
                  ) : patAllergies.map((a, i) => (
                    <div key={i} style={{ fontSize: 12, padding: '3px 0', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`badge ${a.severity === 'Severe' ? 'badge-danger' : a.severity === 'Moderate' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: 9 }}>{a.severity || '?'}</span>
                      <span style={{ fontWeight: 600 }}>{a.allergen || a.name || a}</span>
                      {a.reaction && <span style={{ color: 'var(--text-muted)' }}>— {a.reaction}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Problems */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Active Problems ({patProblems.length})</div>
                <div className="card" style={{ padding: 12 }}>
                  {patProblems.length === 0 ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No active problems</span> : patProblems.map((pr, i) => (
                    <div key={i} style={{ fontSize: 12, padding: '3px 0' }}>
                      <span style={{ fontWeight: 600 }}>{pr.name || pr.problem}</span>
                      {pr.icd10 && <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 10 }}>({pr.icd10})</span>}
                      {pr.onset && <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 10 }}>since {pr.onset}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Medications */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Medications ({patMeds.length})</div>
                <div className="card" style={{ padding: 12 }}>
                  {patMeds.length === 0 ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No active medications</span> : patMeds.map((m, i) => (
                    <div key={i} style={{ fontSize: 12, padding: '3px 0' }}>
                      <span style={{ fontWeight: 600 }}>{m.name}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{m.dose} {m.route} {m.frequency}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Latest Vitals */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Latest Vitals</div>
                <div className="card" style={{ padding: 12 }}>
                  {patVitals.length === 0 ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No vitals recorded</span> : (() => {
                    const v = patVitals[0];
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px 12px', fontSize: 12 }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>BP:</span> <strong>{v.bp}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>HR:</span> <strong>{v.hr}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Temp:</span> <strong>{v.temp}°F</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>SpO2:</span> <strong>{v.spo2}%</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>BMI:</span> <strong>{v.bmi}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Pain:</span> <strong>{v.pain}/10</strong></div>
                        <div style={{ gridColumn: '1/-1', color: 'var(--text-muted)', fontSize: 10, marginTop: 4 }}>Recorded {v.date} at {v.time} by {v.takenBy}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Recent Assessments */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recent Assessments</div>
                <div className="card" style={{ padding: 12 }}>
                  {/* Inline trend sparkline for PHQ-9 and GAD-7 */}
                  {(() => {
                    const phqSeries = patAssessments.filter(a => (a.tool || a.name) === 'PHQ-9').slice(0, 8).reverse();
                    const gadSeries = patAssessments.filter(a => (a.tool || a.name) === 'GAD-7').slice(0, 8).reverse();
                    const hasTrend = phqSeries.length >= 2 || gadSeries.length >= 2;
                    if (!hasTrend) return null;

                    const W = 260, H = 80;
                    const PAD = { t: 8, r: 8, b: 18, l: 24 };
                    const cW = W - PAD.l - PAD.r;
                    const cH = H - PAD.t - PAD.b;

                    // Shared x-axis: all unique dates across both series
                    const allDates = Array.from(new Set([...phqSeries.map(s => s.date), ...gadSeries.map(s => s.date)])).sort();
                    const xOf = d => PAD.l + (allDates.length < 2 ? cW / 2 : (allDates.indexOf(d) / (allDates.length - 1)) * cW);
                    const yOf = (score, max) => PAD.t + cH - Math.min(score / max, 1) * cH;

                    const path = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                    const phqPts = phqSeries.map(s => ({ x: xOf(s.date), y: yOf(s.score, 27), score: s.score, date: s.date }));
                    const gadPts = gadSeries.map(s => ({ x: xOf(s.date), y: yOf(s.score, 21), score: s.score, date: s.date }));

                    // Severity reference lines (PHQ-9 scale: mod=10/27≈37%, mod-sev=15/27≈56%, sev=20/27≈74%)
                    const refLines = [
                      { score: 20, label: 'Sev', color: '#fca5a5' },
                      { score: 15, label: 'Mod-Sev', color: '#fde68a' },
                      { score: 10, label: 'Mod', color: '#bbf7d0' },
                    ];

                    return (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, fontSize: 10 }}>
                          <span style={{ fontWeight: 700, color: '#475569', fontSize: 10, letterSpacing: 0.3 }}>📈 TREND</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#4f46e5', fontWeight: 600 }}>
                            <svg width={14} height={3}><line x1={0} y1={1.5} x2={14} y2={1.5} stroke="#4f46e5" strokeWidth={2.5} strokeLinecap="round" /></svg>
                            PHQ-9
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#d97706', fontWeight: 600 }}>
                            <svg width={14} height={3}><line x1={0} y1={1.5} x2={14} y2={1.5} stroke="#d97706" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="3 2" /></svg>
                            GAD-7
                          </span>
                        </div>
                        <div style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', overflowX: 'auto' }}>
                          <svg width={W} height={H} style={{ display: 'block' }}>
                            {/* Severity band fills */}
                            {refLines.map(r => (
                              <rect key={r.score} x={PAD.l} y={PAD.t} width={cW} height={Math.max(0, yOf(r.score, 27) - PAD.t)} fill={r.color} opacity={0.18} />
                            ))}
                            {/* Horizontal grid + score labels */}
                            {[0, 10, 20].map(v => {
                              const y = yOf(v, 27);
                              return (
                                <g key={v}>
                                  <line x1={PAD.l} y1={y} x2={PAD.l + cW} y2={y} stroke="#e2e8f0" strokeWidth={1} />
                                  <text x={PAD.l - 3} y={y + 3.5} textAnchor="end" fontSize={8} fill="#94a3b8">{v}</text>
                                </g>
                              );
                            })}
                            {/* X-axis date labels */}
                            {allDates.map(d => (
                              <text key={d} x={xOf(d)} y={H - 3} textAnchor="middle" fontSize={8} fill="#94a3b8">{d.slice(5)}</text>
                            ))}
                            {/* GAD-7 line (dashed, amber) */}
                            {gadPts.length >= 2 && (
                              <path d={path(gadPts)} fill="none" stroke="#d97706" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4 2" />
                            )}
                            {gadPts.map((p, i) => (
                              <g key={i}>
                                <circle cx={p.x} cy={p.y} r={3.5} fill="#d97706" stroke="#fff" strokeWidth={1.5} />
                                <title>GAD-7 {p.date}: {p.score}</title>
                              </g>
                            ))}
                            {/* PHQ-9 line (solid, indigo) */}
                            {phqPts.length >= 2 && (
                              <path d={path(phqPts)} fill="none" stroke="#4f46e5" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                            )}
                            {phqPts.map((p, i) => (
                              <g key={i}>
                                <circle cx={p.x} cy={p.y} r={3.5} fill="#4f46e5" stroke="#fff" strokeWidth={1.5} />
                                <title>PHQ-9 {p.date}: {p.score}</title>
                              </g>
                            ))}
                          </svg>
                        </div>
                        <div style={{ borderBottom: '1px solid #e2e8f0', margin: '8px 0' }} />
                      </div>
                    );
                  })()}
                  {patAssessments.length === 0 ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No assessments</span> : patAssessments.slice(0, 6).map((a, i) => (
                    <div key={i} style={{ fontSize: 12, padding: '3px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge badge-info" style={{ fontSize: 9, flexShrink: 0 }}>{a.tool || a.name}</span>
                      <span style={{ fontWeight: 700 }}>{a.score}</span>
                      <span style={{ color: 'var(--text-muted)' }}>— {a.interpretation}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>{a.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Upcoming</div>
                <div className="card" style={{ padding: 12, fontSize: 12 }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Next Appointment:</span> <strong>{p.nextAppointment || '—'}</strong></div>
                  <div style={{ marginTop: 4 }}><span style={{ color: 'var(--text-muted)' }}>PCP:</span> {p.pcp || '—'}</div>
                  <div style={{ marginTop: 4 }}><span style={{ color: 'var(--text-muted)' }}>Pending Orders:</span> {patOrders.filter(o => o.status === 'Pending').length}</div>
                </div>
              </div>

              {/* Messaging */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>💬 Messaging</div>
                <div className="card" style={{ padding: 12 }}>
                  {(() => {
                    const patMessages = inboxMessages.filter(m => m.patient === patientId).sort((a, b) => b.date > a.date ? 1 : -1);
                    const unread = patMessages.filter(m => !m.read);
                    if (patMessages.length === 0) return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No messages for this patient</span>;
                    return (
                      <>
                        {unread.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '6px 8px', background: 'var(--danger-light)', borderRadius: 6 }}>
                            <span className="badge badge-danger" style={{ fontSize: 10 }}>{unread.length} Unread</span>
                            <span style={{ fontSize: 11, color: 'var(--danger)' }}>Requires attention</span>
                          </div>
                        )}
                        {patMessages.slice(0, 4).map((msg, i) => (
                          <div key={i} style={{ fontSize: 12, padding: '5px 0', borderBottom: i < Math.min(patMessages.length, 4) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <span style={{ fontSize: 9, flexShrink: 0, marginTop: 2 }}>{!msg.read ? '🔴' : '✅'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className={`badge ${msg.type === 'Patient Message' ? 'badge-info' : msg.type === 'Lab Result' ? 'badge-success' : msg.type === 'Prior Authorization' ? 'badge-warning' : 'badge-gray'}`} style={{ fontSize: 8, flexShrink: 0 }}>{msg.type}</span>
                                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.subject}</span>
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{msg.from} · {msg.date}</div>
                            </div>
                          </div>
                        ))}
                        {patMessages.length > 4 && (
                          <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 6, cursor: 'pointer', fontWeight: 600 }} onClick={() => { closePanel(); navigate('/inbox'); }}>
                            View all {patMessages.length} messages →
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Scheduling */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>📅 Scheduling</div>
                <div className="card" style={{ padding: 12 }}>
                  {(() => {
                    const today = new Date().toISOString().slice(0, 10);
                    const patAppts = appointments.filter(a => a.patientId === patientId).sort((a, b) => a.date > b.date ? 1 : -1);
                    const past = patAppts.filter(a => a.date < today || a.status === 'Completed').slice(-3).reverse();
                    const upcoming = patAppts.filter(a => a.date >= today && a.status !== 'Completed');
                    const noShows = patAppts.filter(a => a.status === 'No Show').length;
                    const cancelled = patAppts.filter(a => a.status === 'Cancelled').length;
                    return (
                      <>
                        {/* Stats row */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                          <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: 'var(--bg)', borderRadius: 6 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>{upcoming.length}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Upcoming</div>
                          </div>
                          <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: 'var(--bg)', borderRadius: 6 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--success)' }}>{patAppts.filter(a => a.status === 'Completed').length}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Completed</div>
                          </div>
                          <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: noShows > 0 ? 'var(--danger-light)' : 'var(--bg)', borderRadius: 6 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: noShows > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{noShows}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>No-Shows</div>
                          </div>
                          <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: 'var(--bg)', borderRadius: 6 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: cancelled > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{cancelled}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Cancelled</div>
                          </div>
                        </div>

                        {/* Upcoming appointments */}
                        {upcoming.length > 0 && (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Upcoming</div>
                            {upcoming.slice(0, 3).map((apt, i) => (
                              <div key={i} style={{ fontSize: 12, padding: '5px 0', borderBottom: i < Math.min(upcoming.length, 3) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14, flexShrink: 0 }}>{apt.visitType === 'Telehealth' ? '📹' : '🏥'}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600 }}>{apt.date} at {apt.time}</div>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{apt.type} · {apt.duration}min · {apt.providerName} · {apt.room}</div>
                                </div>
                                <span className={`badge ${apt.status === 'Confirmed' ? 'badge-success' : apt.status === 'Checked In' ? 'badge-info' : 'badge-gray'}`} style={{ fontSize: 8 }}>{apt.status}</span>
                              </div>
                            ))}
                            {upcoming.length > 3 && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>+{upcoming.length - 3} more upcoming</div>}
                          </>
                        )}

                        {/* Past appointments */}
                        {past.length > 0 && (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, marginTop: 8, color: 'var(--text-secondary)' }}>Recent Visits</div>
                            {past.map((apt, i) => (
                              <div key={i} style={{ fontSize: 12, padding: '4px 0', opacity: 0.7 }}>
                                <span>{apt.date}</span>
                                <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{apt.type} · {apt.providerName} · {apt.reason}</span>
                              </div>
                            ))}
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => setShowSlotModal(true)}
                          style={{ width:'100%', marginTop:10, padding:'8px 0', borderRadius:8, border:'2px solid #4f46e5', background:'#ede9fe', color:'#4f46e5', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                          📅 Schedule Appointment
                        </button>
                        <div
                          style={{ fontSize: 11, color: 'var(--primary)', marginTop: 6, cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => { closePanel(); navigate('/schedule'); }}
                        >
                          Open full schedule →
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Billing */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>💳 Billing</div>
                <div className="card" style={{ padding: 12 }}>
                  {/* Insurance info */}
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Insurance</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 12, marginBottom: 10 }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Primary:</span> <strong>{p.insurance?.primary?.name || '—'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Member ID:</span> {p.insurance?.primary?.memberId || '—'}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Group #:</span> {p.insurance?.primary?.groupNumber || '—'}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Copay:</span> <strong>${p.insurance?.primary?.copay || '—'}</strong></div>
                    {p.insurance?.secondary && (
                      <>
                        <div style={{ gridColumn: '1/-1', borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 4 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Secondary:</span> <strong>{p.insurance.secondary.name}</strong>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Billing codes summary */}
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Common Billing Codes</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                    {(() => {
                      const patAppts = appointments.filter(a => a.patientId === patientId);
                      const hasNewPatient = patAppts.some(a => a.type === 'New Patient');
                      const hasTelehealth = patAppts.some(a => a.visitType === 'Telehealth');
                      const isTherapistBilling = currentUser?.role === 'therapist';
                      const codes = [];
                      if (isTherapistBilling) {
                        codes.push({ code: '90202', label: 'Therapy — Low' });
                        codes.push({ code: '90203', label: 'Therapy — Moderate' });
                        codes.push({ code: '90204', label: 'Therapy — High' });
                        codes.push({ code: '90834', label: 'Psychotherapy (45 min)' });
                        codes.push({ code: '90837', label: 'Psychotherapy (53+ min)' });
                        codes.push({ code: '96127', label: 'Screening (PHQ-9/GAD-7)' });
                      } else {
                        if (hasNewPatient) codes.push({ code: '99205', label: 'New Patient Eval (60 min)' });
                        codes.push({ code: '99214', label: 'Established - Moderate' });
                        codes.push({ code: '99215', label: 'Established - High' });
                        if (hasTelehealth) codes.push({ code: '99214-95', label: 'Telehealth Modifier' });
                        codes.push({ code: '90833', label: 'Psychotherapy Add-On (30 min)' });
                        codes.push({ code: '90834', label: 'Psychotherapy (45 min)' });
                        codes.push({ code: '96127', label: 'Screening (PHQ-9/GAD-7)' });
                      }
                      return codes.map(c => (
                        <span key={c.code} className="badge badge-gray" style={{ fontSize: 9, cursor: 'default' }} title={c.label}>
                          {c.code}
                        </span>
                      ));
                    })()}
                  </div>

                  {/* Account snapshot */}
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Account Snapshot</div>
                  {(() => {
                    const completed = appointments.filter(a => a.patientId === patientId && a.status === 'Completed').length;
                    const estimatedCharges = completed * (p.insurance?.primary?.copay || 30);
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 12 }}>
                        <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--bg)', borderRadius: 6 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--success)' }}>${estimatedCharges}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Copays Collected</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--bg)', borderRadius: 6 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>{completed}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Billed Visits</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--bg)', borderRadius: 6 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>$0</div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Balance Due</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Prior auth alerts */}
                  {(() => {
                    const paMessages = inboxMessages.filter(m => m.patient === patientId && m.type === 'Prior Authorization');
                    if (paMessages.length === 0) return null;
                    return (
                      <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--warning-light, #fff7ed)', borderRadius: 6, border: '1px solid var(--warning)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', marginBottom: 2 }}>⚠️ Prior Authorization Alerts</div>
                        {paMessages.map((pm, i) => (
                          <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {pm.subject} — <span className={`badge ${pm.status === 'Completed' ? 'badge-success' : pm.status === 'In Progress' ? 'badge-warning' : 'badge-gray'}`} style={{ fontSize: 8 }}>{pm.status}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Order Group ──────────────────────────────── */}
      {activePanel === 'ordergroup' && (() => {
        const LAB_OPTIONS = [
          // ── Metabolic / General ──────────────────────────────────────────────
          'CMP (Comprehensive Metabolic Panel)', 'BMP (Basic Metabolic Panel)', 'CBC with Differential', 'Lipid Panel', 'TSH + Free T3/T4', 'HbA1c + Fasting Glucose', 'Metabolic Syndrome Panel', 'Liver Function Tests (LFTs)', 'Renal Function Panel',
          // ── Mood Stabilizer Levels ───────────────────────────────────────────
          'Lithium Level (trough)', 'Valproate / Depakote Total Level (trough)', 'Valproate Free Acid Level', 'Carbamazepine (Tegretol) Level (trough)', 'Oxcarbazepine (Trileptal) Level', 'Lamotrigine Level',
          // ── Antipsychotic Levels ─────────────────────────────────────────────
          'Clozapine Level + ANC', 'Olanzapine Level', 'Risperidone + 9-OH-Risperidone Level', 'Haloperidol Level', 'Quetiapine Level', 'Aripiprazole Level',
          // ── Antidepressant Levels ────────────────────────────────────────────
          'Nortriptyline Level', 'Amitriptyline Level', 'Bupropion + Hydroxybupropion Level',
          // ── Depakote Safety Monitoring ───────────────────────────────────────
          'Ammonia Level', 'Folic Acid Level', 'Fibrinogen Level (coagulation)',
          // ── Antipsychotic Safety Monitoring ─────────────────────────────────
          'Prolactin Level', 'Fasting Insulin + HOMA-IR',
          // ── Urine Toxicology ─────────────────────────────────────────────────
          'Urine Drug Screen — 5-panel (SAMHSA)', 'Urine Drug Screen — 10-panel', 'Urine Drug Screen — 12-panel (expanded)', 'Urine Toxicology — Comprehensive (extended)', 'Urine Drug Confirmation (GC-MS)', 'Urine Fentanyl Screen', 'Urine Benzo Screen', 'Urine Opioid Screen', 'Urine Stimulant Screen', 'Urine Pregnancy Test (hCG)',
          // ── Nutrition / Other ────────────────────────────────────────────────
          'Vitamin B12 + Folate', 'Vitamin D (25-OH)', 'Iron Studies', 'HIV + Syphilis + Hepatitis Panel', 'Other (free text)',
        ];
        const ROUTES = ['Oral', 'Sublingual', 'Topical', 'Transdermal', 'IM (Intramuscular)', 'IV (Intravenous)', 'Intranasal', 'Inhaled', 'Rectal', 'Ophthalmic', 'Otic'];
        const FREQUENCIES = ['Once daily (QD)', 'Twice daily (BID)', 'Three times daily (TID)', 'Four times daily (QID)', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'Every other day', 'Weekly', 'Twice weekly', 'Monthly', 'As needed (PRN)', 'At bedtime (QHS)', 'With meals'];
        const MODALITIES = ['X-ray', 'CT Scan', 'MRI', 'Ultrasound', 'PET Scan', 'DEXA Scan', 'Mammogram', 'Echocardiogram', 'EEG', 'EMG/NCS'];
        const LATERALITY = ['N/A', 'Left', 'Right', 'Bilateral'];
        const REF_SPECIALTIES = ['Psychiatry', 'Psychology / Therapy', 'Neuropsychology', 'Neurology', 'Primary Care / PCP', 'Cardiology', 'Endocrinology', 'Sleep Medicine', 'Pain Management', 'Substance Use (IOP)', 'Substance Use (PHP)', 'Inpatient Psychiatric', 'Social Work / Case Management', 'Dietitian / Nutritionist', 'Physical Therapy', 'OB/GYN', 'Other'];
        const QUICK_BUNDLES = [
          { label: '🆕 New Patient Workup', items: [{ type: 'Lab', labPanel: 'CMP (Comprehensive Metabolic Panel)', priority: 'Routine' }, { type: 'Lab', labPanel: 'CBC with Differential', priority: 'Routine' }, { type: 'Lab', labPanel: 'Lipid Panel', priority: 'Routine' }, { type: 'Lab', labPanel: 'TSH + Free T3/T4', priority: 'Routine' }, { type: 'Lab', labPanel: 'HbA1c + Fasting Glucose', priority: 'Routine' }] },
          { label: '📊 Metabolic Monitoring', items: [{ type: 'Lab', labPanel: 'Metabolic Syndrome Panel', priority: 'Routine' }, { type: 'Lab', labPanel: 'Lipid Panel', priority: 'Routine' }, { type: 'Lab', labPanel: 'HbA1c + Fasting Glucose', priority: 'Routine' }] },
          { label: '⚗️ Lithium Monitoring', items: [{ type: 'Lab', labPanel: 'Lithium Level (trough)', priority: 'Routine', notes: 'Trough level — draw before morning dose' }, { type: 'Lab', labPanel: 'CMP (Comprehensive Metabolic Panel)', priority: 'Routine' }, { type: 'Lab', labPanel: 'TSH + Free T3/T4', priority: 'Routine' }] },
          { label: '🔬 Clozapine Monitoring', items: [{ type: 'Lab', labPanel: 'Clozapine Level + ANC', priority: 'Routine', notes: 'Required per REMS — ANC must be within range before dispensing' }, { type: 'Lab', labPanel: 'CMP (Comprehensive Metabolic Panel)', priority: 'Routine' }] },
          { label: '🌿 Mood / Fatigue Workup', items: [{ type: 'Lab', labPanel: 'TSH + Free T3/T4', priority: 'Routine' }, { type: 'Lab', labPanel: 'Vitamin B12 + Folate', priority: 'Routine' }, { type: 'Lab', labPanel: 'Vitamin D (25-OH)', priority: 'Routine' }, { type: 'Lab', labPanel: 'Iron Studies', priority: 'Routine' }, { type: 'Lab', labPanel: 'CBC with Differential', priority: 'Routine' }] },
          { label: '💊 Depakote Monitoring', items: [{ type: 'Lab', labPanel: 'Valproate / Depakote Total Level (trough)', priority: 'Routine', notes: 'Trough level — draw before morning dose. Therapeutic range: 50–125 mcg/mL' }, { type: 'Lab', labPanel: 'Ammonia Level', priority: 'Routine', notes: 'Check for valproate-induced hyperammonemia if altered mental status' }, { type: 'Lab', labPanel: 'Liver Function Tests (LFTs)', priority: 'Routine' }, { type: 'Lab', labPanel: 'CBC with Differential', priority: 'Routine', notes: 'Monitor for thrombocytopenia' }, { type: 'Lab', labPanel: 'Folic Acid Level', priority: 'Routine' }] },
          { label: '🔬 Urine Toxicology', items: [{ type: 'Lab', labPanel: 'Urine Drug Screen — 10-panel', priority: 'Routine' }, { type: 'Lab', labPanel: 'Urine Fentanyl Screen', priority: 'Routine', notes: 'Standard UDS may miss fentanyl — order separately' }] },
          { label: '💉 Antipsychotic Monitoring', items: [{ type: 'Lab', labPanel: 'Metabolic Syndrome Panel', priority: 'Routine' }, { type: 'Lab', labPanel: 'Fasting Insulin + HOMA-IR', priority: 'Routine' }, { type: 'Lab', labPanel: 'Prolactin Level', priority: 'Routine' }, { type: 'Lab', labPanel: 'Lipid Panel', priority: 'Routine' }] },
        ];
        // ── Preferred pharmacy from patient's most recent active med ──────────
        const preferredPharmacy = (p?.medications || []).find(m => m.status === 'Active' && m.pharmacy)?.pharmacy || '';

        // ── Pharmacy directory (national) ─────────────────────────────────────
        const PHARMACY_DIRECTORY = [
          // ── Walgreens ──
          { name: 'Walgreens #02561', group: 'Walgreens', address: '757 N Michigan Ave, Chicago, IL 60611', phone: '(312) 664-8686', fax: '(312) 664-8687' },
          { name: 'Walgreens #06712', group: 'Walgreens', address: '136 E 57th St, New York, NY 10022', phone: '(212) 755-0197', fax: '(212) 755-0198' },
          { name: 'Walgreens #09241', group: 'Walgreens', address: '250 N Alvarado St, Los Angeles, CA 90026', phone: '(213) 484-5700', fax: '(213) 484-5701' },
          { name: 'Walgreens #03318', group: 'Walgreens', address: '6500 N MacArthur Blvd, Irving, TX 75039', phone: '(972) 550-7400', fax: '(972) 550-7401' },
          { name: 'Walgreens #04831', group: 'Walgreens', address: '800 Peachtree St NE, Atlanta, GA 30308', phone: '(404) 875-3500', fax: '(404) 875-3501' },
          { name: 'Walgreens #11042', group: 'Walgreens', address: '4800 SW 40th Ave, Miami, FL 33155', phone: '(305) 666-1640', fax: '(305) 666-1641' },
          { name: 'Walgreens #07563', group: 'Walgreens', address: '1101 Market St, Philadelphia, PA 19107', phone: '(215) 829-9990', fax: '(215) 829-9991' },
          { name: 'Walgreens #08904', group: 'Walgreens', address: '1300 E Colfax Ave, Denver, CO 80218', phone: '(303) 832-8181', fax: '(303) 832-8182' },
          // ── CVS ──
          { name: 'CVS Pharmacy #01234', group: 'CVS', address: '1234 N Michigan Ave, Chicago, IL 60610', phone: '(312) 266-8500', fax: '(312) 266-8501' },
          { name: 'CVS Pharmacy #05678', group: 'CVS', address: '200 W 57th St, New York, NY 10019', phone: '(212) 541-9200', fax: '(212) 541-9201' },
          { name: 'CVS Pharmacy #09012', group: 'CVS', address: '8001 Sunset Blvd, Los Angeles, CA 90046', phone: '(323) 654-7100', fax: '(323) 654-7101' },
          { name: 'CVS Pharmacy #03456', group: 'CVS', address: '2000 Westheimer Rd, Houston, TX 77098', phone: '(713) 529-3900', fax: '(713) 529-3901' },
          { name: 'CVS Pharmacy #07890', group: 'CVS', address: '50 Peachtree St NW, Atlanta, GA 30303', phone: '(404) 589-7900', fax: '(404) 589-7901' },
          { name: 'CVS Pharmacy #02341', group: 'CVS', address: '3051 NW 7th Ave, Miami, FL 33127', phone: '(305) 573-7800', fax: '(305) 573-7801' },
          { name: 'CVS Pharmacy #06784', group: 'CVS', address: '1600 Market St, Philadelphia, PA 19103', phone: '(215) 564-0260', fax: '(215) 564-0261' },
          // ── Rite Aid ──
          { name: 'Rite Aid #05678', group: 'Rite Aid', address: '303 W Erie St, Chicago, IL 60654', phone: '(312) 335-1960', fax: '(312) 335-1961' },
          { name: 'Rite Aid #02345', group: 'Rite Aid', address: '310 Columbus Ave, New York, NY 10023', phone: '(212) 595-2290', fax: '(212) 595-2291' },
          { name: 'Rite Aid #07612', group: 'Rite Aid', address: '5600 Wilshire Blvd, Los Angeles, CA 90036', phone: '(323) 937-0540', fax: '(323) 937-0541' },
          // ── Walmart ──
          { name: 'Walmart Pharmacy #1234', group: 'Walmart', address: '2551 E 79th St, Chicago, IL 60649', phone: '(773) 221-5000', fax: '(773) 221-5001' },
          { name: 'Walmart Pharmacy #2345', group: 'Walmart', address: '5401 S Expressway 83, Harlingen, TX 78550', phone: '(956) 428-0050', fax: '(956) 428-0051' },
          { name: 'Walmart Pharmacy #3456', group: 'Walmart', address: '2020 W Cactus Rd, Phoenix, AZ 85029', phone: '(602) 942-3801', fax: '(602) 942-3802' },
          { name: 'Walmart Pharmacy #4567', group: 'Walmart', address: '4700 Central Ave SW, Albuquerque, NM 87105', phone: '(505) 873-4450', fax: '(505) 873-4451' },
          // ── Costco / Sam's Club ──
          { name: "Costco Pharmacy #122", group: 'Costco', address: '10 Imm Luther King Jr Dr, Teterboro, NJ 07608', phone: '(201) 462-4860', fax: '(201) 462-4861' },
          { name: "Costco Pharmacy #536", group: 'Costco', address: '1375 N Meacham Rd, Schaumburg, IL 60173', phone: '(847) 240-2540', fax: '(847) 240-2544' },
          { name: "Sam's Club Pharmacy #6344", group: "Sam's Club", address: '4600 Ambassador Caffery Pkwy, Lafayette, LA 70508', phone: '(337) 989-7980', fax: '(337) 989-7981' },
          // ── Grocery ──
          { name: 'Kroger Pharmacy #617', group: 'Kroger', address: '2626 Ridgmar Blvd, Fort Worth, TX 76116', phone: '(817) 370-8000', fax: '(817) 370-8001' },
          { name: 'Publix Pharmacy #0456', group: 'Publix', address: '1440 NE Miami Gardens Dr, Miami, FL 33179', phone: '(305) 947-1200', fax: '(305) 947-1201' },
          { name: 'H-E-B Pharmacy #789', group: 'H-E-B', address: '2101 S Lamar Blvd, Austin, TX 78704', phone: '(512) 440-3800', fax: '(512) 440-3801' },
          { name: 'Safeway Pharmacy #0932', group: 'Safeway', address: '1601 S Colorado Blvd, Denver, CO 80222', phone: '(303) 757-8870', fax: '(303) 757-8871' },
          // ── Specialty / Behavioral Health ──
          { name: 'Genoa Healthcare Pharmacy — Chicago', group: 'Specialty', address: '1700 W Van Buren St Ste 100, Chicago, IL 60612', phone: '(312) 996-7100', fax: '(312) 996-7101' },
          { name: 'Genoa Healthcare Pharmacy — Los Angeles', group: 'Specialty', address: '4070 Cesar Chavez Ave, Los Angeles, CA 90063', phone: '(323) 263-1028', fax: '(323) 263-1029' },
          { name: 'Genoa Healthcare Pharmacy — New York', group: 'Specialty', address: '722 W 168th St, New York, NY 10032', phone: '(212) 305-6001', fax: '(212) 305-6002' },
          { name: 'Genoa Healthcare Pharmacy — Houston', group: 'Specialty', address: '3000 Essex Ln, Houston, TX 77027', phone: '(713) 523-0700', fax: '(713) 523-0701' },
          { name: 'Walgreens Specialty Pharmacy', group: 'Specialty', address: '3200 Highland Ave, Downers Grove, IL 60515', phone: '(855) 922-0512', fax: '(855) 922-0513' },
          { name: 'CVS Specialty Pharmacy', group: 'Specialty', address: '1 CVS Dr, Woonsocket, RI 02895', phone: '(800) 237-2767', fax: '(800) 635-5605' },
          { name: 'Accredo Specialty Pharmacy (Express Scripts)', group: 'Specialty', address: '1640 Century Center Pkwy, Memphis, TN 38134', phone: '(800) 803-2523', fax: '(800) 462-5327' },
          // ── Mail Order ──
          { name: 'CVS Caremark Mail Service Pharmacy', group: 'Mail Order', address: '1 CVS Dr, Woonsocket, RI 02895', phone: '(800) 552-8159', fax: '(800) 378-0323' },
          { name: 'Express Scripts (Evernorth) Mail Order', group: 'Mail Order', address: '4000 Express Scripts Blvd, St. Louis, MO 63121', phone: '(800) 282-2881', fax: '(800) 758-1488' },
          { name: 'OptumRx Mail Order Pharmacy', group: 'Mail Order', address: '2300 Main St, Irvine, CA 92614', phone: '(855) 427-4682', fax: '(855) 427-4683' },
          { name: 'Amazon Pharmacy', group: 'Mail Order', address: '440 Terry Ave N, Seattle, WA 98109', phone: '(855) 745-5725', fax: '(855) 745-5726' },
          // ── Hospital ──
          { name: 'Hospital Outpatient Pharmacy (on-site)', group: 'Hospital', address: 'See facility directory', phone: '', fax: '' },
          { name: 'VA Outpatient Pharmacy — VA Medical Center', group: 'VA', address: 'See VA directory', phone: '(800) 827-1000', fax: '' },
        ];

        // ── Illinois Lab directory (proximity-sorted) ────────────────────────
        const LAB_DIRECTORY = ILLINOIS_LABS.map(lab => ({
          name:    lab.name,
          network: lab.network,
          address: [lab.address1, lab.address2, lab.city && `${lab.city}, ${lab.state} ${lab.zip}`].filter(Boolean).join(', '),
          phone:   lab.phone,
          fax:     lab.fax,
          _prox:   p?.address ? getLabProximityInfo(p.address, lab) : null,
        })).sort((a, b) => {
          const sa = a._prox?.score ?? 999;
          const sb = b._prox?.score ?? 999;
          return sa - sb || a.name.localeCompare(b.name);
        });

        // ── Psych med auto-fill defaults ──────────────────────────────────────
        const PSYCH_MED_DEFAULTS = [
          { match: 'sertraline',    dose: '50mg',     sig: 'Take 1 tablet by mouth once daily in the morning',              qty: '30', refills: '3' },
          { match: 'zoloft',       dose: '50mg',     sig: 'Take 1 tablet by mouth once daily in the morning',              qty: '30', refills: '3' },
          { match: 'fluoxetine',   dose: '20mg',     sig: 'Take 1 capsule by mouth once daily in the morning',             qty: '30', refills: '3' },
          { match: 'prozac',       dose: '20mg',     sig: 'Take 1 capsule by mouth once daily in the morning',             qty: '30', refills: '3' },
          { match: 'escitalopram', dose: '10mg',     sig: 'Take 1 tablet by mouth once daily',                             qty: '30', refills: '3' },
          { match: 'lexapro',      dose: '10mg',     sig: 'Take 1 tablet by mouth once daily',                             qty: '30', refills: '3' },
          { match: 'citalopram',   dose: '20mg',     sig: 'Take 1 tablet by mouth once daily',                             qty: '30', refills: '3' },
          { match: 'celexa',       dose: '20mg',     sig: 'Take 1 tablet by mouth once daily',                             qty: '30', refills: '3' },
          { match: 'paroxetine',   dose: '20mg',     sig: 'Take 1 tablet by mouth once daily in the morning',              qty: '30', refills: '3' },
          { match: 'paxil',        dose: '20mg',     sig: 'Take 1 tablet by mouth once daily in the morning',              qty: '30', refills: '3' },
          { match: 'fluvoxamine',  dose: '50mg',     sig: 'Take 1 tablet by mouth at bedtime',                             qty: '30', refills: '3' },
          { match: 'venlafaxine',  dose: '75mg',     sig: 'Take 1 capsule by mouth once daily with food',                  qty: '30', refills: '3' },
          { match: 'effexor',      dose: '75mg',     sig: 'Take 1 capsule by mouth once daily with food',                  qty: '30', refills: '3' },
          { match: 'duloxetine',   dose: '30mg',     sig: 'Take 1 capsule by mouth once daily',                            qty: '30', refills: '3' },
          { match: 'cymbalta',     dose: '30mg',     sig: 'Take 1 capsule by mouth once daily',                            qty: '30', refills: '3' },
          { match: 'desvenlafaxine', dose: '50mg',   sig: 'Take 1 tablet by mouth once daily',                             qty: '30', refills: '3' },
          { match: 'pristiq',      dose: '50mg',     sig: 'Take 1 tablet by mouth once daily',                             qty: '30', refills: '3' },
          { match: 'bupropion',    dose: '150mg',    sig: 'Take 1 tablet by mouth once daily in the morning',              qty: '30', refills: '3' },
          { match: 'wellbutrin',   dose: '150mg',    sig: 'Take 1 tablet by mouth once daily in the morning',              qty: '30', refills: '3' },
          { match: 'mirtazapine',  dose: '15mg',     sig: 'Take 1 tablet by mouth at bedtime',                             qty: '30', refills: '3' },
          { match: 'remeron',      dose: '15mg',     sig: 'Take 1 tablet by mouth at bedtime',                             qty: '30', refills: '3' },
          { match: 'trazodone',    dose: '50mg',     sig: 'Take 1 tablet by mouth at bedtime as needed for insomnia',      qty: '30', refills: '3' },
          { match: 'lithium',      dose: '300mg',    sig: 'Take 1 capsule by mouth three times daily with food',           qty: '90', refills: '3' },
          { match: 'valproate',    dose: '250mg',    sig: 'Take 1 tablet by mouth twice daily with food',                  qty: '60', refills: '3' },
          { match: 'depakote',     dose: '500mg',    sig: 'Take 1 tablet by mouth twice daily with food',                  qty: '60', refills: '3' },
          { match: 'depakene',     dose: '250mg',    sig: 'Take 1 capsule by mouth three times daily with food',           qty: '90', refills: '3' },
          { match: 'lamotrigine',  dose: '25mg',     sig: 'Take 1 tablet by mouth once daily — titrate per schedule',      qty: '30', refills: '3' },
          { match: 'lamictal',     dose: '25mg',     sig: 'Take 1 tablet by mouth once daily — titrate per schedule',      qty: '30', refills: '3' },
          { match: 'carbamazepine', dose: '200mg',   sig: 'Take 1 tablet by mouth twice daily with food',                  qty: '60', refills: '3' },
          { match: 'tegretol',     dose: '200mg',    sig: 'Take 1 tablet by mouth twice daily with food',                  qty: '60', refills: '3' },
          { match: 'oxcarbazepine', dose: '300mg',   sig: 'Take 1 tablet by mouth twice daily',                            qty: '60', refills: '3' },
          { match: 'trileptal',    dose: '300mg',    sig: 'Take 1 tablet by mouth twice daily',                            qty: '60', refills: '3' },
          { match: 'aripiprazole', dose: '10mg',     sig: 'Take 1 tablet by mouth once daily',                             qty: '30', refills: '3' },
          { match: 'abilify',      dose: '10mg',     sig: 'Take 1 tablet by mouth once daily',                             qty: '30', refills: '3' },
          { match: 'olanzapine',   dose: '5mg',      sig: 'Take 1 tablet by mouth at bedtime',                             qty: '30', refills: '3' },
          { match: 'zyprexa',      dose: '5mg',      sig: 'Take 1 tablet by mouth at bedtime',                             qty: '30', refills: '3' },
          { match: 'quetiapine',   dose: '50mg',     sig: 'Take 1 tablet by mouth at bedtime',                             qty: '30', refills: '3' },
          { match: 'seroquel',     dose: '50mg',     sig: 'Take 1 tablet by mouth at bedtime',                             qty: '30', refills: '3' },
          { match: 'risperidone',  dose: '1mg',      sig: 'Take 1 tablet by mouth twice daily',                            qty: '60', refills: '3' },
          { match: 'risperdal',    dose: '1mg',      sig: 'Take 1 tablet by mouth twice daily',                            qty: '60', refills: '3' },
          { match: 'haloperidol',  dose: '2mg',      sig: 'Take 1 tablet by mouth once daily',                             qty: '30', refills: '3' },
          { match: 'haldol',       dose: '2mg',      sig: 'Take 1 tablet by mouth once daily',                             qty: '30', refills: '3' },
          { match: 'lurasidone',   dose: '40mg',     sig: 'Take 1 tablet by mouth once daily with food (≥350 cal)',        qty: '30', refills: '3' },
          { match: 'latuda',       dose: '40mg',     sig: 'Take 1 tablet by mouth once daily with food',                   qty: '30', refills: '3' },
          { match: 'ziprasidone',  dose: '40mg',     sig: 'Take 1 capsule by mouth twice daily with food',                 qty: '60', refills: '3' },
          { match: 'geodon',       dose: '40mg',     sig: 'Take 1 capsule by mouth twice daily with food',                 qty: '60', refills: '3' },
          { match: 'clozapine',    dose: '25mg',     sig: 'Take 1 tablet by mouth twice daily — titrate per protocol',     qty: '60', refills: '0' },
          { match: 'clozaril',     dose: '25mg',     sig: 'Take 1 tablet by mouth twice daily',                            qty: '60', refills: '0' },
          { match: 'buspirone',    dose: '10mg',     sig: 'Take 1 tablet by mouth twice daily',                            qty: '60', refills: '3' },
          { match: 'buspar',       dose: '10mg',     sig: 'Take 1 tablet by mouth twice daily',                            qty: '60', refills: '3' },
          { match: 'hydroxyzine',  dose: '25mg',     sig: 'Take 1 tablet by mouth every 6 hours as needed for anxiety',    qty: '30', refills: '3' },
          { match: 'vistaril',     dose: '25mg',     sig: 'Take 1 capsule by mouth every 6 hours as needed',               qty: '30', refills: '3' },
          { match: 'clonazepam',   dose: '0.5mg',    sig: 'Take 1 tablet by mouth twice daily',                            qty: '60', refills: '0' },
          { match: 'klonopin',     dose: '0.5mg',    sig: 'Take 1 tablet by mouth twice daily',                            qty: '60', refills: '0' },
          { match: 'lorazepam',    dose: '0.5mg',    sig: 'Take 1 tablet by mouth as needed — max 3x/day',                 qty: '30', refills: '0' },
          { match: 'ativan',       dose: '0.5mg',    sig: 'Take 1 tablet by mouth as needed',                              qty: '30', refills: '0' },
          { match: 'diazepam',     dose: '5mg',      sig: 'Take 1 tablet by mouth as needed — lowest effective dose',      qty: '30', refills: '0' },
          { match: 'valium',       dose: '5mg',      sig: 'Take 1 tablet by mouth as needed',                              qty: '30', refills: '0' },
          { match: 'prazosin',     dose: '1mg',      sig: 'Take 1 tablet by mouth at bedtime for nightmares — titrate',    qty: '30', refills: '3' },
          { match: 'zolpidem',     dose: '5mg',      sig: 'Take 1 tablet by mouth at bedtime as needed for insomnia',      qty: '30', refills: '0' },
          { match: 'ambien',       dose: '5mg',      sig: 'Take 1 tablet by mouth at bedtime as needed',                   qty: '30', refills: '0' },
          { match: 'eszopiclone',  dose: '1mg',      sig: 'Take 1 tablet by mouth at bedtime as needed',                   qty: '30', refills: '0' },
          { match: 'lunesta',      dose: '1mg',      sig: 'Take 1 tablet by mouth at bedtime as needed',                   qty: '30', refills: '0' },
          { match: 'suvorexant',   dose: '10mg',     sig: 'Take 1 tablet by mouth 30 minutes before bedtime',              qty: '30', refills: '0' },
          { match: 'belsomra',     dose: '10mg',     sig: 'Take 1 tablet by mouth 30 minutes before bedtime',              qty: '30', refills: '0' },
          { match: 'adderall',     dose: '10mg',     sig: 'Take 1 tablet by mouth once daily in the morning',              qty: '30', refills: '0' },
          { match: 'amphetamine',  dose: '10mg',     sig: 'Take 1 tablet by mouth once daily in the morning',              qty: '30', refills: '0' },
          { match: 'vyvanse',      dose: '20mg',     sig: 'Take 1 capsule by mouth once daily in the morning',             qty: '30', refills: '0' },
          { match: 'lisdexamfetamine', dose: '20mg', sig: 'Take 1 capsule by mouth once daily in the morning',             qty: '30', refills: '0' },
          { match: 'methylphenidate', dose: '10mg',  sig: 'Take 1 tablet by mouth twice daily',                            qty: '60', refills: '0' },
          { match: 'ritalin',      dose: '10mg',     sig: 'Take 1 tablet by mouth twice daily',                            qty: '60', refills: '0' },
          { match: 'concerta',     dose: '18mg',     sig: 'Take 1 tablet by mouth once daily in the morning',              qty: '30', refills: '0' },
          { match: 'donepezil',    dose: '5mg',      sig: 'Take 1 tablet by mouth at bedtime',                             qty: '30', refills: '3' },
          { match: 'aricept',      dose: '5mg',      sig: 'Take 1 tablet by mouth at bedtime',                             qty: '30', refills: '3' },
          { match: 'memantine',    dose: '5mg',      sig: 'Take 1 tablet by mouth once daily — titrate to 10mg BID',       qty: '30', refills: '3' },
          { match: 'namenda',      dose: '5mg',      sig: 'Take 1 tablet by mouth once daily',                             qty: '30', refills: '3' },
          { match: 'naltrexone',   dose: '50mg',     sig: 'Take 1 tablet by mouth once daily',                             qty: '30', refills: '3' },
          { match: 'buprenorphine', dose: '8mg/2mg', sig: 'Place 1 film under tongue once daily — dissolve completely',    qty: '30', refills: '3' },
          { match: 'suboxone',     dose: '8mg/2mg',  sig: 'Place 1 film under tongue once daily',                          qty: '30', refills: '3' },
          { match: 'acamprosate',  dose: '666mg',    sig: 'Take 1 tablet by mouth three times daily with meals',           qty: '90', refills: '3' },
          { match: 'campral',      dose: '666mg',    sig: 'Take 1 tablet by mouth three times daily with meals',           qty: '90', refills: '3' },
        ];
        const getPsychMedDefaults = (name) => {
          if (!name || name.length < 3) return null;
          const lower = name.toLowerCase();
          const sorted = [...PSYCH_MED_DEFAULTS].sort((a, b) => b.match.length - a.match.length);
          return sorted.find(d => lower.includes(d.match)) || null;
        };

        // ── Auto-populate handler ─────────────────────────────────────────────
        const handleMedNameChange = (idx, name) => {
          const defaults      = getPsychMedDefaults(name);
          const sigSuggestions = resolveSigSuggestions(
            name, patMeds, currentUser?.sigFavorites || [], PSYCH_MED_DEFAULTS
          );
          setOrderGroupItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            // Only auto-fill pharmacy if none chosen yet
            const pharmFill = !item.medPharmacy
              ? resolvePharmacy(p, currentUser, patMeds)
              : null;
            return {
              ...item,
              medName: name,
              // Clinic defaults (dose, sig, qty, refills)
              ...(defaults ? {
                medDose:     item.medDose     || defaults.dose,
                medSig:      item.medSig      || defaults.sig,
                medQuantity: (!item.medQuantity || item.medQuantity === '30') ? defaults.qty     : item.medQuantity,
                medRefills:  (!item.medRefills  || item.medRefills  === '0')  ? defaults.refills : item.medRefills,
              } : {}),
              // Pharmacy auto-fill
              ...(pharmFill ? {
                medPharmacy:     pharmFill.name,
                medPharmAddress: pharmFill.address,
                medPharmPhone:   pharmFill.phone,
                medPharmFax:     pharmFill.fax,
                _pharmAutoSource: pharmFill.sourceLabel,
              } : {}),
              _sigSuggestions: sigSuggestions,
            };
          }));
        };

        // ── Type-switch handler — auto-populate pharmacy when switching to Medication ──
        const handleTypeChange = (idx, newType) => {
          if (newType !== 'Medication') {
            updateOrderGroupItem(idx, 'type', newType);
            return;
          }
          setOrderGroupItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            if (item.type === 'Medication') return { ...item, type: newType }; // already med
            const pharmFill = !item.medPharmacy
              ? resolvePharmacy(p, currentUser, patMeds)
              : null;
            return {
              ...item,
              type: newType,
              ...(pharmFill ? {
                medPharmacy:      pharmFill.name,
                medPharmAddress:  pharmFill.address,
                medPharmPhone:    pharmFill.phone,
                medPharmFax:      pharmFill.fax,
                _pharmAutoSource: pharmFill.sourceLabel,
              } : {}),
            };
          }));
        };

        const validCount = orderGroupItems.filter(i => getOrderDescription(i).trim()).length;
        return (
        <div style={overlayStyle} onClick={closePanel}>
          <div style={{ ...panelStyle, width: 540, maxWidth: '96vw' }} onClick={e => e.stopPropagation()}>
            <div style={panelHeaderStyle}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>📦 Order Group — {p.lastName}, {p.firstName}</h3>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => printPanel('ordergroup')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>🖨️ Print</button>
                <button onClick={closePanel} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>
            </div>
            <div style={panelBodyStyle}>
              {orderGroupSaved ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <span style={{ fontSize: 36 }}>✅</span>
                  <h3>Orders Submitted</h3>
                  <p>{validCount} order{validCount !== 1 ? 's' : ''} placed for {p.lastName}, {p.firstName}</p>
                  {showPatientLetter && patientLetter.body.trim() && (
                    <p style={{ color: 'var(--success)', fontWeight: 600, marginTop: 4 }}>📧 Patient letter sent</p>
                  )}
                  <button className="btn btn-sm btn-secondary" onClick={() => { setOrderGroupSaved(false); setOrderGroupItems([{ ...BLANK_ORDER }]); setOrderGroupName(''); setShowPatientLetter(false); setPatientLetter({ subject: '', body: '', delivery: 'portal' }); }} style={{ marginTop: 12 }}>New Order Group</button>
                </div>
              ) : (
                <>
                  {/* ── Group Name ── */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>GROUP NAME</label>
                    <input className="form-input" placeholder="e.g. Quarterly Monitoring, New Patient Workup…" value={orderGroupName} onChange={e => setOrderGroupName(e.target.value)} style={{ fontSize: 12 }} />
                  </div>

                  {/* ── Quick Bundles ── */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>QUICK BUNDLES</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {QUICK_BUNDLES.map(bundle => (
                        <button
                          key={bundle.label}
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: 11, padding: '4px 10px' }}
                          onClick={() => setOrderGroupItems(bundle.items.map(it => ({ ...BLANK_ORDER, ...it })))}
                        >{bundle.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* ── Orders ── */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>ORDERS ({orderGroupItems.length})</div>

                  {orderGroupItems.map((item, idx) => (
                    <div key={idx} className="card" style={{ padding: 12, marginBottom: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                      {/* Row 1: type tabs + priority + delete */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', minWidth: 20 }}>#{idx + 1}</span>
                        <div style={{ display: 'flex', gap: 3, flex: 1, flexWrap: 'wrap' }}>
                          {['Lab', 'Medication', 'Imaging', 'Referral', 'Procedure'].map(t => (
                            <button
                              key={t}
                              onClick={() => handleTypeChange(idx, t)}
                              style={{
                                padding: '3px 9px', fontSize: 11, borderRadius: 6, cursor: 'pointer', fontWeight: item.type === t ? 700 : 400,
                                background: item.type === t ? 'var(--primary)' : 'var(--bg-white)',
                                color: item.type === t ? '#fff' : 'var(--text-secondary)',
                                border: item.type === t ? '1px solid var(--primary)' : '1px solid var(--border)',
                              }}
                            >{t === 'Medication' ? '💊 Rx' : t === 'Lab' ? '🧪 Lab' : t === 'Imaging' ? '🩻 Imaging' : t === 'Referral' ? '🔗 Referral' : '🔧 Procedure'}</button>
                          ))}
                        </div>
                        <select className="form-select" value={item.priority} onChange={e => updateOrderGroupItem(idx, 'priority', e.target.value)} style={{ fontSize: 11, flex: '0 0 80px' }}>
                          <option>Routine</option>
                          <option>Urgent</option>
                          <option>STAT</option>
                        </select>
                        {orderGroupItems.length > 1 && (
                          <button onClick={() => removeOrderGroupItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--danger)' }}>🗑️</button>
                        )}
                      </div>

                      {/* ── Lab fields ── */}
                      {item.type === 'Lab' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <select className="form-select" value={item.labPanel} onChange={e => updateOrderGroupItem(idx, 'labPanel', e.target.value)} style={{ fontSize: 12 }}>
                            <option value="">— Select lab panel —</option>
                            {LAB_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                          {item.labPanel === 'Other (free text)' && (
                            <input className="form-input" placeholder="Describe the lab…" value={item.description} onChange={e => updateOrderGroupItem(idx, 'description', e.target.value)} style={{ fontSize: 12 }} />
                          )}
                          <input className="form-input" placeholder="Clinical indication / notes" value={item.notes} onChange={e => updateOrderGroupItem(idx, 'notes', e.target.value)} style={{ fontSize: 12 }} />
                          {/* Lab destination */}
                          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2 }}>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>🏥 Send to Lab</label>
                            {item.labNetwork ? (
                              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '8px 10px', fontSize: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div>
                                    <div style={{ fontWeight: 700, color: '#0c4a6e' }}>{item.labNetwork}</div>
                                    {item.labAddress && <div style={{ color: '#374151', marginTop: 2 }}>{item.labAddress}</div>}
                                    {item.labPhone && <div style={{ color: '#6b7280', marginTop: 2 }}>📞 {item.labPhone}</div>}
                                  </div>
                                  <button type="button" onClick={() => { updateOrderGroupItem(idx, 'labNetwork', ''); updateOrderGroupItem(idx, 'labAddress', ''); updateOrderGroupItem(idx, 'labPhone', ''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6b7280', padding: '0 2px', lineHeight: 1 }} title="Change lab">✕</button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ position: 'relative' }}>
                                <input
                                  className="form-input"
                                  placeholder="🔍 Search lab — Quest, LabCorp, hospital, reference…"
                                  value={labDropdownIdx === idx ? (item._labSearch || '') : ''}
                                  onChange={e => { updateOrderGroupItem(idx, '_labSearch', e.target.value); setLabDropdownIdx(idx); }}
                                  onFocus={() => setLabDropdownIdx(idx)}
                                  onBlur={() => setTimeout(() => setLabDropdownIdx(null), 180)}
                                  style={{ fontSize: 12 }}
                                />
                                {labDropdownIdx === idx && (
                                  <div style={{ position: 'absolute', zIndex: 300, left: 0, right: 0, top: '100%', border: '1px solid var(--border)', borderRadius: 6, background: '#fff', maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.13)' }}>
                                    {LAB_DIRECTORY.filter(lab => { const q = (item._labSearch || '').toLowerCase(); return !q || lab.name.toLowerCase().includes(q) || lab.network.toLowerCase().includes(q) || lab.address.toLowerCase().includes(q); }).slice(0, 12).map((lab, li) => (
                                      <button key={li} type="button"
                                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', border: 'none', borderBottom: '1px solid #f3f4f6', background: 'transparent', cursor: 'pointer' }}
                                        onMouseOver={e => e.currentTarget.style.background = '#f0f9ff'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={() => { updateOrderGroupItem(idx, 'labNetwork', lab.name); updateOrderGroupItem(idx, 'labAddress', lab.address); updateOrderGroupItem(idx, 'labPhone', lab.phone); updateOrderGroupItem(idx, '_labSearch', ''); setLabDropdownIdx(null); }}
                                      >
                                        <div style={{ fontWeight: 600, fontSize: 12, color: '#1e3a5f' }}>{lab.name}</div>
                                        <div style={{ fontSize: 10.5, color: '#6b7280', marginTop: 1 }}>{lab.address}</div>
                                        {lab.phone && <div style={{ fontSize: 10.5, color: '#6b7280' }}>📞 {lab.phone}{lab.fax ? `  ·  Fax: ${lab.fax}` : ''}</div>}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── Medication fields ── */}
                      {item.type === 'Medication' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {/* Drug name with auto-fill */}
                          <div>
                            <input
                              className="form-input"
                              placeholder="Drug name (e.g. Sertraline, Depakote, Quetiapine…)"
                              value={item.medName}
                              onChange={e => handleMedNameChange(idx, e.target.value)}
                              style={{ fontSize: 12, fontWeight: 600 }}
                            />
                            {getPsychMedDefaults(item.medName) && (
                              <div style={{ fontSize: 10, color: '#16a34a', marginTop: 2 }}>✓ defaults auto-filled — edit any field to override</div>
                            )}
                          </div>

                          {/* ── Active Medications Context Panel ── */}
                          {(() => {
                            if (item.medName.length < 2) return null;
                            const ctx = getActiveMedContext(item.medName, patMeds);
                            if (ctx.activeMeds.length === 0) return null;
                            const hasDupes = ctx.duplicates.length > 0;
                            return (
                              <div style={{ border: `1px solid ${hasDupes ? '#fed7aa' : '#e2e8f0'}`, borderRadius: 8, overflow: 'hidden', fontSize: 12 }}>
                                {/* Toggle header */}
                                <button
                                  type="button"
                                  onClick={() => updateOrderGroupItem(idx, '_showActiveMeds', !item._showActiveMeds)}
                                  style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '7px 11px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                    background: hasDupes ? '#fff7ed' : '#f8fafc',
                                    borderBottom: item._showActiveMeds ? `1px solid ${hasDupes ? '#fed7aa' : '#e2e8f0'}` : 'none',
                                  }}
                                >
                                  <span style={{ fontSize: 10, color: '#6b7280' }}>{item._showActiveMeds ? '▲' : '▼'}</span>
                                  <span style={{ fontWeight: 700, fontSize: 11.5, color: hasDupes ? '#92400e' : '#374151' }}>
                                    {hasDupes
                                      ? `⚠ Duplicate risk — ${ctx.duplicates.length} active match${ctx.duplicates.length > 1 ? 'es' : ''}`
                                      : `Active Medications (${ctx.activeMeds.length})`}
                                  </span>
                                  {ctx.lastFill && hasDupes && (
                                    <span style={{ fontSize: 10.5, color: '#6b7280', marginLeft: 'auto' }}>
                                      Last filled: {ctx.lastFill}
                                    </span>
                                  )}
                                  {!hasDupes && (
                                    <span style={{ fontSize: 10.5, color: '#9ca3af', marginLeft: 'auto' }}>
                                      {ctx.activeMeds.length} active · click to review
                                    </span>
                                  )}
                                </button>
                                {/* Expanded list */}
                                {item._showActiveMeds && (
                                  <div style={{ maxHeight: 192, overflowY: 'auto' }}>
                                    {ctx.activeMeds.map((med, mi) => {
                                      const isDupe = ctx.duplicates.some(d => d.id === med.id || d.name === med.name);
                                      return (
                                        <div key={med.id || mi} style={{
                                          display: 'flex', alignItems: 'center', gap: 10,
                                          padding: '6px 11px',
                                          borderBottom: mi < ctx.activeMeds.length - 1 ? '1px solid #f3f4f6' : 'none',
                                          background: isDupe ? '#fffbeb' : 'transparent',
                                          borderLeft: `3px solid ${isDupe ? '#f59e0b' : 'transparent'}`,
                                        }}>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <span style={{ fontWeight: 700, color: isDupe ? '#92400e' : '#111827', fontSize: 12 }}>{med.name}</span>
                                            {med.dose && <span style={{ color: '#6b7280', marginLeft: 5, fontSize: 11 }}>{med.dose}</span>}
                                            {med.frequency && <span style={{ color: '#9ca3af', marginLeft: 4, fontSize: 11 }}>· {med.frequency}</span>}
                                          </div>
                                          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                                            {isDupe && (
                                              <span style={{ fontSize: 9.5, fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '1px 6px', borderRadius: 8 }}>
                                                duplicate
                                              </span>
                                            )}
                                            {med.lastFilled && (
                                              <span style={{ fontSize: 10, color: '#9ca3af' }}>filled {med.lastFilled}</span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* ── PDMP Banner ── */}
                          {(() => {
                            const csSchedule = getControlledSchedule(item.medName || '');
                            if (!csSchedule) return null;
                            const acked = !!pdmpAcknowledged[idx];
                            const schedColor = { CII:'#dc2626', CIII:'#d97706', 'CIII/CIV':'#d97706', CIV:'#7c3aed' };
                            const sc = schedColor[csSchedule] || '#d97706';
                            return (
                              <div style={{
                                borderRadius: 8, padding: '9px 12px',
                                display: 'flex', alignItems: 'center', gap: 10,
                                background: acked ? '#f0fdf4' : '#fff7ed',
                                border: `1px solid ${acked ? '#86efac' : '#fcd34d'}`,
                                transition: 'background 0.3s',
                              }}>
                                <span style={{ fontSize: 17, flexShrink: 0 }}>{acked ? '✅' : '⚠️'}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: 12, color: acked ? '#15803d' : '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {acked ? 'IL-PMP Checked ✓' : 'Controlled Substance — PDMP Check Required'}
                                    <span style={{
                                      fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                                      background: acked ? 'rgba(22,163,74,0.15)' : `${sc}18`,
                                      color: acked ? '#16a34a' : sc,
                                      border: `1px solid ${acked ? '#86efac' : sc + '50'}`,
                                      letterSpacing: '0.4px',
                                    }}>
                                      {csSchedule}
                                    </span>
                                  </div>
                                  {!acked && (
                                    <div style={{ fontSize: 10.5, color: '#92400e', marginTop: 1 }}>
                                      Illinois law requires a PMP query before dispensing controlled substances.
                                    </div>
                                  )}
                                </div>
                                {!acked ? (
                                  <button
                                    type="button"
                                    onClick={() => openPdmp(idx, item.medName, csSchedule)}
                                    style={{
                                      background: '#92400e', color: '#fff', border: 'none',
                                      borderRadius: 6, padding: '6px 13px', fontSize: 11.5,
                                      fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                                      boxShadow: '0 1px 6px rgba(146,64,14,0.35)',
                                    }}
                                  >
                                    View PDMP Report →
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openPdmp(idx, item.medName, csSchedule)}
                                    style={{
                                      background: 'none', border: '1px solid #86efac',
                                      color: '#15803d', borderRadius: 6,
                                      padding: '4px 10px', fontSize: 10.5, cursor: 'pointer',
                                      whiteSpace: 'nowrap', flexShrink: 0,
                                    }}
                                  >
                                    Re-view
                                  </button>
                                )}
                              </div>
                            );
                          })()}

                          {/* ── Drug Interaction Check ── */}
                          {(() => {
                            if (!item.medName || item.medName.length < 3) return null;
                            const ixns = checkInteractions(patMeds.map(m => m.name), item.medName);
                            if (ixns.length === 0) return null;
                            const worst = ixns.find(i => i.severity === 'Contraindicated') ? 'Contraindicated'
                              : ixns.find(i => i.severity === 'Major') ? 'Major' : 'Moderate';
                            const IXN_COLORS = {
                              Contraindicated: { bg:'#fef2f2', border:'#fca5a5', color:'#dc2626', icon:'🚫' },
                              Major:           { bg:'#fff7ed', border:'#fed7aa', color:'#ea580c', icon:'⚠️' },
                              Moderate:        { bg:'#fffbeb', border:'#fde68a', color:'#d97706', icon:'⚡' },
                            };
                            const sc = IXN_COLORS[worst];
                            return (
                              <div style={{ background:sc.bg, border:`1px solid ${sc.border}`, borderRadius:8, padding:'9px 12px' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                                  <span style={{ fontSize:15 }}>{sc.icon}</span>
                                  <span style={{ fontWeight:700, fontSize:12, color:sc.color }}>Drug Interaction — {worst}</span>
                                  <span style={{ fontSize:10.5, color:sc.color, marginLeft:'auto', fontWeight:600 }}>
                                    {ixns.length} alert{ixns.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                                {ixns.map((ix, i) => (
                                  <div key={i} style={{ fontSize:11.5, marginBottom: i < ixns.length-1 ? 5 : 0, padding:'5px 8px', background:'rgba(255,255,255,0.6)', borderRadius:6 }}>
                                    <div style={{ fontWeight:700, color:sc.color }}>{ix.pairLabel}</div>
                                    <div style={{ color:'#374151', marginTop:2 }}>{ix.effect}</div>
                                    {ix.action && <div style={{ fontSize:10.5, color:'#6b7280', marginTop:1, fontStyle:'italic' }}>{ix.action}</div>}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                            <input className="form-input" placeholder="Dose (e.g. 50mg)" value={item.medDose} onChange={e => updateOrderGroupItem(idx, 'medDose', e.target.value)} style={{ fontSize: 12, background: getPsychMedDefaults(item.medName) && item.medDose ? '#f0fdf4' : undefined }} />
                            <select className="form-select" value={item.medRoute} onChange={e => updateOrderGroupItem(idx, 'medRoute', e.target.value)} style={{ fontSize: 12 }}>
                              {ROUTES.map(r => <option key={r}>{r}</option>)}
                            </select>
                            <select className="form-select" value={item.medFrequency} onChange={e => updateOrderGroupItem(idx, 'medFrequency', e.target.value)} style={{ fontSize: 12 }}>
                              <option value="">— Frequency —</option>
                              {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                            </select>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Qty / Supply</label>
                              <input className="form-input" placeholder="30" value={item.medQuantity} onChange={e => updateOrderGroupItem(idx, 'medQuantity', e.target.value)} style={{ fontSize: 12 }} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Refills</label>
                              <input className="form-input" placeholder="0" value={item.medRefills} onChange={e => updateOrderGroupItem(idx, 'medRefills', e.target.value)} style={{ fontSize: 12 }} />
                            </div>
                          </div>
                          {/* Sig input + smart suggestions */}
                          <div>
                            <input className="form-input" placeholder="Sig / Patient instructions (e.g. Take 1 tablet by mouth each morning)" value={item.medSig} onChange={e => updateOrderGroupItem(idx, 'medSig', e.target.value)} style={{ fontSize: 12, background: getPsychMedDefaults(item.medName) && item.medSig ? '#f0fdf4' : undefined }} />
                            {/* Sig suggestions — show when sig is empty */}
                            {!item.medSig && item._sigSuggestions?.length > 0 && (
                              <div style={{ marginTop: 5 }}>
                                <div style={{ fontSize: 9.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Sig suggestions</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {item._sigSuggestions.map((s, si) => (
                                    <button key={si} type="button"
                                      onClick={() => updateOrderGroupItem(idx, 'medSig', s.sig)}
                                      style={{
                                        textAlign: 'left', padding: '6px 10px',
                                        background: s.source === 'patient_history' ? '#f0fdf4' : s.source === 'provider_favorite' ? '#eff6ff' : '#f9fafb',
                                        border: `1px solid ${s.source === 'patient_history' ? '#86efac' : s.source === 'provider_favorite' ? '#bfdbfe' : '#e5e7eb'}`,
                                        borderRadius: 6, cursor: 'pointer', lineHeight: 1.5,
                                        transition: 'background 0.1s',
                                      }}
                                      onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                                      onMouseOut={e => e.currentTarget.style.opacity = '1'}
                                    >
                                      <div style={{ fontSize: 9.5, fontWeight: 700, color: s.source === 'patient_history' ? '#15803d' : s.source === 'provider_favorite' ? '#1d4ed8' : '#6366f1', marginBottom: 2 }}>
                                        {s.label}
                                      </div>
                                      <div style={{ fontSize: 11, color: '#1f2937' }}>{s.sig}</div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                            <input type="checkbox" checked={item.medDispenseAsWritten} onChange={e => updateOrderGroupItem(idx, 'medDispenseAsWritten', e.target.checked)} />
                            Dispense As Written (DAW) — no generic substitution
                          </label>
                          <input className="form-input" placeholder="Clinical notes / special instructions" value={item.notes} onChange={e => updateOrderGroupItem(idx, 'notes', e.target.value)} style={{ fontSize: 12 }} />
                          {/* Pharmacy destination */}
                          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 2 }}>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>📍 Send to Pharmacy</label>
                            {item.medPharmacy ? (
                              /* ── Selected card (like picture) ── */
                              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0c4a6e' }}>{item.medPharmacy}</div>
                                    {item.medPharmAddress && <div style={{ fontSize: 12, color: '#374151', marginTop: 3 }}>{item.medPharmAddress}</div>}
                                    <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                                      {item.medPharmPhone && <span style={{ fontSize: 11.5, color: '#6b7280' }}>📞 {item.medPharmPhone}</span>}
                                      {item.medPharmFax   && <span style={{ fontSize: 11.5, color: '#6b7280' }}>📠 Fax: {item.medPharmFax}</span>}
                                    </div>
                                    {/* Auto-selection source label */}
                                    {item._pharmAutoSource && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 10.5, color: '#0369a1' }}>
                                        <span>🤖</span>
                                        <span style={{ fontStyle: 'italic' }}>{item._pharmAutoSource}</span>
                                        <button type="button"
                                          onClick={() => updateOrderGroupItem(idx, '_pharmAutoSource', null)}
                                          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#9ca3af', padding: 0 }}
                                          title="Dismiss label"
                                        >✕</button>
                                      </div>
                                    )}
                                  </div>
                                  <button type="button"
                                    onClick={() => { updateOrderGroupItem(idx, 'medPharmacy', ''); updateOrderGroupItem(idx, 'medPharmAddress', ''); updateOrderGroupItem(idx, 'medPharmPhone', ''); updateOrderGroupItem(idx, 'medPharmFax', ''); updateOrderGroupItem(idx, '_pharmAutoSource', null); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14, padding: '0 2px', lineHeight: 1 }} title="Change pharmacy"
                                  >✕</button>
                                </div>
                                <button type="button"
                                  onClick={() => { setPharmDrawerTargetIdx(idx); setPharmDrawerOpen(true); }}
                                  style={{ marginTop: 8, fontSize: 11, color: '#0369a1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                                >Change pharmacy</button>
                              </div>
                            ) : (
                              /* ── Open drawer button ── */
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {preferredPharmacy && (
                                  <button type="button"
                                    onClick={() => updateOrderGroupItem(idx, 'medPharmacy', preferredPharmacy)}
                                    style={{ textAlign: 'left', padding: '6px 9px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: '#166534' }}
                                  >↩ Use preferred: <strong>{preferredPharmacy}</strong></button>
                                )}
                                <button type="button"
                                  onClick={() => { setPharmDrawerTargetIdx(idx); setPharmDrawerOpen(true); }}
                                  style={{ padding: '8px 12px', background: '#1a1f2e', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 8, fontSize: 12, cursor: 'pointer', color: '#a5b4fc', fontWeight: 600, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
                                  onMouseOver={e => { e.currentTarget.style.background = '#232838'; }}
                                  onMouseOut={e => { e.currentTarget.style.background = '#1a1f2e'; }}
                                >
                                  💊 <span>Select Pharmacy…</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── Imaging fields ── */}
                      {item.type === 'Imaging' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Modality</label>
                              <select className="form-select" value={item.imgModality} onChange={e => updateOrderGroupItem(idx, 'imgModality', e.target.value)} style={{ fontSize: 12 }}>
                                {MODALITIES.map(m => <option key={m}>{m}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Body Part / Area</label>
                              <input className="form-input" placeholder="e.g. Brain, Chest, Spine" value={item.imgBodyPart} onChange={e => updateOrderGroupItem(idx, 'imgBodyPart', e.target.value)} style={{ fontSize: 12 }} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Laterality</label>
                              <select className="form-select" value={item.imgLaterality} onChange={e => updateOrderGroupItem(idx, 'imgLaterality', e.target.value)} style={{ fontSize: 12 }}>
                                {LATERALITY.map(l => <option key={l}>{l}</option>)}
                              </select>
                            </div>
                          </div>
                          <input className="form-input" placeholder="Clinical indication / reason for imaging" value={item.imgReason} onChange={e => updateOrderGroupItem(idx, 'imgReason', e.target.value)} style={{ fontSize: 12 }} />
                          <input className="form-input" placeholder="Additional notes (contrast, protocol, etc.)" value={item.notes} onChange={e => updateOrderGroupItem(idx, 'notes', e.target.value)} style={{ fontSize: 12 }} />
                        </div>
                      )}

                      {/* ── Referral fields ── */}
                      {item.type === 'Referral' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Specialty</label>
                              <select className="form-select" value={item.refSpecialty} onChange={e => updateOrderGroupItem(idx, 'refSpecialty', e.target.value)} style={{ fontSize: 12 }}>
                                {REF_SPECIALTIES.map(s => <option key={s}>{s}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Provider / Facility (optional)</label>
                              <input className="form-input" placeholder="e.g. Dr. Smith, Northwestern" value={item.refProvider} onChange={e => updateOrderGroupItem(idx, 'refProvider', e.target.value)} style={{ fontSize: 12 }} />
                            </div>
                          </div>
                          <textarea className="form-input" placeholder="Reason for referral / clinical notes" value={item.refReason} onChange={e => updateOrderGroupItem(idx, 'refReason', e.target.value)} style={{ fontSize: 12, minHeight: 60, resize: 'vertical' }} />
                          <input className="form-input" placeholder="Additional notes" value={item.notes} onChange={e => updateOrderGroupItem(idx, 'notes', e.target.value)} style={{ fontSize: 12 }} />
                        </div>
                      )}

                      {/* ── Procedure fields ── */}
                      {item.type === 'Procedure' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <input className="form-input" placeholder="Procedure description (e.g. Spravato nasal spray 56mg, TMS session)" value={item.description} onChange={e => updateOrderGroupItem(idx, 'description', e.target.value)} style={{ fontSize: 12, fontWeight: 600 }} />
                          <input className="form-input" placeholder="Clinical indication / notes" value={item.notes} onChange={e => updateOrderGroupItem(idx, 'notes', e.target.value)} style={{ fontSize: 12 }} />
                        </div>
                      )}
                    </div>
                  ))}

                  <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => addOrderGroupItem()} style={{ flex: 1 }}>+ Add Order</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => addOrderGroupItem({ type: 'Medication' })} style={{ flex: 1 }}>+ Add Rx</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => addOrderGroupItem({ type: 'Lab' })} style={{ flex: 1 }}>+ Add Lab</button>
                  </div>

                  {/* ── Patient Letter Toggle ────────────────── */}
                  {!showPatientLetter ? (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setShowPatientLetter(true)}
                      style={{ width: '100%', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Patient Letter
                    </button>
                  ) : (
                    <div className="card" style={{ padding: 14, marginBottom: 16, background: 'var(--bg)', borderLeft: '3px solid var(--primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>✉️</span> Patient Letter
                        </div>
                        <button
                          onClick={() => { setShowPatientLetter(false); setPatientLetter({ subject: '', body: '', delivery: 'portal' }); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--danger)' }}
                          title="Remove letter"
                        >🗑️</button>
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }}>Delivery Method</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[
                            { key: 'portal', label: '🌐 Portal' },
                            { key: 'email', label: '✉️ Email' },
                            { key: 'sms', label: '📱 SMS' },
                            { key: 'print', label: '🖨️ Print' },
                          ].map(d => (
                            <button
                              key={d.key}
                              className={`btn btn-sm ${patientLetter.delivery === d.key ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setPatientLetter(prev => ({ ...prev, delivery: d.key }))}
                              style={{ fontSize: 11, padding: '3px 8px' }}
                            >{d.label}</button>
                          ))}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                          {patientLetter.delivery === 'portal' && `Letter will appear in ${p.firstName}'s portal inbox`}
                          {patientLetter.delivery === 'email' && `Sending to: ${p.email || 'No email on file'}`}
                          {patientLetter.delivery === 'sms' && `Sending to: ${p.cellPhone || p.phone || 'No phone on file'}`}
                          {patientLetter.delivery === 'print' && 'Letter will be generated for printing'}
                        </div>
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }}>Letter Template</label>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setLetterTemplateOpen(!letterTemplateOpen)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '7px 10px' }}
                        >
                          <span>📄 Choose a sample letter…</span>
                          <span style={{ fontSize: 9, opacity: 0.6 }}>{letterTemplateOpen ? '▲' : '▼'}</span>
                        </button>
                        {letterTemplateOpen && (
                          <div style={{ marginTop: 4, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', maxHeight: 240, overflowY: 'auto', background: '#ffffff' }}>
                            {getLetterTemplates().map(t => (
                              <div
                                key={t.id}
                                onClick={() => {
                                  setPatientLetter(prev => ({ ...prev, subject: t.subject, body: t.body }));
                                  setLetterTemplateOpen(false);
                                }}
                                style={{
                                  padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                                  borderBottom: '1px solid var(--border)', fontSize: 12, transition: 'background 0.1s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <span style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>{t.icon}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600 }}>{t.label}</div>
                                </div>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Use →</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }}>Subject</label>
                        <input
                          className="form-input"
                          placeholder="e.g. Your Lab Results, Follow-up Instructions…"
                          value={patientLetter.subject}
                          onChange={e => setPatientLetter(prev => ({ ...prev, subject: e.target.value }))}
                          style={{ fontSize: 12 }}
                        />
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }}>Letter Body</label>
                        <textarea
                          className="form-input"
                          placeholder={`Dear ${p.firstName},\n\nYour provider has placed the following orders...\n\nPlease contact our office if you have any questions.`}
                          value={patientLetter.body}
                          onChange={e => setPatientLetter(prev => ({ ...prev, body: e.target.value }))}
                          style={{ fontSize: 12, minHeight: 120, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Quick insert:</span>
                        {[
                          { label: 'Greeting', text: `Dear ${p.firstName},\n\n` },
                          { label: 'Order Summary', text: `The following orders have been placed on your behalf:\n${orderGroupItems.filter(i => i.description.trim()).map(i => `  • ${i.type}: ${i.description}`).join('\n')}\n\n` },
                          { label: 'Follow-up', text: 'Please follow up with our office if you have any questions or concerns.\n' },
                          { label: 'Signature', text: `\nSincerely,\n${currentUser?.firstName} ${currentUser?.lastName}${currentUser?.credentials ? ', ' + currentUser.credentials : ''}\n` },
                        ].map(t => (
                          <button
                            key={t.label}
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: 10, padding: '2px 7px' }}
                            onClick={() => setPatientLetter(prev => ({ ...prev, body: prev.body + t.text }))}
                          >{t.label}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button className="btn btn-primary" onClick={submitOrderGroup} disabled={validCount === 0} style={{ width: '100%', opacity: validCount === 0 ? 0.5 : 1 }}>
                    Submit {validCount} Order{validCount !== 1 ? 's' : ''}{showPatientLetter && patientLetter.body.trim() ? ' + Letter' : ''}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* ── Chart Export ─────────────────────────────────────── */}
      {activePanel === 'export' && (
        <div style={overlayStyle} onClick={closePanel}>
          <div style={panelStyle} onClick={e => e.stopPropagation()}>
            <div style={panelHeaderStyle}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>📤 Chart Export — {p.lastName}, {p.firstName}</h3>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => printPanel('quickview')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>🖨️ Print Chart</button>
                <button onClick={closePanel} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>
            </div>
            <div style={panelBodyStyle}>
              {exportStarted ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <span style={{ fontSize: 36 }}>📤</span>
                  <h3>Export Downloaded</h3>
                  <p>Chart export has been generated with {exportSections.length} sections.</p>
                  <button className="btn btn-primary btn-sm" onClick={() => setExportStarted(false)} style={{ marginTop: 12 }}>Export Again</button>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Format</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['PDF', 'CCD/CDA', 'FHIR Bundle', 'Plain Text'].map(f => (
                        <button
                          key={f}
                          className={`btn btn-sm ${exportFormat === f ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setExportFormat(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Select Sections</div>
                  {[
                    { key: 'demographics', label: '👤 Demographics' },
                    { key: 'allergies', label: '⚠️ Allergies' },
                    { key: 'problems', label: '🩺 Problem List' },
                    { key: 'medications', label: '💊 Medications' },
                    { key: 'vitals', label: '💓 Vitals' },
                    { key: 'labs', label: '🔬 Lab Results' },
                    { key: 'assessments', label: '📊 Assessments' },
                    { key: 'immunizations', label: '💉 Immunizations' },
                    { key: 'encounters', label: '🗒️ Encounters' },
                    { key: 'orders', label: '📝 Orders' },
                  ].map(sec => (
                    <label key={sec.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={exportSections.includes(sec.key)}
                        onChange={() => toggleExportSection(sec.key)}
                      />
                      {sec.label}
                    </label>
                  ))}

                  <div style={{ marginTop: 16, padding: 12, background: 'var(--bg)', borderRadius: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                    ⚠️ Export contains PHI. Handle per HIPAA/institutional policy. Audit log entry will be created.
                  </div>

                  <button className="btn btn-primary" onClick={handleExport} style={{ width: '100%', marginTop: 16 }}>
                    📤 Download Export ({exportSections.length} sections)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Send Forms & Screeners ──────────────────────────── */}
      {activePanel === 'forms' && (
        <div style={overlayStyle} onClick={closePanel}>
          <div style={panelStyle} onClick={e => e.stopPropagation()}>
            <div style={panelHeaderStyle}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>📨 Send Forms & Screeners</h3>
              <button onClick={closePanel} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>

            </div>
            <div style={panelBodyStyle}>
              {formsSent ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <span style={{ fontSize: 36 }}>✅</span>
                  <h3>Forms Sent</h3>
                  <p>{selectedForms.length} form(s) sent to {p.firstName} {p.lastName} via {formDelivery === 'portal' ? 'Patient Portal' : formDelivery === 'email' ? 'Email' : 'SMS'}.</p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Delivery Method</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { key: 'portal', label: '🌐 Patient Portal' },
                        { key: 'email', label: '✉️ Email' },
                        { key: 'sms', label: '📱 SMS' },
                      ].map(d => (
                        <button
                          key={d.key}
                          className={`btn btn-sm ${formDelivery === d.key ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setFormDelivery(d.key)}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {formDelivery === 'portal' && `Will appear in ${p.firstName}'s portal inbox`}
                      {formDelivery === 'email' && `Sending to: ${p.email || 'No email on file'}`}
                      {formDelivery === 'sms' && `Sending to: ${p.cellPhone || p.phone || 'No phone on file'}`}
                    </div>
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Screeners</div>
                  <div style={{ marginBottom: 16 }}>
                    {availableForms.filter(f => f.icon === '📊' || f.icon === '🚨').map(form => (
                      <label
                        key={form.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: 13,
                          cursor: 'pointer', borderRadius: 8, marginBottom: 2,
                          background: selectedForms.includes(form.id) ? 'var(--primary-light)' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <input type="checkbox" checked={selectedForms.includes(form.id)} onChange={() => toggleForm(form.id)} />
                        <span>{form.icon}</span>
                        <span style={{ fontWeight: selectedForms.includes(form.id) ? 700 : 400 }}>{form.name}</span>
                      </label>
                    ))}
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Forms & Consents</div>
                  <div style={{ marginBottom: 16 }}>
                    {availableForms.filter(f => f.icon !== '📊' && f.icon !== '🚨').map(form => (
                      <label
                        key={form.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: 13,
                          cursor: 'pointer', borderRadius: 8, marginBottom: 2,
                          background: selectedForms.includes(form.id) ? 'var(--primary-light)' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <input type="checkbox" checked={selectedForms.includes(form.id)} onChange={() => toggleForm(form.id)} />
                        <span>{form.icon}</span>
                        <span style={{ fontWeight: selectedForms.includes(form.id) ? 700 : 400 }}>{form.name}</span>
                      </label>
                    ))}
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={handleSendForms}
                    disabled={selectedForms.length === 0}
                    style={{ width: '100%', opacity: selectedForms.length === 0 ? 0.5 : 1 }}
                  >
                    📨 Send {selectedForms.length} Form{selectedForms.length !== 1 ? 's' : ''} to {p.firstName}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Patient Letters ──────────────────────────────── */}
      {activePanel === 'letters' && (() => {
        const CATEGORIES = [
          { key: 'all',      label: 'All Letters' },
          { key: 'clinical', label: '🩺 Clinical' },
          { key: 'work',     label: '💼 Work' },
          { key: 'school',   label: '🎓 School' },
          { key: 'housing',  label: '🏠 Housing' },
          { key: 'legal',    label: '⚖️ Legal' },
          { key: 'travel',   label: '✈️ Travel' },
          { key: 'admin',    label: '📂 Admin' },
        ];
        const allTemplates = getLetterTemplates();
        const filtered = allTemplates.filter(t => {
          const matchCat = lettersCategoryFilter === 'all' || t.category === lettersCategoryFilter;
          const matchSearch = !lettersSearch || t.label.toLowerCase().includes(lettersSearch.toLowerCase());
          return matchCat && matchSearch;
        });
        return (
          <div style={overlayStyle} onClick={closePanel}>
            <div style={{ ...panelStyle, width: 520, maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
              <div style={panelHeaderStyle}>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>📝 Patient Letters — {p.lastName}, {p.firstName}</h3>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={() => printPanel('letters')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>🖨️ Print</button>
                  <button onClick={closePanel} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                </div>
              </div>
              <div style={panelBodyStyle}>
                {lettersSent ? (
                  <div className="empty-state" style={{ padding: '40px 20px' }}>
                    <span style={{ fontSize: 36 }}>✅</span>
                    <h3>Letter Sent</h3>
                    <p>"{lettersSubject}" sent to {p.firstName} {p.lastName} via {lettersDelivery === 'portal' ? 'Patient Portal' : lettersDelivery === 'email' ? 'Email' : lettersDelivery === 'print' ? 'Print' : 'Fax'}.</p>
                    <button className="btn btn-sm btn-secondary" onClick={() => { setLettersSent(false); setLettersSubject(''); setLettersBody(''); }} style={{ marginTop: 12 }}>Write Another Letter</button>
                  </div>
                ) : lettersBody ? (
                  /* ── Edit & Send Mode ── */
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => setLettersBody('')} style={{ fontSize: 11 }}>← Back to Templates</button>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>DELIVERY METHOD</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[{ key: 'portal', label: '🌐 Portal' }, { key: 'email', label: '✉️ Email' }, { key: 'print', label: '🖨️ Print' }, { key: 'fax', label: '📠 Fax' }].map(d => (
                          <button key={d.key} className={`btn btn-sm ${lettersDelivery === d.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLettersDelivery(d.key)} style={{ fontSize: 11 }}>{d.label}</button>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                        {lettersDelivery === 'portal' && `Sends to ${p.firstName}'s patient portal inbox`}
                        {lettersDelivery === 'email' && `Sends to: ${p.email || 'No email on file'}`}
                        {lettersDelivery === 'print' && 'Letter will be formatted for printing'}
                        {lettersDelivery === 'fax' && 'Letter will be queued for fax transmission'}
                      </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>SUBJECT</label>
                      <input className="form-input" value={lettersSubject} onChange={e => setLettersSubject(e.target.value)} style={{ fontSize: 12 }} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>LETTER BODY</label>
                      <textarea
                        className="form-input"
                        value={lettersBody}
                        onChange={e => setLettersBody(e.target.value)}
                        style={{ fontSize: 12, minHeight: 340, resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}
                      />
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>Edit the letter above — bracketed fields [like this] need to be filled in.</div>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => setLettersSent(true)}
                      disabled={!lettersSubject.trim() || !lettersBody.trim()}
                      style={{ width: '100%', opacity: !lettersSubject.trim() || !lettersBody.trim() ? 0.5 : 1 }}
                    >
                      {lettersDelivery === 'print' ? '🖨️ Print Letter' : lettersDelivery === 'fax' ? '📠 Send via Fax' : `📤 Send Letter to ${p.firstName}`}
                    </button>
                  </>
                ) : (
                  /* ── Template Browser ── */
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <input
                        className="form-input"
                        placeholder="🔍 Search letters..."
                        value={lettersSearch}
                        onChange={e => setLettersSearch(e.target.value)}
                        style={{ fontSize: 12, marginBottom: 8 }}
                      />
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat.key}
                            className={`btn btn-sm ${lettersCategoryFilter === cat.key ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setLettersCategoryFilter(cat.key)}
                            style={{ fontSize: 10, padding: '3px 8px' }}
                          >{cat.label}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{filtered.length} letter{filtered.length !== 1 ? 's' : ''} available</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {filtered.map(t => (
                        <div
                          key={t.id}
                          className="card"
                          style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'box-shadow 0.1s' }}
                          onClick={() => { setLettersSubject(t.subject); setLettersBody(t.body); }}
                          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                        >
                          <span style={{ fontSize: 22, flexShrink: 0, width: 30, textAlign: 'center' }}>{t.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{t.subject}</div>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, flexShrink: 0 }}>Use →</span>
                        </div>
                      ))}
                      {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>No letters match your search.</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Referral ─────────────────────────────────────── */}
      {activePanel === 'referral' && (
        <div style={overlayStyle} onClick={closePanel}>
          <div style={panelStyle} onClick={e => e.stopPropagation()}>
            <div style={panelHeaderStyle}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>🔗 Referral — {p.lastName}, {p.firstName}</h3>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => printPanel('referral')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>🖨️ Print</button>
                <button onClick={closePanel} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>
            </div>
            <div style={panelBodyStyle}>
              {referralSent ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <span style={{ fontSize: 36 }}>✅</span>
                  <h3>Referral Sent</h3>
                  <p>{referralData.specialty} referral for {p.firstName} {p.lastName} sent via {referralData.delivery === 'fax' ? 'Fax' : referralData.delivery === 'portal' ? 'Provider Portal' : 'Phone'}.</p>
                  <button className="btn btn-sm btn-secondary" onClick={() => { setReferralSent(false); setReferralData({ specialty: 'Psychiatry', provider: '', reason: '', urgency: 'Routine', notes: '', delivery: 'fax' }); }} style={{ marginTop: 12 }}>New Referral</button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>SPECIALTY</label>
                      <select className="form-select" value={referralData.specialty} onChange={e => setReferralData(p => ({ ...p, specialty: e.target.value }))} style={{ fontSize: 12, width: '100%' }}>
                        {['Psychiatry', 'Psychology / Therapy', 'Neuropsychology', 'Neurology', 'Primary Care / PCP', 'Cardiology', 'Endocrinology', 'Sleep Medicine', 'Pain Management', 'Substance Use Treatment (IOP)', 'Substance Use Treatment (PHP)', 'Inpatient Psychiatric', 'Case Management / Social Work', 'Vocational Rehabilitation', 'Dietitian / Nutritionist', 'Physical Therapy', 'Occupational Therapy', 'Other'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>URGENCY</label>
                      <select className="form-select" value={referralData.urgency} onChange={e => setReferralData(p => ({ ...p, urgency: e.target.value }))} style={{ fontSize: 12, width: '100%' }}>
                        <option>Routine</option>
                        <option>Urgent (within 1-2 weeks)</option>
                        <option>STAT (within 48 hours)</option>
                        <option>Emergency</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>REFERRING TO (Provider / Facility)</label>
                    <input className="form-input" placeholder="e.g. Dr. Jane Smith, Northwestern Memorial Hospital..." value={referralData.provider} onChange={e => setReferralData(p => ({ ...p, provider: e.target.value }))} style={{ fontSize: 12 }} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>REASON FOR REFERRAL</label>
                    <textarea className="form-input" placeholder="Clinical indication, specific concerns, what you are requesting..." value={referralData.reason} onChange={e => setReferralData(p => ({ ...p, reason: e.target.value }))} style={{ fontSize: 12, minHeight: 80, resize: 'vertical' }} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>PATIENT CONTEXT (auto-filled)</label>
                    <div className="card" style={{ padding: 10, fontSize: 12, background: 'var(--bg)' }}>
                      <div style={{ marginBottom: 4 }}><span style={{ color: 'var(--text-muted)' }}>Diagnoses:</span> {patProblems.slice(0, 3).map(pr => pr.name || pr.problem).join(', ') || '—'}</div>
                      <div style={{ marginBottom: 4 }}><span style={{ color: 'var(--text-muted)' }}>Current meds:</span> {patMeds.slice(0, 3).map(m => m.name).join(', ') || '—'}</div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Insurance:</span> {p.insurance?.primary?.name || '—'}</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>ADDITIONAL NOTES</label>
                    <textarea className="form-input" placeholder="Preferred providers, scheduling notes, special instructions..." value={referralData.notes} onChange={e => setReferralData(p => ({ ...p, notes: e.target.value }))} style={{ fontSize: 12, minHeight: 60, resize: 'vertical' }} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>SEND VIA</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[{ key: 'fax', label: '📠 Fax' }, { key: 'portal', label: '🌐 Provider Portal' }, { key: 'phone', label: '📞 Phone' }].map(d => (
                        <button key={d.key} className={`btn btn-sm ${referralData.delivery === d.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setReferralData(p => ({ ...p, delivery: d.key }))} style={{ fontSize: 12 }}>{d.label}</button>
                      ))}
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={() => setReferralSent(true)} disabled={!referralData.reason.trim()} style={{ width: '100%', opacity: !referralData.reason.trim() ? 0.5 : 1 }}>
                    🔗 Submit Referral
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Labs ────────────────────────────────────── */}
      {activePanel === 'quicklabs' && (() => {
        const LAB_PANELS = [
          { id: 'cmp',        icon: '🧬', label: 'CMP (Comprehensive Metabolic Panel)',   tests: 'Glucose, BUN, Creatinine, eGFR, Electrolytes, LFTs', indication: 'Baseline / medication monitoring' },
          { id: 'bmp',        icon: '🧬', label: 'BMP (Basic Metabolic Panel)',            tests: 'Glucose, BUN, Creatinine, Electrolytes',             indication: 'Quick metabolic check' },
          { id: 'cbc',        icon: '🩸', label: 'CBC with Differential',                 tests: 'WBC, RBC, Hgb, Hct, Platelets, Differential',       indication: 'Anemia, infection screen' },
          { id: 'lipid',      icon: '💉', label: 'Lipid Panel',                           tests: 'Total Cholesterol, LDL, HDL, Triglycerides',         indication: 'Cardiovascular risk / antipsychotics' },
          { id: 'thyroid',    icon: '🦋', label: 'Thyroid Panel (TSH, T3, T4)',           tests: 'TSH, Free T3, Free T4',                              indication: 'Mood / fatigue workup' },
          { id: 'hba1c',      icon: '🩺', label: 'HbA1c + Fasting Glucose',              tests: 'HbA1c, Fasting Glucose',                             indication: 'Diabetes / metabolic syndrome' },
          // ── Mood Stabilizer Levels ───────────────────────────────────────────
          { id: 'lithium',    icon: '⚗️', label: 'Lithium Level (trough)',                tests: 'Serum Lithium — draw before morning dose',           indication: 'Therapeutic range: 0.6–1.2 mEq/L' },
          { id: 'valproate',  icon: '💊', label: 'Depakote / Valproate Total Level',      tests: 'Valproic Acid total (trough)',                       indication: 'Therapeutic range: 50–125 mcg/mL — draw before dose' },
          { id: 'valproate-free', icon: '💊', label: 'Valproate Free Acid Level',         tests: 'Free valproic acid',                                 indication: 'Check when albumin low or protein binding affected' },
          { id: 'carbamazepine', icon: '⚗️', label: 'Carbamazepine (Tegretol) Level',    tests: 'Carbamazepine trough',                               indication: 'Therapeutic range: 4–12 mcg/mL' },
          { id: 'lamotrigine', icon: '⚗️', label: 'Lamotrigine Level',                   tests: 'Lamotrigine serum level',                            indication: 'Therapeutic range: 3–14 mcg/mL' },
          // ── Depakote Safety Labs ─────────────────────────────────────────────
          { id: 'ammonia',    icon: '⚠️', label: 'Ammonia Level',                        tests: 'Serum Ammonia',                                      indication: 'Valproate-induced hyperammonemia — check if AMS' },
          { id: 'folate',     icon: '🌿', label: 'Folic Acid Level',                     tests: 'Serum Folate',                                       indication: 'Depakote depletes folate — critical in pregnancy' },
          // ── Antipsychotic Levels ─────────────────────────────────────────────
          { id: 'clozapine',  icon: '⚗️', label: 'Clozapine Level + ANC',               tests: 'Clozapine level, ANC (absolute neutrophil count)',   indication: 'Clozapine REMS monitoring — required before dispensing' },
          { id: 'olanzapine', icon: '⚗️', label: 'Olanzapine Level',                    tests: 'Olanzapine serum level',                             indication: 'Check adherence or subtherapeutic response' },
          { id: 'haloperidol',icon: '⚗️', label: 'Haloperidol Level',                   tests: 'Haloperidol serum level',                            indication: 'Therapeutic range: 5–20 ng/mL' },
          // ── Antipsychotic Safety Monitoring ─────────────────────────────────
          { id: 'metabolic',  icon: '📊', label: 'Metabolic Syndrome Panel',             tests: 'CMP, CBC, Fasting Glucose, HbA1c, Lipid Panel, TSH', indication: 'Antipsychotic metabolic monitoring' },
          { id: 'prolactin',  icon: '🧪', label: 'Prolactin Level',                      tests: 'Serum Prolactin',                                    indication: 'Antipsychotic-induced hyperprolactinemia' },
          { id: 'fasting-insulin', icon: '📊', label: 'Fasting Insulin + HOMA-IR',       tests: 'Fasting Insulin, HOMA-IR calculated',                indication: 'Insulin resistance — atypical antipsychotics' },
          // ── Urine Toxicology ─────────────────────────────────────────────────
          { id: 'uds-10',     icon: '🔬', label: 'Urine Drug Screen — 10-panel',         tests: 'Amphetamines, Benzos, Cannabis, Cocaine, Opiates, PCP, Barbiturates, Methadone, Oxycodone, Methamphetamine', indication: 'Substance use monitoring / PDMP compliance' },
          { id: 'uds-fentanyl', icon: '⚠️', label: 'Urine Fentanyl Screen',             tests: 'Urine fentanyl immunoassay',                         indication: 'Standard UDS misses fentanyl — order separately' },
          { id: 'uds-benzo',  icon: '🔬', label: 'Urine Benzo Screen + Confirmation',   tests: 'Benzo immunoassay + GC-MS confirmation',             indication: 'Confirm benzodiazepine use/non-use' },
          { id: 'uds-confirm',icon: '🔬', label: 'Urine Drug Confirmation (GC-MS)',      tests: 'GC-MS confirmatory testing',                         indication: 'Confirm or rule out positive immunoassay result' },
          { id: 'uds-comprehensive', icon: '🔬', label: 'Urine Toxicology — Comprehensive', tests: 'Extended UDS — 20+ substances including synthetic opioids', indication: 'Comprehensive substance monitoring' },
          { id: 'preg',       icon: '🌸', label: 'Urine Pregnancy Test (hCG)',           tests: 'Urine hCG',                                          indication: 'Pre-medication / teratogen check' },
          // ── General ──────────────────────────────────────────────────────────
          { id: 'lft',        icon: '🫀', label: 'Liver Function Tests (LFTs)',          tests: 'ALT, AST, Alk Phos, Bilirubin, Albumin',            indication: 'Liver monitoring / valproate / alcohol use' },
          { id: 'renal',      icon: '🫘', label: 'Renal Function Panel',                 tests: 'BUN, Creatinine, eGFR, BMP',                         indication: 'Renal monitoring for medications' },
          { id: 'b12-folate', icon: '🌿', label: 'B12 + Folate',                         tests: 'Vitamin B12, Folate',                                indication: 'Mood / cognitive workup' },
          { id: 'vitd',       icon: '☀️', label: 'Vitamin D (25-OH)',                    tests: '25-Hydroxyvitamin D',                                indication: 'Mood / fatigue workup' },
          { id: 'iron',       icon: '🔩', label: 'Iron Studies',                         tests: 'Serum Iron, TIBC, Ferritin, Transferrin',            indication: 'Fatigue / anemia evaluation' },
          { id: 'std',        icon: '🔬', label: 'STI / Infectious Panel',              tests: 'HIV, Syphilis (RPR), Hepatitis B, Hepatitis C',       indication: 'Infectious disease screening' },
        ];
        return (
          <div style={overlayStyle} onClick={closePanel}>
            <div style={panelStyle} onClick={e => e.stopPropagation()}>
              <div style={panelHeaderStyle}>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>🧪 Quick Labs — {p.lastName}, {p.firstName}</h3>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    onClick={() => printPanel('quicklabs', { panels: selectedLabs.map(id => LAB_PANELS.find(l => l.id === id)).filter(Boolean) })}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >🖨️ Print</button>
                  <button onClick={closePanel} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                </div>
              </div>
              <div style={panelBodyStyle}>
                {labsSent ? (
                  <div className="empty-state" style={{ padding: '40px 20px' }}>
                    <span style={{ fontSize: 36 }}>✅</span>
                    <h3>Labs Ordered</h3>
                    <p>{selectedLabs.length} lab panel{selectedLabs.length !== 1 ? 's' : ''} ordered for {p.firstName} {p.lastName} — {labPriority} priority{quickLabNetwork ? ` · ${quickLabNetwork}` : ''}.</p>
                    <button className="btn btn-sm btn-secondary" onClick={() => { setLabsSent(false); setSelectedLabs([]); setLabNotes(''); setQuickLabNetwork(''); setQuickLabAddress(''); }} style={{ marginTop: 12 }}>Order More Labs</button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                      Select one or more panels — tap a panel to add it to the order.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                      {LAB_PANELS.map(lab => {
                        const isSelected = selectedLabs.includes(lab.id);
                        return (
                          <div
                            key={lab.id}
                            onClick={() => setSelectedLabs(prev => isSelected ? prev.filter(id => id !== lab.id) : [...prev, lab.id])}
                            className="card"
                            style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)', background: isSelected ? 'var(--primary-light)' : '#fff', transition: 'all 0.1s' }}
                          >
                            <span style={{ fontSize: 18, width: 26, textAlign: 'center', flexShrink: 0 }}>{lab.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: isSelected ? 700 : 500, fontSize: 12 }}>{lab.label}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{lab.tests}</div>
                              <div style={{ fontSize: 10, color: isSelected ? 'var(--primary)' : 'var(--text-muted)', fontStyle: 'italic', marginTop: 1 }}>Indication: {lab.indication}</div>
                            </div>
                            {isSelected && <span style={{ color: 'var(--primary)', fontSize: 16, fontWeight: 800 }}>✓</span>}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>PRIORITY</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {['Routine', 'Urgent', 'STAT'].map(p => (
                          <button key={p} className={`btn btn-sm ${labPriority === p ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLabPriority(p)} style={{ fontSize: 12 }}>{p}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>NOTES FOR LAB</label>
                      <input className="form-input" placeholder="Fasting required, trough level, specific instructions..." value={labNotes} onChange={e => setLabNotes(e.target.value)} style={{ fontSize: 12 }} />
                    </div>
                    <div style={{ marginBottom: 14, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>🏥 SEND TO LAB</label>
                      <select
                        className="form-select"
                        value={quickLabNetwork}
                        onChange={e => setQuickLabNetwork(e.target.value)}
                        style={{ fontSize: 12, marginBottom: 6 }}
                      >
                        <option value="">— Select lab network —</option>
                        {['Quest Diagnostics', 'LabCorp', 'Hospital Lab (in-house)', 'ARUP Laboratories', 'BioReference Laboratories', 'Mayo Clinic Laboratories', 'Sonic Healthcare', 'Other (specify)'].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <input
                        className="form-input"
                        placeholder="Location / address (optional — e.g. 123 Main St, Chicago IL 60601)"
                        value={quickLabAddress}
                        onChange={e => setQuickLabAddress(e.target.value)}
                        style={{ fontSize: 11, color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd' }}
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        selectedLabs.forEach(labId => {
                          const lab = LAB_PANELS.find(l => l.id === labId);
                          if (lab) addOrder(patientId, { type: 'Lab', description: lab.label, priority: labPriority, notes: [labNotes || lab.indication, quickLabNetwork, quickLabAddress].filter(Boolean).join(' · '), labNetwork: quickLabNetwork, labAddress: quickLabAddress, status: 'Pending', orderedDate: new Date().toISOString().split('T')[0], orderedBy: `${currentUser.firstName} ${currentUser.lastName}` });
                        });
                        setLabsSent(true);
                      }}
                      disabled={selectedLabs.length === 0}
                      style={{ width: '100%', opacity: selectedLabs.length === 0 ? 0.5 : 1 }}
                    >
                      🧪 Order {selectedLabs.length} Lab Panel{selectedLabs.length !== 1 ? 's' : ''} — {labPriority}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
          CLINICAL TOOL OVERLAYS
          ══════════════════════════════════════════════════════ */}

      {/* ── Assessment Scorer (PHQ-9 / GAD-7 / C-SSRS) ─────── */}
      {assessScorerOpen && (
        <div style={centeredOverlayStyle} onClick={() => setAssessScorerOpen(false)}>
          <div style={{ width: 760, maxWidth: '100%', marginTop: 'auto', marginBottom: 'auto' }} onClick={e => e.stopPropagation()}>
            <AssessmentScorer
              patientId={patientId}
              patientName={`${p.firstName} ${p.lastName}`}
              existingScores={assessmentHistory}
              onSave={(type, entry) => setAssessmentHistory(prev => ({ ...prev, [type]: [...(prev[type] || []), entry] }))}
              onClose={() => setAssessScorerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Safety Plan Builder ──────────────────────────────── */}
      {safetyPlanOpen && (
        <div style={centeredOverlayStyle} onClick={() => setSafetyPlanOpen(false)}>
          <div style={{ width: 680, maxWidth: '100%', marginTop: 'auto', marginBottom: 'auto' }} onClick={e => e.stopPropagation()}>
            <SafetyPlanBuilder
              patient={p}
              provider={currentUser ? `${currentUser.firstName} ${currentUser.lastName}${currentUser.credentials ? ', ' + currentUser.credentials : ''}` : ''}
              existingPlan={safetyPlanData}
              onSave={(plan) => { setSafetyPlanData(plan); }}
              onClose={() => setSafetyPlanOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Medication Adherence Timeline ────────────────────── */}
      {adherenceOpen && (
        <div style={centeredOverlayStyle} onClick={() => setAdherenceOpen(false)}>
          <div style={{ width: 720, maxWidth: '100%', marginTop: 'auto', marginBottom: 'auto' }} onClick={e => e.stopPropagation()}>
            <MedAdherenceTimeline
              meds={patMeds}
              pdmpFills={pdmpReport?.fills || []}
              today={new Date().toISOString().split('T')[0]}
              onClose={() => setAdherenceOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Prior Authorization Drawer ───────────────────────── */}
      <PriorAuthDrawer
        isOpen={priorAuthOpen}
        onClose={() => setPriorAuthOpen(false)}
        patientId={patientId}
        patientName={p ? `${p.firstName} ${p.lastName}` : ''}
        insurance={p?.insurance?.primary}
        existingPAs={priorAuthList}
        onSave={(pa) => setPriorAuthList(prev => {
          const idx = prev.findIndex(x => x.id === pa.id);
          return idx >= 0 ? prev.map((x, i) => i === idx ? pa : x) : [...prev, pa];
        })}
      />

      {/* ── Patient Portal Inbox ─────────────────────────────── */}
      <PatientPortalInbox
        isOpen={portalInboxOpen}
        onClose={() => setPortalInboxOpen(false)}
        patient={p}
        provider={currentUser}
      />

      {/* ── Sticky Note FAB + Widget ──────────────────────── */}
      {!stickyOpen && (
        <button
          onClick={() => setStickyOpen(true)}
          title="Open Sticky Note"
          style={{
            position: 'fixed', bottom: 28, left: 310, zIndex: 900,
            width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: '#fde047', color: '#713f12',
            boxShadow: '0 3px 12px rgba(0,0,0,0.2), inset 0 -2px 4px rgba(0,0,0,0.08)',
            fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 5px 18px rgba(0,0,0,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.2)'; }}
        >
          📝
        </button>
      )}

      {stickyOpen && (
        <div
          ref={stickyDragRef}
          onMouseDown={onStickyMouseDown}
          style={{
            position: 'fixed',
            left: stickyPos.x,
            top: stickyPos.y,
            zIndex: 950,
            width: stickyMinimized ? 180 : 280,
            background: 'linear-gradient(175deg, #fef9c3 0%, #fde68a 40%, #fcd34d 100%)',
            borderRadius: '3px 3px 6px 6px',
            boxShadow: '2px 4px 16px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1)',
            fontFamily: "'Caveat', 'Patrick Hand', 'Comic Sans MS', cursive, sans-serif",
            cursor: 'grab',
            userSelect: 'none',
            transition: 'width 0.2s ease',
            /* tape strip effect at top */
          }}
        >
          {/* Tape strip */}
          <div style={{
            position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
            width: 60, height: 22, borderRadius: 2,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(200,200,180,0.5) 100%)',
            border: '1px solid rgba(180,170,140,0.3)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            zIndex: 1,
          }} />

          {/* Header bar */}
          <div style={{
            padding: '10px 10px 4px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: '#78350f', letterSpacing: '-0.2px',
              fontFamily: "'Inter', sans-serif",
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              📌 <span style={{ fontSize: 12, fontWeight: 800 }}>Sticky Note</span>
              {stickyText.trim().length > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                  background: 'rgba(120,53,15,0.15)', color: '#92400e',
                }}>{stickyText.trim().split('\n').length} line{stickyText.trim().split('\n').length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              <button
                onClick={(e) => { e.stopPropagation(); setStickyMinimized(!stickyMinimized); }}
                title={stickyMinimized ? 'Expand' : 'Minimize'}
                style={{
                  width: 22, height: 22, borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: 'rgba(120,53,15,0.1)', color: '#78350f', fontSize: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Inter, sans-serif',
                }}
              >{stickyMinimized ? '⬜' : '—'}</button>
              <button
                onClick={(e) => { e.stopPropagation(); setStickyOpen(false); }}
                title="Close"
                style={{
                  width: 22, height: 22, borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: 'rgba(220,38,38,0.12)', color: '#dc2626', fontSize: 13, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Inter, sans-serif',
                }}
              >×</button>
            </div>
          </div>

          {/* Note body */}
          {!stickyMinimized && (
            <div style={{ padding: '4px 12px 12px' }}>
              <textarea
                value={stickyText}
                onChange={(e) => setStickyText(e.target.value)}
                placeholder={"Quick notes, phone #'s, reminders...\n\ne.g.\n☎ (555) 867-5309 — mom\n⏰ Call back @ 2pm\n💊 Check lithium level"}
                style={{
                  width: '100%', minHeight: 160, maxHeight: 300, resize: 'vertical',
                  border: 'none', outline: 'none', background: 'transparent',
                  fontFamily: "'Caveat', 'Patrick Hand', 'Comic Sans MS', cursive",
                  fontSize: 17, lineHeight: 1.55, color: '#422006',
                  /* Ruled-line effect */
                  backgroundImage: 'repeating-linear-gradient(transparent, transparent 25px, rgba(120,53,15,0.08) 25px, rgba(120,53,15,0.08) 26px)',
                  backgroundSize: '100% 26px',
                  backgroundPositionY: '4px',
                  padding: '4px 2px',
                  boxSizing: 'border-box',
                  cursor: 'text',
                }}
              />
              {/* Footer */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 6, paddingTop: 6, borderTop: '1px dashed rgba(120,53,15,0.15)',
                gap: 6,
              }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); saveStickyNote(); }}
                    disabled={stickySaveStatus === 'saving'}
                    style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 4,
                      background: stickySaveStatus === 'saved' ? 'rgba(22,163,74,0.15)'
                               : stickySaveStatus === 'error'  ? 'rgba(220,38,38,0.15)'
                               : 'rgba(120,53,15,0.15)',
                      color: stickySaveStatus === 'saved' ? '#15803d'
                           : stickySaveStatus === 'error'  ? '#dc2626'
                           : '#78350f',
                      border: 'none', cursor: stickySaveStatus === 'saving' ? 'wait' : 'pointer',
                      fontFamily: 'Inter, sans-serif', transition: 'background 0.2s',
                    }}
                  >
                    {stickySaveStatus === 'saving' ? '…' : stickySaveStatus === 'saved' ? '✓ Saved' : stickySaveStatus === 'error' ? '✗ Error' : '💾 Save'}
                  </button>
                  {stickyText.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('Clear sticky note?')) setStickyText(''); }}
                      style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                        background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: 'none',
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      }}
                    >🗑</button>
                  )}
                </div>
                <span style={{
                  fontSize: 9, color: 'rgba(120,53,15,0.35)', fontFamily: 'Inter, sans-serif',
                  fontStyle: 'italic',
                }}>
                  {stickyText.length > 0 ? `${stickyText.length} chars` : 'For this chart only'}
                </span>
              </div>
            </div>
          )}

          {/* Minimized preview */}
          {stickyMinimized && (
            <div style={{
              padding: '2px 14px 10px', fontSize: 13, color: '#713f12',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              opacity: 0.7, fontStyle: 'italic',
            }}>
              {stickyText.trim().split('\n')[0] || 'Empty note...'}
            </div>
          )}
        </div>
      )}

      {/* Slot picker modal from chart */}
      {showSlotModal && (
        <ChartSlotModal
          patient={selectedPatient}
          providers={slotProviders}
          existingAppts={appointments}
          currentUser={currentUser}
          onSave={addAppointment}
          onClose={() => setShowSlotModal(false)}
        />
      )}

      {/* Inline keyframes for slide panel animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
