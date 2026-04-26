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
        isGhost ? "bg-[#09090b]/95" : "bg-[#09090b]/95"
      }`}
      onClick={() => setVisible(false)}
    >
      <div className="text-center animate-in fade-in zoom-in duration-500 max-w-md w-full px-4">
        <div
          className={`inline-flex items-center justify-center w-32 h-32 rounded-full mb-8 relative ${
            isGhost
              ? "bg-[#ef4444]/10 border border-[#ef4444]/50 shadow-[0_0_40px_rgba(239,68,68,0.3)]"
              : "bg-[#6d28d9]/10 border border-[#6d28d9]/50 shadow-[0_0_40px_rgba(109,40,217,0.3)]"
          }`}
        >
          {isGhost ? (
            <Ghost size={64} className="text-[#ef4444] drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
          ) : (
            <Shield size={64} className="text-[#c084fc] drop-shadow-[0_0_10px_rgba(192,132,252,0.8)]" />
          )}
        </div>

        <h2
          className={`text-4xl font-black uppercase tracking-[0.2em] mb-6 ${
            isGhost 
              ? "text-[#ef4444] drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
              : "text-[#c084fc] drop-shadow-[0_0_10px_rgba(192,132,252,0.5)]"
          }`}
        >
          {isGhost ? "You are the Ghost" : "You are an Engineer"}
        </h2>

        <div className="bg-[#18181b]/50 border border-[#27272a]/50 p-4 rounded-sm shadow-xl">
          <p className="text-[13px] text-[#a1a1aa] leading-relaxed uppercase tracking-wider">
            {isGhost
              ? "Sabotage the system. Use your abilities to raise paranoia and prevent the engineers from fixing the bugs."
              : "Fix the 5 bugs in the codebase before time runs out. Watch out for the Ghost."}
          </p>
        </div>

        <p className="text-[10px] font-bold text-[#52525b] mt-8 uppercase tracking-[0.3em] animate-pulse">
          Click anywhere to initialize
        </p>
      </div>
    </div>
  );
}
