import { z } from 'zod';

export const ClaimSubmitSchema = z.object({
  claimIds: z.array(z.string()).min(1),
});

export const RecordPaymentSchema = z.object({
  claimId:          z.string(),
  paymentType:      z.enum(['insurance', 'patient', 'adjustment']),
  amount:           z.number().positive(),
  paymentMethod:    z.string().optional(),
  checkNumber:      z.string().optional(),
  adjustmentReason: z.string().optional(),
  notes:            z.string().optional(),
});

export const DenialAppealSchema = z.object({
  appeal_notes:     z.string().optional(),
  appeal_documents: z.any().optional(),
  priority:         z.enum(['low', 'medium', 'high']).optional(),
});

export const DenialResolveSchema = z.object({
  resolution_notes:  z.string().optional(),
  resolution_amount: z.number().optional(),
});

export const TelehealthBillingSchema = z.object({
  session_id:          z.string(),
  patient_id:          z.string(),
  provider_id:         z.string(),
  session_duration:    z.number().positive(),
  session_type:        z.string(),
  platform_used:       z.string().optional(),
  technology_fee:      z.number().optional(),
  documentation_notes: z.string().optional(),
});

export const PatientPortalPaymentSchema = z.object({
  patient_id:     z.string(),
  statement_id:   z.union([z.string(), z.number()]),
  amount:         z.number().positive(),
  payment_method: z.string(),
  card_last_four: z.string().optional(),
  transaction_id: z.string().optional(),
});
