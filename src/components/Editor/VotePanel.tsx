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
      <div className="fixed inset-0 z-[100] bg-surface-deep/95 backdrop-blur-md flex items-center justify-center">
        <div className="bg-surface border border-warning/50 shadow-warning rounded-sm p-6 max-w-sm w-full mx-4">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-warning/20">
            <Gavel size={20} className="text-warning" />
            <h3 className="text-sm font-black uppercase tracking-widest text-warning">
              Emergency Vote
            </h3>
          </div>

          <p className="text-xs text-text-muted mb-4 uppercase tracking-wider leading-relaxed">
            Is <span className="text-ghost font-bold">{accusedName}</span> the
            Ghost?
          </p>

          <p className="text-[10px] text-text-subtle mb-6 uppercase tracking-wider font-bold">
            Wrong accusation = <span className="text-ghost">-30s</span>. Votes:{" "}
            {Object.keys(votes).length}/{allPlayers.length}
          </p>

          {!hasVoted ? (
            <div className="flex gap-4">
              <button
                onClick={() => castVote("guilty")}
                className="flex-1 py-3 rounded-sm text-xs font-bold uppercase tracking-widest bg-ghost/10 text-ghost border border-ghost/30 hover:bg-ghost/20 hover:border-ghost/60 hover:shadow-ghost-strong flex items-center justify-center gap-2 transition-all"
              >
                <UserX size={16} /> Guilty
              </button>
              <button
                onClick={() => castVote("innocent")}
                className="flex-1 py-3 rounded-sm text-xs font-bold uppercase tracking-widest bg-success/10 text-success border border-success/30 hover:bg-success/20 hover:border-success/60 hover:shadow-success flex items-center justify-center gap-2 transition-all"
              >
                <Check size={16} /> Innocent
              </button>
            </div>
          ) : (
            <p className="text-xs font-bold uppercase tracking-widest text-text-faint text-center animate-pulse">
              Waiting for others...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Accuse button (engineers only, or ghost pretending)
  return (
    <div className="relative w-full">
      {showAccuseList ? (
        <div className="absolute top-full right-0 mt-2 bg-surface-raised border border-border rounded-lg p-2 w-full z-50">
          <div className="flex items-center justify-between mb-2 px-1 border-b border-border pb-2">
            <span className="text-xs text-text-muted">Accuse Player</span>
            <button
              onClick={() => setShowAccuseList(false)}
              className="text-text-faint hover:text-ghost transition-colors"
            >
              <X size={14} />
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
                className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary rounded transition-colors"
              >
                {p.name}
              </button>
            ))}
        </div>
      ) : (
        <button
          onClick={() => setShowAccuseList(true)}
          disabled={voteCooldown}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            voteCooldown
              ? "bg-surface-raised text-text-faint cursor-not-allowed border border-border"
              : "bg-warning/10 text-warning border border-warning/25 hover:bg-warning/15"
          }`}
        >
          <AlertTriangle size={14} />
          Call Vote
        </button>
      )}
    </div>
  );
}
