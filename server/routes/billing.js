import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/auditLog.js';
import db from '../db/database.js';

const router = express.Router();

// ============= INSURANCE VERIFICATION =============

// Verify patient insurance eligibility
router.post('/insurance/verify', authenticate, auditMiddleware('INSURANCE_VERIFY', 'Patient'), async (req, res) => {
  try {
    const { patientId, insuranceType = 'primary' } = req.body;
    
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Simulate insurance verification (in real implementation, this would call insurance APIs)
    const insuranceInfo = insuranceType === 'primary' 
      ? JSON.parse(patient.insurance_primary_member_id ? `{"name":"${patient.insurance_primary_name}","memberId":"${patient.insurance_primary_member_id}","groupNumber":"${patient.insurance_primary_group_number}","copay":${patient.insurance_primary_copay}}` : '{}')
      : JSON.parse(patient.insurance_secondary_member_id ? `{"name":"${patient.insurance_secondary_name}","memberId":"${patient.insurance_secondary_member_id}","groupNumber":"${patient.insurance_secondary_group_number}","copay":${patient.insurance_secondary_copay}}` : '{}');

    if (!insuranceInfo.memberId) {
      return res.status(400).json({ error: 'No insurance information on file' });
    }

    // Simulate verification response
    const verificationResult = {
      patientId,
      insuranceType,
      verified: true,
      eligibilityDate: new Date().toISOString(),
      status: 'Active',
      effectiveDate: '2026-01-01',
      terminationDate: '2026-12-31',
      copay: insuranceInfo.copay || 0,
      deductible: Math.floor(Math.random() * 2000) + 500, // Simulate varying deductibles
      deductibleMet: Math.floor(Math.random() * 1000),
      outOfPocketMax: 5000,
      outOfPocketMet: Math.floor(Math.random() * 2000),
      mentalHealthBenefit: true,
      sessionLimit: 20, // Annual limit
      sessionsUsed: Math.floor(Math.random() * 10),
      priorAuthRequired: Math.random() > 0.7,
      verificationResponse: {
        responseCode: '00',
        responseDescription: 'Successful verification'
      }
    };

    // Store verification result
    const insertVerification = db.prepare(`
      INSERT INTO insurance_verifications (patient_id, insurance_type, verification_data, verified_at, verified_by)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    insertVerification.run(
      patientId,
      insuranceType,
      JSON.stringify(verificationResult),
      new Date().toISOString(),
      req.user.id
    );

    res.json(verificationResult);
  } catch (error) {
    console.error('Insurance verification error:', error);
    res.status(500).json({ error: 'Insurance verification failed' });
  }
});

// Get insurance verification history
router.get('/insurance/verification/:patientId', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const verifications = db.prepare(`
      SELECT * FROM insurance_verifications 
      WHERE patient_id = ? 
      ORDER BY verified_at DESC
    `).all(patientId);

    const parsedVerifications = verifications.map(v => ({
      ...v,
      verification_data: JSON.parse(v.verification_data)
    }));

    res.json(parsedVerifications);
  } catch (error) {
    console.error('Get verification history error:', error);
    res.status(500).json({ error: 'Failed to get verification history' });
  }
});

// ============= CLAIMS MANAGEMENT =============

// Generate claim for encounter
router.post('/claims/generate', authenticate, auditMiddleware('CLAIM_GENERATE', 'Claim'), async (req, res) => {
  try {
    const { encounterId, patientId, providerId } = req.body;
    
    // Get encounter details
    const encounter = db.prepare(`
      SELECT e.*, p.first_name, p.last_name, p.dob, p.gender, p.ssn,
             p.insurance_primary_name, p.insurance_primary_member_id,
             p.insurance_primary_group_number, p.insurance_primary_copay,
             pr.first_name as provider_first_name, pr.last_name as provider_last_name, pr.npi
      FROM encounters e
      JOIN patients p ON e.patient_id = p.id
      LEFT JOIN users pr ON e.provider = pr.id
      WHERE e.id = ? AND e.patient_id = ?
    `).get(encounterId, patientId);

    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    // Parse CPT codes and diagnoses
    const cptCodes = encounter.cpt_codes ? JSON.parse(encounter.cpt_codes) : [];
    const diagnoses = encounter.diagnoses ? JSON.parse(encounter.diagnoses) : [];

    if (!cptCodes.length || !diagnoses.length) {
      return res.status(400).json({ error: 'Encounter missing required billing codes' });
    }

    // Generate claim number
    const claimNumber = `CLM${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    // Calculate charges
    const totalCharges = cptCodes.reduce((sum, cpt) => {
      const charges = {
        '90792': 350, // Psychiatric diagnostic evaluation
        '90834': 150, // Psychotherapy 45 minutes
        '90837': 200, // Psychotherapy 60 minutes
        '90853': 120, // Group psychotherapy
        '99214': 180, // Office visit established patient
        '99213': 140, // Office visit established patient
        '96127': 25,  // Brief emotional/behavioral assessment
      };
      return sum + (charges[cpt.code] || 100);
    }, 0);

    const claimData = {
      claimNumber,
      patientId,
      encounterId,
      providerId: encounter.provider,
      providerNPI: encounter.npi || '1234567890',
      serviceDate: encounter.date,
      cptCodes,
      diagnoses,
      totalCharges,
      status: 'Generated',
      submissionDate: null,
      paidDate: null,
      paidAmount: 0,
      adjustments: 0,
      patientResponsibility: encounter.insurance_primary_copay || 0,
      insurancePayment: 0,
      createdAt: new Date().toISOString(),
      createdBy: req.user.id
    };

    // Store claim
    const insertClaim = db.prepare(`
      INSERT INTO claims (
        claim_number, patient_id, encounter_id, provider_id, provider_npi,
        service_date, cpt_codes, diagnoses, total_charges, status,
        patient_responsibility, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertClaim.run(
      claimNumber,
      patientId,
      encounterId,
      providerId,
      claimData.providerNPI,
      encounter.date,
      JSON.stringify(cptCodes),
      JSON.stringify(diagnoses),
      totalCharges,
      'Generated',
      claimData.patientResponsibility,
      claimData.createdAt,
      req.user.id
    );

    res.json(claimData);
  } catch (error) {
    console.error('Claim generation error:', error);
    res.status(500).json({ error: 'Failed to generate claim' });
  }
});

// Submit claims to insurance
router.post('/claims/submit', authenticate, auditMiddleware('CLAIM_SUBMIT', 'Claim'), async (req, res) => {
  try {
    const { claimIds } = req.body;
    
    if (!Array.isArray(claimIds) || claimIds.length === 0) {
      return res.status(400).json({ error: 'No claims specified for submission' });
    }

    const updateClaim = db.prepare(`
      UPDATE claims 
      SET status = 'Submitted', submission_date = ?, submitted_by = ?
      WHERE id = ?
    `);

    const submissionDate = new Date().toISOString();
    const results = [];

    for (const claimId of claimIds) {
      try {
        updateClaim.run(submissionDate, req.user.id, claimId);
        
        // Simulate submission result
        const submissionResult = {
          claimId,
          status: 'Submitted',
          submissionDate,
          confirmationNumber: `CONF${Date.now()}${claimId}`,
          estimatedProcessingTime: '14 days'
        };
        
        results.push(submissionResult);
      } catch (error) {
        results.push({
          claimId,
          status: 'Failed',
          error: error.message
        });
      }
    }

    res.json({
      submitted: results.filter(r => r.status === 'Submitted').length,
      failed: results.filter(r => r.status === 'Failed').length,
      results
    });
  } catch (error) {
    console.error('Claims submission error:', error);
    res.status(500).json({ error: 'Failed to submit claims' });
  }
});

// Get claims list with filters
router.get('/claims', authenticate, async (req, res) => {
  try {
    const { 
      patientId, 
      status, 
      dateFrom, 
      dateTo, 
      providerId,
      page = 1, 
      limit = 50 
    } = req.query;
    
    let query = `
      SELECT c.*, p.first_name, p.last_name, p.mrn,
             u.first_name as provider_first_name, u.last_name as provider_last_name
      FROM claims c
      JOIN patients p ON c.patient_id = p.id
      LEFT JOIN users u ON c.provider_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (patientId) {
      query += ' AND c.patient_id = ?';
      params.push(patientId);
    }
    
    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }
    
    if (dateFrom) {
      query += ' AND c.service_date >= ?';
      params.push(dateFrom);
    }
    
    if (dateTo) {
      query += ' AND c.service_date <= ?';
      params.push(dateTo);
    }
    
    if (providerId) {
      query += ' AND c.provider_id = ?';
      params.push(providerId);
    }
    
    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    const claims = db.prepare(query).all(...params);
    
    // Parse JSON fields
    const parsedClaims = claims.map(claim => ({
      ...claim,
      cpt_codes: claim.cpt_codes ? JSON.parse(claim.cpt_codes) : [],
      diagnoses: claim.diagnoses ? JSON.parse(claim.diagnoses) : []
    }));
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM claims c
      WHERE 1=1
    `;
    
    const countParams = params.slice(0, -2); // Remove limit and offset
    
    if (patientId) countQuery += ' AND c.patient_id = ?';
    if (status) countQuery += ' AND c.status = ?';
    if (dateFrom) countQuery += ' AND c.service_date >= ?';
    if (dateTo) countQuery += ' AND c.service_date <= ?';
    if (providerId) countQuery += ' AND c.provider_id = ?';
    
    const { total } = db.prepare(countQuery).get(...countParams);
    
    res.json({
      claims: parsedClaims,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ error: 'Failed to get claims' });
  }
});

// ============= PAYMENTS & COLLECTIONS =============

// Record payment
router.post('/payments', authenticate, auditMiddleware('PAYMENT_RECORD', 'Payment'), async (req, res) => {
  try {
    const {
      claimId,
      paymentType, // 'insurance', 'patient', 'adjustment'
      paymentMethod, // 'check', 'eft', 'cash', 'card'
      amount,
      checkNumber,
      adjustmentReason,
      notes
    } = req.body;

    if (!claimId || !paymentType || !amount) {
      return res.status(400).json({ error: 'Missing required payment fields' });
    }

    // Get claim
    const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Record payment
    const insertPayment = db.prepare(`
      INSERT INTO payments (
        claim_id, payment_type, payment_method, amount, check_number,
        adjustment_reason, notes, payment_date, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const paymentDate = new Date().toISOString();
    const paymentId = insertPayment.run(
      claimId,
      paymentType,
      paymentMethod,
      amount,
      checkNumber || null,
      adjustmentReason || null,
      notes || null,
      paymentDate,
      req.user.id
    ).lastInsertRowid;

    // Update claim totals
    const payments = db.prepare(`
      SELECT payment_type, SUM(amount) as total
      FROM payments 
      WHERE claim_id = ?
      GROUP BY payment_type
    `).all(claimId);

    let insurancePayment = 0;
    let patientPayment = 0;
    let adjustments = 0;

    payments.forEach(p => {
      switch (p.payment_type) {
        case 'insurance':
          insurancePayment += p.total;
          break;
        case 'patient':
          patientPayment += p.total;
          break;
        case 'adjustment':
          adjustments += p.total;
          break;
      }
    });

    const totalPaid = insurancePayment + patientPayment;
    const balance = claim.total_charges - totalPaid - adjustments;
    const newStatus = balance <= 0 ? 'Paid' : 'Partial Payment';

    // Update claim
    const updateClaim = db.prepare(`
      UPDATE claims 
      SET insurance_payment = ?, patient_payment = ?, adjustments = ?, 
          balance = ?, status = ?, paid_date = ?
      WHERE id = ?
    `);

    updateClaim.run(
      insurancePayment,
      patientPayment, 
      adjustments,
      balance,
      newStatus,
      balance <= 0 ? paymentDate : null,
      claimId
    );

    res.json({
      paymentId,
      claimId,
      paymentType,
      amount,
      newBalance: balance,
      claimStatus: newStatus
    });
  } catch (error) {
    console.error('Payment recording error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// ============= REPORTING & ANALYTICS =============

// Financial dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { period = 'month' } = req.query; // week, month, quarter, year
    
    const now = new Date();
    let dateFrom;
    
    switch (period) {
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        dateFrom = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        dateFrom = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    const dateFromStr = dateFrom.toISOString().split('T')[0];
    const dateToStr = now.toISOString().split('T')[0];

    // Revenue metrics
    const revenueMetrics = db.prepare(`
      SELECT 
        COUNT(*) as total_claims,
        SUM(total_charges) as gross_charges,
        SUM(insurance_payment + patient_payment) as total_payments,
        SUM(adjustments) as total_adjustments,
        SUM(balance) as outstanding_balance,
        AVG(total_charges) as avg_charge_per_claim
      FROM claims
      WHERE service_date BETWEEN ? AND ?
    `).get(dateFromStr, dateToStr);

    // Claims by status
    const claimsByStatus = db.prepare(`
      SELECT status, COUNT(*) as count, SUM(total_charges) as charges
      FROM claims
      WHERE service_date BETWEEN ? AND ?
      GROUP BY status
    `).all(dateFromStr, dateToStr);

    // Top procedures
    const topProcedures = db.prepare(`
      SELECT 
        json_extract(cpt_codes, '$[0].code') as cpt_code,
        json_extract(cpt_codes, '$[0].description') as description,
        COUNT(*) as count,
        SUM(total_charges) as total_charges
      FROM claims
      WHERE service_date BETWEEN ? AND ?
        AND json_valid(cpt_codes) = 1
      GROUP BY json_extract(cpt_codes, '$[0].code')
      ORDER BY count DESC
      LIMIT 10
    `).all(dateFromStr, dateToStr);

    // Provider productivity
    const providerStats = db.prepare(`
      SELECT 
        c.provider_id,
        u.first_name || ' ' || u.last_name as provider_name,
        COUNT(*) as encounter_count,
        SUM(c.total_charges) as gross_charges,
        SUM(c.insurance_payment + c.patient_payment) as collections
      FROM claims c
      LEFT JOIN users u ON c.provider_id = u.id
      WHERE c.service_date BETWEEN ? AND ?
      GROUP BY c.provider_id, provider_name
      ORDER BY gross_charges DESC
    `).all(dateFromStr, dateToStr);

    res.json({
      period,
      dateRange: { from: dateFromStr, to: dateToStr },
      metrics: {
        ...revenueMetrics,
        collection_rate: revenueMetrics.gross_charges > 0 
          ? ((revenueMetrics.total_payments / revenueMetrics.gross_charges) * 100).toFixed(1)
          : 0
      },
      claimsByStatus,
      topProcedures,
      providerStats
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ============= DENIAL MANAGEMENT =============

// Get denials with filtering
router.get('/denials', authenticate, async (req, res) => {
  try {
    const { db } = require('../db/database');
    const { status, priority, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (status) {
      whereClause += ' AND resolution_status = ?';
      params.push(status);
    }
    
    if (priority) {
      whereClause += ' AND priority = ?';
      params.push(priority);
    }
    
    const denials = db.prepare(`
      SELECT 
        dm.*,
        c.claim_number,
        c.patient_id,
        c.amount as claim_amount,
        p.first_name,
        p.last_name
      FROM denial_management dm
      JOIN claims c ON dm.claim_id = c.id
      JOIN patients p ON c.patient_id = p.id
      ${whereClause}
      ORDER BY dm.denial_date DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    
    const total = db.prepare(`
      SELECT COUNT(*) as count
      FROM denial_management dm
      JOIN claims c ON dm.claim_id = c.id
      ${whereClause}
    `).get(...params).count;
    
    res.json({
      success: true,
      denials,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching denials:', error);
    res.status(500).json({ error: 'Failed to fetch denials' });
  }
});

// Initiate denial appeal
router.post('/denials/:id/appeal', authenticate, auditMiddleware('DENIAL_APPEAL', 'Denial Management'), async (req, res) => {
  try {
    const { db } = require('../db/database');
    const { id } = req.params;
    const { appeal_notes, appeal_documents, priority } = req.body;
    
    // Update denial management record
    const result = db.prepare(`
      UPDATE denial_management 
      SET 
        resolution_status = 'appealing',
        appeal_notes = ?,
        appeal_documents = ?,
        priority = ?,
        appeal_date = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      appeal_notes,
      JSON.stringify(appeal_documents),
      priority || 'medium',
      new Date().toISOString(),
      new Date().toISOString(),
      id
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Denial not found' });
    }
    
    res.json({ success: true, message: 'Appeal initiated successfully' });
    
  } catch (error) {
    console.error('Error initiating appeal:', error);
    res.status(500).json({ error: 'Failed to initiate appeal' });
  }
});

// Update denial resolution
router.put('/denials/:id/resolve', authenticate, auditMiddleware('DENIAL_RESOLVE', 'Denial Management'), async (req, res) => {
  try {
    const { db } = require('../db/database');
    const { id } = req.params;
    const { resolution_notes, resolution_amount } = req.body;
    
    const result = db.prepare(`
      UPDATE denial_management 
      SET 
        resolution_status = 'resolved',
        resolution_notes = ?,
        resolution_amount = ?,
        resolution_date = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      resolution_notes,
      resolution_amount,
      new Date().toISOString(),
      new Date().toISOString(),
      id
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Denial not found' });
    }
    
    res.json({ success: true, message: 'Denial resolved successfully' });
    
  } catch (error) {
    console.error('Error resolving denial:', error);
    res.status(500).json({ error: 'Failed to resolve denial' });
  }
});

// ============= TELEHEALTH BILLING =============

// Create telehealth session billing
router.post('/telehealth/session-billing', authenticate, auditMiddleware('TELEHEALTH_BILLING', 'Telehealth Billing'), async (req, res) => {
  try {
    const { db } = require('../db/database');
    const { 
      session_id, 
      patient_id, 
      provider_id, 
      session_duration, 
      session_type, 
      platform_used,
      technology_fee,
      documentation_notes 
    } = req.body;
    
    // Get telehealth billing rates
    const telehealthRate = db.prepare(`
      SELECT * FROM fee_schedule 
      WHERE service_type = ? AND payer_type = 'telehealth'
      LIMIT 1
    `).get(session_type);
    
    if (!telehealthRate) {
      return res.status(400).json({ 
        error: 'Telehealth billing rate not found for session type' 
      });
    }
    
    // Calculate billing amount based on duration and rate
    const baseAmount = telehealthRate.amount;
    const durationMultiplier = session_duration / 45; // Standard 45-minute session
    const totalAmount = (baseAmount * durationMultiplier) + (technology_fee || 0);
    
    // Create telehealth billing record
    const billingRecord = db.prepare(`
      INSERT INTO telehealth_billing (
        session_id,
        patient_id,
        provider_id,
        session_duration,
        session_type,
        platform_used,
        base_amount,
        technology_fee,
        total_amount,
        billing_status,
        documentation_notes,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session_id,
      patient_id,
      provider_id,
      session_duration,
      session_type,
      platform_used,
      baseAmount,
      technology_fee || 0,
      totalAmount,
      'pending',
      documentation_notes,
      new Date().toISOString()
    );
    
    // Auto-generate claim if configured
    const practiceSettings = db.prepare(`
      SELECT auto_telehealth_billing FROM practice_settings LIMIT 1
    `).get();
    
    if (practiceSettings?.auto_telehealth_billing) {
      // Create claim automatically
      const claimNumber = `TH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      db.prepare(`
        INSERT INTO claims (
          claim_number,
          patient_id,
          provider_id,
          encounter_id,
          service_type,
          amount,
          status,
          submission_date,
          created_at,
          claim_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        claimNumber,
        patient_id,
        provider_id,
        session_id,
        session_type,
        totalAmount,
        'draft',
        new Date().toISOString(),
        new Date().toISOString(),
        'telehealth'
      );
    }
    
    res.json({ 
      success: true, 
      billing_id: billingRecord.lastInsertRowid,
      total_amount: totalAmount,
      billing_status: 'pending'
    });
    
  } catch (error) {
    console.error('Error creating telehealth billing:', error);
    res.status(500).json({ error: 'Failed to create telehealth billing' });
  }
});

// Get telehealth billing history
router.get('/telehealth/billing-history/:patientId', authenticate, async (req, res) => {
  try {
    const { db } = require('../db/database');
    const { patientId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const telehealthBilling = db.prepare(`
      SELECT 
        tb.*,
        p.first_name,
        p.last_name,
        pr.first_name as provider_first_name,
        pr.last_name as provider_last_name
      FROM telehealth_billing tb
      JOIN patients p ON tb.patient_id = p.id
      JOIN providers pr ON tb.provider_id = pr.id
      WHERE tb.patient_id = ?
      ORDER BY tb.created_at DESC
      LIMIT ? OFFSET ?
    `).all(patientId, limit, offset);
    
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM telehealth_billing WHERE patient_id = ?
    `).get(patientId).count;
    
    res.json({
      success: true,
      billing_history: telehealthBilling,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching telehealth billing history:', error);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
});

// ============= PATIENT PORTAL BILLING =============

// Get patient statements
router.get('/patient-portal/statements/:patientId', authenticate, async (req, res) => {
  try {
    const { db } = require('../db/database');
    const { patientId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE ps.patient_id = ?';
    const params = [patientId];
    
    if (status) {
      whereClause += ' AND ps.status = ?';
      params.push(status);
    }
    
    const statements = db.prepare(`
      SELECT 
        ps.*,
        COUNT(psi.id) as item_count,
        COALESCE(SUM(psi.amount), 0) as total_amount
      FROM patient_statements ps
      LEFT JOIN patient_statement_items psi ON ps.id = psi.statement_id
      ${whereClause}
      GROUP BY ps.id
      ORDER BY ps.statement_date DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM patient_statements ${whereClause}
    `).get(...params).count;
    
    res.json({
      success: true,
      statements,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching patient statements:', error);
    res.status(500).json({ error: 'Failed to fetch statements' });
  }
});

// Get patient payment history
router.get('/patient-portal/payment-history/:patientId', authenticate, async (req, res) => {
  try {
    const { db } = require('../db/database');
    const { patientId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const payments = db.prepare(`
      SELECT 
        p.*,
        c.claim_number,
        c.service_type
      FROM payments p
      LEFT JOIN claims c ON p.claim_id = c.id
      WHERE p.patient_id = ?
      ORDER BY p.payment_date DESC
      LIMIT ? OFFSET ?
    `).all(patientId, limit, offset);
    
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM payments WHERE patient_id = ?
    `).get(patientId).count;
    
    res.json({
      success: true,
      payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Process patient portal payment
router.post('/patient-portal/payment', authenticate, auditMiddleware('PATIENT_PAYMENT', 'Patient Portal'), async (req, res) => {
  try {
    const { db } = require('../db/database');
    const { 
      patient_id, 
      statement_id, 
      amount, 
      payment_method, 
      card_last_four,
      transaction_id 
    } = req.body;
    
    // Validate payment amount against statement
    const statement = db.prepare(`
      SELECT * FROM patient_statements WHERE id = ? AND patient_id = ?
    `).get(statement_id, patient_id);
    
    if (!statement) {
      return res.status(404).json({ error: 'Statement not found' });
    }
    
    if (amount > statement.amount_due) {
      return res.status(400).json({ 
        error: 'Payment amount exceeds balance due' 
      });
    }
    
    // Record payment
    const payment = db.prepare(`
      INSERT INTO payments (
        patient_id,
        amount,
        payment_type,
        payment_method,
        payment_date,
        transaction_id,
        card_last_four,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      patient_id,
      amount,
      'patient',
      payment_method,
      new Date().toISOString(),
      transaction_id,
      card_last_four,
      'completed',
      new Date().toISOString()
    );
    
    // Update statement balance
    const newAmountDue = statement.amount_due - amount;
    const newStatus = newAmountDue <= 0 ? 'paid' : 'partial';
    
    db.prepare(`
      UPDATE patient_statements 
      SET amount_due = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(newAmountDue, newStatus, new Date().toISOString(), statement_id);
    
    res.json({ 
      success: true, 
      payment_id: payment.lastInsertRowid,
      remaining_balance: newAmountDue,
      status: newStatus
    });
    
  } catch (error) {
    console.error('Error processing patient payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// Generate patient statement
router.post('/patient-portal/generate-statement/:patientId', authenticate, auditMiddleware('STATEMENT_GENERATE', 'Patient Statements'), async (req, res) => {
  try {
    const { db } = require('../db/database');
    const { patientId } = req.params;
    const { statement_date } = req.body;
    
    // Get unpaid claims for patient
    const unpaidClaims = db.prepare(`
      SELECT 
        c.*,
        COALESCE(SUM(p.amount), 0) as paid_amount
      FROM claims c
      LEFT JOIN payments p ON c.id = p.claim_id
      WHERE c.patient_id = ? AND c.status NOT IN ('draft', 'cancelled')
      GROUP BY c.id
      HAVING c.amount > COALESCE(SUM(p.amount), 0)
    `).all(patientId);
    
    if (unpaidClaims.length === 0) {
      return res.status(400).json({ error: 'No outstanding balance found' });
    }
    
    // Calculate total amount due
    const totalAmountDue = unpaidClaims.reduce((total, claim) => {
      return total + (claim.amount - (claim.paid_amount || 0));
    }, 0);
    
    // Create patient statement
    const statement = db.prepare(`
      INSERT INTO patient_statements (
        patient_id,
        statement_number,
        statement_date,
        amount_due,
        due_date,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      patientId,
      `STMT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      statement_date || new Date().toISOString(),
      totalAmountDue,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      'outstanding',
      new Date().toISOString()
    );
    
    // Add statement items
    for (const claim of unpaidClaims) {
      const amountDue = claim.amount - (claim.paid_amount || 0);
      db.prepare(`
        INSERT INTO patient_statement_items (
          statement_id,
          claim_id,
          service_date,
          description,
          amount,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        statement.lastInsertRowid,
        claim.id,
        claim.service_date,
        `${claim.service_type} - ${claim.claim_number}`,
        amountDue,
        new Date().toISOString()
      );
    }
    
    res.json({ 
      success: true, 
      statement_id: statement.lastInsertRowid,
      amount_due: totalAmountDue,
      items_count: unpaidClaims.length
    });
    
  } catch (error) {
    console.error('Error generating patient statement:', error);
    res.status(500).json({ error: 'Failed to generate statement' });
  }
});

export default router;
