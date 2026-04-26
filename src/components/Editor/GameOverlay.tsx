"use client";

import { useGameStore } from "@/store/gameStore";
import {
  useMutation,
  useOthers,
  useSelf,
  useStorage,
} from "@liveblocks/react/suspense";
import { Trophy, RotateCcw, Skull, Home } from "lucide-react";

interface GameOverlayProps {
  roomCode: string;
}

export function GameOverlay({ roomCode }: GameOverlayProps) {
  const { phase, resetGame } = useGameStore();
  const self = useSelf();
  const others = useOthers();
  const ghostId = useStorage((root) => root.ghostId);

  const resetLiveblocks = useMutation(({ storage }) => {
    storage.set("gameStatus", "waiting");
    storage.set("ghostId", null);
    storage.set("hostPlayerId", null);
    storage.set("editorContent", {});
    storage.set("fakedTasks", {});
    storage.set("activeVote", null);
  }, []);

  if (phase !== "ghost-wins" && phase !== "engineers-win") return null;

  const isGhostWin = phase === "ghost-wins";
  const ghostOther = others.find((o) => o.presence.playerId === ghostId);
  const ghostName =
    self?.presence.playerId === ghostId
      ? self.presence.name
      : ghostOther?.presence.name;

  const handlePlayAgain = () => {
    resetLiveblocks();
    resetGame();
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#09090b]/95 backdrop-blur-md flex items-center justify-center font-mono">
      <div className="text-center p-8 max-w-md w-full border border-[#27272a]/50 bg-[#18181b]/50 rounded-sm shadow-2xl relative overflow-hidden">
        {/* Decorative scanline overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none" />

        <div
          className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 relative z-10 ${
            isGhostWin
              ? "bg-[#ef4444]/10 border border-[#ef4444]/50 shadow-[0_0_30px_rgba(239,68,68,0.4)]"
              : "bg-[#22c55e]/10 border border-[#22c55e]/50 shadow-[0_0_30px_rgba(34,197,94,0.4)]"
          }`}
        >
          {isGhostWin ? (
            <Skull size={48} className="text-[#ef4444] drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          ) : (
            <Trophy size={48} className="text-[#22c55e] drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
          )}
        </div>

        <h2
          className={`text-4xl font-black uppercase tracking-[0.2em] mb-4 relative z-10 ${
            isGhostWin 
              ? "text-[#ef4444] drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]" 
              : "text-[#22c55e] drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]"
          }`}
        >
          {isGhostWin ? "System Failure" : "System Restored"}
        </h2>

        <p className="text-[13px] text-[#a1a1aa] mb-4 leading-relaxed uppercase tracking-wider relative z-10">
          {isGhostWin
            ? "The codebase has been consumed by darkness. The ghost reigns supreme."
            : "All bugs have been fixed. The ghost has been exorcised from the machine."}
        </p>

        {ghostName && (
          <p className="text-xs text-[#71717a] mb-8 font-bold uppercase tracking-widest relative z-10">
            The Ghost was: <span className="text-[#ef4444] drop-shadow-[0_0_5px_rgba(239,68,68,0.8)] ml-1">{ghostName}</span>
          </p>
        )}

        <div className="flex gap-4 justify-center relative z-10">
          <button
            onClick={handlePlayAgain}
            className="flex-1 px-6 py-3 bg-[#6d28d9]/20 text-[#a78bfa] border border-[#6d28d9]/50 hover:bg-[#6d28d9]/40 hover:text-white rounded-sm text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(109,40,217,0.2)] hover:shadow-[0_0_20px_rgba(109,40,217,0.4)] flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            Play Again
          </button>
          <a
            href="/"
            className="flex-1 px-6 py-3 bg-[#18181b] text-[#a1a1aa] border border-[#27272a] hover:bg-[#27272a] hover:text-white rounded-sm text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Disconnect
          </a>
        </div>
      </div>
    </div>
  );
}
