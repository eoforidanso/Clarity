/**
 * Pharmacy Directory Routes
 *
 * Local `pharmacies` table is the primary store.
 * DoseSpot is the live data source when local results are sparse.
 *
 * DoseSpot pharmacy search endpoint:
 *   GET /webapi/api/pharmacies?PharmacyNameSearch=&City=&State=&ZipCode=
 *
 * ServiceLevel bitmask: 1=eRx, 2=EPCS, 4=ControlledSubstance
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { geocodeZip, haversine } from '../utils/geocode.js';

const router = Router();
router.use(authenticate);

const DS_BASE = () =>
  process.env.DOSESPOT_ENVIRONMENT === 'production'
    ? 'https://my.dosespot.com/webapi'
    : 'https://my.staging.dosespot.com/webapi';

const dsConfigured = () =>
  !!(process.env.DOSESPOT_CLINIC_ID &&
     process.env.DOSESPOT_API_USER &&
     process.env.DOSESPOT_API_PASSWORD);

let _tokenCache = { token: null, expiresAt: 0 };

async function getDSToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt) return _tokenCache.token;
  const r = await fetch(`${DS_BASE()}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      username: process.env.DOSESPOT_API_USER,
      password: process.env.DOSESPOT_API_PASSWORD,
    }).toString(),
  });
  if (!r.ok) throw new Error(`DoseSpot auth failed (${r.status})`);
  const d = await r.json();
  _tokenCache = { token: d.access_token, expiresAt: Date.now() + (d.expires_in - 60) * 1000 };
  return _tokenCache.token;
}

function formatPharmacy(row) {
  return {
    id:               row.id,
    ncpdpId:          row.ncpdp_id  || null,
    npi:              row.npi       || '',
    name:             row.name,
    chain:            row.chain     || '',
    address:          `${row.address_street}, ${row.address_city}, ${row.address_state} ${row.address_zip}`.trim().replace(/^,\s*/, ''),
    addressStreet:    row.address_street  || '',
    addressCity:      row.address_city    || '',
    addressState:     row.address_state   || '',
    addressZip:       row.address_zip     || '',
    phone:            row.phone     || '',
    fax:              row.fax       || '',
    pharmacyType:     row.pharmacy_type   || 'retail',
    is24h:            !!row.is_24h,
    surrescriptsCapable: !!row.surescripts_capable,
    epcsCapable:      !!row.epcs_capable,
    source:           row.source    || 'manual',
    cachedAt:         row.cached_at || null,
  };
}

// Map a DoseSpot pharmacy object → our DB shape
function fromDoseSpot(p) {
  const serviceLevel = Number(p.ServiceLevel ?? p.serviceLevel ?? 0);
  return {
    ncpdp_id:            String(p.PharmacyId ?? p.pharmacyId ?? ''),
    npi:                 String(p.Npi ?? p.npi ?? ''),
    name:                p.StoreName ?? p.storeName ?? '',
    chain:               p.Chain ?? p.chain ?? deriveChain(p.StoreName ?? ''),
    address_street:      p.Address1 ?? p.address1 ?? '',
    address_city:        p.City ?? p.city ?? '',
    address_state:       p.State ?? p.state ?? '',
    address_zip:         (p.ZipCode ?? p.zipCode ?? '').slice(0, 5),
    phone:               formatPhone(p.PrimaryPhone ?? p.primaryPhone ?? ''),
    fax:                 formatPhone(p.StoreFax ?? p.storeFax ?? ''),
    pharmacy_type:       deriveType(p),
    is_24h:              (p.HoursOfOperation ?? '') === '24' ? 1 : 0,
    surescripts_capable: (serviceLevel & 1) ? 1 : 0,
    epcs_capable:        (serviceLevel & 2) ? 1 : 0,
    source:              'dosespot',
  };
}

function formatPhone(raw = '') {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  return raw;
}

