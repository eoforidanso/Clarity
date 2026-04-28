import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { initializeDatabase } from '../db/database.js';
import authRoutes from '../routes/auth.js';
import patientRoutes from '../routes/patients.js';
import clinicalRoutes from '../routes/clinical.js';
import medicationRoutes from '../routes/medications.js';
import orderRoutes from '../routes/orders.js';
import encounterRoutes from '../routes/encounters.js';
import fhirRoutes from '../routes/fhir.js';
import documentRoutes from '../routes/documents.js';
import auditLogRoutes from '../routes/auditLog.js';
import { errorHandler } from '../middleware/errorHandler.js';

let app;
let authToken;
let adminToken;

// Build test app
function createApp() {
  const testApp = express();
  testApp.use(cors());
  testApp.use(express.json());
  testApp.use('/api/auth', authRoutes);
  testApp.use('/api/patients', patientRoutes);
  testApp.use('/api/patients', clinicalRoutes);
  testApp.use('/api/patients', medicationRoutes);
  testApp.use('/api/patients', orderRoutes);
  testApp.use('/api/patients', encounterRoutes);
  testApp.use('/api/fhir', fhirRoutes);
  testApp.use('/api/documents', documentRoutes);
  testApp.use('/api/audit-log', auditLogRoutes);
  testApp.use(errorHandler);
  return testApp;
}

