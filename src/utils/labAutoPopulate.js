/**
 * labAutoPopulate — Smart Lab Auto-Population
 *
 * Priority chain:
 *   1. patient.preferredLab           (explicitly saved)
 *   2. last-used lab from lab orders  (most recently ordered)
 *   3. nearest lab by patient ZIP     (async — NPI Registry via /lab-facilities/near/:zip)
 *   4. provider.defaultLab
 */

import { nearbyLabs } from '../services/api';

export function resolveLab(patient, provider, patientOrders = []) {
  // Priority 1: patient's saved preferred lab
  if (patient?.preferredLab) {
    return {
      name:        patient.preferredLab,
      address:     patient.preferredLabAddress || '',
      phone:       patient.preferredLabPhone   || '',
      cliaNumber:  patient.preferredLabClia    || '',
      source:      'patient_default',
      sourceLabel: "Auto-selected: patient's preferred lab",
    };
  }

  // Priority 2: most recently used lab from order history
  const lastUsed = [...(patientOrders || [])]
    .filter(o => (o.type === 'Lab' || o.type === 'lab') && (o.labFacility || o.labNetwork))
    .sort((a, b) => new Date(b.createdAt || b.date || '1970') - new Date(a.createdAt || a.date || '1970'))[0];

  if (lastUsed) {
    return {
      name:        lastUsed.labFacility || lastUsed.labNetwork || '',
      address:     lastUsed.labAddress  || '',
      phone:       '',
      cliaNumber:  '',
      source:      'last_used',
      sourceLabel: 'Auto-selected: last used lab',
    };
  }

  // Priority 4: provider default lab
  if (provider?.defaultLab) {
    return {
      name:        provider.defaultLab,
      address:     provider.defaultLabAddress || '',
      phone:       provider.defaultLabPhone   || '',
      cliaNumber:  '',
      source:      'provider_default',
      sourceLabel: "Auto-selected: provider's default lab",
    };
  }

  return null;
}

export async function resolveLabAsync(patient, provider, patientOrders = []) {
  const sync = resolveLab(patient, provider, patientOrders);
  if (sync) return sync;

  // Priority 3: nearest lab by patient ZIP
  const zip = patient?.address?.zip;
  if (zip && /^\d{5}$/.test(zip)) {
    try {
      const data = await nearbyLabs(zip);
      const nearest = (data.results || [])[0];
      if (nearest) {
        const addrParts = [nearest.address, nearest.city, nearest.state, nearest.zip].filter(Boolean);
        return {
          name:          nearest.name,
          address:       nearest.address  || '',
          city:          nearest.city     || '',
          state:         nearest.state    || '',
          zip:           nearest.zip      || '',
          phone:         nearest.phone    || '',
          fax:           nearest.fax      || '',
          npi:           nearest.npi      || '',
          cliaNumber:    nearest.cliaNumber || '',
          labType:       nearest.labType  || 'clinical',
          taxonomyCode:  nearest.taxonomyCode || '',
          distanceMiles: nearest.distanceMiles,
          source:        'nearest_zip',
          sourceLabel:   `Auto-selected: nearest lab (${nearest.distanceMiles} mi)`,
          fullAddress:   addrParts.join(', '),
        };
      }
    } catch { /* fail silently — manual search always available */ }
  }

  return null;
}
