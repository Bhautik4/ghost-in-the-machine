"use client";

import { useEffect, useRef } from "react";
import { useEventListener } from "@liveblocks/react/suspense";
import { useGameStore } from "@/store/gameStore";
import { playSfx, startAmbientDrone, playTimeWarning } from "@/lib/sounds";

/**
 * Manages all game audio:
 * - Ambient creepy drone that intensifies with paranoia
 * - SFX broadcast listener (task-fixed, blackout, etc.)
 * - Time warning beeps at < 30s
 */
export function SoundEngine() {
  const { phase, paranoiaMeter, timeRemaining } = useGameStore();
  const droneStopRef = useRef<(() => void) | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);

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
      playTimeWarning();
    }
  }, [phase, timeRemaining]);

  // Listen for SFX broadcasts from other players
  useEventListener(({ event }) => {
    if (event.type === "sfx") {
      playSfx(event.sound);
    }
  });

  return null;
}
