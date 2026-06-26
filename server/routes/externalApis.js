import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { AnyResponseSchema } from '../schemas/responseSchemas.js';

const router = Router();
router.use(validateResponse(AnyResponseSchema));

// ── NPPES Pharmacy Search (CMS — free, no key, proxied for CORS) ─────────────
// Public route — no auth needed (NPPES is a public registry)
// Docs: https://npiregistry.cms.hhs.gov/api-page
// Taxonomy codes: 3336C0003X=Pharmacy  3336C0002X=Clinic  3336C0004X=Compounding  3336M0002X=Mail Order

// Taxonomy code → pharmacy subtype
// 333600000X  = Pharmacy (generic catch-all)
// 3336C0003X  = Community/Retail Pharmacy
// 3336C0002X  = Clinic Pharmacy
// 3336C0004X  = Compounding Pharmacy
// 3336M0002X  = Mail Order Pharmacy
const TAXONOMY_TYPE = {
  '333600000X': 'retail',
  '3336C0003X': 'retail',
  '3336C0002X': 'clinic',
  '3336C0004X': 'compounding',
  '3336M0002X': 'mail',
};
const PHARMACY_CODES = new Set(Object.keys(TAXONOMY_TYPE));

// Subtype codes exposed to the frontend filter
const SUBTYPE_CODES = {
  '3336C0003X': 'retail',
  '3336C0002X': 'clinic',
  '3336C0004X': 'compounding',
  '3336M0002X': 'mail',
};

function titleCase(s) {
  return s ? String(s).toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : '';
}

function npiToRecord(r) {
  const addr = r.addresses?.find(a => a.address_purpose === 'LOCATION') || r.addresses?.[0] || {};
  const dbaName = r.other_names?.find(n => n.code === '3')?.organization_name;
  const displayName = dbaName || r.basic?.organization_name || '';
  if (!displayName) return null;

  const taxList = r.taxonomies || [];
  // Use the primary taxonomy first; fall back to any pharmacy code present
  const primaryTax = taxList.find(t => t.primary && PHARMACY_CODES.has(t.code))
    || taxList.find(t => PHARMACY_CODES.has(t.code));
  if (!primaryTax) return null; // not a pharmacy NPI

  return {
    id:           `npi-${r.number}`,
    npi:          r.number,
    name:         titleCase(displayName),
    address:      titleCase([addr.address_1, addr.address_2].filter(Boolean).join(' ')),
    city:         titleCase(addr.city || ''),
    state:        (addr.state || '').toUpperCase(),
    zip:          (addr.postal_code || '').slice(0, 5),
    phone:        addr.telephone_number || '',
    fax:          addr.fax_number || '',
    pharmacyType: TAXONOMY_TYPE[primaryTax.code] || 'retail',
    taxonomyCode: primaryTax.code,
  };
}

