"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";

const WHISPER_LINES = [
  "behind you...",
  "check the code again...",
  "trust no one...",
  "the ghost is close...",
  "you missed something...",
  "time is running out...",
  "look at line seven...",
  "who changed that variable...",
  "the system is compromised...",
  "can you hear me...",
];

/**
 * Paranoia Whispers — ElevenLabs TTS whispers that play for engineers.
 * Pre-generates all clips on mount, then plays them based on paranoia level.
 *
 * 60-70%: every 25-30s at 15% volume
 * 70-80%: every 15-20s at 20% volume
 * 80-90%: every 10-15s at 25% volume
 * 90-100%: every 5-8s at 30% volume
 */
export function WhisperEngine() {
  const { paranoiaMeter, phase } = useGameStore();
  const clipsRef = useRef<Blob[]>([]);
  const loadedRef = useRef(false);
  const lastIndexRef = useRef(-1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pre-generate all whisper clips on game start
  useEffect(() => {
    if (phase !== "playing" || loadedRef.current) return;
    loadedRef.current = true;

    async function loadWhispers() {
      const results = await Promise.allSettled(
        WHISPER_LINES.map(async (text) => {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, whisper: true }),
          });
          if (res.ok) return await res.blob();
          return null;
        }),
      );

      clipsRef.current = results
        .map((r) => (r.status === "fulfilled" ? r.value : null))
        .filter((b): b is Blob => b !== null);
    }

    loadWhispers();
  }, [phase]);

  // Play whispers based on paranoia level
  useEffect(() => {
    if (phase !== "playing") return;

    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (paranoiaMeter < 60 || clipsRef.current.length === 0) return;

    let intervalMs: number;
    let volume: number;

    if (paranoiaMeter >= 90) {
      intervalMs = 5000 + Math.random() * 3000;
      volume = 0.3;
    } else if (paranoiaMeter >= 80) {
      intervalMs = 10000 + Math.random() * 5000;
      volume = 0.25;
    } else if (paranoiaMeter >= 70) {
      intervalMs = 15000 + Math.random() * 5000;
      volume = 0.2;
    } else {
      intervalMs = 25000 + Math.random() * 5000;
      volume = 0.15;
    }

    intervalRef.current = setInterval(() => {
      const clips = clipsRef.current;
      if (clips.length === 0) return;

      // Pick a random clip, never the same twice in a row
      let idx: number;
      do {
        idx = Math.floor(Math.random() * clips.length);
      } while (idx === lastIndexRef.current && clips.length > 1);
      lastIndexRef.current = idx;

      // Add slight random delay for organic feel
      const delay = Math.random() * 2000;
      setTimeout(() => {
        const url = URL.createObjectURL(clips[idx]);
        const audio = new Audio(url);
        audio.volume = volume;
        audio.play().catch(() => {});
        audio.onended = () => URL.revokeObjectURL(url);
      }, delay);
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [phase, paranoiaMeter]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return null;
}
