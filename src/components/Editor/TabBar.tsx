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
    <div className="h-10 bg-[#09090b] border-b border-[#27272a]/50 flex items-end font-mono">
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        const status = getTabStatus(tab);

        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`group relative h-full px-5 flex items-center gap-2.5 text-[11px] font-medium tracking-wider transition-colors border-r border-[#27272a]/50 ${
              isActive
                ? "bg-[#18181b] text-[#e4e4e7]"
                : "bg-[#09090b] text-[#71717a] hover:bg-[#18181b]/50 hover:text-[#a1a1aa]"
            }`}
          >
            {/* Active tab top accent */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#6d28d9] shadow-[0_0_5px_rgba(109,40,217,0.5)]" />
            )}

            <FileText
              size={14}
              className={
                tab.endsWith(".tsx") 
                  ? "text-[#3b82f6] drop-shadow-[0_0_3px_rgba(59,130,246,0.5)]" 
                  : "text-[#0891b2] drop-shadow-[0_0_3px_rgba(8,145,178,0.5)]"
              }
            />
            <span>{tab}</span>

            {status === "error" && (
              <Circle size={6} className="fill-[#ef4444] text-[#ef4444] drop-shadow-[0_0_3px_rgba(239,68,68,0.5)]" />
            )}
            {status === "fixed" && (
              <CheckCircle2 size={12} className="text-[#22c55e] drop-shadow-[0_0_3px_rgba(34,197,94,0.5)]" />
            )}

            <X
              size={14}
              className="opacity-0 group-hover:opacity-100 text-[#52525b] hover:text-[#ef4444] transition-all ml-1"
            />
          </button>
        );
      })}

      {/* Empty space fills rest */}
      <div className="flex-1 bg-[#09090b]" />
    </div>
  );
}
