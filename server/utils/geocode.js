/**
 * ZIP geocoder — converts a US ZIP code to lat/lon.
 *
 * Source: api.zippopotam.us (free, no key, US ZIP centroids)
 * Cache:  zip_geocache table, 30-day TTL
 */

import db from '../db/database.js';

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Returns { lat, lon, city, state } for a 5-digit US ZIP, or null on failure.
 * Results are cached in zip_geocache for 30 days.
 */
export async function geocodeZip(zip) {
  if (!zip || !/^\d{5}$/.test(String(zip))) return null;

  // Check cache (skip if stale)
  try {
    const cached = await db.prepare(
      `SELECT lat, lon, city, state, updated_at FROM zip_geocache WHERE zip = $1`
    ).get(zip);
    if (cached) {
      const age = Date.now() - new Date(cached.updated_at).getTime();
      if (age < TTL_MS) return { lat: cached.lat, lon: cached.lon, city: cached.city, state: cached.state };
    }
  } catch { /* table may not exist yet in test env */ }

  // Fetch from zippopotam.us
  try {
    const r = await fetch(`https://api.zippopotam.us/us/${zip}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;

    const data = await r.json();
    const place = data.places?.[0];
    if (!place) return null;

    const lat   = parseFloat(place.latitude);
    const lon   = parseFloat(place.longitude);
    const city  = place['place name']           || '';
    const state = place['state abbreviation']   || '';

    await db.prepare(`
      INSERT INTO zip_geocache (zip, lat, lon, city, state, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (zip) DO UPDATE SET lat=$2, lon=$3, city=$4, state=$5, updated_at=NOW()
    `).run(zip, lat, lon, city, state);

    return { lat, lon, city, state };
  } catch {
    return null;
  }
}

/**
 * Haversine distance between two lat/lon points, in miles.
 */
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth radius in miles
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
