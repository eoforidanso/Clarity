import { z } from 'zod';

export const CreateRefillSchema = z.object({
  patientId:      z.string(),
  medicationName: z.string(),
  medicationId:   z.string().optional(),
  dose:           z.string().optional(),
  frequency:      z.string().optional(),
});

export const SendToPharmacySchema = z.object({
  pharmacyEmail:   z.string().email().optional(),
  pharmacyName:    z.string().optional(),
  verifyInsurance: z.boolean().optional(),
});

export const ResendNotificationSchema = z.object({
  type: z.enum(['email', 'sms']),
});
