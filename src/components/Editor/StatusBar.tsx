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
    <div className="h-8 bg-[#09090b] border-t border-[#6d28d9]/50 flex items-center px-4 text-[10px] text-[#a1a1aa] shrink-0 font-mono uppercase tracking-widest shadow-[0_-5px_15px_rgba(109,40,217,0.05)] z-20 relative">
      <div className="flex items-center gap-6">
        {/* Git branch */}
        <div className="flex items-center gap-1.5 hover:text-[#a78bfa] transition-colors cursor-default">
          <GitBranch size={12} className="text-[#6d28d9]" />
          <span>main</span>
        </div>

        {/* Errors */}
        {errorCount > 0 && (
          <div className="flex items-center gap-1.5 text-red-400 drop-shadow-[0_0_3px_rgba(248,113,113,0.5)]">
            <AlertTriangle size={12} />
            <span>{errorCount} ERRORS</span>
          </div>
        )}

        {/* Fixed tasks */}
        <div className="flex items-center gap-1.5 text-[#86efac]">
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
                  ? "text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)] font-bold animate-pulse"
                  : paranoiaMeter > 40
                    ? "text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]"
                    : "text-[#d4d4d8]"
              }`}
            >
              PARANOIA: {paranoiaMeter.toFixed(0)}%
            </span>
          </div>
        )}

        {/* Players online */}
        <div className="flex items-center gap-1.5 hover:text-[#e4e4e7] transition-colors">
          <Wifi size={12} className="text-[#6d28d9]" />
          <span>{onlineCount} ONLINE</span>
        </div>

        {/* File info */}
        <span className="text-[#71717a]">
          {activeTab.endsWith(".tsx") ? "TSX" : "TS"}
        </span>
        <span className="text-[#71717a]">UTF-8</span>

        <Bell size={12} className="text-[#71717a] hover:text-[#a78bfa] transition-colors cursor-pointer" />
      </div>
    </div>
  );
}
