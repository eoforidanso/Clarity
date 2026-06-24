import { z } from 'zod';

// ── Shared helpers ────────────────────────────────────────────────────────────
const nul  = (s) => s.nullable();
const opt  = (s) => s.optional();
const nopt = (s) => s.nullable().optional();

// ── Common shapes ─────────────────────────────────────────────────────────────
export const MessageResponseSchema = z.object({ message: z.string() });
export const OkResponseSchema      = z.object({ ok: z.literal(true) });
export const CreatedIdSchema       = z.object({ id: z.string(), message: opt(z.string()) });
export const ErrorResponseSchema   = z.object({ error: z.string() });

// ── Auth ──────────────────────────────────────────────────────────────────────
export const AuthUserSchema = z.object({
  id:                  z.string(),
  username:            z.string(),
  firstName:           z.string(),
  lastName:            z.string(),
  name:                z.string(),
  role:                z.string(),
  credentials:         nul(z.string()),
  specialty:           nul(z.string()),
  npi:                 nul(z.string()),
  deaNumber:           nul(z.string()),
  email:               nul(z.string()),
  twoFactorEnabled:    z.boolean(),
  mustChangePassword:  z.boolean(),
  patientId:           nul(z.string()),
  locationId:          z.string(),
  isGlobal:            z.boolean(),
  is_global:           z.boolean(),
  signature:           nopt(z.string()),
});

// login may return MFA challenge, must-change-password, or normal session
export const LoginResponseSchema = z.union([
  z.object({ requiresMfa: z.literal(true), tempToken: z.string(), emailHint: z.string() }),
  z.object({ user: AuthUserSchema, mustChangePassword: z.boolean() }),
  z.object({ user: AuthUserSchema }),
]);

export const MeResponseSchema = z.object({ user: AuthUserSchema });

// ── Patient ───────────────────────────────────────────────────────────────────
export const PatientResponseSchema = z.object({
  id:             z.string(),
  mrn:            z.string(),
  firstName:      z.string(),
  lastName:       z.string(),
  dob:            nul(z.string()),
  age:            nul(z.number()),
  gender:         nul(z.string()),
  pronouns:       nul(z.string()),
  ssn:            nul(z.string()),
  race:           nul(z.string()),
  ethnicity:      nul(z.string()),
  language:       nul(z.string()),
  maritalStatus:  nul(z.string()),
  phone:          nul(z.string()),
  cellPhone:      nul(z.string()),
  email:          nul(z.string()),
  address: z.object({
    street: nul(z.string()),
    city:   nul(z.string()),
    state:  nul(z.string()),
    zip:    nul(z.string()),
  }),
  emergencyContact: z.object({
    name:         nul(z.string()),
    relationship: nul(z.string()),
    phone:        nul(z.string()),
  }),
  insurance: z.object({
    primary: z.object({
      name:        nul(z.string()),
      memberId:    nul(z.string()),
      groupNumber: nul(z.string()),
      copay:       nul(z.union([z.string(), z.number()])),
    }),
    secondary: nul(z.object({
      name:        nul(z.string()),
      memberId:    nul(z.string()),
      groupNumber: nul(z.string()),
      copay:       nul(z.union([z.string(), z.number()])),
    })),
  }),
  pcp:             nul(z.string()),
  assignedProvider:nul(z.string()),
  photo:           nul(z.string()),
  isBTG:           z.boolean(),
  isActive:        z.boolean(),
  lastVisit:       nul(z.string()),
  nextAppointment: nul(z.string()),
  flags:           z.array(z.any()),
  locationId:      nul(z.string()),
  stickyNote:      z.string(),
});

export const PatientListResponseSchema = z.array(PatientResponseSchema);

// ── Appointment ───────────────────────────────────────────────────────────────
export const AppointmentResponseSchema = z.object({
  id:           z.string(),
  patientId:    nul(z.string()),
  patientName:  z.string(),
  provider:     z.string(),
  providerName: nul(z.string()),
  date:         z.string(),
  time:         z.string(),
  duration:     z.number(),
  type:         z.string(),
  status:       z.string(),
  reason:       nul(z.string()),
  visitType:    nul(z.string()),
  room:         nul(z.string()),
  locationId:   z.string(),
});

export const AppointmentListResponseSchema = z.array(AppointmentResponseSchema);

// ── Location ──────────────────────────────────────────────────────────────────
export const LocationResponseSchema = z.object({
  id:             z.string(),
  name:           z.string(),
  shortName:      nul(z.string()),
  address:        nul(z.string()),
  phone:          nul(z.string()),
  fax:            nul(z.string()),
  hours:          nul(z.string()),
  type:           nul(z.string()),
  status:         nul(z.string()),
  npi:            nul(z.string()),
  taxId:          nul(z.string()),
  placeOfService: nul(z.string()),
  rooms:          nul(z.number()),
  telehealth:     z.boolean(),
  sortOrder:      nul(z.number()),
  createdAt:      nul(z.string()),
  updatedAt:      nul(z.string()),
});

export const LocationListResponseSchema = z.array(LocationResponseSchema);

