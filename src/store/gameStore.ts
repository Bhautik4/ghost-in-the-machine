import { create } from "zustand";
import type {
  GameState,
  Player,
  CodeTask,
  GhostEvent,
  GamePhase,
} from "@/types/game";

/** Normalize code for comparison: trim + collapse whitespace + normalize self-closing tags */
function normalizeCode(code: string): string {
  return code
    .split("\n")
    .map((line) =>
      line
        .trimEnd()
        .replace(/\s+/g, " ")
        .replace(/\s*\/>/g, " />"),
    )
    .join("\n")
    .trim();
}
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

const INITIAL_TASKS: CodeTask[] = [
  {
    id: "task-1",
    fileName: "Main.ts",
    description: "Fix the missing semicolon on the import statement",
    buggyCode: `import { Server } from "express"
import { WebSocket } from "ws";
import { createHash } from "crypto";

const app = new Server();
const PORT = process.env.PORT || 3000;`,
    fixedCode: `import { Server } from "express";
import { WebSocket } from "ws";
import { createHash } from "crypto";

const app = new Server();
const PORT = process.env.PORT || 3000;`,
    currentCode: `import { Server } from "express"
import { WebSocket } from "ws";
import { createHash } from "crypto";

const app = new Server();
const PORT = process.env.PORT || 3000;`,
    isFixed: false,
    line: 1,
  },
  {
    id: "task-2",
    fileName: "Game.tsx",
    description: "Fix the unclosed JSX tag",
    buggyCode: `export function GameBoard({ players }: Props) {
  return (
    <div className="game-board">
      <h1>Ghost in the Machine</h1>
      <PlayerList players={players} />
      <ScoreBoard
    </div>
  );
}`,
    fixedCode: `export function GameBoard({ players }: Props) {
  return (
    <div className="game-board">
      <h1>Ghost in the Machine</h1>
      <PlayerList players={players} />
      <ScoreBoard />
    </div>
  );
}`,
    currentCode: `export function GameBoard({ players }: Props) {
  return (
    <div className="game-board">
      <h1>Ghost in the Machine</h1>
      <PlayerList players={players} />
      <ScoreBoard
    </div>
  );
}`,
    isFixed: false,
    line: 6,
  },
  {
    id: "task-3",
    fileName: "Main.ts",
    description: "Fix the wrong comparison operator (= instead of ===)",
    buggyCode: `app.get("/health", (req, res) => {
  if (req.headers.authorization = "Bearer token") {
    res.json({ status: "ok", uptime: process.uptime() });
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
});`,
    fixedCode: `app.get("/health", (req, res) => {
  if (req.headers.authorization === "Bearer token") {
    res.json({ status: "ok", uptime: process.uptime() });
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
});`,
    currentCode: `app.get("/health", (req, res) => {
  if (req.headers.authorization = "Bearer token") {
    res.json({ status: "ok", uptime: process.uptime() });
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
});`,
    isFixed: false,
    line: 2,
  },
  {
    id: "task-4",
    fileName: "Game.tsx",
    description: "Fix the missing closing bracket in the array destructuring",
    buggyCode: `const [players, setPlayers = useState<Player[]>([]);
const [isReady, setIsReady] = useState(false);
const [score, setScore] = useState(0);`,
    fixedCode: `const [players, setPlayers] = useState<Player[]>([]);
const [isReady, setIsReady] = useState(false);
const [score, setScore] = useState(0);`,
    currentCode: `const [players, setPlayers = useState<Player[]>([]);
const [isReady, setIsReady] = useState(false);
const [score, setScore] = useState(0);`,
    isFixed: false,
    line: 1,
  },
  {
    id: "task-5",
    fileName: "Main.ts",
    description: "Fix the typo in the function name (listn instead of listen)",
    buggyCode: `app.listn(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
  initWebSocket(app);
});`,
    fixedCode: `app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
  initWebSocket(app);
});`,
    currentCode: `app.listn(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
  initWebSocket(app);
});`,
    isFixed: false,
    line: 1,
  },
];

interface GameStore extends GameState {
  // Player actions
  setCurrentPlayer: (id: string) => void;
  addPlayer: (name: string) => Player;
  removePlayer: (id: string) => void;

  // Game flow
  startGame: () => void;
  endGame: (winner: "ghost" | "engineers") => void;
  resetGame: () => void;
  setPhase: (phase: GamePhase) => void;
  tick: () => void;

  // Code editing
  updateTaskCode: (taskId: string, newCode: string) => void;
  checkTaskFixed: (taskId: string) => boolean;
  setActiveTab: (tab: string) => void;

  // Ghost actions
  triggerGhostEvent: (event: Omit<GhostEvent, "id" | "timestamp">) => void;
  increaseParanoia: (amount: number) => void;
  decreaseParanoia: (amount: number) => void;

