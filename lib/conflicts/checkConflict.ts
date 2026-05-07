import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  CheckConflictInput,
  ConflictItem,
  ConflictReport,
} from './types';

type Db = PrismaClient | Prisma.TransactionClient;

const BUSINESS_HOURS = { start: 7, end: 21 };
const PATIENT_CONFLICT_HARD = process.env.STRICT_PATIENT_CONFLICTS === 'true';

function formatTime(d: Date): string {
  return d.toISOString().slice(11, 16);
}

export async function checkConflict(
  input: CheckConflictInput,
  db: Db,
): Promise<ConflictReport> {
  const items: ConflictItem[] = [];

  if (input.endsAt <= input.startsAt) {
    items.push({
      kind: 'INVALID_RANGE',
      severity: 'HARD',
      message: 'Orario di fine deve essere successivo a quello di inizio',
    });
    return { hasHardConflict: true, hasSoftConflict: false, items };
  }

  const startHour = input.startsAt.getUTCHours();
  const endHour = input.endsAt.getUTCHours();
  if (startHour < BUSINESS_HOURS.start || endHour > BUSINESS_HOURS.end) {
    items.push({
      kind: 'OUTSIDE_BUSINESS_HOURS',
      severity: 'SOFT',
      message: `Orario fuori dalla fascia ${BUSINESS_HOURS.start}:00–${BUSINESS_HOURS.end}:00`,
    });
  }

  const excludeId = input.appointmentId ?? '__none__';
  const overlap = {
    startsAt: { lt: input.endsAt },
    endsAt: { gt: input.startsAt },
  };

  const [therapistBusy, patientBusy, resourceBusy] = await Promise.all([
    db.appointment.findFirst({
      where: {
        id: { not: excludeId },
        status: 'SCHEDULED',
        therapistId: input.therapistId,
        ...overlap,
      },
      include: { patient: true },
    }),
    db.appointment.findFirst({
      where: {
        id: { not: excludeId },
        status: 'SCHEDULED',
        patientId: input.patientId,
        ...overlap,
      },
      include: { therapist: true },
    }),
    input.resourceIds.length === 0
      ? Promise.resolve([])
      : db.resourceBooking.findMany({
          where: {
            appointmentId: { not: excludeId },
            resourceId: { in: input.resourceIds },
            ...overlap,
          },
          include: {
            resource: true,
            appointment: { include: { therapist: true } },
          },
        }),
  ]);

  if (therapistBusy) {
    items.push({
      kind: 'THERAPIST_BUSY',
      severity: 'HARD',
      message: `Operatore già impegnato con ${therapistBusy.patient.fullName} (${formatTime(therapistBusy.startsAt)}–${formatTime(therapistBusy.endsAt)})`,
      conflictingId: therapistBusy.id,
    });
  }

  if (patientBusy) {
    items.push({
      kind: 'PATIENT_DOUBLE_BOOK',
      severity: PATIENT_CONFLICT_HARD ? 'HARD' : 'SOFT',
      message: `Paziente già in agenda con ${patientBusy.therapist.name} (${formatTime(patientBusy.startsAt)}–${formatTime(patientBusy.endsAt)})`,
      conflictingId: patientBusy.id,
    });
  }

  for (const rb of resourceBusy) {
    items.push({
      kind: 'RESOURCE_BUSY',
      severity: 'HARD',
      message: `Risorsa ${rb.resource.name} già occupata da ${rb.appointment.therapist.name} (${formatTime(rb.startsAt)}–${formatTime(rb.endsAt)})`,
      conflictingId: rb.appointmentId,
      resourceId: rb.resourceId,
    });
  }

  return {
    hasHardConflict: items.some((i) => i.severity === 'HARD'),
    hasSoftConflict: items.some((i) => i.severity === 'SOFT'),
    items,
  };
}
