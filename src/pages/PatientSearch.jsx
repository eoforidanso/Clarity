import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../contexts/PatientContext';
import { useAuth } from '../contexts/AuthContext';
import { useSite } from '../contexts/SiteContext';
import AddPatientForm from './AddPatientForm';

const VISIT_TYPES = [
  'Follow-Up', 'Office Visit', 'Telehealth', 'Walk-In',
  'Psychiatric Evaluation', 'Medication Management',
  'Crisis Intervention', 'Urgent Care', 'Initial Evaluation',
];

export default function PatientSearch() {
  const { patients, selectPatient, addEncounter, addPatient } = usePatient();
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
    pcp: '', assignedProvider: '',
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

  // ── Fetch next MRN when modal opens ──────────────────────────────────────
  useEffect(() => {
    if (!addModal) return;
    fetch(`${API}/patients/next-mrn`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.mrn) setPtForm(p => ({ ...p, mrn: data.mrn })); })
      .catch(() => {});
  }, [addModal]);

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

  if (addModal) return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>👤 {showReview ? 'Review Patient' : 'Add New Patient'}</h1>
          <p>{showReview ? 'Confirm details before saving' : 'Enter patient demographics and contact info'}</p>
        </div>
        <button className="btn" onClick={cancelAddPatient}>← Back to Search</button>
      </div>
      <AddPatientForm
        ptForm={ptForm} setPtForm={setPtForm} ptError={ptError} ptSaving={ptSaving}
        showReview={showReview} setShowReview={setShowReview}
        dupMatches={dupMatches} dupCompare={dupCompare} setDupCompare={setDupCompare}
        dlPasted={dlPasted} openSections={openSections} toggleSection={toggleSection}
        jumpToSection={jumpToSection} sectionStatus={sectionStatus} STATUS_PILL={STATUS_PILL}
        ageInput={ageInput} dobError={dobError} emailError={emailError}
        phoneError={phoneError} mrnDupWarning={mrnDupWarning} ssnMasked={ssnMasked}
        zipLocked={zipLocked} ecSameAddress={ecSameAddress}
        handleFirstNameChange={handleFirstNameChange} handleLastNameChange={handleLastNameChange}
        handleDobChange={handleDobChange} handleAgeChange={handleAgeChange}
        handleGenderChange={handleGenderChange} handlePhoneChange={handlePhoneChange}
        handlePhoneBlurValidate={handlePhoneBlurValidate} handlePhoneBlur={handlePhoneBlur}
        handleEmailChange={handleEmailChange} handleSsnChange={handleSsnChange}
        handleMrnBlur={handleMrnBlur} handleZipChange={handleZipChange}
        handleZipBlur={handleZipBlur} handleCityManual={handleCityManual}
        handleStateManual={handleStateManual} handleEcSameAddress={handleEcSameAddress}
        handleECPhoneChange={handleECPhoneChange} setIns={setIns}
        isFormValid={isFormValid} saveNewPatient={saveNewPatient}
        cancelAddPatient={cancelAddPatient} handleSelect={handleSelect}
        DEFAULT_PT={DEFAULT_PT}
      />
    </div>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>🔍 Patient Search</h1>
          <p>Search and select a patient to open their chart · <strong>{patients.length}</strong> patients in system</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setPtForm(DEFAULT_PT); setPtError(''); setShowReview(false); setAddModal(true); }}>
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
            <div className="empty-state" style={{ padding: 40 }}>
              <span className="icon">🔍</span>
              <h3>No patients found</h3>
              <p>Try adjusting your search terms</p>
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
                          <div style={{ fontWeight: 800, fontSize: 14 }}>{p.lastName}, {p.firstName}</div>
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
  );
}
