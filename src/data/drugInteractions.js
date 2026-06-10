/**
 * Drug Interaction Database — Psychiatry-focused
 * Covers the most clinically significant interactions for psychiatric medications.
 * Severity: 'contraindicated' | 'major' | 'moderate' | 'minor'
 */

// Each entry: { drugs: [pattern1, pattern2], severity, mechanism, effect, action }
// pattern matching: drug name .toLowerCase().includes(pattern)

export const DRUG_INTERACTIONS = [
  // ── CONTRAINDICATED ────────────────────────────────────────────────────────
  {
    drugs: ['maoi', 'phenelzine', 'tranylcypromine', 'selegiline', 'isocarboxazid', 'rasagiline'],
    withAny: ['ssri', 'sertraline', 'fluoxetine', 'paroxetine', 'escitalopram', 'citalopram', 'fluvoxamine',
              'snri', 'venlafaxine', 'duloxetine', 'desvenlafaxine', 'bupropion', 'tramadol', 'meperidine', 'demerol',
              'triptans', 'sumatriptan', 'linezolid'],
    severity: 'contraindicated',
    mechanism: 'Serotonin syndrome / hypertensive crisis',
    effect: 'Potentially fatal hyperthermia, seizures, autonomic instability',
    action: 'Do NOT co-prescribe. Allow 14-day washout (5 weeks for fluoxetine).',
  },
  {
    drugs: ['clozapine', 'clozaril', 'fazaclo'],
    withAny: ['carbamazepine', 'tegretol', 'oxcarbazepine', 'trileptal'],
    severity: 'contraindicated',
    mechanism: 'Additive bone-marrow suppression',
    effect: 'Severe agranulocytosis — life-threatening',
    action: 'Absolutely contraindicated. Use alternative anticonvulsant.',
  },
  {
    drugs: ['linezolid', 'zyvox'],
    withAny: ['ssri', 'sertraline', 'fluoxetine', 'paroxetine', 'escitalopram', 'citalopram',
              'snri', 'venlafaxine', 'duloxetine', 'tramadol', 'meperidine'],
    severity: 'contraindicated',
    mechanism: 'Linezolid is a weak MAOI — serotonin syndrome risk',
    effect: 'Serotonin syndrome',
    action: 'Contraindicated. Consult Infectious Disease for alternative antibiotic.',
  },

  // ── MAJOR ──────────────────────────────────────────────────────────────────
  {
    drugs: ['clozapine', 'clozaril'],
    withAny: ['benzodiazepine', 'lorazepam', 'ativan', 'diazepam', 'valium',
              'clonazepam', 'klonopin', 'alprazolam', 'xanax'],
    severity: 'major',
    mechanism: 'Additive CNS and respiratory depression',
    effect: 'Respiratory arrest, severe hypotension, sedation',
    action: 'Use with extreme caution or avoid. If co-prescribed, monitor respiratory status closely.',
  },
  {
    drugs: ['ssri', 'sertraline', 'fluoxetine', 'paroxetine', 'escitalopram', 'citalopram', 'fluvoxamine'],
    withAny: ['tramadol', 'ultram'],
    severity: 'major',
    mechanism: 'Serotonin syndrome + tramadol lowers seizure threshold',
    effect: 'Serotonin syndrome, seizures',
    action: 'Avoid combination. Consider alternative analgesic.',
  },
  {
    drugs: ['lithium'],
    withAny: ['nsaid', 'ibuprofen', 'naproxen', 'indomethacin', 'diclofenac', 'celecoxib',
              'ace inhibitor', 'lisinopril', 'enalapril', 'ramipril', 'captopril',
              'arb', 'losartan', 'valsartan', 'irbesartan'],
    severity: 'major',
    mechanism: 'Reduced renal lithium clearance',
    effect: 'Lithium toxicity — tremor, ataxia, confusion, renal failure',
    action: 'Monitor lithium levels closely. Consider dose reduction or alternative pain/BP medication.',
  },
  {
    drugs: ['haloperidol', 'haldol'],
    withAny: ['lithium'],
    severity: 'major',
    mechanism: 'Neurotoxicity synergy',
    effect: 'Encephalopathy, extrapyramidal symptoms, neuroleptic malignant syndrome',
    action: 'Use with caution. Monitor for NMS signs. Keep lithium in therapeutic range.',
  },
  {
    drugs: ['quetiapine', 'seroquel', 'olanzapine', 'zyprexa', 'clozapine', 'clozaril',
            'ziprasidone', 'geodon', 'haloperidol', 'haldol', 'thioridazine'],
    withAny: ['azithromycin', 'clarithromycin', 'erythromycin', 'ciprofloxacin', 'levofloxacin',
              'metronidazole', 'amiodarone', 'sotalol', 'ondansetron'],
    severity: 'major',
    mechanism: 'QTc prolongation — additive',
    effect: 'Torsades de pointes, potentially fatal arrhythmia',
    action: 'Obtain ECG. Avoid if QTc > 500ms. Monitor QTc during co-therapy.',
  },
  {
    drugs: ['bupropion', 'wellbutrin'],
    withAny: ['tramadol', 'ultram', 'theophylline', 'systemic steroid', 'isoniazid'],
    severity: 'major',
    mechanism: 'Lowered seizure threshold',
    effect: 'Seizures',
    action: 'Avoid. Consider alternative antidepressant in patients on seizure-risk medications.',
  },
  {
    drugs: ['valproate', 'depakote', 'depakene', 'divalproex'],
    withAny: ['lamotrigine', 'lamictal'],
    severity: 'major',
    mechanism: 'Valproate inhibits lamotrigine glucuronidation (UGT)',
    effect: 'Lamotrigine toxicity — diplopia, ataxia, rash, SJS risk if dose not halved',
    action: 'Halve lamotrigine starting dose and titration when adding valproate. Monitor levels.',
  },
  {
    drugs: ['fluoxetine', 'prozac', 'paroxetine', 'paxil'],
    withAny: ['tamoxifen'],
    severity: 'major',
    mechanism: 'CYP2D6 inhibition reduces tamoxifen to active metabolite (endoxifen)',
    effect: 'Reduced breast-cancer protection from tamoxifen',
    action: 'Switch to sertraline, citalopram, or venlafaxine (weaker CYP2D6 inhibitors).',
  },

  // ── MODERATE ───────────────────────────────────────────────────────────────
  {
    drugs: ['ssri', 'sertraline', 'fluoxetine', 'paroxetine', 'escitalopram', 'citalopram'],
    withAny: ['lithium'],
    severity: 'moderate',
    mechanism: 'Pharmacodynamic serotonin potentiation',
    effect: 'Serotonin syndrome (mild-moderate), tremor, diarrhea',
    action: 'Monitor for serotonin syndrome symptoms. Start low, titrate slowly.',
  },
  {
    drugs: ['fluoxetine', 'prozac', 'paroxetine', 'paxil', 'bupropion', 'wellbutrin'],
    withAny: ['aripiprazole', 'abilify', 'risperidone', 'risperdal', 'haloperidol',
              'atomoxetine', 'strattera', 'codeine', 'oxycodone', 'hydrocodone'],
    severity: 'moderate',
    mechanism: 'CYP2D6 inhibition increases levels of co-medication',
    effect: 'Elevated antipsychotic / opioid / atomoxetine levels → increased adverse effects',
    action: 'Reduce dose of affected medication. Monitor for adverse effects.',
  },
  {
    drugs: ['carbamazepine', 'tegretol'],
    withAny: ['olanzapine', 'zyprexa', 'haloperidol', 'haldol', 'aripiprazole', 'abilify',
              'lamotrigine', 'lamictal', 'valproate', 'depakote', 'clonazepam',
              'sertraline', 'fluoxetine', 'bupropion', 'mirtazapine'],
    severity: 'moderate',
    mechanism: 'CYP3A4 / CYP1A2 induction reduces plasma levels',
    effect: 'Subtherapeutic levels of co-medications — loss of efficacy',
    action: 'Monitor drug levels. May need 30–50% dose increase of affected medication.',
  },
  {
    drugs: ['fluvoxamine', 'luvox'],
    withAny: ['clozapine', 'clozaril', 'olanzapine', 'zyprexa', 'theophylline', 'tizanidine', 'warfarin'],
    severity: 'moderate',
    mechanism: 'CYP1A2 inhibition markedly increases levels',
    effect: 'Clozapine/olanzapine toxicity, theophylline toxicity, bleeding risk',
    action: 'Reduce clozapine/olanzapine dose by ~30%. Monitor levels.',
  },
  {
    drugs: ['aripiprazole', 'abilify', 'brexpiprazole', 'rexulti'],
    withAny: ['fluoxetine', 'prozac', 'paroxetine', 'paxil', 'bupropion', 'wellbutrin',
              'ketoconazole', 'itraconazole', 'clarithromycin'],
    severity: 'moderate',
    mechanism: 'CYP2D6 / CYP3A4 inhibition increases aripiprazole levels',
    effect: 'Akathisia, sedation, metabolic effects at elevated concentrations',
    action: 'Reduce aripiprazole dose by 50% when adding strong CYP2D6/3A4 inhibitor.',
  },
  {
    drugs: ['lithium'],
    withAny: ['ssri', 'sertraline', 'fluoxetine', 'venlafaxine', 'effexor'],
    severity: 'moderate',
    mechanism: 'Additive serotonergic effect',
    effect: 'Serotonin syndrome symptoms',
    action: 'Monitor. Start low. Avoid doses at upper end of ranges.',
  },
  {
    drugs: ['mirtazapine', 'remeron'],
    withAny: ['clonazepam', 'klonopin', 'diazepam', 'valium', 'lorazepam', 'ativan', 'alprazolam',
              'zolpidem', 'ambien', 'eszopiclone', 'lunesta', 'zaleplon'],
    severity: 'moderate',
    mechanism: 'Additive CNS depression',
    effect: 'Excessive sedation, psychomotor impairment, respiratory depression',
    action: 'Counsel patient. Avoid driving. Consider lower doses.',
  },
  {
    drugs: ['buspirone', 'buspar'],
    withAny: ['maoi', 'phenelzine', 'tranylcypromine', 'selegiline'],
    severity: 'moderate',
    mechanism: 'Serotonergic + hypertensive crisis risk',
    effect: 'Hypertensive crisis, serotonin syndrome',
    action: 'Avoid. Wait ≥14 days after MAOI discontinuation.',
  },
];

