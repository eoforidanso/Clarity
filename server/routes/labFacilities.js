/**
 * Lab Facility Directory Routes  (/api/lab-facilities)
 *
 * lab_facilities is the primary store (geocoded, CLIA-mapped).
 * NPPES is the live back-fill source when local results are sparse.
 *
 * Taxonomy codes for labs (NUCC):
 *   291U00000X  Clinical Medical Laboratory   (Quest, LabCorp, hospital labs)
 *   291900000X  Military Clinical Medical Laboratory
 *   261QH0100X  Hospital-Based Outpatient Lab
 *   261QR0200X  Radiology Lab
 *   269900000X  Clinical Laboratory (general)
 */

import { Router }       from 'express';
import { v4 as uuidv4 } from 'uuid';
import db               from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { geocodeZip, haversine } from '../utils/geocode.js';

const router = Router();
router.use(authenticate);

// ── Lab taxonomy classification ───────────────────────────────────────────────
const LAB_TAXONOMY_TYPE = {
  '291U00000X': 'clinical',
  '291900000X': 'military',
  '261QH0100X': 'hospital',
  '261QR0200X': 'radiology',
  '269900000X': 'clinical',
};
const LAB_CODES = new Set(Object.keys(LAB_TAXONOMY_TYPE));

function titleCase(s) {
  return s ? String(s).toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : '';
}

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
  const p = {
    version: '2.1',
    enumeration_type: 'NPI-2',
    limit: '200',
    taxonomy_description: 'Laboratory',
    ...params,
  };
  const url = `https://npiregistry.cms.hhs.gov/api/?${new URLSearchParams(p)}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch { return []; }
}

// ── Cache a lab NPI into lab_facilities (geocodes ZIP) ────────────────────────
async function upsertFromNpi(rec) {
  const coords = await geocodeZip(rec.zip).catch(() => null);
  const existing = rec.npi
    ? db.prepare(`SELECT id FROM lab_facilities WHERE npi = ?`).get(rec.npi)
    : null;

  if (existing) {
    db.prepare(`
      UPDATE lab_facilities
      SET name=?, address=?, city=?, state=?, zip=?, lat=?, lon=?, taxonomy_code=?, phone=?, fax=?, updated_at=NOW()
      WHERE npi=?
    `).run(
      rec.name, rec.address, rec.city, rec.state, rec.zip,
      coords?.lat ?? null, coords?.lon ?? null,
      rec.taxonomyCode || '', rec.phone || '', rec.fax || '',
      rec.npi,
    );
    return existing.id;
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO lab_facilities (id, npi, name, address, city, state, zip, lat, lon, taxonomy_code, phone, fax, clia_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, rec.npi || null, rec.name, rec.address || '', rec.city || '', rec.state || '', rec.zip || '',
    coords?.lat ?? null, coords?.lon ?? null,
    rec.taxonomyCode || '', rec.phone || '', rec.fax || '', rec.cliaNumber || '',
  );

  if (rec.npi && rec.cliaNumber) {
    db.prepare(`
      INSERT INTO lab_mappings (npi, clia_number, internal_lab_id) VALUES (?, ?, ?)
      ON CONFLICT (npi) DO UPDATE SET clia_number=EXCLUDED.clia_number, internal_lab_id=EXCLUDED.internal_lab_id
    `).run(rec.npi, rec.cliaNumber, id);
  }

  return id;
}

function formatRow(c) {
  return {
    id:           c.id || `npi-${c.npi}`,
    npi:          c.npi,
    name:         c.name,
    address:      c.address,
    city:         c.city,
    state:        c.state,
    zip:          c.zip,
    phone:        c.phone,
    fax:          c.fax,
    cliaNumber:   c.clia_number || c.cliaNumber || '',
    labType:      c.lab_type    || c.labType    || 'clinical',
    taxonomyCode: c.taxonomy_code || c.taxonomyCode || '',
  };
}

// ── GET /api/lab-facilities/near/:zip ────────────────────────────────────────
router.get('/near/:zip', async (req, res) => {
  const zip = String(req.params.zip || '').replace(/\D/g, '').slice(0, 5);
  if (zip.length !== 5) return res.status(400).json({ error: 'Invalid ZIP' });

  const center = await geocodeZip(zip);
  if (!center) return res.json({ results: [] });

  let candidates = db.prepare(
    `SELECT * FROM lab_facilities WHERE lat IS NOT NULL AND lon IS NOT NULL AND is_active = true LIMIT 500`
  ).all();

  // Back-fill from NPPES if sparse
  if (candidates.filter(c => c.state === center.state).length < 5) {
    const fresh = await nppesLabQuery({ postal_code: zip })
      .then(raw => raw.map(npiToLabRecord).filter(Boolean))
      .catch(() => []);

    if (fresh.length) {
      Promise.all(fresh.map(f => upsertFromNpi(f))).catch(() => {});
      for (const f of fresh) {
        const coords = f.zip === zip ? center : await geocodeZip(f.zip).catch(() => null);
        if (coords) candidates.push({ ...f, lat: coords.lat, lon: coords.lon });
      }
    }
  }

  const results = candidates
    .filter(c => c.lat != null && c.lon != null)
    .map(c => ({
      ...formatRow(c),
      distanceMiles: Math.round(haversine(center.lat, center.lon, c.lat, c.lon) * 10) / 10,
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, 5);

  res.json({ results });
});

// ── POST /api/lab-facilities/from-npi ────────────────────────────────────────
router.post('/from-npi', async (req, res) => {
  try {
    const { npi, name, address, city, state, zip, phone, fax, labType, taxonomyCode, cliaNumber } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = await upsertFromNpi({ npi, name, address, city, state, zip, phone, fax, labType, taxonomyCode, cliaNumber });
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/lab-facilities/:id ───────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const row = db.prepare(`SELECT * FROM lab_facilities WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Lab not found' });
  res.json(formatRow(row));
});

export default router;
