export type UserRole = 'ADMIN' | 'SECRETARY' | 'THERAPIST';
export type ResourceType = 'TECAR' | 'LASER' | 'VISS' | 'ROOM';
export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type OverrideReason = 'EMERGENCY' | 'SUBSTITUTE_DEVICE' | 'MANAGER_DECISION';

export interface StoredUser {
  id: string;
  name: string;
  role: UserRole;
  color: string;
  email: string;
  passwordHash?: string;
  active: boolean;
}

export interface StoredPatient {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
}

export interface StoredResource {
  id: string;
  name: string;
  type: ResourceType;
  quantity: number;
  active: boolean;
}

export interface StoredTherapy {
  id: string;
  name: string;
  durationMinutes: number;
  requiredResourceTypes: ResourceType[];
}

export interface StoredConflictOverride {
  reason: OverrideReason;
  note: string;
  approvedById: string;
  createdAt: string;
}

export interface StoredResourceBooking {
  id: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
}

export interface StoredAppointment {
  id: string;
  therapistId: string;
  patientId: string;
  therapyId: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  notes?: string;
  createdById: string;
  version: number;
  override?: StoredConflictOverride;
  resourceBookings: StoredResourceBooking[];
  createdAt: string;
  updatedAt: string;
}

export interface DataStore {
  users: StoredUser[];
  patients: StoredPatient[];
  resources: StoredResource[];
  therapies: StoredTherapy[];
  appointments: StoredAppointment[];
}
