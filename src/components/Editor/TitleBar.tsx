"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { Clock, Shield, Ghost, Bug } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useGameScenario } from "@/lib/useGameScenario";
import { VoiceChat } from "@/components/Multiplayer/VoiceChat";

interface TitleBarProps {
  roomCode: string;
  isGhost: boolean;
}

export function TitleBar({ roomCode, isGhost }: TitleBarProps) {
  const { phase, timeRemaining } = useGameStore();
  const fileVerification = useStorage((root) => root.fileVerification);
  const { scenario } = useGameScenario(roomCode);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isUrgent = timeRemaining <= 30;
  const isCritical = timeRemaining <= 10;

  const verifiedCount = scenario
    ? Object.values(fileVerification ?? {}).filter(
        (v) =>
          v != null &&
          typeof v === "object" &&
          "verified" in v &&
          (v as { verified: boolean }).verified,
      ).length
    : 0;
  const totalFiles = scenario?.files.length ?? 3;

  return (
    <>
      {/* Primary title bar */}
      <div className="h-12 bg-surface-deep border-b border-border flex items-center px-4 gap-4 shrink-0 select-none z-10">
        {/* Left: title + room code */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-text-muted">Ghost in the Machine</span>
          <span className="text-xs text-accent-light tracking-[0.2em] uppercase bg-accent/8 px-2 py-0.5 rounded border border-accent/20">
            {roomCode}
          </span>
        </div>

        <div className="flex-1" />

        {/* Right: voice + bugs + role + timer */}
        {phase === "playing" && (
          <div className="flex items-center gap-3 shrink-0">
            <VoiceChat isGhost={isGhost} />
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Bug size={14} />
              <span>
                {verifiedCount}/{totalFiles}
              </span>
            </div>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                isGhost
                  ? "bg-ghost/10 text-ghost-light border-ghost/20"
                  : "bg-accent/10 text-accent-light border-accent/20"
              }`}
            >
              {isGhost ? <Ghost size={14} /> : <Shield size={14} />}
              {isGhost ? "Ghost" : "Engineer"}
            </div>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold border ${
                isCritical
                  ? "bg-ghost/15 text-ghost-light border-ghost/30 animate-pulse"
                  : isUrgent
                    ? "bg-ghost/10 text-ghost-light border-ghost/20"
                    : timeRemaining < 60
                      ? "bg-warning/10 text-warning-light border-warning/20"
                      : "bg-surface-raised text-text-primary border-border"
              }`}
            >
              <Clock size={14} />
              {formatTime(timeRemaining)}
            </div>
          </div>
        )}
      </div>

      {/* Secondary bar — scenario description */}
      {phase === "playing" && scenario && (
        <div className="px-4 py-2 bg-surface border-b border-border shrink-0 z-10">
          <p className="text-sm text-text-secondary leading-snug">
            {scenario.description}
          </p>
        </div>
      )}
    </>
  );
}