function deriveChain(name = '') {
  const n = name.toLowerCase();
  if (n.includes('cvs'))         return 'CVS';
  if (n.includes('walgreen'))    return 'Walgreens';
  if (n.includes('rite aid'))    return 'Rite Aid';
  if (n.includes('walmart'))     return 'Walmart';
  if (n.includes('kroger'))      return 'Kroger';
  if (n.includes('costco'))      return 'Costco';
  if (n.includes('target'))      return 'Target';
  if (n.includes('safeway'))     return 'Safeway';
  return '';
}

function deriveType(p) {
  const spec = Number(p.Specialty ?? p.specialty ?? 0);
  if (spec & 1)  return 'specialty';
  if (spec & 2)  return 'mail';
  if (spec & 4)  return 'compounding';
  if (spec & 8)  return 'ltc';
  return 'retail';
}

// Upsert a DoseSpot pharmacy record into local cache
async function upsertFromDoseSpot(dsPharmacy) {
  const row = fromDoseSpot(dsPharmacy);
  if (!row.ncpdp_id) return null;

  const existing = await db.prepare(`SELECT id FROM pharmacies WHERE ncpdp_id = ?`).get(row.ncpdp_id);
  if (existing) {
    await db.prepare(`
      UPDATE pharmacies SET
        npi=?, name=?, chain=?, address_street=?, address_city=?, address_state=?, address_zip=?,
        phone=?, fax=?, pharmacy_type=?, is_24h=?, surescripts_capable=?, epcs_capable=?,
        source='dosespot', cached_at=NOW(), is_active=1
      WHERE ncpdp_id=?
    `).run(
      row.npi, row.name, row.chain, row.address_street, row.address_city,
      row.address_state, row.address_zip, row.phone, row.fax,
      row.pharmacy_type, row.is_24h, row.surescripts_capable, row.epcs_capable,
      row.ncpdp_id
    );
    return existing.id;
  } else {
    const id = uuidv4();
    await db.prepare(`
      INSERT INTO pharmacies
        (id, ncpdp_id, npi, name, chain, address_street, address_city, address_state, address_zip,
         phone, fax, pharmacy_type, is_24h, surescripts_capable, epcs_capable, source, cached_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'dosespot',NOW())
    `).run(
      id, row.ncpdp_id, row.npi, row.name, row.chain,
      row.address_street, row.address_city, row.address_state, row.address_zip,
      row.phone, row.fax, row.pharmacy_type, row.is_24h,
      row.surescripts_capable, row.epcs_capable
    );
    return id;
  }
}

