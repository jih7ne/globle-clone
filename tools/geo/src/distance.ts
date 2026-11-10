export type Position = [number, number];
export type Ring = Position[];
/** A MultiPolygon's coordinates: polygons made of rings. */
export type MultiPolygonCoords = Ring[][];

/** Mean Earth radius in km (IUGG). */
export const EARTH_RADIUS_KM = 6371.0088;
const RAD = Math.PI / 180;

/** Great-circle distance in km (haversine). */
export function haversineKm(a: Position, b: Position): number {
  const dLat = (b[1] - a[1]) * RAD;
  const dLng = (b[0] - a[0]) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Collects every boundary point of a country, adding points along edges longer than
 * `maxStepKm` so that the nearest-point search is accurate to about half a step.
 */
export function boundaryPoints(polygons: MultiPolygonCoords, maxStepKm: number): Position[] {
  const out: Position[] = [];
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i] as Position;
        out.push(a);
        const b = ring[i + 1];
        if (!b) continue;
        const steps = Math.ceil(haversineKm(a, b) / maxStepKm);
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
      }
    }
  }
  return out;
}

/**
 * A static 3D k-d tree over points on the unit sphere. Straight-line (chord) distance
 * grows with great-circle distance, so the nearest point by chord is the nearest on
 * the globe, with no special cases at the poles or the antimeridian.
 */
export interface PointSet {
  size: number;
  /** x, y, z of each point, stored in tree order. */
  xyz: Float64Array;
  /** Bounding box (min x, y, z, max x, y, z) of the subtree whose median sits at each index. */
  box: Float64Array;
}

function toXyz([lng, lat]: Position, out: Float64Array, i: number) {
  const cosLat = Math.cos(lat * RAD);
  out[i * 3] = cosLat * Math.cos(lng * RAD);
  out[i * 3 + 1] = cosLat * Math.sin(lng * RAD);
  out[i * 3 + 2] = Math.sin(lat * RAD);
}

export function pointSet(points: Position[]): PointSet {
  const src = new Float64Array(points.length * 3);
  points.forEach((p, i) => toXyz(p, src, i));
  const order = points.map((_, i) => i);
  const xyz = new Float64Array(points.length * 3);

  // Lays the tree out implicitly: the median of [lo, hi) sits at the middle index,
  // split on the axis given by the depth.
  const build = (lo: number, hi: number, depth: number) => {
    if (hi <= lo) return;
    const axis = depth % 3;
    const slice = order.slice(lo, hi).sort((a, b) => src[a * 3 + axis]! - src[b * 3 + axis]!);
    for (let k = 0; k < slice.length; k++) order[lo + k] = slice[k]!;
    const mid = (lo + hi) >> 1;
    build(lo, mid, depth + 1);
    build(mid + 1, hi, depth + 1);
  };
  build(0, points.length, 0);
  order.forEach((p, i) => {
    xyz[i * 3] = src[p * 3]!;
    xyz[i * 3 + 1] = src[p * 3 + 1]!;
    xyz[i * 3 + 2] = src[p * 3 + 2]!;
  });

  const box = new Float64Array(points.length * 6);
  const bound = (lo: number, hi: number) => {
    const mid = (lo + hi) >> 1;
    const b = mid * 6;
    for (let k = 0; k < 3; k++) {
      box[b + k] = Infinity;
      box[b + 3 + k] = -Infinity;
    }
    for (let i = lo; i < hi; i++) {
      for (let k = 0; k < 3; k++) {
        const v = xyz[i * 3 + k]!;
        if (v < box[b + k]!) box[b + k] = v;
        if (v > box[b + 3 + k]!) box[b + 3 + k] = v;
      }
    }
    if (mid > lo) bound(lo, mid);
    if (hi > mid + 1) bound(mid + 1, hi);
  };
  if (points.length) bound(0, points.length);
  return { size: points.length, xyz, box };
}

/** Squared distance from a point to the bounding box of the subtree centred at `mid`. */
function boxDistSq(box: Float64Array, mid: number, x: number, y: number, z: number): number {
  const b = mid * 6;
  let d = 0;
  const q = [x, y, z];
  for (let k = 0; k < 3; k++) {
    const v = q[k]!;
    const lo = box[b + k]!;
    const hi = box[b + 3 + k]!;
    if (v < lo) d += (lo - v) ** 2;
    else if (v > hi) d += (v - hi) ** 2;
  }
  return d;
}

/** Squared chord distance from (x, y, z) to the nearest point of `set`, if under `bound`. */
function nearestSq(set: PointSet, x: number, y: number, z: number, bound: number): number {
  const { xyz, box } = set;
  let best = bound;
  const stack: number[] = [0, set.size];
  while (stack.length) {
    const hi = stack.pop()!;
    const lo = stack.pop()!;
    if (hi <= lo) continue;
    const mid = (lo + hi) >> 1;
    if (boxDistSq(box, mid, x, y, z) >= best) continue;
    const d =
      (xyz[mid * 3]! - x) ** 2 + (xyz[mid * 3 + 1]! - y) ** 2 + (xyz[mid * 3 + 2]! - z) ** 2;
    if (d < best) best = d;
    stack.push(lo, mid, mid + 1, hi);
  }
  return best;
}

/** Smallest great-circle distance in km between two point sets. */
export function minDistanceKm(a: PointSet, b: PointSet): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let best = Infinity;
  for (let i = 0; i < small.size && best > 0; i++) {
    best = nearestSq(large, small.xyz[i * 3]!, small.xyz[i * 3 + 1]!, small.xyz[i * 3 + 2]!, best);
  }
  const chord = Math.sqrt(best);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, chord / 2));
}
