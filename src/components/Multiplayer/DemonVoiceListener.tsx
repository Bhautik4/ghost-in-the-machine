"use client";

import { useEventListener } from "@liveblocks/react/suspense";

/**
 * Mounted by all players (engineers) to listen for demon voice broadcasts.
 * The Ghost's GhostHauntButton handles both sending and its own playback.
 */
export function DemonVoiceListener() {
  useEventListener(({ event }) => {
    if (event.type === "demon-voice") {
      try {
        const binary = atob(event.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = 0.8;
        audio.play();
        audio.onended = () => URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Failed to play demon voice:", err);
      }
    }
  });

  return null;
}
