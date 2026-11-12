import { expect, guess, seedStorage, startPlaying, test } from './fixtures';

/**
 * Time-dependent behaviour, with Playwright's fake clock (specification, section 10):
 * midnight rollover, DST days, the countdown, and a streak broken by a missed day.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** A finished game for `date`, as the app saves it: no server needed to show it. */
function finishedGame(date: string) {
  return {
    v: 1,
    date,
    dayNumber: 5,
    token: 'seeded',
    guesses: [{ code: 'FRA', distanceKm: 0, band: 'found' }],
    status: 'won',
    answer: 'FRA',
    finished: true,
    globalStats: null,
  };
}

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

test.describe('countdown on DST days (FR-12)', () => {
  test.use({ timezoneId: 'Europe/Paris' });

  for (const { name, date, at, expected } of [
    // Clocks go forward at 02:00: at 01:00 only 22 hours are left, not 23.
    {
      name: '23-hour day',
      date: '2027-03-28',
      at: '2027-03-28T01:00:00+01:00',
      expected: '22:00:00',
    },
    // Clocks go back at 03:00: at 01:00 there are 24 hours left, not 23.
    {
      name: '25-hour day',
      date: '2026-10-25',
      at: '2026-10-25T01:00:00+02:00',
      expected: '24:00:00',
    },
  ]) {
    test(`counts the real time left on a ${name}`, async ({ page }) => {
      await seedStorage(page, { 'gw:seen-how-to': true, 'gw:game': finishedGame(date) });
      // The finished game is enough: prove the page never needs the server for it.
      await page.route('**/api/**', (route) => route.abort());
      await page.clock.install({ time: new Date(at).getTime() - HOUR });
      await page.clock.pauseAt(new Date(at));
      await page.goto('/');
      await expect(page.getByText('Next country in')).toBeVisible();
      await expect(page.locator('time')).toHaveText(expected);
    });
  }

  test('ticks down every second', async ({ page }) => {
    const at = new Date('2026-11-12T23:59:50+01:00');
    await seedStorage(page, { 'gw:seen-how-to': true, 'gw:game': finishedGame('2026-11-12') });
    await page.route('**/api/**', (route) => route.abort());
    await page.clock.install({ time: at.getTime() - HOUR });
    await page.clock.pauseAt(at);
    await page.goto('/');
    await expect(page.locator('time')).toHaveText('00:00:10');
    await page.clock.runFor(3000);
    await expect(page.locator('time')).toHaveText('00:00:07');
  });
});

test.describe('midnight', () => {
  // UTC−12 is the earliest date the server accepts; the next local day is always accepted
  // too (NFR-03), so the rollover runs against the real local Worker.
  test.use({ timezoneId: 'Etc/GMT+12' });

  test('a finished game moves on to the next country at local midnight', async ({ page }) => {
    const now = Date.now();
    const untilMidnight = DAY - ((now - 12 * HOUR) % DAY);
    test.skip(untilMidnight < 2 * 60_000, 'too close to the real UTC−12 midnight');
    const midnight = now + untilMidnight;

    await page.clock.install({ time: now });
    await page.goto('/');
    await startPlaying(page);
    const dayLabel = page.getByText(/^No\. \d{3}$/);
    const firstDay = Number((await dayLabel.textContent())?.slice(4));

    await guess(page, 'Brazil');
    if (await page.getByRole('button', { name: 'Give up' }).isVisible()) {
      page.once('dialog', (d) => void d.accept());
      await page.getByRole('button', { name: 'Give up' }).click();
    }
    await expect(page.getByText('Next country in')).toBeVisible();

    await page.clock.pauseAt(midnight - 3000);
    await expect(page.locator('time')).toHaveText(/^00:00:0[34]$/);
    await page.clock.runFor(5000);

    // A new day: a fresh game, the next number, an empty list.
    await expect(dayLabel).toHaveText(`No. ${String(firstDay + 1).padStart(3, '0')}`);
    await expect(page.getByRole('combobox', { name: 'Guess a country' })).toBeEnabled();
    await expect(page.getByText('Next country in')).toBeHidden();
    await expect(page.getByRole('region', { name: /guess/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'Stats' }).click();
    await expect(page.getByText('Played').locator('..')).toContainText('1');
  });
});

test.describe('streaks (FR-16)', () => {
  test('a missed day breaks the current streak but keeps the best one', async ({ page, today }) => {
    const date = await page.evaluate(() => {
      const d = new Date();
      return [d.getFullYear(), d.getMonth() + 1, d.getDate()]
        .map((n) => String(n).padStart(2, '0'))
        .join('-');
    });
    // Won three and two days ago, missed yesterday.
    await seedStorage(page, {
      'gw:history': [
        { date: shiftDate(date, -3), won: true, guesses: 4 },
        { date: shiftDate(date, -2), won: true, guesses: 6 },
      ],
    });
    await page.reload();
    await startPlaying(page);
    await guess(page, today.answer.name);

    await page.getByRole('button', { name: 'Stats' }).click();
    const stats = page.getByRole('dialog', { name: 'Stats' });
    await expect(stats.getByText('Played').locator('..')).toContainText('3');
    await expect(stats.getByText('Current streak').locator('..')).toContainText('1');
    await expect(stats.getByText('Best streak').locator('..')).toContainText('2');
  });
});
