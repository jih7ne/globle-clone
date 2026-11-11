import { describe, expect, it } from 'vitest';
import { en } from './en';
import { fr } from './fr';

/** Every key, with its kind and, for arrays, its length: the shapes must match exactly. */
function shape(value: unknown, path = ''): string[] {
  if (Array.isArray(value))
    return [`${path}[${value.length}]`, ...value.flatMap((v, i) => shape(v, `${path}[${i}]`))];
  if (value && typeof value === 'object')
    return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k));
  return [`${path}:${typeof value}`];
}

describe('dictionaries', () => {
  it('French has exactly the keys of English', () => {
    expect(shape(fr)).toEqual(shape(en));
  });

  it('every text is translated, apart from shared names and symbols', () => {
    const same = Object.keys(en).filter(
      (k) =>
        typeof en[k as keyof typeof en] === 'string' &&
        en[k as keyof typeof en] === fr[k as keyof typeof fr],
    );
    expect(same.sort()).toEqual(['menu', 'repoUrl', 'stats', 'title']);
  });

  it('each language points to the other', () => {
    expect(en.otherLanguage.lang).toBe(fr.lang);
    expect(fr.otherLanguage.lang).toBe(en.lang);
  });

  it('formats French numbers, plurals and dates', () => {
    expect(fr.km(12345).replace(/\s/g, ' ')).toBe('12 345 km');
    expect(fr.foundIn(1)).toBe('Trouvé en 1 essai');
    expect(fr.foundIn(3)).toBe('Trouvé en 3 essais');
    expect(fr.formatDate('2026-11-11')).toMatch(/mer\.? 11 nov\.? 2026/);
  });
});
