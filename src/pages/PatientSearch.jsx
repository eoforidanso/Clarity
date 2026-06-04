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

export default function PatientSearch() {
  const { patients, selectPatient, addEncounter, addPatient } = usePatient();
  const { currentUser } = useAuth();
  const { activeSiteId, isFiltered } = useSite();
  const [search, setSearch] = useState('');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // New encounter modal state
  const [encounterModal, setEncounterModal] = useState(null); // patient object | null
  const today = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 5);
  const [encForm, setEncForm] = useState({});

  // Add Patient modal state
  const EMPTY_PT = {
    firstName: '', lastName: '', dob: '', gender: 'Female', pronouns: '',
    phone: '', cellPhone: '', email: '',
    address: { street: '', city: '', state: '', zip: '' },
    emergencyContact: { name: '', relationship: '', phone: '' },
    insurance: { primary: { name: '', memberId: '', groupNumber: '', copay: '' } },
    pcp: '', assignedProvider: '', language: 'English', race: '', ethnicity: '',
    maritalStatus: '', ssn: '',
  };
  const [addModal, setAddModal] = useState(false);
  const [ptForm, setPtForm] = useState(EMPTY_PT);
  const [ptSaving, setPtSaving] = useState(false);
  const [ptError, setPtError] = useState('');

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
      setPtForm(EMPTY_PT);
      selectPatient(created.id);
      navigate(`/chart/${created.id}/summary`);
    } catch (err) {
      setPtError(err?.message || 'Failed to create patient. Please try again.');
    } finally {
      setPtSaving(false);
    }
  };

  const cancelAddPatient = () => { setAddModal(false); setPtForm(EMPTY_PT); setPtError(''); };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>🔍 Patient Search</h1>
          <p>Search and select a patient to open their chart · <strong>{patients.length}</strong> patients in system</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setPtForm(EMPTY_PT); setPtError(''); setAddModal(true); }}>
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
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                            {p.firstName?.[0]}{p.lastName?.[0]}
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
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 11, flexShrink: 0,
                        }}>
                          {p.firstName?.[0] || ''}{p.lastName?.[0] || ''}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14 }}>{p.lastName}, {p.firstName}</div>
                          <div className="text-xs text-muted">{p.phone || p.cellPhone || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.mrn}</td>
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
      {/* Add Patient Modal */}
      {addModal && (
        <div className="modal-container">
          <div className="add-patient-card" style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>👤 Add New Patient</div>
              <button onClick={cancelAddPatient}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div>
              {ptError && (
                <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                  ⚠️ {ptError}
                </div>
              )}

              {/* Demographics */}
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Demographics</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="form-label">First Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input className="form-input" value={ptForm.firstName}
                    onChange={e => setPtForm(p => ({ ...p, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Last Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input className="form-input" value={ptForm.lastName}
                    onChange={e => setPtForm(p => ({ ...p, lastName: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Date of Birth <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input className="form-input" type="date" value={ptForm.dob}
                    onChange={e => setPtForm(p => ({ ...p, dob: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Gender <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select className="form-input" value={ptForm.gender}
                    onChange={e => setPtForm(p => ({ ...p, gender: e.target.value }))}>
                    {['Female','Male','Non-binary','Transgender Female','Transgender Male','Other','Prefer not to say'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Pronouns</label>
                  <input className="form-input" placeholder="e.g., She/Her" value={ptForm.pronouns}
                    onChange={e => setPtForm(p => ({ ...p, pronouns: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Language</label>
                  <select className="form-input" value={ptForm.language}
                    onChange={e => setPtForm(p => ({ ...p, language: e.target.value }))}>
                    {['English','Spanish','French','Mandarin','Arabic','Portuguese','Russian','Other'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Race</label>
                  <input className="form-input" value={ptForm.race}
                    onChange={e => setPtForm(p => ({ ...p, race: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Ethnicity</label>
                  <input className="form-input" value={ptForm.ethnicity}
                    onChange={e => setPtForm(p => ({ ...p, ethnicity: e.target.value }))} />
                </div>
              </div>

              {/* Contact */}
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Contact</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="form-label">Phone</label>
                  <input className="form-input" placeholder="(555) 000-0000" value={ptForm.phone}
                    onChange={e => setPtForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Cell Phone</label>
                  <input className="form-input" placeholder="(555) 000-0000" value={ptForm.cellPhone}
                    onChange={e => setPtForm(p => ({ ...p, cellPhone: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={ptForm.email}
                    onChange={e => setPtForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Street</label>
                  <input className="form-input" value={ptForm.address.street}
                    onChange={e => setPtForm(p => ({ ...p, address: { ...p.address, street: e.target.value } }))} />
                </div>
                <div>
                  <label className="form-label">City</label>
                  <input className="form-input" value={ptForm.address.city}
                    onChange={e => setPtForm(p => ({ ...p, address: { ...p.address, city: e.target.value } }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label className="form-label">State</label>
                    <input className="form-input" maxLength={2} value={ptForm.address.state}
                      onChange={e => setPtForm(p => ({ ...p, address: { ...p.address, state: e.target.value.toUpperCase() } }))} />
                  </div>
                  <div>
                    <label className="form-label">ZIP</label>
                    <input className="form-input" maxLength={10} value={ptForm.address.zip}
                      onChange={e => setPtForm(p => ({ ...p, address: { ...p.address, zip: e.target.value } }))} />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Emergency Contact</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="form-label">Name</label>
                  <input className="form-input" value={ptForm.emergencyContact.name}
                    onChange={e => setPtForm(p => ({ ...p, emergencyContact: { ...p.emergencyContact, name: e.target.value } }))} />
                </div>
                <div>
                  <label className="form-label">Relationship</label>
                  <input className="form-input" placeholder="e.g., Spouse" value={ptForm.emergencyContact.relationship}
                    onChange={e => setPtForm(p => ({ ...p, emergencyContact: { ...p.emergencyContact, relationship: e.target.value } }))} />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={ptForm.emergencyContact.phone}
                    onChange={e => setPtForm(p => ({ ...p, emergencyContact: { ...p.emergencyContact, phone: e.target.value } }))} />
                </div>
              </div>

              {/* Insurance */}
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Primary Insurance</div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="form-label">Insurance Name</label>
                  <input className="form-input" placeholder="e.g., Blue Cross Blue Shield" value={ptForm.insurance.primary.name}
                    onChange={e => setPtForm(p => ({ ...p, insurance: { ...p.insurance, primary: { ...p.insurance.primary, name: e.target.value } } }))} />
                </div>
                <div>
                  <label className="form-label">Member ID</label>
                  <input className="form-input" value={ptForm.insurance.primary.memberId}
                    onChange={e => setPtForm(p => ({ ...p, insurance: { ...p.insurance, primary: { ...p.insurance.primary, memberId: e.target.value } } }))} />
                </div>
                <div>
                  <label className="form-label">Group #</label>
                  <input className="form-input" value={ptForm.insurance.primary.groupNumber}
                    onChange={e => setPtForm(p => ({ ...p, insurance: { ...p.insurance, primary: { ...p.insurance.primary, groupNumber: e.target.value } } }))} />
                </div>
                <div>
                  <label className="form-label">Copay ($)</label>
                  <input className="form-input" type="number" min="0" value={ptForm.insurance.primary.copay}
                    onChange={e => setPtForm(p => ({ ...p, insurance: { ...p.insurance, primary: { ...p.insurance.primary, copay: e.target.value } } }))} />
                </div>
              </div>

              {/* Care Team */}
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Care Team</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Primary Care Provider (PCP)</label>
                  <input className="form-input" placeholder="e.g., Dr. Jane Smith" value={ptForm.pcp}
                    onChange={e => setPtForm(p => ({ ...p, pcp: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Assigned Provider</label>
                  <input className="form-input" placeholder="e.g., Dr. Chris L." value={ptForm.assignedProvider}
                    onChange={e => setPtForm(p => ({ ...p, assignedProvider: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'flex-end', gap: 10,
            }}>
              <button className="btn" onClick={cancelAddPatient} disabled={ptSaving}>Cancel</button>
              <button className="btn btn-primary" onClick={saveNewPatient} disabled={ptSaving}>
                {ptSaving ? 'Saving…' : '💾 Create Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
