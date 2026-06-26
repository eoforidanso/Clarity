import { z } from 'zod';

export const SecureNoteSchema = z.object({
  content:     z.string().min(1),
  patientId:   z.string().nullable().optional(),
  patientName: z.string().optional(),
  mrn:         z.string().optional(),
  type:        z.string().optional(),
  color:       z.string().optional(),
  visibility:  z.string().optional(),
  pinned:      z.boolean().optional(),
  expiresDate: z.string().nullable().optional(),
});
