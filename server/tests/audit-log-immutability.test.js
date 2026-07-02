import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import { db } from '../db/database.js';
import { logAudit } from '../db/softDelete.js';

describe('Audit Log Immutability', () => {
  const testLogId = 'audit-test-' + Date.now();

  before(async () => {
    // Ensure table exists and migrations have run
    try {
      await db.prepare(`SELECT 1 FROM audit_log_immutable LIMIT 1`).get();
    } catch (err) {
      throw new Error('audit_log_immutable table not found. Run migrations first.');
    }
  });

  describe('INSERT operations', () => {
    it('should insert audit logs into immutable table', async () => {
      await logAudit({
        actorId: 'test-user-1',
        actorName: 'Test Actor',
        action: 'TEST_INSERT',
        targetId: 'target-123',
        targetType: 'patient',
        details: { test: true },
        ip: '192.168.1.1'
      });

      const record = await db.prepare(`
        SELECT * FROM audit_log_immutable
        WHERE action = 'TEST_INSERT'
        ORDER BY created_at DESC LIMIT 1
      `).get();

      expect(record).to.exist;
      expect(record.action).to.equal('TEST_INSERT');
      expect(record.user_id).to.equal('test-user-1');
      expect(record.user_name).to.equal('Test Actor');
      expect(record.patient_id).to.equal('target-123');
      expect(record.resource_type).to.equal('patient');
      expect(record.ip_address).to.equal('192.168.1.1');
    });
  });

  describe('DELETE protection', () => {
    it('should prevent DELETE on immutable table', async () => {
      // Insert a test record
      await db.prepare(`
        INSERT INTO audit_log_immutable (id, action, resource_type, patient_id, user_id, user_name, ip_address, details)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `).run(testLogId, 'TEST_ACTION', 'test', 'test-123', 'test-user', 'Test', '127.0.0.1', '{}');

      // Try to delete it
      try {
        await db.prepare(`
          DELETE FROM audit_log_immutable WHERE id = $1
        `).run(testLogId);
        throw new Error('DELETE should have been blocked by trigger');
      } catch (err) {
        expect(err.message).to.include('immutable and cannot be deleted');
      }
    });

    it('should verify record still exists after failed DELETE', async () => {
      const record = await db.prepare(`
        SELECT * FROM audit_log_immutable WHERE id = $1
      `).get(testLogId);

      expect(record).to.exist;
      expect(record.id).to.equal(testLogId);
    });
  });

  describe('UPDATE protection', () => {
    it('should prevent UPDATE on immutable table', async () => {
      const updateId = 'audit-update-test-' + Date.now();

      // Insert a test record
      await db.prepare(`
        INSERT INTO audit_log_immutable (id, action, resource_type, patient_id, user_id, user_name, ip_address, details)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `).run(updateId, 'TEST_UPDATE', 'test', 'test-123', 'test-user', 'Original', '127.0.0.1', '{}');

      // Try to update it
      try {
        await db.prepare(`
          UPDATE audit_log_immutable SET user_name = $1 WHERE id = $2
        `).run('Modified', updateId);
        throw new Error('UPDATE should have been blocked by trigger');
      } catch (err) {
        expect(err.message).to.include('immutable and cannot be updated');
      }
    });

    it('should verify record unchanged after failed UPDATE', async () => {
      const record = await db.prepare(`
        SELECT * FROM audit_log_immutable
        WHERE action = 'TEST_UPDATE'
        ORDER BY created_at DESC LIMIT 1
      `).get();

      expect(record).to.exist;
      expect(record.user_name).to.equal('Original');
    });
  });

  describe('View compatibility', () => {
    it('should map columns correctly in audit_logs view', async () => {
      // Insert via logAudit
      await logAudit({
        actorId: 'view-test-user',
        actorName: 'View Test',
        action: 'VIEW_TEST_ACTION',
        targetId: 'view-target-123',
        targetType: 'patient',
        details: { mapped: true },
        ip: '10.0.0.1'
      });

      // Read from view
      const viewRecord = await db.prepare(`
        SELECT * FROM audit_logs
        WHERE action = 'VIEW_TEST_ACTION'
        ORDER BY created_at DESC LIMIT 1
      `).get();

      expect(viewRecord).to.exist;
      expect(viewRecord.action).to.equal('VIEW_TEST_ACTION');
      expect(viewRecord.actor_id).to.equal('view-test-user');
      expect(viewRecord.actor_name).to.equal('View Test');
      expect(viewRecord.target_id).to.equal('view-target-123');
      expect(viewRecord.target_type).to.equal('patient');
      expect(viewRecord.ip).to.equal('10.0.0.1');
    });

    it('should allow SELECT from audit_logs view', async () => {
      const rows = await db.prepare(`
        SELECT COUNT(*) as cnt FROM audit_logs LIMIT 1
      `).get();

      expect(rows).to.exist;
      expect(rows.cnt).to.be.a('number');
    });
  });

  describe('Data integrity', () => {
    it('should preserve all fields through immutable table', async () => {
      const complexDetails = {
        reason: 'test',
        changes: [
          { field: 'name', old: 'John', new: 'Jane' },
          { field: 'email', old: 'john@test.com', new: 'jane@test.com' }
        ],
        timestamp: new Date().toISOString()
      };

      await logAudit({
        actorId: 'complex-user',
        actorName: 'Complex Test',
        action: 'COMPLEX_ACTION',
        targetId: 'complex-target-123',
        targetType: 'user',
        details: complexDetails,
        ip: '172.16.0.1'
      });

      const record = await db.prepare(`
        SELECT * FROM audit_log_immutable
        WHERE action = 'COMPLEX_ACTION'
        AND user_id = 'complex-user'
        ORDER BY created_at DESC LIMIT 1
      `).get();

      expect(record).to.exist;
      const storedDetails = JSON.parse(record.details);
      expect(storedDetails).to.deep.equal(complexDetails);
    });

    it('should handle NULL values correctly', async () => {
      await db.prepare(`
        INSERT INTO audit_log_immutable (id, action, resource_type, user_id, user_name, ip_address, details)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `).run('null-test-' + Date.now(), 'NULL_TEST', 'test', 'user1', 'User One', NULL, '{}');

      const record = await db.prepare(`
        SELECT * FROM audit_log_immutable
        WHERE action = 'NULL_TEST'
        ORDER BY created_at DESC LIMIT 1
      `).get();

      expect(record).to.exist;
      expect(record.patient_id).to.be.null;
      expect(record.ip_address).to.be.null;
    });
  });

  describe('Trigger enforcement', () => {
    it('should have DELETE trigger in place', async () => {
      const triggers = await db.prepare(`
        SELECT trigger_name FROM information_schema.triggers
        WHERE event_object_table = 'audit_log_immutable'
        AND event_manipulation = 'DELETE'
      `).all();

      expect(triggers).to.be.an('array');
      expect(triggers.length).to.be.greaterThan(0);
      expect(triggers.some(t => t.trigger_name.includes('delete'))).to.be.true;
    });

    it('should have UPDATE trigger in place', async () => {
      const triggers = await db.prepare(`
        SELECT trigger_name FROM information_schema.triggers
        WHERE event_object_table = 'audit_log_immutable'
        AND event_manipulation = 'UPDATE'
      `).all();

      expect(triggers).to.be.an('array');
      expect(triggers.length).to.be.greaterThan(0);
      expect(triggers.some(t => t.trigger_name.includes('update'))).to.be.true;
    });
  });
});
