import type { ConflictReport } from './types';

export class ConflictError extends Error {
  readonly report: ConflictReport;
  readonly code = 'CONFLICT';

  constructor(report: ConflictReport) {
    super(
      report.items.length > 0
        ? report.items.map((i) => i.message).join('; ')
        : 'Conflitto rilevato',
    );
    this.name = 'ConflictError';
    this.report = report;
  }
}

export class StaleVersionError extends Error {
  readonly code = 'STALE_VERSION';
  constructor(public appointmentId: string) {
    super(`Appuntamento ${appointmentId} è stato modificato da un altro utente`);
    this.name = 'StaleVersionError';
  }
}

export class OverrideNotAllowedError extends Error {
  readonly code = 'OVERRIDE_NOT_ALLOWED';
  constructor() {
    super('Solo i ruoli ADMIN o SECRETARY possono forzare un appuntamento in conflitto');
    this.name = 'OverrideNotAllowedError';
  }
}
