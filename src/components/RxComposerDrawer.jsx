/**
 * RxComposerDrawer — Shared prescription-entry panel
 *
 * Embeds the full "smart Rx" feature set in one reusable drawer:
 *   • Drug search (psych med database)
 *   • Drug-interaction checker (40 psychiatry rules)
 *   • Active-medication context panel with duplicate detection
 *   • PDMP / IL-PMP banner + PDMPDrawer for controlled substances
 *   • EPCS / DEA gates
 *   • Pharmacy auto-population (patient → last-used → provider default)
 *   • PharmacySelectorDrawer (Illinois directory, proximity-sorted)
 *   • Sig suggestion chips (patient history → provider favorite → clinic default)
 *
 * Props
 *   isOpen         bool          — controls visibility
 *   onClose        () => void
 *   patient        object        — selectedPatient from PatientContext
 *   provider       object        — currentUser from AuthContext
 *   patientMeds    array         — active / all meds for this patient
 *   onSubmit       (rxData) => void  — called with completed prescription object
 *   initialMedName string?       — pre-fill drug name (optional)
 */

import React, { useState, useEffect, useRef } from 'react';
import { getControlledSchedule } from '../utils/controlledSubstances';
import { checkInteractions }      from '../data/drugInteractions';
import { resolvePharmacy, resolveSigSuggestions, getActiveMedContext } from '../utils/rxAutoPopulate';
import { generateILPmpReport }    from '../utils/pmpMock';
import PDMPDrawer                 from './PDMPDrawer';
import PharmacySelectorDrawer     from './PharmacySelectorDrawer';
import { medicationDatabase }     from '../data/mockData';

