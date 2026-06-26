import { z } from 'zod';

export const CreateTreatmentPlanSchema = z.object({
  patientId:           z.string(),
  status:              z.string().optional(),
  diagnoses:           z.array(z.any()).optional(),
  goals:               z.array(z.any()).optional(),
  sessionFrequency:    z.string().optional(),
  anticipatedDuration: z.string().optional(),
  reviewDate:          z.string().optional(),
  nextReviewDate:      z.string().optional(),
  patientName:         z.string().optional(),
});

export const AddGoalSchema = z.object({
  description: z.string(),
}).passthrough();
