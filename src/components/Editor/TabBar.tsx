"use client";

import { X, FileText, Circle, CheckCircle2 } from "lucide-react";
import { useGameStore } from "@/store/gameStore";

export function TabBar() {
  const { activeTab, setActiveTab, tasks } = useGameStore();

  const tabs = ["Main.ts", "Game.tsx"];

  const getTabStatus = (fileName: string) => {
    const fileTasks = tasks.filter((t) => t.fileName === fileName);
    if (fileTasks.length === 0) return "clean";
    if (fileTasks.every((t) => t.isFixed)) return "fixed";
    return "error";
  };

  return (
    <div className="h-10 bg-surface-deep border-b border-border/50 flex items-end font-mono">
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        const status = getTabStatus(tab);

        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`group relative h-full px-5 flex items-center gap-2.5 text-[11px] font-medium tracking-wider transition-colors border-r border-border/50 ${
              isActive
                ? "bg-surface text-text-primary"
                : "bg-surface-deep text-text-subtle hover:bg-surface/50 hover:text-text-muted"
            }`}
          >
            {/* Active tab top accent */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent shadow-accent" />
            )}

            <FileText
              size={14}
              className={
                tab.endsWith(".tsx") 
                  ? "text-info-blue glow-file-tsx" 
                  : "text-player-cyan glow-info"
              }
            />
            <span>{tab}</span>

            {status === "error" && (
              <Circle size={6} className="fill-ghost text-ghost glow-ghost" />
            )}
            {status === "fixed" && (
              <CheckCircle2 size={12} className="text-success glow-success" />
            )}

            <X
              size={14}
              className="opacity-0 group-hover:opacity-100 text-text-faint hover:text-ghost transition-all ml-1"
            />
          </button>
        );
      })}

      {/* Empty space fills rest */}
      <div className="flex-1 bg-surface-deep" />
    </div>
  );
}
