import { useEffect, useMemo, useRef, useState } from 'react';
import GlobeGl, { type GlobeMethods } from 'react-globe.gl';
import { MeshBasicMaterial } from 'three';
import type { BaseLayerBuffers } from '../lib/baseGeometry';
import { LAND_ALTITUDE, createBaseLayer, disposeBaseLayer, loadBaseLayer } from '../lib/baseLayer';
import type { CountryFeature, GeoData } from '../lib/geo';

/** Editorial palette: flat black ocean, paper land, ink borders, no lighting. */
const OCEAN = '#111111';
const LAND = '#f7f4ee';
const LAND_DISPUTED = '#c9c3b6';
const BORDER = '#111111';
const RING = '#f7f4ee';
const oceanMaterial = new MeshBasicMaterial({ color: OCEAN });
/** How long the globe keeps drawing after the last movement or interaction. */
const IDLE_MS = 1500;
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'wheel', 'touchstart'] as const;
/** Guessed countries sit raised above the flat map. */
const GUESSED_ALTITUDE = LAND_ALTITUDE + 0.008;

export interface GlobeProps {
  geo: GeoData;
  /** Fill colour of each guessed country. */
  colors: ReadonlyMap<string, string>;
  /** Tooltip text of each guessed country. */
  labels: ReadonlyMap<string, string>;
  /** Country to fly the camera to (the latest guess, or the answer). */
  focus: string | null;
  /** Highlights the mystery country once the game is over. */
  answer: string | null;
  reducedMotion: boolean;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

export default function Globe({ geo, colors, labels, focus, answer, reducedMotion }: GlobeProps) {
  const ref = useRef<GlobeMethods | undefined>(undefined);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [ready, setReady] = useState(false);

  // Render on demand: the globe only redraws while something moves, then pauses. Drawing
  // 60 still frames a second drains batteries, and without a GPU (software WebGL) it
  // starved the main thread so badly that the page stopped responding.
  const wake = useRef<(ms?: number) => void>(() => undefined);
  useEffect(() => {
    const globe = ref.current;
    const el = box.current;
    if (!ready || !globe || !el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let paused = false;
    const awake = (ms = IDLE_MS) => {
      if (paused) {
        globe.resumeAnimation();
        paused = false;
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        globe.pauseAnimation();
        paused = true;
      }, ms);
    };
    wake.current = awake;
    // Dragging, zooming and hovering (country tooltips) all need live frames.
    const onActivity = () => awake();
    for (const e of ACTIVITY_EVENTS) el.addEventListener(e, onActivity, { passive: true });
    awake(3 * IDLE_MS); // first frames, while the map appears
    return () => {
      clearTimeout(timer);
      for (const e of ACTIVITY_EVENTS) el.removeEventListener(e, onActivity);
      if (paused) globe.resumeAnimation();
      wake.current = () => undefined;
    };
  }, [ready]);

  // Fly to the latest guess (FR-21); instant when the player prefers reduced motion.
  useEffect(() => {
    const target = focus ? geo.centers.get(focus) : undefined;
    if (!target || !ref.current) return;
    const ms = reducedMotion ? 0 : 800;
    wake.current(ms + IDLE_MS);
    ref.current.pointOfView({ ...target, altitude: 1.7 }, ms);
  }, [focus, geo, reducedMotion, ready]);

  // New colours fade in; the answer's ring pulses for a few seconds, then holds still.
  useEffect(() => wake.current(), [colors, size]);
  useEffect(() => {
    if (answer) wake.current(4000);
  }, [answer, ready]);

  const points = useMemo(
    () => [...geo.tiny].map((code) => ({ code, ...(geo.centers.get(code) ?? { lat: 0, lng: 0 }) })),
    [geo],
  );
  const rings = useMemo(() => {
    const c = answer ? geo.centers.get(answer) : undefined;
    return c ? [c] : [];
  }, [answer, geo]);

  // The static world map, merged into a few draw calls and built in a worker (baseLayer.ts).
  const [buffers, setBuffers] = useState<BaseLayerBuffers | null>(null);
  // For the E2E tests: the land is actually in the scene, not just the ocean.
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadBaseLayer(geo.features).then(
      (b) => !cancelled && setBuffers(b),
      (err: unknown) => console.error(err),
    );
    return () => {
      cancelled = true;
    };
  }, [geo]);
  useEffect(() => {
    const scene = ready && buffers ? ref.current?.scene() : undefined;
    if (!scene || !buffers) return;
    const base = createBaseLayer(buffers, { land: LAND, disputed: LAND_DISPUTED, border: BORDER });
    scene.add(base);
    setMapReady(true);
    wake.current();
    return () => {
      setMapReady(false);
      scene.remove(base);
      disposeBaseLayer(base);
    };
  }, [ready, buffers]);

  // Only guessed countries go through the library's per-polygon layer, drawn over the map.
  const guessed = useMemo(
    () => geo.features.filter((f) => colors.has(f.properties.code)),
    [geo, colors],
  );

  return (
    <div
      ref={box}
      className="absolute inset-0"
      aria-hidden="true"
      data-map={mapReady ? 'ready' : 'loading'}
    >
      {size.width > 0 && (
        <GlobeGl
          ref={ref}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere={false}
          globeMaterial={oceanMaterial}
          onGlobeReady={() => setReady(true)}
          polygonsData={guessed}
          polygonCapColor={(f) => colors.get((f as CountryFeature).properties.code) ?? LAND}
          polygonSideColor={() => 'rgba(17, 17, 17, 0.6)'}
          polygonStrokeColor={() => BORDER}
          polygonAltitude={GUESSED_ALTITUDE}
          polygonLabel={(f) => {
            const label = labels.get((f as CountryFeature).properties.code);
            return label ? `<div class="globe-label">${escapeHtml(label)}</div>` : '';
          }}
          polygonsTransitionDuration={reducedMotion ? 0 : 300}
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointColor={(p) => colors.get((p as { code: string }).code) ?? LAND}
          pointRadius={0.35}
          pointAltitude={0.012}
          pointLabel={(p) => {
            const label = labels.get((p as { code: string }).code);
            return label ? `<div class="globe-label">${escapeHtml(label)}</div>` : '';
          }}
          ringsData={rings}
          ringLat="lat"
          ringLng="lng"
          ringColor={() => RING}
          ringMaxRadius={6}
          ringPropagationSpeed={reducedMotion ? 0 : 2}
          ringRepeatPeriod={reducedMotion ? 0 : 900}
        />
      )}
    </div>
  );
}
