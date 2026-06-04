import React from 'react';

export default function AddPatientForm({
  // form state
  ptForm, setPtForm, ptError, ptSaving,
  showReview, setShowReview,
  dupMatches, dupCompare, setDupCompare,
  dlPasted, openSections, toggleSection,
  jumpToSection, sectionStatus, STATUS_PILL,
  ageInput, dobError, emailError, phoneError,
  mrnDupWarning, ssnMasked, zipLocked, ecSameAddress,
  // handlers
  handleFirstNameChange, handleLastNameChange,
  handleDobChange, handleAgeChange, handleGenderChange,
  handlePhoneChange, handlePhoneBlurValidate, handlePhoneBlur,
  handleEmailChange, handleSsnChange, handleMrnBlur,
  handleZipChange, handleZipBlur, handleCityManual, handleStateManual,
  handleEcSameAddress, handleECPhoneChange, setIns,
  isFormValid, saveNewPatient, cancelAddPatient, handleSelect,
  DEFAULT_PT,
}) {
  return (
        <div role="region" aria-labelledby="ap-title"
          style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 24 }}>

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

          <div style={{ flex: 1, background: '#fff', borderRadius: 14, border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(15,23,42,0.07)', overflow: 'visible' }}>

            {/* ── Header ── */}
            <div className="ap-header">
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
            <div className="ap-body">

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
                </div>
              </div>
              </>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="ap-footer">
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
}
