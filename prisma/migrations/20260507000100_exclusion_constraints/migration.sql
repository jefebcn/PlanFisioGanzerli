-- Hard constraints DB-level: rete di sicurezza finale contro race condition
-- anche se la validazione applicativa fallisce.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Una stessa risorsa non può essere prenotata in intervalli sovrapposti.
-- Range half-open [start, end): slot [10:00, 10:30) e [10:30, 11:00) NON si sovrappongono.
ALTER TABLE "ResourceBooking"
  ADD CONSTRAINT "resource_no_overlap"
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  );

-- Lo stesso operatore non può avere due appuntamenti SCHEDULED sovrapposti.
ALTER TABLE "Appointment"
  ADD CONSTRAINT "therapist_no_overlap"
  EXCLUDE USING gist (
    "therapistId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  ) WHERE ("status" = 'SCHEDULED');
