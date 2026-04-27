"use client";

import { useGameStore } from "@/store/gameStore";
import { useEffect, useState } from "react";

/**
 * Progressive UI distortion based on paranoia level.
 * - 30%+: Subtle color shifts on syntax highlighting
 * - 50%+: Line numbers occasionally show wrong values
 * - 70%+: Cursor starts lagging, random micro-glitches
 * - 90%+: Screen tearing effect, text briefly scrambles
 */
export function ParanoiaEffects() {
  const { paranoiaMeter, phase } = useGameStore();
  const [glitchActive, setGlitchActive] = useState(false);
  const [tearActive, setTearActive] = useState(false);

  // Random micro-glitches at high paranoia
  useEffect(() => {
    if (phase !== "playing" || paranoiaMeter < 50) return;

    const interval = setInterval(
      () => {
        if (Math.random() < paranoiaMeter / 200) {
          setGlitchActive(true);
          setTimeout(() => setGlitchActive(false), 150 + Math.random() * 200);
        }
      },
      2000 + Math.random() * 3000,
    );

    return () => clearInterval(interval);
  }, [phase, paranoiaMeter]);

  // Screen tearing at very high paranoia
  useEffect(() => {
    if (phase !== "playing" || paranoiaMeter < 80) return;

    const interval = setInterval(
      () => {
        if (Math.random() < 0.3) {
          setTearActive(true);
          setTimeout(() => setTearActive(false), 100);
        }
      },
      4000 + Math.random() * 4000,
    );

    return () => clearInterval(interval);
  }, [phase, paranoiaMeter]);

  if (phase !== "playing") return null;

  return (
    <>
      {/* Color shift overlay at 30%+ */}
      {paranoiaMeter >= 30 && (
        <div
          className="fixed inset-0 pointer-events-none z-20 mix-blend-overlay transition-opacity duration-1000"
          style={{
            opacity: Math.min(0.2, (paranoiaMeter - 30) / 200),
            background: `linear-gradient(${Date.now() % 360}deg, color-mix(in srgb, var(--color-ghost) 20%, transparent), transparent, color-mix(in srgb, var(--color-accent) 20%, transparent))`,
          }}
        />
      )}

      {/* Micro-glitch */}
      {glitchActive && (
        <div className="fixed inset-0 pointer-events-none z-30">
          <div
            className="absolute w-full h-1 shadow-ghost-strong"
            style={{
              top: `${Math.random() * 100}%`,
              background:
                "color-mix(in srgb, var(--color-ghost) 60%, transparent)",
              transform: `translateX(${Math.random() * 10 - 5}px)`,
            }}
          />
        </div>
      )}

      {/* Screen tear */}
      {tearActive && (
        <div className="fixed inset-0 pointer-events-none z-30">
          <div
            className="absolute w-full"
            style={{
              top: `${30 + Math.random() * 40}%`,
              height: `${2 + Math.random() * 5}%`,
              background: "var(--color-surface-deep)",
              transform: `translateX(${Math.random() * 30 - 15}px)`,
            }}
          />
        </div>
      )}

      {/* Cursor lag effect at 70%+ — adds a CSS filter */}
      {paranoiaMeter >= 70 && (
        <style>{`
          textarea {
            transition: caret-color 0.5s;
            caret-color: ${Math.random() > 0.5 ? "var(--color-ghost)" : "var(--color-accent-soft)"} !important;
          }
        `}</style>
      )}
    </>
  );
}
