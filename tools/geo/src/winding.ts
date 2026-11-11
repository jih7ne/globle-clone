import type { MultiPolygonCoords, Ring } from './distance.ts';

/**
 * Twice the signed planar area of a ring in lng/lat degrees: positive when the ring is
 * clockwise, negative when counter-clockwise.
 */
export function signedArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    sum += (x2 - x1) * (y2 + y1);
  }
  return sum;
}

/**
 * Winds every polygon the way d3-geo reads spherical polygons: exterior ring clockwise,
 * holes counter-clockwise. The globe (three-conic-polygon-geometry, through d3-geo) takes
 * a ring wound the other way for "the whole sphere minus this country", and triangulating
 * that froze the page for over a minute. RFC 7946 GeoJSON uses the opposite convention,
 * so the winding must be set on purpose rather than inherited from the tools.
 */
export function windForD3(polygons: MultiPolygonCoords): MultiPolygonCoords {
  return polygons.map((rings) =>
    rings.map((ring, i) => {
      const clockwise = signedArea(ring) > 0;
      return clockwise === (i === 0) ? ring : [...ring].reverse();
    }),
  );
}
