"use client";

import { useState, useCallback } from "react";
import { useEventListener } from "@liveblocks/react/suspense";

interface PhantomCursor {
  id: string;
  line: number;
  col: number;
  color: string;
  name: string;
}

/**
 * Renders fake cursors broadcast by the Ghost.
 * Engineers can't tell these apart from real player cursors.
 */
export function PhantomCursors() {
  const [phantoms, setPhantoms] = useState<PhantomCursor[]>([]);

  useEventListener(
    useCallback(({ event }: { event: Record<string, unknown> }) => {
      if (event.type === "phantom-cursor") {
        const id = `phantom-${Date.now()}`;
        const phantom: PhantomCursor = {
          id,
          line: event.line as number,
          col: event.col as number,
          color: event.color as string,
          name: event.name as string,
        };
        setPhantoms((prev) => [...prev, phantom]);

        // Animate the phantom — move it around then remove
        const duration = (event.duration as number) || 6000;
        const moveInterval = setInterval(() => {
          setPhantoms((prev) =>
            prev.map((p) =>
              p.id === id
                ? {
                    ...p,
                    line: p.line + (Math.random() > 0.5 ? 1 : -1),
                    col: Math.max(1, p.col + Math.floor(Math.random() * 5 - 2)),
                  }
                : p,
            ),
          );
        }, 800);

        setTimeout(() => {
          clearInterval(moveInterval);
          setPhantoms((prev) => prev.filter((p) => p.id !== id));
        }, duration);
      }
    }, []),
  );

  return (
    <>
      {phantoms.map((p) => (
        <div
          key={p.id}
          className="absolute pointer-events-none z-30 transition-all duration-700 font-mono"
          style={{
            top: `${(p.line - 1) * 24 + 16}px`,
            left: `${p.col * 8.4 + 20}px`,
          }}
        >
          <div
            className="w-[2px] h-5 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <div
            className="absolute -top-5 left-0 px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
            style={{ backgroundColor: p.color, color: "#fff" }}
          >
            {p.name}
          </div>
        </div>
      ))}
    </>
  );
}
