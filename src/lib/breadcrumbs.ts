/**
 * False Breadcrumbs — system-looking messages that blame a random engineer.
 *
 * Each ghost ability has 3-4 message templates. When the ghost uses an ability,
 * one template is picked at random, a random engineer's name is injected,
 * and the message is broadcast to all players as a fake system warning.
 *
 * Engineers see these and start suspecting each other.
 * The ghost sees them too (and knows they're fake).
 */

/** Message templates per ability. {name} is replaced with a random engineer's name. */
const TEMPLATES: Record<string, string[]> = {
  inject: [
    "[WARN] Task rollback detected — last editor: {name}",
    "[SYSTEM] Unexpected revert in codebase. Trace points to {name}'s session",
    "[ALERT] File integrity check failed after {name}'s recent commit",
    "[WARN] Regression detected — {name}'s changes may have introduced a conflict",
  ],
  fake: [
    "[OK] {name} submitted a fix — running verification...",
    "[SYSTEM] Auto-merge triggered by {name}'s edit — validating...",
    "[INFO] {name}'s patch applied. Awaiting test confirmation",
  ],
  blackout: [
    "[ALERT] {name}'s connection caused a power fluctuation",
    "[CRITICAL] Network spike from {name}'s client destabilized the session",
    "[WARN] System overload — {name}'s process consumed excessive resources",
    "[SYSTEM] Emergency throttle engaged. Source: {name}'s session",
  ],
  phantom: [
    "[WARN] Duplicate cursor instance detected from {name}'s session",
    "[SYSTEM] Anomalous input stream — {name} appears to be editing from two locations",
    "[ALERT] Session conflict: {name}'s cursor position out of sync",
  ],
};

/**
 * Pick a random breadcrumb message for a given ability,
 * injecting a random engineer's name.
 *
 * @param ability - The ghost ability key (inject, fake, blackout, phantom)
 * @param engineerNames - Array of engineer names in the room (excluding the ghost)
 * @param lastBlamedName - The name blamed in the previous breadcrumb (to avoid repeats)
 * @returns { message, blamedName } or null if no engineers available
 */
export function pickBreadcrumb(
  ability: string,
  engineerNames: string[],
  lastBlamedName?: string,
): { message: string; blamedName: string } | null {
  if (engineerNames.length === 0) return null;

  const templates = TEMPLATES[ability];
  if (!templates || templates.length === 0) return null;

  // Pick a random engineer, avoiding the last blamed one if possible
  let candidates = engineerNames;
  if (lastBlamedName && engineerNames.length > 1) {
    candidates = engineerNames.filter((n) => n !== lastBlamedName);
  }
  const name = candidates[Math.floor(Math.random() * candidates.length)];

  // Pick a random template
  const template = templates[Math.floor(Math.random() * templates.length)];
  const message = template.replace(/\{name\}/g, name);

  return { message, blamedName: name };
}
