"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import {
  useMutation,
  useOthers,
  useSelf,
  useStorage,
} from "@liveblocks/react/suspense";
import { Trophy, RotateCcw, Skull, Home } from "lucide-react";

interface GameOverlayProps {
  roomCode: string;
}

const NARRATION = {
  "ghost-wins":
    "The codebase has fallen. The engineers were too slow. I am the machine now.",
  "engineers-win":
    "No... they found every bug. The system is clean. I have been... exorcised.",
};

export function GameOverlay({ roomCode }: GameOverlayProps) {
  const { phase, resetGame } = useGameStore();
  const self = useSelf();
  const others = useOthers();
  const ghostId = useStorage((root) => root.ghostId);
  const narratedRef = useRef(false);

  const resetLiveblocks = useMutation(({ storage }) => {
    storage.set("gameStatus", "waiting");
    storage.set("ghostId", null);
    storage.set("hostPlayerId", null);
    storage.set("editorContent", {});
    storage.set("fakedTasks", {});
    storage.set("activeVote", null);
  }, []);

  // Play victory/defeat narration via ElevenLabs TTS
  useEffect(() => {
    if (
      (phase !== "ghost-wins" && phase !== "engineers-win") ||
      narratedRef.current
    )
      return;
    narratedRef.current = true;

    const text = NARRATION[phase];
    if (!text) return;

    async function playNarration() {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, whisper: false }),
        });
        if (!res.ok) return;
        const buffer = await res.arrayBuffer();
        const blob = new Blob([buffer], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = 0.7;
        audio.play().catch(() => {});
        audio.onended = () => URL.revokeObjectURL(url);
      } catch {
        // Silently fail — narration is a nice-to-have
      }
    }

    // Slight delay so the overlay renders first
    setTimeout(playNarration, 800);
  }, [phase]);

  // Reset narration flag when game resets
  useEffect(() => {
    if (phase === "lobby") {
      narratedRef.current = false;
    }
  }, [phase]);

  if (phase !== "ghost-wins" && phase !== "engineers-win") return null;

  const isGhostWin = phase === "ghost-wins";
  const ghostOther = others.find((o) => o.presence.playerId === ghostId);
  const ghostName =
    self?.presence.playerId === ghostId
      ? self.presence.name
      : ghostOther?.presence.name;

  const handlePlayAgain = () => {
    resetLiveblocks();
    resetGame();
  };

  return (
    <div className="absolute inset-0 z-50 bg-surface-deep/95 backdrop-blur-md flex items-center justify-center font-mono">
      <div className="text-center p-8 max-w-md w-full border border-border/50 bg-surface/50 rounded-sm shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20 scanline-crt" />

        <div
          className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 relative z-10 ${
            isGhostWin
              ? "bg-ghost/10 border border-ghost/50 shadow-ghost-strong"
              : "bg-success/10 border border-success/50 shadow-success"
          }`}
        >
          {isGhostWin ? (
            <Skull size={48} className="text-ghost" />
          ) : (
            <Trophy size={48} className="text-success" />
          )}
        </div>

        <h2
          className={`text-4xl font-black uppercase tracking-[0.2em] mb-4 relative z-10 ${
            isGhostWin ? "text-ghost" : "text-success"
          }`}
        >
          {isGhostWin ? "System Failure" : "System Restored"}
        </h2>

        <p className="text-[13px] text-text-muted mb-4 leading-relaxed uppercase tracking-wider relative z-10">
          {isGhostWin
            ? "The codebase has been consumed by darkness. The ghost reigns supreme."
            : "All bugs have been fixed. The ghost has been exorcised from the machine."}
        </p>

        {ghostName && (
          <p className="text-xs text-text-subtle mb-8 font-bold uppercase tracking-widest relative z-10">
            The Ghost was: <span className="text-ghost ml-1">{ghostName}</span>
          </p>
        )}

        <div className="flex gap-4 justify-center relative z-10">
          <button
            onClick={handlePlayAgain}
            className="flex-1 px-6 py-3 bg-accent/20 text-accent-soft border border-accent/50 hover:bg-accent/40 hover:text-white rounded-sm text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            Play Again
          </button>
          <a
            href="/"
            className="flex-1 px-6 py-3 bg-surface text-text-muted border border-border hover:bg-border hover:text-white rounded-sm text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Disconnect
          </a>
        </div>
      </div>
    </div>
  );
}
