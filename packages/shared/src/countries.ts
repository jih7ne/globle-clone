import data from './data/countries.json' with { type: 'json' };

export interface Country {
  /** ISO 3166-1 alpha-3 code. */
  code: string;
  name: { en: string; fr: string };
  /** Alternative names, already deduplicated against `name`. */
  aliases: { en: string[]; fr: string[] };
  /** Population estimate, used to break ties between typo suggestions. */
  population: number;
}

export const COUNTRIES: readonly Country[] = data;
