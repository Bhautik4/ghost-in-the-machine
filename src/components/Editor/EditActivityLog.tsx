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
const LARGE_EDIT_THRESHOLD = 50;

/**
 * Edit Activity Log — shows who edited what and when.
 * Large edits (>50 chars changed at once) are flagged with a warning.
 * Helps engineers identify suspicious editing patterns.
 */
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

  // Auto-scroll to bottom on new entries
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
    <div className="font-mono w-52">
      <div className="bg-surface-raised/95 backdrop-blur-xl border border-border/50 rounded-sm shadow-lg">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 px-3 py-2 border-b border-border/30 w-full hover:bg-surface-overlay/30 transition-colors"
        >
          <Activity size={12} className="text-accent-soft" />
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] flex-1 text-left">
            Edit Log
          </span>
          {entries.some((e) => e.isLargeEdit) && (
            <AlertTriangle size={10} className="text-warning animate-pulse" />
          )}
          {collapsed ? (
            <ChevronDown size={12} className="text-text-faint" />
          ) : (
            <ChevronUp size={12} className="text-text-faint" />
          )}
        </button>

        {!collapsed && (
          <div
            ref={scrollRef}
            className="max-h-40 overflow-y-auto p-1.5 space-y-0.5"
          >
            {entries.length === 0 ? (
              <p className="text-[9px] text-text-faint px-2 py-2 text-center uppercase tracking-widest">
                No edits yet...
              </p>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-start gap-1.5 px-2 py-1 rounded-sm text-[9px] ${
                    entry.isLargeEdit
                      ? "bg-warning/10 border border-warning/20"
                      : ""
                  }`}
                >
                  <span className="text-text-faint tabular-nums shrink-0 mt-px">
                    {formatTime(entry.timestamp)}
                  </span>
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
                    style={{ backgroundColor: entry.playerColor }}
                  />
                  <div className="min-w-0">
                    <span
                      className="font-bold tracking-wider"
                      style={{ color: entry.playerColor }}
                    >
                      {entry.playerName}
                    </span>
                    <span className="text-text-faint ml-1">
                      {entry.fileName}
                    </span>
                    {entry.isLargeEdit && (
                      <span className="text-warning font-bold ml-1">
                        ⚠ {entry.charsChanged} chars
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
