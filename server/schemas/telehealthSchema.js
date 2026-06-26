import { z } from 'zod';

export const TelehealthTokenSchema = z.object({
  appointmentId: z.string(),
});

export const GuestInviteSchema = z.object({
  appointmentId: z.string(),
  guestName:     z.string(),
});

export const BreakoutSchema = z.object({
  appointmentId: z.string(),
  participants:  z.array(z.object({
    identity: z.string(),
    name:     z.string(),
    role:     z.string().optional(),
  })).min(1),
});
