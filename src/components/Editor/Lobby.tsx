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
  "#7a68c8",
  "#6a9fe0",
  "#4ec980",
  "#d4a840",
  "#d4504c",
  "#c45a8a",
  "#8a78d0",
  "#4db8c8",
];

interface LobbyProps {
  roomCode: string;
}

export function Lobby({ roomCode }: LobbyProps) {
  const [playerName, setPlayerName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

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
      storage.set("generatedScenario", null);
      storage.set("fileVerification", {});
      storage.set("systemStatus", "degraded");
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

  // Store generated scenario in Liveblocks
  const storeGeneratedScenario = useMutation(
    (
      { storage },
      scenario: {
        description: string;
        files: {
          id: string;
          fileName: string;
          label: string;
          description: string;
          buggyCode: string;
          fixedCode: string;
          stage: 1 | 2 | 3;
          testCases: {
            description: string;
            assertion: string;
            crossFile?: boolean;
          }[];
        }[];
        dependencyGraph: Record<string, string[]>;
      },
    ) => {
      storage.set("generatedScenario", scenario);
    },
    [],
  );

  // Start game
  const startGameInStorage = useMutation(
    ({ storage }) => {
      const players = allJoinedPlayers;
      if (players.length < 2) return;
      const ghostIndex = Math.floor(Math.random() * players.length);
      storage.set("ghostId", players[ghostIndex].playerId);
      storage.set("gameStatus", "active");
    },
    [allJoinedPlayers],
  );

  const handleStartGame = async () => {
    if (!canStart || isGenerating) return;
    setIsGenerating(true);

    try {
      const res = await fetch("/api/generate-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.scenario) {
          storeGeneratedScenario(data.scenario);
        }
      }
    } catch (err) {
      console.warn(
        "[Lobby] Scenario generation failed, using static scenario:",
        err,
      );
    }

    startGameInStorage();
    setIsGenerating(false);
  };

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
      <div className="h-screen w-screen bg-surface-deep flex items-center justify-center">
        <div className="text-center max-w-sm mx-4">
          <UserX size={40} className="text-ghost mx-auto mb-5" />
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Room Full
          </h2>
          <p className="text-sm text-text-muted mb-8">
            This room already has {MAX_PLAYERS} players.
          </p>
          <a href="/">
            <Button variant="secondary">Back to Home</Button>
          </a>
        </div>
      </div>
    );
  }

  // Pre-join screen
  if (!hasJoined) {
    return (
      <div className="h-screen w-screen bg-surface-deep flex items-center justify-center">
        <div className="w-full max-w-md mx-4">
          {/* Header */}
          <div className="text-center mb-10 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg border border-accent/40 bg-accent/5 mb-6">
              <Ghost size={30} className="text-accent-soft" />
            </div>
            <h1 className="text-3xl font-bold text-text-primary tracking-wide">
              Ghost in the Machine
            </h1>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-text-subtle">Room</span>
              <span className="text-sm text-accent-light tracking-[0.3em] uppercase bg-accent/8 px-3 py-1 rounded-lg border border-accent/20">
                {roomCode}
              </span>
            </div>
          </div>

          {/* Name input + join */}
          <div className="flex gap-3 mb-6">
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="Enter your name..."
              disabled={isJoining}
            />
            <Button
              variant="primary"
              onClick={handleJoin}
              disabled={!playerName.trim() || isJoining}
              className="gap-2 min-w-[100px]"
            >
              {isJoining ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                "Join"
              )}
            </Button>
          </div>

          {/* Others already in room */}
          {joinedOthers.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Users size={16} className="text-accent-soft" />
                <span className="text-sm text-text-muted">
                  In Room ({joinedOthers.length}/{MAX_PLAYERS})
                </span>
              </CardHeader>
              <CardContent className="space-y-2">
                {joinedOthers.map((o) => (
                  <div
                    key={o.connectionId}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border-subtle bg-surface"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: o.presence.color }}
                    />
                    <span className="text-sm text-text-secondary">
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
    <div className="h-screen w-screen bg-surface-deep flex items-center justify-center">
      <div className="w-full max-w-md mx-4">
        {/* Header */}
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg border border-accent/40 bg-accent/5 mb-6">
            <Ghost size={30} className="text-accent-soft" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-wide">
            Ghost in the Machine
          </h1>
          {/* Room code + copy */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-subtle">Room</span>
              <span className="text-sm text-accent-light tracking-[0.3em] uppercase bg-accent/8 px-3 py-1 rounded-lg border border-accent/20">
                {roomCode}
              </span>
            </div>
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-text-muted hover:text-text-primary hover:border-surface-hover transition-colors"
            >
              {copied ? (
                <CheckCheck size={14} className="text-success" />
              ) : (
                <Copy size={14} />
              )}
              {copied ? "Copied!" : "Invite"}
            </button>
          </div>
        </div>

        {/* Player list */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center gap-2">
            <Users size={16} className="text-accent-soft" />
            <span className="text-sm text-text-muted">
              Players ({joinedCount}/{MAX_PLAYERS})
            </span>
          </CardHeader>
          <CardContent className="space-y-2 max-h-56 overflow-y-auto">
            {allJoinedPlayers.map((player) => (
              <div
                key={player.connectionId}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border-subtle bg-surface"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: player.color }}
                />
                <span className="text-sm text-text-secondary flex-1">
                  {player.name}
                  {player.isSelf && (
                    <span className="text-xs text-text-faint ml-2">(you)</span>
                  )}
                </span>
                {player.playerId === hostPlayerId && (
                  <Crown size={14} className="text-warning shrink-0" />
                )}
                {player.isReady ? (
                  <Check size={16} className="text-success shrink-0" />
                ) : (
                  <span className="text-xs text-text-faint shrink-0">
                    waiting
                  </span>
                )}
              </div>
            ))}
            {joinedCount < 2 && (
              <p className="text-xs text-text-faint text-center py-4 border border-dashed border-border rounded-lg mt-2">
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
            className={`flex-1 gap-2 ${self?.presence.isReady ? "text-success border-success/30 hover:bg-success/10" : ""}`}
          >
            <Check
              size={18}
              className={self?.presence.isReady ? "text-success" : ""}
            />
            {self?.presence.isReady ? "Ready!" : "Ready Up"}
          </Button>
          {isHost && (
            <Button
              variant="primary"
              onClick={() => handleStartGame()}
              disabled={!canStart || isGenerating}
              className="flex-1 gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Start Game
                </>
              )}
            </Button>
          )}
        </div>

        {/* Host indicator */}
        <div
          className={`mt-6 flex items-center justify-center gap-2 text-xs ${isHost ? "text-warning" : "text-text-faint"}`}
        >
          <Crown size={14} />
          <span>
            {isHost ? "You are the host" : "Waiting for host to start..."}
          </span>
        </div>
      </div>
    </div>
  );
}
