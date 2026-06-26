import { Router } from 'express';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { authenticate } from '../middleware/auth.js';
import db from '../db/database.js';
import { validate } from '../middleware/validate.js';
import { TelehealthTokenSchema, GuestInviteSchema, BreakoutSchema } from '../schemas/telehealthSchema.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { TelehealthTokenResponseSchema, GuestInviteResponseSchema, BreakoutResponseSchema } from '../schemas/responseSchemas.js';

const router = Router();

const LK_API_KEY    = process.env.LIVEKIT_API_KEY;
const LK_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LK_HOST       = (process.env.LIVEKIT_URL || '').replace('wss://', 'https://');

function getRoomSvc() {
  return new RoomServiceClient(LK_HOST, LK_API_KEY, LK_API_SECRET);
}

function buildToken({ roomName, participantName, participantIdentity, canPublish = true, canSubscribe = true, isAdmin = false, metadata = {}, ttl = '2h' }) {
  const at = new AccessToken(LK_API_KEY, LK_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
    ttl,
    metadata: JSON.stringify(metadata),
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish,
    canSubscribe,
    canPublishData: true,
    roomAdmin: isAdmin,
  });
  return at.toJwt();
}

function notConfigured(res) {
  return res.status(503).json({ error: 'LiveKit not configured. Add LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL to server .env.' });
}

// ── POST /api/telehealth/token  (staff) ──────────────────────────────────────
// Provider → full permissions + roomAdmin
// Front desk → canSubscribe only (observer, no video out)
// Other staff → full participant
router.post('/token', authenticate, validate(TelehealthTokenSchema), validateResponse(TelehealthTokenResponseSchema), async (req, res) => {
  if (!LK_API_KEY || !LK_API_SECRET) return notConfigured(res);
  const { appointmentId } = req.body;
  if (!appointmentId) return res.status(400).json({ error: 'appointmentId required' });

  const userName   = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;
  const role       = req.user.role;
  const isProvider = role === 'provider' || role === 'admin';
  const isFrontDesk = role === 'front_desk';

  const token = await buildToken({
    roomName:             appointmentId,
    participantName:      userName,
    participantIdentity:  `staff-${req.user.id}`,
    canPublish:           !isFrontDesk,
    canSubscribe:         true,
    isAdmin:              isProvider,
    metadata:             { role, staffId: req.user.id, displayName: userName },
  });

  res.json({ token, roomName: appointmentId, participantName: userName, role });
});

// ── POST /api/telehealth/admit ───────────────────────────────────────────────
// Provider grants full publish/subscribe to a waiting-room participant
router.post('/admit', authenticate, async (req, res) => {
  if (!LK_HOST || !LK_API_KEY) return notConfigured(res);
  const { appointmentId, participantIdentity } = req.body;
  if (!appointmentId || !participantIdentity) {
    return res.status(400).json({ error: 'appointmentId and participantIdentity required' });
  }
  try {
    const svc = getRoomSvc();
    await svc.updateParticipant(appointmentId, participantIdentity, undefined, {
      canPublish:     true,
      canSubscribe:   true,
      canPublishData: true,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/telehealth/guest-invite ────────────────────────────────────────
// Provider generates a 15-min guest link (interpreter, family member, etc.)
// Guest starts in waiting room; provider admits them like any other participant.
router.post('/guest-invite', authenticate, validate(GuestInviteSchema), validateResponse(GuestInviteResponseSchema), async (req, res) => {
  if (!LK_API_KEY || !LK_API_SECRET) return notConfigured(res);
  const { appointmentId, guestName } = req.body;
  if (!appointmentId || !guestName) return res.status(400).json({ error: 'appointmentId and guestName required' });

  const identity = `guest-${Date.now()}`;
  const token    = await buildToken({
    roomName:             appointmentId,
    participantName:      guestName,
    participantIdentity:  identity,
    canPublish:           false,  // waiting room until admitted
    canSubscribe:         false,
    isAdmin:              false,
    metadata:             { role: 'guest', displayName: guestName },
    ttl:                  '15m',
  });

  const joinUrl = `https://app.clarity-ehr.com/portal?lk_token=${encodeURIComponent(token)}&lk_room=${appointmentId}&lk_name=${encodeURIComponent(guestName)}`;

  res.json({ ok: true, token, joinUrl, identity, guestName });
});

// ── POST /api/telehealth/breakout ────────────────────────────────────────────
// Provider starts a private sub-room. Returns tokens for the provider + each
// invited participant. The provider sends each participant their token via a
// LiveKit data message so no server-push infrastructure is needed.
router.post('/breakout', authenticate, validate(BreakoutSchema), validateResponse(BreakoutResponseSchema), async (req, res) => {
  if (!LK_API_KEY || !LK_API_SECRET) return notConfigured(res);
  const { appointmentId, participants } = req.body;
  // participants: [{ identity, name, role }]
  if (!appointmentId || !Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({ error: 'appointmentId and participants[] required' });
  }

  const breakoutRoom = `${appointmentId}-breakout-${Date.now()}`;

  const userName    = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;
  const providerToken = await buildToken({
    roomName:            breakoutRoom,
    participantName:     userName,
    participantIdentity: `staff-${req.user.id}`,
    canPublish:          true,
    canSubscribe:        true,
    isAdmin:             true,
    metadata:            { role: req.user.role, displayName: userName },
    ttl:                 '1h',
  });

  const participantTokens = await Promise.all(
    participants.map(p => buildToken({
      roomName:            breakoutRoom,
      participantName:     p.name,
      participantIdentity: p.identity,
      canPublish:          true,
      canSubscribe:        true,
      isAdmin:             false,
      metadata:            { role: p.role || 'participant', displayName: p.name },
      ttl:                 '1h',
    }).then(token => ({ identity: p.identity, name: p.name, token })))
  );

  res.json({ ok: true, breakoutRoom, providerToken, participantTokens });
});

// ── POST /api/patient-portal/telehealth/token  (portal — exported for patientPortal.js) ──
export async function portalTelehealthToken(req, res) {
  if (!LK_API_KEY || !LK_API_SECRET) {
    return res.status(503).json({ error: 'LiveKit not configured on this server yet.' });
  }
  const { appointmentId } = req.body;
  if (!appointmentId) return res.status(400).json({ error: 'appointmentId required' });

  const apt = await db.prepare(
    `SELECT id, patient_name FROM appointments WHERE id = $1 AND patient_id = $2`
  ).get(appointmentId, req.patientId);
  if (!apt) return res.status(403).json({ error: 'Appointment not found or not yours' });

  const patientName = apt.patient_name || 'Patient';
  const identity    = `patient-${req.patientId}`;

  // Patient starts in the waiting room (canPublish/canSubscribe = false).
  // Provider calls /admit to grant full access.
  const token = await buildToken({
    roomName:             appointmentId,
    participantName:      patientName,
    participantIdentity:  identity,
    canPublish:           false,
    canSubscribe:         false,
    isAdmin:              false,
    metadata:             { role: 'patient', displayName: patientName },
  });

  res.json({ token, roomName: appointmentId, participantName: patientName, identity });
}

export default router;
