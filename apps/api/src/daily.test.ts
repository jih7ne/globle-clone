import { describe, expect, it } from 'vitest';
import distances from './data/distances.json';
import { createDailyPicker, cycleOrder } from './daily';

const CODES = distances.codes;

describe('cycleOrder', () => {
  it('is a permutation of all countries', async () => {
    const order = await cycleOrder('secret', 0, CODES);
    expect(order).toHaveLength(CODES.length);
    expect([...order].sort()).toEqual([...CODES].sort());
  });

  it('is deterministic for the same secret and cycle', async () => {
    expect(await cycleOrder('secret', 3, CODES)).toEqual(await cycleOrder('secret', 3, CODES));
  });

  it('changes with the cycle and with the secret', async () => {
    const base = await cycleOrder('secret', 0, CODES);
    expect(await cycleOrder('secret', 1, CODES)).not.toEqual(base);
    expect(await cycleOrder('other-secret', 0, CODES)).not.toEqual(base);
  });

  it('does not leave the list in its original order', async () => {
    const order = await cycleOrder('secret', 0, CODES);
    const unchanged = order.filter((c, i) => c === CODES[i]).length;
    expect(unchanged).toBeLessThan(10);
  });
});

describe('createDailyPicker', () => {
  const pick = createDailyPicker('secret', CODES);

  it('never repeats a country within a cycle', async () => {
    const days = await Promise.all(CODES.map((_, i) => pick(i + 1)));
    expect(new Set(days).size).toBe(CODES.length);
  });

  it('starts a new shuffle after each cycle', async () => {
    const n = CODES.length;
    const cycle0 = await Promise.all(CODES.map((_, i) => pick(i + 1)));
    const cycle1 = await Promise.all(CODES.map((_, i) => pick(n + i + 1)));
    expect(new Set(cycle1).size).toBe(n);
    expect(cycle1).not.toEqual(cycle0);
  });

  it('gives the same country for the same day', async () => {
    expect(await pick(42)).toBe(await createDailyPicker('secret', CODES)(42));
  });

  it.each([0, -1, 1.5, NaN])('rejects day number %d', async (day) => {
    await expect(pick(day)).rejects.toThrow(RangeError);
  });
});
