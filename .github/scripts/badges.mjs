// Writes shields.io endpoint files for the README badges (CI, badges job).
// usage: node badges.mjs <input dir> <output dir>
//   input: coverage-summary.json (Vitest) and lighthouse/manifest.json (Lighthouse CI)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('usage: node badges.mjs <input dir> <output dir>');

const read = (path) => JSON.parse(readFileSync(join(input, path), 'utf8'));
const color = (score, [good, ok]) =>
  score >= good ? 'brightgreen' : score >= ok ? 'yellow' : 'red';
const badge = (label, message, color) => ({ schemaVersion: 1, label, message, color });

const lines = read('coverage-summary.json').total.lines.pct;
const manifest = read('lighthouse/manifest.json');
const run = manifest.find((r) => r.isRepresentativeRun) ?? manifest[0];
const performance = Math.round(run.summary.performance * 100);
const accessibility = Math.round(run.summary.accessibility * 100);

mkdirSync(output, { recursive: true });
const files = {
  'coverage.json': badge('coverage', `${lines.toFixed(1)}%`, color(lines, [90, 85])),
  'lighthouse-performance.json': badge(
    'lighthouse mobile',
    String(performance),
    color(performance, [90, 85]),
  ),
  'lighthouse-accessibility.json': badge(
    'accessibility',
    String(accessibility),
    color(accessibility, [95, 90]),
  ),
};
for (const [name, data] of Object.entries(files)) {
  writeFileSync(join(output, name), JSON.stringify(data) + '\n');
  console.log(name, data.message);
}
