"use client";

import { useGameStore } from "@/store/gameStore";
import { useMutation } from "@liveblocks/react/suspense";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { VotePanel } from "@/components/Editor/VotePanel";

interface GameHUDProps {
  isGhost: boolean;
}

export function GameHUD({ isGhost }: GameHUDProps) {
  const { phase, paranoiaMeter, tick } = useGameStore();

  // Sync ghost-wins to Liveblocks when timer or paranoia triggers it
  const setGhostWins = useMutation(({ storage }) => {
    const status = storage.get("gameStatus");
    if (status === "active") {
      storage.set("gameStatus", "ghost-wins");
    }
  }, []);

  // Game timer — tick every second
  useEffect(() => {
    if (phase !== "playing") return;
    const interval = setInterval(() => {
      tick();
      const state = useGameStore.getState();
      if (state.phase === "ghost-wins") {
        setGhostWins();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, tick, setGhostWins]);

  if (phase !== "playing") return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Paranoia meter */}
      <div
        className={`bg-surface-raised border rounded-lg px-4 py-3 transition-colors ${
          paranoiaMeter > 70
            ? "border-ghost/40 paranoia-border"
            : "border-border"
        }`}
      >
        <div className="flex items-center gap-1.5 text-xs text-text-muted mb-2">
          <AlertTriangle
            size={14}
            className={paranoiaMeter > 70 ? "text-ghost animate-pulse" : ""}
          />
          Paranoia
          <span className="ml-auto text-text-subtle">
            {Math.round(paranoiaMeter)}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              paranoiaMeter > 70
                ? "bg-ghost"
                : paranoiaMeter > 40
                  ? "bg-warning"
                  : "bg-accent-soft"
            }`}
            style={{ width: `${paranoiaMeter}%` }}
          />
        </div>
      </div>

      {/* Vote button */}
      <VotePanel isGhost={isGhost} />
    </div>
  );
}
