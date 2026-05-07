import type { DataStore } from './types';

export const DEFAULT_DATA: DataStore = {
  users: [
    {
      id: 'user-admin',
      name: 'Admin',
      role: 'ADMIN',
      color: '#0f172a',
      email: 'admin@planfisio.it',
      active: true,
    },
    {
      id: 'user-secretary',
      name: 'Segreteria',
      role: 'SECRETARY',
      color: '#475569',
      email: 'segreteria@planfisio.it',
      active: true,
    },
    {
      id: 'user-simone',
      name: 'Simone Ganzerli',
      role: 'THERAPIST',
      color: '#2563eb',
      email: 'simone@planfisio.it',
      active: true,
    },
    {
      id: 'user-fabio',
      name: 'Fabio Rossi',
      role: 'THERAPIST',
      color: '#16a34a',
      email: 'fabio@planfisio.it',
      active: true,
    },
    {
      id: 'user-marta',
      name: 'Marta Bianchi',
      role: 'THERAPIST',
      color: '#db2777',
      email: 'marta@planfisio.it',
      active: true,
    },
  ],
  patients: [
    { id: 'pat-0', fullName: 'Mario Rossi' },
    { id: 'pat-1', fullName: 'Giulia Verdi' },
    { id: 'pat-2', fullName: 'Luca Neri' },
    { id: 'pat-3', fullName: 'Anna Conti' },
    { id: 'pat-4', fullName: 'Paolo Esposito' },
  ],
  resources: [
    { id: 'res-tecar', name: 'Tecar', type: 'TECAR', quantity: 1, active: true },
    { id: 'res-laser', name: 'Laser', type: 'LASER', quantity: 1, active: true },
    { id: 'res-viss', name: 'Viss Terapia', type: 'VISS', quantity: 1, active: true },
  ],
  therapies: [
    { id: 'th-tecar-30', name: 'Tecar 30 min', durationMinutes: 30, requiredResourceTypes: ['TECAR'] },
    { id: 'th-laser-20', name: 'Laser 20 min', durationMinutes: 20, requiredResourceTypes: ['LASER'] },
    { id: 'th-viss-45', name: 'Viss 45 min', durationMinutes: 45, requiredResourceTypes: ['VISS'] },
    { id: 'th-manuale-50', name: 'Terapia manuale 50 min', durationMinutes: 50, requiredResourceTypes: [] },
    { id: 'th-combo-60', name: 'Tecar + Laser 60 min', durationMinutes: 60, requiredResourceTypes: ['TECAR', 'LASER'] },
  ],
  appointments: [],
};
