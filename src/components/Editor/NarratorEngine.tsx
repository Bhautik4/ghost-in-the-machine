"use client";

import { useEffect, useRef } from "react";
import { useEventListener } from "@liveblocks/react/suspense";
import { useStorage } from "@liveblocks/react/suspense";
import { useGameStore } from "@/store/gameStore";
import { preloadNarration, playNarration } from "@/lib/narratorCache";

/**
 * Dynamic mid-game narrator.
 *
 * Triggers ElevenLabs TTS narration at key game moments:
 * - File corrupted (ghost inject bug detected via verification change)
 * - File verified (verification status changes to passed)
 * - Stage 2/3 unlocks
 * - Vote called
 * - 60s / 30s remaining
 * - Paranoia hits 80%+
 *
 * Cooldown prevents narration spam (minimum 8s between clips).
 */
export function NarratorEngine() {
  const { phase, timeRemaining, paranoiaMeter } = useGameStore();
  const fileVerification = useStorage((root) => root.fileVerification);
  const lastPlayRef = useRef(0);
  const prevVerificationRef = useRef<Record<string, boolean>>({});
  const triggeredRef = useRef<Set<string>>(new Set());

  const COOLDOWN_MS = 8000;

  // Pre-load narrator clips on game start
  useEffect(() => {
    if (phase === "playing") {
      preloadNarration();
      triggeredRef.current.clear();
      prevVerificationRef.current = {};
    }
  }, [phase]);

  const tryPlay = (event: string, volume = 0.5): boolean => {
    const now = Date.now();
    if (now - lastPlayRef.current < COOLDOWN_MS) return false;
    if (triggeredRef.current.has(event)) return false;

    const played = playNarration(event, volume);
    if (played) {
      lastPlayRef.current = now;
      triggeredRef.current.add(event);
    }
    return played;
  };

  // Track verification changes → file-corrupted / file-verified
  useEffect(() => {
    if (phase !== "playing" || !fileVerification) return;

    const prev = prevVerificationRef.current;
    const current: Record<string, boolean> = {};

    for (const [fileId, val] of Object.entries(fileVerification)) {
      const v = val as { verified?: boolean } | undefined;
      if (v?.verified) current[fileId] = true;
    }

    // Check for newly verified files
    for (const fileId of Object.keys(current)) {
      if (!prev[fileId]) {
        tryPlay("file-verified", 0.45);
        break;
      }
    }

    // Check for files that lost verification (ghost corrupted them)
    for (const fileId of Object.keys(prev)) {
      if (!current[fileId]) {
        // Reset so it can fire again on next corruption
        triggeredRef.current.delete("file-corrupted");
        tryPlay("file-corrupted", 0.5);
        break;
      }
    }

    prevVerificationRef.current = current;
  }, [phase, fileVerification]);

  // Time-based triggers
  useEffect(() => {
    if (phase !== "playing") return;

    if (timeRemaining === 60) {
      tryPlay("sixty-seconds", 0.45);
    } else if (timeRemaining === 30) {
      tryPlay("thirty-seconds", 0.5);
    }
  }, [phase, timeRemaining]);

  // Stage unlock triggers (180s remaining = stage 2, 60s remaining = stage 3)
  // Stage 2 unlocks at 90s elapsed (150s remaining), Stage 3 at 180s elapsed (60s remaining)
  useEffect(() => {
    if (phase !== "playing") return;

    if (timeRemaining === 150) {
      tryPlay("stage-2-unlock", 0.45);
    } else if (timeRemaining === 60) {
      // stage-3 and sixty-seconds compete — stage-3 takes priority
      if (!triggeredRef.current.has("stage-3-unlock")) {
        triggeredRef.current.delete("sixty-seconds");
        tryPlay("stage-3-unlock", 0.5);
      }
    }
  }, [phase, timeRemaining]);

  // Paranoia milestone
  useEffect(() => {
    if (phase !== "playing") return;

    if (paranoiaMeter >= 80) {
      tryPlay("paranoia-high", 0.5);
    }
  }, [phase, paranoiaMeter]);

  // Vote called — listen for broadcast
  useEventListener(({ event }) => {
    if (event.type === "sfx" && event.sound === "vote-called") {
      tryPlay("vote-called", 0.45);
    }
  });

  return null;
}
