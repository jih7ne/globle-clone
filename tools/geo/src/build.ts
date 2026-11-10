/**
 * Builds the game's static data from Natural Earth (public domain):
 *
 *   packages/shared/src/data/countries.json  names, aliases, population (front end + Worker)
 *   apps/api/src/data/distances.json         195 x 195 border-to-border distances (Worker only)
 *   apps/web/public/geo/countries.geojson    simplified shapes for the globe (front end)
 *
 * Run with `npm run build:geo`. The outputs are committed; CI validates them with data tests.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import mapshaper from 'mapshaper';
import { normalizeName } from '../../../packages/shared/src/names.ts';
import { boundaryPoints, minDistanceKm, pointSet, type MultiPolygonCoords } from './distance.ts';
import { EXTRA_ALIASES, NAME_OVERRIDES } from './names.ts';
import { PLAYABLE_CODES } from './un-members.ts';

const ROOT = join(import.meta.dirname, '../../..');
const SOURCE = {
  url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson',
  sha256: '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255',
  cache: join(ROOT, '.cache/ne/ne_10m.geojson'),
};
/** Max spacing between boundary points used for the nearest-point search. */
const MAX_STEP_KM = 10;
/** Simplification for the globe shapes, tuned to keep the file under 1 MB. */
const DISPLAY_SIMPLIFY_M = 5000;
/** Natural Earth codes that differ from ISO 3166-1 alpha-3. */
const NE_TO_ISO: Record<string, string> = { SDS: 'SSD', PSX: 'PSE' };
const isoCode = (adm0: string) => NE_TO_ISO[adm0] ?? adm0;

interface NeProps {
  ADM0_A3: string;
  NAME: string | null;
  NAME_LONG: string | null;
  ADMIN: string | null;
  FORMAL_EN: string | null;
  FORMAL_FR: string | null;
  NAME_EN: string;
  NAME_FR: string;
  BRK_NAME: string | null;
  POP_EST: number;
}
type Geometry =
  | { type: 'Polygon'; coordinates: MultiPolygonCoords[number] }
  | { type: 'MultiPolygon'; coordinates: MultiPolygonCoords };
interface Feature<P> {
  properties: P;
  geometry: Geometry;
}
interface Collection<P> {
  features: Feature<P>[];
}

async function loadSource(): Promise<string> {
  let raw: Buffer;
  try {
    raw = await readFile(SOURCE.cache);
  } catch {
    console.log(`Downloading ${SOURCE.url}`);
    const res = await fetch(SOURCE.url);
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
    raw = Buffer.from(await res.arrayBuffer());
    await mkdir(dirname(SOURCE.cache), { recursive: true });
    await writeFile(SOURCE.cache, raw);
  }
  const hash = createHash('sha256').update(raw).digest('hex');
  if (hash !== SOURCE.sha256) throw new Error(`Checksum mismatch for ${SOURCE.cache}: ${hash}`);
  return raw.toString('utf8');
}

async function simplify(
  source: string,
  commands: string,
  output = '',
): Promise<Collection<{ ADM0_A3: string }>> {
  const out = await mapshaper.applyCommands(
    `-i in.json ${commands} -o format=geojson ${output} out.json`,
    { 'in.json': source },
  );
  return JSON.parse(String(out['out.json']));
}

