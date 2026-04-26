/**
 * DSA Task Bank — Two task sets selected by room code.
 *
 * SET A (Graph/BFS) — loaded when room code ends in even digit (0,2,4,6,8)
 * SET B (DP/Optimization) — loaded when room code ends in odd digit (1,3,5,7,9)
 * If the last char is a letter, use its char code (even/odd).
 *
 * Each set has 3 stages of increasing difficulty:
 *   Stage 1 (0:00–1:30): Syntax bugs
 *   Stage 2 (1:30–3:00): Logic bugs
 *   Stage 3 (3:00–4:00): Hard DSA bugs
 */

export interface Task {
  id: string;
  fileName: string;
  label: string;
  description: string;
  buggyCode: string;
  fixedCode: string;
  stage: 1 | 2 | 3;
}

// ═══════════════════════════════════════════════════════════════
// SET A — Graph / BFS / Tree focus
// ═══════════════════════════════════════════════════════════════

const SET_A_S1: Task[] = [
  {
    id: "a1_missing_semicolon",
    fileName: "server_init.ts",
    label: "Server Init",
    description: "Missing semicolon on the import statement",
    stage: 1,
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
  },
  {
    id: "a1_unclosed_jsx",
    fileName: "dashboard.tsx",
    label: "Dashboard UI",
    description: "Unclosed JSX tag — StatusBar is missing its closing />",
    stage: 1,
    buggyCode: `export function Dashboard({ data }: Props) {
  return (
    <div className="dashboard">
      <Header title="System Monitor" />
      <DataGrid rows={data} />
      <StatusBar
    </div>
  );
}`,
    fixedCode: `export function Dashboard({ data }: Props) {
  return (
    <div className="dashboard">
      <Header title="System Monitor" />
      <DataGrid rows={data} />
      <StatusBar />
    </div>
  );
}`,
  },
  {
    id: "a1_typo_method",
    fileName: "ws_handler.ts",
    label: "WebSocket Handler",
    description: "Typo in method name — 'listn' should be 'listen'",
    stage: 1,
    buggyCode: `server.listn(PORT, () => {
  console.log(\`WS running on \${PORT}\`);
  initHeartbeat();
});

function initHeartbeat() {
  setInterval(() => ws.ping(), 30000);
}`,
    fixedCode: `server.listen(PORT, () => {
  console.log(\`WS running on \${PORT}\`);
  initHeartbeat();
});

function initHeartbeat() {
  setInterval(() => ws.ping(), 30000);
}`,
  },
];

const SET_A_S2: Task[] = [
  {
    id: "a2_wrong_comparison",
    fileName: "auth_check.ts",
    label: "Auth Check",
    description: "Assignment (=) used instead of comparison (===)",
    stage: 2,
    buggyCode: `function validateSession(session: Session) {
  if (session.token = "expired") {
    revokeAccess(session.userId);
    return { valid: false, reason: "Token expired" };
  }
  return { valid: true, reason: null };
}`,
    fixedCode: `function validateSession(session: Session) {
  if (session.token === "expired") {
    revokeAccess(session.userId);
    return { valid: false, reason: "Token expired" };
  }
  return { valid: true, reason: null };
}`,
  },
  {
    id: "a2_bfs_visited",
    fileName: "graph_bfs.ts",
    label: "BFS Traversal",
    description:
      "BFS marks visited AFTER dequeue instead of BEFORE enqueue — causes duplicates",
    stage: 2,
    buggyCode: `function bfs(graph: Map<number, number[]>, start: number) {
  const visited = new Set<number>();
  const queue: number[] = [start];
  const result: number[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    visited.add(node);
    result.push(node);

    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }
  return result;
}`,
    fixedCode: `function bfs(graph: Map<number, number[]>, start: number) {
  const visited = new Set<number>();
  const queue: number[] = [start];
  const result: number[] = [];
  visited.add(start);

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return result;
}`,
  },
  {
    id: "a2_dijkstra_init",
    fileName: "shortest_path.ts",
    label: "Dijkstra Init",
    description:
      "Distance map initialized to 0 instead of Infinity — all paths look free",
    stage: 2,
    buggyCode: `function dijkstra(graph: WeightedGraph, source: number) {
  const dist = new Map<number, number>();
  for (const node of graph.nodes) {
    dist.set(node, 0);
  }
  dist.set(source, 0);
  const pq: [number, number][] = [[0, source]];

  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift()!;
    if (d > dist.get(u)!) continue;
    for (const [v, w] of graph.edges(u)) {
      const alt = d + w;
      if (alt < dist.get(v)!) {
        dist.set(v, alt);
        pq.push([alt, v]);
      }
    }
  }
  return dist;
}`,
    fixedCode: `function dijkstra(graph: WeightedGraph, source: number) {
  const dist = new Map<number, number>();
  for (const node of graph.nodes) {
    dist.set(node, Infinity);
  }
  dist.set(source, 0);
  const pq: [number, number][] = [[0, source]];

  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift()!;
    if (d > dist.get(u)!) continue;
    for (const [v, w] of graph.edges(u)) {
      const alt = d + w;
      if (alt < dist.get(v)!) {
        dist.set(v, alt);
        pq.push([alt, v]);
      }
    }
  }
  return dist;
}`,
  },
];

