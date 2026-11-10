import { describe, expect, it } from 'vitest';
import { dayNumber, isLiveDate, parseDate, toIsoDate } from './dates';

describe('parseDate', () => {
  it('parses a calendar date to UTC midnight', () => {
    expect(parseDate('2026-11-10')).toBe(Date.UTC(2026, 10, 10));
    expect(parseDate('2028-02-29')).toBe(Date.UTC(2028, 1, 29));
  });

  it.each([
    '2026-02-30',
    '2027-02-29',
    '2026-13-01',
    '2026-1-01',
    '2026-11-10T00:00:00Z',
    ' 2026-11-10',
    '',
    null,
    20261110,
    undefined,
  ])('rejects %j', (value) => {
    expect(parseDate(value)).toBeNull();
  });
});

describe('dayNumber', () => {
  it('counts day #1 from the launch date', () => {
    expect(dayNumber('2026-11-10', '2026-11-10')).toBe(1);
    expect(dayNumber('2026-11-11', '2026-11-10')).toBe(2);
    expect(dayNumber('2027-11-10', '2026-11-10')).toBe(366);
    expect(dayNumber('2026-11-09', '2026-11-10')).toBe(0);
  });

  it('is not affected by daylight saving time (dates are UTC midnights)', () => {
    expect(dayNumber('2027-03-29', '2027-03-27')).toBe(3);
    expect(dayNumber('2027-10-31', '2027-10-30')).toBe(2);
  });

  it('throws on invalid input', () => {
    expect(() => dayNumber('nope', '2026-11-10')).toThrow(RangeError);
  });
});

describe('isLiveDate (UTC-12 to UTC+14)', () => {
  const at = (iso: string) => Date.parse(iso);

  it('accepts the UTC date and its neighbours while they are live somewhere', () => {
    const now = at('2026-11-20T12:00:00Z');
    expect(isLiveDate('2026-11-20', now)).toBe(true);
    expect(isLiveDate('2026-11-21', now)).toBe(true); // 02:00 on the 21st in UTC+14
    expect(isLiveDate('2026-11-19', now)).toBe(false); // midnight just passed in UTC-12
    expect(isLiveDate('2026-11-22', now)).toBe(false);
  });

  it('opens tomorrow exactly when UTC+14 reaches midnight (10:00 UTC)', () => {
    expect(isLiveDate('2026-11-21', at('2026-11-20T09:59:59Z'))).toBe(false);
    expect(isLiveDate('2026-11-21', at('2026-11-20T10:00:00Z'))).toBe(true);
  });

  it('closes yesterday exactly when UTC-12 reaches midnight (12:00 UTC)', () => {
    expect(isLiveDate('2026-11-19', at('2026-11-20T11:59:59Z'))).toBe(true);
    expect(isLiveDate('2026-11-19', at('2026-11-20T12:00:00Z'))).toBe(false);
  });

  it('has three live dates between 10:00 and 12:00 UTC', () => {
    const now = at('2026-11-20T11:00:00Z');
    expect(['2026-11-19', '2026-11-20', '2026-11-21'].every((d) => isLiveDate(d, now))).toBe(true);
  });
});

describe('toIsoDate', () => {
  it('formats a UTC timestamp', () => {
    expect(toIsoDate(Date.UTC(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