/**
 * Check patient's current meds + new order against the interaction database.
 * @param {string[]} currentMedNames - array of current medication names
 * @param {string}   newMedName      - the drug being ordered
 * @returns {Array<{severity, mechanism, effect, action, pairLabel}>}
 */
export function checkInteractions(currentMedNames, newMedName) {
  if (!newMedName || !currentMedNames?.length) return [];

  const newLow = newMedName.toLowerCase();
  const results = [];

  for (const rule of DRUG_INTERACTIONS) {
    const newMatchesDrugs   = rule.drugs.some(p => newLow.includes(p));
    const newMatchesWithAny = rule.withAny.some(p => newLow.includes(p));

    for (const existing of currentMedNames) {
      const exLow = existing.toLowerCase();
      const exMatchesDrugs   = rule.drugs.some(p => exLow.includes(p));
      const exMatchesWithAny = rule.withAny.some(p => exLow.includes(p));

      // Interaction fires if new med is in drugs[] and existing is in withAny[], or vice-versa
      const hit =
        (newMatchesDrugs   && exMatchesWithAny) ||
        (newMatchesWithAny && exMatchesDrugs);

      if (hit) {
        results.push({
          ...rule,
          pairLabel: `${newMedName} ↔ ${existing}`,
          existingMed: existing,
        });
        break; // one match per rule is enough
      }
    }
  }

  // Deduplicate by rule mechanism (same interaction may trigger on multiple med aliases)
  const seen = new Set();
  return results.filter(r => {
    const key = r.mechanism + r.existingMed;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
