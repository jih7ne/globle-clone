const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses a YYYY-MM-DD calendar date to UTC midnight in ms, or null if invalid. */
export function parseDate(value: unknown): number | null {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  // Rejects dates that Date.parse rolls over, such as 2026-02-30.
  if (Number.isNaN(ms) || toIsoDate(ms) !== value) return null;
  return ms;
}

export function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * NFR-03: a local date is accepted only while it is the current date somewhere
 * between UTC-12 and UTC+14.
 */
export function isLiveDate(date: string, nowMs: number): boolean {
  return date >= toIsoDate(nowMs - 12 * HOUR) && date <= toIsoDate(nowMs + 14 * HOUR);
}

/** Day #1 is the launch date. Dates before it give 0 or less. */
export function dayNumber(date: string, launchDate: string): number {
  const d = parseDate(date);
  const l = parseDate(launchDate);
  if (d === null || l === null) throw new RangeError(`Invalid date: ${date} or ${launchDate}`);
  return Math.round((d - l) / DAY) + 1;
}
