import { z } from 'zod';

export const PortalRequestAccessSchema = z.object({
  email: z.string().email(),
});

export const PortalMessageSchema = z.object({
  text: z.string().min(1),
});

export const PortalAssessmentSchema = z.object({
  tool:           z.string(),
  score:          z.number(),
  maxScore:       z.number().optional(),
  interpretation: z.string().optional(),
  answers:        z.array(z.any()).optional(),
  date:           z.string().optional(),
});

export const PortalRefillRequestSchema = z.object({
  medicationName: z.string(),
  medicationId:   z.string().nullable().optional(),
  dose:           z.string().optional(),
  frequency:      z.string().optional(),
  pharmacy:       z.string().optional(),
});

export const PortalBookAppointmentSchema = z.object({
  providerId:   z.string(),
  date:         z.string(),
  time:         z.string(),
  providerName: z.string().optional(),
  duration:     z.number().optional(),
  visitType:    z.string().optional(),
  reason:       z.string().optional(),
  notes:        z.string().optional(),
});

export const PortalTelehealthTokenSchema = z.object({
  appointmentId: z.string(),
});
