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
    storage.set("generatedScenario", null);
    storage.set("fileVerification", {});
    storage.set("systemStatus", "degraded");
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

    setTimeout(playNarration, 800);
  }, [phase]);

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
    <div className="fixed inset-0 z-50 bg-surface-deep/95 backdrop-blur-md flex items-center justify-center animate-fade-in">
      <div className="text-center p-8 max-w-md w-full mx-4 bg-surface border border-border rounded-lg relative overflow-hidden">
        {/* Subtle CRT effect */}
        <div className="absolute inset-0 pointer-events-none opacity-10 scanline-crt" />

        {/* Icon */}
        <div
          className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 relative z-10 ${
            isGhostWin
              ? "bg-ghost/10 border border-ghost/30"
              : "bg-success/10 border border-success/30"
          }`}
        >
          {isGhostWin ? (
            <Skull size={40} className="text-ghost" />
          ) : (
            <Trophy size={40} className="text-success" />
          )}
        </div>

        {/* Title */}
        <h2
          className={`text-3xl font-bold mb-4 relative z-10 ${
            isGhostWin ? "text-ghost-light" : "text-success-light"
          }`}
        >
          {isGhostWin ? "System Failure" : "System Restored"}
        </h2>

        {/* Description */}
        <p className="text-sm text-text-muted mb-4 leading-relaxed relative z-10">
          {isGhostWin
            ? "The codebase has been consumed by darkness. The ghost reigns supreme."
            : "All bugs have been fixed. The ghost has been exorcised from the machine."}
        </p>

        {/* Ghost reveal */}
        {ghostName && (
          <p className="text-xs text-text-subtle mb-8 relative z-10">
            The Ghost was:{" "}
            <span className="text-ghost-light font-medium ml-1">
              {ghostName}
            </span>
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center relative z-10">
          <button
            onClick={handlePlayAgain}
            className="flex-1 px-5 py-2.5 bg-accent/10 text-accent-light border border-accent/20 hover:bg-accent/15 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            Play Again
          </button>
          <a
            href="/"
            className="flex-1 px-5 py-2.5 bg-surface-raised text-text-muted border border-border hover:bg-surface-hover hover:text-text-primary rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Disconnect
          </a>
        </div>
      </div>
    </div>
  );
}
