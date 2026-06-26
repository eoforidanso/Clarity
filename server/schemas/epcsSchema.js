import { z } from 'zod';

export const EpcsSendSchema = z.object({
  patientId:   z.string(),
  drugId:      z.string(),
  quantity:    z.number().positive(),
  daysSupply:  z.number().positive().optional(),
});

export const EpcsBtgSchema = z.object({
  patientId:     z.string(),
  drugId:        z.string(),
  quantity:      z.number().positive(),
  justification: z.string().optional(),
});
