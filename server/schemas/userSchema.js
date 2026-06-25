import { z } from 'zod';

const VALID_ROLES = ['prescriber', 'nurse', 'front_desk', 'admin', 'therapist', 'biller'];

export const CreateUserSchema = z.object({
  username:          z.string().min(2).max(50).regex(/^[a-zA-Z0-9._-]+$/, 'Alphanumeric, dots, underscores and hyphens only'),
  password:          z.string().min(8).max(128),
  firstName:         z.string().min(1).max(100).trim(),
  lastName:          z.string().max(100).trim().optional().default(''),
  role:              z.enum(VALID_ROLES),
  email:             z.string().email().max(255).toLowerCase(),
  credentials:       z.string().max(50).optional().default(''),
  specialty:         z.string().max(100).optional().default(''),
  npi:               z.string().max(20).optional().default(''),
  deaNumber:         z.string().max(20).optional().default(''),
  locationId:        z.string().min(1).max(100).optional().nullable(),
  twoFactorEnabled:  z.boolean().optional().default(false),
  mustChangePassword:z.boolean().optional().default(true),
});

export const UpdateUserSchema = z.object({
  firstName:         z.string().min(1).max(100).trim().optional(),
  lastName:          z.string().max(100).trim().optional(),
  role:              z.enum(VALID_ROLES).optional(),
  email:             z.string().email().max(255).toLowerCase().optional(),
  credentials:       z.string().max(50).optional(),
  specialty:         z.string().max(100).optional(),
  npi:               z.string().max(20).optional(),
  deaNumber:         z.string().max(20).optional(),
  locationId:        z.string().min(1).max(100).optional().nullable(),
  twoFactorEnabled:  z.boolean().optional(),
});
