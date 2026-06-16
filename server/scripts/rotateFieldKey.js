/**
 * Field-Encryption Key Rotation Script
 *
 * Re-encrypts all PHI fields in `patients` from OLD_FIELD_ENCRYPTION_KEY
 * to NEW_FIELD_ENCRYPTION_KEY without decrypting to disk.
 *
 * Usage:
 *   cd server
 *   OLD_FIELD_ENCRYPTION_KEY=<old-64-char-hex> \
 *   NEW_FIELD_ENCRYPTION_KEY=<new-64-char-hex> \
 *   node scripts/rotateFieldKey.js          # dry-run (safe, no DB writes)
 *
 *   node scripts/rotateFieldKey.js --apply  # commits re-encrypted values
 *
 * Generate a new key:
 *   openssl rand -hex 32
 *
 * After --apply succeeds, update FIELD_ENCRYPTION_KEY in /var/www/ehr/server/.env
 * to the NEW key, then restart PM2.
 */

import crypto  from 'crypto';
import pg      from 'pg';
import dotenv  from 'dotenv';
import path    from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ── Crypto helpers (independent of the live key in env) ──────────────────────

const ALGO    = 'aes-256-gcm';
const IV_LEN  = 12;
const TAG_LEN = 16;
const PREFIX  = 'enc:v1:';

function decryptWith(value, keyHex) {
  if (!value || !String(value).startsWith(PREFIX)) return value;
  const key   = Buffer.from(keyHex, 'hex');
  const parts = String(value).slice(PREFIX.length).split(':');
  if (parts.length !== 3) return value;
  const [ivHex, tagHex, ctHex] = parts;
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'), { authTagLength: TAG_LEN });
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(ctHex, 'hex'), undefined, 'utf8') + decipher.final('utf8');
}

function encryptWith(plaintext, keyHex) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;
  const key    = Buffer.from(keyHex, 'hex');
  const iv     = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  const enc    = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return `${PREFIX}${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${enc.toString('hex')}`;
}

// ── Fields that may be encrypted ─────────────────────────────────────────────

const ENCRYPTED_FIELDS = [
  'ssn',
  'phone',
  'cell_phone',
  'email',
  'insurance_primary_member_id',
  'insurance_secondary_member_id',
  'emergency_contact_phone',
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const oldKey = process.env.OLD_FIELD_ENCRYPTION_KEY;
  const newKey = process.env.NEW_FIELD_ENCRYPTION_KEY;
  const apply  = process.argv.includes('--apply');

  if (!oldKey || oldKey.length !== 64) {
    throw new Error('OLD_FIELD_ENCRYPTION_KEY must be a 64-char hex string');
  }
  if (!newKey || newKey.length !== 64) {
    throw new Error('NEW_FIELD_ENCRYPTION_KEY must be a 64-char hex string');
  }
  if (oldKey === newKey) {
    throw new Error('OLD_FIELD_ENCRYPTION_KEY and NEW_FIELD_ENCRYPTION_KEY must be different');
  }

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('ondigitalocean.com') ? { rejectUnauthorized: false } : false,
  });

  console.log(`\n🔑 Field Key Rotation — ${apply ? 'APPLY MODE' : 'DRY RUN'}`);
  console.log(`   Old key: ${oldKey.slice(0, 8)}…`);
  console.log(`   New key: ${newKey.slice(0, 8)}…\n`);

  const { rows } = await pool.query(
    `SELECT id, ${ENCRYPTED_FIELDS.join(', ')} FROM patients ORDER BY id`
  );

  console.log(`Found ${rows.length} patients to process...\n`);

  let rotatedRows  = 0;
  let rotatedCells = 0;
  let skippedRows  = 0;
  let errorRows    = 0;

  for (const row of rows) {
    const updates = {};

    for (const field of ENCRYPTED_FIELDS) {
      const val = row[field];
      if (!val || !String(val).startsWith(PREFIX)) continue;

      try {
        const plaintext     = decryptWith(val, oldKey);
        updates[field]      = encryptWith(plaintext, newKey);
        rotatedCells++;
      } catch (err) {
        console.error(`  ✗ Patient ${row.id}: failed to re-encrypt ${field}: ${err.message}`);
        errorRows++;
      }
    }

    if (Object.keys(updates).length === 0) {
      skippedRows++;
      continue;
    }

    if (apply) {
      const keys        = Object.keys(updates);
      const setClauses  = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const values      = [...keys.map(k => updates[k]), row.id];
      await pool.query(
        `UPDATE patients SET ${setClauses} WHERE id = $${keys.length + 1}`,
        values
      );
    }

    rotatedRows++;
    console.log(`  ${apply ? '✓' : '○'} Patient ${row.id}: ${Object.keys(updates).length} field(s) ${apply ? 're-encrypted' : 'would be re-encrypted'}`);
  }

  console.log('\n────────────────────────────────────────');
  console.log(`  Patients processed : ${rotatedRows}`);
  console.log(`  Fields rotated     : ${rotatedCells}`);
  console.log(`  Rows skipped       : ${skippedRows} (no encrypted fields)`);
  if (errorRows) console.log(`  Errors             : ${errorRows} — review above ↑`);

  if (!apply) {
    console.log('\n⚠️  DRY RUN — no changes written to the database.');
    console.log('   Re-run with --apply to commit the rotation.\n');
    console.log('   After --apply completes successfully:');
    console.log('   1. Update FIELD_ENCRYPTION_KEY in /var/www/ehr/server/.env');
    console.log('   2. pm2 restart clarity-api --update-env');
    console.log('   3. Verify login and patient chart still work\n');
  } else {
    console.log('\n✅ Rotation complete. Next steps:');
    console.log('   1. Update FIELD_ENCRYPTION_KEY in /var/www/ehr/server/.env to the NEW key');
    console.log('   2. pm2 restart clarity-api --update-env');
    console.log('   3. Smoke-test: load a patient chart, verify SSN/phone still display\n');
  }

  await pool.end();
}

main().catch(err => {
  console.error('\n✗ Fatal:', err.message);
  process.exit(1);
});
