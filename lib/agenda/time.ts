export const SLOT_MINUTES = 30;
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 20;

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function setTimeOnDate(date: Date, minutesFromMidnight: number): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMinutes(minutesFromMidnight);
  return d;
}

export function minutesFromMidnight(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function formatHHMM(d: Date): string {
  return d.toISOString().slice(11, 16);
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
