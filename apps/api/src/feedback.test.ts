import { describe, expect, it } from 'vitest';
import { MAX_TEXT, parseFeedback } from './feedback';

describe('parseFeedback', () => {
  it('keeps valid answers and drops unknown choices to null', () => {
    expect(parseFeedback({ device: 'desktop', rating: 3, again: 'often', lang: 'de' })).toEqual({
      device: 'desktop',
      rating: 3,
      again: null,
      problems: null,
      ideas: null,
      setup: null,
      lang: null,
    });
  });

  it('trims text, turns blanks into null and cuts very long answers', () => {
    const row = parseFeedback({
      device: 'mobile',
      rating: 5,
      problems: '   ',
      ideas: 'x'.repeat(5000),
    });
    expect(row).toMatchObject({ problems: null });
    expect(row !== 'spam' && row?.ideas?.length).toBe(MAX_TEXT);
  });

  it('flags the honeypot as spam before anything else', () => {
    expect(parseFeedback({ website: 'x' })).toBe('spam');
  });

  it('requires a device and a whole rating from 1 to 5', () => {
    expect(parseFeedback({ rating: 3 })).toBeNull();
    expect(parseFeedback({ device: 'mobile', rating: 0 })).toBeNull();
    expect(parseFeedback({ device: 'mobile', rating: '4' })).toBeNull();
  });
});
