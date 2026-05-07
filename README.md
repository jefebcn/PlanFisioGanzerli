# PlanFisioGanzerli

Gestionale per fisioterapisti con **sistema intelligente di rilevamento conflitti** su tre dimensioni: operatore, paziente e macchinari (Tecar, Laser, Viss Terapia).

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Prisma 5** + **PostgreSQL 16** (con vincoli `EXCLUDE USING gist` come ultima rete di sicurezza)
- **Socket.IO** per il real-time tra dispositivi
- **Tailwind CSS** per la UI
- **Vitest** per i test

## Quickstart

```bash
# 1. Variabili d'ambiente
cp .env.example .env

# 2. Database
docker compose up -d postgres

# 3. Dipendenze
npm install

# 4. Migrazioni + seed
npx prisma migrate deploy
npx prisma db seed

# 5. Dev server (Next + Socket.IO sullo stesso processo)
npm run dev
```

Apri `http://localhost:3000/calendar`.

## Strategia conflitti

| Tipo                     | Severity | Default |
| ------------------------ | -------- | ------- |
| Operatore sovrapposto    | HARD     | Block   |
| Risorsa già occupata     | HARD     | Block   |
| Paziente già in agenda   | SOFT     | Warning |
| Range invalido           | HARD     | Block   |
| Fuori orario business    | SOFT     | Warning |

**Override**: solo i ruoli `ADMIN` e `SECRETARY` possono forzare un appuntamento in conflitto, tracciando motivazione (`EMERGENCY`, `SUBSTITUTE_DEVICE`, `MANAGER_DECISION`) e nota nel record `ConflictOverride`.

Per attivare l'enforcement HARD anche sui pazienti:

```env
STRICT_PATIENT_CONFLICTS=true
```

## Architettura

```
Client (Next.js)  ──Server Action / fetch──►  /api/appointments
        ▲                                              │
        │ Socket.IO                                    ▼
        │                                       lib/conflicts
        │                                       ├─ checkConflict()      → ConflictReport
        │                                       └─ bookAppointment()    → tx + advisory lock
        │                                              │
        └─ broadcast appointment:* ◄────  Socket.IO ◄──┘
                                                 │
                                                 ▼
                                         PostgreSQL
                                         EXCLUDE USING gist
```

## Test

```bash
npm test              # unit test logica conflitti
npm run typecheck     # TypeScript
npm run build         # build di produzione
```

## File chiave

- `lib/conflicts/checkConflict.ts` — funzione di validazione
- `lib/conflicts/bookAppointment.ts` — transazione + `pg_advisory_xact_lock`
- `prisma/migrations/20260507000100_exclusion_constraints/migration.sql` — vincoli DB-level
- `lib/realtime/socketServer.ts` — init Socket.IO
- `components/calendar/BookingDialog.tsx` — form con check live
- `components/calendar/ConflictBanner.tsx` — feedback conflitti
- `components/calendar/OverrideModal.tsx` — modal di override motivato
