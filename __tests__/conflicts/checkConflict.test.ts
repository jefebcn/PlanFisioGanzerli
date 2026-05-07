import { describe, expect, it } from 'vitest';
import { checkConflict } from '@/lib/conflicts/checkConflict';
import type { CheckConflictInput } from '@/lib/conflicts';

/**
 * Stub minimale di PrismaClient per checkConflict.
 * Implementa il where Prisma {therapistId/patientId, startsAt: {lt}, endsAt: {gt}, id: {not}}.
 */
function makeStubDb(opts: {
  therapistAppointments?: any[];
  patientAppointments?: any[];
  resourceBookings?: any[];
}) {
  const tList = opts.therapistAppointments ?? [];
  const pList = opts.patientAppointments ?? [];
  const rList = opts.resourceBookings ?? [];

  function matchOverlap(record: { startsAt: Date; endsAt: Date }, where: any): boolean {
    const ltEnd: Date = where.startsAt.lt;
    const gtStart: Date = where.endsAt.gt;
    return record.startsAt < ltEnd && record.endsAt > gtStart;
  }

  return {
    appointment: {
      findFirst: async ({ where }: any) => {
        const list = where.therapistId !== undefined ? tList : pList;
        const excludeId = where.id?.not;
        const filterId = where.therapistId ?? where.patientId;
        const idField = where.therapistId !== undefined ? 'therapistId' : 'patientId';
        return (
          list.find(
            (a) =>
              a.id !== excludeId &&
              a[idField] === filterId &&
              matchOverlap(a, where),
          ) ?? null
        );
      },
    },
    resourceBooking: {
      findMany: async ({ where }: any) => {
        const excludeId = where.appointmentId?.not;
        return rList.filter(
          (rb) =>
            rb.appointmentId !== excludeId &&
            where.resourceId.in.includes(rb.resourceId) &&
            matchOverlap(rb, where),
        );
      },
    },
  } as any;
}

const baseInput: CheckConflictInput = {
  therapistId: 'simone',
  patientId: 'mario',
  therapyId: 'th-tecar-30',
  startsAt: new Date('2026-05-07T10:00:00Z'),
  endsAt: new Date('2026-05-07T10:30:00Z'),
  resourceIds: ['res-tecar'],
};

