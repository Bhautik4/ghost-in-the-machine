"use client";

import { useGameStore } from "@/store/gameStore";
import { useMutation } from "@liveblocks/react/suspense";
import { useEffect, useRef } from "react";
import { Clock, Shield, AlertTriangle, Ghost } from "lucide-react";
import { VotePanel } from "@/components/Editor/VotePanel";

interface GameHUDProps {
  isGhost: boolean;
}

export function GameHUD({ isGhost }: GameHUDProps) {
  const { phase, timeRemaining, paranoiaMeter, tasks, tick } = useGameStore();

  const fixedCount = tasks.filter((t) => t.isFixed).length;

  // Sync ghost-wins to Liveblocks when timer or paranoia triggers it
  const setGhostWins = useMutation(({ storage }) => {
    const status = storage.get("gameStatus");
    if (status === "active") {
      storage.set("gameStatus", "ghost-wins");
    }
  }, []);

  // Game timer
  useEffect(() => {
    if (phase !== "playing") return;
    const interval = setInterval(() => {
      tick();
      const state = useGameStore.getState();
      // If timer just hit 0 or paranoia hit 100, sync to Liveblocks
      if (state.phase === "ghost-wins" || state.phase === "engineers-win") {
        if (state.phase === "ghost-wins") setGhostWins();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, tick, setGhostWins]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (phase !== "playing") return null;

  const isUrgent = timeRemaining <= 30;
  const isCritical = timeRemaining <= 10;

  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col gap-3 font-mono">
      {/* Timer — dramatic at low time */}
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-bold tracking-widest backdrop-blur-md shadow-xl ${
          isCritical
            ? "bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse glow-ghost-strong"
            : isUrgent
              ? "bg-red-500/10 text-red-400 border border-red-500/30"
              : timeRemaining < 60
                ? "bg-warning/10 text-warning-light border border-warning/30 glow-warning"
                : "bg-surface-deep/80 text-text-primary border border-border/50"
        }`}
      >
        <Clock size={16} className={isCritical ? "animate-spin" : ""} />
        <span className={isCritical ? "text-xl font-black" : ""}>
          {formatTime(timeRemaining)}
        </span>
      </div>

      {/* Role badge */}
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-[0.2em] backdrop-blur-md border shadow-lg ${
          isGhost
            ? "bg-red-500/10 text-red-400 border-red-500/30 glow-ghost"
            : "bg-accent/10 text-accent-glow border-accent/30 glow-accent"
        }`}
      >
        {isGhost ? <Ghost size={14} /> : <Shield size={14} />}
        <span>{isGhost ? "Ghost" : "Engineer"}</span>
      </div>

      {/* Task progress */}
      <div className="bg-surface-deep/80 backdrop-blur-md border border-border/50 rounded-sm px-4 py-3 shadow-lg">
        <div className="text-[10px] font-bold text-text-muted mb-2 uppercase tracking-widest">
          Bugs Fixed: {fixedCount}/{tasks.length}
        </div>
        <div className="w-32 h-1.5 bg-surface rounded-sm overflow-hidden shadow-inner">
          <div
            className="h-full bg-success rounded-sm transition-all duration-500 shadow-success"
            style={{ width: `${(fixedCount / tasks.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Paranoia meter */}
      <div
        className={`bg-surface-deep/80 backdrop-blur-md border rounded-sm px-4 py-3 shadow-lg transition-colors ${
          paranoiaMeter > 70
            ? "border-red-500/50 shadow-ghost-strong paranoia-border"
            : "border-border/50"
        }`}
      >
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted mb-2 uppercase tracking-widest">
          <AlertTriangle
            size={12}
            className={paranoiaMeter > 70 ? "text-red-500 animate-pulse" : ""}
          />
          Paranoia
        </div>
        <div className="w-32 h-1.5 bg-surface rounded-sm overflow-hidden shadow-inner relative">
          <div
            className={`h-full rounded-sm transition-all duration-500 relative ${
              paranoiaMeter > 70
                ? "bg-ghost shadow-ghost-strong"
                : paranoiaMeter > 40
                  ? "bg-warning shadow-warning"
                  : "bg-accent-soft shadow-accent-strong"
            }`}
            style={{ width: `${paranoiaMeter}%` }}
          />
        </div>
      </div>

      {/* Accuse / Call Vote Button */}
      <VotePanel isGhost={isGhost} />
    </div>
  );
}
