import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

test.describe('feedback form', () => {
  test('sends the answers and thanks the player @mobile', async ({ page }) => {
    const sent: unknown[] = [];
    page.on('request', (r) => r.url().endsWith('/api/feedback') && sent.push(r.postDataJSON()));
    await page.goto('/feedback');
    await expect(page.getByRole('heading', { name: 'Feedback.' })).toBeVisible();

    // The two required questions are checked before anything is sent.
    await page.getByRole('button', { name: /Send feedback/ }).click();
    await expect(page.getByRole('alert')).toContainText('two required questions');

    await page.getByRole('radio', { name: 'Phone' }).check({ force: true });
    await page.getByRole('radio', { name: /Hot/ }).check({ force: true });
    await page.getByRole('radio', { name: 'Maybe' }).check({ force: true });
    await page.getByRole('textbox', { name: /confusing, slow or broken/ }).fill('Nothing');
    await page.getByRole('textbox', { name: /Ideas for the future/ }).fill('A hard mode');
    await page.getByRole('button', { name: /Send feedback/ }).click();

    await expect(page.getByRole('heading', { name: 'Thank you.' })).toBeVisible();
    expect(sent).toEqual([
      expect.objectContaining({
        device: 'mobile',
        rating: 4,
        again: 'maybe',
        ideas: 'A hard mode',
      }),
    ]);
  });

  test('has no serious accessibility violations, in English and French', async ({ page }) => {
    await page.goto('/feedback');
    for (const lang of ['en', 'fr']) {
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(
        violations
          .filter((v) => v.impact === 'critical' || v.impact === 'serious')
          .map((v) => `${lang}: ${v.id} ${v.nodes.map((n) => n.target).join(', ')}`),
      ).toEqual([]);
      if (lang === 'en') {
        await page.getByRole('button', { name: 'Français' }).click();
        await expect(page.getByRole('heading', { name: 'Votre avis.' })).toBeVisible();
      }
    }
  });
});
