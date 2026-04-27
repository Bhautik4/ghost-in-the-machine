"use client";

import { useGameStore } from "@/store/gameStore";
import { useOthers } from "@liveblocks/react/suspense";
import {
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  Bell,
} from "lucide-react";

export function StatusBar() {
  const { phase, tasks, activeTab, paranoiaMeter } = useGameStore();
  const others = useOthers();

  // +1 for self
  const onlineCount = others.length + 1;
  const fixedCount = tasks.filter((t) => t.isFixed).length;
  const totalCount = tasks.length;
  const errorCount = tasks.filter(
    (t) => !t.isFixed && t.fileName === activeTab,
  ).length;

  return (
    <div className="h-8 bg-surface-deep border-t border-accent/50 flex items-center px-4 text-[10px] text-text-muted shrink-0 font-mono uppercase tracking-widest shadow-accent z-20 relative">
      <div className="flex items-center gap-6">
        {/* Git branch */}
        <div className="flex items-center gap-1.5 hover:text-accent-soft transition-colors cursor-default">
          <GitBranch size={12} className="text-accent" />
          <span>main</span>
        </div>

        {/* Errors */}
        {errorCount > 0 && (
          <div className="flex items-center gap-1.5 text-red-400">
            <AlertTriangle size={12} />
            <span>{errorCount} ERRORS</span>
          </div>
        )}

        {/* Fixed tasks */}
        <div className="flex items-center gap-1.5 text-success-light">
          <CheckCircle2 size={12} />
          <span>
            {fixedCount}/{totalCount} FIXED
          </span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-6">
        {/* Paranoia indicator */}
        {phase === "playing" && (
          <div className="flex items-center gap-1.5">
            <span
              className={`transition-colors ${
                paranoiaMeter > 70
                  ? "text-red-500 font-bold animate-pulse"
                  : paranoiaMeter > 40
                    ? "text-yellow-400"
                    : "text-text-secondary"
              }`}
            >
              PARANOIA: {paranoiaMeter.toFixed(0)}%
            </span>
          </div>
        )}

        {/* Players online */}
        <div className="flex items-center gap-1.5 hover:text-text-primary transition-colors">
          <Wifi size={12} className="text-accent" />
          <span>{onlineCount} ONLINE</span>
        </div>

        {/* File info */}
        <span className="text-text-subtle">
          {activeTab.endsWith(".tsx") ? "TSX" : "TS"}
        </span>
        <span className="text-text-subtle">UTF-8</span>

        <Bell
          size={12}
          className="text-text-subtle hover:text-accent-soft transition-colors cursor-pointer"
        />
      </div>
    </div>
  );
}