function multiPolygon(geometry: Geometry): MultiPolygonCoords {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

function buildCountries(source: Collection<NeProps>) {
  const owner = new Map<string, Set<string>>();
  const claim = (name: string, code: string) => {
    const key = normalizeName(name);
    owner.set(key, (owner.get(key) ?? new Set()).add(code));
  };

  const drafts = PLAYABLE_CODES.map((code) => {
    const p = source.features.find((f) => isoCode(f.properties.ADM0_A3) === code)?.properties;
    if (!p) throw new Error(`No Natural Earth feature for ${code}`);
    const name = {
      en: NAME_OVERRIDES[code]?.en ?? p.NAME_EN,
      fr: NAME_OVERRIDES[code]?.fr ?? p.NAME_FR,
    };
    const candidates = {
      en: [
        p.NAME_EN,
        p.NAME,
        p.NAME_LONG,
        p.ADMIN,
        p.FORMAL_EN,
        p.BRK_NAME,
        ...(EXTRA_ALIASES[code]?.en ?? []),
      ],
      fr: [p.NAME_FR, p.FORMAL_FR, ...(EXTRA_ALIASES[code]?.fr ?? [])],
    };
    for (const n of [name.en, name.fr, ...candidates.en, ...candidates.fr]) if (n) claim(n, code);
    return { code, name, candidates, population: p.POP_EST };
  });

  for (const [key, codes] of owner) {
    if (codes.size > 1)
      console.warn(`  alias "${key}" dropped: shared by ${[...codes].join(', ')}`);
  }

  return drafts
    .map(({ code, name, candidates, population }) => {
      for (const lang of ['en', 'fr'] as const) {
        if ((owner.get(normalizeName(name[lang]))?.size ?? 0) > 1) {
          throw new Error(`Display name "${name[lang]}" of ${code} is shared with another country`);
        }
      }
      const seen = new Set([normalizeName(name.en), normalizeName(name.fr)]);
      const keep = (list: (string | null)[]) =>
        list.filter((n): n is string => {
          // Skip abbreviations such as "Dem. Rep. Congo".
          if (!n || n.includes('.')) return false;
          const key = normalizeName(n);
          if (seen.has(key) || (owner.get(key)?.size ?? 0) > 1) return false;
          seen.add(key);
          return true;
        });
      return {
        code,
        name,
        aliases: { en: keep(candidates.en), fr: keep(candidates.fr) },
        population,
      };
    })
    .sort((a, b) => a.name.en.localeCompare(b.name.en, 'en'));
}

function buildDistances(source: Collection<{ ADM0_A3: string }>) {
  const codes = [...PLAYABLE_CODES].sort();
  const sets = codes.map((code) => {
    const f = source.features.find((x) => isoCode(x.properties.ADM0_A3) === code);
    if (!f) throw new Error(`Missing geometry for ${code}`);
    return pointSet(boundaryPoints(multiPolygon(f.geometry), MAX_STEP_KM));
  });
  const total = sets.reduce((n, s) => n + s.size, 0);
  console.log(`  ${total.toLocaleString('en')} boundary points`);

  const km = codes.map(() => codes.map(() => 0));
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      const d = Math.round(minDistanceKm(sets[i]!, sets[j]!));
      km[i]![j] = d;
      km[j]![i] = d;
    }
  }
  return { codes, km };
}

async function writeJson(path: string, data: unknown) {
  const file = join(ROOT, path);
  const text = JSON.stringify(data) + '\n';
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, text);
  console.log(`  wrote ${path} (${(Buffer.byteLength(text) / 1024).toFixed(0)} KB)`);
}

async function main() {
  const started = Date.now();
  const text = await loadSource();
  const source: Collection<NeProps> = JSON.parse(text);

  console.log('Countries');
  await writeJson('packages/shared/src/data/countries.json', buildCountries(source));

  console.log('Distances');
  // Unsimplified on purpose: simplification drops small islands (e.g. Little Diomede),
  // and small islands often decide the nearest distance.
  await writeJson('apps/api/src/data/distances.json', buildDistances(source));

  console.log('Globe shapes');
  const playable = new Set<string>(PLAYABLE_CODES);
  const display = await simplify(
    text,
    `-filter-fields ADM0_A3 -simplify interval=${DISPLAY_SIMPLIFY_M} keep-shapes`,
    'precision=0.01',
  );
  const features = display.features.flatMap((f) => {
    const code = isoCode(f.properties.ADM0_A3);
    // Tiny countries (e.g. Vatican City) vanish when simplified: keep their original shape.
    const original = source.features.find((x) => x.properties.ADM0_A3 === f.properties.ADM0_A3);
    const geometry = f.geometry ?? (playable.has(code) ? original?.geometry : null);
    if (!geometry) return [];
    return [{ type: 'Feature', properties: { code, playable: playable.has(code) }, geometry }];
  });
  await writeJson('apps/web/public/geo/countries.geojson', {
    type: 'FeatureCollection',
    features,
  });

  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)} s`);
}

await main();
