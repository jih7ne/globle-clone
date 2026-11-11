/** Globe shapes and the derived per-country points used for camera moves and markers. */
type Ring = [number, number][];
type Geometry =
  { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] };

export interface CountryFeature {
  type: 'Feature';
  properties: { code: string; playable: boolean };
  geometry: Geometry;
}

export interface GeoData {
  features: CountryFeature[];
  /** Label point of each country: centre of its largest polygon. */
  centers: Map<string, { lat: number; lng: number }>;
  /** Playable countries too small to see or click on the globe. */
  tiny: Set<string>;
}

/** Countries whose whole extent is under this many degrees get a dot marker. */
const TINY_DEGREES = 1.5;

function bbox(rings: Ring[]): [number, number, number, number] {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const ring of rings) {
    for (const [x, y] of ring) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return [minX, minY, maxX, maxY];
}

export function analyse(features: CountryFeature[]): GeoData {
  const centers = new Map<string, { lat: number; lng: number }>();
  const tiny = new Set<string>();
  for (const f of features) {
    const polygons =
      f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    let largest: [number, number, number, number] | null = null;
    let largestArea = -1;
    for (const p of polygons) {
      const b = bbox(p);
      const area = (b[2] - b[0]) * (b[3] - b[1]);
      if (area > largestArea) {
        largestArea = area;
        largest = b;
      }
    }
    if (!largest) continue;
    centers.set(f.properties.code, {
      lng: (largest[0] + largest[2]) / 2,
      lat: (largest[1] + largest[3]) / 2,
    });
    const all = bbox(polygons.flat());
    if (f.properties.playable && Math.max(all[2] - all[0], all[3] - all[1]) < TINY_DEGREES) {
      tiny.add(f.properties.code);
    }
  }
  return { features, centers, tiny };
}

export async function loadGeo(): Promise<GeoData> {
  const res = await fetch('/geo/countries.geojson');
  if (!res.ok) throw new Error(`Could not load map data: HTTP ${res.status}`);
  const data = (await res.json()) as { features: CountryFeature[] };
  return analyse(data.features);
}
