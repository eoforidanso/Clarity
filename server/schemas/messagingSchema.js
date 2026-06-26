import { z } from 'zod';

export const ChannelMessageSchema = z.object({
  content:   z.string().min(1).max(5000).trim(),
  reactions: z.record(z.array(z.string())).optional().default({}),
});

export const DmMessageSchema = z.object({
  content: z.string().min(1).max(5000).trim(),
});

export const SmartPhraseSchema = z.object({
  name:        z.string().min(1).max(100).trim(),
  triggerText: z.string().min(1).max(50).trim(),
  content:     z.string().min(1).max(10000),
  category:    z.string().max(50).optional().default('General'),
});

const INBOX_TYPES      = ['message', 'alert', 'task', 'referral', 'lab', 'prescription'];
const INBOX_PRIORITIES = ['Normal', 'High', 'Urgent'];
const INBOX_STATUSES   = ['Unread', 'Read', 'Pending', 'Completed', 'Archived'];

export const InboxMessageSchema = z.object({
  type:        z.enum(INBOX_TYPES).optional().default('message'),
  from:        z.string().max(200).optional().default(''),
  to:          z.string().max(200).optional().default(''),
  patient:     z.string().uuid().optional().nullable(),
  patientName: z.string().max(200).optional().default(''),
  subject:     z.string().max(500).optional().default(''),
  body:        z.string().max(10000).optional().default(''),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time:        z.string().regex(/^\d{2}:\d{2}$/).optional(),
  read:        z.boolean().optional().default(false),
  priority:    z.enum(INBOX_PRIORITIES).optional().default('Normal'),
  status:      z.enum(INBOX_STATUSES).optional().default('Unread'),
  urgent:      z.boolean().optional().default(false),
});

export const MedicationSchema = z.object({
  name:        z.string().min(1).max(200).trim(),
  dose:        z.string().max(100).optional().default(''),
  route:       z.string().max(50).optional().default('Oral'),
  frequency:   z.string().max(100).optional().default(''),
  startDate:   z.string().max(20).optional().default(''),
  prescriber:  z.string().max(200).optional().default(''),
  status:      z.enum(['Active', 'Inactive', 'Discontinued', 'On Hold']).optional().default('Active'),
  refillsLeft: z.number().int().min(0).max(99).optional().default(0),
  isControlled:z.boolean().optional().default(false),
  schedule:    z.string().max(10).optional().nullable(),
  pharmacy:    z.string().max(200).optional().default(''),
  lastFilled:  z.string().max(20).optional().default(''),
  sig:         z.string().max(500).optional().default(''),
  rxHistory:   z.array(z.object({
    date:          z.string().max(20).optional(),
    prescribedBy:  z.string().max(200).optional(),
    pharmacy:      z.string().max(200).optional(),
    qty:           z.number().int().min(0).optional(),
    refillNumber:  z.number().int().min(0).optional(),
    type:          z.string().max(50).optional(),
    note:          z.string().max(500).optional(),
  })).optional().default([]),
});

export const RxHistorySchema = z.object({
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  prescribedBy: z.string().max(200).optional().default(''),
  pharmacy:     z.string().max(200).optional().default(''),
  qty:          z.number().int().min(0).max(9999).optional().default(0),
  refillNumber: z.number().int().min(0).max(99).optional().default(0),
  type:         z.enum(['New Prescription', 'Refill', 'Transfer', 'Change']).optional().default('Refill'),
  note:         z.string().max(500).optional().default(''),
});

export const UpdateMedicationSchema = z.object({
  name:        z.string().max(200).optional(),
  dose:        z.string().max(100).optional(),
  route:       z.string().max(50).optional(),
  frequency:   z.string().max(100).optional(),
  prescriber:  z.string().max(200).optional(),
  status:      z.enum(['Active', 'Inactive', 'Discontinued', 'On Hold']).optional(),
  refillsLeft: z.number().int().min(0).max(99).optional(),
  pharmacy:    z.string().max(200).optional(),
  lastFilled:  z.string().max(20).optional(),
  sig:         z.string().max(500).optional(),
});

export const InboxUpdateSchema = z.object({
  read:     z.boolean().optional(),
  status:   z.string().max(50).optional(),
  priority: z.string().max(50).optional(),
});

export const InboxStatusUpdateSchema = z.object({
  status: z.string().min(1).max(50),
});

export const ReactionsSchema = z.object({
  reactions: z.record(z.any()),
});
