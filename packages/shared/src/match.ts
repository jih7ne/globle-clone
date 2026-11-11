/**
 * Country name matching: autocomplete and typo suggestions (specification, section 2).
 */
import type { Country } from './countries';
import { normalizeName } from './names';

export type Lang = 'en' | 'fr';

interface Entry {
  /** Normalised name or alias. */
  key: string;
  code: string;
  /** True for the country's display name in the index language. */
  primary: boolean;
}

export interface NameIndex {
  lang: Lang;
  entries: Entry[];
  byCode: Map<string, Country>;
}

/**
 * Indexes every name and alias. Names from both languages are accepted, so a French
 * speaker playing in English can still type "Allemagne".
 */
export function buildIndex(countries: readonly Country[], lang: Lang): NameIndex {
  const entries: Entry[] = [];
  const seen = new Set<string>();
  const add = (name: string, code: string, primary: boolean) => {
    const key = normalizeName(name);
    if (!key || seen.has(`${code}:${key}`)) return;
    seen.add(`${code}:${key}`);
    entries.push({ key, code, primary });
  };
  for (const c of countries) {
    add(c.name[lang], c.code, true);
    for (const n of [c.name.en, c.name.fr, ...c.aliases[lang], ...c.aliases.en, ...c.aliases.fr]) {
      add(n, c.code, false);
    }
  }
  return { lang, entries, byCode: new Map(countries.map((c) => [c.code, c])) };
}

/** Exact match on a name or alias, ignoring case, accents and punctuation. */
export function findExact(index: NameIndex, input: string): string | null {
  const key = normalizeName(input);
  return index.entries.find((e) => e.key === key)?.code ?? null;
}

/**
 * Autocomplete: countries whose name or alias starts with the input, then those with a
 * word starting with it, then those containing it. Each country appears once.
 */
export function search(index: NameIndex, input: string, limit = 8): string[] {
  const q = normalizeName(input);
  if (!q) return [];
  const rank = (key: string) =>
    key === q
      ? 0
      : key.startsWith(q)
        ? 1
        : ` ${key}`.includes(` ${q}`)
          ? 2
          : key.includes(q)
            ? 3
            : -1;
  const best = new Map<string, number>();
  for (const e of index.entries) {
    const r = rank(e.key);
    if (r < 0) continue;
    // Prefer matches on the display name over the same rank on an alias.
    const score = r * 2 + (e.primary ? 0 : 1);
    const prev = best.get(e.code);
    if (prev === undefined || score < prev) best.set(e.code, score);
  }
  const name = (code: string) => index.byCode.get(code)?.name[index.lang] ?? code;
  return [...best]
    .sort((a, b) => a[1] - b[1] || name(a[0]).localeCompare(name(b[0]), index.lang))
    .slice(0, limit)
    .map(([code]) => code);
}

/**
 * Optimal string alignment distance (Damerau-Levenshtein where a swap of two adjacent
 * letters counts as one edit). Returns `max + 1` as soon as the distance exceeds `max`.
 */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[] = new Array<number>(rows * cols).fill(0);
  const at = (i: number, j: number) => d[i * cols + j] as number;
  for (let i = 0; i < rows; i++) d[i * cols] = i;
  for (let j = 0; j < cols; j++) d[j] = j;
  for (let i = 1; i < rows; i++) {
    let rowMin = Infinity;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(at(i - 1, j) + 1, at(i, j - 1) + 1, at(i - 1, j - 1) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, at(i - 2, j - 2) + 1);
      }
      d[i * cols + j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
  }
  return at(a.length, b.length);
}

/** Edits allowed for an input of this many characters: 1 up to 5, 2 up to 10, 3 beyond. */
export function allowedEdits(length: number): number {
  return length <= 5 ? 1 : length <= 10 ? 2 : 3;
}

/** Inputs shorter than this get no typo suggestion (too many near matches). */
export const MIN_SUGGEST_LENGTH = 3;

export type Resolution =
  | { kind: 'match'; code: string }
  | { kind: 'already'; code: string }
  | { kind: 'suggest'; code: string }
  | { kind: 'unknown' };

/**
 * Decides what to do with a submitted input:
 * an exact match is guessed, a close typo is suggested ("Did you mean?"), and a country
 * already guessed is reported instead of being guessed or suggested again.
 */
export function resolveInput(
  index: NameIndex,
  input: string,
  alreadyGuessed: ReadonlySet<string>,
): Resolution {
  const exact = findExact(index, input);
  if (exact)
    return alreadyGuessed.has(exact)
      ? { kind: 'already', code: exact }
      : { kind: 'match', code: exact };

  const q = normalizeName(input);
  if (q.length < MIN_SUGGEST_LENGTH) return { kind: 'unknown' };
  const max = allowedEdits(q.length);
  let best: { code: string; dist: number; population: number } | null = null;
  for (const e of index.entries) {
    const dist = editDistance(q, e.key, max);
    if (dist > max) continue;
    const population = index.byCode.get(e.code)?.population ?? 0;
    if (!best || dist < best.dist || (dist === best.dist && population > best.population)) {
      best = { code: e.code, dist, population };
    }
  }
  if (!best) return { kind: 'unknown' };
  return alreadyGuessed.has(best.code)
    ? { kind: 'already', code: best.code }
    : { kind: 'suggest', code: best.code };
}
