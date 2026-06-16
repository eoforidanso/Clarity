import { z } from 'zod';

const AddressSchema = z.object({
  street: z.string().max(255).optional().default(''),
  city:   z.string().max(100).optional().default(''),
  state:  z.string().max(2).optional().default(''),
  zip:    z.string().max(10).optional().default(''),
}).optional();

const EmergencyContactSchema = z.object({
  name:         z.string().max(100).optional().default(''),
  relationship: z.string().max(50).optional().default(''),
  phone:        z.string().max(20).optional().default(''),
}).optional();

const InsurancePlanSchema = z.object({
  name:        z.string().max(100).optional().default(''),
  memberId:    z.string().max(100).optional().default(''),
  groupNumber: z.string().max(100).optional().default(''),
  copay:       z.number().min(0).max(10000).optional().default(0),
}).optional();

export const CreatePatientSchema = z.object({
  firstName:        z.string().min(1).max(100).trim(),
  lastName:         z.string().min(1).max(100).trim(),
  dob:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  gender:           z.string().max(50).optional().default(''),
  pronouns:         z.string().max(50).optional().default(''),
  ssn:              z.string().max(11).optional().default(''),
  race:             z.string().max(100).optional().default(''),
  ethnicity:        z.string().max(100).optional().default(''),
  language:         z.string().max(50).optional().default('English'),
  maritalStatus:    z.string().max(50).optional().default(''),
  phone:            z.string().max(20).optional().default(''),
  cellPhone:        z.string().max(20).optional().default(''),
  email:            z.string().email().max(255).optional().or(z.literal('')),
  address:          AddressSchema,
  emergencyContact: EmergencyContactSchema,
  insurance:        z.object({
    primary:   InsurancePlanSchema,
    secondary: InsurancePlanSchema,
  }).optional(),
  pcp:              z.string().max(100).optional().default(''),
  assignedProvider: z.string().max(100).optional().default(''),
  locationId:       z.string().uuid().optional().nullable(),
  isBTG:            z.boolean().optional().default(false),
  flags:            z.array(z.string().max(50)).optional().default([]),
});
