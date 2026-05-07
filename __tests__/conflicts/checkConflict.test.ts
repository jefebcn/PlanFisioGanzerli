import { describe, expect, it } from 'vitest';
import { checkConflict } from '@/lib/conflicts/checkConflict';
import type { CheckConflictInput } from '@/lib/conflicts';
import type { DataStore, StoredAppointment, StoredUser, StoredPatient, StoredResource } from '@/lib/storage/types';

function makeStore(opts: { appointments?: Partial<StoredAppointment>[] } = {}): DataStore {
  const users: StoredUser[] = [
    { id: 'simone', name: 'Simone Ganzerli', role: 'THERAPIST', color: '#2563eb', email: 's@x', active: true },
    { id: 'fabio', name: 'Fabio Rossi', role: 'THERAPIST', color: '#16a34a', email: 'f@x', active: true },
    { id: 'marta', name: 'Marta Bianchi', role: 'THERAPIST', color: '#db2777', email: 'm@x', active: true },
  ];
  const patients: StoredPatient[] = [
    { id: 'mario', fullName: 'Mario Rossi' },
    { id: 'anna', fullName: 'Anna Conti' },
  ];
  const resources: StoredResource[] = [
    { id: 'res-tecar', name: 'Tecar', type: 'TECAR', quantity: 1, active: true },
    { id: 'res-laser', name: 'Laser', type: 'LASER', quantity: 1, active: true },
  ];
  const appointments: StoredAppointment[] = (opts.appointments ?? []).map((a, i) => ({
    id: `appt-${i}`,
    therapistId: 'simone',
    patientId: 'mario',
    therapyId: 'th-tecar-30',
    startsAt: new Date('2026-05-07T10:00:00Z').toISOString(),
    endsAt: new Date('2026-05-07T10:30:00Z').toISOString(),
    status: 'SCHEDULED',
    createdById: 'simone',
    version: 0,
    resourceBookings: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...a,
  }));
  return { users, patients, resources, therapies: [], appointments };
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
  it('nessun conflitto quando non ci sono appuntamenti', async () => {
    const report = await checkConflict(baseInput, makeStore());
    expect(report.hasHardConflict).toBe(false);
    expect(report.items.filter((i) => i.severity === 'HARD')).toHaveLength(0);
  });

  it('rifiuta range invalido (end <= start)', async () => {
    const report = await checkConflict(
      { ...baseInput, endsAt: new Date('2026-05-07T10:00:00Z') },
      makeStore(),
    );
    expect(report.hasHardConflict).toBe(true);
    expect(report.items[0].kind).toBe('INVALID_RANGE');
  });

  it('slot adiacenti [10:00,10:30) e [10:30,11:00) NON sono in conflitto', async () => {
    const store = makeStore({
      appointments: [{
        id: 'existing-1', therapistId: 'simone',
        startsAt: '2026-05-07T10:30:00.000Z', endsAt: '2026-05-07T11:00:00.000Z',
      }],
    });
    const report = await checkConflict(baseInput, store);
    expect(report.items.find((i) => i.kind === 'THERAPIST_BUSY')).toBeUndefined();
  });

  it('rileva conflitto operatore quando overlap reale', async () => {
    const store = makeStore({
      appointments: [{
        id: 'existing-1', therapistId: 'simone', patientId: 'anna',
        startsAt: '2026-05-07T10:15:00.000Z', endsAt: '2026-05-07T10:45:00.000Z',
      }],
    });
    const report = await checkConflict(baseInput, store);
    const c = report.items.find((i) => i.kind === 'THERAPIST_BUSY');
    expect(c).toBeDefined();
    expect(c?.severity).toBe('HARD');
    expect(c?.message).toContain('Anna Conti');
    expect(report.hasHardConflict).toBe(true);
  });

  it('rileva conflitto risorsa (Tecar già occupata)', async () => {
    const store = makeStore({
      appointments: [{
        id: 'existing-1', therapistId: 'simone',
        startsAt: '2026-05-07T10:00:00.000Z', endsAt: '2026-05-07T10:30:00.000Z',
        resourceBookings: [{
          id: 'rb-1', resourceId: 'res-tecar',
          startsAt: '2026-05-07T10:00:00.000Z', endsAt: '2026-05-07T10:30:00.000Z',
        }],
      }],
    });
    const report = await checkConflict({ ...baseInput, therapistId: 'fabio' }, store);
    const c = report.items.find((i) => i.kind === 'RESOURCE_BUSY');
    expect(c).toBeDefined();
    expect(c?.severity).toBe('HARD');
    expect(c?.message).toContain('Tecar');
    expect(c?.message).toContain('Simone');
  });

  it('conflitto paziente è SOFT di default', async () => {
    const store = makeStore({
      appointments: [{
        id: 'existing-2', therapistId: 'fabio', patientId: 'mario',
        startsAt: '2026-05-07T10:15:00.000Z', endsAt: '2026-05-07T10:45:00.000Z',
      }],
    });
    const report = await checkConflict(baseInput, store);
    const c = report.items.find((i) => i.kind === 'PATIENT_DOUBLE_BOOK');
    expect(c).toBeDefined();
    expect(c?.severity).toBe('SOFT');
    expect(report.hasSoftConflict).toBe(true);
  });

  it('non segnala conflitto su sé stesso (update)', async () => {
    const store = makeStore({
      appointments: [{
        id: 'self', therapistId: 'simone', patientId: 'mario',
        startsAt: '2026-05-07T10:00:00.000Z', endsAt: '2026-05-07T10:30:00.000Z',
      }],
    });
    const report = await checkConflict({ ...baseInput, appointmentId: 'self' }, store);
    expect(report.items.find((i) => i.kind === 'THERAPIST_BUSY')).toBeUndefined();
  });

  it('aggrega conflitto risorsa multiplo (Tecar + Laser)', async () => {
    const store = makeStore({
      appointments: [
        {
          id: 'a-1', therapistId: 'simone',
          startsAt: '2026-05-07T10:00:00.000Z', endsAt: '2026-05-07T10:30:00.000Z',
          resourceBookings: [{ id: 'rb-tecar', resourceId: 'res-tecar', startsAt: '2026-05-07T10:00:00.000Z', endsAt: '2026-05-07T10:30:00.000Z' }],
        },
        {
          id: 'a-2', therapistId: 'fabio',
          startsAt: '2026-05-07T10:00:00.000Z', endsAt: '2026-05-07T10:30:00.000Z',
          resourceBookings: [{ id: 'rb-laser', resourceId: 'res-laser', startsAt: '2026-05-07T10:00:00.000Z', endsAt: '2026-05-07T10:30:00.000Z' }],
        },
      ],
    });
    const report = await checkConflict(
      { ...baseInput, therapistId: 'marta', resourceIds: ['res-tecar', 'res-laser'] },
      store,
    );
    const conflicts = report.items.filter((i) => i.kind === 'RESOURCE_BUSY');
    expect(conflicts).toHaveLength(2);
    expect(report.hasHardConflict).toBe(true);
  });
});
