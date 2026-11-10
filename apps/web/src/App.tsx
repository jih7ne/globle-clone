import { BANDS } from '@gw/shared';

export function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper p-4 text-ink">
      <h1 className="text-4xl font-bold">Getting Warmer</h1>
      <p>Find the mystery country. The closer you get, the hotter it gets.</p>
      <ul className="flex gap-2" aria-label="Distance bands">
        {BANDS.map((b) => (
          <li key={b.band} className="rounded px-3 py-1 text-sm" style={{ background: b.color }}>
            {b.band}
          </li>
        ))}
      </ul>
    </main>
  );
}