describe('checkConflict — logica di overlap', () => {
  it('nessun conflitto quando non ci sono appuntamenti esistenti', async () => {
    const db = makeStubDb({});
    const report = await checkConflict(baseInput, db);
    expect(report.hasHardConflict).toBe(false);
    expect(report.items.filter((i) => i.severity === 'HARD')).toHaveLength(0);
  });

  it('rifiuta range invalido (end <= start)', async () => {
    const db = makeStubDb({});
    const report = await checkConflict(
      {
        ...baseInput,
        endsAt: new Date('2026-05-07T10:00:00Z'),
      },
      db,
    );
    expect(report.hasHardConflict).toBe(true);
    expect(report.items[0].kind).toBe('INVALID_RANGE');
  });

  it('slot adiacenti [10:00,10:30) e [10:30,11:00) NON sono in conflitto', async () => {
    const db = makeStubDb({
      therapistAppointments: [
        {
          id: 'existing-1',
          therapistId: 'simone',
          startsAt: new Date('2026-05-07T10:30:00Z'),
          endsAt: new Date('2026-05-07T11:00:00Z'),
          patient: { fullName: 'X' },
        },
      ],
    });
    const report = await checkConflict(baseInput, db);
    expect(report.items.find((i) => i.kind === 'THERAPIST_BUSY')).toBeUndefined();
  });

  it('rileva conflitto operatore quando overlap reale', async () => {
    const db = makeStubDb({
      therapistAppointments: [
        {
          id: 'existing-1',
          therapistId: 'simone',
          startsAt: new Date('2026-05-07T10:15:00Z'),
          endsAt: new Date('2026-05-07T10:45:00Z'),
          patient: { fullName: 'Anna Conti' },
        },
      ],
    });
    const report = await checkConflict(baseInput, db);
    const c = report.items.find((i) => i.kind === 'THERAPIST_BUSY');
    expect(c).toBeDefined();
    expect(c?.severity).toBe('HARD');
    expect(c?.message).toContain('Anna Conti');
    expect(report.hasHardConflict).toBe(true);
  });

  it('rileva conflitto risorsa (Tecar già occupata da altro operatore)', async () => {
    const db = makeStubDb({
      resourceBookings: [
        {
          id: 'rb-1',
          appointmentId: 'a-other',
          resourceId: 'res-tecar',
          startsAt: new Date('2026-05-07T10:00:00Z'),
          endsAt: new Date('2026-05-07T10:30:00Z'),
          resource: { name: 'Tecar' },
          appointment: { therapist: { name: 'Simone Ganzerli' } },
        },
      ],
    });
    const report = await checkConflict(
      { ...baseInput, therapistId: 'fabio' },
      db,
    );
    const c = report.items.find((i) => i.kind === 'RESOURCE_BUSY');
    expect(c).toBeDefined();
    expect(c?.severity).toBe('HARD');
    expect(c?.message).toContain('Tecar');
    expect(c?.message).toContain('Simone');
  });

  it('conflitto paziente è SOFT di default (warning, non bloccante)', async () => {
    const db = makeStubDb({
      patientAppointments: [
        {
          id: 'existing-2',
          patientId: 'mario',
          startsAt: new Date('2026-05-07T10:15:00Z'),
          endsAt: new Date('2026-05-07T10:45:00Z'),
          therapist: { name: 'Fabio Rossi' },
        },
      ],
    });
    const report = await checkConflict(baseInput, db);
    const c = report.items.find((i) => i.kind === 'PATIENT_DOUBLE_BOOK');
    expect(c).toBeDefined();
    expect(c?.severity).toBe('SOFT');
    expect(report.hasSoftConflict).toBe(true);
  });

  it('non segnala conflitto su sé stesso (update di un appuntamento esistente)', async () => {
    const db = makeStubDb({
      therapistAppointments: [
        {
          id: 'self',
          therapistId: 'simone',
          startsAt: new Date('2026-05-07T10:00:00Z'),
          endsAt: new Date('2026-05-07T10:30:00Z'),
          patient: { fullName: 'Mario Rossi' },
        },
      ],
    });
    const report = await checkConflict(
      { ...baseInput, appointmentId: 'self' },
      db,
    );
    expect(report.items.find((i) => i.kind === 'THERAPIST_BUSY')).toBeUndefined();
  });

  it('aggrega messaggio di conflitto risorsa multiplo (Tecar + Laser)', async () => {
    const db = makeStubDb({
      resourceBookings: [
        {
          id: 'rb-tecar',
          appointmentId: 'a-1',
          resourceId: 'res-tecar',
          startsAt: new Date('2026-05-07T10:00:00Z'),
          endsAt: new Date('2026-05-07T10:30:00Z'),
          resource: { name: 'Tecar' },
          appointment: { therapist: { name: 'Simone' } },
        },
        {
          id: 'rb-laser',
          appointmentId: 'a-2',
          resourceId: 'res-laser',
          startsAt: new Date('2026-05-07T10:00:00Z'),
          endsAt: new Date('2026-05-07T10:30:00Z'),
          resource: { name: 'Laser' },
          appointment: { therapist: { name: 'Fabio' } },
        },
      ],
    });
    const report = await checkConflict(
      {
        ...baseInput,
        therapistId: 'marta',
        resourceIds: ['res-tecar', 'res-laser'],
      },
      db,
    );
    const conflicts = report.items.filter((i) => i.kind === 'RESOURCE_BUSY');
    expect(conflicts).toHaveLength(2);
    expect(report.hasHardConflict).toBe(true);
  });
});
