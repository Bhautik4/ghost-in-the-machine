"use client";

import { useOthers } from "@liveblocks/react/suspense";
import { useGameStore } from "@/store/gameStore";

export function PlayerCursors() {
  const { phase } = useGameStore();
  const others = useOthers();

  if (phase !== "playing") return null;

  const withCursors = others.filter((o) => o.presence.cursor !== null);

  return (
    <>
      {withCursors.map((other) => (
        <div
          key={other.connectionId}
          className="absolute pointer-events-none z-30 transition-all duration-150 font-mono"
          style={{
            top: `${(other.presence.cursor!.line - 1) * 24 + 16}px`,
            left: `${other.presence.cursor!.col * 8.4 + 20}px`,
          }}
        >
          {/* Cursor line */}
          <div
            className="w-[2px] h-5 rounded-full"
            style={{
              backgroundColor: other.presence.color,
            }}
          />
          {/* Name tag */}
          <div
            className="absolute -top-6 left-0 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
            style={{
              backgroundColor: other.presence.color,
              color: "#111111",
            }}
          >
            {other.presence.name}
          </div>
        </div>
      ))}
    </>
  );
}