// ── Staff user ────────────────────────────────────────────────────────────────
export const StaffUserResponseSchema = z.object({
  id:               z.string(),
  username:         z.string(),
  firstName:        z.string(),
  lastName:         z.string(),
  role:             z.string(),
  credentials:      z.string(),
  specialty:        z.string(),
  npi:              z.string(),
  deaNumber:        z.string(),
  email:            nul(z.string()),
  twoFactorEnabled: z.boolean(),
  locationId:       z.string(),
  createdAt:        nul(z.string()),
  updatedAt:        nul(z.string()),
  dosespotUserId:   nul(z.string()),
});

export const StaffUserListResponseSchema = z.array(StaffUserResponseSchema);

export const DirectoryUserResponseSchema = z.object({
  id:          z.string(),
  firstName:   z.string(),
  lastName:    z.string(),
  role:        z.string(),
  credentials: z.string(),
  specialty:   z.string(),
});

export const DirectoryListResponseSchema = z.array(DirectoryUserResponseSchema);

export const UserCreatedResponseSchema = z.object({
  id:       z.string(),
  username: z.string(),
  role:     z.string(),
  message:  z.string(),
});

// ── Treatment plan ────────────────────────────────────────────────────────────
export const TreatmentPlanResponseSchema = z.object({
  id:                  z.string(),
  patientId:           z.string(),
  patientName:         z.string(),
  providerId:          z.string(),
  providerName:        z.string(),
  status:              z.string(),
  diagnoses:           z.array(z.any()),
  goals:               z.array(z.any()),
  sessionFrequency:    nul(z.string()),
  anticipatedDuration: nul(z.string()),
  reviewDate:          nul(z.string()),
  nextReviewDate:      nul(z.string()),
  createdDate:         nul(z.string()),
  lastUpdated:         nul(z.string()),
});

export const TreatmentPlanListResponseSchema = z.array(TreatmentPlanResponseSchema);

// ── Telehealth ────────────────────────────────────────────────────────────────
export const TelehealthTokenResponseSchema = z.object({
  token:           z.string(),
  roomName:        z.string(),
  participantName: z.string(),
  role:            z.string(),
});

export const GuestInviteResponseSchema = z.object({
  ok:        z.boolean(),
  token:     z.string(),
  joinUrl:   z.string(),
  identity:  z.string(),
  guestName: z.string(),
});

export const BreakoutResponseSchema = z.object({
  ok:               z.boolean(),
  breakoutRoom:     z.string(),
  providerToken:    z.string(),
  participantTokens: z.array(z.object({
    identity: z.string(),
    name:     z.string(),
    token:    z.string(),
  })),
});

export const PortalTelehealthTokenResponseSchema = z.object({
  token:           z.string(),
  roomName:        z.string(),
  participantName: z.string(),
  identity:        z.string(),
});

// ── Generic passthrough (for complex / variable-shape routes) ─────────────────
export const AnyResponseSchema       = z.any();
export const AnyObjectResponseSchema = z.object({}).passthrough();
export const AnyArrayResponseSchema  = z.array(z.any());

// ── Medication ────────────────────────────────────────────────────────────────
const RxHistoryEntrySchema = z.object({
  date:         nul(z.string()),
  prescribedBy: nul(z.string()),
  pharmacy:     nul(z.string()),
  qty:          z.number(),
  refillNumber: z.number(),
  type:         nul(z.string()),
  note:         nul(z.string()),
});

export const MedicationResponseSchema     = z.object({
  id:           z.string(),
  name:         z.string(),
  dose:         nul(z.string()),
  route:        nul(z.string()),
  frequency:    nul(z.string()),
  startDate:    nul(z.string()),
  prescriber:   nul(z.string()),
  status:       z.string(),
  refillsLeft:  z.number(),
  isControlled: z.boolean(),
  schedule:     nul(z.string()),
  pharmacy:     nul(z.string()),
  lastFilled:   nul(z.string()),
  sig:          nul(z.string()),
  rxHistory:    z.array(RxHistoryEntrySchema),
});
export const MedicationListResponseSchema = z.array(MedicationResponseSchema);

// ── Lab result ────────────────────────────────────────────────────────────────
export const LabResultResponseSchema = z.object({
  id:         z.string(),
  orderDate:  nul(z.string()),
  resultDate: nul(z.string()),
  orderedBy:  nul(z.string()),
  status:     z.string(),
  tests:      z.array(z.object({
    name:    z.string(),
    results: z.array(z.object({
      component: z.string(),
      value:     nul(z.string()),
      unit:      nul(z.string()),
      range:     nul(z.string()),
      flag:      nul(z.string()),
    })),
  })),
});
export const LabListResponseSchema = z.array(LabResultResponseSchema);

