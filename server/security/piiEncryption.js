/**
 * PII Field Encryption
 *
 * Encrypts sensitive fields (SSN, DOB, phone, insurance ID) at application level
 * before storing in database. Decrypts transparently on retrieval.
 *
 * Uses AES-256-GCM (authenticated encryption with associated data)
 * Stores: `base64(iv + ciphertext + authTag)` in database
 *
 * WARNING: Encryption key rotation requires re-encryption of all existing data
 */

import crypto from 'crypto';
import { requireSecret } from './secrets.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

let encryptionKey = null;

/**
 * Initialize encryption key from environment
 * Call once at startup
 */
export function initializeEncryption() {
  const keyHex = requireSecret('ENCRYPTION_KEY');

  // Validate key length
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be 64 hex characters (32 bytes). Current: ${keyHex.length}`);
  }

  encryptionKey = key;
  console.log('[encryption] ✅ PII encryption initialized');
}

/**
 * Encrypt a PII value
 *
 * @param {string} plaintext - The value to encrypt
 * @returns {string} base64-encoded encrypted value (iv + ciphertext + authTag)
 */
export function encryptPii(plaintext) {
  if (!encryptionKey) {
    throw new Error('Encryption not initialized. Call initializeEncryption() first');
  }

  if (!plaintext) {
    return null; // Allow null values
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);

  let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine: iv + ciphertext + authTag
  const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), authTag]);

  return combined.toString('base64');
}

/**
 * Decrypt a PII value
 *
 * @param {string} encrypted - base64-encoded encrypted value
 * @returns {string} decrypted plaintext
 */
export function decryptPii(encrypted) {
  if (!encryptionKey) {
    throw new Error('Encryption not initialized. Call initializeEncryption() first');
  }

  if (!encrypted) {
    return null; // Allow null values
  }

  try {
    const combined = Buffer.from(encrypted, 'base64');

    // Extract: iv + ciphertext + authTag
    const iv = combined.slice(0, IV_LENGTH);
    const authTag = combined.slice(-AUTH_TAG_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH, -AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('[encryption] Decryption failed — possible key rotation or corruption');
    throw new Error(`Failed to decrypt PII: ${err.message}`);
  }
}

/**
 * Decrypt multiple PII fields in an object
 *
 * @param {object} obj - Object with encrypted fields
 * @param {string[]} fields - Field names to decrypt
 * @returns {object} Object with decrypted fields
 */
export function decryptObject(obj, fields = []) {
  const result = { ...obj };

  for (const field of fields) {
    if (result[field]) {
      result[field] = decryptPii(result[field]);
    }
  }

  return result;
}

/**
 * Database helper: Encrypt before INSERT/UPDATE
 *
 * Usage:
 *   const encrypted = encryptObject(patientData, ['ssn', 'phone', 'dob']);
 *   await db.prepare('INSERT INTO patients ... VALUES (...)').run(...encrypted);
 */
export function encryptObject(obj, fields = []) {
  const result = { ...obj };

  for (const field of fields) {
    if (result[field]) {
      result[field] = encryptPii(result[field]);
    }
  }

  return result;
}

/**
 * Database helper: Decrypt after SELECT
 *
 * Usage:
 *   const rows = await db.prepare('SELECT * FROM patients WHERE ...').all();
 *   return rows.map(r => decryptObject(r, ['ssn', 'phone', 'dob']));
 */
export function decryptResults(rows, fields = []) {
  return rows.map(row => decryptObject(row, fields));
}

/**
 * Key rotation: Decrypt with old key, encrypt with new key
 *
 * Usage:
 *   const oldKey = process.env.OLD_ENCRYPTION_KEY;
 *   const newKey = process.env.NEW_ENCRYPTION_KEY;
 *   await rotateEncryptionKey(db, oldKey, newKey, ['ssn', 'phone']);
 */
export async function rotateEncryptionKey(db, oldKeyHex, newKeyHex, fields = []) {
  console.warn('[encryption] ⚠️  Starting encryption key rotation — this will re-encrypt all data');

  if (oldKeyHex.length !== 128 || newKeyHex.length !== 128) {
    throw new Error('Keys must be 64 hex characters');
  }

  const oldKey = Buffer.from(oldKeyHex, 'hex');
  const newKey = Buffer.from(newKeyHex, 'hex');

  // Temporarily swap keys
  const currentKey = encryptionKey;
  encryptionKey = oldKey;

  try {
    // Fetch all data
    const tables = [
      { table: 'patients', fields: ['ssn', 'dob', 'phone'] },
      { table: 'users', fields: ['phone'] }
    ];

    for (const { table, fields: tableFields } of tables) {
      const rows = await db.prepare(`SELECT id, ${tableFields.join(', ')} FROM ${table}`).all();

      // Decrypt with old key, encrypt with new key
      encryptionKey = newKey;

      for (const row of rows) {
        const decrypted = {};
        for (const field of tableFields) {
          encryptionKey = oldKey;
          decrypted[field] = decryptPii(row[field]);
          encryptionKey = newKey;
          decrypted[field] = encryptPii(decrypted[field]);
        }

        // Update row
        const setClause = tableFields.map((f, i) => `${f} = $${i + 1}`).join(', ');
        const values = tableFields.map(f => decrypted[f]);
        await db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = $${tableFields.length + 1}`).run(...values, row.id);
      }
    }

    console.log('[encryption] ✅ Key rotation complete');
    encryptionKey = newKey;
  } catch (err) {
    console.error('[encryption] ❌ Key rotation failed — restoring old key');
    encryptionKey = currentKey;
    throw err;
  }
}

/**
 * Example: Using encrypted fields in database operations
 *
 * // Insert patient with encrypted PII
 * const patientData = {
 *   id: 'p123',
 *   first_name: 'John',
 *   ssn: '123-45-6789',
 *   dob: '1990-01-15',
 *   phone: '555-1234'
 * };
 *
 * const encrypted = encryptObject(patientData, ['ssn', 'dob', 'phone']);
 * await db.prepare('INSERT INTO patients (id, first_name, ssn, dob, phone) VALUES ...').run(
 *   encrypted.id,
 *   encrypted.first_name,
 *   encrypted.ssn,
 *   encrypted.dob,
 *   encrypted.phone
 * );
 *
 * // Retrieve and decrypt
 * const rows = await db.prepare('SELECT * FROM patients WHERE id = ?').all(patientId);
 * const decrypted = decryptResults(rows, ['ssn', 'dob', 'phone']);
 * // Now decrypted[0].ssn is readable
 */
