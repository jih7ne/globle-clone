/// <reference lib="webworker" />
import type { CountryFeature } from './geo';

/**
 * Builds the world map's geometry off the main thread (see baseGeometry.ts).
 * three-conic-polygon-geometry looks for `window.THREE` when it loads, and workers have no
 * `window`: alias it before importing the module.
 */
(globalThis as { window?: unknown }).window = globalThis;
const { computeBaseLayer, transferables } = await import('./baseGeometry');

self.onmessage = (e: MessageEvent<CountryFeature[]>) => {
  const buffers = computeBaseLayer(e.data);
  self.postMessage(buffers, transferables(buffers));
};
