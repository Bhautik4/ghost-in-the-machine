/** Generate a 6-character alphanumeric room code */
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Convert a room code to a Liveblocks room ID */
export function codeToRoomId(code: string): string {
  return `room-${code.toUpperCase()}`;
}

/** Max players per room */
export const MAX_PLAYERS = 4;

/** Max game duration before force-close (10 minutes in ms) */
export const MAX_GAME_DURATION_MS = 10 * 60 * 1000;
