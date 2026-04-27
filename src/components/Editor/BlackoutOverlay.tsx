"use client";

import { useState } from "react";
import { useEventListener } from "@liveblocks/react/suspense";

interface BlackoutOverlayProps {
  isGhost: boolean;
}

/**
 * Renders a full-screen blackout when the Ghost triggers one.
 * The Ghost can still see (reduced opacity) — engineers see total darkness.
 */
export function BlackoutOverlay({ isGhost }: BlackoutOverlayProps) {
  const [active, setActive] = useState(false);

  useEventListener(({ event }) => {
    if (event.type === "blackout") {
      setActive(true);
      setTimeout(() => setActive(false), event.duration);
    }
  });

  if (!active) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] pointer-events-none transition-opacity duration-500 ${
        isGhost ? "bg-surface-deep/60" : "bg-black/95 backdrop-blur-md"
      }`}
    >
      {!isGhost && (
        <div className="h-full flex items-center justify-center font-mono">
          <p className="text-sm text-red-500/60 animate-pulse uppercase tracking-[0.3em] glow-ghost-strong">
            [SYSTEM FAILURE] Power grid offline...
          </p>
        </div>
      )}
    </div>
  );
}
