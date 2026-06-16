import { z } from 'zod';

const LAB_STATUSES = ['Pending', 'In Progress', 'Resulted', 'Final', 'Cancelled'];
const FLAGS        = ['H', 'L', 'HH', 'LL', 'A', ''];

const LabComponentSchema = z.object({
  component: z.string().min(1).max(200),
  value:     z.string().max(100).optional().default(''),
  unit:      z.string().max(50).optional().default(''),
  range:     z.string().max(100).optional().default(''),
  flag:      z.enum(FLAGS).optional().default(''),
});

const LabTestSchema = z.object({
  name:    z.string().min(1).max(200),
  results: z.array(LabComponentSchema).optional().default([]),
});

export const CreateLabSchema = z.object({
  orderDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  resultDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  orderedBy:  z.string().max(200).optional().default(''),
  status:     z.enum(LAB_STATUSES).optional().default('Pending'),
  tests:      z.array(LabTestSchema).optional().default([]),
});
