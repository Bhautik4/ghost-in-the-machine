import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

/**
 * Liveblocks authentication endpoint.
 *
 * For production you'd tie this to your real auth system.
 * Here we accept `playerId` + `name` from the client and
 * issue a token scoped to the requested room.
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { playerId, name, room } = await request.json();

    if (!playerId || !name) {
      return NextResponse.json(
        { error: "playerId and name are required" },
        { status: 400 },
      );
    }

    const session = liveblocks.prepareSession(playerId);

    // Grant access to any room (room codes are dynamic)
    session.allow(room ?? "room-*", session.FULL_ACCESS);
    session.allow("room-*", session.FULL_ACCESS);

    const { status, body } = await session.authorize();
    return new NextResponse(body, { status });
  } catch (error) {
    console.error("Liveblocks auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}
