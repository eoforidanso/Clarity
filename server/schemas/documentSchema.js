import { z } from 'zod';

export const ProgressNoteDocSchema = z.object({
  encounterId: z.string(),
  patientId:   z.string(),
});

export const PrescriptionDocSchema = z.object({
  medicationId: z.string(),
  patientId:    z.string(),
});

export const PatientSummaryDocSchema = z.object({
  patientId: z.string(),
});

export const DischargeSummaryDocSchema = z.object({
  patientId:            z.string(),
  encounterId:          z.string().optional(),
  dischargePlan:        z.string().optional(),
  followUpInstructions: z.string().optional(),
});
