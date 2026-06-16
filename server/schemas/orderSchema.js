import { z } from 'zod';

const ORDER_TYPES     = ['Lab', 'Imaging', 'Referral', 'Procedure', 'Medication', 'Other'];
const ORDER_STATUSES  = ['Pending', 'Ordered', 'In Progress', 'Completed', 'Cancelled'];
const ORDER_PRIORITY  = ['Routine', 'Urgent', 'STAT'];

export const CreateOrderSchema = z.object({
  type:        z.enum(ORDER_TYPES).optional().default('Other'),
  description: z.string().min(1).max(500).trim(),
  status:      z.enum(ORDER_STATUSES).optional().default('Pending'),
  orderedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  orderedBy:   z.string().max(200).optional().default(''),
  priority:    z.enum(ORDER_PRIORITY).optional().default('Routine'),
  notes:       z.string().max(1000).optional().default(''),
  labFacility: z.string().max(200).optional().nullable(),
});

export const UpdateOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  notes:  z.string().max(1000).optional(),
});
