import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../contexts/PatientContext';
import { useAuth } from '../contexts/AuthContext';
import { useSite } from '../contexts/SiteContext';

const VISIT_TYPES = [
  'Follow-Up', 'Office Visit', 'Telehealth', 'Walk-In',
  'Psychiatric Evaluation', 'Medication Management',
  'Crisis Intervention', 'Urgent Care', 'Initial Evaluation',
];

const EMPTY_PT = {
  firstName: '', lastName: '', dob: '', gender: 'Female', pronouns: '',
  phone: '', cellPhone: '', email: '',
  address: { street: '', city: '', state: '', zip: '' },
  emergencyContact: { name: '', relationship: '', phone: '' },
  insurance: { primary: { name: '', memberId: '', groupNumber: '', copay: '' } },
  pcp: '', assignedProvider: '', language: 'English', race: '', ethnicity: '',
  maritalStatus: '', ssn: '',
};

function flagStyle(f) {
  if (f.includes('Suicide') || f.includes('Safety') || f.includes('Self-Harm'))
    return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
  if (f.includes('Fall'))  return { background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa' };
  if (f === 'VIP')         return { background: '#faf5ff', color: '#6b21a8', border: '1px solid #d8b4fe' };
  if (f.includes('Substance')) return { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
  return { background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' };
}

export default function PatientSearch() {
  const { patients, selectPatient, addEncounter, addPatient } = usePatient();
  const { currentUser } = useAuth();
  const { activeSiteId, isFiltered } = useSite();
  const [search, setSearch]       = useState('');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [ptForm, setPtForm]       = useState(EMPTY_PT);
  const [ptSaving, setPtSaving]   = useState(false);
  const [ptError, setPtError]     = useState('');
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Encounter modal
  const today   = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 5);
  const [encounterModal, setEncounterModal] = useState(null);
  const [encForm, setEncForm]     = useState({});

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = (patients || []).filter((p) => {
    if (isFiltered && p.locationId && p.locationId !== activeSiteId) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q)  ||
      p.mrn.toLowerCase().includes(q)        ||
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
    setEncForm({ date: today, time: nowTime, type: 'Follow-Up', chiefComplaint: '',
      status: 'In Progress', provider: currentUser?.id || '',
      providerName: currentUser?.name || '',
      subjective: '', objective: '', assessment: '', plan: '', diagnoses: [] });
    setEncounterModal(patient);
  };

  const saveEncounter = () => {
    if (!encForm.chiefComplaint.trim()) return;
    addEncounter(encounterModal.id, encForm);
    setEncounterModal(null);
    navigate(`/chart/${encounterModal.id}/encounters`);
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
        insurance: { ...ptForm.insurance, primary: {
          ...ptForm.insurance.primary,
          copay: ptForm.insurance.primary.copay ? Number(ptForm.insurance.primary.copay) : 0,
        }},
      });
      setShowForm(false);
      setPtForm(EMPTY_PT);
      selectPatient(created.id);
      navigate(`/chart/${created.id}/summary`);
    } catch (err) {
      setPtError(err?.message || 'Failed to create patient. Please try again.');
    } finally {
      setPtSaving(false);
    }
  };

  const set = (field) => (e) => setPtForm(p => ({ ...p, [field]: e.target.value }));
  const setAddr = (field) => (e) => setPtForm(p => ({ ...p, address: { ...p.address, [field]: e.target.value } }));
  const setEC   = (field) => (e) => setPtForm(p => ({ ...p, emergencyContact: { ...p.emergencyContact, [field]: e.target.value } }));
  const setIns  = (field) => (e) => setPtForm(p => ({ ...p, insurance: { ...p.insurance, primary: { ...p.insurance.primary, [field]: e.target.value } } }));

  return (
    <div className="patient-page">

      {/* ── Left: search panel ── */}
      <aside className="patient-search-panel">
        <div className="patient-search-header">
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
            🔍 Patient Search
          </h2>
          <button
            className="btn btn-primary"
            style={{ fontSize: 12, padding: '6px 12px' }}
            onClick={() => { setPtForm(EMPTY_PT); setPtError(''); setShowForm(true); }}
          >
            + Add Patient
          </button>
        </div>

        <div className="patient-search-body">
          {/* Search input */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, fontSize: 14 }}>🔍</span>
            <input
              ref={inputRef}
              type="text"
              className="form-input"
              placeholder="Name, MRN, or DOB…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34, fontSize: 13 }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12,
              }}>✕</button>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
            {filtered.length} patient{filtered.length !== 1 ? 's' : ''}
          </div>

          {/* Patient list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filtered.length === 0 && search ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
                No patients found for "{search}"
              </div>
            ) : filtered.map(p => (
              <div
                key={p.id}
                onClick={() => handleSelect(p)}
                onMouseEnter={() => setHoveredRow(p.id)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: hoveredRow === p.id ? 'rgba(79,70,229,0.04)' : '#fff',
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 11,
                  }}>
                    {p.firstName?.[0]}{p.lastName?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.lastName}, {p.firstName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {p.mrn} · {p.dob}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm"
                    style={{ fontSize: 10, padding: '3px 8px', background: 'var(--success)', color: '#fff', border: 'none', flexShrink: 0 }}
                    onClick={e => openEncounterModal(e, p)}
                  >+ Enc</button>
                </div>
                {(p.isBTG || p.flags?.length > 0) && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                    {p.isBTG && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>🔒 BTG</span>}
                    {p.flags?.filter(f => f !== 'BTG Protected').map((f, i) => (
                      <span key={i} style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 5, ...flagStyle(f) }}>{f}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Right: Add Patient form or empty state ── */}
      <main className="patient-form-shell">
        {!showForm ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', maxWidth: 340 }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
              Select a patient
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              Search by name or MRN on the left, or click <strong>+ Add Patient</strong> to register a new patient.
            </div>
          </div>
        ) : (
          <div className="patient-form-card">
            {/* Form header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>👤 Add New Patient</div>
              <button onClick={() => { setShowForm(false); setPtForm(EMPTY_PT); setPtError(''); }}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {ptError && (
              <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                ⚠️ {ptError}
              </div>
            )}

            {/* DEMOGRAPHICS */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Demographics</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[['First Name','firstName',true],['Last Name','lastName',true]].map(([label, key, req]) => (
                <div key={key}>
                  <label className="form-label">{label}{req && <span style={{color:'var(--danger)'}}> *</span>}</label>
                  <input className="form-input" value={ptForm[key]} onChange={set(key)} />
                </div>
              ))}
              <div>
                <label className="form-label">Date of Birth <span style={{color:'var(--danger)'}}>*</span></label>
                <input className="form-input" type="date" value={ptForm.dob} onChange={set('dob')} />
              </div>
              <div>
                <label className="form-label">Gender <span style={{color:'var(--danger)'}}>*</span></label>
                <select className="form-input" value={ptForm.gender} onChange={set('gender')}>
                  {['Female','Male','Non-binary','Transgender Female','Transgender Male','Other','Prefer not to say'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Pronouns</label>
                <input className="form-input" placeholder="e.g., She/Her" value={ptForm.pronouns} onChange={set('pronouns')} />
              </div>
              <div>
                <label className="form-label">Language</label>
                <select className="form-input" value={ptForm.language} onChange={set('language')}>
                  {['English','Spanish','French','Mandarin','Arabic','Portuguese','Russian','Other'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Race</label>
                <input className="form-input" value={ptForm.race} onChange={set('race')} />
              </div>
              <div>
                <label className="form-label">Ethnicity</label>
                <input className="form-input" value={ptForm.ethnicity} onChange={set('ethnicity')} />
              </div>
            </div>

            {/* CONTACT */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Contact</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div><label className="form-label">Phone</label><input className="form-input" placeholder="(555) 000-0000" value={ptForm.phone} onChange={set('phone')} /></div>
              <div><label className="form-label">Cell Phone</label><input className="form-input" placeholder="(555) 000-0000" value={ptForm.cellPhone} onChange={set('cellPhone')} /></div>
              <div><label className="form-label">Email</label><input className="form-input" type="email" value={ptForm.email} onChange={set('email')} /></div>
              <div><label className="form-label">Street</label><input className="form-input" value={ptForm.address.street} onChange={setAddr('street')} /></div>
              <div><label className="form-label">City</label><input className="form-input" value={ptForm.address.city} onChange={setAddr('city')} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><label className="form-label">State</label><input className="form-input" maxLength={2} value={ptForm.address.state} onChange={e => setPtForm(p => ({ ...p, address: { ...p.address, state: e.target.value.toUpperCase() } }))} /></div>
                <div><label className="form-label">ZIP</label><input className="form-input" maxLength={10} value={ptForm.address.zip} onChange={setAddr('zip')} /></div>
              </div>
            </div>

            {/* EMERGENCY CONTACT */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Emergency Contact</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div><label className="form-label">Name</label><input className="form-input" value={ptForm.emergencyContact.name} onChange={setEC('name')} /></div>
              <div><label className="form-label">Relationship</label><input className="form-input" placeholder="e.g., Spouse" value={ptForm.emergencyContact.relationship} onChange={setEC('relationship')} /></div>
              <div><label className="form-label">Phone</label><input className="form-input" value={ptForm.emergencyContact.phone} onChange={setEC('phone')} /></div>
            </div>

            {/* PRIMARY INSURANCE */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Primary Insurance</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div><label className="form-label">Insurance Name</label><input className="form-input" placeholder="e.g., Blue Cross" value={ptForm.insurance.primary.name} onChange={setIns('name')} /></div>
              <div><label className="form-label">Member ID</label><input className="form-input" value={ptForm.insurance.primary.memberId} onChange={setIns('memberId')} /></div>
              <div><label className="form-label">Group #</label><input className="form-input" value={ptForm.insurance.primary.groupNumber} onChange={setIns('groupNumber')} /></div>
              <div><label className="form-label">Copay ($)</label><input className="form-input" type="number" min="0" value={ptForm.insurance.primary.copay} onChange={setIns('copay')} /></div>
            </div>

            {/* CARE TEAM */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Care Team</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div><label className="form-label">PCP</label><input className="form-input" placeholder="e.g., Dr. Jane Smith" value={ptForm.pcp} onChange={set('pcp')} /></div>
              <div><label className="form-label">Assigned Provider</label><input className="form-input" placeholder="e.g., Dr. Chris L." value={ptForm.assignedProvider} onChange={set('assignedProvider')} /></div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn" onClick={() => { setShowForm(false); setPtForm(EMPTY_PT); setPtError(''); }} disabled={ptSaving}>Cancel</button>
              <button className="btn btn-primary" onClick={saveNewPatient} disabled={ptSaving}>
                {ptSaving ? 'Saving…' : '💾 Create Patient'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Encounter Modal ── */}
      {encounterModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-overlay)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>📝 New Encounter</div>
                <div className="text-sm text-muted">{encounterModal.lastName}, {encounterModal.firstName} · MRN {encounterModal.mrn}</div>
              </div>
              <button onClick={() => setEncounterModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr', gap: 12, marginBottom: 14 }}>
                <div><label className="form-label">Date</label><input className="form-input" type="date" value={encForm.date} onChange={e => setEncForm(p => ({ ...p, date: e.target.value }))} /></div>
                <div><label className="form-label">Time</label><input className="form-input" type="time" value={encForm.time} onChange={e => setEncForm(p => ({ ...p, time: e.target.value }))} /></div>
                <div><label className="form-label">Visit Type</label><select className="form-input" value={encForm.type} onChange={e => setEncForm(p => ({ ...p, type: e.target.value }))}>{VISIT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label className="form-label">Status</label><select className="form-input" value={encForm.status} onChange={e => setEncForm(p => ({ ...p, status: e.target.value }))}><option>In Progress</option><option>Completed</option><option>Pending Co-Sign</option></select></div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Chief Complaint <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="form-input" placeholder="e.g., Follow-up — medication management" value={encForm.chiefComplaint} onChange={e => setEncForm(p => ({ ...p, chiefComplaint: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[['S — Subjective','subjective',"Patient's reported symptoms..."],['O — Objective','objective','Exam findings, vitals...'],['A — Assessment','assessment','Clinical impression...'],['P — Plan','plan','Treatment plan, orders...']].map(([label,key,ph]) => (
                  <div key={key}>
                    <label className="form-label">{label}</label>
                    <textarea className="form-input" rows={4} placeholder={ph} value={encForm[key]} onChange={e => setEncForm(p => ({ ...p, [key]: e.target.value }))} style={{ resize: 'vertical' }} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, position: 'sticky', bottom: 0, background: 'var(--surface)' }}>
              <button className="btn" onClick={() => setEncounterModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEncounter} disabled={!encForm.chiefComplaint?.trim()}>💾 Save &amp; Open Encounter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