// ── Clinic-default sig table (psychiatry) ────────────────────────────────────
export const PSYCH_MED_DEFAULTS = [
  { match: 'sertraline',     dose: '50mg',   sig: 'Take 1 tablet by mouth once daily in the morning',                   qty: '30', refills: '3' },
  { match: 'zoloft',         dose: '50mg',   sig: 'Take 1 tablet by mouth once daily in the morning',                   qty: '30', refills: '3' },
  { match: 'fluoxetine',     dose: '20mg',   sig: 'Take 1 capsule by mouth once daily in the morning',                  qty: '30', refills: '3' },
  { match: 'prozac',         dose: '20mg',   sig: 'Take 1 capsule by mouth once daily in the morning',                  qty: '30', refills: '3' },
  { match: 'escitalopram',   dose: '10mg',   sig: 'Take 1 tablet by mouth once daily',                                  qty: '30', refills: '3' },
  { match: 'lexapro',        dose: '10mg',   sig: 'Take 1 tablet by mouth once daily',                                  qty: '30', refills: '3' },
  { match: 'citalopram',     dose: '20mg',   sig: 'Take 1 tablet by mouth once daily',                                  qty: '30', refills: '3' },
  { match: 'celexa',         dose: '20mg',   sig: 'Take 1 tablet by mouth once daily',                                  qty: '30', refills: '3' },
  { match: 'paroxetine',     dose: '20mg',   sig: 'Take 1 tablet by mouth once daily in the morning',                   qty: '30', refills: '3' },
  { match: 'paxil',          dose: '20mg',   sig: 'Take 1 tablet by mouth once daily in the morning',                   qty: '30', refills: '3' },
  { match: 'fluvoxamine',    dose: '50mg',   sig: 'Take 1 tablet by mouth at bedtime',                                  qty: '30', refills: '3' },
  { match: 'venlafaxine',    dose: '75mg',   sig: 'Take 1 capsule by mouth once daily with food',                       qty: '30', refills: '3' },
  { match: 'effexor',        dose: '75mg',   sig: 'Take 1 capsule by mouth once daily with food',                       qty: '30', refills: '3' },
  { match: 'duloxetine',     dose: '30mg',   sig: 'Take 1 capsule by mouth once daily',                                 qty: '30', refills: '3' },
  { match: 'cymbalta',       dose: '30mg',   sig: 'Take 1 capsule by mouth once daily',                                 qty: '30', refills: '3' },
  { match: 'desvenlafaxine', dose: '50mg',   sig: 'Take 1 tablet by mouth once daily',                                  qty: '30', refills: '3' },
  { match: 'pristiq',        dose: '50mg',   sig: 'Take 1 tablet by mouth once daily',                                  qty: '30', refills: '3' },
  { match: 'bupropion',      dose: '150mg',  sig: 'Take 1 tablet by mouth once daily in the morning',                   qty: '30', refills: '3' },
  { match: 'wellbutrin',     dose: '150mg',  sig: 'Take 1 tablet by mouth once daily in the morning',                   qty: '30', refills: '3' },
  { match: 'mirtazapine',    dose: '15mg',   sig: 'Take 1 tablet by mouth at bedtime',                                  qty: '30', refills: '3' },
  { match: 'remeron',        dose: '15mg',   sig: 'Take 1 tablet by mouth at bedtime',                                  qty: '30', refills: '3' },
  { match: 'trazodone',      dose: '50mg',   sig: 'Take 1 tablet by mouth at bedtime as needed for insomnia',           qty: '30', refills: '3' },
  { match: 'lithium',        dose: '300mg',  sig: 'Take 1 capsule by mouth three times daily with food',                qty: '90', refills: '3' },
  { match: 'valproate',      dose: '250mg',  sig: 'Take 1 tablet by mouth twice daily with food',                       qty: '60', refills: '3' },
  { match: 'depakote',       dose: '500mg',  sig: 'Take 1 tablet by mouth twice daily with food',                       qty: '60', refills: '3' },
  { match: 'lamotrigine',    dose: '25mg',   sig: 'Take 1 tablet by mouth once daily — titrate per schedule',           qty: '30', refills: '3' },
  { match: 'lamictal',       dose: '25mg',   sig: 'Take 1 tablet by mouth once daily — titrate per schedule',           qty: '30', refills: '3' },
  { match: 'carbamazepine',  dose: '200mg',  sig: 'Take 1 tablet by mouth twice daily with food',                       qty: '60', refills: '3' },
  { match: 'tegretol',       dose: '200mg',  sig: 'Take 1 tablet by mouth twice daily with food',                       qty: '60', refills: '3' },
  { match: 'oxcarbazepine',  dose: '300mg',  sig: 'Take 1 tablet by mouth twice daily',                                 qty: '60', refills: '3' },
  { match: 'aripiprazole',   dose: '10mg',   sig: 'Take 1 tablet by mouth once daily',                                  qty: '30', refills: '3' },
  { match: 'abilify',        dose: '10mg',   sig: 'Take 1 tablet by mouth once daily',                                  qty: '30', refills: '3' },
  { match: 'olanzapine',     dose: '5mg',    sig: 'Take 1 tablet by mouth at bedtime',                                  qty: '30', refills: '3' },
  { match: 'zyprexa',        dose: '5mg',    sig: 'Take 1 tablet by mouth at bedtime',                                  qty: '30', refills: '3' },
  { match: 'quetiapine',     dose: '50mg',   sig: 'Take 1 tablet by mouth at bedtime',                                  qty: '30', refills: '3' },
  { match: 'seroquel',       dose: '50mg',   sig: 'Take 1 tablet by mouth at bedtime',                                  qty: '30', refills: '3' },
  { match: 'risperidone',    dose: '1mg',    sig: 'Take 1 tablet by mouth twice daily',                                 qty: '60', refills: '3' },
  { match: 'risperdal',      dose: '1mg',    sig: 'Take 1 tablet by mouth twice daily',                                 qty: '60', refills: '3' },
  { match: 'ziprasidone',    dose: '20mg',   sig: 'Take 1 capsule by mouth twice daily with food',                      qty: '60', refills: '3' },
  { match: 'geodon',         dose: '20mg',   sig: 'Take 1 capsule by mouth twice daily with food',                      qty: '60', refills: '3' },
  { match: 'lurasidone',     dose: '20mg',   sig: 'Take 1 tablet by mouth once daily with food (≥ 350 kcal)',           qty: '30', refills: '3' },
  { match: 'latuda',         dose: '20mg',   sig: 'Take 1 tablet by mouth once daily with food (≥ 350 kcal)',           qty: '30', refills: '3' },
  { match: 'clozapine',      dose: '25mg',   sig: 'Take 1 tablet by mouth twice daily — REMS monitoring required',      qty: '60', refills: '1' },
  { match: 'clozaril',       dose: '25mg',   sig: 'Take 1 tablet by mouth twice daily — REMS monitoring required',      qty: '60', refills: '1' },
  { match: 'alprazolam',     dose: '0.25mg', sig: 'Take 1 tablet by mouth three times daily as needed for anxiety',     qty: '90', refills: '0' },
  { match: 'xanax',          dose: '0.25mg', sig: 'Take 1 tablet by mouth three times daily as needed for anxiety',     qty: '90', refills: '0' },
  { match: 'lorazepam',      dose: '0.5mg',  sig: 'Take 1 tablet by mouth twice daily as needed for anxiety',           qty: '60', refills: '0' },
  { match: 'ativan',         dose: '0.5mg',  sig: 'Take 1 tablet by mouth twice daily as needed for anxiety',           qty: '60', refills: '0' },
  { match: 'clonazepam',     dose: '0.5mg',  sig: 'Take 1 tablet by mouth twice daily',                                 qty: '60', refills: '0' },
  { match: 'klonopin',       dose: '0.5mg',  sig: 'Take 1 tablet by mouth twice daily',                                 qty: '60', refills: '0' },
  { match: 'diazepam',       dose: '5mg',    sig: 'Take 1 tablet by mouth twice daily as needed',                       qty: '60', refills: '0' },
  { match: 'valium',         dose: '5mg',    sig: 'Take 1 tablet by mouth twice daily as needed',                       qty: '60', refills: '0' },
  { match: 'hydroxyzine',    dose: '25mg',   sig: 'Take 1 tablet by mouth three times daily as needed for anxiety',     qty: '90', refills: '3' },
  { match: 'vistaril',       dose: '25mg',   sig: 'Take 1 tablet by mouth three times daily as needed for anxiety',     qty: '90', refills: '3' },
  { match: 'buspirone',      dose: '5mg',    sig: 'Take 1 tablet by mouth three times daily',                           qty: '90', refills: '3' },
  { match: 'buspar',         dose: '5mg',    sig: 'Take 1 tablet by mouth three times daily',                           qty: '90', refills: '3' },
  { match: 'amphetamine',    dose: '10mg',   sig: 'Take 1 tablet by mouth once daily in the morning',                   qty: '30', refills: '0' },
  { match: 'adderall',       dose: '10mg',   sig: 'Take 1 tablet by mouth once daily in the morning',                   qty: '30', refills: '0' },
  { match: 'methylphenidate', dose: '10mg',  sig: 'Take 1 tablet by mouth twice daily (morning and noon)',              qty: '60', refills: '0' },
  { match: 'ritalin',        dose: '10mg',   sig: 'Take 1 tablet by mouth twice daily (morning and noon)',              qty: '60', refills: '0' },
  { match: 'concerta',       dose: '18mg',   sig: 'Take 1 tablet by mouth once daily in the morning',                   qty: '30', refills: '0' },
  { match: 'propranolol',    dose: '10mg',   sig: 'Take 1 tablet by mouth as needed for situational anxiety — not to exceed 40mg/day', qty: '30', refills: '3' },
  { match: 'naltrexone',     dose: '50mg',   sig: 'Take 1 tablet by mouth once daily',                                  qty: '30', refills: '3' },
  { match: 'vivitrol',       dose: '380mg',  sig: 'Inject 380mg IM gluteal once monthly — alternate sides',            qty: '1',  refills: '3' },
  { match: 'buprenorphine',  dose: '8mg',    sig: 'Place 1 film under tongue once daily — do not eat or drink for 5 minutes', qty: '30', refills: '0' },
  { match: 'suboxone',       dose: '8/2mg',  sig: 'Place 1 film under tongue once daily — do not eat or drink for 5 minutes', qty: '30', refills: '0' },
  { match: 'zolpidem',       dose: '5mg',    sig: 'Take 1 tablet by mouth at bedtime as needed — 7-8 hours before rising', qty: '30', refills: '0' },
  { match: 'ambien',         dose: '5mg',    sig: 'Take 1 tablet by mouth at bedtime as needed — 7-8 hours before rising', qty: '30', refills: '0' },
  { match: 'melatonin',      dose: '3mg',    sig: 'Take 1 tablet by mouth 30 minutes before bedtime',                   qty: '30', refills: '3' },
  { match: 'topiramate',     dose: '25mg',   sig: 'Take 1 tablet by mouth twice daily — titrate per schedule',          qty: '60', refills: '3' },
  { match: 'topamax',        dose: '25mg',   sig: 'Take 1 tablet by mouth twice daily — titrate per schedule',          qty: '60', refills: '3' },
  { match: 'gabapentin',     dose: '300mg',  sig: 'Take 1 capsule by mouth three times daily',                          qty: '90', refills: '3' },
  { match: 'neurontin',      dose: '300mg',  sig: 'Take 1 capsule by mouth three times daily',                          qty: '90', refills: '3' },
];