const SET_A_S3: Task[] = [
  {
    id: "a3_tree_base_case",
    fileName: "tree_depth.ts",
    label: "Tree Max Depth",
    description:
      "Missing base case — crashes with stack overflow on null nodes",
    stage: 3,
    buggyCode: `interface TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

function maxDepth(root: TreeNode | null): number {
  const leftDepth = maxDepth(root.left);
  const rightDepth = maxDepth(root.right);
  return Math.max(leftDepth, rightDepth) + 1;
}`,
    fixedCode: `interface TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

function maxDepth(root: TreeNode | null): number {
  if (root === null) return 0;
  const leftDepth = maxDepth(root.left);
  const rightDepth = maxDepth(root.right);
  return Math.max(leftDepth, rightDepth) + 1;
}`,
  },
  {
    id: "a3_linked_list_leak",
    fileName: "linked_list.ts",
    label: "Linked List Delete",
    description:
      "Memory leak — doesn't update previous node's next pointer on delete",
    stage: 3,
    buggyCode: `function deleteNode(head: ListNode | null, target: number) {
  if (!head) return null;
  if (head.val === target) return head.next;

  let current = head;
  while (current.next) {
    if (current.next.val === target) {
      current = current.next;
      break;
    }
    current = current.next;
  }
  return head;
}`,
    fixedCode: `function deleteNode(head: ListNode | null, target: number) {
  if (!head) return null;
  if (head.val === target) return head.next;

  let current = head;
  while (current.next) {
    if (current.next.val === target) {
      current.next = current.next.next;
      break;
    }
    current = current.next;
  }
  return head;
}`,
  },
];

const SET_A: Task[] = [...SET_A_S1, ...SET_A_S2, ...SET_A_S3];

// ═══════════════════════════════════════════════════════════════
// SET B — Dynamic Programming / Optimization focus
// ═══════════════════════════════════════════════════════════════

const SET_B_S1: Task[] = [
  {
    id: "b1_missing_bracket",
    fileName: "config_parser.ts",
    label: "Config Parser",
    description: "Missing closing bracket in array destructuring",
    stage: 1,
    buggyCode: `const [host, port = parseConfig(envFile);
const [dbName, dbUser] = parseDbConfig(envFile);

export function connect() {
  return createPool({ host, port, dbName, dbUser });
}`,
    fixedCode: `const [host, port] = parseConfig(envFile);
const [dbName, dbUser] = parseDbConfig(envFile);

export function connect() {
  return createPool({ host, port, dbName, dbUser });
}`,
  },
  {
    id: "b1_wrong_arrow",
    fileName: "event_bus.ts",
    label: "Event Bus",
    description:
      "Arrow function uses {} without return — handler always returns undefined",
    stage: 1,
    buggyCode: `const handlers = new Map<string, Function[]>();

export function on(event: string, fn: Function) {
  const list = handlers.get(event) || [];
  list.push(fn);
  handlers.set(event, list);
}

export function emit(event: string, data: unknown) {
  const list = handlers.get(event) || [];
  return list.map((fn) => { fn(data) });
}`,
    fixedCode: `const handlers = new Map<string, Function[]>();

export function on(event: string, fn: Function) {
  const list = handlers.get(event) || [];
  list.push(fn);
  handlers.set(event, list);
}

export function emit(event: string, data: unknown) {
  const list = handlers.get(event) || [];
  return list.map((fn) => fn(data));
}`,
  },
  {
    id: "b1_template_literal",
    fileName: "logger.ts",
    label: "Logger",
    description:
      "String concatenation used instead of template literal — variable not interpolated",
    stage: 1,
    buggyCode: `function log(level: string, message: string) {
  const timestamp = new Date().toISOString();
  const formatted = "[" + timestamp + "] " + level + ": \${message}";
  console.log(formatted);
  appendToFile(LOG_PATH, formatted);
}`,
    fixedCode: `function log(level: string, message: string) {
  const timestamp = new Date().toISOString();
  const formatted = \`[\${timestamp}] \${level}: \${message}\`;
  console.log(formatted);
  appendToFile(LOG_PATH, formatted);
}`,
  },
];