async function nppesQuery(params) {
  const p = { version: '2.1', enumeration_type: 'NPI-2', limit: '200', taxonomy_description: 'Pharmacy', ...params };
  const url = `https://npiregistry.cms.hhs.gov/api/?${new URLSearchParams(p)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) return [];
  const data = await r.json();
  return Array.isArray(data.results) ? data.results : [];
}

router.get('/nppes/pharmacies', async (req, res) => { try {
    const { search, city, state, skip, subtype } = req.query;
    const raw       = String(search || '').trim();
    const cityRaw   = String(city   || '').trim();
    const stateCode = state ? String(state).trim().toUpperCase().slice(0, 2) : '';
    const skipN     = Math.min(Math.max(parseInt(skip, 10) || 0, 0), 1000);

    // Subtype filter — optional comma-separated taxonomy codes from the frontend
    const subtypeFilter = subtype
      ? new Set(String(subtype).split(',').map(s => s.trim()).filter(s => SUBTYPE_CODES[s]).map(s => SUBTYPE_CODES[s]))
      : null;

    if (!raw && !cityRaw && !stateCode) return res.json({ results: [], total: 0 });
    if (raw.length === 1 && !cityRaw && !stateCode) return res.json({ results: [], total: 0 });

    const base = { skip: String(skipN) };
    if (stateCode) base.state = stateCode;
    if (cityRaw)   base.city  = cityRaw;

    const digits = raw.replace(/\D/g, '');
    const queries = [];

    if (digits.length === 10) {
      // Exact NPI lookup
      queries.push({ ...base, number: digits });
    } else if (digits.length === 5) {
      queries.push({ ...base, postal_code: digits });
    } else if (digits.length >= 3) {
      queries.push({ ...base, postal_code: digits + '*' });
    } else if (raw) {
      // Name search with wildcard
      queries.push({ ...base, organization_name: raw + '*' });
      // Also try the term as a city when no city param provided
      if (!cityRaw) queries.push({ ...base, city: raw });
    } else {
      // City/state only
      queries.push({ ...base });
    }

    const rawBatches = await Promise.all(queries.map(q => nppesQuery(q).catch(() => [])));

    const seen = new Set();
    const records = [];
    for (const batch of rawBatches) {
      for (const r of batch) {
        if (seen.has(r.number)) continue;
        seen.add(r.number);
        const rec = npiToRecord(r);
        if (!rec || !rec.address || !rec.city) continue;
        if (subtypeFilter && !subtypeFilter.has(rec.pharmacyType)) continue;
        records.push(rec);
      }
    }

    res.json({ results: records.slice(0, 200), total: records.length, skip: skipN, hasMore: records.length >= 200 });
  } catch (err) {
    console.error('[NPPES] pharmacy search error:', err.message);
    res.status(502).json({ error: 'NPPES API unavailable' });
  }
});

// ── NPPES Lab Facility Search (CMS — free, no key, proxied for CORS) ─────────
// Public route — no auth needed
// Taxonomy codes: 291U00000X=Clinical Medical Lab  261QH0100X=Hospital Lab  261QR0200X=Radiology
const LAB_TAXONOMY_TYPE = {
  '291U00000X': 'clinical',
  '291900000X': 'military',
  '261QH0100X': 'hospital',
  '261QR0200X': 'radiology',
  '269900000X': 'clinical',
};
const LAB_CODES = new Set(Object.keys(LAB_TAXONOMY_TYPE));

function npiToLabRecord(r) {
  const addr = r.addresses?.find(a => a.address_purpose === 'LOCATION') || r.addresses?.[0] || {};
  const dbaName = r.other_names?.find(n => n.code === '3')?.organization_name;
  const displayName = dbaName || r.basic?.organization_name || '';
  if (!displayName) return null;

  const taxList = r.taxonomies || [];
  const primaryTax = taxList.find(t => t.primary && LAB_CODES.has(t.code))
    || taxList.find(t => LAB_CODES.has(t.code));
  if (!primaryTax) return null;

  return {
    id:           `npi-${r.number}`,
    npi:          r.number,
    name:         titleCase(displayName),
    address:      titleCase([addr.address_1, addr.address_2].filter(Boolean).join(' ')),
    city:         titleCase(addr.city || ''),
    state:        (addr.state || '').toUpperCase(),
    zip:          (addr.postal_code || '').slice(0, 5),
    phone:        addr.telephone_number || '',
    fax:          addr.fax_number || '',
    labType:      LAB_TAXONOMY_TYPE[primaryTax.code] || 'clinical',
    taxonomyCode: primaryTax.code,
    cliaNumber:   '',
  };
}

async function nppesLabQuery(params) {
  const p = { version: '2.1', enumeration_type: 'NPI-2', limit: '200', taxonomy_description: 'Laboratory', ...params };
  const url = `https://npiregistry.cms.hhs.gov/api/?${new URLSearchParams(p)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) return [];
  const data = await r.json();
  return Array.isArray(data.results) ? data.results : [];
}

router.get('/nppes/labs', async (req, res) => { try {
    const { search, city, state, skip } = req.query;
    const raw       = String(search || '').trim();
    const cityRaw   = String(city   || '').trim();
    const stateCode = state ? String(state).trim().toUpperCase().slice(0, 2) : '';
    const skipN     = Math.min(Math.max(parseInt(skip, 10) || 0, 0), 1000);

    if (!raw && !cityRaw && !stateCode) return res.json({ results: [], total: 0 });
    if (raw.length === 1 && !cityRaw && !stateCode) return res.json({ results: [], total: 0 });

    const base = { skip: String(skipN) };
    if (stateCode) base.state = stateCode;
    if (cityRaw)   base.city  = cityRaw;

    const digits = raw.replace(/\D/g, '');
    const queries = [];

    if (digits.length === 10) {
      queries.push({ ...base, number: digits });
    } else if (digits.length === 5) {
      queries.push({ ...base, postal_code: digits });
    } else if (digits.length >= 3) {
      queries.push({ ...base, postal_code: digits + '*' });
    } else if (raw) {
      queries.push({ ...base, organization_name: raw + '*' });
      if (!cityRaw) queries.push({ ...base, city: raw });
    } else {
      queries.push({ ...base });
    }

    const rawBatches = await Promise.all(queries.map(q => nppesLabQuery(q).catch(() => [])));

    const seen = new Set();
    const records = [];
    for (const batch of rawBatches) {
      for (const r of batch) {
        if (seen.has(r.number)) continue;
        seen.add(r.number);
        const rec = npiToLabRecord(r);
        if (!rec || !rec.address || !rec.city) continue;
        records.push(rec);
      }
    }

    res.json({ results: records.slice(0, 200), total: records.length, skip: skipN, hasMore: records.length >= 200 });
  } catch (err) {
    console.error('[NPPES] lab search error:', err.message);
    res.status(502).json({ error: 'NPPES API unavailable' });
  }
});

// All routes below require a valid JWT
router.use(authenticate);

