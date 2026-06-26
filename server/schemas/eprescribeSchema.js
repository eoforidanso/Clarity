import { z } from 'zod';

export const PrescribeSchema = z.object({
  patientId:    z.string().uuid('Valid patient ID is required'),
  patientName:  z.string().max(200).optional().default(''),
  name:         z.string().min(1, 'Medication name is required').max(200).trim(),
  dose:         z.string().min(1, 'Dose is required').max(100).trim(),
  route:        z.string().max(50).optional().default('Oral'),
  frequency:    z.string().min(1, 'Frequency is required').max(100).trim(),
  sig:          z.string().max(500).optional().default(''),
  refills:      z.number().int().min(0).max(12).optional().default(0),
  quantity:     z.number().int().min(1, 'Quantity must be at least 1').max(999).optional().default(30),
  pharmacy:     z.string().max(200).optional().default(''),
  isControlled: z.boolean().optional().default(false),
  schedule:     z.string().max(20).optional().nullable(),
  notes:        z.string().max(1000).optional().default(''),
  daw:          z.boolean().optional().default(false),
});