  // Terminal
  addTerminalLine: (line: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  phase: "lobby",
  players: [],
  tasks: INITIAL_TASKS,
  paranoiaMeter: 0,
  ghostEvents: [],
  timeRemaining: 240,
  activeTab: "Main.ts",
  terminalLines: [
    "$ ghost-machine init",
    "Initializing Ghost in the Machine v1.0.0...",
    "Loading workspace...",
    '> Ready. Type "help" for commands.',
    "",
  ],
  currentPlayerId: null,

  setCurrentPlayer: (id) => set({ currentPlayerId: id }),

  addPlayer: (name) => {
    const state = get();
    const player: Player = {
      id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      role: "engineer",
      isAlive: true,
      color: PLAYER_COLORS[state.players.length % PLAYER_COLORS.length],
    };
    set({ players: [...state.players, player] });
    return player;
  },

  removePlayer: (id) => {
    set({ players: get().players.filter((p) => p.id !== id) });
  },

  startGame: () => {
    const store = get();
    // Role assignment is now handled by Liveblocks Storage (see Lobby).
    // This method only resets local game state for the playing phase.
    set({
      phase: "playing",
      timeRemaining: 240,
      paranoiaMeter: 0,
      tasks: INITIAL_TASKS.map((t) => ({
        ...t,
        currentCode: t.buggyCode,
        isFixed: false,
      })),
      terminalLines: [
        ...store.terminalLines,
        "$ game start --mode=haunted",
        "[WARN] Something feels wrong...",
        "> Game started. Fix the bugs before time runs out.",
        "",
      ],
    });
  },

  endGame: (winner) => {
    set({
      phase: winner === "ghost" ? "ghost-wins" : "engineers-win",
    });
    get().addTerminalLine(
      winner === "ghost"
        ? "[FATAL] The Ghost has consumed the codebase. Game Over."
        : "[SUCCESS] All bugs fixed! The Ghost has been exorcised.",
    );
  },

  resetGame: () => {
    set({
      phase: "lobby",
      tasks: INITIAL_TASKS,
      paranoiaMeter: 0,
      ghostEvents: [],
      timeRemaining: 240,
      terminalLines: [
        "$ ghost-machine reset",
        "Resetting workspace...",
        "> Ready for a new game.",
        "",
      ],
    });
  },

  setPhase: (phase) => set({ phase }),

  tick: () => {
    const state = get();
    if (state.phase !== "playing") return;

    const newTime = state.timeRemaining - 1;
    if (newTime <= 0) {
      get().endGame("ghost");
      return;
    }

    // Paranoia slowly increases over time
    const paranoiaIncrease = newTime < 60 ? 0.3 : 0.1;
    set({
      timeRemaining: newTime,
      paranoiaMeter: Math.min(100, state.paranoiaMeter + paranoiaIncrease),
    });
  },

  updateTaskCode: (taskId, newCode) => {
    const tasks = get().tasks.map((t) =>
      t.id === taskId ? { ...t, currentCode: newCode } : t,
    );
    set({ tasks });

    // Auto-check if fixed
    const task = tasks.find((t) => t.id === taskId);
    if (
      task &&
      normalizeCode(task.currentCode) === normalizeCode(task.fixedCode)
    ) {
      const updatedTasks = tasks.map((t) =>
        t.id === taskId ? { ...t, isFixed: true } : t,
      );
      set({ tasks: updatedTasks });
      get().addTerminalLine(`[OK] Bug fixed in ${task.fileName}!`);
      get().decreaseParanoia(10);

      // Check win condition
      if (updatedTasks.every((t) => t.isFixed)) {
        get().endGame("engineers");
      }
    }
  },

  checkTaskFixed: (taskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    return task
      ? normalizeCode(task.currentCode) === normalizeCode(task.fixedCode)
      : false;
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  triggerGhostEvent: (event) => {
    const ghostEvent: GhostEvent = {
      ...event,
      id: `event-${Date.now()}`,
      timestamp: Date.now(),
    };
    set({ ghostEvents: [...get().ghostEvents, ghostEvent] });

    // Auto-remove after duration
    setTimeout(() => {
      set({
        ghostEvents: get().ghostEvents.filter((e) => e.id !== ghostEvent.id),
      });
    }, event.duration);
  },

  increaseParanoia: (amount) => {
    const newVal = Math.min(100, get().paranoiaMeter + amount);
    set({ paranoiaMeter: newVal });
    if (newVal >= 100) {
      get().endGame("ghost");
    }
  },

  decreaseParanoia: (amount) => {
    set({ paranoiaMeter: Math.max(0, get().paranoiaMeter - amount) });
  },

  addTerminalLine: (line) => {
    set({ terminalLines: [...get().terminalLines, line] });
  },
}));
