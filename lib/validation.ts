import { z } from 'zod';

export const isoDateTime = z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
  message: 'Data non valida',
});

export const overrideSchema = z.object({
  reason: z.enum(['EMERGENCY', 'SUBSTITUTE_DEVICE', 'MANAGER_DECISION']),
  note: z.string().min(1).max(500),
});

export const createAppointmentSchema = z.object({
  therapistId: z.string().min(1),
  patientId: z.string().optional(),
  newPatientName: z.string().min(1).max(200).optional(),
  therapyId: z.string().min(1),
  startsAt: isoDateTime,
  endsAt: isoDateTime,
  resourceIds: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional().nullable(),
  override: overrideSchema.optional(),
}).refine((d) => d.patientId || d.newPatientName, {
  message: 'patientId o newPatientName obbligatorio',
});

export const checkConflictSchema = z.object({
  appointmentId: z.string().optional(),
  therapistId: z.string().min(1),
  patientId: z.string().min(1),
  therapyId: z.string().min(1),
  startsAt: isoDateTime,
  endsAt: isoDateTime,
  resourceIds: z.array(z.string()).default([]),
});

export const moveAppointmentSchema = z.object({
  startsAt: isoDateTime,
  endsAt: isoDateTime,
  expectedVersion: z.number().int().min(0),
  override: overrideSchema.optional(),
});
