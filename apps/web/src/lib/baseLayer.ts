import {
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import type { BaseLayerBuffers, GeometryBuffers } from './baseGeometry';
import type { CountryFeature } from './geo';

/** Relative altitudes: land just above the ocean, borders just above the land. */
export const LAND_ALTITUDE = 0.006;
const BORDER_ALTITUDE = 0.0065;

export interface BaseLayerColors {
  land: string;
  disputed: string;
  border: string;
}

/**
 * Triangulates the map in a worker, falling back to the main thread where workers are
 * unavailable. Resolves with plain vertex arrays.
 */
export function loadBaseLayer(features: readonly CountryFeature[]): Promise<BaseLayerBuffers> {
  const onMainThread = () => import('./baseGeometry').then((m) => m.computeBaseLayer(features));
  if (typeof Worker === 'undefined') return onMainThread();
  return new Promise<BaseLayerBuffers>((resolve, reject) => {
    const worker = new Worker(new URL('./baseLayer.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e: MessageEvent<BaseLayerBuffers>) => {
      worker.terminate();
      resolve(e.data);
    };
    worker.onerror = (e) => {
      e.preventDefault();
      worker.terminate();
      onMainThread().then(resolve, reject);
    };
    worker.postMessage(features);
  });
}

function geometryOf(b: GeometryBuffers): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(b.position, 3));
  if (b.normal) g.setAttribute('normal', new BufferAttribute(b.normal, 3));
  if (b.uv) g.setAttribute('uv', new BufferAttribute(b.uv, 2));
  if (b.index) g.setIndex(new BufferAttribute(b.index, 1));
  return g;
}

/**
 * The whole world map as three objects: land, disputed land and every border.
 *
 * react-globe.gl gives each polygon its own cap, side and outline objects: with ~1,000
 * polygons (every island counts) that was ~4,000 draw calls per frame and about 10 fps on
 * integrated graphics. Merged, the static map costs 3 draw calls; the library's polygons
 * layer is only used for the few guessed countries drawn on top.
 */
export function createBaseLayer(buffers: BaseLayerBuffers, colors: BaseLayerColors): Group {
  const group = new Group();
  group.name = 'base-map';
  for (const [b, color] of [
    [buffers.land, colors.land],
    [buffers.disputed, colors.disputed],
  ] as const) {
    if (!b) continue;
    const mesh = new Mesh(geometryOf(b), new MeshBasicMaterial({ color }));
    mesh.scale.setScalar(1 + LAND_ALTITUDE);
    group.add(mesh);
  }
  const borders = new LineSegments(
    geometryOf(buffers.borders),
    new LineBasicMaterial({ color: colors.border }),
  );
  borders.scale.setScalar(1 + BORDER_ALTITUDE);
  group.add(borders);
  return group;
}

/** Frees the GPU buffers of a layer built by createBaseLayer. */
export function disposeBaseLayer(group: Group) {
  group.traverse((obj) => {
    if (obj instanceof Mesh || obj instanceof LineSegments) {
      obj.geometry.dispose();
      (obj.material as MeshBasicMaterial | LineBasicMaterial).dispose();
    }
  });
}