describe('Clarity EHR Backend Tests', function() {
  this.timeout(15000);

  before(async () => {
    await initializeDatabase();
    app = createApp();

    // Seed test data by running the seed
    const seedModule = await import('../db/seed.js');
    // seed() is called automatically, wait for DB
    await new Promise(r => setTimeout(r, 2000));
  });

  // ═══════════════════════════════════════════════════════
  // 1. Authentication Tests
  // ═══════════════════════════════════════════════════════
  describe('Authentication', () => {

    it('should reject login with missing credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).to.equal(400);
      expect(res.body.error).to.include('required');
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: 'dr.chris', password: 'wrong' });
      expect(res.status).to.equal(401);
      expect(res.body.error).to.include('Invalid');
    });

    it('should login as prescriber (dr.chris)', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: 'dr.chris', password: 'Pass123!' });
      expect(res.status).to.equal(200);
      expect(res.body.token).to.be.a('string');
      expect(res.body.user.role).to.equal('prescriber');
      expect(res.body.user.firstName).to.equal('Chris');
      authToken = res.body.token;
    });

    it('should login as admin', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'Pass123!' });
      expect(res.status).to.equal(200);
      expect(res.body.user.role).to.equal('admin');
      adminToken = res.body.token;
    });

    it('should login as therapist (april.t)', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: 'april.t', password: 'Pass123!' });
      expect(res.status).to.equal(200);
      expect(res.body.user.role).to.equal('therapist');
    });

    it('should get current user with valid token', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
      expect(res.body.user.username).to.equal('dr.chris');
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).to.equal(401);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid_token');
      expect(res.status).to.equal(401);
    });

    it('should logout successfully', async () => {
      const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
    });

    it('should verify EPCS PIN', async () => {
      // Re-login to get fresh token
      const loginRes = await request(app).post('/api/auth/login').send({ username: 'dr.chris', password: 'Pass123!' });
      authToken = loginRes.body.token;

      const res = await request(app).post('/api/auth/verify-epcs-pin').set('Authorization', `Bearer ${authToken}`).send({ pin: '9921' });
      expect(res.status).to.equal(200);
      expect(res.body.valid).to.equal(true);
    });

    it('should reject wrong EPCS PIN', async () => {
      const res = await request(app).post('/api/auth/verify-epcs-pin').set('Authorization', `Bearer ${authToken}`).send({ pin: '0000' });
      expect(res.status).to.equal(200);
      expect(res.body.valid).to.equal(false);
    });

    it('should generate and verify EPCS OTP', async () => {
      const genRes = await request(app).post('/api/auth/generate-epcs-otp').set('Authorization', `Bearer ${authToken}`);
      expect(genRes.status).to.equal(200);
      expect(genRes.body.otp).to.be.a('string').with.lengthOf(6);

      const verRes = await request(app).post('/api/auth/verify-epcs-otp').set('Authorization', `Bearer ${authToken}`).send({ otp: genRes.body.otp });
      expect(verRes.status).to.equal(200);
      expect(verRes.body.valid).to.equal(true);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 2. Patient API Tests
  // ═══════════════════════════════════════════════════════
  describe('Patients', () => {
    it('should list patients', async () => {
      const res = await request(app).get('/api/patients').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(res.body.length).to.be.greaterThan(0);
    });

    it('should get a specific patient', async () => {
      const res = await request(app).get('/api/patients/p1').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
      expect(res.body.first_name || res.body.firstName).to.exist;
    });

    it('should search patients by name', async () => {
      const res = await request(app).get('/api/patients?search=Anderson').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 3. Clinical Data Tests
  // ═══════════════════════════════════════════════════════
  describe('Clinical Data', () => {
    it('should list allergies for a patient', async () => {
      const res = await request(app).get('/api/patients/p1/allergies').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should list problems for a patient', async () => {
      const res = await request(app).get('/api/patients/p1/problems').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should list vitals for a patient', async () => {
      const res = await request(app).get('/api/patients/p1/vitals').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 4. Medication Tests
  // ═══════════════════════════════════════════════════════
  describe('Medications', () => {
    it('should list medications for a patient', async () => {
      const res = await request(app).get('/api/patients/p1/medications').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(res.body.length).to.be.greaterThan(0);
    });

    it('should create a new medication', async () => {
      const res = await request(app).post('/api/patients/p1/medications').set('Authorization', `Bearer ${authToken}`).send({
        name: 'Test Medication', dose: '10mg', route: 'Oral', frequency: 'Daily', status: 'Active',
      });
      expect(res.status).to.be.oneOf([200, 201]);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 5. Order Tests
  // ═══════════════════════════════════════════════════════
  describe('Orders', () => {
    it('should list orders for a patient', async () => {
      const res = await request(app).get('/api/patients/p1/orders').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should create an order', async () => {
      const res = await request(app).post('/api/patients/p1/orders').set('Authorization', `Bearer ${authToken}`).send({
        type: 'Lab', description: 'Test Lab Order', priority: 'Routine',
      });
      expect(res.status).to.be.oneOf([200, 201]);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 6. Encounter Tests
  // ═══════════════════════════════════════════════════════
  describe('Encounters', () => {
    it('should list encounters for a patient', async () => {
      const res = await request(app).get('/api/patients/p1/encounters').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 7. FHIR R4 API Tests
  // ═══════════════════════════════════════════════════════
  describe('FHIR R4 API', () => {
    it('should return CapabilityStatement', async () => {
      const res = await request(app).get('/api/fhir/metadata');
      expect(res.status).to.equal(200);
      expect(res.body.resourceType).to.equal('CapabilityStatement');
      expect(res.body.fhirVersion).to.equal('4.0.1');
    });

    it('should search FHIR Patients', async () => {
      const res = await request(app).get('/api/fhir/Patient').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
      expect(res.body.resourceType).to.equal('Bundle');
      expect(res.body.entry).to.be.an('array');
      if (res.body.entry.length > 0) {
        expect(res.body.entry[0].resource.resourceType).to.equal('Patient');
      }
    });

    it('should get a FHIR Patient by ID', async () => {
      const res = await request(app).get('/api/fhir/Patient/p1').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
      expect(res.body.resourceType).to.equal('Patient');
      expect(res.body.id).to.equal('p1');
    });

    it('should search FHIR Conditions for a patient', async () => {
      const res = await request(app).get('/api/fhir/Condition?patient=p1').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
      expect(res.body.resourceType).to.equal('Bundle');
    });

    it('should search FHIR Observations for a patient', async () => {
      const res = await request(app).get('/api/fhir/Observation?patient=p1').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
      expect(res.body.resourceType).to.equal('Bundle');
    });

    it('should search FHIR MedicationStatements for a patient', async () => {
      const res = await request(app).get('/api/fhir/MedicationStatement?patient=p1').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
      expect(res.body.resourceType).to.equal('Bundle');
    });

    it('should search FHIR AllergyIntolerances for a patient', async () => {
      const res = await request(app).get('/api/fhir/AllergyIntolerance?patient=p1').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
      expect(res.body.resourceType).to.equal('Bundle');
    });

    it('should search FHIR Encounters for a patient', async () => {
      const res = await request(app).get('/api/fhir/Encounter?patient=p1').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
      expect(res.body.resourceType).to.equal('Bundle');
    });

    it('should return 404 for unknown FHIR Patient', async () => {
      const res = await request(app).get('/api/fhir/Patient/nonexistent').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(404);
      expect(res.body.resourceType).to.equal('OperationOutcome');
    });
  });

  // ═══════════════════════════════════════════════════════
  // 8. Document Generation Tests
  // ═══════════════════════════════════════════════════════
  describe('Document Generation', () => {
    it('should generate a progress note', async () => {
      const res = await request(app).post('/api/documents/progress-note').set('Authorization', `Bearer ${authToken}`).send({
        encounterId: 'enc-hist-1', patientId: 'p1',
      });
      expect(res.status).to.equal(200);
      expect(res.body.type).to.equal('progress_note');
      expect(res.body.patient.name).to.include('Anderson');
      expect(res.body.sections).to.have.property('chiefComplaint');
      expect(res.body.signature).to.exist;
    });

    it('should generate a prescription document', async () => {
      const res = await request(app).post('/api/documents/prescription').set('Authorization', `Bearer ${authToken}`).send({
        medicationId: 'm1', patientId: 'p1',
      });
      expect(res.status).to.equal(200);
      expect(res.body.type).to.equal('prescription');
      expect(res.body.medication.name).to.include('Sertraline');
    });

    it('should generate a patient summary (CCD)', async () => {
      const res = await request(app).post('/api/documents/patient-summary').set('Authorization', `Bearer ${authToken}`).send({ patientId: 'p1' });
      expect(res.status).to.equal(200);
      expect(res.body.type).to.equal('patient_summary');
      expect(res.body.activeProblems).to.be.an('array');
      expect(res.body.activeMedications).to.be.an('array');
      expect(res.body.allergies).to.be.an('array');
    });

    it('should generate a discharge summary', async () => {
      const res = await request(app).post('/api/documents/discharge-summary').set('Authorization', `Bearer ${authToken}`).send({
        patientId: 'p1', encounterId: 'enc-hist-1', dischargePlan: 'Continue outpatient therapy',
      });
      expect(res.status).to.equal(200);
      expect(res.body.type).to.equal('discharge_summary');
    });

    it('should reject progress note with missing params', async () => {
      const res = await request(app).post('/api/documents/progress-note').set('Authorization', `Bearer ${authToken}`).send({});
      expect(res.status).to.equal(400);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 9. Audit Log Tests
  // ═══════════════════════════════════════════════════════
  describe('Audit Log', () => {
    it('should have audit entries from login/actions', async () => {
      const res = await request(app).get('/api/audit-log').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      // Should have at least login entries
      expect(res.body.length).to.be.greaterThan(0);
    });

    it('should filter audit log by action', async () => {
      const res = await request(app).get('/api/audit-log?action=LOGIN').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should restrict audit log to admin role', async () => {
      // Try with prescriber token (should fail)
      const res = await request(app).get('/api/audit-log').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(403);
    });
  });
});
