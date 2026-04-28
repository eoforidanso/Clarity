import { Router } from 'express';

const router = Router();
// No auth required — these proxy to free public NIH/NLM/FDA APIs

// ── RxNorm Drug Search (NLM — free, no API key) ──────────────────────────────
// Docs: https://rxnav.nlm.nih.gov/REST
router.get('/rxnorm/drugs', async (req, res) => {
  try {
    const { search } = req.query;
    if (!search || search.length < 2) return res.json([]);

    // Use the approximate-match endpoint for fuzzy search
    const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(search)}&maxEntries=20`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`RxNorm API error: ${response.status}`);

    const data = await response.json();
    const candidates = data?.approximateGroup?.candidate || [];

    // Get details for each RXCUI
    const results = [];
    const seen = new Set();

    for (const c of candidates.slice(0, 15)) {
      const rxcui = c.rxcui;
      if (!rxcui || seen.has(rxcui)) continue;
      seen.add(rxcui);

      try {
        const detailRes = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/properties.json`);
        if (!detailRes.ok) continue;
        const detailData = await detailRes.json();
        const props = detailData?.properties;
        if (!props) continue;

        results.push({
          rxcui: props.rxcui,
          name: props.name,
          synonym: props.synonym || '',
          tty: props.tty,  // term type (SBD=branded, SCD=clinical drug, etc.)
        });
      } catch { /* skip individual failures */ }
    }

    res.json(results);
  } catch (err) {
    console.error('RxNorm search error:', err.message);
    res.status(502).json({ error: 'RxNorm API unavailable', fallback: true });
  }
});

// ── RxNorm Drug Strengths for a specific drug ─────────────────────────────────
router.get('/rxnorm/strengths/:rxcui', async (req, res) => {
  try {
    const { rxcui } = req.params;
    const url = `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/related.json?tty=SCD+SBD`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`RxNorm strengths error: ${response.status}`);

    const data = await response.json();
    const groups = data?.relatedGroup?.conceptGroup || [];
    const results = [];

    for (const group of groups) {
      for (const prop of (group.conceptProperties || [])) {
        results.push({
          rxcui: prop.rxcui,
          name: prop.name,
          tty: prop.tty,
        });
      }
    }

    res.json(results);
  } catch (err) {
    console.error('RxNorm strengths error:', err.message);
    res.status(502).json({ error: 'RxNorm API unavailable' });
  }
});

// ── RxNorm Drug-Drug Interactions ─────────────────────────────────────────────
router.get('/rxnorm/interactions', async (req, res) => {
  try {
    const { rxcuis } = req.query; // comma-separated rxcui list
    if (!rxcuis) return res.json({ interactions: [] });

    const url = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${encodeURIComponent(rxcuis)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Interaction API error: ${response.status}`);

    const data = await response.json();
    const pairs = data?.fullInteractionTypeGroup || [];
    const interactions = [];

    for (const group of pairs) {
      for (const type of (group.fullInteractionType || [])) {
        for (const pair of (type.interactionPair || [])) {
          interactions.push({
            severity: pair.severity || 'N/A',
            description: pair.description,
            drugs: (pair.interactionConcept || []).map(c => ({
              rxcui: c.minConceptItem?.rxcui,
              name: c.minConceptItem?.name,
            })),
          });
        }
      }
    }

    res.json({ interactions });
  } catch (err) {
    console.error('Interaction check error:', err.message);
    res.status(502).json({ error: 'Interaction API unavailable', interactions: [] });
  }
});

// ── NLM ICD-10 Diagnosis Code Search (free, no API key) ──────────────────────
// Docs: https://clinicaltables.nlm.nih.gov/apidoc/icd10cm/v3/doc.html
router.get('/icd10/search', async (req, res) => {
  try {
    const { search } = req.query;
    if (!search || search.length < 2) return res.json([]);

    const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(search)}&maxList=25`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`ICD-10 API error: ${response.status}`);

    const data = await response.json();
    // Response format: [total, codes[], {}, [code, description][]]
    const codesList = data[1] || [];
    const displayList = data[3] || [];

    const results = codesList.map((code, i) => ({
      code,
      description: displayList[i]?.[1] || displayList[i] || '',
    }));

    res.json(results);
  } catch (err) {
    console.error('ICD-10 search error:', err.message);
    res.status(502).json({ error: 'ICD-10 API unavailable', fallback: true });
  }
});

// ── OpenFDA Drug Labels / Adverse Events (free, no API key) ──────────────────
router.get('/openfda/drug-label', async (req, res) => {
  try {
    const { search } = req.query;
    if (!search || search.length < 2) return res.json([]);

    const url = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(search)}"+openfda.generic_name:"${encodeURIComponent(search)}"&limit=5`;
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) return res.json([]);
      throw new Error(`OpenFDA error: ${response.status}`);
    }

    const data = await response.json();
    const results = (data.results || []).map(r => ({
      brandName: r.openfda?.brand_name?.[0] || '',
      genericName: r.openfda?.generic_name?.[0] || '',
      manufacturer: r.openfda?.manufacturer_name?.[0] || '',
      route: r.openfda?.route?.[0] || '',
      warnings: (r.warnings || []).slice(0, 1),
      boxedWarning: (r.boxed_warning || []).slice(0, 1),
      contraindications: (r.contraindications || []).slice(0, 1),
      drugInteractions: (r.drug_interactions || []).slice(0, 1),
    }));

    res.json(results);
  } catch (err) {
    console.error('OpenFDA search error:', err.message);
    res.status(502).json({ error: 'OpenFDA API unavailable' });
  }
});

export default router;