// ── RxNorm Drug Search (NLM — free, no API key) ──────────────────────────────
// Docs: https://rxnav.nlm.nih.gov/REST
router.get('/rxnorm/drugs', async (req, res) => { try {
    const { search } = req.query;
    if (!search || search.length < 2) return res.json([]);

    // Use the approximate-match endpoint for fuzzy search
    const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${ encodeURIComponent(search) }&maxEntries=20`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`RxNorm API error: ${ response.status }`);

    const data = await response.json();
    const candidates = data?.approximateGroup?.candidate || [];

    // Get details for each RXCUI
    const results = [];
    const seen = new Set();

    for (const c of candidates.slice(0, 15)) { const rxcui = c.rxcui;
      if (!rxcui || seen.has(rxcui)) continue;
      seen.add(rxcui);

      try {
        const detailRes = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui }/properties.json`);
        if (!detailRes.ok) continue;
        const detailData = await detailRes.json();
        const props = detailData?.properties;
        if (!props) continue;

        results.push({ rxcui: props.rxcui, name: props.name, synonym: props.synonym || '', tty: props.tty }); // term type (SBD=branded, SCD=clinical drug, etc.)
      } catch { /* skip individual failures */ }
    }

    res.json(results);
  } catch (err) { console.error('RxNorm search error:', err.message);
    res.status(502).json({ error: 'RxNorm API unavailable', fallback: true });
  }
});

// ── RxNorm Drug Strengths for a specific drug ─────────────────────────────────
router.get('/rxnorm/strengths/:rxcui', async (req, res) => { try {
    const { rxcui } = req.params;
    const url = `https://rxnav.nlm.nih.gov/REST/rxcui/${ rxcui }/related.json?tty=SCD+SBD`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`RxNorm strengths error: ${ response.status }`);

    const data = await response.json();
    const groups = data?.relatedGroup?.conceptGroup || [];
    const results = [];

    for (const group of groups) { for (const prop of (group.conceptProperties || [])) {
        results.push({
          rxcui: prop.rxcui, name: prop.name, tty: prop.tty,  });
      }
    }

    res.json(results);
  } catch (err) { console.error('RxNorm strengths error:', err.message);
    res.status(502).json({ error: 'RxNorm API unavailable' });
  }
});

// ── RxNorm Drug-Drug Interactions ─────────────────────────────────────────────
router.get('/rxnorm/interactions', async (req, res) => { try {
    const { rxcuis } = req.query; // comma-separated rxcui list
    if (!rxcuis) return res.json({ interactions: [] });

    const url = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${ encodeURIComponent(rxcuis) }`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Interaction API error: ${ response.status }`);

    const data = await response.json();
    const pairs = data?.fullInteractionTypeGroup || [];
    const interactions = [];

    for (const group of pairs) { for (const type of (group.fullInteractionType || [])) {
        for (const pair of (type.interactionPair || [])) {
          interactions.push({
            severity: pair.severity || 'N/A', description: pair.description, drugs: (pair.interactionConcept || []).map(c => ({
              rxcui: c.minConceptItem?.rxcui, name: c.minConceptItem?.name,  })),
          });
        }
      }
    }

    res.json({ interactions });
  } catch (err) { console.error('Interaction check error:', err.message);
    res.status(502).json({ error: 'Interaction API unavailable', interactions: [] });
  }
});

// ── NLM ICD-10 Diagnosis Code Search (free, no API key) ──────────────────────
// Docs: https://clinicaltables.nlm.nih.gov/apidoc/icd10cm/v3/doc.html
router.get('/icd10/search', async (req, res) => { try {
    const { search } = req.query;
    if (!search || search.length < 2) return res.json([]);

    const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${ encodeURIComponent(search) }&maxList=25`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`ICD-10 API error: ${ response.status }`);

    const data = await response.json();
    // Response format: [total, codes[], {}, [code, description][]]
    const codesList = data[1] || [];
    const displayList = data[3] || [];

    const results = codesList.map((code, i) => ({ code, description: displayList[i]?.[1] || displayList[i] || '',  }));

    res.json(results);
  } catch (err) { console.error('ICD-10 search error:', err.message);
    res.status(502).json({ error: 'ICD-10 API unavailable', fallback: true });
  }
});

// ── OpenFDA Drug Labels / Adverse Events (free, no API key) ──────────────────
router.get('/openfda/drug-label', async (req, res) => { try {
    const { search } = req.query;
    if (!search || search.length < 2) return res.json([]);

    const url = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${ encodeURIComponent(search) }"+openfda.generic_name:"${ encodeURIComponent(search) }"&limit=5`;
    const response = await fetch(url);
    if (!response.ok) { if (response.status === 404) return res.json([]);
      throw new Error(`OpenFDA error: ${response.status }`);
    }

    const data = await response.json();
    const results = (data.results || []).map(r => ({
      brandName: r.openfda?.brand_name?.[0] || '',
      genericName: r.openfda?.generic_name?.[0] || '',
      manufacturer: r.openfda?.manufacturer_name?.[0] || '',
      route: r.openfda?.route?.[0] || '',
      warnings: (r.warnings || []).slice(0, 1),
      boxedWarning: (r.boxed_warning || []).slice(0, 1),
      contraindications: (r.contraindications || []).slice(0, 3),
      drugInteractions: (r.drug_interactions || []).slice(0, 5),
    }));

    res.json(results);
  } catch (err) { console.error('OpenFDA search error:', err.message);
    res.status(502).json({ error: 'OpenFDA API unavailable' });
  }
});

export default router;
