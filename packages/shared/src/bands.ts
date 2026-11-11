/** Distance bands from the specification, section 2. */
export type Band = 'found' | 'burning' | 'hot' | 'warm' | 'cool' | 'freezing';

interface BandDef {
  band: Exclude<Band, 'found'>;
  maxKm: number;
  color: string;
  emoji: string;
}

const FREEZING: BandDef = { band: 'freezing', maxKm: Infinity, color: '#9CC8F0', emoji: '⬜' };

export const BANDS: readonly BandDef[] = [
  { band: 'burning', maxKm: 250, color: '#E3170A', emoji: '🟥' },
  { band: 'hot', maxKm: 1000, color: '#FF5F00', emoji: '🟧' },
  { band: 'warm', maxKm: 2500, color: '#FFB000', emoji: '🟨' },
  { band: 'cool', maxKm: 5000, color: '#3B6FE0', emoji: '🟦' },
  FREEZING,
];

export const FOUND_EMOJI = '🎯';

const EMOJI: Record<Band, string> = {
  found: FOUND_EMOJI,
  ...Object.fromEntries(BANDS.map((b) => [b.band, b.emoji])),
} as Record<Band, string>;

/** Returns the band of a guess. Distance is rounded to the nearest km first. */
export function bandFor(distanceKm: number, correct = false): Band {
  if (correct) return 'found';
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new RangeError(`Invalid distance: ${distanceKm}`);
  }
  const km = Math.round(distanceKm);
  for (const b of BANDS) if (km <= b.maxKm) return b.band;
  return FREEZING.band; // unreachable: the last band has maxKm = Infinity
}

export function emojiFor(band: Band): string {
  return EMOJI[band];
}

/** Colour stops for the globe: the band colours placed along the distance scale. */
const COLOR_STOPS: readonly [km: number, hex: string][] = [
  [0, '#E3170A'],
  [1000, '#FF5F00'],
  [2500, '#FFB000'],
  [5000, '#3B6FE0'],
  [8000, '#9CC8F0'],
];

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Continuous globe colour for a distance (FR-06), as lower-case #rrggbb. */
export function colorForDistance(distanceKm: number): string {
  const km = Math.max(0, distanceKm);
  let lower: readonly [number, string] = COLOR_STOPS[0] as readonly [number, string];
  for (const stop of COLOR_STOPS) {
    if (km <= stop[0]) {
      if (stop === lower) return stop[1].toLowerCase();
      const t = (km - lower[0]) / (stop[0] - lower[0]);
      const a = hexToRgb(lower[1]);
      const b = hexToRgb(stop[1]);
      return `#${a
        .map((v, i) =>
          Math.round(v + ((b[i] as number) - v) * t)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')}`;
    }
    lower = stop;
  }
  return lower[1].toLowerCase();
}
