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
      /** Tracks which files the ghost has faked as "verified" — fileId → expiry timestamp */
      fakedTasks: Record<string, number>;
      /** Active vote: who called it, who they're accusing, and votes cast */
      activeVote: {
        callerId: string;
        accusedId: string;
        accusedName: string;
        votes: Record<string, "guilty" | "innocent">;
        expiresAt: number;
      } | null;
      /** LLM-generated scenario for this game session. Null = use static fallback. */
      generatedScenario: {
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
      } | null;
      /** Per-file verification status — fileId → { verified, status } */
      fileVerification: Record<string, { verified: boolean; status: string }>;
      /** System-wide status derived from chain validation */
      systemStatus: "operational" | "degraded";
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
          type: "breadcrumb";
          message: string;
        }
      | {
          type: "edit-activity";
          playerName: string;
          playerColor: string;
          fileName: string;
          charsChanged: number;
          isLargeEdit: boolean;
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
