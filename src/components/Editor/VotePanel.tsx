"use client";

import { useState, useEffect } from "react";
import {
  useOthers,
  useSelf,
  useStorage,
  useMutation,
} from "@liveblocks/react/suspense";
import { useGameStore } from "@/store/gameStore";
import { AlertTriangle, UserX, Check, X, Gavel } from "lucide-react";

interface VotePanelProps {
  isGhost: boolean;
}

/**
 * Voting / accusation system.
 * Any engineer can call a vote to accuse someone of being the Ghost.
 * - Correct accusation → engineers win early
 * - Wrong accusation → 30 seconds off the clock
 * - Vote expires after 15 seconds
 */
export function VotePanel({ isGhost }: VotePanelProps) {
  const { phase, timeRemaining } = useGameStore();
  const self = useSelf();
  const others = useOthers();
  const activeVote = useStorage((root) => root.activeVote);
  const ghostId = useStorage((root) => root.ghostId);
  const [showAccuseList, setShowAccuseList] = useState(false);
  const [voteCooldown, setVoteCooldown] = useState(false);

  const myId = self?.presence.playerId;

  // Start a vote
  const callVote = useMutation(
    ({ storage }, accusedId: string, accusedName: string) => {
      if (storage.get("activeVote") !== null) return;
      storage.set("activeVote", {
        callerId: myId!,
        accusedId,
        accusedName,
        votes: {},
        expiresAt: Date.now() + 15000,
      });
    },
    [myId],
  );

  // Cast a vote
  const castVote = useMutation(
    ({ storage }, verdict: "guilty" | "innocent") => {
      const vote = storage.get("activeVote");
      if (!vote || !myId) return;
      const votes = {
        ...((vote as Record<string, unknown>).votes as Record<string, string>),
        [myId]: verdict,
      };
      storage.set("activeVote", {
        ...(vote as Record<string, unknown>),
        votes,
      } as typeof vote);
    },
    [myId],
  );

  // Resolve vote
  const resolveVote = useMutation(
    ({ storage }, result: "guilty" | "innocent") => {
      const vote = storage.get("activeVote");
      if (!vote) return;
      storage.set("activeVote", null);

      if (result === "guilty") {
        const accusedId = (vote as Record<string, unknown>).accusedId as string;
        if (accusedId === storage.get("ghostId")) {
          storage.set("gameStatus", "engineers-win");
        }
      }
    },
    [],
  );

  // Auto-resolve expired votes
  useEffect(() => {
    if (!activeVote) return;
    const raw = activeVote as Record<string, unknown>;
    const expiresAt = raw.expiresAt as number;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      resolveVote("innocent");
      return;
    }
    const timer = setTimeout(() => resolveVote("innocent"), remaining);
    return () => clearTimeout(timer);
  }, [activeVote, resolveVote]);

  // Check vote results when all players have voted
  useEffect(() => {
    if (!activeVote) return;
    const raw = activeVote as Record<string, unknown>;
    const votes = raw.votes as Record<string, string>;
    const totalPlayers = others.length + 1;
    const voteCount = Object.keys(votes).length;
    if (voteCount < totalPlayers) return;

    const guiltyCount = Object.values(votes).filter(
      (v) => v === "guilty",
    ).length;
    if (guiltyCount > totalPlayers / 2) {
      const accusedId = raw.accusedId as string;
      if (accusedId === ghostId) {
        resolveVote("guilty");
      } else {
        // Wrong accusation — penalize time
        useGameStore.getState().tick(); // lose 30s
        for (let i = 0; i < 30; i++) useGameStore.getState().tick();
        resolveVote("innocent");
      }
    } else {
      resolveVote("innocent");
    }
  }, [activeVote, others.length, ghostId, resolveVote]);

  if (phase !== "playing") return null;

  const allPlayers = [
    ...(self
      ? [{ playerId: self.presence.playerId, name: self.presence.name }]
      : []),
    ...others
      .filter((o) => o.presence.name)
      .map((o) => ({
        playerId: o.presence.playerId,
        name: o.presence.name,
      })),
  ];

  // Active vote overlay
  if (activeVote) {
    const raw = activeVote as Record<string, unknown>;
    const accusedName = raw.accusedName as string;
    const votes = raw.votes as Record<string, string>;
    const hasVoted = myId ? myId in votes : false;

    return (
      <div className="fixed inset-0 z-[100] bg-[#09090b]/95 backdrop-blur-md flex items-center justify-center font-mono">
        <div className="bg-[#18181b] border border-[#eab308]/50 shadow-[0_0_30px_rgba(234,179,8,0.2)] rounded-sm p-6 max-w-sm w-full mx-4">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#eab308]/20">
            <Gavel size={20} className="text-[#eab308] drop-shadow-[0_0_5px_rgba(234,179,8,0.8)]" />
            <h3 className="text-sm font-black uppercase tracking-widest text-[#eab308]">Emergency Vote</h3>
          </div>

          <p className="text-xs text-[#a1a1aa] mb-4 uppercase tracking-wider leading-relaxed">
            Is <span className="text-[#ef4444] font-bold drop-shadow-[0_0_3px_rgba(239,68,68,0.8)]">{accusedName}</span>{" "}
            the Ghost?
          </p>

          <p className="text-[10px] text-[#71717a] mb-6 uppercase tracking-wider font-bold">
            Wrong accusation = <span className="text-[#ef4444]">-30s</span>. Votes: {Object.keys(votes).length}/
            {allPlayers.length}
          </p>

          {!hasVoted ? (
            <div className="flex gap-4">
              <button
                onClick={() => castVote("guilty")}
                className="flex-1 py-3 rounded-sm text-xs font-bold uppercase tracking-widest bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30 hover:bg-[#ef4444]/20 hover:border-[#ef4444]/60 shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center justify-center gap-2 transition-all"
              >
                <UserX size={16} /> Guilty
              </button>
              <button
                onClick={() => castVote("innocent")}
                className="flex-1 py-3 rounded-sm text-xs font-bold uppercase tracking-widest bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30 hover:bg-[#22c55e]/20 hover:border-[#22c55e]/60 shadow-[0_0_10px_rgba(34,197,94,0.1)] hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] flex items-center justify-center gap-2 transition-all"
              >
                <Check size={16} /> Innocent
              </button>
            </div>
          ) : (
            <p className="text-xs font-bold uppercase tracking-widest text-[#52525b] text-center animate-pulse">
              Waiting for others...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Accuse button (engineers only, or ghost pretending)
  return (
    <div className="font-mono relative w-full">
      {showAccuseList ? (
        <div className="absolute top-full right-0 mt-2 bg-[#18181b] border border-[#27272a]/50 rounded-sm p-2 shadow-2xl w-48 z-50">
          <div className="flex items-center justify-between mb-2 px-1 border-b border-[#27272a]/50 pb-2">
            <span className="text-[10px] font-bold text-[#71717a] uppercase tracking-widest">
              Accuse Player
            </span>
            <button
              onClick={() => setShowAccuseList(false)}
              className="text-[#52525b] hover:text-[#ef4444] transition-colors"
            >
              <X size={12} />
            </button>
          </div>
          {allPlayers
            .filter((p) => p.playerId !== myId)
            .map((p) => (
              <button
                key={p.playerId}
                onClick={() => {
                  callVote(p.playerId, p.name);
                  setShowAccuseList(false);
                  setVoteCooldown(true);
                  setTimeout(() => setVoteCooldown(false), 60000);
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-[#a1a1aa] hover:bg-[#27272a]/50 hover:text-[#e4e4e7] uppercase tracking-wider transition-colors"
              >
                {p.name}
              </button>
            ))}
        </div>
      ) : (
        <button
          onClick={() => setShowAccuseList(true)}
          disabled={voteCooldown}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-sm text-[11px] font-bold uppercase tracking-widest transition-all ${
            voteCooldown
              ? "bg-[#18181b]/50 text-[#52525b] cursor-not-allowed border border-[#27272a]/50"
              : "bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/30 hover:bg-[#eab308]/20 hover:border-[#eab308]/60 shadow-[0_0_10px_rgba(234,179,8,0.1)]"
          }`}
        >
          <AlertTriangle size={14} className={!voteCooldown ? "drop-shadow-[0_0_3px_currentColor]" : ""} />
          Call Vote
        </button>
      )}
    </div>
  );
}