// ── GET /api/pharmacies ──────────────────────────────────────────────────────
// Search local cache; if fewer than 3 results and DS configured, live-search DS.
router.get('/', async (req, res) => {
  const { q = '', city = '', state = '', zip = '', type = '', epcs = '' } = req.query;

  const conditions = ['is_active = 1'];
  const params = [];

  if (q.trim()) {
    conditions.push(`(name ILIKE ? OR chain ILIKE ? OR ncpdp_id = ? OR npi = ?)`);
    const like = `%${q.trim()}%`;
    params.push(like, like, q.trim(), q.trim());
  }
  if (city.trim())  { conditions.push(`address_city  ILIKE ?`); params.push(`%${city.trim()}%`); }
  if (state.trim()) { conditions.push(`address_state = ?`);     params.push(state.trim().toUpperCase()); }
  if (zip.trim())   { conditions.push(`address_zip   LIKE ?`);  params.push(`${zip.trim().slice(0,5)}%`); }
  if (type)         { conditions.push(`pharmacy_type = ?`);     params.push(type); }
  if (epcs === '1') { conditions.push(`epcs_capable = 1`); }

  const where = conditions.join(' AND ');
  const localRows = await db.prepare(
    `SELECT * FROM pharmacies WHERE ${where} ORDER BY name ASC LIMIT 50`
  ).all(...params);

  // Hit DoseSpot if the query has something to search but local results are sparse
  const hasQuery = q.trim() || city.trim() || state.trim() || zip.trim();
  if (hasQuery && localRows.length < 3 && dsConfigured()) {
    try {
      const token = await getDSToken();
      const dsParams = new URLSearchParams();
      if (q.trim())    dsParams.set('PharmacyNameSearch', q.trim());
      if (city.trim()) dsParams.set('City', city.trim());
      if (state.trim()) dsParams.set('State', state.trim().toUpperCase());
      if (zip.trim())  dsParams.set('ZipCode', zip.trim().slice(0, 5));

      const r = await fetch(`${DS_BASE()}/api/pharmacies?${dsParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (r.ok) {
        const data = await r.json();
        const items = Array.isArray(data) ? data : (data.Items ?? data.items ?? []);
        // Upsert all results into local cache (fire-and-forget, don't block response)
        Promise.all(items.map(p => upsertFromDoseSpot(p))).catch(() => {});

        const localNcpdpIds = new Set(localRows.map(r => r.ncpdp_id).filter(Boolean));
        const livePharmacies = items
          .filter(p => {
            const id = String(p.PharmacyId ?? p.pharmacyId ?? '');
            return id && !localNcpdpIds.has(id);
          })
          .map(p => {
            const row = fromDoseSpot(p);
            return {
              id:               null,
              ncpdpId:          row.ncpdp_id,
              npi:              row.npi,
              name:             row.name,
              chain:            row.chain,
              address:          [row.address_street, row.address_city, row.address_state, row.address_zip].filter(Boolean).join(', '),
              addressStreet:    row.address_street,
              addressCity:      row.address_city,
              addressState:     row.address_state,
              addressZip:       row.address_zip,
              phone:            row.phone,
              fax:              row.fax,
              pharmacyType:     row.pharmacy_type,
              is24h:            !!row.is_24h,
              surrescriptsCapable: !!row.surescripts_capable,
              epcsCapable:      !!row.epcs_capable,
              source:           'dosespot',
            };
          });

        return res.json({
          local: localRows.map(formatPharmacy),
          live:  livePharmacies,
          total: localRows.length + livePharmacies.length,
          source: 'dosespot',
        });
      }
    } catch (err) {
      console.warn('[pharmacies] DoseSpot fallback failed:', err.message);
    }
  }

  res.json({
    local: localRows.map(formatPharmacy),
    live:  [],
    total: localRows.length,
    source: 'local',
  });
});

// ── GET /api/pharmacies/recent ───────────────────────────────────────────────
// Provider's 10 most recently used pharmacies (from orders).
router.get('/recent', async (req, res) => {
  const rows = await db.prepare(`
    SELECT p.*, MAX(o.created_at) AS last_used
    FROM pharmacies p
    JOIN orders o ON o.pharmacy_ncpdp_id = p.ncpdp_id
    WHERE p.is_active = 1
    GROUP BY p.id
    ORDER BY last_used DESC
    LIMIT 10
  `).all();
  res.json(rows.map(formatPharmacy));
});

// ── Upsert a pharmacy sourced from the NPI Registry ─────────────────────────
async function upsertFromNpi(rec) {
  // rec: { npi, name, address, city, state, zip, phone, fax, pharmacyType, taxonomyCode }
  if (!rec.npi) return null;

  const coords = await geocodeZip(rec.zip).catch(() => null);
  const lat = coords?.lat ?? null;
  const lon = coords?.lon ?? null;

  const existing = await db.prepare(`SELECT id FROM pharmacies WHERE npi = $1`).get(rec.npi);
  if (existing) {
    await db.prepare(`
      UPDATE pharmacies SET
        name=$2, address_street=$3, address_city=$4, address_state=$5, address_zip=$6,
        phone=$7, fax=$8, pharmacy_type=$9, taxonomy_code=$10,
        lat=$11, lon=$12, source='npi', cached_at=NOW(), is_active=1
      WHERE npi=$1
    `).run(rec.npi, rec.name, rec.address, rec.city, rec.state, rec.zip,
           rec.phone, rec.fax, rec.pharmacyType || 'retail', rec.taxonomyCode || '',
           lat, lon);
    return existing.id;
  } else {
    const id = uuidv4();
    await db.prepare(`
      INSERT INTO pharmacies
        (id, npi, name, address_street, address_city, address_state, address_zip,
         phone, fax, pharmacy_type, taxonomy_code, lat, lon, source, cached_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'npi',NOW())
    `).run(id, rec.npi, rec.name, rec.address, rec.city, rec.state, rec.zip,
           rec.phone, rec.fax, rec.pharmacyType || 'retail', rec.taxonomyCode || '',
           lat, lon);
    return id;
  }
}

// ── GET /api/pharmacies/near/:zip ────────────────────────────────────────────
// Returns up to 5 nearest retail pharmacies sorted by Haversine distance.
// 1. Geocode the patient ZIP.
// 2. Pull pharmacies from local DB that have lat/lon.
// 3. If DB has fewer than 3 for this ZIP, back-fill from NPPES and cache.
// 4. Sort all candidates by distance, return top 5.
router.get('/near/:zip', async (req, res) => {
  const zip = String(req.params.zip || '').replace(/\D/g, '').slice(0, 5);
  if (zip.length !== 5) return res.status(400).json({ error: 'Invalid ZIP code' });

  const center = await geocodeZip(zip);
  if (!center) return res.status(404).json({ error: 'ZIP code not found' });

  // Pull local cached pharmacies with coordinates (search by state for broader pool)
  const localRows = await db.prepare(`
    SELECT * FROM pharmacies
    WHERE is_active = 1 AND lat IS NOT NULL AND lon IS NOT NULL
      AND (address_zip = $1 OR address_state = (
            SELECT state FROM zip_geocache WHERE zip = $1 LIMIT 1
          ))
    LIMIT 200
  `).all(zip).catch(() => []);

  let candidates = localRows;

  // Back-fill from NPPES if local cache is sparse for this ZIP
  if (localRows.filter(r => r.address_zip === zip).length < 3) {
    try {
      const { default: fetch } = await import('node-fetch').catch(() => ({ default: globalThis.fetch }));
      const url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&enumeration_type=NPI-2&taxonomy_description=Pharmacy&postal_code=${zip}&limit=50`;
      const r = await globalThis.fetch(url, { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const data = await r.json();
        const npiResults = data.results || [];
        const titleCase = s => s ? String(s).toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : '';
        const TAXONOMY_TYPE = { '333600000X':'retail','3336C0003X':'retail','3336C0002X':'clinic','3336C0004X':'compounding','3336M0002X':'mail' };
        const PHARMACY_CODES = new Set(Object.keys(TAXONOMY_TYPE));

        const fresh = [];
        for (const r of npiResults) {
          const addr  = r.addresses?.find(a => a.address_purpose === 'LOCATION') || r.addresses?.[0] || {};
          const taxList = r.taxonomies || [];
          const tax   = taxList.find(t => t.primary && PHARMACY_CODES.has(t.code)) || taxList.find(t => PHARMACY_CODES.has(t.code));
          if (!tax) continue;
          const dba   = r.other_names?.find(n => n.code === '3')?.organization_name;
          const name  = dba || r.basic?.organization_name || '';
          if (!name) continue;
          fresh.push({
            npi: r.number, name: titleCase(name),
            address: titleCase([addr.address_1, addr.address_2].filter(Boolean).join(' ')),
            city: titleCase(addr.city || ''), state: (addr.state || '').toUpperCase(),
            zip: (addr.postal_code || '').slice(0, 5),
            phone: addr.telephone_number || '', fax: addr.fax_number || '',
            pharmacyType: TAXONOMY_TYPE[tax.code] || 'retail', taxonomyCode: tax.code,
          });
        }
        // Upsert in background, don't block the response
        Promise.all(fresh.map(f => upsertFromNpi(f))).catch(() => {});

        // Merge fresh results into candidates (geocoding happens in upsertFromNpi async)
        const existingNpis = new Set(candidates.map(r => r.npi));
        for (const f of fresh) {
          if (existingNpis.has(f.npi)) continue;
          const coords = await geocodeZip(f.zip).catch(() => null);
          if (!coords) continue;
          candidates.push({ ...f, address_street: f.address, address_city: f.city, address_state: f.state, address_zip: f.zip, pharmacy_type: f.pharmacyType, lat: coords.lat, lon: coords.lon });
        }
      }
    } catch { /* NPPES unavailable — return local results only */ }
  }

  // Score by distance and return nearest 5
  const scored = candidates
    .filter(c => c.lat != null && c.lon != null)
    .map(c => ({
      id:           c.id || `npi-${c.npi}`,
      npi:          c.npi || '',
      name:         c.name,
      address:      c.address_street || c.address || '',
      city:         c.address_city   || c.city    || '',
      state:        c.address_state  || c.state   || '',
      zip:          c.address_zip    || c.zip     || '',
      phone:        c.phone          || '',
      fax:          c.fax            || '',
      pharmacyType: c.pharmacy_type  || c.pharmacyType || 'retail',
      taxonomyCode: c.taxonomy_code  || c.taxonomyCode || '',
      distanceMiles: Math.round(haversine(center.lat, center.lon, c.lat, c.lon) * 10) / 10,
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, 5);

  res.json({ zip, lat: center.lat, lon: center.lon, results: scored });
});

// ── POST /api/pharmacies/from-npi ────────────────────────────────────────────
// Cache a pharmacy from the NPI registry into the local DB.
// Called when the user selects an NPI-sourced pharmacy from PharmacySearch.
router.post('/from-npi', async (req, res) => {
  const { npi, name, address, city, state, zip, phone, fax, pharmacyType, taxonomyCode } = req.body;
  if (!npi || !name) return res.status(400).json({ error: 'npi and name are required' });
  const id = await upsertFromNpi({ npi, name, address, city, state, zip, phone, fax, pharmacyType, taxonomyCode });
  res.json({ id, npi });
});

// ── GET /api/pharmacies/:ncpdpId ─────────────────────────────────────────────
// Fetch one pharmacy by NCPDP ID — local first, DS fallback.
router.get('/:ncpdpId', async (req, res) => {
  const local = await db.prepare(`SELECT * FROM pharmacies WHERE ncpdp_id = ?`).get(req.params.ncpdpId);
  if (local) return res.json(formatPharmacy(local));

  if (!dsConfigured()) return res.status(404).json({ error: 'Pharmacy not found' });

  try {
    const token = await getDSToken();
    const r = await fetch(`${DS_BASE()}/api/pharmacies/${req.params.ncpdpId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return res.status(404).json({ error: 'Pharmacy not found in DoseSpot' });

    const data = await r.json();
    const item = data.Item ?? data.item ?? data;
    await upsertFromDoseSpot(item);

    const saved = await db.prepare(`SELECT * FROM pharmacies WHERE ncpdp_id = ?`).get(String(item.PharmacyId ?? item.pharmacyId));
    res.json(saved ? formatPharmacy(saved) : { ...fromDoseSpot(item), source: 'dosespot' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ── POST /api/pharmacies/lookup ──────────────────────────────────────────────
// Force-fetch from DoseSpot and upsert — used when a pharmacy is selected
// from live results so we persist it immediately with a real id.
router.post('/lookup', async (req, res) => {
  const { ncpdpId } = req.body;
  if (!ncpdpId) return res.status(400).json({ error: 'ncpdpId required' });

  // Already cached?
  const existing = await db.prepare(`SELECT * FROM pharmacies WHERE ncpdp_id = ?`).get(String(ncpdpId));
  if (existing) return res.json(formatPharmacy(existing));

  if (!dsConfigured()) return res.status(503).json({ error: 'DoseSpot not configured' });

  try {
    const token = await getDSToken();
    const r = await fetch(`${DS_BASE()}/api/pharmacies/${ncpdpId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return res.status(404).json({ error: 'Pharmacy not found in DoseSpot' });

    const data = await r.json();
    const item = data.Item ?? data.item ?? data;
    await upsertFromDoseSpot(item);

    const saved = await db.prepare(`SELECT * FROM pharmacies WHERE ncpdp_id = ?`).get(String(ncpdpId));
    res.json(formatPharmacy(saved));
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

export default router;
