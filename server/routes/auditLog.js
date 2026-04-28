import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getAuditLog } from '../middleware/auditLog.js';

const router = Router();

// GET /api/audit-log — front_desk only
router.get('/', authenticate, authorize('front_desk'), (req, res) => {
  const { userId, patientId, action, startDate, endDate, limit, offset } = req.query;
  const entries = getAuditLog({
    userId,
    patientId,
    action,
    startDate,
    endDate,
    limit: parseInt(limit) || 100,
    offset: parseInt(offset) || 0,
  });
  res.json(entries);
});

// GET /api/audit-log/patient/:patientId — who accessed a patient's chart
router.get('/patient/:patientId', authenticate, (req, res) => {
  const entries = getAuditLog({
    patientId: req.params.patientId,
    limit: parseInt(req.query.limit) || 50,
    offset: parseInt(req.query.offset) || 0,
  });
  res.json(entries);
});

// GET /api/audit-log/user/:userId — all actions by a user
router.get('/user/:userId', authenticate, authorize('front_desk'), (req, res) => {
  const entries = getAuditLog({
    userId: req.params.userId,
    limit: parseInt(req.query.limit) || 50,
    offset: parseInt(req.query.offset) || 0,
  });
  res.json(entries);
});

export default router;
