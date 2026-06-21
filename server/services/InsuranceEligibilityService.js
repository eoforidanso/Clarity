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

    // Build eligibility from patient's actual insurance fields on file
    const result = this._eligibilityFromPatientRecord(patient);

    // Cache result for 24 hours
    await db.prepare(`
      INSERT INTO insurance_eligibility_cache (
        patient_id, insurance_name, member_id, group_number,
        is_eligible, coverage_type, copay_amount, deductible, out_of_pocket,
        expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW() + INTERVAL '24 hours')
    `).run(
      patientId,
      result.insuranceName,
      result.memberId,
      result.groupNumber,
      result.eligible,
      result.coverageType,
      result.copayAmount,
      result.deductible,
      result.outOfPocket
    );

    return {
      ...result,
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

  // Change Healthcare API — requires CHANGE_HEALTHCARE_CLIENT_ID + CHANGE_HEALTHCARE_CLIENT_SECRET
  static async checkViaChangeHealthcare(memberId, groupNumber, patientDOB) {
    const clientId = process.env.CHANGE_HEALTHCARE_CLIENT_ID;
    const clientSecret = process.env.CHANGE_HEALTHCARE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('Change Healthcare credentials not configured (CHANGE_HEALTHCARE_CLIENT_ID, CHANGE_HEALTHCARE_CLIENT_SECRET)');
    }
    // OAuth2 token exchange
    const tokenRes = await fetch('https://sandbox.apigee.changehealthcare.com/apip/auth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }).toString(),
    });
    if (!tokenRes.ok) throw new Error(`Change Healthcare auth failed: ${tokenRes.status}`);
    const { access_token } = await tokenRes.json();

    const eligRes = await fetch('https://sandbox.apigee.changehealthcare.com/medicalnetwork/eligibility/v3/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, groupNumber, dateOfBirth: patientDOB }),
    });
    if (!eligRes.ok) throw new Error(`Change Healthcare eligibility check failed: ${eligRes.status}`);
    return eligRes.json();
  }

  // Optum API — requires OPTUM_CLIENT_ID + OPTUM_CLIENT_SECRET
  static async checkViaOptum(memberId, groupNumber) {
    const clientId = process.env.OPTUM_CLIENT_ID;
    const clientSecret = process.env.OPTUM_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('Optum credentials not configured (OPTUM_CLIENT_ID, OPTUM_CLIENT_SECRET)');
    }
    const tokenRes = await fetch('https://api.optum.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }).toString(),
    });
    if (!tokenRes.ok) throw new Error(`Optum auth failed: ${tokenRes.status}`);
    const { access_token } = await tokenRes.json();

    const eligRes = await fetch('https://api.optum.com/v1/eligibility', {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, groupNumber }),
    });
    if (!eligRes.ok) throw new Error(`Optum eligibility check failed: ${eligRes.status}`);
    return eligRes.json();
  }

  // eviCore API (specialty pharmacy prior auth) — requires EVICORE_USERNAME + EVICORE_PASSWORD
  static async checkViaEviCore(memberId, medicationCode) {
    const username = process.env.EVICORE_USERNAME;
    const password = process.env.EVICORE_PASSWORD;
    if (!username || !password) {
      throw new Error('eviCore credentials not configured (EVICORE_USERNAME, EVICORE_PASSWORD)');
    }
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const res = await fetch('https://api.evicore.com/v1/authorization/check', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, serviceCode: medicationCode }),
    });
    if (!res.ok) throw new Error(`eviCore authorization check failed: ${res.status}`);
    return res.json();
  }

  // Build eligibility response from real patient insurance fields stored in the DB
  static _eligibilityFromPatientRecord(patient) {
    const name    = patient.insurance_primary_name || patient.insurance_name || '';
    const member  = patient.insurance_primary_member_id || patient.member_id || '';
    const group   = patient.insurance_primary_group_number || patient.group_number || '';
    const copay   = patient.insurance_primary_copay != null ? parseFloat(patient.insurance_primary_copay) : null;
    const hasIns  = Boolean(name);

    return {
      insuranceName:  name  || 'No insurance on file',
      memberId:       member,
      groupNumber:    group,
      eligible:       hasIns,
      coverageType:   'medical',
      copayAmount:    copay ?? 0,
      deductible:     null,
      deductibleMet:  null,
      outOfPocket:    null,
      requiresPreauth: false,
      priorAuthDays:  0,
      source:         'patient_record',
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
