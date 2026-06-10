/**
 * rxAutoPopulate — Smart Prescription Auto-Population
 *
 * Priority chains:
 *   Pharmacy:  patient.defaultPharmacy  →  patient.lastUsedPharmacy  →  provider.defaultPharmacy
 *   Sig:       patient.previousSig      →  provider.favoriteSig      →  clinicDefault (PSYCH_MED_DEFAULTS)
 *
 * All functions are pure / side-effect-free so they can be called from any
 * entry point (Order Group, Encounters SOAP, Assessment & Plan, etc.).
 */

// ─── PHARMACY ─────────────────────────────────────────────────────────────────

/**
 * Resolve the best pharmacy to pre-fill for a new prescription.
 * Returns a filled pharmacy object, or null when nothing can be resolved.
 *
 * @param {object}  patient     - selectedPatient from PatientContext
 * @param {object}  provider    - currentUser from AuthContext
 * @param {Array}   patientMeds - active medications array for this patient
 * @returns {{ name, address, phone, fax, source, sourceLabel } | null}
 */
export function resolvePharmacy(patient, provider, patientMeds = []) {
  // ── Priority 1: patient's explicitly set default / preferred pharmacy ──────
  if (patient?.preferredPharmacy) {
    return {
      name:        patient.preferredPharmacy,
      address:     patient.preferredPharmacyAddress || '',
      phone:       patient.preferredPharmacyPhone   || '',
      fax:         patient.preferredPharmacyFax     || '',
      source:      'patient_default',
      sourceLabel: "Auto-selected: patient's default pharmacy",
    };
  }

  // ── Priority 2: most recently filled pharmacy from active med history ──────
  const lastUsed = [...(patientMeds || [])]
    .filter(m => (m.status || '').toLowerCase() === 'active' && m.pharmacy)
    .sort((a, b) => {
      const da = new Date(a.lastFilled || a.startDate || '1970-01-01');
      const db = new Date(b.lastFilled || b.startDate || '1970-01-01');
      return db - da;
    })[0];

  if (lastUsed?.pharmacy) {
    return {
      name:        lastUsed.pharmacy,
      address:     lastUsed.pharmacyAddress || '',
      phone:       lastUsed.pharmacyPhone   || '',
      fax:         lastUsed.pharmacyFax     || '',
      source:      'patient_last_used',
      sourceLabel: `Auto-selected: last used (${lastUsed.name})`,
    };
  }

  // ── Priority 3: provider's default pharmacy ───────────────────────────────
  if (provider?.defaultPharmacy) {
    return {
      name:        provider.defaultPharmacy,
      address:     provider.defaultPharmacyAddress || '',
      phone:       provider.defaultPharmacyPhone   || '',
      fax:         provider.defaultPharmacyFax     || '',
      source:      'provider_default',
      sourceLabel: "Auto-selected: provider's default pharmacy",
    };
  }

  return null;
}

// ─── SIG ──────────────────────────────────────────────────────────────────────

/**
 * Build a ranked list of sig suggestions for a drug name.
 *
 * @param {string}  medName           - Drug name being entered
 * @param {Array}   patientMeds       - Patient's current medications
 * @param {Array}   providerFavorites - Provider's saved favorites  [{ medName, sig }]
 * @param {Array}   clinicDefaults    - PSYCH_MED_DEFAULTS array   [{ match, sig, ... }]
 * @returns {Array} [{ sig, source, label }, ...]  ordered by priority, deduplicated
 */
