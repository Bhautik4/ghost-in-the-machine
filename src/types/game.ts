export type Role = "engineer" | "ghost" | "spectator";

export type GamePhase = "lobby" | "playing" | "ghost-wins" | "engineers-win";

export interface Player {
  id: string;
  name: string;
  role: Role;
  isAlive: boolean;
  color: string;
  cursorPosition?: { line: number; col: number };
}

export interface CodeTask {
  id: string;
  fileName: string;
  description: string;
  buggyCode: string;
  fixedCode: string;
  currentCode: string;
  isFixed: boolean;
  line: number;
}

export interface GhostEvent {
  id: string;
  type:
    | "glitch"
    | "flicker"
    | "sound"
    | "cursor-hijack"
    | "fake-error"
    | "scanline";
  timestamp: number;
  targetPlayerId?: string;
  duration: number;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  tasks: CodeTask[];
  paranoiaMeter: number;
  ghostEvents: GhostEvent[];
  timeRemaining: number;
  activeTab: string;
  terminalLines: string[];
  currentPlayerId: string | null;
}
