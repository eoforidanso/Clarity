import { z } from 'zod';

const SI_LEVELS   = ['None', 'Passive', 'Active without plan', 'Active with plan', 'Active with intent'];
const VISIT_TYPES = ['Individual', 'Group', 'Family', 'Crisis', 'Intake', 'Follow-Up', 'Telehealth', 'Office Visit', 'Phone'];

const SafetySchema = z.object({
  siLevel:            z.string().max(50).optional().default('None'),
  hiLevel:            z.string().max(50).optional().default('None'),
  selfHarm:           z.boolean().optional().default(false),
  substanceUse:       z.boolean().optional().default(false),
  safetyPlanUpdated:  z.boolean().optional().default(false),
  crisisResources:    z.boolean().optional().default(false),
  safetyNotes:        z.string().max(2000).optional().default(''),
}).optional();

export const CreateEncounterSchema = z.object({
  date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time:           z.string().regex(/^\d{2}:\d{2}$/).optional().default('00:00'),
  provider:       z.string().max(100).optional().default(''),
  providerName:   z.string().max(200).optional().default(''),
  credentials:    z.string().max(50).optional().default(''),
  visitType:      z.string().max(100).optional().default(''),
  type:           z.string().max(100).optional(),
  cptCode:        z.string().max(20).optional().default(''),
  icdCode:        z.string().max(20).optional().default(''),
  reason:         z.string().max(500).optional().default(''),
  duration:       z.union([z.string().max(20), z.number()]).optional(),
  chiefComplaint: z.string().max(2000).optional().default(''),
  hpi:            z.string().max(10000).optional().default(''),
  subjective:     z.string().max(10000).optional().default(''),
  intervalNote:   z.string().max(10000).optional().default(''),
  mse:            z.union([z.string().max(20000), z.record(z.any())]).optional(),
  assessment:     z.string().max(10000).optional().default(''),
  plan:           z.string().max(10000).optional().default(''),
  safety:         SafetySchema,
  followUp:       z.union([z.string().max(500), z.record(z.any())]).optional(),
  disposition:    z.string().max(500).optional().default(''),
  rawData:        z.any().optional(),
});

export const UpdateEncounterSchema = CreateEncounterSchema.partial().extend({
  isSigned:  z.boolean().optional(),
  signedBy:  z.string().max(200).optional(),
  signedAt:  z.string().optional(),
});
