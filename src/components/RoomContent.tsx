"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { Lobby } from "@/components/Editor/Lobby";
import { EditorWorkspace } from "@/components/Editor/EditorWorkspace";

interface RoomContentProps {
  roomCode: string;
}

/**
 * Switches between Lobby and Editor based on Liveblocks gameStatus.
 * Both share the same Liveblocks room — no navigation needed.
 */
export function RoomContent({ roomCode }: RoomContentProps) {
  const gameStatus = useStorage((root) => root.gameStatus);

  if (gameStatus === "waiting") {
    return <Lobby roomCode={roomCode} />;
  }

  return <EditorWorkspace roomCode={roomCode} />;
}
