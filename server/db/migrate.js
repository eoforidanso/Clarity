/**
 * Clarity EHR — Database Migration Runner
 *
 * Usage:
 *   node server/db/migrate.js          — run pending migrations
 *   node server/db/migrate.js status   — show migration status
 *   node server/db/migrate.js rollback — roll back last migration (if down() defined)
 *
 * Migration files live in server/db/migrations/
 * Naming: YYYYMMDD_HHMMSS_description.js
 * Each file exports: { up(db), down(db) }
 *
 * The schema_migrations table tracks applied migrations.
 * Migrations run in filename order — always forward, never skip.
 */

import { db } from './database.js';
import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// ── Bootstrap migrations table ────────────────────────────────────────────────
async function ensureMigrationsTable() {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          SERIAL PRIMARY KEY,
      filename    TEXT NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      duration_ms INTEGER,
      checksum    TEXT
    )
  `).run();
  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_migrations_filename ON schema_migrations(filename)`
  ).run();
}

// ── Get applied migrations ────────────────────────────────────────────────────
async function getApplied() {
  const rows = await db.prepare(
    `SELECT filename FROM schema_migrations ORDER BY filename`
  ).all();
  return new Set(rows.map(r => r.filename));
}

// ── Get all migration files ───────────────────────────────────────────────────
async function getMigrationFiles() {
  try {
    const files = await readdir(MIGRATIONS_DIR);
    return files
      .filter(f => f.endsWith('.js'))
      .sort(); // lexicographic = chronological given YYYYMMDD prefix
  } catch {
    return [];
  }
}

// ── Run pending migrations ────────────────────────────────────────────────────
async function runMigrations() {
  await ensureMigrationsTable();
  const applied = await getApplied();
  const files   = await getMigrationFiles();
  const pending = files.filter(f => !applied.has(f));

  if (pending.length === 0) {
    console.log('[migrations] ✅ All migrations up to date');
    return { ran: 0, pending: 0 };
  }

  console.log(`[migrations] ${pending.length} pending migration(s)`);
  let ran = 0;

  for (const filename of pending) {
    const filepath = path.join(MIGRATIONS_DIR, filename);
    console.log(`[migrations] → Running ${filename}…`);
    const start = Date.now();

    try {
      const mod = await import(filepath + `?t=${Date.now()}`); // bust cache
      await mod.up(db);
      const ms = Date.now() - start;

      await db.prepare(
        `INSERT INTO schema_migrations (filename, duration_ms) VALUES ($1, $2)`
      ).run(filename, ms);

      console.log(`[migrations] ✅ ${filename} (${ms}ms)`);
      ran++;
    } catch (err) {
      console.error(`[migrations] ❌ FAILED: ${filename}`);
      console.error(err.message);
      // Log and continue — a bad migration must never crash the server
    }
  }

  console.log(`[migrations] ✅ ${ran} migration(s) applied`);
  return { ran, pending: pending.length };
}

// ── Status ────────────────────────────────────────────────────────────────────
async function status() {
  await ensureMigrationsTable();
  const applied = await getApplied();
  const files   = await getMigrationFiles();

  console.log('\nMigration Status');
  console.log('─────────────────────────────────────────');
  for (const f of files) {
    const state = applied.has(f) ? '✅ applied' : '⏳ pending';
    console.log(`  ${state}  ${f}`);
  }
  const pending = files.filter(f => !applied.has(f)).length;
  console.log(`\n${applied.size} applied, ${pending} pending\n`);
}

// ── Rollback last migration ───────────────────────────────────────────────────
async function rollback() {
  await ensureMigrationsTable();
  const last = await db.prepare(
    `SELECT filename FROM schema_migrations ORDER BY applied_at DESC LIMIT 1`
  ).get();

  if (!last) {
    console.log('[migrations] Nothing to roll back');
    return;
  }

  const filepath = path.join(MIGRATIONS_DIR, last.filename);
  console.log(`[migrations] Rolling back ${last.filename}…`);

  try {
    const mod = await import(filepath + `?t=${Date.now()}`);
    if (typeof mod.down !== 'function') {
      console.error(`[migrations] ❌ ${last.filename} has no down() export — cannot rollback`);
      return;
    }
    await mod.down(db);
    await db.prepare(`DELETE FROM schema_migrations WHERE filename = $1`).run(last.filename);
    console.log(`[migrations] ✅ Rolled back ${last.filename}`);
  } catch (err) {
    console.error(`[migrations] ❌ Rollback failed:`, err.message);
    throw err;
  }
}

// ── CLI (only when run directly, not when imported) ──────────────────────────
// Detect: node migrate.js  vs  import { runMigrations } from './migrate.js'
const isMain = process.argv[1]?.endsWith('migrate.js');
if (isMain) {
  const cmd = process.argv[2];
  if (cmd === 'status') {
    status().catch(console.error).finally(() => process.exit(0));
  } else if (cmd === 'rollback') {
    rollback().catch(console.error).finally(() => process.exit(0));
  } else {
    runMigrations().catch(console.error).finally(() => process.exit(0));
  }
}

export { runMigrations, status };
