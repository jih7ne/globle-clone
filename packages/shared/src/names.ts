/**
 * Normalises a country name for matching (specification, section 2):
 * lower case, accents removed, punctuation dropped, "st" read as "saint",
 * a leading "the" ignored, whitespace collapsed.
 */
export function normalizeName(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\bst\b/g, 'saint')
    .replace(/^the /, '');
}
