/// <reference lib="webworker" />
import type { CountryFeature } from './geo';

/**
 * Builds the world map's geometry off the main thread (see baseGeometry.ts).
 * three-conic-polygon-geometry looks for `window.THREE` when it loads, and workers have no
 * `window`: alias it before importing the module.
 */
(globalThis as { window?: unknown }).window = globalThis;
const geometry = import('./baseGeometry');

// Listen straight away, before the import above has loaded: a message that arrives while
// nothing listens is dropped without any error. On the live site the import is a network
// fetch, so the page's message used to win that race and the land never appeared.
self.onmessage = async (e: MessageEvent<CountryFeature[]>) => {
  try {
    const { computeBaseLayer, transferables } = await geometry;
    const buffers = computeBaseLayer(e.data);
    self.postMessage({ ok: true, buffers }, transferables(buffers));
  } catch (err) {
    // Rejections inside a handler do not reach worker.onerror everywhere: report it.
    self.postMessage({ ok: false, error: String(err) });
  }
};
