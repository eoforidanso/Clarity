import { z } from 'zod';

const VALID_TYPES    = ['Primary', 'Satellite', 'Virtual'];
const VALID_STATUSES = ['Active', 'Inactive'];

export const CreateLocationSchema = z.object({
  name:           z.string().min(1, 'Location name is required').max(100).trim(),
  shortName:      z.string().max(20).trim().optional(),
  address:        z.string().max(255).trim().optional().default(''),
  phone:          z.string().max(20).trim().optional().default(''),
  fax:            z.string().max(20).trim().optional().default(''),
  hours:          z.string().max(255).trim().optional().default(''),
  type:           z.enum(VALID_TYPES).optional().default('Satellite'),
  status:         z.enum(VALID_STATUSES).optional().default('Active'),
  npi:            z.string().max(20).trim().optional().default(''),
  taxId:          z.string().max(20).trim().optional().default(''),
  placeOfService: z.string().max(10).trim().optional().default(''),
  rooms:          z.number().int().min(0).optional().nullable(),
  telehealth:     z.boolean().optional().default(false),
  sortOrder:      z.number().int().min(0).optional().default(0),
});

export const UpdateLocationSchema = CreateLocationSchema.partial();
