"use client";

import { use } from "react";
import { Room } from "@/components/Multiplayer/Room";
import { RoomContent } from "@/components/RoomContent";
import { codeToRoomId } from "@/lib/roomCode";

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const roomId = codeToRoomId(code);

  return (
    <Room roomId={roomId}>
      <RoomContent roomCode={code.toUpperCase()} />
    </Room>
  );
}
