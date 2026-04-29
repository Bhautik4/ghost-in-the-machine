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
      className="fixed inset-0 z-100 flex items-center justify-center backdrop-blur-md transition-opacity duration-700 bg-surface-deep/95"
      onClick={() => setVisible(false)}
    >
      <div className="text-center animate-fade-in max-w-md w-full px-4">
        {/* Icon circle */}
        <div
          className={`inline-flex items-center justify-center w-28 h-28 rounded-full mb-8 ${
            isGhost
              ? "bg-ghost/10 border border-ghost/40"
              : "bg-accent/10 border border-accent/40"
          }`}
        >
          {isGhost ? (
            <Ghost size={56} className="text-ghost" />
          ) : (
            <Shield size={56} className="text-accent-soft" />
          )}
        </div>

        {/* Role title */}
        <h2
          className={`text-3xl font-bold mb-6 ${
            isGhost ? "text-ghost-light" : "text-accent-light"
          }`}
        >
          {isGhost ? "You are the Ghost" : "You are an Engineer"}
        </h2>

        {/* Description */}
        <div className="bg-surface/50 border border-border-subtle p-5 rounded-lg">
          <p className="text-sm text-text-muted leading-relaxed">
            {isGhost
              ? "Sabotage the system. Use your abilities to raise paranoia and prevent the engineers from fixing the bugs."
              : "Fix the bugs in the codebase before time runs out. Watch out for the Ghost."}
          </p>
        </div>

        {/* Dismiss hint */}
        <p className="text-xs text-text-faint mt-8 animate-pulse-soft">
          Click anywhere to continue
        </p>
      </div>
    </div>
  );
}
