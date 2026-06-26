import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { routeError } from '../utils/routeError.js';
import { validate } from '../middleware/validate.js';
import { ChannelMessageSchema, DmMessageSchema, ReactionsSchema } from '../schemas/messagingSchema.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { ChannelListResponseSchema, ChannelMessageListResponseSchema, DmListResponseSchema } from '../schemas/responseSchemas.js';

const router = Router();
router.use(authenticate);

// GET /api/messaging/channels
router.get('/channels', validateResponse(ChannelListResponseSchema), async (req, res) => {
  try {
    const channels = await db.prepare('SELECT * FROM staff_channels ORDER BY name').all();
    res.json(channels.map(c => ({ id: c.id, name: c.name, type: c.type })));
  } catch (err) {
    routeError(req, '[messaging] GET /channels', err);
    res.status(500).json({ error: 'Failed to load channels' });
  }
});

// GET /api/messaging/channels/:channelId/messages
router.get('/channels/:channelId/messages', validateResponse(ChannelMessageListResponseSchema), async (req, res) => {
  try {
    const { limit } = req.query;
    const parsedLimit = parseInt(limit, 10);
    const useLimit = !isNaN(parsedLimit) && parsedLimit > 0;
    const query = useLimit
      ? 'SELECT * FROM staff_messages WHERE channel_id = ? ORDER BY timestamp ASC LIMIT ?'
      : 'SELECT * FROM staff_messages WHERE channel_id = ? ORDER BY timestamp ASC';
    const params = useLimit
      ? [req.params.channelId, Math.min(parsedLimit, 1000)]
      : [req.params.channelId];
    const rows = await db.prepare(query).all(...params);
    res.json(rows.map(r => ({ id: r.id, channelId: r.channel_id, userId: r.user_id, userName: r.user_name, content: r.content, timestamp: r.timestamp, reactions: JSON.parse(r.reactions || '{}'),
    })));
  } catch (err) {
    routeError(req, '[messaging] GET /channels/:channelId/messages', err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// POST /api/messaging/channels/:channelId/messages
router.post('/channels/:channelId/messages', validate(ChannelMessageSchema), async (req, res) => {
  try {
    const b = req.body;
    const id = uuidv4();
    const userName = `${req.user.first_name } ${ req.user.last_name }`.trim() || req.user.username;

    await db.prepare('INSERT INTO staff_messages (id, channel_id, user_id, user_name, content, reactions) VALUES (?,?,?,?,?,?)').run(
      id, req.params.channelId, req.user.id, userName, b.content, JSON.stringify(b.reactions || {})
    );

    const row = await db.prepare('SELECT * FROM staff_messages WHERE id = ?').get(id);
    res.status(201).json({ id: row.id, channelId: row.channel_id, userId: row.user_id, userName: row.user_name, content: row.content, timestamp: row.timestamp, reactions: JSON.parse(row.reactions || '{}'),
    });
  } catch (err) {
    routeError(req, '[messaging] POST /channels/:channelId/messages', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// PUT /api/messaging/messages/:messageId/reactions
router.put('/messages/:messageId/reactions', validate(ReactionsSchema), async (req, res) => {
  try {
    const { reactions } = req.body;
    await db.prepare('UPDATE staff_messages SET reactions = ? WHERE id = ?').run(JSON.stringify(reactions), req.params.messageId);
    res.json({ success: true });
  } catch (err) {
    routeError(req, '[messaging] PUT /messages/:messageId/reactions', err);
    res.status(500).json({ error: 'Failed to update reactions' });
  }
});

// ── Direct Messages ────────────────────────────────────────────────────

function mapDm(r) { return {
    id: r.id, senderId: r.sender_id, recipientId: r.recipient_id, senderName: r.sender_name, content: r.content, timestamp: r.timestamp, reactions: JSON.parse(r.reactions || '{}'),
    read: !!r.read,
  };
}

// GET /api/messaging/dm/:userId/messages
// Returns all DMs between the authenticated user and :userId
router.get('/dm/:userId/messages', validateResponse(DmListResponseSchema), async (req, res) => {
  try {
    const me = req.user.id;
    const other = req.params.userId;
    const rows = await db.prepare(
      `SELECT * FROM direct_messages
       WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
       ORDER BY timestamp ASC`
    ).all(me, other, other, me);
    // Mark unread messages sent to current user as read
    await db.prepare(
      `UPDATE direct_messages SET read = 1
       WHERE recipient_id = ? AND sender_id = ? AND read = 0`
    ).run(me, other);
    res.json(rows.map(mapDm));
  } catch (err) {
    routeError(req, '[messaging] GET /dm/:userId/messages', err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// POST /api/messaging/dm/:userId/messages
// Send a DM to :userId
router.post('/dm/:userId/messages', validate(DmMessageSchema), async (req, res) => {
  try {
    const { content } = req.body;
    const me = req.user.id;
    const other = req.params.userId;
    // Verify recipient exists and is not a patient
    const recipient = await db.prepare(`SELECT id FROM users WHERE id = ? AND role != 'patient'`).get(other);
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

    const id = uuidv4();
    const senderName = `${ req.user.first_name } ${ req.user.last_name }`.trim() || req.user.username;
    await db.prepare(
      `INSERT INTO direct_messages (id, sender_id, recipient_id, sender_name, content, reactions, read)
       VALUES (?,?,?,?,?,?,0)`
    ).run(id, me, other, senderName, content.trim(), '{}');

    const row = await db.prepare('SELECT * FROM direct_messages WHERE id = ?').get(id);
    res.status(201).json(mapDm(row));
  } catch (err) {
    routeError(req, '[messaging] POST /dm/:userId/messages', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// PUT /api/messaging/dm/messages/:messageId/reactions
router.put('/dm/messages/:messageId/reactions', validate(ReactionsSchema), async (req, res) => {
  try {
    const { reactions } = req.body;
    const me = req.user.id;
    const row = await db.prepare('SELECT * FROM direct_messages WHERE id = ?').get(req.params.messageId);
    if (!row) return res.status(404).json({ error: 'Message not found' });
    if (row.sender_id !== me && row.recipient_id !== me) { return res.status(403).json({ error: 'Forbidden' });
    }
    await db.prepare('UPDATE direct_messages SET reactions = ? WHERE id = ?').run(JSON.stringify(reactions), req.params.messageId);
    res.json({ success: true });
  } catch (err) {
    routeError(req, '[messaging] PUT /dm/messages/:messageId/reactions', err);
    res.status(500).json({ error: 'Failed to update reactions' });
  }
});

// GET /api/messaging/dm/unread-counts
// Returns unread DM counts per sender for the current user
router.get('/dm/unread-counts', async (req, res) => {
  try {
    const rows = await db.prepare(
      `SELECT sender_id, COUNT(*) as count FROM direct_messages
       WHERE recipient_id = ? AND read = 0
       GROUP BY sender_id`
    ).all(req.user.id);
    const counts = {};
    rows.forEach(r => { counts[r.sender_id] = r.count; });
    res.json(counts);
  } catch (err) {
    routeError(req, '[messaging] GET /dm/unread-counts', err);
    res.status(500).json({ error: 'Failed to load unread counts' });
  }
});

export default router;
