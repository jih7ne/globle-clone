import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, guess, startPlaying, test } from './fixtures';

/**
 * v1 acceptance criterion: zero critical axe-core violations (WCAG 2.1 AA rules).
 * The globe canvas is decorative (aria-hidden) and excluded.
 */
async function audit(page: Page, screen: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('canvas')
    .analyze();
  const serious = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(
    serious.map(
      (v) => `${screen}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([]);
}

// Axe reads colours as they are at that instant: mid fade-in, text is half transparent and
// fails contrast (seen on a slow WebKit runner). With reduced motion it sees the final colours.
test.use({ reducedMotion: 'reduce' });

test('no critical or serious accessibility violations on any screen @mobile', async ({
  page,
  today,
}) => {
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  await audit(page, 'how to play');

  await startPlaying(page);
  await audit(page, 'empty game');

  await guess(page, today.others[0]!.name);
  await guess(page, today.others[1]!.name);
  await audit(page, 'game with guesses');

  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Give up' }).click();
  await expect(page.getByRole('article')).toBeVisible();
  await audit(page, 'result');

  await page.getByRole('button', { name: 'Stats' }).click();
  await audit(page, 'stats');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'About' }).click();
  await audit(page, 'about');
});
