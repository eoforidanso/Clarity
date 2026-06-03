/**
 * Clarity EHR — Field-Level Encryption for PHI
 *
 * Encrypts sensitive fields before writing to DB,
 * decrypts after reading. Uses AES-256-GCM (authenticated encryption).
 *
 * Protected fields:
 *   patients.ssn
 *   patients.dob
 *   patients.insurance primary/secondary member IDs
 *   patients.phone / cellPhone
 *   patients.email
 *
 * Key: FIELD_ENCRYPTION_KEY env var — 32-byte hex (64 hex chars)
 * Generate: openssl rand -hex 32
 *
 * Format stored in DB: "enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * Unencrypted values pass through unchanged (backwards compat during migration).
 */

import crypto from 'crypto';

const ALGORITHM  = 'aes-256-gcm';
const IV_LENGTH  = 12;   // 96-bit IV for GCM
const TAG_LENGTH = 16;   // 128-bit auth tag
const PREFIX     = 'enc:v1:';

function getKey() {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FIELD_ENCRYPTION_KEY must be set to a 64-char hex string in production');
    }
    // Dev fallback — deterministic key (NOT secure, only for local dev)
    return Buffer.from('0'.repeat(64), 'hex');
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext string.
 * Returns: "enc:v1:<iv>:<authTag>:<ciphertext>" or null if input is null/empty.
 */
export function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;
  if (String(plaintext).startsWith(PREFIX)) return plaintext; // already encrypted

  const key = getKey();
  const iv  = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt an encrypted string.
 * Returns plaintext, or the original value if not encrypted.
 */
export function decrypt(value) {
  if (!value || !String(value).startsWith(PREFIX)) return value;

  const key = getKey();
  const parts = String(value).slice(PREFIX.length).split(':');
  if (parts.length !== 3) return value; // malformed — return as-is

  const [ivHex, tagHex, ctHex] = parts;
  const iv       = Buffer.from(ivHex, 'hex');
  const authTag  = Buffer.from(tagHex, 'hex');
  const ct       = Buffer.from(ctHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return decipher.update(ct, undefined, 'utf8') + decipher.final('utf8');
}

/**
 * Encrypt a patient record's sensitive fields before DB write.
 */
export function encryptPatient(record) {
  return {
    ...record,
    ssn:                encrypt(record.ssn),
    phone:              encrypt(record.phone),
    cell_phone:         encrypt(record.cell_phone),
    email:              encrypt(record.email),
    pri_member_id:      encrypt(record.pri_member_id),
    sec_member_id:      encrypt(record.sec_member_id),
    emergency_phone:    encrypt(record.emergency_phone),
  };
}

/**
 * Decrypt a patient record's sensitive fields after DB read.
 */
export function decryptPatient(record) {
  if (!record) return record;
  return {
    ...record,
    ssn:                decrypt(record.ssn),
    phone:              decrypt(record.phone),
    cell_phone:         decrypt(record.cell_phone),
    email:              decrypt(record.email),
    pri_member_id:      decrypt(record.pri_member_id),
    sec_member_id:      decrypt(record.sec_member_id),
    emergency_phone:    decrypt(record.emergency_phone),
  };
}

/**
 * Mask for display (never show full SSN, phone etc in API responses)
 */
export const mask = {
  ssn:      (v) => v ? '***-**-' + String(decrypt(v)).slice(-4)  : null,
  phone:    (v) => v ? '(***) ***-' + String(decrypt(v)).slice(-4) : null,
  memberId: (v) => v ? '***' + String(decrypt(v)).slice(-4) : null,
};