const BLANK_RX = {
  name: '', dose: '', sig: '', quantity: '30', refills: '0',
  pharmacy: '', pharmAddress: '', pharmPhone: '', pharmFax: '', notes: '',
  route: 'Oral', frequency: 'Once daily',
};

// ── Interaction severity colours ────────────────────────────────────────────
const IXNCOLOR = {
  Contraindicated: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', badge: '#fee2e2' },
  Major:           { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c', badge: '#ffedd5' },
  Moderate:        { bg: '#fefce8', border: '#fde68a', text: '#ca8a04', badge: '#fef9c3' },
};

// ── Main component ────────────────────────────────────────────────────────────
export default function RxComposerDrawer({
  isOpen,
  onClose,
  patient,
  provider,
  patientMeds = [],
  onSubmit,
  initialMedName = '',
}) {
  // ── form state ──────────────────────────────────────────────────────────────
  const [rx, setRx]                   = useState({ ...BLANK_RX, name: initialMedName });
  const [medSearch, setMedSearch]     = useState('');
  const [showMedDrop, setShowMedDrop] = useState(false);

  // ── smart Rx state ──────────────────────────────────────────────────────────
  const [pharmAutoSource, setPharmAutoSource] = useState(null);
  const [sigSuggestions, setSigSuggestions]   = useState([]);
  const [showActiveMeds, setShowActiveMeds]   = useState(false);
  const [pharmDrawerOpen, setPharmDrawerOpen] = useState(false);

  // ── PDMP state ──────────────────────────────────────────────────────────────
  const [pdmpOpen, setPdmpOpen]             = useState(false);
  const [pdmpReport, setPdmpReport]         = useState(null);
  const [pdmpLoading, setPdmpLoading]       = useState(false);
  const [pdmpAcknowledged, setPdmpAcknowledged] = useState(false);
  const pdmpTimerRef = useRef(null);

  // ── derived ─────────────────────────────────────────────────────────────────
  const schedule     = getControlledSchedule(rx.name);
  const interactions = rx.name.length >= 3
    ? checkInteractions(patientMeds.map(m => m.name || ''), rx.name)
    : [];
  const { activeMeds, duplicates } = getActiveMedContext(rx.name, patientMeds);
  const worstIxn = interactions.find(i => i.severity === 'Contraindicated')
    ? 'Contraindicated'
    : interactions.find(i => i.severity === 'Major') ? 'Major'
    : interactions.length > 0 ? 'Moderate' : null;

  // ── Filtered med search ─────────────────────────────────────────────────────
  const filteredMeds = medSearch.trim().length >= 2
    ? medicationDatabase.filter(m =>
        m.name.toLowerCase().includes(medSearch.toLowerCase()) ||
        m.class.toLowerCase().includes(medSearch.toLowerCase())
      ).slice(0, 15)
    : [];

  // ── Auto-populate pharmacy on open ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (!rx.pharmacy) {
      const resolved = resolvePharmacy(patient, provider, patientMeds);
      if (resolved) {
        setRx(prev => ({
          ...prev,
          pharmacy:     resolved.name,
          pharmAddress: resolved.address || '',
          pharmPhone:   resolved.phone   || '',
          pharmFax:     resolved.fax     || '',
        }));
        setPharmAutoSource(resolved.sourceLabel);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Sig suggestions ─────────────────────────────────────────────────────────
  useEffect(() => {
    const suggestions = resolveSigSuggestions(
      rx.name,
      patientMeds,
      provider?.sigFavorites || [],
      PSYCH_MED_DEFAULTS,
    );
    setSigSuggestions(suggestions);
    // Auto-apply first suggestion if sig field is blank
    if (!rx.sig && suggestions.length > 0) {
      setRx(prev => ({ ...prev, sig: suggestions[0].sig }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rx.name]);

  // ── PDMP auto-query when CS detected ──────────────────────────────────────
  useEffect(() => {
    clearTimeout(pdmpTimerRef.current);
    if (schedule && patient && rx.name.length >= 3) {
      setPdmpReport(null);
      setPdmpAcknowledged(false);
      setPdmpLoading(true);
      pdmpTimerRef.current = setTimeout(() => {
        setPdmpReport(generateILPmpReport(patient, rx.name, schedule));
        setPdmpLoading(false);
      }, 900);
    } else {
      setPdmpReport(null);
      setPdmpAcknowledged(false);
      setPdmpLoading(false);
    }
    return () => clearTimeout(pdmpTimerRef.current);
  }, [rx.name, schedule, patient?.id]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const handleMedSelect = (med) => {
    const lower = med.name.toLowerCase();
    const match = [...PSYCH_MED_DEFAULTS]
      .sort((a, b) => b.match.length - a.match.length)
      .find(d => lower.includes(d.match));
    setRx(prev => ({
      ...prev,
      name:     med.name,
      dose:     match?.dose    || (med.doses?.[0] || ''),
      quantity: match?.qty     || '30',
      refills:  match?.refills || '0',
      route:    med.routes?.[0] || 'Oral',
      sig:      match?.sig     || '',
    }));
    setMedSearch('');
    setShowMedDrop(false);
  };

  const handlePharmacySelect = (pharm) => {
    setRx(prev => ({
      ...prev,
      pharmacy:     pharm.name    || '',
      pharmAddress: pharm.address || '',
      pharmPhone:   pharm.phone   || '',
      pharmFax:     pharm.fax     || '',
    }));
    setPharmAutoSource(null);
    setPharmDrawerOpen(false);
  };

  const handleSubmit = () => {
    if (!rx.name || !rx.sig) return;
    onSubmit({ ...rx, schedule: schedule || null, isControlled: !!schedule });
    // Reset for next use
    setRx({ ...BLANK_RX });
    setPharmAutoSource(null);
    setSigSuggestions([]);
    setShowActiveMeds(false);
    setPdmpReport(null);
    setPdmpAcknowledged(false);
  };

  const handleClose = () => {
    setRx({ ...BLANK_RX });
    setPharmAutoSource(null);
    setSigSuggestions([]);
    setShowActiveMeds(false);
    setPdmpReport(null);
    setPdmpAcknowledged(false);
    onClose();
  };

  const needsPdmpAck = !!schedule && !!pdmpReport && !pdmpAcknowledged;
  const canSubmit = rx.name.trim() && rx.sig.trim() && !needsPdmpAck;

  if (!isOpen) return null;

  return (
    <>
      {/* ── Overlay ── */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1200 }}
        onClick={handleClose}
      />

      {/* ── Drawer panel ── */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
        background: 'var(--surface)', zIndex: 1210,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.2)',
        borderLeft: '1px solid var(--border)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>💊 New Prescription</div>
            {patient && (
              <div style={{ fontSize: 12, color: '#c7d2fe', marginTop: 2 }}>
                {patient.firstName} {patient.lastName} · DOB: {patient.dob}
              </div>
            )}
          </div>
          <button onClick={handleClose} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
            borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── Drug Name ── */}
          <div style={{ position: 'relative' }}>
            <label className="form-label" style={{ fontSize: 11 }}>
              Medication * <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— type to search</span>
            </label>
            <input
              className="form-input"
              value={rx.name || medSearch}
              placeholder="Search by name or class (sertraline, SSRI, Zoloft…)"
              onChange={e => {
                const v = e.target.value;
                setMedSearch(v);
                setRx(prev => ({ ...prev, name: v, sig: '' }));
                setShowMedDrop(true);
              }}
              onFocus={() => setShowMedDrop(true)}
              onBlur={() => setTimeout(() => setShowMedDrop(false), 150)}
              style={{ fontSize: 13 }}
            />
            {schedule && (
              <span style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-10%)',
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5',
              }}>🔒 {schedule}</span>
            )}
            {showMedDrop && filteredMeds.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                border: '1px solid var(--border)', borderRadius: 6, background: '#fff',
                maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}>
                {filteredMeds.map((med, i) => (
                  <button key={i} type="button"
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 12px', border: 'none', cursor: 'pointer',
                      background: 'transparent', borderBottom: '1px solid #f8fafc', fontSize: 13,
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#f5f3ff'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handleMedSelect(med)}>
                    <span style={{ fontWeight: 600 }}>{med.name}</span>
                    <span style={{ fontSize: 10.5, color: '#7c3aed', marginLeft: 8, background: '#f5f3ff', padding: '1px 5px', borderRadius: 4 }}>
                      {med.class}
                    </span>
                    {med.isControlled && (
                      <span style={{ fontSize: 10, color: '#dc2626', marginLeft: 4, fontWeight: 700 }}>🔒 CS</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Drug Interaction Alert ── */}
          {interactions.length > 0 && worstIxn && (() => {
            const c = IXNCOLOR[worstIxn];
            return (
              <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: c.text, marginBottom: 6 }}>
                  ⚠ Drug Interaction Alert — {worstIxn} ({interactions.length} interaction{interactions.length !== 1 ? 's' : ''})
                </div>
                {interactions.slice(0, 3).map((ixn, i) => (
                  <div key={i} style={{ fontSize: 12, color: c.text, marginBottom: i < interactions.length - 1 ? 6 : 0 }}>
                    <span style={{ fontWeight: 700, background: c.badge, padding: '1px 5px', borderRadius: 4, marginRight: 6 }}>
                      {ixn.severity}
                    </span>
                    <strong>{ixn.pairLabel}</strong> — {ixn.effect}
                    {ixn.action && <div style={{ fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>→ {ixn.action}</div>}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── Active Meds Context Panel ── */}
          {activeMeds.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setShowActiveMeds(v => !v)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 12px',
                  background: duplicates.length > 0 ? '#fffbeb' : 'var(--bg)',
                  border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 12, fontWeight: 700,
                  color: duplicates.length > 0 ? '#92400e' : 'var(--text-secondary)',
                }}>
                <span>
                  {duplicates.length > 0 ? '⚠ ' : ''}
                  Active Meds Context ({activeMeds.length} active
                  {duplicates.length > 0 ? ` · ${duplicates.length} duplicate${duplicates.length > 1 ? 's' : ''}` : ''})
                </span>
                <span>{showActiveMeds ? '▲' : '▼'}</span>
              </button>
              {showActiveMeds && (
                <div style={{ maxHeight: 160, overflowY: 'auto', borderTop: '1px solid var(--border)' }}>
                  {activeMeds.map((m, i) => {
                    const isDup = duplicates.some(d => d.id === m.id);
                    return (
                      <div key={m.id || i} style={{
                        padding: '7px 12px', fontSize: 12, borderBottom: '1px solid var(--border)',
                        background: isDup ? '#fef9c3' : 'transparent',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          {isDup && <span style={{ color: '#d97706', fontWeight: 700, marginRight: 4 }}>⚠</span>}
                          <strong>{m.name}</strong> {m.dose}
                          <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{m.frequency}</span>
                        </div>
                        {m.lastFilled && (
                          <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                            Last: {m.lastFilled}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── PDMP Banner (Controlled Substance) ── */}
          {schedule && (
            <div style={{
              background: pdmpAcknowledged ? '#f0fdf4' : '#fff7ed',
              border: `1px solid ${pdmpAcknowledged ? '#86efac' : '#fed7aa'}`,
              borderRadius: 8, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: pdmpAcknowledged ? '#15803d' : '#ea580c' }}>
                  {pdmpAcknowledged ? '✅ PDMP Reviewed' : `⚠ Controlled Substance — ${schedule}`}
                </div>
                <div style={{ fontSize: 11.5, color: pdmpAcknowledged ? '#166534' : '#9a3412', marginTop: 2 }}>
                  {pdmpAcknowledged
                    ? 'IL PMP report reviewed and acknowledged. You may proceed.'
                    : 'Illinois PMP check required before prescribing. View report below.'
                  }
                </div>
              </div>
              {!pdmpAcknowledged && (
                <button
                  type="button"
                  onClick={() => setPdmpOpen(true)}
                  disabled={pdmpLoading || !pdmpReport}
                  style={{
                    padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                    background: '#ea580c', color: '#fff', border: 'none', cursor: 'pointer',
                    opacity: pdmpLoading ? 0.6 : 1, flexShrink: 0,
                  }}>
                  {pdmpLoading ? '⏳ Loading…' : '🏛️ View PDMP Report →'}
                </button>
              )}
            </div>
          )}

          {/* ── Dose / Route row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>Dose / Strength</label>
              <input className="form-input" placeholder="e.g., 50mg, 10mg/5mL"
                value={rx.dose}
                onChange={e => setRx(prev => ({ ...prev, dose: e.target.value }))}
                style={{ fontSize: 13 }} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>Route</label>
              <select className="form-input" value={rx.route}
                onChange={e => setRx(prev => ({ ...prev, route: e.target.value }))}
                style={{ fontSize: 13 }}>
                {['Oral', 'Sublingual', 'Topical', 'IM', 'IV', 'Intranasal', 'Inhaled', 'Rectal', 'Transdermal'].map(r => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Sig field + suggestions ── */}
          <div>
            <label className="form-label" style={{ fontSize: 11 }}>
              SIG (Patient Instructions) *
            </label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="e.g. Take 1 tablet by mouth once daily in the morning with food"
              value={rx.sig}
              onChange={e => setRx(prev => ({ ...prev, sig: e.target.value }))}
              style={{ fontSize: 12.5, resize: 'vertical', lineHeight: 1.5 }}
            />
            {/* Sig suggestion chips */}
            {sigSuggestions.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {sigSuggestions.map((s, i) => {
                  const chipColor =
                    s.source === 'patient_history'  ? { bg: '#f0fdf4', border: '#86efac', text: '#166534' } :
                    s.source === 'provider_favorite' ? { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' } :
                                                       { bg: '#f5f3ff', border: '#c4b5fd', text: '#6d28d9' };
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRx(prev => ({ ...prev, sig: s.sig }))}
                      title={s.sig}
                      style={{
                        padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                        background: chipColor.bg, border: `1px solid ${chipColor.border}`,
                        color: chipColor.text, cursor: 'pointer', maxWidth: 240,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Qty / Refills ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>Qty to Dispense</label>
              <input className="form-input" type="number" min={1} max={365}
                value={rx.quantity}
                onChange={e => setRx(prev => ({ ...prev, quantity: e.target.value }))}
                style={{ fontSize: 13 }} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>
                Refills
                {schedule && <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, color: '#dc2626' }}>
                  {schedule === 'Schedule II' ? '(CII — no refills)' : '(max 5 for CIII–CV)'}
                </span>}
              </label>
              <input className="form-input" type="number" min={0}
                max={schedule === 'Schedule II' ? 0 : schedule ? 5 : 12}
                value={rx.refills}
                onChange={e => setRx(prev => ({ ...prev, refills: e.target.value }))}
                style={{ fontSize: 13 }} />
            </div>
          </div>

          {/* ── Pharmacy auto-populated card ── */}
          <div>
            <label className="form-label" style={{ fontSize: 11 }}>
              Send to Pharmacy
            </label>

            {pharmAutoSource && rx.pharmacy && (
              <div style={{
                marginBottom: 6, padding: '5px 10px', borderRadius: 6, fontSize: 11,
                background: '#eff6ff', border: '1px solid #93c5fd', color: '#1d4ed8',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>ℹ {pharmAutoSource}</span>
                <button type="button"
                  onClick={() => { setPharmAutoSource(null); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#6b7280', padding: '0 2px' }}>
                  ✕ dismiss
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <input className="form-input"
                  value={rx.pharmacy}
                  onChange={e => { setRx(prev => ({ ...prev, pharmacy: e.target.value })); setPharmAutoSource(null); }}
                  placeholder="Pharmacy name…"
                  style={{ fontSize: 13, marginBottom: 6 }} />
                <input className="form-input"
                  value={rx.pharmAddress}
                  onChange={e => setRx(prev => ({ ...prev, pharmAddress: e.target.value }))}
                  placeholder="Address, city, state, zip…"
                  style={{ fontSize: 12, color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd' }} />
              </div>
              <button
                type="button"
                onClick={() => setPharmDrawerOpen(true)}
                style={{
                  padding: '7px 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 700,
                  background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer',
                  flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                🔍 Browse IL<br />Directory
              </button>
            </div>
          </div>

          {/* ── Notes ── */}
          <div>
            <label className="form-label" style={{ fontSize: 11 }}>Notes / Special Instructions</label>
            <textarea className="form-input" rows={2}
              placeholder="e.g., Take with food. Brand medically necessary. Titrate per protocol."
              value={rx.notes}
              onChange={e => setRx(prev => ({ ...prev, notes: e.target.value }))}
              style={{ fontSize: 12.5, resize: 'vertical', lineHeight: 1.5 }} />
          </div>

          {/* ── PDMP must-acknowledge warning ── */}
          {needsPdmpAck && (
            <div style={{
              background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 8,
              padding: '10px 14px', fontSize: 12.5, color: '#dc2626', fontWeight: 600,
            }}>
              🔐 You must view and acknowledge the IL PMP report before prescribing this controlled substance.
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10, flexShrink: 0,
        }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1, fontWeight: 700, fontSize: 14 }}
            disabled={!canSubmit}
            onClick={handleSubmit}
            title={needsPdmpAck ? 'View and acknowledge the PDMP report first' : (!rx.name || !rx.sig) ? 'Enter medication name and SIG' : ''}>
            {schedule ? '🔒 Add Controlled Rx' : '+ Add Prescription'}
          </button>
          <button type="button" className="btn" onClick={handleClose}
            style={{ padding: '8px 20px', fontWeight: 600 }}>
            Cancel
          </button>
        </div>
      </div>

      {/* ── PDMPDrawer ── */}
      {pdmpOpen && pdmpReport && (
        <PDMPDrawer
          isOpen={pdmpOpen}
          onClose={() => setPdmpOpen(false)}
          onAcknowledge={() => { setPdmpAcknowledged(true); setPdmpOpen(false); }}
          report={pdmpReport}
          medName={rx.name}
          onRequery={() => {
            setPdmpReport(null);
            setPdmpLoading(true);
            setTimeout(() => {
              setPdmpReport(generateILPmpReport(patient, rx.name, schedule));
              setPdmpLoading(false);
            }, 900);
          }}
          isRequerying={pdmpLoading}
        />
      )}

      {/* ── PharmacySelectorDrawer ── */}
      <PharmacySelectorDrawer
        isOpen={pharmDrawerOpen}
        onClose={() => setPharmDrawerOpen(false)}
        onSelect={handlePharmacySelect}
        patientAddress={patient?.address ? `${patient.address.street || ''} ${patient.address.city || ''} ${patient.address.state || ''} ${patient.address.zip || ''}`.trim() : ''}
      />
    </>
  );
}