const SET_B_S2: Task[] = [
  {
    id: "b2_fibonacci_memo",
    fileName: "fibonacci.ts",
    label: "Fibonacci Memo",
    description:
      "Memoization cache is never read — function recomputes every call (exponential time)",
    stage: 2,
    buggyCode: `const memo = new Map<number, number>();

function fib(n: number): number {
  if (n <= 1) return n;
  memo.set(n, fib(n - 1) + fib(n - 2));
  return fib(n - 1) + fib(n - 2);
}`,
    fixedCode: `const memo = new Map<number, number>();

function fib(n: number): number {
  if (n <= 1) return n;
  if (memo.has(n)) return memo.get(n)!;
  memo.set(n, fib(n - 1) + fib(n - 2));
  return memo.get(n)!;
}`,
  },
  {
    id: "b2_knapsack_index",
    fileName: "knapsack.ts",
    label: "0/1 Knapsack",
    description:
      "DP table uses wrong index — reads dp[i] instead of dp[i-1] for the 'skip' case",
    stage: 2,
    buggyCode: `function knapsack(weights: number[], values: number[], W: number) {
  const n = weights.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(W + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= W; w++) {
      dp[i][w] = dp[i][w]; // skip item
      if (weights[i - 1] <= w) {
        dp[i][w] = Math.max(
          dp[i][w],
          dp[i - 1][w - weights[i - 1]] + values[i - 1]
        );
      }
    }
  }
  return dp[n][W];
}`,
    fixedCode: `function knapsack(weights: number[], values: number[], W: number) {
  const n = weights.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(W + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= W; w++) {
      dp[i][w] = dp[i - 1][w]; // skip item
      if (weights[i - 1] <= w) {
        dp[i][w] = Math.max(
          dp[i][w],
          dp[i - 1][w - weights[i - 1]] + values[i - 1]
        );
      }
    }
  }
  return dp[n][W];
}`,
  },
  {
    id: "b2_sliding_window",
    fileName: "max_subarray.ts",
    label: "Max Subarray",
    description:
      "Kadane's algorithm resets currentMax to 0 instead of the current element",
    stage: 2,
    buggyCode: `function maxSubarraySum(nums: number[]): number {
  let maxSum = -Infinity;
  let currentMax = 0;

  for (const num of nums) {
    currentMax = Math.max(0, currentMax + num);
    maxSum = Math.max(maxSum, currentMax);
  }
  return maxSum;
}`,
    fixedCode: `function maxSubarraySum(nums: number[]): number {
  let maxSum = -Infinity;
  let currentMax = 0;

  for (const num of nums) {
    currentMax = Math.max(num, currentMax + num);
    maxSum = Math.max(maxSum, currentMax);
  }
  return maxSum;
}`,
  },
];

const SET_B_S3: Task[] = [
  {
    id: "b3_lcs_base_case",
    fileName: "lcs.ts",
    label: "Longest Common Subseq",
    description:
      "Missing base case — when characters match, adds 1 but doesn't recurse on the diagonal",
    stage: 3,
    buggyCode: `function lcs(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
}`,
    fixedCode: `function lcs(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
}`,
  },
  {
    id: "b3_coin_change_inf",
    fileName: "coin_change.ts",
    label: "Coin Change",
    description:
      "DP array filled with 0 instead of Infinity — every amount appears reachable with 0 coins",
    stage: 3,
    buggyCode: `function coinChange(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(0);
  dp[0] = 0;

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }
  return dp[amount] > amount ? -1 : dp[amount];
}`,
    fixedCode: `function coinChange(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }
  return dp[amount] > amount ? -1 : dp[amount];
}`,
  },
];

const SET_B: Task[] = [...SET_B_S1, ...SET_B_S2, ...SET_B_S3];

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

export type TaskSet = "graph" | "dp";

/** Determine which task set to use based on the room code's last character */
export function getTaskSet(roomCode: string): TaskSet {
  const lastChar = roomCode.charAt(roomCode.length - 1);
  const code = lastChar.charCodeAt(0);
  return code % 2 === 0 ? "graph" : "dp";
}

/** Get all tasks for a given set */
export function getTasksForSet(set: TaskSet): Task[] {
  return set === "graph" ? SET_A : SET_B;
}

/** Get the label for a task set */
export function getTaskSetLabel(set: TaskSet): string {
  return set === "graph"
    ? "Graph / BFS / Trees"
    : "Dynamic Programming / Optimization";
}

/** Get tasks for a room code */
export function getTasksForRoom(roomCode: string): Task[] {
  return getTasksForSet(getTaskSet(roomCode));
}

/** Get unlocked tasks at the current elapsed time */
export function getUnlockedTasks(
  allTasks: Task[],
  elapsedSeconds: number,
): Task[] {
  if (elapsedSeconds >= 180) return allTasks;
  if (elapsedSeconds >= 90) return allTasks.filter((t) => t.stage <= 2);
  return allTasks.filter((t) => t.stage === 1);
}

/** Get the current stage number */
export function getCurrentStage(elapsedSeconds: number): 1 | 2 | 3 {
  if (elapsedSeconds >= 180) return 3;
  if (elapsedSeconds >= 90) return 2;
  return 1;
}

/** Total game duration in seconds */
export const GAME_DURATION = 240;
