"use client";

import { ReactNode, useCallback, useMemo } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { getOrCreatePlayerId } from "@/lib/playerId";

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

function pickColor(): string {
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
}

interface RoomProps {
  roomId?: string;
  children: ReactNode;
}

/**
 * Wraps the app in LiveblocksProvider + RoomProvider.
 *
 * - Uses a custom auth endpoint (`/api/liveblocks-auth`) so the
 *   secret key stays server-side.
 * - Sets initial Presence (name empty until the player joins via the lobby).
 * - Sets initial Storage (gamePhase, roleAssignments, hostConnectionId).
 */
export function Room({ roomId = "ghost-machine-lobby", children }: RoomProps) {
  const playerId = useMemo(() => getOrCreatePlayerId(), []);
  const color = useMemo(() => pickColor(), []);

  const authEndpoint = useCallback(
    async (room?: string) => {
      const res = await fetch("/api/liveblocks-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          name: "Anonymous",
          room: room ?? "ghost-machine-lobby",
        }),
      });
      return await res.json();
    },
    [playerId],
  );

  return (
    <LiveblocksProvider authEndpoint={authEndpoint}>
      <RoomProvider
        id={roomId}
        initialPresence={{
          name: "",
          playerId,
          isReady: false,
          color,
          cursor: null,
        }}
        initialStorage={{
          gameStatus: "waiting",
          ghostId: null,
          hostPlayerId: null,
          editorContent: {},
          fakedTasks: {},
          activeVote: null,
          generatedScenario: null,
          fileVerification: {},
          systemStatus: "degraded" as const,
        }}
      >
        <ClientSideSuspense
          fallback={
            <div className="h-screen w-screen flex items-center justify-center bg-surface-deep font-mono">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin shadow-accent-strong" />
                <span className="text-xs font-bold uppercase tracking-widest text-text-faint animate-pulse">
                  Connecting to Server
                </span>
              </div>
            </div>
          }
        >
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
