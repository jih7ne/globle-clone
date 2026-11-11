import { describe, expect, it } from 'vitest';
import type { Ring } from './distance';
import { signedArea, windForD3 } from './winding';

// Counter-clockwise square (lng right, lat up), and the same square clockwise.
const CCW: Ring = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];
const CW: Ring = [...CCW].reverse();
const HOLE_CCW: Ring = [
  [2, 2],
  [4, 2],
  [4, 4],
  [2, 4],
  [2, 2],
];
const HOLE_CW: Ring = [...HOLE_CCW].reverse();

describe('signedArea', () => {
  it('is positive for a clockwise ring and negative for a counter-clockwise one', () => {
    expect(signedArea(CW)).toBeGreaterThan(0);
    expect(signedArea(CCW)).toBeLessThan(0);
    expect(Math.abs(signedArea(CW))).toBe(200);
  });
});

describe('windForD3', () => {
  it('makes exterior rings clockwise and holes counter-clockwise', () => {
    expect(windForD3([[CCW, HOLE_CW]])).toEqual([[CW, HOLE_CCW]]);
  });

  it('leaves correctly wound polygons untouched', () => {
    const polygons = [[CW, HOLE_CCW], [CW]];
    expect(windForD3(polygons)).toEqual(polygons);
  });

  it('does not mutate its input', () => {
    const ring: Ring = CCW.map((p) => [...p] as [number, number]);
    windForD3([[ring]]);
    expect(ring).toEqual(CCW);
  });
});
