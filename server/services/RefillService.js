import { db } from '../db/database.js';

export class RefillService {
  // Create a new refill record
  static async createRefill(patientId, medicationId, medicationName, dose, frequency, createdBy) {
    const result = await db.prepare(`
      INSERT INTO refills (
        patient_id, medication_id, medication_name, dose, frequency, created_by, status, priority
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'normal')
    `).run(patientId, medicationId, medicationName, dose, frequency, createdBy);

    return result.lastInsertRowid;
  }

  // Update refill status and track timestamp
  static async updateStatus(refillId, newStatus, metadata = {}) {
    const statusFields = {
      queued: 'queued_at',
      sent: 'sent_at',
      filled: 'filled_at',
    };

    const updateSql = statusFields[newStatus]
      ? `UPDATE refills SET status = ?, ${statusFields[newStatus]} = NOW(), updated_at = NOW() WHERE id = ?`
      : `UPDATE refills SET status = ?, updated_at = NOW() WHERE id = ?`;

    await db.prepare(updateSql).run(newStatus, refillId);

    // Add to audit trail
    await this.addAuditEvent(refillId, `Status changed to ${newStatus}`, metadata);
  }

  // Get refills by status with optional limit
  static async getRefillsByStatus(status, limit = 50, offset = 0) {
    const refills = await db.prepare(`
      SELECT r.*, p.first_name, p.last_name, p.date_of_birth
      FROM refills r
      JOIN patients p ON r.patient_id = p.id
      WHERE r.status = ? AND r.deleted_at IS NULL
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(status, limit, offset);

    return refills;
  }

  // Get single refill with full details
  static async getRefill(refillId) {
    const refill = await db.prepare(`
      SELECT r.*, p.first_name, p.last_name, p.phone, p.email, p.date_of_birth
      FROM refills r
      JOIN patients p ON r.patient_id = p.id
      WHERE r.id = ? AND r.deleted_at IS NULL
    `).get(refillId);

    if (!refill) return null;

    // Get associated notifications
    const notifications = await db.prepare(`
      SELECT * FROM refill_notifications WHERE refill_id = ?
    `).all(refillId);

    return { ...refill, notifications };
  }

  // Get refills for a patient
  static async getPatientRefills(patientId, limit = 50) {
    return db.prepare(`
      SELECT * FROM refills
      WHERE patient_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ?
    `).all(patientId, limit);
  }

  // Verify insurance eligibility
  static async verifyInsuranceEligibility(refillId) {
    const refill = await this.getRefill(refillId);
    if (!refill) throw new Error('Refill not found');

    // Check cache first
    const cached = await db.prepare(`
      SELECT * FROM insurance_eligibility_cache
      WHERE patient_id = ? AND expires_at > NOW()
      ORDER BY checked_at DESC LIMIT 1
    `).get(refill.patient_id);

    if (cached) {
      return {
        eligible: cached.is_eligible,
        copay: cached.copay_amount,
        coverageType: cached.coverage_type,
        checkTime: cached.checked_at,
      };
    }

    // Mock eligibility check - Phase 2C will integrate real APIs
    const mockEligibility = {
      eligible: true,
      copay: 30.00,
      coverageType: 'pharmacy',
      deductible: 500,
      deductibleMet: 250,
    };

    // Cache result for 24 hours
    await db.prepare(`
      INSERT INTO insurance_eligibility_cache (
        patient_id, insurance_name, is_eligible, coverage_type, copay_amount,
        deductible, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW() + INTERVAL '24 hours')
    `).run(
      refill.patient_id,
      'Mock Insurance',
      mockEligibility.eligible,
      mockEligibility.coverageType,
      mockEligibility.copay,
      mockEligibility.deductible
    );

    // Update refill with copay
    await db.prepare(`
      UPDATE refills SET copay_amount = ?, insurance_verified_at = NOW()
      WHERE id = ?
    `).run(mockEligibility.copay, refillId);

    return mockEligibility;
  }

  // Track notification for a refill
  static async createNotification(refillId, type, recipient, externalId = null) {
    const result = await db.prepare(`
      INSERT INTO refill_notifications (refill_id, type, recipient, status, external_id)
      VALUES (?, ?, ?, 'pending', ?)
    `).run(refillId, type, recipient, externalId);

    return result.lastInsertRowid;
  }

  // Update notification status
  static async updateNotificationStatus(notificationId, status, errorMessage = null) {
    const statusField = status === 'sent' ? 'sent_at' : status === 'delivered' ? 'delivered_at' : null;

    const sql = statusField
      ? `UPDATE refill_notifications SET status = ?, ${statusField} = NOW() WHERE id = ?`
      : `UPDATE refill_notifications SET status = ? WHERE id = ?`;

    await db.prepare(sql).run(status, notificationId);

    if (errorMessage) {
      await db.prepare(`
        UPDATE refill_notifications SET error_message = ? WHERE id = ?
      `).run(errorMessage, notificationId);
    }
  }

  // Add audit event
  static async addAuditEvent(refillId, event, metadata = {}) {
    const refill = await db.prepare(`
      SELECT audit_trail FROM refills WHERE id = ?
    `).get(refillId);

    const trail = refill?.audit_trail || [];
    trail.push({
      event,
      timestamp: new Date().toISOString(),
      ...metadata,
    });

    await db.prepare(`
      UPDATE refills SET audit_trail = ?::jsonb WHERE id = ?
    `).run(JSON.stringify(trail), refillId);
  }

  // Get audit trail
  static async getAuditTrail(refillId) {
    const refill = await db.prepare(`
      SELECT audit_trail FROM refills WHERE id = ?
    `).get(refillId);

    return refill?.audit_trail || [];
  }

  // Soft delete refill
  static async deleteRefill(refillId) {
    await db.prepare(`
      UPDATE refills SET deleted_at = NOW() WHERE id = ?
    `).run(refillId);
    await this.addAuditEvent(refillId, 'Refill deleted');
  }

  // Get refill stats
  static async getStats() {
    const stats = await db.prepare(`
      SELECT
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued,
        COUNT(CASE WHEN status = 'sent' AND DATE(sent_at) = CURRENT_DATE THEN 1 END) as sent_today,
        COUNT(*) as total
      FROM refills WHERE deleted_at IS NULL
    `).get();

    return stats;
  }
}
