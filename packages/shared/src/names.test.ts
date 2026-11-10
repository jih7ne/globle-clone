import { describe, expect, it } from 'vitest';
import { normalizeName } from './names';

describe('normalizeName', () => {
  it.each([
    ['France', 'france'],
    ['  FRANCE  ', 'france'],
    ['Côte d’Ivoire', 'cote d ivoire'],
    ["Côte d'Ivoire", 'cote d ivoire'],
    ['États-Unis', 'etats unis'],
    ['São Tomé and Príncipe', 'sao tome and principe'],
    ['Trinidad & Tobago', 'trinidad and tobago'],
    ['St. Lucia', 'saint lucia'],
    ['St Kitts and Nevis', 'saint kitts and nevis'],
    ['The Gambia', 'gambia'],
    ['Guinea-Bissau', 'guinea bissau'],
    ['', ''],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });

  it('does not turn words containing "st" into "saint"', () => {
    expect(normalizeName('Estonia')).toBe('estonia');
    expect(normalizeName('East Timor')).toBe('east timor');
  });
});