// ── Encounter ─────────────────────────────────────────────────────────────────
export const EncounterResponseSchema = z.object({
  id:             z.string(),
  date:           nul(z.string()),
  time:           nul(z.string()),
  provider:       nul(z.string()),
  providerName:   nul(z.string()),
  credentials:    nul(z.string()),
  visitType:      nul(z.string()),
  cptCode:        nul(z.string()),
  icdCode:        nul(z.string()),
  reason:         nul(z.string()),
  duration:       nul(z.number()),
  chiefComplaint: nul(z.string()),
  hpi:            nul(z.string()),
  intervalNote:   nul(z.string()),
  mse:            nul(z.string()),
  assessment:     nul(z.string()),
  plan:           nul(z.string()),
  safety: z.object({
    siLevel:           nul(z.string()),
    hiLevel:           nul(z.string()),
    selfHarm:          z.boolean(),
    substanceUse:      z.boolean(),
    safetyPlanUpdated: z.boolean(),
    crisisResources:   z.boolean(),
    safetyNotes:       nul(z.string()),
  }),
  followUp:    nul(z.string()),
  disposition: nul(z.string()),
  isSigned:    z.boolean(),
  signedBy:    z.string(),
  signedAt:    nul(z.string()),
  rawData:     z.any().optional().nullable(),
});
export const EncounterListResponseSchema = z.array(EncounterResponseSchema);

// ── Order ─────────────────────────────────────────────────────────────────────
export const OrderResponseSchema = z.object({
  id:          z.string(),
  type:        nul(z.string()),
  description: nul(z.string()),
  status:      nul(z.string()),
  orderedDate: nul(z.string()),
  orderedBy:   nul(z.string()),
  priority:    nul(z.string()),
  notes:       nul(z.string()),
  labFacility: nul(z.string()),
});
export const OrderListResponseSchema = z.array(OrderResponseSchema);

// ── Inbox message ─────────────────────────────────────────────────────────────
export const InboxMessageResponseSchema = z.object({
  id:          z.string(),
  type:        nul(z.string()),
  from:        nul(z.string()),
  to:          nul(z.string()),
  patient:     nul(z.string()),
  patientName: nul(z.string()),
  subject:     nul(z.string()),
  body:        nul(z.string()),
  date:        nul(z.string()),
  time:        nul(z.string()),
  read:        z.boolean(),
  priority:    nul(z.string()),
  status:      nul(z.string()),
  urgent:      z.boolean(),
});
export const InboxListResponseSchema = z.array(InboxMessageResponseSchema);

// ── Secure note ───────────────────────────────────────────────────────────────
export const SecureNoteResponseSchema = z.object({
  id:          z.string(),
  patientId:   nul(z.string()),
  patientName: nul(z.string()),
  mrn:         nul(z.string()),
  type:        nul(z.string()),
  content:     z.string(),
  color:       nul(z.string()),
  visibility:  nul(z.string()),
  author:      nul(z.string()),
  createdBy:   nul(z.string()),
  pinned:      z.boolean(),
  expiresDate: z.string(),
  createdDate: nul(z.string()),
  updatedAt:   nul(z.string()),
});
export const SecureNoteListResponseSchema = z.array(SecureNoteResponseSchema);

// ── Messaging ─────────────────────────────────────────────────────────────────
export const ChannelResponseSchema = z.object({
  id:   z.string(),
  name: z.string(),
  type: nul(z.string()),
});
export const ChannelListResponseSchema = z.array(ChannelResponseSchema);

export const ChannelMessageResponseSchema = z.object({
  id:        z.string(),
  channelId: z.string(),
  userId:    z.string(),
  userName:  nul(z.string()),
  content:   z.string(),
  timestamp: nul(z.string()),
  reactions: z.record(z.any()),
});
export const ChannelMessageListResponseSchema = z.array(ChannelMessageResponseSchema);

export const DmResponseSchema = z.object({
  id:          z.string(),
  senderId:    z.string(),
  recipientId: z.string(),
  senderName:  nul(z.string()),
  content:     z.string(),
  timestamp:   nul(z.string()),
  reactions:   z.record(z.any()),
  read:        z.boolean(),
});
export const DmListResponseSchema = z.array(DmResponseSchema);

// ── Smart phrase ──────────────────────────────────────────────────────────────
export const SmartPhraseResponseSchema = z.object({
  id:          z.string(),
  name:        nul(z.string()),
  triggerText: nul(z.string()),
  content:     nul(z.string()),
  category:    nul(z.string()),
  userId:      nul(z.string()),
});
export const SmartPhraseListResponseSchema = z.array(SmartPhraseResponseSchema);

// ── Provider signature ────────────────────────────────────────────────────────
export const SignatureResponseSchema = z.object({
  signatureDataUrl: nul(z.string()),
  updatedAt:        nul(z.string()),
});

// ── BTG ───────────────────────────────────────────────────────────────────────
export const BtgGrantResponseSchema = z.object({
  success:   z.boolean(),
  logId:     z.string(),
  accessId:  z.string(),
  expiresAt: z.string(),
});
export const BtgCheckResponseSchema    = z.object({ hasAccess: z.boolean() });
export const BtgLogEntryResponseSchema = z.object({
  id:             z.string(),
  patientId:      z.string(),
  patientName:    nul(z.string()),
  accessedBy:     z.string(),
  accessedByName: nul(z.string()),
  reason:         nul(z.string()),
  timestamp:      nul(z.string()),
  approved:       z.boolean(),
});
export const BtgLogListResponseSchema = z.array(BtgLogEntryResponseSchema);
