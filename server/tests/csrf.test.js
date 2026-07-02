import { describe, it, before, afterEach } from 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import app from '../index.js';
import { db } from '../db/database.js';

describe('CSRF Token Protection', () => {
  let authToken;
  let csrfToken;
  let sessionId = 'test-session-' + Date.now();

  before(async () => {
    // Create test user and session
    await db.prepare(`
      INSERT INTO users (id, username, password_hash, email, first_name, last_name, role, location_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT DO NOTHING
    `).run('test-user-csrf', 'csrf_test', '$2a$10$hash', 'csrf@test.com', 'Test', 'User', 'provider', 'loc-1');

    await db.prepare(`
      INSERT INTO sessions (id, user_id, ip_address, user_agent, device_id, location_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `).run(sessionId, 'test-user-csrf', '127.0.0.1', 'Mozilla/5.0', 'device-1', 'loc-1');

    // Mock JWT token with session_id
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      {
        sub: 'test-user-csrf',
        session_id: sessionId,
        device_id: 'device-1',
        clinic_id: 'loc-1',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 28800
      },
      process.env.JWT_SECRET
    );
  });

  afterEach(async () => {
    // Cleanup
  });

  describe('GET /api/csrf-token', () => {
    it('should return a CSRF token when authenticated', async () => {
      const res = await request(app)
        .get('/api/csrf-token')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).to.have.property('token');
      expect(res.body).to.have.property('headerName', 'X-CSRF-Token');
      expect(res.body).to.have.property('expiresIn');
      csrfToken = res.body.token;
    });

    it('should reject unauthenticated requests', async () => {
      await request(app)
        .get('/api/csrf-token')
        .expect(401);
    });
  });

  describe('POST /api/patients (CSRF validation)', () => {
    it('should reject POST without CSRF token', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ first_name: 'John', last_name: 'Doe' })
        .expect(403);

      expect(res.body).to.have.property('error').include('CSRF token');
    });

    it('should reject POST with invalid CSRF token', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'invalid-token-12345')
        .send({ first_name: 'John', last_name: 'Doe' })
        .expect(403);

      expect(res.body).to.have.property('error').include('invalid or expired');
    });

    it('should accept POST with valid CSRF token', async () => {
      // Get fresh token
      const tokenRes = await request(app)
        .get('/api/csrf-token')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const freshToken = tokenRes.body.token;

      // POST with valid token (will fail for other reasons, but should pass CSRF check)
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', freshToken)
        .send({ first_name: 'John', last_name: 'Doe', dob: '1990-01-01', location_id: 'loc-1' });

      // Should NOT be 403 (CSRF error)
      expect(res.status).to.not.equal(403);
      expect(res.body).to.not.have.property('error', 'CSRF token missing');
    });

    it('should enforce one-time token use', async () => {
      // Get token
      const tokenRes = await request(app)
        .get('/api/csrf-token')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const oneTimeToken = tokenRes.body.token;

      // First request should use token successfully (or fail for other reasons)
      await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', oneTimeToken)
        .send({ first_name: 'John', last_name: 'Doe', dob: '1990-01-01', location_id: 'loc-1' });

      // Second request with same token should fail with CSRF error
      const replayRes = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', oneTimeToken)
        .send({ first_name: 'Jane', last_name: 'Smith', dob: '1995-05-05', location_id: 'loc-1' })
        .expect(403);

      expect(replayRes.body.error).to.include('invalid or expired');
    });

    it('should return new token in response header', async () => {
      // Get token
      const tokenRes = await request(app)
        .get('/api/csrf-token')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const token = tokenRes.body.token;

      // Use token and expect new one in header
      const postRes = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', token)
        .send({ first_name: 'John', last_name: 'Doe', dob: '1990-01-01', location_id: 'loc-1' });

      // Should have new token in response header
      expect(postRes.headers).to.have.property('x-new-csrf-token');
      expect(postRes.headers['x-new-csrf-token']).to.be.a('string');
      expect(postRes.headers['x-new-csrf-token']).to.not.equal(token);
    });

    it('should skip CSRF check for GET requests', async () => {
      await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('DELETE /api/patients/:id (CSRF validation)', () => {
    it('should reject DELETE without CSRF token', async () => {
      const res = await request(app)
        .delete('/api/patients/test-patient-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(res.body.error).to.include('CSRF token');
    });
  });
});
