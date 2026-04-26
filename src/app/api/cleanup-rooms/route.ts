import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

/**
 * Room cleanup cron job.
 *
 * Call this endpoint periodically (e.g., every hour via Vercel Cron or external service)
 * to delete empty Liveblocks rooms and stay within the 500-room limit.
 *
 * GET /api/cleanup-rooms?secret=YOUR_CRON_SECRET
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function GET(request: NextRequest) {
  // Simple auth for cron jobs
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let deleted = 0;
    let cursor: string | undefined;

    // Paginate through all rooms
    while (true) {
      const { data: rooms, nextCursor } = await liveblocks.getRooms({
        limit: 100,
        startingAfter: cursor,
      });

      for (const room of rooms) {
        // Get active users in the room
        const activeUsers = await liveblocks.getActiveUsers(room.id);

        if (activeUsers.data.length === 0) {
          // No players — delete the room
          await liveblocks.deleteRoom(room.id);
          deleted++;
        }
      }

      if (!nextCursor) break;
      cursor = nextCursor;
    }

    return NextResponse.json({
      success: true,
      deletedRooms: deleted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Room cleanup error:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
