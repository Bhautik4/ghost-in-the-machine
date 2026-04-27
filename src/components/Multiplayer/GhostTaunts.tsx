"use client";

import { useState, useRef, useEffect } from "react";
import { useBroadcastEvent, useSelf } from "@liveblocks/react/suspense";
import { MessageSquare, Loader2, Ghost } from "lucide-react";

const TAUNTS = [
  "I'm watching you",
  "You'll never fix it in time",
  "I'm already inside the system",
  "One of you is next",
  "Check your code again",
  "The machine belongs to me now",
  "You're running out of time",
  "I can see everything you type",
];

/**
 * Ghost-only taunt panel.
 * Clicking a taunt sends it to ElevenLabs TTS, then broadcasts
 * the audio to all players as a demon-voice event.
 */
export function GhostTaunts() {
  const [loading, setLoading] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownExpiry = useRef(0);
  const broadcast = useBroadcastEvent();
  const self = useSelf();

  // Live cooldown countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.ceil((cooldownExpiry.current - Date.now()) / 1000);
      if (left > 0) {
        setCooldownRemaining(left);
        setCooldown(true);
      } else {
        setCooldown(false);
        setCooldownRemaining(0);
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const sendTaunt = async (text: string) => {
    if (cooldown || loading) return;

    setLoading(text);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, whisper: false }),
      });

      if (!res.ok) {
        console.error("TTS taunt error:", res.status);
        return;
      }

      const buffer = await res.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

      // Broadcast to all players
      broadcast({
        type: "demon-voice",
        audioBase64: base64,
        senderName: self?.presence.name ?? "Ghost",
      });

      // Play locally too
      const blob = new Blob([buffer], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = 0.8;
      audio.play().catch(() => {});
      audio.onended = () => URL.revokeObjectURL(url);

      // Start 10s cooldown
      cooldownExpiry.current = Date.now() + 10000;
      setCooldown(true);
    } catch (err) {
      console.error("Taunt failed:", err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="font-mono w-52">
      <div className="bg-surface-deep/95 backdrop-blur-xl border border-ghost/30 rounded-sm shadow-ghost">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-ghost/20">
          <MessageSquare size={12} className="text-ghost" />
          <span className="text-[10px] font-bold text-ghost uppercase tracking-[0.2em]">
            Demon Taunts
          </span>
          {cooldown && (
            <span className="ml-auto text-[9px] text-ghost/50 tabular-nums">
              {cooldownRemaining}s
            </span>
          )}
        </div>

        <div className="p-1.5 grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
          {TAUNTS.map((taunt) => (
            <button
              key={taunt}
              onClick={() => sendTaunt(taunt)}
              disabled={cooldown || loading !== null}
              className={`w-full text-left px-2.5 py-1.5 rounded-sm text-[10px] transition-all ${
                loading === taunt
                  ? "bg-ghost/20 text-ghost"
                  : cooldown || loading
                    ? "text-surface-hover cursor-not-allowed"
                    : "text-ghost/70 hover:bg-ghost/10 hover:text-ghost"
              }`}
            >
              {loading === taunt ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={10} className="animate-spin" />
                  Generating...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Ghost size={10} className="shrink-0 opacity-50" />"{taunt}"
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
