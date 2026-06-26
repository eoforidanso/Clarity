import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getAuditLog } from '../middleware/auditLog.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { AnyResponseSchema } from '../schemas/responseSchemas.js';

const router = Router();
router.use(authenticate); // RBAC: all routes require authentication
router.use(validateResponse(AnyResponseSchema));

// GET /api/audit-log
router.get('/', authenticate, authorize('admin', 'front_desk'), async (req, res) => {
  const { userId, patientId, action, startDate, endDate, limit, offset } = req.query;
  const entries = await getAuditLog({
    userId, patientId, action, startDate, endDate,
    facilityId: req.user.facility_id,
    isGlobal:   req.access.canSeeAll,
    limit: parseInt(limit) || 100,
    offset: parseInt(offset) || 0,
  });
  res.json(entries);
});

// GET /api/audit-log/patient/:patientId
router.get('/patient/:patientId', authenticate, async (req, res) => {
  const entries = await getAuditLog({
    patientId:  req.params.patientId,
    facilityId: req.user.facility_id,
    isGlobal:   req.access.canSeeAll,
    limit: parseInt(req.query.limit) || 50,
    offset: parseInt(req.query.offset) || 0,
  });
  res.json(entries);
});

// GET /api/audit-log/user/:userId
router.get('/user/:userId', authenticate, authorize('admin', 'front_desk'), async (req, res) => {
  const entries = await getAuditLog({
    userId:     req.params.userId,
    facilityId: req.user.facility_id,
    isGlobal:   req.access.canSeeAll,
    limit: parseInt(req.query.limit) || 50,
    offset: parseInt(req.query.offset) || 0,
  });
  res.json(entries);
});

export default router;
