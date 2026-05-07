import type { OverrideReason, UserRole } from '@prisma/client';

export type ConflictKind =
  | 'THERAPIST_BUSY'
  | 'PATIENT_DOUBLE_BOOK'
  | 'RESOURCE_BUSY'
  | 'OUTSIDE_BUSINESS_HOURS'
  | 'INVALID_RANGE';

export type Severity = 'HARD' | 'SOFT';

export interface ConflictItem {
  kind: ConflictKind;
  severity: Severity;
  message: string;
  conflictingId?: string;
  resourceId?: string;
}

export interface ConflictReport {
  hasHardConflict: boolean;
  hasSoftConflict: boolean;
  items: ConflictItem[];
}

export interface CheckConflictInput {
  appointmentId?: string;
  therapistId: string;
  patientId: string;
  therapyId: string;
  startsAt: Date;
  endsAt: Date;
  resourceIds: string[];
}

export interface OverrideInput {
  reason: OverrideReason;
  note: string;
}

export interface BookingActor {
  id: string;
  role: UserRole;
}

export const OVERRIDE_ROLES: UserRole[] = ['ADMIN', 'SECRETARY'];
