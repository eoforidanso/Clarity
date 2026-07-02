import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { initializeDatabase } from '../db/database.js';
import authRoutes from '../routes/auth.js';
import patientRoutes from '../routes/patients.js';
import inboxRoutes from '../routes/inbox.js';
import { errorHandler } from '../middleware/errorHandler.js';

let app;
let authToken;

async function loginWith2FA(username, password) {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  if (res.status !== 200) throw new Error(`Login failed: ${res.status} ${JSON.stringify(res.body)}`);

  if (res.body.requiresMfa) {
    expect(res.body.tempToken).to.be.a('string');
    expect(res.body.mockCode).to.be.a('string');
    const verifyRes = await request(app)
      .post('/api/auth/mfa/verify')
      .send({ tempToken: res.body.tempToken, code: res.body.mockCode });
    expect(verifyRes.status).to.equal(200);
    return verifyRes.body;
  }

  expect(res.body.token).to.be.a('string');
  return res.body;
}

function createApp() {
  const testApp = express();
  testApp.use(cors());
  testApp.use(express.json());
  testApp.use('/api/auth', authRoutes);
  testApp.use('/api/patients', patientRoutes);
  testApp.use('/api/inbox', inboxRoutes);
  testApp.use(errorHandler);
  return testApp;
}

describe('Validation & Rate Limiting', function () {
  this.timeout(15000);

  before(async () => {
    await initializeDatabase();
    app = createApp();
    await new Promise(r => setTimeout(r, 1500));
    const data = await loginWith2FA('dr.chris', 'Pass123!');
    authToken = data.token;
  });

  // ── 1. Request validation ────────────────────────────────────────────────────
  describe('Request validation', () => {
    it('POST /api/auth/login with empty body → 400', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).to.equal(400);
      expect(res.body).to.have.property('error');
    });

    it('POST /api/auth/login with missing password → 400', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: 'dr.chris' });
      expect(res.status).to.equal(400);
      expect(res.body.error).to.be.a('string');
    });

    it('POST /api/auth/mfa/verify with missing body → 400', async () => {
      const res = await request(app).post('/api/auth/mfa/verify').send({});
      // Rate limiter runs first (allowed), then handler returns 400 for missing fields
      expect(res.status).to.equal(400);
      expect(res.body.error).to.include('required');
    });

    it('GET /api/auth/me without token → 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).to.equal(401);
    });

    it('GET /api/inbox without token → 401', async () => {
      const res = await request(app).get('/api/inbox');
      expect(res.status).to.equal(401);
    });
  });

  // ── 2. Response shape ────────────────────────────────────────────────────────
  describe('Response shape (MeResponseSchema)', () => {
    it('GET /api/auth/me returns user object with expected fields', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).to.equal(200);
      const { user } = res.body;
      expect(user).to.be.an('object');
      expect(user).to.have.property('id').that.is.a('string');
      expect(user).to.have.property('username').that.equals('dr.chris');
      expect(user).to.have.property('role').that.is.a('string');
      expect(user).to.have.property('firstName').that.is.a('string');
      expect(user).to.have.property('lastName').that.is.a('string');
    });
  });

  // ── 3. MFA rate limiting ─────────────────────────────────────────────────────
  describe('Rate limiting', () => {
    it('POST /api/auth/mfa/verify blocks after 5 attempts per minute (429)', async function () {
      // Use unique key isolation — supertest localhost IP is shared, so we need
      // to account for any prior attempts in this test run (mfa:verify test above
      // already consumed 1 attempt). Send enough requests to fill the window.
      // Limit is maxPerMinute: 5, maxPerHour: 20.
      let blocked = false;

      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post('/api/auth/mfa/verify')
          .send({ tempToken: 'invalid', code: '000000' });

        if (res.status === 429) {
          blocked = true;
          expect(res.body).to.have.property('error');
          expect(res.body).to.have.property('retryAfter').that.is.a('number');
          break;
        }
        // Before rate limit kicks in, expect 400 (bad tempToken) or 401
        expect([400, 401]).to.include(res.status);
      }

      expect(blocked).to.be.true;
    });

    it('POST /api/auth/login blocks after 5 attempts per minute from same IP (429)', async function () {
      // The login rate limiter (rateLimitLoginByIp) allows 5/min.
      // We've already made login attempts earlier — at least the initial loginWith2FA
      // and the two validation tests above. Keep sending until we hit 429.
      let blocked = false;

      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ username: 'nobody', password: 'wrong' });

        if (res.status === 429) {
          blocked = true;
          expect(res.body).to.have.property('error');
          expect(res.body).to.have.property('retryAfter').that.is.a('number');
          break;
        }
        expect([401, 400]).to.include(res.status);
      }

      expect(blocked).to.be.true;
    });
  });
});
