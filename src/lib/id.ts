/** Generate a reasonably unique id. Uses crypto.randomUUID when available. */
export function uid(prefix = 'id'): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) {
    return `${prefix}_${g.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
