import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed start…');

  const [admin, secretary, simone, fabio, marta] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@planfisio.local' },
      update: {},
      create: {
        email: 'admin@planfisio.local',
        name: 'Admin',
        role: 'ADMIN',
        color: '#0f172a',
      },
    }),
    prisma.user.upsert({
      where: { email: 'segreteria@planfisio.local' },
      update: {},
      create: {
        email: 'segreteria@planfisio.local',
        name: 'Segreteria',
        role: 'SECRETARY',
        color: '#475569',
      },
    }),
    prisma.user.upsert({
      where: { email: 'simone@planfisio.local' },
      update: {},
      create: {
        email: 'simone@planfisio.local',
        name: 'Simone Ganzerli',
        role: 'THERAPIST',
        color: '#2563eb',
      },
    }),
    prisma.user.upsert({
      where: { email: 'fabio@planfisio.local' },
      update: {},
      create: {
        email: 'fabio@planfisio.local',
        name: 'Fabio Rossi',
        role: 'THERAPIST',
        color: '#16a34a',
      },
    }),
    prisma.user.upsert({
      where: { email: 'marta@planfisio.local' },
      update: {},
      create: {
        email: 'marta@planfisio.local',
        name: 'Marta Bianchi',
        role: 'THERAPIST',
        color: '#db2777',
      },
    }),
  ]);

  const resources = await Promise.all([
    prisma.resource.upsert({
      where: { id: 'res-tecar' },
      update: {},
      create: { id: 'res-tecar', name: 'Tecar', type: 'TECAR' },
    }),
    prisma.resource.upsert({
      where: { id: 'res-laser' },
      update: {},
      create: { id: 'res-laser', name: 'Laser', type: 'LASER' },
    }),
    prisma.resource.upsert({
      where: { id: 'res-viss' },
      update: {},
      create: { id: 'res-viss', name: 'Viss Terapia', type: 'VISS' },
    }),
  ]);

  const therapies = await Promise.all([
    prisma.therapy.upsert({
      where: { id: 'th-tecar-30' },
      update: {},
      create: {
        id: 'th-tecar-30',
        name: 'Tecar 30 min',
        durationMinutes: 30,
        requiredResourceTypes: ['TECAR'],
      },
    }),
    prisma.therapy.upsert({
      where: { id: 'th-laser-20' },
      update: {},
      create: {
        id: 'th-laser-20',
        name: 'Laser 20 min',
        durationMinutes: 20,
        requiredResourceTypes: ['LASER'],
      },
    }),
    prisma.therapy.upsert({
      where: { id: 'th-viss-45' },
      update: {},
      create: {
        id: 'th-viss-45',
        name: 'Viss 45 min',
        durationMinutes: 45,
        requiredResourceTypes: ['VISS'],
      },
    }),
    prisma.therapy.upsert({
      where: { id: 'th-manuale-50' },
      update: {},
      create: {
        id: 'th-manuale-50',
        name: 'Terapia manuale 50 min',
        durationMinutes: 50,
        requiredResourceTypes: [],
      },
    }),
    prisma.therapy.upsert({
      where: { id: 'th-combo-60' },
      update: {},
      create: {
        id: 'th-combo-60',
        name: 'Tecar + Laser 60 min',
        durationMinutes: 60,
        requiredResourceTypes: ['TECAR', 'LASER'],
      },
    }),
  ]);

  const patients = await Promise.all(
    [
      'Mario Rossi',
      'Giulia Verdi',
      'Luca Neri',
      'Anna Conti',
      'Paolo Esposito',
    ].map((fullName, i) =>
      prisma.patient.upsert({
        where: { id: `pat-${i}` },
        update: {},
        create: { id: `pat-${i}`, fullName },
      }),
    ),
  );

  console.log('Seed done:', {
    users: 5,
    resources: resources.length,
    therapies: therapies.length,
    patients: patients.length,
  });
  console.log('Login demo (set cookie pfg_actor):');
  console.log('  ADMIN:     ', admin.id);
  console.log('  SECRETARY: ', secretary.id);
  console.log('  Simone:    ', simone.id);
  console.log('  Fabio:     ', fabio.id);
  console.log('  Marta:     ', marta.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
