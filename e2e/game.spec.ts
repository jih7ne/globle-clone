import { expect, guess, guessRow, startPlaying, test, type Page } from './fixtures';

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
    browserName,
  }) => {
    // Only Chromium lets a test read the clipboard back; elsewhere, record what was copied.
    if (browserName !== 'chromium') {
      await page.addInitScript(() => {
        const write = navigator.clipboard.writeText.bind(navigator.clipboard);
        navigator.clipboard.writeText = (text: string) => {
          (window as unknown as { copied: string }).copied = text;
          return write(text);
        };
      });
      await page.reload();
    }
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
    const shared = await page.evaluate(() =>
      'copied' in window ? String(window.copied) : navigator.clipboard.readText(),
    );
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

  test('the list ranks guesses or shows them in order, with the trend (FR-07, FR-21)', async ({
    page,
    today,
  }) => {
    // Three wrong guesses at distinct distances, sorted near to far.
    const picks = today.others
      .filter((c) => c.km > 0)
      .filter((c, i, all) => all.findIndex((o) => o.km === c.km) === i);
    const near = picks.reduce((a, b) => (b.km < a.km ? b : a));
    const far = picks.reduce((a, b) => (b.km > a.km ? b : a));
    const mid = picks.find((c) => c.km > near.km && c.km < far.km)!;
    const status = page.locator('[aria-live="polite"]').first();

    await startPlaying(page);
    await guess(page, mid.name);
    await expect(status).toContainText('First guess.');
    await guess(page, far.name);
    await expect(status).toContainText('Colder.');
    await guess(page, near.name);
    await expect(status).toContainText('Warmer.');

    const rows = page.getByRole('region', { name: /guess/ }).getByRole('listitem');
    const row = (n: string, c: { name: string }) => new RegExp(`^${n}${c.name}(?![a-z])`);
    // Ranked is the default: nearest first, each row keeps its guess number.
    await expect(page.getByRole('button', { name: 'Closest' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(rows).toHaveText([row('03', near), row('01', mid), row('02', far)]);

    await page.getByRole('button', { name: 'In order' }).click();
    // Latest first, with the trend of each guess against the best one before it.
    await expect(rows).toHaveText([row('03', near), row('02', far), row('01', mid)]);
    await expect(rows.nth(0).getByLabel('Getting warmer.')).toBeVisible();
    await expect(rows.nth(1).getByLabel('Getting colder.')).toBeVisible();
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

test.describe('languages', () => {
  test('switches to French and remembers it (FR-13) @mobile', async ({ page }) => {
    await page.goto('/');
    await startPlaying(page);
    await page.getByRole('button', { name: 'Français' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.getByRole('combobox', { name: 'Proposer un pays' })).toBeEnabled();
    await page.reload();
    await expect(page.getByText('Trouvez le pays.')).toBeVisible();
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('combobox', { name: 'Guess a country' })).toBeEnabled();
  });

  test('a French browser starts in French and accepts English names', async ({
    browser,
    today,
  }) => {
    const context = await browser.newContext({ locale: 'fr-FR' });
    const page = await context.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: 'Commencer' }).click();
    const input = page.getByRole('combobox', { name: 'Proposer un pays' });
    const [en, fr] = today.answer.code === 'DEU' ? ['Spain', 'Espagne'] : ['Germany', 'Allemagne'];
    await input.fill(en);
    await input.press('Enter');
    await expect(guessRow(page, fr)).toBeVisible();
    await context.close();
  });
});

test.describe('globe', () => {
  test('draws the land even when the map code loads slowly @mobile', async ({ page, context }) => {
    // On the live site the worker's import is a network fetch; a slow one once made the
    // worker miss the page's message, and the globe stayed an empty ocean.
    await context.route(/baseGeometry-.*\.js$/, async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.continue();
    });
    const fallbacks: string[] = [];
    page.on('console', (m) => m.text().includes('Map worker failed') && fallbacks.push(m.text()));
    await page.goto('/');
    await startPlaying(page);
    await expect(page.locator('[data-map="ready"]')).toBeAttached({ timeout: 30_000 });
    // Built by the worker, not rescued by the main-thread fallback.
    expect(fallbacks).toEqual([]);
  });

  test('turns with a drag and zooms with the wheel (FR-08)', async ({ page }) => {
    await page.goto('/');
    await startPlaying(page);
    await expect(page.locator('[data-map="ready"]')).toBeAttached({ timeout: 30_000 });
    const canvas = page.locator('main canvas');
    const box = (await canvas.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const before = await settledShot(page);

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 200, cy + 40, { steps: 10 });
    await page.mouse.up();
    const turned = await settledShot(page);
    expect(turned.equals(before), 'the globe did not turn').toBe(false);

    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -600);
    const zoomed = await settledShot(page);
    expect(zoomed.equals(turned), 'the globe did not zoom').toBe(false);
  });
});

test.describe('server unreachable (NFR-07)', () => {
  test('shows a clear message and keeps the game saved', async ({ page, today }) => {
    await startPlaying(page);
    const [a, b] = today.others;
    await guess(page, a!.name);

    await page.route('**/api/**', (route) => route.abort('internetdisconnected'));
    const input = page.getByRole('combobox', { name: 'Guess a country' });
    await input.fill(b!.name);
    await input.press('Escape');
    await input.press('Enter');
    await expect(page.getByRole('alert')).toContainText('Can’t reach the server');
    await expect(guessRow(page, a!.name)).toBeVisible();

    // Still offline: the saved game comes back without the server.
    await page.reload();
    await expect(guessRow(page, a!.name)).toBeVisible();

    await page.unroute('**/api/**');
    await guess(page, b!.name);
    await expect(page.getByRole('alert')).toBeHidden();
  });

  test('a first visit with no server says so and recovers with Try again', async ({ page }) => {
    await page.route('**/api/**', (route) => route.abort('internetdisconnected'));
    await page.goto('/');
    await startPlaying(page);
    await expect(page.getByRole('alert')).toContainText('Can’t reach the server');
    await expect(page.getByRole('combobox', { name: 'Guess a country' })).toBeDisabled();

    await page.unroute('**/api/**');
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('combobox', { name: 'Guess a country' })).toBeEnabled();
  });
});

test.describe('neighbours and mobile layout', () => {
  test('a country bordering the answer says so', async ({ page, today }) => {
    const neighbour = today.neighbours[0];
    test.skip(!neighbour, 'today’s answer has no land neighbour with a one-word name');
    if (!neighbour) return;
    await page.goto('/');
    await startPlaying(page);
    await guess(page, neighbour.name);
    await expect(page.getByText('Next door.')).toBeVisible();
    await expect(
      page.getByText(`${neighbour.name} shares a border with the mystery country.`),
    ).toBeVisible();
    await expect(guessRow(page, neighbour.name)).toContainText('Borders it');
  });

  test('on a phone the panel sits below the globe, never over it @mobile', async ({
    page,
    today,
    isMobile,
  }) => {
    test.skip(!isMobile, 'the desktop layout puts the panel beside the globe');
    await page.goto('/');
    await startPlaying(page);
    await guess(page, today.others[0]?.name ?? 'Brazil');
    const globe = await page.locator('main').boundingBox();
    const panel = await page.locator('aside').boundingBox();
    expect(globe && panel).toBeTruthy();
    if (!globe || !panel) return;
    // The globe box keeps real room and ends where the panel starts.
    expect(globe.height).toBeGreaterThan(page.viewportSize()!.height * 0.25);
    expect(globe.y + globe.height).toBeLessThanOrEqual(panel.y + 1);
  });
});

/** A screenshot of the globe once it has stopped moving (two equal shots in a row). */
async function settledShot(page: Page): Promise<Buffer> {
  const canvas = page.locator('main canvas');
  let last = await canvas.screenshot();
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250);
    const next = await canvas.screenshot();
    if (next.equals(last)) return next;
    last = next;
  }
  return last;
}
