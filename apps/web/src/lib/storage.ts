/**
 * localStorage access that never throws: private windows and blocked storage make the
 * accessor itself throw, and the game must still work (it just won't be remembered).
 */
export function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: keep playing without saving.
  }
}

export const KEYS = {
  session: 'gw:session',
  game: 'gw:game',
  seenHowTo: 'gw:seen-how-to',
} as const;

/** Anonymous per-device ID, created on first use (specification, section 5). */
export function sessionId(): string {
  const existing = readJson<string>(KEYS.session);
  if (existing) return existing;
  const id = crypto.randomUUID();
  writeJson(KEYS.session, id);
  return id;
}
