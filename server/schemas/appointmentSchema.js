import { z } from 'zod';

const VISIT_TYPES   = ['In-Person', 'Telehealth', 'Phone', 'Home Visit'];
const APPT_STATUSES = ['Scheduled', 'Confirmed', 'Checked In', 'In Progress', 'Completed', 'Cancelled', 'No Show'];
const APPT_TYPES    = ['Office Visit', 'Follow-Up', 'New Patient', 'Urgent', 'Procedure', 'Telehealth', 'Phone Consult'];

export const CreateAppointmentSchema = z.object({
  patientId:    z.string().uuid().optional().nullable(),
  patientName:  z.string().max(200).optional().default(''),
  provider:     z.string().max(100).optional().default(''),
  providerName: z.string().max(200).optional().default(''),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time:         z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  duration:     z.number().int().min(5).max(480).optional().default(30),
  type:         z.enum(APPT_TYPES).optional().default('Office Visit'),
  status:       z.enum(APPT_STATUSES).optional().default('Scheduled'),
  reason:       z.string().max(500).optional().default(''),
  visitType:    z.enum(VISIT_TYPES).optional().default('In-Person'),
  room:         z.string().max(50).optional().default(''),
  locationId:   z.string().uuid().optional().nullable(),
});

export const UpdateAppointmentSchema = z.object({
  patientId:    z.string().uuid().optional().nullable(),
  patientName:  z.string().max(200).optional(),
  provider:     z.string().max(100).optional(),
  providerName: z.string().max(200).optional(),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time:         z.string().regex(/^\d{2}:\d{2}$/).optional(),
  duration:     z.number().int().min(5).max(480).optional(),
  type:         z.enum(APPT_TYPES).optional(),
  status:       z.enum(APPT_STATUSES).optional(),
  reason:       z.string().max(500).optional(),
  visitType:    z.enum(VISIT_TYPES).optional(),
  room:         z.string().max(50).optional(),
  locationId:   z.string().uuid().optional().nullable(),
});
