/**
 * One-time migration: copy all data from SQLite (ehr.sqlite) to PostgreSQL.
 * Run AFTER the PostgreSQL schema has been initialized via initializeDatabase().
 *
 * Usage:
 *   node server/db/migrate-sqlite-to-pg.js
 *
 * Requires DATABASE_URL in environment (or .env file loaded before running).
 */

import Database from 'better-sqlite3';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const SQLITE_PATH = path.join(__dirname, 'ehr.sqlite');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set. Aborting.');
  process.exit(1);
}

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const pool = new pg.Pool({ connectionString: DATABASE_URL });

// Tables to migrate in dependency order (parents before children)
const TABLES = [
  'users',
  'patients',
  'allergies',
  'problems',
  'vitals',
  'medications',
  'medication_rx_history',
  'orders',
  'lab_results',
  'lab_result_tests',
  'lab_result_components',
  'encounters',
  'assessments',
  'immunizations',
  'appointments',
  'blocked_days',
  'inbox_messages',
  'staff_channels',
  'staff_messages',
  'btg_audit_log',
  'btg_access',
  'smart_phrases',
  'medication_database',
  'epcs_otps',
  'audit_log',
  'sessions',
  'direct_messages',
  'locations',
  'insurance_verifications',
  'claims',
  'payments',
  'practice_settings',
  'fee_schedule',
  'ar_aging',
  'patient_statements',
  'denial_management',
  'quality_measures',
  'payer_contracts',
  'revenue_analytics',
  'telehealth_billing',
  'patient_statement_items',
  'appeal_tasks',
  'patient_portal_access_log',
  'payment_plans',
  'payment_plan_payments',
  'billing_notifications',
  'billing_rules',
];

async function migrateTable(client, table) {
  let rows;
  try {
    rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
  } catch (err) {
    console.log(`  [skip] ${table} — not in SQLite: ${err.message}`);
    return 0;
  }

  if (rows.length === 0) {
    console.log(`  [empty] ${table}`);
    return 0;
  }

  const columns = Object.keys(rows[0]);
  let inserted = 0;

  for (const row of rows) {
    const values = columns.map(c => row[c]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const colList = columns.map(c => `"${c}"`).join(', ');
    const sql = `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
    try {
      await client.query('BEGIN');
      await client.query(sql, values);
      await client.query('COMMIT');
      inserted++;
    } catch (err) {
      await client.query('ROLLBACK');
      // Skip FK violations and duplicates silently, log others
      if (err.code !== '23503' && err.code !== '23505') {
        console.error(`  [error] ${table} row ${row.id ?? '?'}: ${err.message}`);
      }
    }
  }

  console.log(`  [ok] ${table}: ${inserted}/${rows.length} rows migrated`);
  return inserted;
}

async function run() {
  const client = await pool.connect();
  try {
    let total = 0;
    for (const table of TABLES) {
      total += await migrateTable(client, table);
    }

    console.log(`\nMigration complete. Total rows migrated: ${total}`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

run();
