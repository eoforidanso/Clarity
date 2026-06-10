import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PatientHoverCard from '../components/PatientHoverCard';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../contexts/PatientContext';
import { useAuth } from '../contexts/AuthContext';
import { useSite } from '../contexts/SiteContext';

const VISIT_TYPES = [
  'Follow-Up', 'Office Visit', 'Telehealth', 'Walk-In',
  'Psychiatric Evaluation', 'Medication Management',
  'Crisis Intervention', 'Urgent Care', 'Initial Evaluation',
];

export default function PatientSearch() {
  const { patients, selectPatient, addEncounter, addPatient, appointments } = usePatient();
  const { currentUser } = useAuth();
  const { activeSiteId, isFiltered } = useSite();
  const [search, setSearch] = useState('');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  // ── Sticky notes ──────────────────────────────────────────────────────────
  const [stickyOpen, setStickyOpen]   = useState(null);   // patient id with open editor
  const [stickyDraft, setStickyDraft] = useState('');     // draft text while editing
  const [stickySaving, setStickySaving] = useState(false);
  // Local cache of saved notes so we don't need a full page reload
  const [stickyNotes, setStickyNotes] = useState({});     // { [patientId]: noteText }

  const openSticky = (e, patient) => {
    e.stopPropagation();
    setStickyOpen(patient.id);
    setStickyDraft(stickyNotes[patient.id] ?? patient.stickyNote ?? '');
  };

  const saveSticky = async (patientId) => {
    setStickySaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/patients/${patientId}/sticky-note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note: stickyDraft }),
      });
      if (res.ok) {
        setStickyNotes(prev => ({ ...prev, [patientId]: stickyDraft }));
        setStickyOpen(null);
      }
    } catch { /* non-critical */ }
    finally { setStickySaving(false); }
  };

  const clearSticky = async (patientId) => {
    setStickyDraft('');
    await saveSticky(patientId);
  };
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close sticky note popover on outside click
  useEffect(() => {
    if (!stickyOpen) return;
    const dismiss = () => setStickyOpen(null);
    window.addEventListener('click', dismiss);
    return () => window.removeEventListener('click', dismiss);
  }, [stickyOpen]);

  // New encounter modal state
  const [encounterModal, setEncounterModal] = useState(null); // patient object | null
  const today = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 5);
  const [encForm, setEncForm] = useState({});

  // Add Patient modal state
  const DEFAULT_PT = {
    firstName: '', lastName: '', dob: '', gender: 'Female',
    pronouns: 'They/Them',
    phone: '', cellPhone: '', email: '',
    address: { street: '', city: '', state: '', zip: '' },
    emergencyContact: { name: '', relationship: '', phone: '' },
    insurance: { primary: { name: '', memberId: '', groupNumber: '', copay: '' } },
    pcp: '', assignedProvider: '', preferredPharmacy: '', preferredPharmacyPhone: '', preferredPharmacyFax: '',
    language: 'English',
    race: 'Not Specified',
    ethnicity: 'Not Hispanic or Latino',
    maritalStatus: '', ssn: '',
  };
  const [addModal, setAddModal] = useState(false);
  const [ptForm, setPtForm] = useState(DEFAULT_PT);
  const [ptSaving, setPtSaving] = useState(false);
  const [ptError, setPtError] = useState('');
  const [dlPasted, setDlPasted] = useState(false); // shows banner when DL parsed

  const API = import.meta.env.VITE_API_URL || '/api';

  // ── fillForm: merge partial data into form state ──────────────────────────
  const fillForm = (data) => {
    setPtForm(prev => ({
      ...prev,
      ...(data.firstName    && { firstName:    data.firstName }),
      ...(data.lastName     && { lastName:     data.lastName }),
      ...(data.dob          && { dob:          data.dob }),
      ...(data.gender       && { gender:       data.gender }),
      ...(data.phone        && { phone:        data.phone }),
      ...(data.email        && { email:        data.email }),
      ...(data.pronouns     && { pronouns:     data.pronouns }),
      ...(data.language     && { language:     data.language }),
      ...(data.race         && { race:         data.race }),
      ...(data.ethnicity    && { ethnicity:    data.ethnicity }),
      address: {
        ...prev.address,
        ...(data.address?.street && { street: data.address.street }),
        ...(data.address?.city   && { city:   data.address.city }),
        ...(data.address?.state  && { state:  data.address.state }),
        ...(data.address?.zip    && { zip:    data.address.zip }),
      },
    }));
  };

  // ── loadPatient: pre-fill form from existing patient record ───────────────
  const loadPatient = async (id) => {
    try {
      const res = await fetch(`${API}/patients/${id}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      fillForm({
        firstName: data.firstName, lastName: data.lastName, dob: data.dob,
        gender: data.gender, phone: data.phone, email: data.email,
        address: data.address,
      });
    } catch { /* non-critical */ }
  };

  // ── Driver's license clipboard parser ────────────────────────────────────
  // Supports AAMVA PDF417 barcode text (common US/Canada DL format)
  const looksLikeDriversLicense = (text) => {
    return /^@\n/.test(text) ||        // AAMVA header
           /\bDAA\b|\bDBA\b|\bDBB\b/.test(text) || // AAMVA field codes
           /DAA[A-Z ,]+/.test(text);
  };

  const parseLicense = (text) => {
    const get = (code) => {
      const m = text.match(new RegExp(code + '([^\n]+)'));
      return m ? m[1].trim() : '';
    };
    // AAMVA standard field codes
    const rawName = get('DAA') || get('DCT');  // full name or first name
    const lastName  = get('DCS') || (rawName.includes(',') ? rawName.split(',')[0].trim() : '');
    const firstName = get('DAC') || (rawName.includes(',') ? rawName.split(',')[1]?.trim() : rawName);
    const dobRaw    = get('DBB'); // MMDDYYYY
    const dob = dobRaw.length === 8
      ? `${dobRaw.slice(4,8)}-${dobRaw.slice(0,2)}-${dobRaw.slice(2,4)}`
      : '';
    const street = get('DAG');
    const city   = get('DAI');
    const state  = get('DAJ');
    const zip    = get('DAK').slice(0, 5);
    const gender = get('DBC') === '1' ? 'Male' : get('DBC') === '2' ? 'Female' : '';
    return { firstName, lastName, dob, gender, address: { street, city, state, zip } };
  };

  // ── Clipboard paste listener (active when modal is open) ─────────────────
  useEffect(() => {
    if (!addModal) return;
    const handlePaste = (e) => {
      const text = e.clipboardData?.getData('text') || '';
      if (looksLikeDriversLicense(text)) {
        e.preventDefault();
        const parsed = parseLicense(text);
        fillForm(parsed);
        setDlPasted(true);
        setTimeout(() => setDlPasted(false), 4000);
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [addModal]);

  // ── MRN auto-fill disabled (403 on WAF) — MRN generated on save ─────────
  // const nextMrn = await getNextMrn();
  // const nextMrn = null;

  // ── ZIP auto-fill (city + state) on blur ─────────────────────────────────
  const handleZipBlur = async (zip) => {
    if (!zip || zip.length < 5) return;
    try {
      const r = await fetch(`${API}/patients/zip/${zip}`, { credentials: 'include' });
      if (!r.ok) return;
      const data = await r.json();
      if (data.city || data.state) {
        setPtForm(p => ({
          ...p,
          address: {
            ...p.address,
            ...(data.city  && { city:  data.city }),
            ...(data.state && { state: data.state }),
          },
        }));
      }
    } catch { /* non-critical */ }
  };

  // ── Smart behaviors state ─────────────────────────────────────────────────
  const [zipLocked, setZipLocked]         = useState(false);
  const [emailError, setEmailError]       = useState('');
  const [dupMatches, setDupMatches]       = useState([]);      // array of possible duplicates
  const [mrnDupWarning, setMrnDupWarning] = useState('');
  const [ssnMasked, setSsnMasked]         = useState('');
  const [ecSameAddress, setEcSameAddress] = useState(false);
  const [openSections, setOpenSections]   = useState({ demographics: true, contact: true, emergency: true, insurance: true, care: true });
  const [showReview, setShowReview]       = useState(false);
  const [dupCompare, setDupCompare]       = useState(null);    // patient to compare side-by-side
  const toggleSection = (key) => setOpenSections(p => ({ ...p, [key]: !p[key] }));

  // Jump to section from review screen
  const jumpToSection = (key) => {
    setShowReview(false);
    setOpenSections(p => ({ ...p, [key]: true }));
  };

  // ── Section status: Complete / Missing / Optional ───────────────────────
  const sectionStatus = {
    demographics: () => {
      const req = ptForm.firstName && ptForm.lastName && ptForm.dob && ptForm.gender;
      const opt = ptForm.pronouns || ptForm.race || ptForm.ethnicity || ptForm.ssn;
      return req ? 'complete' : 'missing';
    },
    contact: () => {
      const hasContact = ptForm.phone || ptForm.email;
      if (!hasContact) return 'optional';
      if (emailError || phoneError) return 'missing';
      return 'complete';
    },
    emergency: () => ptForm.emergencyContact.name ? 'complete' : 'optional',
    insurance: () => ptForm.insurance.primary.name ? 'complete' : 'optional',
    care: () => ptForm.assignedProvider ? 'complete' : 'optional',
  };
  const STATUS_PILL = {
    complete: { label: 'Complete', color: '#16a34a', bg: '#dcfce7', dot: '#22c55e' },
    missing:  { label: 'Missing',  color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
    optional: { label: 'Optional', color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' },
  };

  // ── DOB ↔ Age ─────────────────────────────────────────────────────────────
  const calcAge = (dob) => {
    if (!dob) return '';
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  };
  const [ageInput, setAgeInput] = useState('');

  const [dobError, setDobError] = useState('');

  const handleDobChange = (dob) => {
    setPtForm(p => ({ ...p, dob }));
    setAgeInput(dob ? String(calcAge(dob)) : '');
    // Validate: not in the future
    if (dob && new Date(dob) > new Date()) {
      setDobError('Date of birth cannot be in the future');
    } else {
      setDobError('');
    }
    // DOB + LastName duplicate check
    if (dob && ptForm.lastName) checkDuplicate({ dob, lastName: ptForm.lastName });
  };

  const handleAgeChange = (age) => {
    setAgeInput(age);
    const n = parseInt(age, 10);
    if (!isNaN(n) && n > 0 && n < 130) {
      const yr = new Date().getFullYear() - n;
      const dob = `${yr}-01-01`;
      setPtForm(p => ({ ...p, dob }));
    }
  };

  // ── First Name → suggest Pronouns (optional, common names only) ─────────
  const NAME_PRONOUNS = {
    // Common male names
    james:'He/Him',john:'He/Him',robert:'He/Him',michael:'He/Him',william:'He/Him',
    david:'He/Him',richard:'He/Him',joseph:'He/Him',thomas:'He/Him',charles:'He/Him',
    christopher:'He/Him',daniel:'He/Him',matthew:'He/Him',anthony:'He/Him',mark:'He/Him',
    donald:'He/Him',steven:'He/Him',paul:'He/Him',andrew:'He/Him',joshua:'He/Him',
    emmanuel:'He/Him',chris:'He/Him',eric:'He/Him',kevin:'He/Him',brian:'He/Him',
    // Common female names
    mary:'She/Her',patricia:'She/Her',jennifer:'She/Her',linda:'She/Her',barbara:'She/Her',
    elizabeth:'She/Her',susan:'She/Her',jessica:'She/Her',sarah:'She/Her',karen:'She/Her',
    lisa:'She/Her',nancy:'She/Her',betty:'She/Her',margaret:'She/Her',sandra:'She/Her',
    ashley:'She/Her',dorothy:'She/Her',kimberly:'She/Her',emily:'She/Her',donna:'She/Her',
    maria:'She/Her',helen:'She/Her',melissa:'She/Her',deborah:'She/Her',stephanie:'She/Her',
    april:'She/Her',harriet:'She/Her',emelia:'She/Her',aisha:'She/Her',
  };
  const handleFirstNameChange = (firstName) => {
    setPtForm(p => {
      const suggested = NAME_PRONOUNS[firstName.toLowerCase().trim()];
      return {
        ...p,
        firstName,
        // Only suggest if pronouns are still at default — never override user choice
        pronouns: suggested && p.pronouns === DEFAULT_PT.pronouns ? suggested : p.pronouns,
      };
    });
  };

  // ── Gender → Pronouns (editable, not overridden if user changed) ──────────
  const GENDER_PRONOUNS = {
    'Male':               'He/Him',
    'Female':             'She/Her',
    'Non-binary':         'They/Them',
    'Transgender Male':   'He/Him',
    'Transgender Female': 'She/Her',
    'Other':              'They/Them',
    'Prefer not to say':  'They/Them',
  };
  const handleGenderChange = (gender) => {
    setPtForm(p => ({
      ...p,
      gender,
      pronouns: p.pronouns === DEFAULT_PT.pronouns || p.pronouns === GENDER_PRONOUNS[p.gender]
        ? (GENDER_PRONOUNS[gender] || p.pronouns)
        : p.pronouns,  // never override if user manually set pronouns
    }));
  };

  // ── Phone formatter (555) 555-5555 ───────────────────────────────────────
  const formatPhone = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 10);
    if (d.length <= 3)  return d;
    if (d.length <= 6)  return `(${d.slice(0,3)}) ${d.slice(3)}`;
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  };
  const handlePhoneChange = (field, val) => {
    const formatted = formatPhone(val);
    setPtForm(p => ({ ...p, [field]: formatted }));
    // auto-copy cell → phone if phone is empty
    if (field === 'cellPhone' && !ptForm.phone) {
      setPtForm(p => ({ ...p, phone: formatted, cellPhone: formatted }));
    }
  };
  const handleECPhoneChange = (val) => {
    setPtForm(p => ({ ...p, emergencyContact: { ...p.emergencyContact, phone: formatPhone(val) } }));
  };

  // ── Phone length validation ───────────────────────────────────────────────
  const [phoneError, setPhoneError] = useState('');
  const handlePhoneBlurValidate = (val) => {
    const digits = val.replace(/\D/g, '');
    if (digits && digits.length !== 10) {
      setPhoneError('Phone must be 10 digits');
    } else {
      setPhoneError('');
    }
    handlePhoneBlur(val);
  };

  // ── Email live validation ─────────────────────────────────────────────────
  const handleEmailChange = (email) => {
    setPtForm(p => ({ ...p, email }));
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Invalid email address');
    } else {
      setEmailError('');
    }
  };

  // ── SSN masking ***-**-1234 ───────────────────────────────────────────────
  const handleSsnChange = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 9);
    setPtForm(p => ({ ...p, ssn: digits }));
    // Display: mask all but last 4
    if (digits.length >= 4) {
      setSsnMasked(`***-**-${digits.slice(-4)}`);
    } else {
      setSsnMasked(digits);
    }
    // Check SSN duplicate
    if (digits.length === 9) {
      const match = (patients || []).find(p => p.ssn?.replace(/\D/g,'') === digits);
      if (digits.length === 9) checkDuplicate({ ssn: digits });
    }
  };

  // ── Duplicate detection ───────────────────────────────────────────────────
  const checkDuplicate = ({ dob, lastName, phone, ssn }) => {
    const list = patients || [];
    const ln   = (lastName || ptForm.lastName || '').toLowerCase();
    const d    = dob  || ptForm.dob;
    const ph   = (phone || ptForm.phone || '').replace(/\D/g,'');
    const ss   = (ssn  || ptForm.ssn  || '').replace(/\D/g,'');

    const matches = [];
    list.forEach(p => {
      let reason = '';
      if (ln && d && p.dob === d && p.lastName.toLowerCase() === ln) reason = 'Same DOB & last name';
      else if (ph.length >= 10 && (p.phone?.replace(/\D/g,'') === ph || p.cellPhone?.replace(/\D/g,'') === ph)) reason = 'Same phone number';
      else if (ss.length === 9 && p.ssn?.replace(/\D/g,'') === ss) reason = 'Same SSN';
      if (reason) matches.push({ ...p, _reason: reason });
    });

    setDupMatches(matches.slice(0, 3));
  };

  const handleLastNameChange = (lastName) => {
    setPtForm(p => ({ ...p, lastName }));
    if (ptForm.dob) checkDuplicate({ lastName });
  };

  const handlePhoneBlur = (phone) => {
    checkDuplicate({ phone });
  };

  // ── MRN uniqueness on blur ────────────────────────────────────────────────
  const handleMrnBlur = (mrn) => {
    if (!mrn) return;
    const exists = (patients || []).find(p => p.mrn === mrn);
    setMrnDupWarning(exists
      ? `⚠️ MRN ${mrn} already used by ${exists.firstName} ${exists.lastName}`
      : ''
    );
  };

  // ── Emergency contact same-address toggle ────────────────────────────────
  const handleEcSameAddress = (checked) => {
    setEcSameAddress(checked);
    if (checked) {
      setPtForm(p => ({ ...p, emergencyContact: {
        ...p.emergencyContact,
        street: p.address.street,
        city:   p.address.city,
        state:  p.address.state,
        zip:    p.address.zip,
      }}));
    }
  };

  // ── ZIP with lock ─────────────────────────────────────────────────────────
  const handleCityManual = (city) => {
    setPtForm(p => ({ ...p, address: { ...p.address, city } }));
    setZipLocked(true);
  };
  const handleStateManual = (state) => {
    setPtForm(p => ({ ...p, address: { ...p.address, state } }));
    setZipLocked(true);
  };
  const handleZipChange = (zip) => {
    setPtForm(p => ({ ...p, address: { ...p.address, zip } }));
    setZipLocked(false); // new ZIP resets lock
  };

  // ── Form validity (required fields) ──────────────────────────────────────
  const isFormValid = ptForm.firstName.trim() && ptForm.lastName.trim() &&
                      ptForm.dob && ptForm.gender &&
                      !dobError && !emailError && !phoneError && !mrnDupWarning;

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = (patients || []).filter((p) => {
    // Site filter: if a specific site is active, only show patients at that location
    if (isFiltered && p.locationId && p.locationId !== activeSiteId) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      (p.dob && p.dob.includes(q))
    );
  });

  const handleSelect = (patient) => {
    selectPatient(patient.id);
    navigate(`/chart/${patient.id}/summary`);
  };

  const openEncounterModal = (e, patient) => {
    e.stopPropagation();
    selectPatient(patient.id);
    setEncForm({
      date: today,
      time: nowTime,
      type: 'Follow-Up',
      chiefComplaint: '',
      status: 'In Progress',
      provider: currentUser?.id || '',
      providerName: currentUser?.name || '',
      subjective: '', objective: '', assessment: '', plan: '',
      diagnoses: [],
    });
    setEncounterModal(patient);
  };

  const saveEncounter = () => {
    if (!encForm.chiefComplaint.trim()) return;
    addEncounter(encounterModal.id, encForm);
    setEncounterModal(null);
    navigate(`/chart/${encounterModal.id}/encounters`);
  };

  const cancelEncounter = () => {
    setEncounterModal(null);
  };

  const saveNewPatient = async () => {
    if (!ptForm.firstName.trim() || !ptForm.lastName.trim() || !ptForm.dob || !ptForm.gender) {
      setPtError('First name, last name, date of birth, and gender are required.');
      return;
    }
    setPtSaving(true);
    setPtError('');
    try {
      const created = await addPatient({
        ...ptForm,
        insurance: {
          ...ptForm.insurance,
          primary: {
            ...ptForm.insurance.primary,
            copay: ptForm.insurance.primary.copay ? Number(ptForm.insurance.primary.copay) : 0,
          },
        },
      });
      setAddModal(false);
      setPtForm(DEFAULT_PT);
      selectPatient(created.id);
      navigate(`/chart/${created.id}/summary`);
    } catch (err) {
      setPtError(err?.message || 'Failed to create patient. Please try again.');
    } finally {
      setPtSaving(false);
    }
  };

  const cancelAddPatient = () => { setAddModal(false); setPtForm(DEFAULT_PT); setPtError(''); };

  const modal = (
    <div role="dialog" aria-modal="true" aria-labelledby="ap-title" style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', justifyContent: 'center',
          alignItems: dupCompare ? 'flex-start' : 'center',
          padding: dupCompare ? '32px' : '32px',
          gap: dupCompare ? 16 : 0,
          zIndex: 9999,
          boxSizing: 'border-box',
        }}>

          {/* Side-by-side: existing patient summary */}
          {dupCompare && (
            <div style={{
              width: 300, flexShrink: 0, background: '#fff', borderRadius: 16,
              boxShadow: '0 24px 64px rgba(15,23,42,0.18)', overflow: 'hidden',
              maxHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column',
              animation: 'ap-card-in 140ms cubic-bezier(0.16,1,0.3,1) both',
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>Existing Patient</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Review before saving</div>
                </div>
                <button onClick={() => setDupCompare(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16 }}>✕</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 12px', background: '#f8fafc', borderRadius: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {dupCompare.firstName?.[0]}{dupCompare.lastName?.[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{dupCompare.lastName}, {dupCompare.firstName}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{dupCompare.mrn}</div>
                  </div>
                </div>
                {[
                  ['DOB', dupCompare.dob], ['Gender', dupCompare.gender],
                  ['Phone', dupCompare.phone || dupCompare.cellPhone],
                  ['Email', dupCompare.email],
                  ['Address', [dupCompare.address?.street, dupCompare.address?.city, dupCompare.address?.state].filter(Boolean).join(', ')],
                  ['Insurance', dupCompare.insurance?.primary?.name],
                  ['Assigned Provider', dupCompare.assignedProvider],
                  ['Last Visit', dupCompare.lastVisit],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                    <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button className="btn btn-primary" style={{ flex: 1, fontSize: 12 }} onClick={() => { setDupCompare(null); handleSelect(dupCompare); }}>Open Chart</button>
                  <button className="btn" style={{ fontSize: 12 }} onClick={() => setDupCompare(null)}>Dismiss</button>
                </div>
              </div>
            </div>
          )}

          <div style={{
            width: '100%', maxWidth: 720,
            background: '#fff', borderRadius: 12,
            padding: 32, margin: 0,
            boxShadow: '0 18px 45px rgba(0,0,0,0.12)',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 64px)',
            boxSizing: 'border-box',
          }}>

            {/* ── Header ── */}
            <div style={{ paddingBottom: 16, marginBottom: 20, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div id="ap-title" style={{ fontWeight: 800, fontSize: 17, color: '#0f172a' }}>
                  👤 {showReview ? 'Review Patient' : 'Add New Patient'}
                </div>
                {!showReview && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  All fields with <span style={{color:'#ef4444'}}>*</span> are required
                </div>}
              </div>
              <button onClick={cancelAddPatient} aria-label="Close"
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>✕</button>
            </div>

            {/* ── ARIA live region for errors ── */}
            <div aria-live="polite" aria-atomic="true" className="ap-sr-only" id="ap-live-region">
              {ptError}
            </div>

            {/* ── Body ── */}
            <div style={{ padding: '4px 0' }}>

              {/* Banners */}
              {dlPasted && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#166534' }}>🪪 Driver's license detected — fields filled automatically</div>}

              {dupMatches.length > 0 && (
                <div className="ap-dup-banner" role="alert">
                  <div className="ap-dup-banner-title">⚠️ Possible duplicate patient — review before saving</div>
                  {dupMatches.map((m, i) => (
                    <div key={i} className="ap-dup-match" onClick={() => setDupCompare(m)} title="Compare side by side">
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                        {m.firstName?.[0]}{m.lastName?.[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{m.lastName}, {m.firstName} — {m.mrn}</div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>{m._reason} · DOB {m.dob}</div>
                      </div>
                      <span style={{ fontSize: 11, color: '#7c3aed' }}>Compare →</span>
                    </div>
                  ))}
                </div>
              )}

              {ptError && <div className="ap-error-banner" role="alert">⚠️ {ptError}</div>}

              {/* ════════════ REVIEW SCREEN ════════════ */}
              {showReview ? (
                <div>
                  {[
                    { key: 'demographics', title: 'Demographics', fields: [
                      ['First Name', ptForm.firstName], ['Last Name', ptForm.lastName],
                      ['Date of Birth', ptForm.dob], ['Age', ageInput ? `${ageInput} yrs` : ''],
                      ['Gender', ptForm.gender], ['Pronouns', ptForm.pronouns],
                      ['Language', ptForm.language], ['Race', ptForm.race],
                      ['Ethnicity', ptForm.ethnicity], ['SSN', ptForm.ssn ? `***-**-${ptForm.ssn.slice(-4)}` : ''],
                    ]},
                    { key: 'contact', title: 'Contact', fields: [
                      ['Phone', ptForm.phone], ['Cell Phone', ptForm.cellPhone],
                      ['Email', ptForm.email],
                      ['Address', [ptForm.address.street, ptForm.address.city, ptForm.address.state, ptForm.address.zip].filter(Boolean).join(', ')],
                    ]},
                    { key: 'emergency', title: 'Emergency Contact', fields: [
                      ['Name', ptForm.emergencyContact.name],
                      ['Relationship', ptForm.emergencyContact.relationship],
                      ['Phone', ptForm.emergencyContact.phone],
                    ]},
                    { key: 'insurance', title: 'Insurance', fields: [
                      ['Plan', ptForm.insurance.primary.name],
                      ['Member ID', ptForm.insurance.primary.memberId],
                      ['Group #', ptForm.insurance.primary.groupNumber],
                      ['Copay', ptForm.insurance.primary.copay ? `$${ptForm.insurance.primary.copay}` : ''],
                    ]},
                    { key: 'care', title: 'Care Team', fields: [
                      ['PCP', ptForm.pcp], ['Assigned Provider', ptForm.assignedProvider],
                      ['Preferred Pharmacy', ptForm.preferredPharmacy],
                      ['Pharmacy Phone', ptForm.preferredPharmacyPhone], ['Pharmacy Fax', ptForm.preferredPharmacyFax],
                    ]},
                  ].map(({ key, title, fields }) => (
                    <div key={key} className="ap-review-section">
                      <div className="ap-review-title" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span>{title}</span>
                        <button onClick={() => jumpToSection(key)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 11, color: '#7c3aed', fontWeight: 700, padding: '2px 6px',
                          borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3,
                        }}>✏ Edit</button>
                      </div>
                      <div className="ap-review-grid">
                        {fields.map(([label, value]) => (
                          <div key={label} className="ap-review-field">
                            <div className="ap-review-label">{label}</div>
                            {value
                              ? <div className="ap-review-value">{value}</div>
                              : <div className="ap-review-missing">Not provided</div>
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(!ptForm.firstName || !ptForm.lastName || !ptForm.dob || !ptForm.gender) && (
                    <div className="ap-error-banner">⚠️ Missing required fields: {[!ptForm.firstName&&'First Name',!ptForm.lastName&&'Last Name',!ptForm.dob&&'Date of Birth',!ptForm.gender&&'Gender'].filter(Boolean).join(', ')}</div>
                  )}
                </div>
              ) : (

              /* ════════════ FORM ════════════ */
              <>
              {/* DEMOGRAPHICS */}
              <div className={`ap-section${!ptForm.firstName||!ptForm.lastName||!ptForm.dob||!ptForm.gender?' has-error':''}`}>
                <div className="ap-section-header" onClick={() => toggleSection('demographics')} role="button" aria-expanded={openSections.demographics}>
                  <span className="ap-section-title">Demographics</span>
                  {(() => { const s = STATUS_PILL[sectionStatus.demographics()]; return (<span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:s.bg, color:s.color, marginLeft:'auto', marginRight:8 }}><span style={{ width:6, height:6, borderRadius:'50%', background:s.dot, flexShrink:0 }}/>{s.label}</span>); })()}
                  <span className={`ap-section-chevron${openSections.demographics?' open':''}`}>›</span>
                </div>
                <div className={`ap-section-body${openSections.demographics?'':' collapsed'}`} style={{ maxHeight: openSections.demographics ? 2000 : 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* First Name */}
                    <div>
                      <label className="form-label" htmlFor="ap-firstName">First Name <span style={{color:'#ef4444'}}>*</span></label>
                      <input id="ap-firstName" className={`form-input${!ptForm.firstName&&ptError?' ap-input error':''}`}
                        value={ptForm.firstName} onChange={e => handleFirstNameChange(e.target.value)}
                        aria-required="true" aria-describedby="ap-firstName-err" />
                    </div>
                    {/* Last Name */}
                    <div>
                      <label className="form-label" htmlFor="ap-lastName">Last Name <span style={{color:'#ef4444'}}>*</span></label>
                      <input id="ap-lastName" className={`form-input${!ptForm.lastName&&ptError?' ap-input error':''}`}
                        value={ptForm.lastName} onChange={e => handleLastNameChange(e.target.value)}
                        aria-required="true" />
                    </div>
                    {/* DOB */}
                    <div>
                      <label className="form-label" htmlFor="ap-dob">Date of Birth <span style={{color:'#ef4444'}}>*</span>
                        {dobError && <span className="ap-field-error" style={{display:'inline-flex',marginLeft:6}}>⚠️ {dobError}</span>}
                      </label>
                      <input id="ap-dob" className={`form-input${dobError?' ap-input error':''}`}
                        type="date" value={ptForm.dob}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={e => handleDobChange(e.target.value)}
                        aria-required="true" aria-describedby={dobError?'ap-dob-err':undefined} />
                      {dobError && <div id="ap-dob-err" className="ap-field-error">⚠️ {dobError}</div>}
                    </div>
                    {/* Age */}
                    <div>
                      <label className="form-label" htmlFor="ap-age">Age {ptForm.dob && <span style={{fontSize:11,color:'#94a3b8',fontWeight:400}}>(auto-calculated)</span>}</label>
                      <input id="ap-age" className="form-input" type="number" min="0" max="130" placeholder="or enter age"
                        value={ageInput} onChange={e => handleAgeChange(e.target.value)} />
                    </div>
                    {/* Gender */}
                    <div>
                      <label className="form-label" htmlFor="ap-gender">Gender <span style={{color:'#ef4444'}}>*</span></label>
                      <select id="ap-gender" className="form-input" value={ptForm.gender} onChange={e => handleGenderChange(e.target.value)} aria-required="true">
                        {['Female','Male','Non-binary','Transgender Female','Transgender Male','Other','Prefer not to say'].map(g => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                    {/* Pronouns */}
                    <div>
                      <label className="form-label" htmlFor="ap-pronouns">Pronouns <span style={{fontSize:11,color:'#94a3b8',fontWeight:400}}>(auto-set)</span></label>
                      <input id="ap-pronouns" className="form-input" value={ptForm.pronouns}
                        onChange={e => setPtForm(p => ({ ...p, pronouns: e.target.value }))} />
                    </div>
                    {/* Language */}
                    <div>
                      <label className="form-label" htmlFor="ap-lang">Language</label>
                      <select id="ap-lang" className="form-input" value={ptForm.language} onChange={e => setPtForm(p => ({ ...p, language: e.target.value }))}>
                        {['English','Spanish','French','Mandarin','Arabic','Portuguese','Russian','Other'].map(l => <option key={l}>{l}</option>)}
                      </select>
                    </div>
                    {/* Race */}
                    <div>
                      <label className="form-label" htmlFor="ap-race">Race</label>
                      <input id="ap-race" className="form-input" value={ptForm.race} onChange={e => setPtForm(p => ({ ...p, race: e.target.value }))} />
                    </div>
                    {/* Ethnicity */}
                    <div>
                      <label className="form-label" htmlFor="ap-eth">Ethnicity</label>
                      <input id="ap-eth" className="form-input" value={ptForm.ethnicity} onChange={e => setPtForm(p => ({ ...p, ethnicity: e.target.value }))} />
                    </div>
                    {/* SSN */}
                    <div>
                      <label className="form-label" htmlFor="ap-ssn">SSN <span style={{fontSize:11,color:'#94a3b8',fontWeight:400}}>(masked)</span></label>
                      <input id="ap-ssn" className="form-input" placeholder="***-**-****"
                        value={ssnMasked} onChange={e => handleSsnChange(e.target.value)}
                        onFocus={e => { e.target.value = ptForm.ssn; }} onBlur={e => { handleSsnChange(ptForm.ssn); }}
                        aria-label="Social Security Number, masked" />
                    </div>
                  </div>
                </div>
              </div>

              {/* CONTACT */}
              <div className="ap-section">
                <div className="ap-section-header" onClick={() => toggleSection('contact')} role="button" aria-expanded={openSections.contact}>
                  <span className="ap-section-title">Contact</span>
                  {(() => { const s = STATUS_PILL[sectionStatus.contact()]; return (<span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:s.bg, color:s.color, marginLeft:'auto', marginRight:8 }}><span style={{ width:6, height:6, borderRadius:'50%', background:s.dot, flexShrink:0 }}/>{s.label}</span>); })()}
                  <span className={`ap-section-chevron${openSections.contact?' open':''}`}>›</span>
                </div>
                <div className={`ap-section-body${openSections.contact?'':' collapsed'}`} style={{ maxHeight: openSections.contact ? 2000 : 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="form-label" htmlFor="ap-phone">Phone
                        {phoneError && <span className="ap-field-error" style={{display:'inline-flex',marginLeft:6}}>⚠️ {phoneError}</span>}
                      </label>
                      <input id="ap-phone" className={`form-input${phoneError?' ap-input error':''}`}
                        placeholder="(555) 000-0000" value={ptForm.phone}
                        onChange={e => handlePhoneChange('phone', e.target.value)}
                        onBlur={e => handlePhoneBlurValidate(e.target.value)}
                        aria-describedby={phoneError?'ap-phone-err':undefined} />
                      {phoneError && <div id="ap-phone-err" className="ap-field-error">⚠️ {phoneError}</div>}
                    </div>
                    <div>
                      <label className="form-label" htmlFor="ap-cell">Cell Phone</label>
                      <input id="ap-cell" className="form-input" placeholder="(555) 000-0000" value={ptForm.cellPhone}
                        onChange={e => handlePhoneChange('cellPhone', e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="ap-email">Email
                        {emailError && <span className="ap-field-error" style={{display:'inline-flex',marginLeft:6}}>⚠️ {emailError}</span>}
                      </label>
                      <input id="ap-email" className={`form-input${emailError?' ap-input error':''}`}
                        type="email" value={ptForm.email} onChange={e => handleEmailChange(e.target.value)}
                        aria-describedby={emailError?'ap-email-err':undefined} />
                      {emailError && <div id="ap-email-err" className="ap-field-error">⚠️ {emailError}</div>}
                    </div>
                    <div>
                      <label className="form-label" htmlFor="ap-street">Street</label>
                      <input id="ap-street" className="form-input" value={ptForm.address.street}
                        onChange={e => setPtForm(p => ({ ...p, address: { ...p.address, street: e.target.value } }))} />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="ap-city">City {zipLocked && <span style={{fontSize:10,color:'#94a3b8'}}>✎ manual</span>}</label>
                      <input id="ap-city" className="form-input" value={ptForm.address.city} onChange={e => handleCityManual(e.target.value)} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label className="form-label" htmlFor="ap-state">State</label>
                        <input id="ap-state" className="form-input" maxLength={2} value={ptForm.address.state}
                          onChange={e => handleStateManual(e.target.value.toUpperCase())} />
                      </div>
                      <div>
                        <label className="form-label" htmlFor="ap-zip">ZIP</label>
                        <input id="ap-zip" className="form-input" maxLength={10} value={ptForm.address.zip}
                          onChange={e => handleZipChange(e.target.value)}
                          onBlur={e => !zipLocked && handleZipBlur(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* EMERGENCY CONTACT */}
              <div className="ap-section">
                <div className="ap-section-header" onClick={() => toggleSection('emergency')} role="button" aria-expanded={openSections.emergency}>
                  <span className="ap-section-title">Emergency Contact</span>
                  {(() => { const s = STATUS_PILL[sectionStatus.emergency()]; return (<span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:s.bg, color:s.color, marginLeft:'auto', marginRight:8 }}><span style={{ width:6, height:6, borderRadius:'50%', background:s.dot, flexShrink:0 }}/>{s.label}</span>); })()}
                  <span className={`ap-section-chevron${openSections.emergency?' open':''}`}>›</span>
                </div>
                <div className={`ap-section-body${openSections.emergency?'':' collapsed'}`} style={{ maxHeight: openSections.emergency ? 1000 : 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 10, cursor: 'pointer', color: '#475569' }}>
                    <input type="checkbox" checked={ecSameAddress} onChange={e => handleEcSameAddress(e.target.checked)} aria-label="Same address as patient" />
                    Same address as patient
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div><label className="form-label" htmlFor="ap-ec-name">Name</label>
                      <input id="ap-ec-name" className="form-input" value={ptForm.emergencyContact.name}
                        onChange={e => setPtForm(p => ({ ...p, emergencyContact: { ...p.emergencyContact, name: e.target.value } }))} /></div>
                    <div><label className="form-label" htmlFor="ap-ec-rel">Relationship</label>
                      <input id="ap-ec-rel" className="form-input" placeholder="e.g., Spouse" value={ptForm.emergencyContact.relationship}
                        onChange={e => setPtForm(p => ({ ...p, emergencyContact: { ...p.emergencyContact, relationship: e.target.value } }))} /></div>
                    <div><label className="form-label" htmlFor="ap-ec-phone">Phone</label>
                      <input id="ap-ec-phone" className="form-input" value={ptForm.emergencyContact.phone}
                        onChange={e => handleECPhoneChange(e.target.value)} /></div>
                  </div>
                </div>
              </div>

              {/* INSURANCE */}
              <div className="ap-section">
                <div className="ap-section-header" onClick={() => toggleSection('insurance')} role="button" aria-expanded={openSections.insurance}>
                  <span className="ap-section-title">Primary Insurance</span>
                  {(() => { const s = STATUS_PILL[sectionStatus.insurance()]; return (<span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:s.bg, color:s.color, marginLeft:'auto', marginRight:8 }}><span style={{ width:6, height:6, borderRadius:'50%', background:s.dot, flexShrink:0 }}/>{s.label}</span>); })()}
                  <span className={`ap-section-chevron${openSections.insurance?' open':''}`}>›</span>
                </div>
                <div className={`ap-section-body${openSections.insurance?'':' collapsed'}`} style={{ maxHeight: openSections.insurance ? 1000 : 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12 }}>
                    <div><label className="form-label" htmlFor="ap-ins-name">Insurance Name</label>
                      <input id="ap-ins-name" className="form-input" placeholder="e.g., Blue Cross Blue Shield"
                        value={ptForm.insurance.primary.name} onChange={e => setIns('name')(e)} /></div>
                    <div><label className="form-label" htmlFor="ap-ins-mid">Member ID</label>
                      <input id="ap-ins-mid" className="form-input" value={ptForm.insurance.primary.memberId}
                        onChange={e => setIns('memberId')(e)} /></div>
                    <div><label className="form-label" htmlFor="ap-ins-grp">Group #</label>
                      <input id="ap-ins-grp" className="form-input" value={ptForm.insurance.primary.groupNumber}
                        onChange={e => setIns('groupNumber')(e)} /></div>
                    <div><label className="form-label" htmlFor="ap-ins-cop">Copay ($)</label>
                      <input id="ap-ins-cop" className="form-input" type="number" min="0"
                        value={ptForm.insurance.primary.copay} onChange={e => setIns('copay')(e)} /></div>
                  </div>
                </div>
              </div>

              {/* CARE TEAM */}
              <div className="ap-section">
                <div className="ap-section-header" onClick={() => toggleSection('care')} role="button" aria-expanded={openSections.care}>
                  <span className="ap-section-title">Care Team</span>
                  {(() => { const s = STATUS_PILL[sectionStatus.care()]; return (<span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:s.bg, color:s.color, marginLeft:'auto', marginRight:8 }}><span style={{ width:6, height:6, borderRadius:'50%', background:s.dot, flexShrink:0 }}/>{s.label}</span>); })()}
                  <span className={`ap-section-chevron${openSections.care?' open':''}`}>›</span>
                </div>
                <div className={`ap-section-body${openSections.care?'':' collapsed'}`} style={{ maxHeight: openSections.care ? 1000 : 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><label className="form-label" htmlFor="ap-pcp">PCP</label>
                      <input id="ap-pcp" className="form-input" placeholder="e.g., Dr. Jane Smith"
                        value={ptForm.pcp} onChange={e => setPtForm(p => ({ ...p, pcp: e.target.value }))} /></div>
                    <div><label className="form-label" htmlFor="ap-prov">Assigned Provider</label>
                      <input id="ap-prov" className="form-input" placeholder="e.g., Dr. Chris L."
                        value={ptForm.assignedProvider} onChange={e => setPtForm(p => ({ ...p, assignedProvider: e.target.value }))} /></div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label className="form-label">💊 Preferred Pharmacy</label>
                    <input className="form-input" placeholder="e.g., CVS Pharmacy — 123 Main St"
                      value={ptForm.preferredPharmacy}
                      onChange={e => setPtForm(p => ({ ...p, preferredPharmacy: e.target.value }))} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                    <div><label className="form-label">Pharmacy Phone</label>
                      <input className="form-input" placeholder="(555) 000-0000"
                        value={ptForm.preferredPharmacyPhone}
                        onChange={e => setPtForm(p => ({ ...p, preferredPharmacyPhone: e.target.value }))} /></div>
                    <div><label className="form-label">Pharmacy Fax</label>
                      <input className="form-input" placeholder="(555) 000-0001"
                        value={ptForm.preferredPharmacyFax}
                        onChange={e => setPtForm(p => ({ ...p, preferredPharmacyFax: e.target.value }))} /></div>
                  </div>
                </div>
              </div>
              </>
              )}
            </div>

            {/* ── Footer ── */}
            <div style={{ paddingTop: 16, marginTop: 20, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn" onClick={cancelAddPatient} disabled={ptSaving}>Cancel</button>
              {showReview && (
                <button className="btn" onClick={() => setShowReview(false)} disabled={ptSaving}>← Edit</button>
              )}
              {!showReview ? (
                <button className="btn btn-primary" onClick={() => setShowReview(true)}
                  disabled={!isFormValid} title={!isFormValid ? 'Fill required fields first' : ''}>
                  Review →
                </button>
              ) : (
                <button className="btn btn-primary" onClick={saveNewPatient}
                  disabled={ptSaving || !isFormValid}>
                  {ptSaving ? 'Saving…' : '💾 Save Patient'}
                </button>
              )}
            </div>

          </div>
        </div>
  );

  return (
    <>
      {addModal && createPortal(modal, document.body)}
      <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>🔍 Patient Search</h1>
          <p>Search and select a patient to open their chart · <strong>{patients.length}</strong> patients in system</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setPtForm(DEFAULT_PT); setPtError(''); setAddModal(true); }}>
          + Add Patient
        </button>
      </div>

      <div className="card mb-4" style={{ overflow: 'visible' }}>
        <div className="card-body" style={{ padding: '14px 16px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, opacity: 0.4, pointerEvents: 'none' }}>🔍</span>
            <input
              ref={inputRef}
              type="text"
              className="form-input"
              placeholder="Search by name, MRN, or date of birth..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: 15, padding: '12px 16px 12px 42px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '2px solid var(--border)', transition: 'all var(--t)' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            )}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''} {search ? `for "${search}"` : ''}</span>
            {search && <span style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => setSearch('')}>Clear search</span>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body no-pad">
          {search && filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span className="icon">🔍</span>
              <h3>No patients found</h3>
              <p>Try adjusting your search terms or add a new patient</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const terms = search.trim().split(/\s+/);
                  let newForm = { ...DEFAULT_PT };
                  if (terms.length === 1) {
                    newForm.firstName = terms[0];
                  } else if (terms.length >= 2) {
                    newForm.firstName = terms[0];
                    newForm.lastName = terms[1];
                  }
                  setPtForm(newForm);
                  setPtError('');
                  setAddModal(true);
                }}
                style={{ marginTop: 16 }}
              >
                + Add Patient "{search}"
              </button>
            </div>
          ) : (
            <>
              {!search && filtered.length > 0 && (
                <div style={{ padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  Showing all {filtered.length} patients
                </div>
              )}
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '8px' }}>
                  {filtered.map((p) => {
                    const getFlagStyle = (f) => {
                      if (f.includes('Suicide') || f.includes('Safety') || f.includes('Self-Harm'))
                        return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
                      if (f.includes('Fall')) return { background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa' };
                      if (f === 'VIP') return { background: '#faf5ff', color: '#6b21a8', border: '1px solid #d8b4fe' };
                      if (f.includes('Substance')) return { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
                      return { background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' };
                    };
                    return (
                      <div key={p.id}
                        onClick={() => handleSelect(p)}
                        style={{ background: 'var(--surface)', borderRadius: 10, padding: '14px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, overflow: 'hidden' }}>
                            {p.photo
                              ? <img src={p.photo} alt={`${p.firstName} ${p.lastName}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                                  {p.firstName?.[0]}{p.lastName?.[0]}
                                </div>
                            }
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>{p.lastName}, {p.firstName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                              MRN <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-secondary)' }}>{p.mrn}</span>
                              {p.dob && <> · DOB {p.dob}</>}
                              {p.gender && <> · {p.gender}</>}
                            </div>
                            {p.insurance?.primary?.name && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                                🏥 {p.insurance.primary.name}
                              </div>
                            )}
                            {(p.isBTG || p.flags?.length > 0) && (
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                                {p.isBTG && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>🔒 BTG</span>}
                                {p.flags?.filter(f => f !== 'BTG Protected').map((f, i) => (
                                  <span key={i} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap', ...getFlagStyle(f) }}>{f}</span>
                                ))}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); handleSelect(p); }}>
                                Open Chart
                              </button>
                              <button className="btn btn-sm" style={{ background: 'var(--success)', color: 'white', border: 'none' }}
                                onClick={(e) => openEncounterModal(e, p)}>
                                + Encounter
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
              <table className="data-table">
                <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f4f7fb', borderBottom: '1.5px solid #dde3ec' }}>
                  <tr>
                    <th>Patient</th>
                    <th>MRN</th>
                    <th style={{ color: 'var(--text-muted)', fontWeight: 700 }}>DOB</th>
                    <th style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Gender</th>
                    <th>Insurance</th>
                    <th>Last Visit</th>
                    <th>Flags</th>
                    <th style={{ width: 180 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                  <tr key={p.id}
                    className="patient-row"
                    style={{ cursor: 'pointer', background: hoveredRow === p.id ? 'rgba(79,70,229,0.04)' : 'transparent', transition: 'background 0.12s' }}
                    onClick={() => handleSelect(p)}
                    onMouseEnter={() => setHoveredRow(p.id)}
                    onMouseLeave={() => setHoveredRow(null)}>
                    <td style={{ minWidth: 160, maxWidth: 240 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, overflow: 'hidden' }}>
                          {p.photo
                            ? <img src={p.photo} alt={`${p.firstName} ${p.lastName}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{
                                width: '100%', height: '100%', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: 11,
                              }}>
                                {p.firstName?.[0] || ''}{p.lastName?.[0] || ''}
                              </div>
                          }
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14 }}>
                            <PatientHoverCard patient={p} appointments={appointments || []}>
                              {p.lastName}, {p.firstName}
                            </PatientHoverCard>
                          </div>
                          <div className="text-xs text-muted">{p.phone || p.cellPhone || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {(() => {
                        const note = stickyNotes[p.id] ?? p.stickyNote ?? '';
                        return (
                          <div style={{ position: 'relative' }}>
                            {/* MRN + inline note preview */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              {p.mrn}
                            </div>
                            {/* Always-visible sticky preview — click to edit */}
                            <div
                              onClick={e => openSticky(e, p)}
                              title="Click to add / edit note"
                              style={{
                                marginTop: 3, cursor: 'pointer',
                                display: 'flex', alignItems: 'flex-start', gap: 4,
                                background: note ? '#fef9c3' : 'transparent',
                                border: note ? '1px solid #fde68a' : '1px dashed #d1d5db',
                                borderRadius: 5, padding: note ? '2px 6px' : '1px 5px',
                                minWidth: 80, maxWidth: 160,
                                transition: 'background 0.12s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#fef9c3'}
                              onMouseLeave={e => e.currentTarget.style.background = note ? '#fef9c3' : 'transparent'}
                            >
                              <span style={{ fontSize: 9, flexShrink: 0, marginTop: 1 }}>📝</span>
                              <span style={{
                                fontSize: 10, color: note ? '#78350f' : '#9ca3af',
                                fontFamily: 'inherit', fontWeight: note ? 500 : 400,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                maxWidth: 140,
                              }}>
                                {note ? (note.length > 28 ? note.slice(0, 28) + '…' : note) : 'Add note'}
                              </span>
                            </div>
                            {/* Edit popover */}
                            {stickyOpen === p.id && (
                              <div onClick={e => e.stopPropagation()} style={{
                                position: 'absolute', top: 0, left: '100%', marginLeft: 8,
                                zIndex: 200, width: 280, background: '#fefce8',
                                border: '1px solid #fde68a', borderRadius: 10,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: 12,
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>
                                    📝 {p.firstName} {p.lastName}
                                  </div>
                                  <button onClick={() => setStickyOpen(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#92400e' }}>✕</button>
                                </div>
                                <textarea autoFocus value={stickyDraft} onChange={e => setStickyDraft(e.target.value)}
                                  placeholder="Provider note… (500 chars)" maxLength={500} rows={4}
                                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'transparent', border: '1px solid #fcd34d', borderRadius: 6, padding: '6px 8px', fontSize: 12, fontFamily: 'inherit', color: '#78350f', outline: 'none' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                  <span style={{ fontSize: 10, color: '#a16207' }}>{stickyDraft.length}/500</span>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    {note && <button onClick={() => clearSticky(p.id)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '1px solid #fcd34d', background: 'transparent', color: '#92400e', cursor: 'pointer' }}>Clear</button>}
                                    <button onClick={() => saveSticky(p.id)} disabled={stickySaving} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                                      {stickySaving ? '…' : 'Save'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{p.dob}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{p.gender}</td>
                    <td className="text-sm">{p.insurance?.primary?.name || '—'}</td>
                    <td className="text-sm">{p.lastVisit || '—'}</td>
                    <td style={{ maxWidth: 200 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {p.isBTG && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', whiteSpace: 'nowrap' }}>🔒 BTG</span>}
                        {p.flags?.filter(f => f !== 'BTG Protected').map((f, i) => {
                          const flagStyle = f.includes('Suicide') || f.includes('Safety') || f.includes('Self-Harm')
                            ? { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }
                            : f.includes('Fall')
                            ? { background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa' }
                            : f === 'VIP'
                            ? { background: '#faf5ff', color: '#6b21a8', border: '1px solid #d8b4fe' }
                            : f.includes('Substance')
                            ? { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }
                            : { background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' };
                          return (
                            <span key={i} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap', ...flagStyle }}>
                              {f}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); handleSelect(p); }}>
                          Open Chart
                        </button>
                        <button className="btn btn-sm" style={{ background: 'var(--success)', color: 'white', border: 'none' }}
                          onClick={(e) => openEncounterModal(e, p)}>
                          + Encounter
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              )}
            </>
          )}
        </div>
      </div>

      {/* New Encounter Modal */}
      {encounterModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 24,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 12, width: '100%', maxWidth: 680,
            maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-overlay)',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1,
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>📝 New Encounter</div>
                <div className="text-sm text-muted">
                  {encounterModal.lastName}, {encounterModal.firstName} · MRN {encounterModal.mrn}
                </div>
              </div>
              <button onClick={cancelEncounter}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px' }}>
              {/* Date / Time / Type / Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={encForm.date}
                    onChange={(e) => setEncForm((p) => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Time</label>
                  <input className="form-input" type="time" value={encForm.time}
                    onChange={(e) => setEncForm((p) => ({ ...p, time: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Visit Type</label>
                  <select className="form-input" value={encForm.type}
                    onChange={(e) => setEncForm((p) => ({ ...p, type: e.target.value }))}>
                    {VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={encForm.status}
                    onChange={(e) => setEncForm((p) => ({ ...p, status: e.target.value }))}>
                    <option>In Progress</option>
                    <option>Completed</option>
                    <option>Pending Co-Sign</option>
                  </select>
                </div>
              </div>

              {/* Chief Complaint */}
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Chief Complaint <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="form-input" type="text"
                  placeholder="e.g., Follow-up — medication management"
                  value={encForm.chiefComplaint}
                  onChange={(e) => setEncForm((p) => ({ ...p, chiefComplaint: e.target.value }))} />
              </div>

              {/* SOAP notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                {[
                  { label: 'S — Subjective', key: 'subjective', ph: "Patient's reported symptoms, history..." },
                  { label: 'O — Objective', key: 'objective', ph: 'Exam findings, vitals, test results...' },
                  { label: 'A — Assessment', key: 'assessment', ph: 'Clinical impression / diagnoses...' },
                  { label: 'P — Plan', key: 'plan', ph: 'Treatment plan, orders, follow-up...' },
                ].map(({ label, key, ph }) => (
                  <div key={key}>
                    <label className="form-label">{label}</label>
                    <textarea className="form-input" rows={4} placeholder={ph}
                      value={encForm[key]}
                      onChange={(e) => setEncForm((p) => ({ ...p, [key]: e.target.value }))}
                      style={{ resize: 'vertical' }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Modal footer */}
            <div style={{
              padding: '12px 20px', borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              position: 'sticky', bottom: 0, background: 'var(--surface)',
            }}>
              <button className="btn" onClick={cancelEncounter}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEncounter}
                disabled={!encForm.chiefComplaint?.trim()}>
                💾 Save &amp; Open Encounter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
