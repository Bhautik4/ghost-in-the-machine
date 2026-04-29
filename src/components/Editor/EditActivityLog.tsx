"use client";

import { useState, useEffect, useRef } from "react";
import { useEventListener } from "@liveblocks/react/suspense";
import { Activity, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

interface EditEntry {
  id: string;
  playerName: string;
  playerColor: string;
  fileName: string;
  charsChanged: number;
  isLargeEdit: boolean;
  timestamp: number;
}

const MAX_ENTRIES = 20;

export function EditActivityLog() {
  const [entries, setEntries] = useState<EditEntry[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEventListener(({ event }) => {
    if (event.type !== "edit-activity") return;
    const entry: EditEntry = {
      id: `edit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      playerName: event.playerName,
      playerColor: event.playerColor,
      fileName: event.fileName,
      charsChanged: event.charsChanged,
      isLargeEdit: event.isLargeEdit,
      timestamp: Date.now(),
    };
    setEntries((prev) => [...prev.slice(-(MAX_ENTRIES - 1)), entry]);
  });

  useEffect(() => {
    if (scrollRef.current && !collapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length, collapsed]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-raised transition-colors shrink-0"
      >
        <Activity size={14} className="text-accent-soft" />
        <span className="text-xs text-text-muted flex-1 text-left">
          Edit Log
        </span>
        {entries.some((e) => e.isLargeEdit) && (
          <AlertTriangle size={12} className="text-warning animate-pulse" />
        )}
        {collapsed ? (
          <ChevronDown size={14} className="text-text-faint" />
        ) : (
          <ChevronUp size={14} className="text-text-faint" />
        )}
      </button>

      {!collapsed && (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-3 pb-2 space-y-1"
        >
          {entries.length === 0 ? (
            <p className="text-xs text-text-faint py-3 text-center">
              No edits yet...
            </p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${
                  entry.isLargeEdit
                    ? "bg-warning/8 border border-warning/15"
                    : ""
                }`}
              >
                <span className="text-text-faint tabular-nums shrink-0 text-[11px]">
                  {formatTime(entry.timestamp)}
                </span>
                <div
                  className="w-2 h-2 rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: entry.playerColor }}
                />
                <div className="min-w-0">
                  <span
                    className="font-medium"
                    style={{ color: entry.playerColor }}
                  >
                    {entry.playerName}
                  </span>
                  <span className="text-text-subtle ml-1 font-mono text-[11px]">
                    {entry.fileName}
                  </span>
                  {entry.isLargeEdit && (
                    <span className="text-warning ml-1">
                      ⚠ {entry.charsChanged}ch
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
