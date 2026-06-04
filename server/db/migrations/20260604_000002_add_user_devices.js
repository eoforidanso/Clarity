/**
 * Migration: user_devices table + user_locations table
 */

export async function up(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS user_devices (
      id          SERIAL PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fingerprint VARCHAR(64) NOT NULL,
      user_agent  TEXT NOT NULL,
      platform    VARCHAR(64),
      browser     VARCHAR(64),
      ip          VARCHAR(64),
      country     VARCHAR(4),
      first_seen  TIMESTAMP DEFAULT NOW(),
      last_seen   TIMESTAMP DEFAULT NOW(),
      trust_state VARCHAR(16) DEFAULT 'trusted'
        CHECK (trust_state IN ('trusted','new','suspicious','revoked')),
      UNIQUE(user_id, fingerprint)
    )
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_devices_user     ON user_devices(user_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_devices_fp       ON user_devices(fingerprint)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_devices_trust    ON user_devices(trust_state)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_devices_lastseen ON user_devices(last_seen DESC)`).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS user_locations (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      ip           TEXT NOT NULL,
      country      TEXT    DEFAULT '',
      country_code TEXT    DEFAULT '',
      city         TEXT    DEFAULT '',
      lat          REAL,
      lon          REAL,
      isp          TEXT    DEFAULT '',
      first_seen   TIMESTAMPTZ DEFAULT NOW(),
      last_seen    TIMESTAMPTZ DEFAULT NOW(),
      login_count  INTEGER DEFAULT 1
    )
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_loc_user ON user_locations(user_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_loc_ip   ON user_locations(ip)`).run();
}

export async function down(db) {
  await db.prepare(`DROP TABLE IF EXISTS user_locations`).run();
  await db.prepare(`DROP TABLE IF EXISTS user_devices`).run();
}
