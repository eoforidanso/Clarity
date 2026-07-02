import { describe, it } from 'mocha';
import { expect } from 'chai';
import { evaluateRisk, RISK_THRESHOLD } from '../middleware/riskEngine.js';

describe('evaluateRisk', () => {

  // ── constants ──────────────────────────────────────────────────────────────

  describe('RISK_THRESHOLD', () => {
    it('is 75', () => {
      expect(RISK_THRESHOLD).to.equal(75);
    });
  });

  // ── clean request (no anomalies) ───────────────────────────────────────────

  describe('clean request decay', () => {
    it('decays score by 5 when all signals are absent', () => {
      const { risk, action } = evaluateRisk({ riskScore: 50 });
      expect(risk).to.equal(45);
      expect(action).to.equal('allow');
    });

    it('floors at 0 — never goes negative', () => {
      expect(evaluateRisk({ riskScore: 3 }).risk).to.equal(0);
      expect(evaluateRisk({ riskScore: 0 }).risk).to.equal(0);
    });

    it('allows a fresh session with no signals', () => {
      const { risk, action } = evaluateRisk({ riskScore: 0 });
      expect(risk).to.equal(0);
      expect(action).to.equal('allow');
    });

    it('treats explicit false signals as clean (decay, not increment)', () => {
      const { risk } = evaluateRisk({ riskScore: 20, ipChanged: false, uaChanged: false, deviceChanged: false, locationChanged: false });
      expect(risk).to.equal(15);
    });
  });

  // ── null-guard: first-request safety ──────────────────────────────────────

  describe('null/undefined signal safety', () => {
    it('undefined signals → clean request (no false positive on first login)', () => {
      const { risk, action } = evaluateRisk({
        riskScore: 0,
        ipChanged:       undefined,
        uaChanged:       undefined,
        deviceChanged:   undefined,
        locationChanged: undefined,
      });
      expect(risk).to.equal(0);
      expect(action).to.equal('allow');
    });

    it('null signals → clean request', () => {
      const { risk } = evaluateRisk({ riskScore: 10, ipChanged: null, uaChanged: null });
      expect(risk).to.equal(5); // decay only
    });
  });

  // ── individual anomaly weights ─────────────────────────────────────────────

  describe('anomaly scoring weights', () => {
    it('IP change adds +15', () => {
      expect(evaluateRisk({ riskScore: 0, ipChanged: true }).risk).to.equal(15);
    });

    it('UA change adds +10', () => {
      expect(evaluateRisk({ riskScore: 0, uaChanged: true }).risk).to.equal(10);
    });

    it('device change adds +25', () => {
      expect(evaluateRisk({ riskScore: 0, deviceChanged: true }).risk).to.equal(25);
    });

    it('location change adds +20', () => {
      expect(evaluateRisk({ riskScore: 0, locationChanged: true }).risk).to.equal(20);
    });

    it('all four signals stack (15+10+25+20 = 70)', () => {
      const { risk } = evaluateRisk({ riskScore: 0, ipChanged: true, uaChanged: true, deviceChanged: true, locationChanged: true });
      expect(risk).to.equal(70);
    });

    it('stacks on top of existing score', () => {
      expect(evaluateRisk({ riskScore: 30, ipChanged: true }).risk).to.equal(45);
    });

    it('caps at 100 regardless of how many anomalies stack', () => {
      const { risk } = evaluateRisk({ riskScore: 90, deviceChanged: true }); // would be 115
      expect(risk).to.equal(100);
    });
  });

  // ── threshold and action ──────────────────────────────────────────────────

  describe('threshold and action', () => {
    it('allows at exactly 75 — threshold is exclusive (> not >=)', () => {
      // 50 base + device(25) = 75 exactly → should be allow
      const { risk, action } = evaluateRisk({ riskScore: 50, deviceChanged: true });
      expect(risk).to.equal(75);
      expect(action).to.equal('allow');
    });

    it('triggers reauth at 76', () => {
      const { risk, action } = evaluateRisk({ riskScore: 51, deviceChanged: true });
      expect(risk).to.equal(76);
      expect(action).to.equal('reauth');
    });

    it('triggers reauth at 100', () => {
      expect(evaluateRisk({ riskScore: 100 }).action).to.equal('reauth');
    });

    it('allows at 74', () => {
      expect(evaluateRisk({ riskScore: 74, ipChanged: false }).action).to.equal('allow');
    });
  });

  // ── score accumulation across requests ────────────────────────────────────

  describe('score accumulation', () => {
    it('accumulates across 5 consecutive IP changes to reach 75', () => {
      let score = 0;
      for (let i = 0; i < 5; i++) {
        ({ risk: score } = evaluateRisk({ riskScore: score, ipChanged: true }));
      }
      expect(score).to.equal(75); // 5 × 15 = 75
    });

    it('decays back below threshold after clean requests', () => {
      let score = 80;
      for (let i = 0; i < 2; i++) {
        ({ risk: score } = evaluateRisk({ riskScore: score }));
      }
      expect(score).to.equal(70); // 80-5-5
      expect(evaluateRisk({ riskScore: score }).action).to.equal('allow');
    });

    it('anomaly during decay pauses / reverses decay', () => {
      let score = 50;
      // One clean request
      ({ risk: score } = evaluateRisk({ riskScore: score }));
      expect(score).to.equal(45);
      // Then an IP change
      ({ risk: score } = evaluateRisk({ riskScore: score, ipChanged: true }));
      expect(score).to.equal(60);
    });
  });
});
