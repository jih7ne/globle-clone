/**
 * Stand-ins for parts of the globe libraries that this game never uses, swapped in by
 * vite.config.ts. three-globe imports the WebGPU renderer and TSL for its heatmap layer
 * and h3-js for its hexagon layers; together they were ~880 KB of the 2 MB globe chunk,
 * all parsed and run on load (Lighthouse, NFR-06). Calling any of them fails loudly.
 */
export function unused(name: string): never {
  throw new Error(`${name} is stubbed out in vite.config.ts: this layer is not used`);
}
