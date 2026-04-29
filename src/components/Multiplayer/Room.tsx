"use client";

import { ReactNode, useCallback, useMemo } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { getOrCreatePlayerId } from "@/lib/playerId";

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
          voiceEnabled: false,
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
            <div className="h-screen w-screen flex items-center justify-center bg-surface-deep">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-accent/60 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-text-muted">
                  Connecting to server...
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
