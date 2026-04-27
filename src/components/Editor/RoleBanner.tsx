"use client";

import { useState, useEffect } from "react";
import { Ghost, Shield } from "lucide-react";

interface RoleBannerProps {
  isGhost: boolean;
}

/**
 * Full-screen role reveal that auto-dismisses after a few seconds.
 * Ghost sees a red "sabotage" message; engineers see a purple "fix bugs" message.
 */
export function RoleBanner({ isGhost }: RoleBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md transition-opacity duration-700 font-mono ${
        isGhost ? "bg-surface-deep/95" : "bg-surface-deep/95"
      }`}
      onClick={() => setVisible(false)}
    >
      <div className="text-center animate-in fade-in zoom-in duration-500 max-w-md w-full px-4">
        <div
          className={`inline-flex items-center justify-center w-32 h-32 rounded-full mb-8 relative ${
            isGhost
              ? "bg-ghost/10 border border-ghost/50 shadow-ghost-strong"
              : "bg-accent/10 border border-accent/50 shadow-accent-strong"
          }`}
        >
          {isGhost ? (
            <Ghost size={64} className="text-ghost" />
          ) : (
            <Shield size={64} className="text-accent-glow" />
          )}
        </div>

        <h2
          className={`text-4xl font-black uppercase tracking-[0.2em] mb-6 ${
            isGhost ? "text-ghost" : "text-accent-glow"
          }`}
        >
          {isGhost ? "You are the Ghost" : "You are an Engineer"}
        </h2>

        <div className="bg-surface/50 border border-border/50 p-4 rounded-sm shadow-xl">
          <p className="text-[13px] text-text-muted leading-relaxed uppercase tracking-wider">
            {isGhost
              ? "Sabotage the system. Use your abilities to raise paranoia and prevent the engineers from fixing the bugs."
              : "Fix the 5 bugs in the codebase before time runs out. Watch out for the Ghost."}
          </p>
        </div>

        <p className="text-[10px] font-bold text-text-faint mt-8 uppercase tracking-[0.3em] animate-pulse">
          Click anywhere to initialize
        </p>
      </div>
    </div>
  );
}
