/** Distance bands from the specification, section 2. */
export type Band = 'found' | 'burning' | 'hot' | 'warm' | 'cool' | 'freezing';

interface BandDef {
  band: Exclude<Band, 'found'>;
  maxKm: number;
  color: string;
  emoji: string;
}

const FREEZING: BandDef = { band: 'freezing', maxKm: Infinity, color: '#DCEEF8', emoji: '⬜' };

export const BANDS: readonly BandDef[] = [
  { band: 'burning', maxKm: 250, color: '#C62828', emoji: '🟥' },
  { band: 'hot', maxKm: 1000, color: '#EF6C00', emoji: '🟧' },
  { band: 'warm', maxKm: 2500, color: '#F9A825', emoji: '🟨' },
  { band: 'cool', maxKm: 5000, color: '#4FA3D9', emoji: '🟦' },
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
