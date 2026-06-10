import { db } from '../db/database.js';
import { RefillService } from './RefillService.js';

export class InsuranceEligibilityService {
  // Check eligibility - currently mock, Phase 2C+ will integrate real APIs
  static async checkEligibility(patientId, medicationId = null) {
    // Check cache first (valid for 24 hours)
    const cached = await db.prepare(`
      SELECT * FROM insurance_eligibility_cache
      WHERE patient_id = ? AND expires_at > NOW()
      ORDER BY checked_at DESC LIMIT 1
    `).get(patientId);

    if (cached) {
      return {
        eligible: cached.is_eligible,
        copayAmount: cached.copay_amount,
        coverageType: cached.coverage_type,
        deductible: cached.deductible,
        outOfPocket: cached.out_of_pocket,
        cached: true,
        cachedAt: cached.checked_at,
      };
    }

    // Get patient insurance info
    const patient = await db.prepare(`
      SELECT * FROM patients WHERE id = ?
    `).get(patientId);

    if (!patient) {
      throw new Error('Patient not found');
    }

    // Mock eligibility response - replace with real API in Phase 2C
    const mockResult = this._getMockEligibility(patient);

    // Cache result for 24 hours
    await db.prepare(`
      INSERT INTO insurance_eligibility_cache (
        patient_id, insurance_name, member_id, group_number,
        is_eligible, coverage_type, copay_amount, deductible, out_of_pocket,
        expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW() + INTERVAL '24 hours')
    `).run(
      patientId,
      mockResult.insuranceName,
      mockResult.memberId,
      mockResult.groupNumber,
      mockResult.eligible,
      mockResult.coverageType,
      mockResult.copayAmount,
      mockResult.deductible,
      mockResult.outOfPocket
    );

    return {
      ...mockResult,
      cached: false,
    };
  }

  // Get copay amount for patient
  static async getCopayAmount(patientId) {
    const eligibility = await this.checkEligibility(patientId);
    return eligibility.copayAmount;
  }

  // Check if patient has active coverage
  static async isPatientEligible(patientId) {
    const eligibility = await this.checkEligibility(patientId);
    return eligibility.eligible;
  }

  // Invalidate cache (call after insurance change)
  static async invalidateCache(patientId) {
    await db.prepare(`
      DELETE FROM insurance_eligibility_cache WHERE patient_id = ?
    `).run(patientId);
  }

  // Get eligibility for refill
  static async checkRefillEligibility(refillId) {
    const refill = await RefillService.getRefill(refillId);
    if (!refill) throw new Error('Refill not found');

    const eligibility = await this.checkEligibility(refill.patient_id);

    // Update refill with copay if eligible
    if (eligibility.eligible && eligibility.copayAmount) {
      await RefillService.updateStatus(refillId, refill.status, {
        copayAmount: eligibility.copayAmount,
        verified: true,
      });
    }

    return eligibility;
  }

  // Real API integration templates for Phase 2C+

  // Change Healthcare API
  static async checkViaChangeHealthcare(memberId, groupNumber, patientDOB) {
    // TODO: Implement Change Healthcare API
    // const response = await fetch('https://api.changehealthcare.com/eligibility', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.CHANGE_HEALTHCARE_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     memberId,
    //     groupNumber,
    //     patientDOB,
    //   }),
    // });
    // return response.json();
  }

  // Optum API
  static async checkViaOptum(memberId, groupNumber) {
    // TODO: Implement Optum API
  }

  // eviCore API (for specialty pharmacy)
  static async checkViaEviCore(memberId, medicationCode) {
    // TODO: Implement eviCore API
  }

  // Mock eligibility data generator
  static _getMockEligibility(patient) {
    // Generate consistent mock data based on patient ID
    const mockCopayOptions = [0, 10, 15, 20, 25, 30, 40, 50];
    const copayIndex = (patient.id % mockCopayOptions.length);
    const copay = mockCopayOptions[copayIndex];

    return {
      insuranceName: 'Blue Cross Blue Shield',
      memberId: `BCB${String(patient.id).padStart(8, '0')}`,
      groupNumber: `GRP${String(patient.id % 100000).padStart(5, '0')}`,
      eligible: true,
      coverageType: 'pharmacy',
      copayAmount: copay,
      deductible: 500,
      deductibleMet: Math.random() * 500,
      outOfPocket: 2000,
      requiresPreauth: false,
      priorAuthDays: 0,
    };
  }

  // Get all cached eligibility records for admin dashboard
  static async getCachedEligibility(limit = 50, offset = 0) {
    return db.prepare(`
      SELECT e.*, p.first_name, p.last_name, p.email
      FROM insurance_eligibility_cache e
      JOIN patients p ON e.patient_id = p.id
      WHERE e.expires_at > NOW()
      ORDER BY e.checked_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
  }

  // Clear expired cache entries
  static async clearExpiredCache() {
    const result = await db.prepare(`
      DELETE FROM insurance_eligibility_cache WHERE expires_at < NOW()
    `).run();

    console.log(`[InsuranceEligibilityService] Cleared ${result.changes} expired cache entries`);
    return result.changes;
  }
}
