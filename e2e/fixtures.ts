import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { test as base, expect, type Page } from '@playwright/test';
import { createDailyPicker } from '../apps/api/src/daily';
import { COUNTRIES } from '../packages/shared/src/countries';
import { E2E } from './env';

const distances: { codes: string[]; km: number[][] } = JSON.parse(
  readFileSync(new URL('../apps/api/src/data/distances.json', import.meta.url), 'utf8'),
);
const pick = createDailyPicker(E2E.secret, distances.codes);
const nameOf = (code: string) => COUNTRIES.find((c) => c.code === code)?.name.en ?? code;

export interface Today {
  dayNumber: number;
  answer: { code: string; name: string };
  /** Countries sharing a border with the answer (0 km); none for island countries. */
  neighbours: { code: string; name: string }[];
  /** Playable countries other than the answer, for wrong guesses, with their distance. */
  others: { code: string; name: string; km: number }[];
}

export const test = base.extend<{ today: Today }>({
  // Each test counts as its own IP for the local API's rate limiter (60 requests a minute).
  // Not on a deployed site: Cloudflare sets this header itself.
  context: async ({ context }, use) => {
    if (!process.env.E2E_BASE_URL)
      await context.setExtraHTTPHeaders({ 'CF-Connecting-IP': `10.0.${rand()}.${rand()}` });
    await use(context);
  },

  // Today's mystery country, computed like the Worker does with the test secret.
  today: async ({ page, request }, use) => {
    await page.goto('/');
    const date = await page.evaluate(() => {
      const d = new Date();
      return [d.getFullYear(), d.getMonth() + 1, d.getDate()]
        .map((n) => String(n).padStart(2, '0'))
        .join('-');
    });
    const res = await request.post(`${E2E.apiUrl}/api/start`, {
      data: { date, sessionId: randomUUID() },
      headers: { 'CF-Connecting-IP': `10.1.${rand()}.${rand()}` },
    });
    expect(res.ok(), await res.text()).toBe(true);
    const { dayNumber } = (await res.json()) as { dayNumber: number };
    const code = await pick(dayNumber);
    const row = distances.km[distances.codes.indexOf(code)] ?? [];
    const others = COUNTRIES.filter((c) => c.code !== code)
      // Single-word names avoid ambiguous autocomplete matches.
      .filter((c) => /^[A-Za-z]+$/.test(c.name.en))
      .map((c) => ({
        code: c.code,
        name: c.name.en,
        km: row[distances.codes.indexOf(c.code)] ?? -1,
      }));
    const neighbours = others.filter((c) => c.km === 0);
    await use({ dayNumber, answer: { code, name: nameOf(code) }, neighbours, others });
  },
});

function rand() {
  return Math.floor(Math.random() * 254) + 1;
}

/** Closes the first-visit "How to play" sheet. */
export async function startPlaying(page: Page) {
  await page.getByRole('button', { name: /Start playing/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
}

/** Types a country and submits it; waits until it shows up in the guess list. */
export async function guess(page: Page, name: string) {
  const input = page.getByRole('combobox', { name: 'Guess a country' });
  await input.fill(name);
  await input.press('Escape'); // close the suggestions so Enter submits the typed text
  await input.press('Enter');
  await expect(guessRow(page, name)).toBeVisible();
}

export function guessRow(page: Page, name: string) {
  return (
    page
      .getByRole('region', { name: /guess|essai/ })
      .getByRole('listitem')
      // The name's own element, matched exactly: Niger is not Nigeria. (A text regex on the
      // whole row broke once the distance became words: "ArgentinaBorders it".)
      .filter({ has: page.getByText(name, { exact: true }) })
  );
}

/** Saves values in localStorage before the app's own code runs, on every page load. */
export async function seedStorage(page: Page, values: Record<string, unknown>) {
  await page.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries))
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value));
  }, values);
}

export { expect, type Page };
