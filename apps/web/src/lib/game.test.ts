import { describe, expect, it } from 'vitest';
import { isAdjacent } from './game';

describe('isAdjacent', () => {
  it('is true for a wrong guess at 0 km (a shared border)', () => {
    expect(isAdjacent({ code: 'ESP', distanceKm: 0, band: 'burning' })).toBe(true);
  });

  it('is false for the answer itself and for any distance above zero', () => {
    expect(isAdjacent({ code: 'FRA', distanceKm: 0, band: 'found' })).toBe(false);
    expect(isAdjacent({ code: 'GBR', distanceKm: 33, band: 'burning' })).toBe(false);
  });
});
