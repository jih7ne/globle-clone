import { expect, guess, guessRow, startPlaying, test } from './fixtures';

test.describe('first visit', () => {
  test('shows How to play once, then remembers it (FR-15) @mobile', async ({ page }) => {
    await page.goto('/');
    const dialog = page.getByRole('dialog', { name: /How to play/ });
    await expect(dialog).toBeVisible();
    await startPlaying(page);
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Guess a country' })).toBeEnabled();
    await expect(dialog).toBeHidden();
  });
});

test.describe('playing', () => {
  test('a win shows the answer, the share text and updates the stats (FR-09, FR-16, FR-17) @mobile', async ({
    page,
    today,
  }) => {
    await startPlaying(page);
    const wrong = today.others[0]!;
    await guess(page, wrong.name);
    await expect(guessRow(page, wrong.name)).toContainText('km');

    await guess(page, today.answer.name);
    const result = page.getByRole('article');
    await expect(result).toContainText('Found in 2 guesses');
    await expect(result.getByRole('heading', { name: today.answer.name })).toBeVisible();
    await expect(page.getByText('Next country in')).toBeVisible();

    await result.getByRole('button', { name: /Share result/ }).click();
    await expect(result.getByRole('button', { name: /Copied/ })).toBeVisible();
    const shared = await page.evaluate(() => navigator.clipboard.readText());
    const lines = shared.split(/\r?\n/);
    expect(lines[0]).toBe(`Getting Warmer #${today.dayNumber} · 2 guesses`);
    expect(lines[1]).toMatch(/^.{1,2}🎯$/u);
    expect(lines[2]).toBe('Streak: 1 day');
    expect(shared).not.toContain(today.answer.name);

    await page.getByRole('button', { name: 'Stats' }).click();
    const stats = page.getByRole('dialog', { name: 'Stats' });
    await expect(stats.getByText('Played').locator('..')).toContainText('1');
    await expect(stats.getByText('Win rate').locator('..')).toContainText('100%');
    await page.keyboard.press('Escape');
    await expect(stats).toBeHidden();
  });

  test('a typo gets a "Did you mean?" that submits on Yes (FR-22)', async ({ page, today }) => {
    await startPlaying(page);
    const target = today.others.find((c) => c.name.length >= 6)!;
    // Swap two letters in the middle: one transposition, within the threshold.
    const typo = target.name.slice(0, 2) + target.name[3] + target.name[2] + target.name.slice(4);
    const input = page.getByRole('combobox', { name: 'Guess a country' });
    await input.fill(typo);
    await input.press('Escape');
    await input.press('Enter');
    await expect(page.getByText(`Did you mean ${target.name}?`)).toBeVisible();
    await expect(guessRow(page, target.name)).toHaveCount(0); // never auto-submitted
    await page.getByRole('button', { name: 'Yes' }).click();
    await expect(guessRow(page, target.name)).toBeVisible();
  });

  test('rejects unknown and repeated countries with a message (FR-04)', async ({ page, today }) => {
    await startPlaying(page);
    const input = page.getByRole('combobox', { name: 'Guess a country' });
    await input.fill('Atlantis Zzz');
    await input.press('Enter');
    await expect(page.getByText('isn’t a country on our list')).toBeVisible();

    const country = today.others[1]!;
    await guess(page, country.name);
    await input.fill(country.name);
    await input.press('Escape');
    await input.press('Enter');
    await expect(page.getByText(`You already guessed ${country.name}.`)).toBeVisible();
  });

  test('the game survives a reload (FR-11)', async ({ page, today }) => {
    await startPlaying(page);
    const [a, b] = today.others;
    await guess(page, a!.name);
    await guess(page, b!.name);
    await page.reload();
    await expect(guessRow(page, a!.name)).toBeVisible();
    await expect(guessRow(page, b!.name)).toBeVisible();
    await expect(page.getByRole('region', { name: /guess/ })).toContainText('2 guesses');
  });

  test('giving up reveals the answer and counts as a loss (FR-10)', async ({ page, today }) => {
    await startPlaying(page);
    await guess(page, today.others[2]!.name);
    page.once('dialog', (d) => void d.accept());
    await page.getByRole('button', { name: 'Give up' }).click();
    const result = page.getByRole('article');
    await expect(result).toContainText('You gave up after 1 guess');
    await expect(result.getByRole('heading', { name: today.answer.name })).toBeVisible();
    await page.getByRole('button', { name: 'Stats' }).click();
    await expect(page.getByText('Win rate').locator('..')).toContainText('0%');
  });

  test('can be played with the keyboard only (NFR-09)', async ({ page, today }) => {
    await page.goto('/');
    await page.keyboard.press('Enter'); // "Start playing" has focus
    await expect(page.getByRole('dialog')).toBeHidden();
    const input = page.getByRole('combobox', { name: 'Guess a country' });
    await input.focus();
    const country = today.others[3]!;
    await page.keyboard.type(country.name.slice(0, 4));
    await expect(page.getByRole('listbox')).toBeVisible();
    // Walk the suggestions down to the country, then Enter.
    const options = page.getByRole('option');
    const index = await options.allTextContents().then((t) => t.indexOf(country.name));
    expect(index).toBeGreaterThanOrEqual(0);
    for (let i = 0; i <= index; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(guessRow(page, country.name)).toBeVisible();
  });
});
