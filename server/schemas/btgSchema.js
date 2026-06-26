import { z } from 'zod';

export const BtgRequestAccessSchema = z.object({
  patientId: z.string(),
  reason:    z.string().min(10),
});