export function resolveSigSuggestions(
  medName,
  patientMeds       = [],
  providerFavorites = [],
  clinicDefaults    = [],
) {
  if (!medName || medName.length < 3) return [];

  const lower = medName.toLowerCase();
  const base  = lower.split(' ')[0]; // generic base word  e.g. "sertraline" from "Sertraline (Zoloft) 50mg"
  const suggestions = [];
  const seen = new Set();

  const push = (sig, source, label) => {
    if (!sig || seen.has(sig)) return;
    seen.add(sig);
    suggestions.push({ sig, source, label });
  };

  // ── 1. Patient's previous sig for this drug (most recent first) ─────────
  ;[...(patientMeds || [])]
    .filter(m => m.sig && m.name && (
      m.name.toLowerCase().split(' ')[0].includes(base) ||
      base.includes(m.name.toLowerCase().split(' ')[0])
    ))
    .sort((a, b) =>
      new Date(b.lastFilled || b.startDate || '1970') -
      new Date(a.lastFilled || a.startDate || '1970')
    )
    .slice(0, 2)
    .forEach(m => push(m.sig, 'patient_history', `↩ Patient's previous sig (${m.name})`));

  // ── 2. Provider favorite sigs ────────────────────────────────────────────
  ;(providerFavorites || [])
    .filter(f => f.medName && (
      f.medName.toLowerCase().includes(base) ||
      base.includes(f.medName.toLowerCase().split(' ')[0])
    ))
    .slice(0, 1)
    .forEach(f => push(f.sig, 'provider_favorite', '★ Your favorite sig'));

  // ── 3. Clinic defaults (PSYCH_MED_DEFAULTS) ─────────────────────────────
  const sorted = [...clinicDefaults].sort((a, b) => b.match.length - a.match.length);
  const match  = sorted.find(d => lower.includes(d.match));
  if (match) push(match.sig, 'clinic_default', '🏥 Clinic default sig');

  return suggestions;
}

// ─── ACTIVE MED CONTEXT ───────────────────────────────────────────────────────

/**
 * Compute context for the active-medications panel shown alongside a new Rx.
 * Identifies duplicate candidates and last fill date.
 *
 * @param {string}  medName     - Drug name currently being typed
 * @param {Array}   patientMeds - Full medication list for the patient
 * @returns {{ activeMeds, duplicates, lastFill }}
 */
export function getActiveMedContext(medName, patientMeds = []) {
  const activeMeds = (patientMeds || []).filter(
    m => (m.status || '').toLowerCase() === 'active'
  );

  if (!medName || medName.length < 2) {
    return { activeMeds, duplicates: [], lastFill: null };
  }

  const base = medName.toLowerCase().split(' ')[0];

  // Potential duplicates: same root drug name
  const duplicates = activeMeds.filter(m => {
    const mBase = (m.name || '').toLowerCase().split(' ')[0];
    return mBase.includes(base) || base.includes(mBase);
  });

  // Latest fill among duplicates
  const lastFill = duplicates.reduce((latest, m) => {
    const d = m.lastFilled || m.startDate || '';
    return d > latest ? d : latest;
  }, '');

  return { activeMeds, duplicates, lastFill: lastFill || null };
}

// ─── BACKEND FIELD MAP ────────────────────────────────────────────────────────

/**
 * Map of backend DB column names → patient object keys (for reference).
 * Used when hydrating patient objects from the API response.
 *
 *   patients.default_pharmacy_id     → patient.preferredPharmacyId
 *   patients.last_used_pharmacy_id   → patient.lastUsedPharmacyId
 *   medications.is_active            → med.status === 'Active'
 *   medications.start_date           → med.startDate
 *   medications.end_date             → med.endDate
 *   medications.sig                  → med.sig
 *   providers.default_pharmacy_id    → provider.defaultPharmacyId
 */
export const RX_BACKEND_FIELD_MAP = {
  patient: {
    default_pharmacy_id:   'preferredPharmacyId',
    last_used_pharmacy_id: 'lastUsedPharmacyId',
  },
  medication: {
    is_active:  { field: 'status', transform: v => (v ? 'Active' : 'Inactive') },
    start_date: 'startDate',
    end_date:   'endDate',
    sig:        'sig',
  },
  provider: {
    default_pharmacy_id: 'defaultPharmacyId',
  },
};
