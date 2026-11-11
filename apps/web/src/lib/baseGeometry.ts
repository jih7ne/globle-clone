import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import ConicPolygonGeometry from 'three-conic-polygon-geometry';
import GeoJsonGeometry from 'three-geojson-geometry';
import type { BufferGeometry } from 'three';
import type { CountryFeature } from './geo';

/** three-globe's globe radius and default polygon curvature resolution (degrees). */
const RADIUS = 100;
const CURVATURE = 5;

/** Raw vertex data of one geometry, transferable to and from a worker. */
export interface GeometryBuffers {
  position: Float32Array;
  normal?: Float32Array;
  uv?: Float32Array;
  index?: Uint16Array | Uint32Array;
}

export interface BaseLayerBuffers {
  land: GeometryBuffers | null;
  disputed: GeometryBuffers | null;
  borders: GeometryBuffers;
}

type Polygon = [number, number][][];
const polygonsOf = (f: CountryFeature): Polygon[] =>
  f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;

function toBuffers(g: BufferGeometry): GeometryBuffers {
  const array = (name: string) => g.getAttribute(name)?.array as Float32Array | undefined;
  const normal = array('normal');
  const uv = array('uv');
  const index = g.getIndex()?.array as Uint16Array | Uint32Array | undefined;
  return {
    position: array('position') as Float32Array,
    ...(normal ? { normal } : {}),
    ...(uv ? { uv } : {}),
    ...(index ? { index } : {}),
  };
}

function mergedCaps(polygons: Polygon[]): GeometryBuffers | null {
  if (!polygons.length) return null;
  const parts = polygons.map(
    (p) => new ConicPolygonGeometry(p, 0, RADIUS, false, true, false, CURVATURE),
  );
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error('Could not merge the land shapes');
  return toBuffers(merged);
}

/**
 * Triangulates the whole map: about a second of CPU on a laptop, several on a phone, so it
 * runs in a worker (baseLayer.worker.ts). The result is plain arrays, cheap to transfer.
 */
export function computeBaseLayer(features: readonly CountryFeature[]): BaseLayerBuffers {
  const playable = features.filter((f) => f.properties.playable).flatMap(polygonsOf);
  const disputed = features.filter((f) => !f.properties.playable).flatMap(polygonsOf);
  const borders = new GeoJsonGeometry(
    { type: 'MultiPolygon', coordinates: [...playable, ...disputed] },
    RADIUS,
    CURVATURE,
  );
  return {
    land: mergedCaps(playable),
    disputed: mergedCaps(disputed),
    borders: toBuffers(borders),
  };
}

/** The ArrayBuffers to transfer (not copy) when posting `buffers`. */
export function transferables(buffers: BaseLayerBuffers): ArrayBuffer[] {
  return [buffers.land, buffers.disputed, buffers.borders]
    .flatMap((b) => (b ? [b.position, b.normal, b.uv, b.index] : []))
    .flatMap((a) => (a ? [a.buffer as ArrayBuffer] : []));
}
