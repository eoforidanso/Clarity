/**
 * Illinois Prescription Monitoring Program (IL PMP) — Mock Data Generator
 * Simulates queries to the ILPMP (ilpmp.hidinc.com) for controlled substance
 * prescribing and medication review workflows.
 */

const RISK_LEVELS = [
  { score: 115, level: 'Low',           color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
  { score: 250, level: 'Low-Moderate',  color: '#65a30d', bg: '#ecfccb', border: '#bef264' },
  { score: 390, level: 'Moderate',      color: '#d97706', bg: '#fef3c7', border: '#fcd34d' },
  { score: 540, level: 'Moderate-High', color: '#ea580c', bg: '#ffedd5', border: '#fdba74' },
  { score: 730, level: 'High',          color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
];

const MOCK_PRESCRIBERS = [
  { name: 'Dr. Chris Lee, MD',           dea: 'BL1234567' },
  { name: 'Dr. Sarah Kim, MD (PCP)',      dea: 'AK7654321' },
  { name: 'Dr. Ravi Patel, MD (PCP)',     dea: 'AP8899001' },
  { name: 'Dr. Monica Torres, MD (Pain)', dea: 'MT5566778' },
];

const MOCK_PHARMACIES = [
  'CVS Pharmacy #4821 — 233 S Wacker Dr, Chicago',
  'Walgreens #2233 — 30 W Chicago Ave, Chicago',
  'Rite Aid #0091 — 1400 N Lake Shore Dr, Chicago',
  'Jewel-Osco Pharmacy — 1224 S Wabash Ave, Chicago',
];

/**
 * Generate a deterministic but realistic IL PMP report for a patient + controlled med.
 * @param {object} patient  - Patient object from mockData
 * @param {string} medName  - Name of the controlled substance being queried
 * @param {string} schedule - DEA schedule, e.g. 'Schedule II'
 */
export function generateILPmpReport(patient, medName, schedule = 'Schedule II') {
  if (!patient) return null;

  const today = new Date('2026-04-30');
  const todayStr = '2026-04-30';
  const seed = (patient.id || 'p1').replace(/\D/g, '') | 0;
  const variation = seed % 5; // 0–4, controls risk profile

  // ── Build fill records (last 12 months) ──────────────────────────────
  const fills = [];

  // Always include the primary drug being checked
  const primaryPrescriber = MOCK_PRESCRIBERS[variation % MOCK_PRESCRIBERS.length];
  const primaryPharmacy   = MOCK_PHARMACIES[variation % MOCK_PHARMACIES.length];

  // Secondary co-prescribed controlled (if moderate+ risk)
  const hasSecondary = variation >= 2;
  const secondaryDrug      = variation >= 4 ? 'Zolpidem 10mg (Ambien)' : 'Alprazolam 0.5mg (Xanax)';
  const secondarySchedule  = 'Schedule IV';
  const secondaryPrescriber = MOCK_PRESCRIBERS[(variation + 1) % MOCK_PRESCRIBERS.length];
  const secondaryPharmacy   = MOCK_PHARMACIES[(variation + 2) % MOCK_PHARMACIES.length];

  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    const fillDate = new Date(today);
    fillDate.setMonth(fillDate.getMonth() - monthsAgo);
    const dateStr = fillDate.toISOString().split('T')[0];

    // Primary drug — skip ~1 month out of 12 for realism
    if (monthsAgo !== 7) {
      fills.push({
        date: dateStr,
        drug: medName,
        schedule: schedule || 'Schedule II',
        prescriber: primaryPrescriber.name,
        dea: primaryPrescriber.dea,
        pharmacy: primaryPharmacy,
        qty: schedule === 'Schedule II' ? 30 : 60,
        daysSupply: 30,
        refillNo: schedule === 'Schedule II' ? 0 : (11 - monthsAgo) % 6,
      });
    }

    // Secondary controlled med (moderate/high risk patients)
    if (hasSecondary && monthsAgo % 2 === 0) {
      fills.push({
        date: dateStr,
        drug: secondaryDrug,
        schedule: secondarySchedule,
        prescriber: secondaryPrescriber.name,
        dea: secondaryPrescriber.dea,
        pharmacy: secondaryPharmacy,
        qty: 60,
        daysSupply: 30,
        refillNo: (11 - monthsAgo) % 5,
      });
    }
  }

  fills.sort((a, b) => b.date.localeCompare(a.date));

  // ── Compute 90-day / 365-day stats ───────────────────────────────────
  const cutoff90 = new Date(today);
  cutoff90.setDate(cutoff90.getDate() - 90);

  const last90 = fills.filter(f => new Date(f.date) >= cutoff90);

  const prescribers90 = [...new Set(last90.map(f => f.prescriber))].length;
  const pharmacies90  = [...new Set(last90.map(f => f.pharmacy))].length;

  // ── Alerts ────────────────────────────────────────────────────────────
  const alerts = [];
  if (prescribers90 > 1) {
    alerts.push({
      severity: 'warning',
      text: `${prescribers90} prescribers for controlled substances in the last 90 days`,
    });
  }
  if (pharmacies90 > 1) {
    alerts.push({
      severity: 'warning',
      text: `${pharmacies90} pharmacies used for controlled substance fills in the last 90 days`,
    });
  }
  if (variation >= 3) {
    alerts.push({
      severity: 'danger',
      text: 'Early refill pattern detected — ≥2 fills within 20 days of prior supply',
    });
  }
  if (variation >= 4) {
    alerts.push({
      severity: 'danger',
      text: `Overlapping controlled prescriptions detected (${secondarySchedule})`,
    });
  }

  return {
    queryId:   `IL-PMP-${(seed * 1337 + 9999).toString(16).toUpperCase().slice(0, 8)}`,
    queryDate: todayStr,
    queryTime: '10:23 AM',
    patient: {
      name:    `${patient.firstName} ${patient.lastName}`,
      dob:     patient.dob || 'Unknown',
      address: patient.address?.street
        ? `${patient.address.street}, ${patient.address.city}, IL`
        : 'Chicago, IL',
    },
    risk:       RISK_LEVELS[variation],
    alerts,
    stats: {
      prescribers90,
      pharmacies90,
      fills365:  fills.length,
      fills90:   last90.length,
    },
    fills,
  };
}
