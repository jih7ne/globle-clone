import { useEffect, useMemo, useRef, useState } from 'react';
import GlobeGl, { type GlobeMethods } from 'react-globe.gl';
import { MeshBasicMaterial } from 'three';
import type { CountryFeature, GeoData } from '../lib/geo';

/** Editorial palette: flat black ocean, paper land, ink borders, no lighting. */
const OCEAN = '#111111';
const LAND = '#f7f4ee';
const LAND_DISPUTED = '#c9c3b6';
const BORDER = '#111111';
const RING = '#f7f4ee';
const oceanMaterial = new MeshBasicMaterial({ color: OCEAN });

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

  // Fly to the latest guess (FR-21); instant when the player prefers reduced motion.
  useEffect(() => {
    const target = focus ? geo.centers.get(focus) : undefined;
    if (!target || !ref.current) return;
    ref.current.pointOfView({ ...target, altitude: 1.7 }, reducedMotion ? 0 : 800);
  }, [focus, geo, reducedMotion]);

  const points = useMemo(
    () => [...geo.tiny].map((code) => ({ code, ...(geo.centers.get(code) ?? { lat: 0, lng: 0 }) })),
    [geo],
  );
  const rings = useMemo(() => {
    const c = answer ? geo.centers.get(answer) : undefined;
    return c ? [c] : [];
  }, [answer, geo]);

  const fill = (f: CountryFeature) =>
    colors.get(f.properties.code) ?? (f.properties.playable ? LAND : LAND_DISPUTED);

  return (
    <div ref={box} className="absolute inset-0" aria-hidden="true">
      {size.width > 0 && (
        <GlobeGl
          ref={ref}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere={false}
          globeMaterial={oceanMaterial}
          polygonsData={geo.features}
          polygonCapColor={(f) => fill(f as CountryFeature)}
          polygonSideColor={() => 'rgba(17, 17, 17, 0.6)'}
          polygonStrokeColor={() => BORDER}
          polygonAltitude={(f) =>
            colors.has((f as CountryFeature).properties.code) ? 0.014 : 0.006
          }
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
