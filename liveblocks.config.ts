export type GameStatus =
  | "waiting"
  | "active"
  | "blackout"
  | "voting"
  | "ghost-wins"
  | "engineers-win";

declare global {
  interface Liveblocks {
    Presence: {
      name: string;
      playerId: string;
      isReady: boolean;
      color: string;
      cursor: { line: number; col: number } | null;
    };

    Storage: {
      gameStatus: GameStatus;
      ghostId: string | null;
      hostPlayerId: string | null;
      editorContent: Record<string, string>;
      /** Tracks which tasks the ghost has faked as "fixed" — taskId → expiry timestamp */
      fakedTasks: Record<string, number>;
      /** Active vote: who called it, who they're accusing, and votes cast */
      activeVote: {
        callerId: string;
        accusedId: string;
        accusedName: string;
        votes: Record<string, "guilty" | "innocent">;
        expiresAt: number;
      } | null;
    };

    UserMeta: Record<string, never>;
    RoomEvent:
      | { type: "demon-voice"; audioBase64: string; senderName: string }
      | { type: "blackout"; duration: number }
      | {
          type: "phantom-cursor";
          line: number;
          col: number;
          color: string;
          name: string;
          duration: number;
        }
      | {
          type: "chat";
          playerId: string;
          playerName: string;
          text: string;
          color: string;
        }
      | {
          type: "sfx";
          sound:
            | "task-fixed"
            | "blackout"
            | "vote-called"
            | "time-warning"
            | "game-over";
        };
    ThreadMetadata: Record<string, never>;
  }
}

export {};
