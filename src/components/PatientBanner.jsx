import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../contexts/PatientContext';
import PatientPhotoUpload from './PatientPhotoUpload';
import { DemoSafe } from '../demo/DemoGuard';

export default function PatientBanner() {
  const { selectedPatient, allergies, problemList, vitalSigns, meds } = usePatient();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  if (!selectedPatient) return null;

  const p = selectedPatient;
  const initials = `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`;  

  const hasAllergy = p.allergies && p.allergies.length > 0;
  const patientAllergies = allergies[p.id] || [];
  const patientProblems = problemList[p.id] || [];
  const patientMeds = meds[p.id] || [];
  const patientVitals = vitalSigns[p.id] || [];
  const latestVital = patientVitals[0];
  const activeProblems = patientProblems.filter(pr => pr.status === 'Active');
  const activeMeds = patientMeds.filter(m => m.status === 'Active');

  const flagStyle = (f) => {
    if (f.toLowerCase().includes('suicid'))   return 'athena-flag-critical';
    if (f.toLowerCase().includes('substance')) return 'athena-flag-warning';
    if (f === 'VIP')                           return 'athena-flag-vip';
    return 'athena-flag-info';
  };

  const age = p.age;
  const genderShort = p.gender === 'Male' ? 'M' : p.gender === 'Female' ? 'F' : p.gender;

  return (
    <div className="athena-banner">
      {/* ── Primary Bar ──────────────────────────── */}
      <div className="athena-banner-primary">
        <div className="athena-banner-left">
          {/* Patient photo — click to upload */}
          <div
            className="athena-banner-avatar-wrap"
            onClick={() => setShowPhotoModal(true)}
            title="Click to update patient photo"
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setShowPhotoModal(true)}
            aria-label="Update patient photo"
          >
            {p.photo ? (
              <img src={p.photo} alt={`${p.firstName} ${p.lastName}`} className="athena-banner-avatar-img" />
            ) : (
              <div className="athena-banner-avatar">{initials}</div>
            )}
            <div className="athena-banner-avatar-overlay" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
          </div>
          {showPhotoModal && (
            <PatientPhotoUpload patient={p} onClose={() => setShowPhotoModal(false)} />
          )}
          <div className="athena-banner-id">
            <div className="athena-banner-name">
              {p.lastName}, {p.firstName}
              <span className="athena-banner-demo">{age}{genderShort}</span>
              <span className="athena-banner-mrn">MRN: <DemoSafe mask="███-████">{p.mrn}</DemoSafe></span>
              {p.isBTG && <span className="athena-flag-critical">🔒 BTG</span>}
            </div>
            <div className="athena-banner-subline">
              <span>DOB: {p.dob}</span>
              <span className="athena-sep">|</span>
              <span>Sex: {p.gender}</span>
              {p.pronouns && <><span className="athena-sep">|</span><span>{p.pronouns}</span></>}
              <span className="athena-sep">|</span>
              <span>PCP: {p.pcp || '—'}</span>
              <span className="athena-sep">|</span>
              <span>Ins: {p.insurance?.primary?.name || 'Self-Pay'} <DemoSafe mask="·ID ████████">{p.insurance?.primary?.memberId ? `· ID ${p.insurance.primary.memberId}` : ''}</DemoSafe></span>
              {p.preferredPharmacy && <><span className="athena-sep">|</span><span>💊 {p.preferredPharmacy}{p.preferredPharmacyPhone ? ` · ${p.preferredPharmacyPhone}` : ''}</span></>}
              {p.lastVisit && <><span className="athena-sep">|</span><span>Last visit: {p.lastVisit}</span></>}
              {p.nextAppointment && <><span className="athena-sep">|</span><span>Next: {p.nextAppointment}</span></>}
            </div>
          </div>
        </div>

        <div className="athena-banner-center">
          {/* Allergy Alert Bar */}
          <div className={`athena-allergy-bar ${hasAllergy ? 'has-allergy' : 'no-allergy'}`}>
            <span className="athena-allergy-icon">{hasAllergy ? '⚠' : '✓'}</span>
            <span className="athena-allergy-text">
              {hasAllergy
                ? `ALLERGIES: ${p.allergies.map(a => a.allergen || a).join(', ')}`
                : 'NKDA — No Known Drug Allergies'}
            </span>
          </div>
          {/* Flags */}
          {p.flags && p.flags.length > 0 && (
            <div className="athena-banner-flags">
              {p.flags.map((f, i) => (
                <span key={i} className={flagStyle(f)}>{f}</span>
              ))}
            </div>
          )}
        </div>

        <div className="athena-banner-actions">
          <button className="athena-action-btn athena-action-primary" onClick={() => navigate(`/chart/${p.id}/encounters`)}>
            <span className="athena-action-icon">📝</span>New Encounter
          </button>
          <button className="athena-action-btn" onClick={() => navigate(`/chart/${p.id}/orders`)}>
            <span className="athena-action-icon">⚡</span>Orders
          </button>
          <button className="athena-action-btn" onClick={() => navigate('/patient-chat')}>
            <span className="athena-action-icon">💬</span>Msg
          </button>
          <button
            className="athena-action-btn athena-expand-btn"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Collapse details' : 'Expand details'}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* ── Expanded Clinical Snapshot ────────────── */}
      {expanded && (
        <div className="athena-banner-expanded">
          <div className="athena-snapshot-col">
            <div className="athena-snapshot-title">Active Problems ({activeProblems.length})</div>
            {activeProblems.length > 0 ? activeProblems.slice(0, 5).map((pr, i) => (
              <div key={i} className="athena-snapshot-item">
                <span className="athena-snapshot-code">{pr.code}</span>
                <span>{pr.description || pr.name || pr.problem}</span>
              </div>
            )) : <div className="athena-snapshot-empty">No active problems</div>}
            {activeProblems.length > 5 && <div className="athena-snapshot-more">+{activeProblems.length - 5} more</div>}
          </div>

          <div className="athena-snapshot-col">
            <div className="athena-snapshot-title">Active Medications ({activeMeds.length})</div>
            {activeMeds.length > 0 ? activeMeds.slice(0, 5).map((m, i) => (
              <div key={i} className="athena-snapshot-item">
                <span className="athena-snapshot-med">{m.name}</span>
                <span className="athena-snapshot-dose">{m.dose} {m.frequency}</span>
              </div>
            )) : <div className="athena-snapshot-empty">No active medications</div>}
            {activeMeds.length > 5 && <div className="athena-snapshot-more">+{activeMeds.length - 5} more</div>}
          </div>

          <div className="athena-snapshot-col">
            <div className="athena-snapshot-title">Latest Vitals</div>
            {latestVital ? (
              <div className="athena-vitals-grid">
                <div className="athena-vital"><span className="athena-vital-label">BP</span><span className="athena-vital-value">{latestVital.bp}</span></div>
                <div className="athena-vital"><span className="athena-vital-label">HR</span><span className="athena-vital-value">{latestVital.hr}</span></div>
                <div className="athena-vital"><span className="athena-vital-label">Temp</span><span className="athena-vital-value">{latestVital.temp}°</span></div>
                <div className="athena-vital"><span className="athena-vital-label">SpO2</span><span className="athena-vital-value">{latestVital.spo2}%</span></div>
                <div className="athena-vital"><span className="athena-vital-label">Wt</span><span className="athena-vital-value">{latestVital.weight}</span></div>
                <div className="athena-vital"><span className="athena-vital-label">BMI</span><span className="athena-vital-value">{latestVital.bmi}</span></div>
              </div>
            ) : <div className="athena-snapshot-empty">No vitals recorded</div>}
          </div>

          <div className="athena-snapshot-col">
            <div className="athena-snapshot-title">💊 Preferred Pharmacy</div>
            {p.preferredPharmacy ? (
              <>
                <div className="athena-snapshot-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{p.preferredPharmacy}</span>
                  {p.preferredPharmacyAddress && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📍 {p.preferredPharmacyAddress}</span>}
                  {p.preferredPharmacyPhone && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📞 {p.preferredPharmacyPhone}</span>}
                  {p.preferredPharmacyFax && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📠 Fax: {p.preferredPharmacyFax}</span>}
                </div>
              </>
            ) : (
              <div className="athena-snapshot-empty">No preferred pharmacy on file</div>
            )}
          </div>

          <div className="athena-snapshot-col">
            <div className="athena-snapshot-title">Allergies ({patientAllergies.length})</div>
            {patientAllergies.length > 0 ? patientAllergies.map((a, i) => (
              <div key={i} className="athena-snapshot-item">
                <span className={`athena-severity ${a.severity === 'Severe' ? 'severe' : a.severity === 'Moderate' ? 'moderate' : 'mild'}`}>●</span>
                <span className="athena-snapshot-allergen">{a.allergen}</span>
                {a.reaction && <span className="athena-snapshot-reaction">— {a.reaction}</span>}
              </div>
            )) : <div className="athena-snapshot-empty athena-nkda">✓ NKDA</div>}
          </div>
        </div>
      )}
    </div>
  );
}

