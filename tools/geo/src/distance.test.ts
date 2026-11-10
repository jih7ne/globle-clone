import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { boundaryPoints, haversineKm, minDistanceKm, pointSet, type Position } from './distance';

const PARIS: Position = [2.3522, 48.8566];
const LONDON: Position = [-0.1276, 51.5072];

describe('haversineKm', () => {
  it('matches a known distance (Paris to London, about 344 km)', () => {
    expect(haversineKm(PARIS, LONDON)).toBeCloseTo(343.6, 0);
  });

  it('is zero for the same point and symmetric', () => {
    expect(haversineKm(PARIS, PARIS)).toBe(0);
    expect(haversineKm(PARIS, LONDON)).toBe(haversineKm(LONDON, PARIS));
  });

  it('handles the antimeridian (179.9 to -179.9 at the equator is about 22 km)', () => {
    expect(haversineKm([179.9, 0], [-179.9, 0])).toBeCloseTo(22.2, 0);
  });
});

describe('boundaryPoints', () => {
  it('adds points so that no gap exceeds the step', () => {
    // A 1-degree square at the equator: each side is about 111 km.
    const square: Position[] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ];
    const points = boundaryPoints([[square]], 10);
    for (let i = 1; i < points.length; i++) {
      expect(haversineKm(points[i - 1]!, points[i]!)).toBeLessThanOrEqual(10.01);
    }
    expect(points[0]).toEqual([0, 0]);
    expect(points.at(-1)).toEqual([0, 0]);
  });

  it('keeps short edges as they are', () => {
    const ring: Position[] = [
      [0, 0],
      [0.01, 0],
      [0, 0.01],
      [0, 0],
    ];
    expect(boundaryPoints([[ring]], 10)).toEqual(ring);
  });
});

describe('minDistanceKm', () => {
  it('is zero for sets sharing a point', () => {
    expect(minDistanceKm(pointSet([PARIS, [0, 0]]), pointSet([LONDON, PARIS]))).toBe(0);
  });

  it('finds the nearest pair across the antimeridian', () => {
    const fiji = pointSet([
      [179.9, -17],
      [178, -18],
    ]);
    const samoaSide = pointSet([
      [-179.9, -17],
      [-172, -14],
    ]);
    expect(minDistanceKm(fiji, samoaSide)).toBeCloseTo(haversineKm([179.9, -17], [-179.9, -17]), 6);
  });

  it('works near the poles', () => {
    const a = pointSet([
      [0, 89.9],
      [90, 80],
    ]);
    const b = pointSet([
      [180, 89.9],
      [-90, 80],
    ]);
    expect(minDistanceKm(a, b)).toBeCloseTo(haversineKm([0, 89.9], [180, 89.9]), 6);
  });

  it('equals the brute-force answer for random point sets', () => {
    const point = fc.tuple(
      fc.double({ min: -180, max: 180, noNaN: true }),
      fc.double({ min: -90, max: 90, noNaN: true }),
    );
    const set = fc.array(point, { minLength: 1, maxLength: 60 });
    fc.assert(
      fc.property(set, set, (a, b) => {
        let brute = Infinity;
        for (const p of a) for (const q of b) brute = Math.min(brute, haversineKm(p, q));
        const fast = minDistanceKm(pointSet(a), pointSet(b));
        // 3 decimals = 1 m: chord-to-arc conversion loses a little precision near antipodes.
        expect(fast).toBeCloseTo(brute, 3);
        expect(minDistanceKm(pointSet(b), pointSet(a))).toBeCloseTo(fast, 3);
      }),
      { numRuns: 300 },
    );
  });
});
