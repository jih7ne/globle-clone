import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { COUNTRIES } from './countries';
import {
  allowedEdits,
  buildIndex,
  editDistance,
  findExact,
  resolveInput,
  search,
  type NameIndex,
} from './match';

const en = buildIndex(COUNTRIES, 'en');
const fr = buildIndex(COUNTRIES, 'fr');
const none = new Set<string>();
const nameOf = (index: NameIndex, code: string) => index.byCode.get(code)?.name[index.lang];

describe('editDistance', () => {
  it.each([
    ['france', 'france', 0],
    ['frnce', 'france', 1], // missing letter
    ['frannce', 'france', 1], // extra letter
    ['frabce', 'france', 1], // wrong letter
    ['farnce', 'france', 1], // swapped letters
    ['germny', 'germany', 1],
    ['', 'abc', 3],
    ['kitten', 'sitting', 3],
  ])('%s -> %s = %i', (a, b, d) => {
    expect(editDistance(a, b)).toBe(d);
  });

  it('stops early once the distance exceeds the maximum', () => {
    expect(editDistance('abcdefgh', 'zzzzzzzz', 2)).toBe(3);
    expect(editDistance('a', 'abcdef', 2)).toBe(3);
  });

  it('is symmetric and zero only for equal strings (property)', () => {
    const word = fc.string({ unit: fc.constantFrom('a', 'b', 'c', 'd'), maxLength: 8 });
    fc.assert(
      fc.property(word, word, (a, b) => {
        expect(editDistance(a, b)).toBe(editDistance(b, a));
        expect(editDistance(a, b) === 0).toBe(a === b);
      }),
    );
  });
});

describe('allowedEdits', () => {
  it.each([
    [3, 1],
    [5, 1],
    [6, 2],
    [10, 2],
    [11, 3],
    [30, 3],
  ])('%i characters -> %i edits', (len, edits) => {
    expect(allowedEdits(len)).toBe(edits);
  });
});

describe('findExact', () => {
  it.each([
    ['France', 'FRA'],
    ['  fRaNcE ', 'FRA'],
    ['USA', 'USA'],
    ['united states of america', 'USA'],
    ['Côte d’Ivoire', 'CIV'],
    ['cote d ivoire', 'CIV'],
    ['Allemagne', 'DEU'], // French name accepted in the English index
    ['St Lucia', 'LCA'],
  ])('%s -> %s', (input, code) => {
    expect(findExact(en, input)).toBe(code);
  });

  it('returns null for unknown names', () => {
    expect(findExact(en, 'Atlantis')).toBeNull();
    expect(findExact(en, '')).toBeNull();
  });
});

describe('search (autocomplete)', () => {
  it('lists prefix matches first, alphabetically', () => {
    const codes = search(en, 'ger');
    expect(codes[0]).toBe('DEU');
  });

  it('finds countries by a word inside the name', () => {
    expect(search(en, 'korea')).toEqual(expect.arrayContaining(['KOR', 'PRK']));
    expect(search(en, 'guinea')).toEqual(expect.arrayContaining(['GIN', 'GNB', 'GNQ', 'PNG']));
  });

  it('matches aliases but lists each country once', () => {
    const codes = search(en, 'united');
    expect(codes).toContain('USA');
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('respects the limit and ignores empty input', () => {
    expect(search(en, 'a', 5)).toHaveLength(5);
    expect(search(en, '   ')).toEqual([]);
  });

  it('uses the index language for ordering', () => {
    expect(nameOf(fr, search(fr, 'allem')[0]!)).toBe('Allemagne');
  });
});

describe('resolveInput', () => {
  it('guesses an exact match', () => {
    expect(resolveInput(en, 'japan', none)).toEqual({ kind: 'match', code: 'JPN' });
  });

  it.each([
    ['Frnace', 'FRA'],
    ['Germny', 'DEU'],
    ['Brasil', 'BRA'],
    ['Argentin', 'ARG'],
    ['Phillipines', 'PHL'],
    ['Kazakstan', 'KAZ'],
    ['Madagaskar', 'MDG'],
    ['Bosnia Herzegovina', 'BIH'],
  ])('suggests a country for the typo "%s"', (input, code) => {
    expect(resolveInput(en, input, none)).toEqual({ kind: 'suggest', code });
  });

  it('breaks ties in favour of the more populous country', () => {
    // "Niger" and "Nigeria" are both one edit from "nigera".
    expect(resolveInput(en, 'Nigera', none)).toEqual({ kind: 'suggest', code: 'NGA' });
  });

  it('reports a country already guessed instead of guessing or suggesting it', () => {
    const guessed = new Set(['FRA']);
    expect(resolveInput(en, 'France', guessed)).toEqual({ kind: 'already', code: 'FRA' });
    expect(resolveInput(en, 'Frnace', guessed)).toEqual({ kind: 'already', code: 'FRA' });
  });

  it.each(['Atlantis', 'zzzzzz', 'xy', 'ab', ''])('gives up on "%s"', (input) => {
    expect(resolveInput(en, input, none)).toEqual({ kind: 'unknown' });
  });

  it('never suggests beyond the allowed number of edits', () => {
    // "fxxnce" is 2 edits from "france", but 6 characters allow 2: suggested.
    expect(resolveInput(en, 'fxxnce', none).kind).toBe('suggest');
    // "qqq" (3 characters) allows 1 edit; nothing is that close.
    expect(resolveInput(en, 'qqq', none)).toEqual({ kind: 'unknown' });
  });

  it('resolves every display name and alias to its own country (property)', () => {
    for (const c of COUNTRIES) {
      for (const n of [c.name.en, c.name.fr, ...c.aliases.en, ...c.aliases.fr]) {
        expect(resolveInput(en, n, none), n).toEqual({ kind: 'match', code: c.code });
      }
    }
  });
});
