"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useOthers,
  useSelf,
  useUpdateMyPresence,
  useStorage,
  useMutation,
} from "@liveblocks/react/suspense";
import {
  Ghost,
  Users,
  Play,
  Crown,
  Check,
  Loader2,
  Copy,
  CheckCheck,
  UserX,
} from "lucide-react";
import { ensureProfile } from "@/lib/supabase";
import { getOrCreatePlayerId } from "@/lib/playerId";
import { MAX_PLAYERS } from "@/lib/roomCode";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

const PLAYER_COLORS = [
  "#6d28d9",
  "#2563eb",
  "#059669",
  "#d97706",
  "#dc2626",
  "#db2777",
  "#7c3aed",
  "#0891b2",
];

interface LobbyProps {
  roomCode: string;
}

export function Lobby({ roomCode }: LobbyProps) {
  const [playerName, setPlayerName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  const updateMyPresence = useUpdateMyPresence();
  const self = useSelf();
  const others = useOthers();
  const gameStatus = useStorage((root) => root.gameStatus);
  const hostPlayerId = useStorage((root) => root.hostPlayerId);

  // Auto-reset stale state
  const resetStaleState = useMutation(({ storage }) => {
    const status = storage.get("gameStatus");
    if (status !== "waiting") {
      storage.set("gameStatus", "waiting");
      storage.set("ghostId", null);
      storage.set("hostPlayerId", null);
      storage.set("editorContent", {});
      storage.set("fakedTasks", {});
      storage.set("activeVote", null);
    }
  }, []);

  useEffect(() => {
    if (gameStatus && gameStatus !== "waiting") {
      resetStaleState();
    }
  }, [gameStatus, resetStaleState]);

  // Claim host
  const claimHost = useMutation(({ storage }, pid: string) => {
    if (storage.get("hostPlayerId") === null) {
      storage.set("hostPlayerId", pid);
    }
  }, []);

  const isHost = self?.presence.playerId === hostPlayerId;

  // Player list
  const joinedOthers = others.filter((o) => o.presence.name !== "");
  const allJoinedPlayers = [
    ...(hasJoined && self
      ? [
          {
            connectionId: self.connectionId,
            name: self.presence.name,
            playerId: self.presence.playerId,
            isReady: self.presence.isReady,
            color: self.presence.color,
            isSelf: true,
          },
        ]
      : []),
    ...joinedOthers.map((o) => ({
      connectionId: o.connectionId,
      name: o.presence.name,
      playerId: o.presence.playerId,
      isReady: o.presence.isReady,
      color: o.presence.color,
      isSelf: false,
    })),
  ];

  const joinedCount = allJoinedPlayers.length;
  const isRoomFull = joinedOthers.length >= MAX_PLAYERS;

  const canStart =
    isHost && joinedCount >= 2 && allJoinedPlayers.every((p) => p.isReady);

  // Join
  const handleJoin = useCallback(async () => {
    const name = playerName.trim();
    if (!name || isRoomFull) return;

    setIsJoining(true);
    try {
      const playerId = getOrCreatePlayerId();
      const color = PLAYER_COLORS[joinedCount % PLAYER_COLORS.length];
      await ensureProfile(playerId, name);
      updateMyPresence({ name, playerId, color, isReady: false });
      claimHost(playerId);
      setHasJoined(true);
    } catch (err) {
      console.error("Join failed:", err);
    } finally {
      setIsJoining(false);
    }
  }, [playerName, joinedCount, updateMyPresence, claimHost, isRoomFull]);

  // Ready toggle
  const toggleReady = useCallback(() => {
    if (!self) return;
    updateMyPresence({ isReady: !self.presence.isReady });
  }, [self, updateMyPresence]);

  // Start game
  const handleStartGame = useMutation(
    ({ storage }) => {
      const players = allJoinedPlayers;
      if (players.length < 2) return;
      const ghostIndex = Math.floor(Math.random() * players.length);
      storage.set("ghostId", players[ghostIndex].playerId);
      storage.set("gameStatus", "active");
    },
    [allJoinedPlayers],
  );

  // Copy invite link
  const copyInviteLink = () => {
    const url = `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (gameStatus !== "waiting") return null;

  // Room full screen
  if (isRoomFull && !hasJoined) {
    return (
      <div className="h-screen w-screen bg-[#09090b] flex items-center justify-center font-mono">
        <div className="text-center">
          <UserX size={48} className="text-red-500/80 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
          <h2 className="text-2xl font-bold text-[#e4e4e7] mb-3 uppercase tracking-widest">Room Full</h2>
          <p className="text-sm text-[#71717a] mb-8 uppercase tracking-wider">
            This room already has {MAX_PLAYERS} players.
          </p>
          <a
            href="/"
          >
            <Button variant="secondary">Back to Home</Button>
          </a>
        </div>
      </div>
    );
  }

  // Pre-join
  if (!hasJoined) {
    return (
      <div className="h-screen w-screen bg-[#09090b] flex items-center justify-center font-mono">
        <div className="w-full max-w-md mx-4">
          <div className="text-center mb-10 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-16 h-16 border border-[#6d28d9] mb-6 shadow-[0_0_20px_rgba(109,40,217,0.3)]">
              <Ghost size={32} className="text-[#a78bfa]" />
            </div>
            <h1 className="text-3xl font-bold text-[#e4e4e7] tracking-[0.1em] uppercase shadow-black drop-shadow-md">
              Ghost in the Machine
            </h1>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] text-[#71717a] uppercase tracking-widest">Room</span>
              <span className="text-sm text-[#a78bfa] tracking-[0.3em] uppercase bg-[#6d28d9]/10 px-3 py-1 border border-[#6d28d9]/30">
                {roomCode}
              </span>
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="Enter your name..."
              disabled={isJoining}
              className="tracking-wider"
            />
            <Button
              variant="primary"
              onClick={handleJoin}
              disabled={!playerName.trim() || isJoining}
              className="gap-2 min-w-[100px]"
            >
              {isJoining ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Join"
              )}
            </Button>
          </div>

          {joinedOthers.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 border-[#27272a] bg-[#18181b]/50">
                <Users size={14} className="text-[#a78bfa]" />
                <span className="text-xs font-medium text-[#a1a1aa] uppercase tracking-widest">
                  In Room ({joinedOthers.length}/{MAX_PLAYERS})
                </span>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                {joinedOthers.map((o) => (
                  <div
                    key={o.connectionId}
                    className="flex items-center gap-3 px-4 py-3 border border-[#27272a]/50 bg-[#18181b]"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm shadow-[0_0_8px_currentColor]"
                      style={{ backgroundColor: o.presence.color, color: o.presence.color }}
                    />
                    <span className="text-sm text-[#d4d4d8] uppercase tracking-wider">
                      {o.presence.name}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Post-join lobby
  return (
    <div className="h-screen w-screen bg-[#09090b] flex items-center justify-center font-mono">
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-16 h-16 border border-[#6d28d9] mb-6 shadow-[0_0_20px_rgba(109,40,217,0.3)]">
            <Ghost size={32} className="text-[#a78bfa]" />
          </div>
          <h1 className="text-3xl font-bold text-[#e4e4e7] tracking-[0.1em] uppercase shadow-black drop-shadow-md">
            Ghost in the Machine
          </h1>
          {/* Room code + copy link */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#71717a] uppercase tracking-widest">Room</span>
              <span className="text-sm text-[#a78bfa] tracking-[0.3em] uppercase bg-[#6d28d9]/10 px-3 py-1 border border-[#6d28d9]/30">
                {roomCode}
              </span>
            </div>
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18181b] border border-[#27272a] text-[10px] text-[#a1a1aa] hover:text-[#e4e4e7] hover:border-[#3f3f46] transition-colors uppercase tracking-widest"
            >
              {copied ? (
                <CheckCheck size={12} className="text-green-500" />
              ) : (
                <Copy size={12} />
              )}
              {copied ? "Copied!" : "Invite Link"}
            </button>
          </div>
        </div>

        {/* Player list */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center gap-2 border-[#27272a] bg-[#18181b]/50">
            <Users size={14} className="text-[#a78bfa]" />
            <span className="text-xs font-medium text-[#a1a1aa] uppercase tracking-widest">
              Players ({joinedCount}/{MAX_PLAYERS})
            </span>
          </CardHeader>
          <CardContent className="space-y-2 pt-4 max-h-56 overflow-y-auto">
            {allJoinedPlayers.map((player) => (
              <div
                key={player.connectionId}
                className="flex items-center gap-3 px-4 py-3 border border-[#27272a]/50 bg-[#18181b]"
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm shadow-[0_0_8px_currentColor]"
                  style={{ backgroundColor: player.color, color: player.color }}
                />
                <span className="text-sm text-[#d4d4d8] flex-1 uppercase tracking-wider">
                  {player.name}
                  {player.isSelf && (
                    <span className="text-[10px] text-[#52525b] ml-2 tracking-widest">
                      (you)
                    </span>
                  )}
                </span>
                {player.playerId === hostPlayerId && (
                  <Crown size={12} className="text-[#eab308] shrink-0 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                )}
                {player.isReady ? (
                  <Check size={14} className="text-green-500 shrink-0 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                ) : (
                  <span className="text-[10px] text-[#52525b] shrink-0 tracking-widest uppercase">
                    waiting
                  </span>
                )}
              </div>
            ))}
            {joinedCount < 2 && (
              <p className="text-xs text-[#52525b] text-center py-4 uppercase tracking-widest border border-dashed border-[#27272a] mt-2">
                Need at least 2 players to start
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ready / Start */}
        <div className="flex gap-3">
          <Button
            variant={self?.presence.isReady ? "ghost" : "secondary"}
            onClick={toggleReady}
            className={`flex-1 gap-2 ${self?.presence.isReady ? "text-green-400 border-green-500/30 hover:bg-green-500/10 hover:text-green-300" : ""}`}
          >
            <Check size={16} className={self?.presence.isReady ? "text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]" : ""} />
            {self?.presence.isReady ? "Ready!" : "Ready Up"}
          </Button>
          {isHost && (
            <Button
              variant="primary"
              onClick={() => handleStartGame()}
              disabled={!canStart}
              className="flex-1 gap-2"
            >
              <Play size={16} />
              Start Game
            </Button>
          )}
        </div>

        <div
          className={`mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest ${isHost ? "text-[#eab308]" : "text-[#52525b]"}`}
        >
          <Crown size={10} className={isHost ? "drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" : ""} />
          <span>
            {isHost ? "You are the Host" : "Waiting for host to start..."}
          </span>
        </div>
      </div>
    </div>
  );
}
