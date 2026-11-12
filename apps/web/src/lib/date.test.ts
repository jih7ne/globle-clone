import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { formatCountdown, localDate, msUntilLocalMidnight } from './date';

const HOUR = 3_600_000;

// Paris has both kinds of DST day. Node applies a TZ change made at run time.
const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'Europe/Paris';
});
afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

describe('localDate', () => {
  it('uses the local calendar day, not the UTC one', () => {
    // 23:30 UTC on 11 November is already 12 November in Paris.
    expect(localDate(new Date('2026-11-11T23:30:00Z'))).toBe('2026-11-12');
  });
});

describe('msUntilLocalMidnight (FR-12)', () => {
  it('is 24 hours at midnight on an ordinary day', () => {
    expect(msUntilLocalMidnight(new Date('2026-11-12T00:00:00+01:00'))).toBe(24 * HOUR);
  });

  it('is 1 second one second before midnight', () => {
    expect(msUntilLocalMidnight(new Date('2026-11-12T23:59:59+01:00'))).toBe(1000);
  });

  it('counts a 23-hour day when the clocks go forward', () => {
    expect(msUntilLocalMidnight(new Date('2027-03-28T00:00:00+01:00'))).toBe(23 * HOUR);
  });

  it('counts a 25-hour day when the clocks go back', () => {
    expect(msUntilLocalMidnight(new Date('2026-10-25T00:00:00+02:00'))).toBe(25 * HOUR);
  });
});

describe('formatCountdown', () => {
  it('pads hours, minutes and seconds', () => {
    expect(formatCountdown(3 * HOUR + 4 * 60_000 + 5000)).toBe('03:04:05');
  });

  it('drops milliseconds instead of rounding up', () => {
    expect(formatCountdown(999)).toBe('00:00:00');
  });

  it('shows 25 hours on the long DST day', () => {
    expect(formatCountdown(25 * HOUR)).toBe('25:00:00');
  });

  it('never goes negative', () => {
    expect(formatCountdown(-5000)).toBe('00:00:00');
  });
});
