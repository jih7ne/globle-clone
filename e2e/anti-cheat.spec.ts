import { expect, guess, startPlaying, test } from './fixtures';

/**
 * NFR-01 (v1 acceptance criterion): the mystery country never reaches the browser before
 * the player wins or gives up: not in an API response, not in the saved game.
 */
test('the answer stays on the server until the player gives up', async ({ page, today }) => {
  const bodies: { url: string; body: string }[] = [];
  page.on('response', async (res) => {
    if (!res.url().includes('/api/')) return;
    bodies.push({ url: res.url(), body: await res.text().catch(() => '') });
  });

  // Start over with the listener attached, so /start is checked too.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await startPlaying(page);
  for (const c of today.others.slice(0, 4)) await guess(page, c.name);

  const { code, name } = today.answer;
  expect(bodies.length).toBeGreaterThanOrEqual(5); // /start + 4 guesses
  for (const { url, body } of bodies) {
    expect(body, url).not.toContain(`"${code}"`);
    expect(body, url).not.toContain(name);
    // The token is readable base64url JSON: it must not carry the answer either.
    for (const token of body.match(/"token":"([^"]+)"/g) ?? []) {
      const payload = token.split('"')[3]!.split('.')[0]!;
      expect(Buffer.from(payload, 'base64url').toString(), url).not.toContain(code);
    }
  }
  const saved = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(saved).not.toContain(`"answer"`);

  // Sanity check that the assertions above could fail: the answer does arrive after giving up.
  bodies.length = 0;
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Give up' }).click();
  await expect(page.getByRole('article')).toContainText(name);
  expect(bodies.some((b) => b.body.includes(`"${code}"`))).toBe(true);
});
