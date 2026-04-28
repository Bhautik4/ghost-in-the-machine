"use client";

import { useState, useEffect, useCallback } from "react";
import { useEventListener } from "@liveblocks/react/suspense";
import { playCachedSfx } from "@/lib/sfxCache";
import { playGlitch } from "@/lib/sounds";

interface GlitchOverlayProps {
  isGhost: boolean;
}

/**
 * Full-screen glitch effect triggered by the Ghost's "Screen Glitch" ability.
 * Engineers see heavy RGB splits, scanlines, and screen tearing.
 * The Ghost sees a faint preview so they know it fired.
 */
export function GlitchOverlay({ isGhost }: GlitchOverlayProps) {
  const [active, setActive] = useState(false);
  const [slices, setSlices] = useState<
    { top: number; height: number; offset: number }[]
  >([]);

  // Randomize horizontal tear slices while active
  useEffect(() => {
    if (!active || isGhost) return;

    const interval = setInterval(() => {
      const count = 4 + Math.floor(Math.random() * 5);
      const newSlices = Array.from({ length: count }, () => ({
        top: Math.random() * 100,
        height: 0.5 + Math.random() * 3,
        offset: (Math.random() - 0.5) * 40,
      }));
      setSlices(newSlices);
    }, 80);

    return () => clearInterval(interval);
  }, [active, isGhost]);

  useEventListener(
    useCallback(({ event }: { event: Record<string, unknown> }) => {
      if (event.type === "screen-glitch") {
        setActive(true);
        const duration = (event.duration as number) || 3000;
        // Play glitch audio (ElevenLabs cache → Web Audio fallback)
        if (!playCachedSfx("screen-glitch", 0.5)) {
          playGlitch();
        }
        setTimeout(() => setActive(false), duration);
      }
    }, []),
  );

  if (!active) return null;

  // Ghost sees a subtle indicator only
  if (isGhost) {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div className="absolute top-4 right-4 px-3 py-1.5 bg-ghost/20 border border-ghost/40 rounded-sm">
          <span className="text-[10px] font-bold text-ghost uppercase tracking-widest animate-pulse">
            Glitch Active
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* RGB split — red channel offset */}
      <div
        className="absolute inset-0 mix-blend-screen opacity-60"
        style={{
          background: "transparent",
          boxShadow:
            "inset 4px 0 0 rgba(255, 0, 0, 0.4), inset -4px 0 0 rgba(0, 255, 255, 0.4)",
        }}
      />

      {/* Horizontal tear slices */}
      {slices.map((slice, i) => (
        <div
          key={i}
          className="absolute w-full"
          style={{
            top: `${slice.top}%`,
            height: `${slice.height}%`,
            transform: `translateX(${slice.offset}px)`,
            background: "var(--color-surface-deep)",
            opacity: 0.7,
          }}
        />
      ))}

      {/* Rapid scanline sweep */}
      <div
        className="absolute w-full h-1"
        style={{
          background: "rgba(239, 68, 68, 0.3)",
          animation: "scanline 0.4s linear infinite",
        }}
      />

      {/* Noise / static grain */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
          animation: "glitch 0.15s steps(2) infinite",
        }}
      />

      {/* Flicker overlay */}
      <div
        className="absolute inset-0 bg-black"
        style={{ animation: "flicker 0.1s ease-in-out 6" }}
      />

      {/* Distorted warning text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <p
          className="text-ghost/40 text-sm font-black uppercase tracking-[0.4em] glitch-active"
          style={{ textShadow: "2px 0 #ff0000, -2px 0 #00ffff" }}
        >
          [SIGNAL CORRUPTED]
        </p>
      </div>
    </div>
  );
}
