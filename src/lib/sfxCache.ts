/**
 * ElevenLabs SFX cache.
 * Pre-generates sound effects on game start, falls back to Web Audio if not loaded.
 */

const cache = new Map<string, Blob>();
let preloaded = false;

const SFX_PROMPTS: { name: string; prompt: string; duration: number }[] = [
  {
    name: "task-fixed",
    prompt:
      "short positive digital chime notification sound, futuristic, bright",
    duration: 1,
  },
  {
    name: "blackout",
    prompt:
      "dark electronic power failure rumble, horror atmosphere, deep bass drone",
    duration: 2,
  },
  {
    name: "vote-called",
    prompt:
      "urgent alert chime, three ascending tones, sci-fi interface warning",
    duration: 1,
  },
  {
    name: "time-warning",
    prompt: "short urgent warning beep, digital alarm, tense single tone",
    duration: 0.5,
  },
  {
    name: "game-over-ghost",
    prompt:
      "dramatic horror game over stinger, dark orchestral hit, ominous deep impact",
    duration: 2,
  },
  {
    name: "game-over-engineers",
    prompt:
      "triumphant victory fanfare, short and bright, digital celebration chime",
    duration: 2,
  },
  {
    name: "stage-unlock",
    prompt:
      "level up sound effect, ascending digital tones, achievement unlocked notification",
    duration: 1,
  },
];

/** Pre-generate all SFX clips via ElevenLabs. Fire-and-forget on game start. */
export async function preloadSfx() {
  if (preloaded) return;
  preloaded = true;

  // Load in parallel, don't block gameplay if some fail
  await Promise.allSettled(
    SFX_PROMPTS.map(async ({ name, prompt, duration }) => {
      try {
        const res = await fetch("/api/generate-sfx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, duration }),
        });
        if (res.ok) {
          cache.set(name, await res.blob());
        }
      } catch {
        // Silently fail — Web Audio fallback will handle it
      }
    }),
  );
}

/** Play a cached ElevenLabs SFX. Returns true if played, false if cache miss. */
export function playCachedSfx(name: string, volume = 0.5): boolean {
  const blob = cache.get(name);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.volume = volume;
  audio.play().catch(() => {});
  audio.onended = () => URL.revokeObjectURL(url);
  return true;
}

/** Check if SFX cache has been loaded */
export function isSfxCacheReady(): boolean {
  return cache.size > 0;
}
