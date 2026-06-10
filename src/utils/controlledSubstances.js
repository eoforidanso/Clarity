/**
 * Shared controlled-substance schedule detection.
 * Imported by both Encounters.jsx (prescribing) and ChartPage.jsx (order group).
 * Never bypass this check — DEA 21 CFR §1311 compliance.
 */

export const CS_SCHEDULE_MAP = [
  { schedule: 'CII', patterns: [
    'adderall', 'vyvanse', 'dexedrine', 'dextroamphetamine', 'evekeo', 'mydayis', 'azstarys',
    'serdexmethylphenidate', 'amphetamine', 'methylphenidate', 'ritalin', 'concerta',
    'daytrana', 'focalin', 'jornay', 'metadate',
    'oxycodone', 'oxycontin', 'percocet', 'roxicodone',
    'hydrocodone', 'vicodin', 'norco', 'morphine', 'ms contin', 'msir',
    'hydromorphone', 'dilaudid', 'fentanyl', 'duragesic',
    'tapentadol', 'nucynta', 'meperidine', 'demerol',
    'methadone (dolophine',
  ]},
  { schedule: 'CIII', patterns: [
    'buprenorphine', 'suboxone', 'subutex', 'sublocade', 'probuphine', 'butrans',
    'testosterone cypionate', 'testosterone gel', 'testosterone patch',
    'androgel', 'androderm', 'depo-testosterone',
  ]},
  { schedule: 'CIII/CIV', patterns: ['codeine/acetaminophen', 'tylenol #3'] },
  { schedule: 'CIV', patterns: [
    'lorazepam', 'ativan', 'clonazepam', 'klonopin', 'diazepam', 'valium',
    'alprazolam', 'xanax', 'oxazepam', 'serax', 'temazepam', 'restoril',
    'triazolam', 'halcion', 'flurazepam', 'dalmane', 'estazolam', 'quazepam',
    'chlordiazepoxide', 'librium', 'clorazepate', 'tranxene', 'midazolam', 'versed',
    'zolpidem', 'ambien', 'eszopiclone', 'lunesta', 'zaleplon', 'sonata',
    'tramadol', 'ultram', 'modafinil', 'provigil', 'armodafinil', 'nuvigil',
    'pregabalin', 'lyrica', 'carisoprodol', 'soma',
    'suvorexant', 'belsomra', 'lemborexant', 'dayvigo',
  ]},
];

/**
 * Returns the DEA schedule string for a controlled substance name,
 * or null if the drug is not controlled.
 * @param {string} medName
 * @returns {'CII'|'CIII'|'CIII/CIV'|'CIV'|null}
 */
export function getControlledSchedule(medName) {
  if (!medName) return null;
  const lower = medName.toLowerCase();
  for (const { schedule, patterns } of CS_SCHEDULE_MAP) {
    if (patterns.some(p => lower.includes(p))) return schedule;
  }
  return null;
}
