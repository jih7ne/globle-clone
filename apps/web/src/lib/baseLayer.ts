import {
  type BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import ConicPolygonGeometry from 'three-conic-polygon-geometry';
import GeoJsonGeometry from 'three-geojson-geometry';
import type { CountryFeature } from './geo';

/** three-globe's globe radius and default polygon curvature resolution (degrees). */
const RADIUS = 100;
const CURVATURE = 5;
/** Relative altitudes: land just above the ocean, borders just above the land. */
export const LAND_ALTITUDE = 0.006;
const BORDER_ALTITUDE = 0.0065;

export interface BaseLayerColors {
  land: string;
  disputed: string;
  border: string;
}

type Polygon = [number, number][][];
const polygonsOf = (f: CountryFeature): Polygon[] =>
  f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;

function mergedCaps(polygons: Polygon[]): BufferGeometry {
  const parts = polygons.map(
    (p) => new ConicPolygonGeometry(p, 0, RADIUS, false, true, false, CURVATURE),
  );
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  if (!merged) throw new Error('Could not merge the land shapes');
  return merged;
}

/**
 * The whole world map as three objects: land, disputed land and every border.
 *
 * react-globe.gl gives each polygon its own cap, side and outline objects: with ~1,000
 * polygons (every island counts) that was ~4,000 draw calls per frame and about 10 fps on
 * integrated graphics. Merged, the static map costs 3 draw calls; the library's polygons
 * layer is only used for the few guessed countries drawn on top.
 */
export function buildBaseLayer(features: readonly CountryFeature[], colors: BaseLayerColors) {
  const playable = features.filter((f) => f.properties.playable).flatMap(polygonsOf);
  const disputed = features.filter((f) => !f.properties.playable).flatMap(polygonsOf);

  const group = new Group();
  group.name = 'base-map';
  for (const [polygons, color] of [
    [playable, colors.land],
    [disputed, colors.disputed],
  ] as const) {
    if (!polygons.length) continue;
    const mesh = new Mesh(mergedCaps(polygons), new MeshBasicMaterial({ color }));
    mesh.scale.setScalar(1 + LAND_ALTITUDE);
    group.add(mesh);
  }

  const borders = new LineSegments(
    new GeoJsonGeometry(
      { type: 'MultiPolygon', coordinates: [...playable, ...disputed] },
      RADIUS,
      CURVATURE,
    ),
    new LineBasicMaterial({ color: colors.border }),
  );
  borders.scale.setScalar(1 + BORDER_ALTITUDE);
  group.add(borders);
  return group;
}

/** Frees the GPU buffers of a layer built by buildBaseLayer. */
export function disposeBaseLayer(group: Group) {
  group.traverse((obj) => {
    if (obj instanceof Mesh || obj instanceof LineSegments) {
      obj.geometry.dispose();
      (obj.material as MeshBasicMaterial | LineBasicMaterial).dispose();
    }
  });
}
