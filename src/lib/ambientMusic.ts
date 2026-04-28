/**
 * ElevenLabs AI-generated ambient music system.
 *
 * Generates 3 ambient music layers at game start (low/mid/high paranoia).
 * Crossfades between them based on the current paranoia level.
 * Falls back to the procedural Web Audio drone if generation fails.
 */

interface AmbientLayer {
  name: string;
  prompt: string;
  duration: number;
}

const AMBIENT_LAYERS: AmbientLayer[] = [
  {
    name: "calm",
    prompt:
      "dark ambient electronic drone, minimal, slow pulsing synth pad, mysterious atmosphere, low frequency hum, sci-fi computer room",
    duration: 10,
  },
  {
    name: "tense",
    prompt:
      "tense horror ambient music, dissonant synth drones, unsettling atmosphere, creeping dread, glitchy digital artifacts, rising tension",
    duration: 10,
  },
  {
    name: "critical",
    prompt:
      "intense dark electronic horror music, aggressive pulsing bass, chaotic glitch sounds, alarm-like tones, overwhelming dread, system failure",
    duration: 10,
  },
];

let layers: Map<string, Blob> = new Map();
let audioElements: Map<string, HTMLAudioElement> = new Map();
let loaded = false;
let active = false;

/** Pre-generate all ambient layers. Fire-and-forget. */
export async function preloadAmbientMusic(): Promise<boolean> {
  if (loaded) return layers.size > 0;
  loaded = true;

  const results = await Promise.allSettled(
    AMBIENT_LAYERS.map(async ({ name, prompt, duration }) => {
      try {
        const res = await fetch("/api/generate-sfx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, duration }),
        });
        if (res.ok) {
          const blob = await res.blob();
          layers.set(name, blob);
          return true;
        }
      } catch {
        // Silent fail — procedural drone fallback handles it
      }
      return false;
    }),
  );

  return results.some((r) => r.status === "fulfilled" && r.value === true);
}

/** Start the ambient music system. Returns a stop function. */
export function startAmbientMusic(): () => void {
  if (layers.size === 0) {
    return () => {};
  }

  active = true;

  // Create looping audio elements for each layer
  for (const [name, blob] of layers.entries()) {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0;
    audio.play().catch(() => {});
    audioElements.set(name, audio);
  }

  // Start with calm layer audible
  const calm = audioElements.get("calm");
  if (calm) calm.volume = 0.03;

  return () => {
    active = false;
    for (const [name, audio] of audioElements.entries()) {
      audio.pause();
      if (audio.src) URL.revokeObjectURL(audio.src);
    }
    audioElements.clear();
  };
}

/**
 * Crossfade ambient layers based on paranoia level (0–100).
 *
 * 0–39:   calm only
 * 40–69:  crossfade calm → tense
 * 70–100: crossfade tense → critical
 */
export function updateAmbientMix(paranoia: number): void {
  if (!active || audioElements.size === 0) return;

  const calm = audioElements.get("calm");
  const tense = audioElements.get("tense");
  const critical = audioElements.get("critical");

  const BASE_VOL = 0.03;

  if (paranoia < 40) {
    if (calm) calm.volume = BASE_VOL;
    if (tense) tense.volume = 0;
    if (critical) critical.volume = 0;
  } else if (paranoia < 70) {
    const t = (paranoia - 40) / 30; // 0→1
    if (calm) calm.volume = BASE_VOL * (1 - t);
    if (tense) tense.volume = BASE_VOL * t;
    if (critical) critical.volume = 0;
  } else {
    const t = (paranoia - 70) / 30; // 0→1
    if (calm) calm.volume = 0;
    if (tense) tense.volume = BASE_VOL * (1 - t);
    if (critical) critical.volume = BASE_VOL * Math.min(1, t);
  }
}

/** Check if ambient music layers are loaded */
export function isAmbientMusicReady(): boolean {
  return layers.size > 0;
}
