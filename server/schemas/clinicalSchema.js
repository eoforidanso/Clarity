import { z } from 'zod';

const ALLERGY_TYPES     = ['Drug', 'Food', 'Environmental', 'Other'];
const ALLERGY_SEVERITY  = ['Mild', 'Moderate', 'Severe', 'Life-threatening', ''];
const ALLERGY_STATUSES  = ['Active', 'Inactive', 'Resolved'];
const PROBLEM_STATUSES  = ['Active', 'Inactive', 'Resolved', 'Chronic'];
const IMMU_ROUTES       = ['IM', 'SC', 'ID', 'Oral', 'Intranasal', ''];

export const AllergySchema = z.object({
  allergen:  z.string().min(1).max(200).trim(),
  type:      z.enum(ALLERGY_TYPES).optional().default('Other'),
  reaction:  z.string().max(500).optional().default(''),
  severity:  z.enum(ALLERGY_SEVERITY).optional().default(''),
  status:    z.enum(ALLERGY_STATUSES).optional().default('Active'),
  onsetDate: z.string().max(20).optional().default(''),
  source:    z.string().max(100).optional().default(''),
});

export const ProblemSchema = z.object({
  code:        z.string().max(20).optional().default(''),
  description: z.string().min(1).max(500).trim(),
  status:      z.enum(PROBLEM_STATUSES).optional().default('Active'),
  onsetDate:   z.string().max(20).optional().default(''),
  diagnosedBy: z.string().max(200).optional().default(''),
});

export const VitalsSchema = z.object({
  date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time:    z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM').optional().default('00:00'),
  bp:      z.string().max(20).optional().default(''),
  hr:      z.number().int().min(0).max(350).optional().nullable(),
  rr:      z.number().int().min(0).max(100).optional().nullable(),
  temp:    z.number().min(50).max(115).optional().nullable(),
  spo2:    z.number().min(0).max(100).optional().nullable(),
  weight:  z.number().min(0).max(2000).optional().nullable(),
  height:  z.number().min(0).max(120).optional().nullable(),
  bmi:     z.number().min(0).max(200).optional().nullable(),
  pain:    z.number().int().min(0).max(10).optional().nullable(),
  takenBy: z.string().max(200).optional().default(''),
});

export const ImmunizationSchema = z.object({
  vaccine:        z.string().min(1).max(200).trim(),
  date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  site:           z.string().max(100).optional().default(''),
  route:          z.enum(IMMU_ROUTES).optional().default(''),
  lot:            z.string().max(50).optional().default(''),
  manufacturer:   z.string().max(200).optional().default(''),
  administeredBy: z.string().max(200).optional().default(''),
  nextDue:        z.string().max(20).optional().nullable(),
});

export const AssessmentSchema = z.object({
  tool:           z.string().min(1).max(100).trim(),
  score:          z.number().int().min(0).max(1000),
  interpretation: z.string().max(500).optional().default(''),
  date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  administeredBy: z.string().max(200).optional().default(''),
  answers:        z.array(z.any()).optional().default([]),
});
