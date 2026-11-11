/**
 * Data tests (specification, section 10): validate the committed outputs of `npm run build:geo`.
 */
import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import countries from '../../../packages/shared/src/data/countries.json';
import distances from '../../../apps/api/src/data/distances.json';
import { normalizeName } from '../../../packages/shared/src/names';
import type { MultiPolygonCoords } from './distance';
import { PLAYABLE_CODES } from './un-members';
import { signedArea } from './winding';

const GEOJSON_PATH = new URL('../../../apps/web/public/geo/countries.geojson', import.meta.url);
const geo: {
  features: { properties: { code: string; playable: boolean }; geometry: unknown }[];
} = JSON.parse(readFileSync(GEOJSON_PATH, 'utf8'));

const { codes, km } = distances;
const d = (a: string, b: string) => {
  const i = codes.indexOf(a);
  const j = codes.indexOf(b);
  if (i < 0 || j < 0) throw new Error(`Unknown code ${a} or ${b}`);
  return km[i]![j]!;
};

describe('countries.json', () => {
  it('lists exactly the 195 playable countries, once each', () => {
    expect(countries.map((c) => c.code).sort()).toEqual([...PLAYABLE_CODES].sort());
  });

  it('has an English and a French name and a population for every country', () => {
    for (const c of countries) {
      expect(c.name.en.trim(), c.code).not.toBe('');
      expect(c.name.fr.trim(), c.code).not.toBe('');
      expect(c.population, c.code).toBeGreaterThan(0);
    }
  });

  it('maps every name and alias to a single country', () => {
    const owner = new Map<string, string>();
    for (const c of countries) {
      for (const n of [c.name.en, c.name.fr, ...c.aliases.en, ...c.aliases.fr]) {
        const key = normalizeName(n);
        expect(key, `${c.code}: "${n}"`).not.toBe('');
        const previous = owner.get(key);
        if (previous) expect(previous, `"${n}" is used by ${previous} and ${c.code}`).toBe(c.code);
        owner.set(key, c.code);
      }
    }
  });

  it.each([
    ['USA', 'USA'],
    ['UK', 'GBR'],
    ['États-Unis', 'USA'],
    ['Ivory Coast', 'CIV'],
    ['Czech Republic', 'CZE'],
    ['DRC', 'COD'],
    ['Congo', 'COG'],
    ['Burma', 'MMR'],
    ['Holy See', 'VAT'],
  ])('accepts the alias "%s" for %s', (alias, code) => {
    const c = countries.find((x) => x.code === code)!;
    const names = [c.name.en, c.name.fr, ...c.aliases.en, ...c.aliases.fr].map(normalizeName);
    expect(names).toContain(normalizeName(alias));
  });
});

describe('distances.json', () => {
  it('covers the 195 playable countries in sorted order', () => {
    expect(codes).toEqual([...PLAYABLE_CODES].sort());
    expect(km).toHaveLength(195);
    for (const row of km) expect(row).toHaveLength(195);
  });

  it('is symmetric, zero on the diagonal, and made of non-negative integers', () => {
    for (let i = 0; i < codes.length; i++) {
      expect(km[i]![i]).toBe(0);
      for (let j = 0; j < codes.length; j++) {
        const v = km[i]![j]!;
        expect(Number.isInteger(v) && v >= 0, `${codes[i]}-${codes[j]}`).toBe(true);
        expect(v, `${codes[i]}-${codes[j]}`).toBe(km[j]![i]);
      }
    }
  });

  it.each([
    ['FRA', 'ESP'],
    ['AGO', 'NAM'],
    ['USA', 'CAN'],
    ['USA', 'MEX'],
    ['CHN', 'RUS'],
    ['ZAF', 'LSO'], // enclave
    ['ITA', 'VAT'], // enclave, tiny country
    ['ITA', 'SMR'],
    ['FRA', 'BRA'], // multi-polygon: French Guiana
    ['FRA', 'SUR'],
    ['ESP', 'MAR'], // Ceuta and Melilla
  ])('%s and %s are neighbours (0 km)', (a, b) => {
    expect(d(a, b)).toBe(0);
  });

  it.each([
    ['USA', 'RUS', 0, 10], // Diomede islands, across the antimeridian
    ['GBR', 'FRA', 30, 40], // Strait of Dover
    ['DNK', 'SWE', 3, 8], // Øresund
    ['RUS', 'JPN', 10, 25], // Kunashir to Hokkaido
    ['KOR', 'JPN', 45, 60], // Korea Strait
    ['ISL', 'NOR', 500, 580], // Iceland to Jan Mayen
    ['FJI', 'TON', 250, 400], // Fiji spans the antimeridian
    ['AUS', 'NZL', 550, 700], // Macquarie Island to the Auckland Islands
    ['ARG', 'ZAF', 6000, 7000],
  ])('%s to %s is between %i and %i km', (a, b, min, max) => {
    expect(d(a, b)).toBeGreaterThanOrEqual(min);
    expect(d(a, b)).toBeLessThanOrEqual(max);
  });

  it.each(['ISL', 'JPN', 'NZL', 'AUS', 'MDG', 'CUB', 'LKA', 'FJI', 'NRU'])(
    'island country %s has no 0 km neighbour',
    (code) => {
      for (const other of codes)
        if (other !== code) expect(d(code, other), other).toBeGreaterThan(0);
    },
  );
});

describe('countries.geojson', () => {
  it('stays under 1 MB (NFR-06)', () => {
    expect(statSync(GEOJSON_PATH).size).toBeLessThan(1024 * 1024);
  });

  it('has exactly one shape per playable country, and every shape has a geometry', () => {
    const playable = geo.features
      .filter((f) => f.properties.playable)
      .map((f) => f.properties.code);
    expect(playable.sort()).toEqual([...PLAYABLE_CODES].sort());
    for (const f of geo.features) expect(f.geometry, f.properties.code).toBeTruthy();
  });

  // A ring wound the wrong way covers the rest of the planet and freezes the globe (winding.ts).
  it('winds exterior rings clockwise and holes counter-clockwise, as d3-geo expects', () => {
    for (const f of geo.features) {
      const g = f.geometry as { type: string; coordinates: MultiPolygonCoords[number] };
      const polygons =
        g.type === 'Polygon' ? [g.coordinates] : (g.coordinates as unknown as MultiPolygonCoords);
      polygons.forEach((rings, p) =>
        rings.forEach((ring, r) =>
          expect(signedArea(ring) > 0, `${f.properties.code} polygon ${p} ring ${r}`).toBe(r === 0),
        ),
      );
    }
  });
});
