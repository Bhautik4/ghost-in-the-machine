/**
 * Returns a stable player ID persisted in localStorage.
 * Generated once per browser and reused across sessions.
 */
export function getOrCreatePlayerId(): string {
  const KEY = "ghost-machine-player-id";
  let id = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
  if (!id) {
    id = `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY, id);
    }
  }
  return id;
}
