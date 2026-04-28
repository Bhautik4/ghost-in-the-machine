/**
 * Dynamic Narrator — ElevenLabs TTS narration for key game events.
 *
 * Pre-generates narrator clips on game start for mid-game moments.
 * Uses a dramatic, authoritative voice (non-whisper TTS mode).
 * Falls back silently if generation fails — narration is a nice-to-have.
 */

interface NarratorLine {
  event: string;
  text: string;
}

const NARRATOR_LINES: NarratorLine[] = [
  // Ghost sabotage
  {
    event: "file-corrupted",
    text: "A file has been corrupted. The ghost is inside the system.",
  },
  // Engineer progress
  {
    event: "file-verified",
    text: "One file restored. The system stabilizes... for now.",
  },
  // Stage unlocks
  {
    event: "stage-2-unlock",
    text: "Stage two. The integration layer is now exposed.",
  },
  {
    event: "stage-3-unlock",
    text: "Final stage. The core system is vulnerable. Fix it before it's too late.",
  },
  // Vote
  {
    event: "vote-called",
    text: "An accusation has been made. Choose wisely... or pay the price.",
  },
  // Time pressure
  {
    event: "sixty-seconds",
    text: "Sixty seconds remain. The ghost grows stronger.",
  },
  {
    event: "thirty-seconds",
    text: "Thirty seconds. The system is failing.",
  },
  // Paranoia milestones
  {
    event: "paranoia-high",
    text: "Paranoia is critical. The machine is almost lost.",
  },
];

const cache = new Map<string, Blob>();
let preloaded = false;

/** Pre-generate all narrator clips via ElevenLabs TTS. */
export async function preloadNarration(): Promise<void> {
  if (preloaded) return;
  preloaded = true;

  await Promise.allSettled(
    NARRATOR_LINES.map(async ({ event, text }) => {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, whisper: false }),
        });
        if (res.ok) {
          cache.set(event, await res.blob());
        }
      } catch {
        // Silent fail
      }
    }),
  );
}

/**
 * Play a narrator clip by event name.
 * Returns true if played, false if cache miss.
 */
export function playNarration(event: string, volume = 0.5): boolean {
  const blob = cache.get(event);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.volume = volume;
  audio.play().catch(() => {});
  audio.onended = () => URL.revokeObjectURL(url);
  return true;
}

/** Check if narrator cache has any clips loaded */
export function isNarrationReady(): boolean {
  return cache.size > 0;
}
