import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate, authorize, requireElevated } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { logAuditEvent } from '../middleware/auditLog.js';
import { softDeleteLocation, ensureLocationHasNoDependencies, logAudit, activeScope } from '../db/softDelete.js';
import { CreateLocationSchema, UpdateLocationSchema } from '../schemas/locationSchema.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { LocationResponseSchema, LocationListResponseSchema } from '../schemas/responseSchemas.js';

const router = Router();
router.use(authenticate); // RBAC: all routes require authentication
const ADMIN_ROLES = ['admin'];
const VALID_TYPES = ['Primary', 'Satellite', 'Virtual'];
const VALID_STATUSES = ['Active', 'Inactive'];

function rowToObj(r) { return {
    id: r.id, name: r.name, shortName: r.short_name, address: r.address, phone: r.phone, fax: r.fax, hours: r.hours, type: r.type, status: r.status, npi: r.npi, taxId: r.tax_id, placeOfService: r.place_of_service, rooms: r.rooms, telehealth: !!r.telehealth, sortOrder: r.sort_order, createdAt: r.created_at, updatedAt: r.updated_at,  };
}

// ── GET /api/locations ──────────────────────────────────────────────────
// Public to authenticated users (all roles need to see the location list)
router.get('/', authenticate, validateResponse(LocationListResponseSchema), async (_req, res) => { const rows = await db.prepare(
    `SELECT * FROM locations WHERE ${activeScope } ORDER BY sort_order ASC, name ASC`
  ).all();
  res.json(rows.map(rowToObj));
});

// ── POST /api/locations ─────────────────────────────────────────────────
// Admin/front_desk only
router.post('/', authenticate, authorize(...ADMIN_ROLES), validate(CreateLocationSchema), validateResponse(LocationResponseSchema), async (req, res) => { const { name, shortName, address, phone, fax, hours, type, status, npi, taxId, placeOfService, rooms, telehealth, sortOrder } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 1) { return res.status(400).json({ error: 'Location name is required' });
  }
  if (type && !VALID_TYPES.includes(type)) { return res.status(400).json({ error: `Type must be one of: ${VALID_TYPES.join(', ') }` });
  }

  const id = uuidv4();
  await db.prepare(
    `INSERT INTO locations (id, name, short_name, address, phone, fax, hours, type, status, npi, tax_id, place_of_service, rooms, telehealth, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    name.trim(),
    (shortName || name).trim(),
    (address || '').trim(),
    (phone || '').trim(),
    (fax || '').trim(),
    (hours || '').trim(),
    type || 'Satellite',
    status || 'Active',
    (npi || '').trim(),
    (taxId || '').trim(),
    (placeOfService || '11 — Office').trim(),
    Number(rooms) || 0,
    telehealth !== false ? 1 : 0,
    Number(sortOrder) || 0
  );

  logAuditEvent({ userId: req.user.id, userName: `${req.user.first_name } ${ req.user.last_name || '' }`.trim(),
    userRole: req.user.role,
    action: 'LOCATION_CREATED',
    resourceType: 'location',
    resourceId: id,
    details: { name: name.trim() },
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
  });

  const created = await db.prepare('SELECT * FROM locations WHERE id = ?').get(id);
  res.status(201).json(rowToObj(created));
});

// ── PUT /api/locations/:id ──────────────────────────────────────────────
router.put('/:id', authenticate, authorize(...ADMIN_ROLES), validate(UpdateLocationSchema), validateResponse(LocationResponseSchema), async (req, res) => { const { id } = req.params;
  const loc = await db.prepare('SELECT id FROM locations WHERE id = ?').get(id);
  if (!loc) return res.status(404).json({ error: 'Location not found' });

  const { name, shortName, address, phone, fax, hours, type, status, npi, taxId, placeOfService, rooms, telehealth, sortOrder } = req.body;

  if (type && !VALID_TYPES.includes(type)) { return res.status(400).json({ error: `Type must be one of: ${VALID_TYPES.join(', ') }` });
  }
  if (status && !VALID_STATUSES.includes(status)) { return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ') }` });
  }

  await db.prepare(
    `UPDATE locations SET
       name             = COALESCE(?, name),
       short_name       = COALESCE(?, short_name),
       address          = COALESCE(?, address),
       phone            = COALESCE(?, phone),
       fax              = COALESCE(?, fax),
       hours            = COALESCE(?, hours),
       type             = COALESCE(?, type),
       status           = COALESCE(?, status),
       npi              = COALESCE(?, npi),
       tax_id           = COALESCE(?, tax_id),
       place_of_service = COALESCE(?, place_of_service),
       rooms            = COALESCE(?, rooms),
       telehealth       = COALESCE(?, telehealth),
       sort_order       = COALESCE(?, sort_order),
       updated_at       = NOW()
     WHERE id = ?`
  ).run(
    name?.trim() ?? null,
    shortName?.trim() ?? null,
    address?.trim() ?? null,
    phone?.trim() ?? null,
    fax?.trim() ?? null,
    hours?.trim() ?? null,
    type ?? null,
    status ?? null,
    npi?.trim() ?? null,
    taxId?.trim() ?? null,
    placeOfService?.trim() ?? null,
    rooms != null ? Number(rooms) : null,
    telehealth != null ? (telehealth ? 1 : 0) : null,
    sortOrder != null ? Number(sortOrder) : null,
    id
  );

  logAuditEvent({ userId: req.user.id, userName: `${req.user.first_name } ${ req.user.last_name || '' }`.trim(),
    userRole: req.user.role,
    action: 'LOCATION_UPDATED',
    resourceType: 'location',
    resourceId: id,
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
  });

  const updated = await db.prepare('SELECT * FROM locations WHERE id = ?').get(id);
  res.json(rowToObj(updated));
});

// ── DELETE /api/locations/:id (soft delete) ─────────────────────────────
router.delete('/:id', authenticate, requireElevated, async (req, res) => { if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { id } = req.params;
  const actorName = `${ req.user.first_name } ${ req.user.last_name || '' }`.trim();

  try { const loc = await db.prepare(`SELECT id, name FROM locations WHERE id = $1 AND ${activeScope }`).get(id);
    if (!loc) return res.status(404).json({ error: 'Location not found' });

    // Prevent deleting the last active location
    const activeCount = await db.prepare(`SELECT COUNT(*) as c FROM locations WHERE status = 'Active' AND ${ activeScope }`).get();
    if (Number(activeCount?.c ?? 0) <= 1) { return res.status(400).json({ error: 'Cannot delete the last active location' });
    }

    await ensureLocationHasNoDependencies(id);
    softDeleteLocation(id, req.user.id, actorName, req.ip);

    res.status(204).end();
  } catch (err) { if (err.message === 'LOCATION_HAS_DEPENDENCIES') {
      logAudit({
        actorId: req.user.id, actorName, action: 'LOCATION_DELETE_BLOCKED_DEPENDENCIES', targetId: id, targetType: 'location', details: { users: err.users, patients: err.patients },
        ip: req.ip,
      });
      return res.status(409).json({ error: 'Location has active users or patients — reassign them first', users: err.users, patients: err.patients,  });
    }
    throw err;
  }
});

export default router;
