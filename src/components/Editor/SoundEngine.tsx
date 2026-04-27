"use client";

import { useEffect, useRef } from "react";
import { useEventListener } from "@liveblocks/react/suspense";
import { useGameStore } from "@/store/gameStore";
import { playSfx, startAmbientDrone, playTimeWarning } from "@/lib/sounds";
import { preloadSfx, playCachedSfx } from "@/lib/sfxCache";

/**
 * Manages all game audio:
 * - Pre-loads ElevenLabs SFX on game start (falls back to Web Audio)
 * - Ambient creepy drone
 * - SFX broadcast listener
 * - Time warning beeps
 */
export function SoundEngine() {
  const { phase, paranoiaMeter, timeRemaining } = useGameStore();
  const droneStopRef = useRef<(() => void) | null>(null);

  // Pre-load ElevenLabs SFX when game starts
  useEffect(() => {
    if (phase === "playing") {
      preloadSfx();
    }
  }, [phase]);

  // Start ambient drone when game begins
  useEffect(() => {
    if (phase === "playing" && !droneStopRef.current) {
      droneStopRef.current = startAmbientDrone();
    }
    return () => {
      droneStopRef.current?.();
      droneStopRef.current = null;
    };
  }, [phase]);

  // Time warning beeps
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeRemaining === 30 || timeRemaining === 10 || timeRemaining === 5) {
      // Try ElevenLabs SFX first, fall back to Web Audio
      if (!playCachedSfx("time-warning", 0.4)) {
        playTimeWarning();
      }
    }
  }, [phase, timeRemaining]);

  // Listen for SFX broadcasts from other players
  useEventListener(({ event }) => {
    if (event.type === "sfx") {
      // Try ElevenLabs cache first, fall back to procedural
      if (!playCachedSfx(event.sound, 0.5)) {
        playSfx(event.sound);
      }
    }
  });

  return null;
}
