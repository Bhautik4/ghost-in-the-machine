"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  useStorage,
  useMutation,
  useOthers,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import {
  FileText,
  CheckCircle2,
  Circle,
  Bug,
  ChevronDown,
  ChevronRight,
  Camera,
  ScanSearch,
  Lock,
} from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import {
  getTasksForRoom,
  getUnlockedTasks,
  getCurrentStage,
  GAME_DURATION,
  getTaskSet,
  getTaskSetLabel,
} from "@/lib/taskBank";
import { playTaskFixed } from "@/lib/sounds";
import { CMEditor } from "@/components/Editor/CMEditor";

export function GameEditor({
  isGhost,
  roomCode,
}: {
  isGhost: boolean;
  roomCode: string;
}) {
  const allTasks = getTasksForRoom(roomCode);
  const taskSet = getTaskSet(roomCode);
  const [activeTaskId, setActiveTaskId] = useState(allTasks[0].id);
  const [taskListOpen, setTaskListOpen] = useState(true);
  const [snapshots, setSnapshots] = useState<Record<string, string>>({});
  const [scanResult, setScanResult] = useState<string[] | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [snapshotCooldown, setSnapshotCooldown] = useState(false);
  const [scanCooldownRemaining, setScanCooldownRemaining] = useState(0);
  const [snapshotCooldownRemaining, setSnapshotCooldownRemaining] = useState(0);
  const scanExpiryRef = useRef(0);
  const snapshotExpiryRef = useRef(0);
  const updateMyPresence = useUpdateMyPresence();
  const others = useOthers();
  const editorContent = useStorage((root) => root.editorContent);
  const fakedTasks = useStorage((root) => root.fakedTasks);
  const { timeRemaining } = useGameStore();

  // Live cooldown countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const scanLeft = Math.ceil((scanExpiryRef.current - now) / 1000);
      const snapLeft = Math.ceil((snapshotExpiryRef.current - now) / 1000);
      setScanCooldown(scanLeft > 0);
      setScanCooldownRemaining(Math.max(0, scanLeft));
      setSnapshotCooldown(snapLeft > 0);
      setSnapshotCooldownRemaining(Math.max(0, snapLeft));
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const elapsed = GAME_DURATION - timeRemaining;
  const currentStage = getCurrentStage(elapsed);
  const unlockedTasks = getUnlockedTasks(allTasks, elapsed);
  const prevStageRef = useRef(currentStage);

  useEffect(() => {
    if (currentStage > prevStageRef.current) {
      prevStageRef.current = currentStage;
    }
  }, [currentStage]);

  const activeTask = allTasks.find((t) => t.id === activeTaskId)!;
  const isTaskUnlocked = unlockedTasks.some((t) => t.id === activeTaskId);

  const rawContent = editorContent?.[activeTaskId];
  const currentContent: string =
    typeof rawContent === "string" ? rawContent : activeTask.buggyCode;

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Normalize code for comparison: trim lines, collapse spaces, normalize self-closing tags
  const normalizeCode = (code: string) =>
    code
      .split("\n")
      .map((line) =>
        line
          .trimEnd()
          .replace(/\s+/g, " ")
          .replace(/\s*\/>/g, " />"),
      )
      .join("\n")
      .trim();

  const isTaskFixed = (taskId: string) => {
    const fakeExpiry = fakedTasks?.[taskId];
    if (typeof fakeExpiry === "number" && fakeExpiry > now && !isGhost)
      return true;
    const task = allTasks.find((t) => t.id === taskId)!;
    const raw = editorContent?.[taskId];
    const content: string = typeof raw === "string" ? raw : task.buggyCode;
    return normalizeCode(content) === normalizeCode(task.fixedCode);
  };

  const fixedCount = unlockedTasks.filter((t) => isTaskFixed(t.id)).length;

  const updateContent = useMutation(
    ({ storage }, taskId: string, newCode: string) => {
      const content = { ...storage.get("editorContent"), [taskId]: newCode };
      storage.set("editorContent", content);
      const task = allTasks.find((t) => t.id === taskId);
      if (task) {
        const wasBuggy =
          typeof storage.get("editorContent")[taskId] !== "string" ||
          normalizeCode(storage.get("editorContent")[taskId] as string) !==
            normalizeCode(task.fixedCode);
        if (
          wasBuggy &&
          normalizeCode(newCode) === normalizeCode(task.fixedCode)
        ) {
          playTaskFixed();
        }
      }
      const allFixed = allTasks.every((t) => {
        const code =
          typeof content[t.id] === "string"
            ? (content[t.id] as string)
            : t.buggyCode;
        return normalizeCode(code) === normalizeCode(t.fixedCode);
      });
      if (allFixed) storage.set("gameStatus", "engineers-win");
    },
    [],
  );

  const handleEditorChange = useCallback(
    (value: string) => {
      if (!isTaskUnlocked) return;
      updateContent(activeTaskId, value);
    },
    [activeTaskId, updateContent, isTaskUnlocked],
  );

  const handleCursorMove = useCallback(
    (line: number, col: number) => {
      updateMyPresence({ cursor: { line, col } });
    },
    [updateMyPresence],
  );

  // Engineer utilities
  const takeSnapshot = useMutation(
    ({ storage }) => {
      if (snapshotCooldown) return;
      const content = storage.get("editorContent");
      const snap: Record<string, string> = {};
      for (const task of allTasks) {
        const raw = content[task.id];
        snap[task.id] =
          typeof raw === "string" ? (raw as string) : task.buggyCode;
      }
      setSnapshots(snap);
      snapshotExpiryRef.current = Date.now() + 30000;
      setSnapshotCooldown(true);
    },
    [snapshotCooldown],
  );

  const revertToSnapshot = useMutation(
    ({ storage }) => {
      if (Object.keys(snapshots).length === 0) return;
      storage.set("editorContent", { ...snapshots });
    },
    [snapshots],
  );

  const runSecurityScan = () => {
    if (scanCooldown) return;
    const suspicious: string[] = [];
    for (const task of unlockedTasks) {
      const raw = editorContent?.[task.id];
      const current = typeof raw === "string" ? raw : task.buggyCode;
      const buggyLines = task.buggyCode.split("\n");
      const fixedLines = task.fixedCode.split("\n");
      const currentLines = current.split("\n");
      currentLines.forEach((line, i) => {
        const buggy = buggyLines[i] || "";
        const fixed = fixedLines[i] || "";
        if (line !== buggy && line !== fixed && line.trim() !== "") {
          suspicious.push(`${task.fileName}:${i + 1}`);
        }
      });
    }
    setScanResult(suspicious);
    scanExpiryRef.current = Date.now() + 45000;
    setScanCooldown(true);
    setTimeout(() => setScanResult(null), 45000);
  };

  // Build remote cursors for CodeMirror
  const remoteCursors = others
    .filter((o) => o.presence.cursor !== null && o.presence.name !== "")
    .map((o) => ({
      id: String(o.connectionId),
      name: o.presence.name as string,
      color: o.presence.color as string,
      line: o.presence.cursor!.line as number,
      col: o.presence.cursor!.col as number,
    }));

  const stageColors: Record<number, string> = {
    1: "text-success-light",
    2: "text-warning-light",
    3: "text-ghost-light",
  };
  const stageBg: Record<number, string> = {
    1: "bg-success/10 border-l-[3px] border-success",
    2: "bg-warning/10 border-l-[3px] border-warning",
    3: "bg-ghost/10 border-l-[3px] border-ghost",
  };

  return (
    <div className="flex-1 flex overflow-hidden font-mono">
      {/* ── Task sidebar ─────────────────────────────────── */}
      <div className="w-64 bg-surface border-r border-border flex flex-col shrink-0">
        <button
          onClick={() => setTaskListOpen(!taskListOpen)}
          className="flex items-center gap-2 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted hover:text-text-primary border-b border-border transition-colors bg-surface-overlay/40"
        >
          {taskListOpen ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
          <Bug size={14} className="text-accent-soft" />
          Tasks ({fixedCount}/{unlockedTasks.length})
        </button>

        <div className="px-4 py-2 border-b border-border bg-surface-overlay/30">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
            {getTaskSetLabel(taskSet)}
          </span>
        </div>
        <div
          className={`px-4 py-2 border-b border-border ${stageBg[currentStage]}`}
        >
          <span
            className={`text-[11px] font-bold uppercase tracking-widest ${stageColors[currentStage]}`}
          >
            Stage {currentStage}/3
          </span>
          <span className="text-[10px] text-text-subtle ml-3 uppercase tracking-wider">
            {currentStage === 1 && "Syntax"}
            {currentStage === 2 && "Logic"}
            {currentStage === 3 && "Hard DSA"}
          </span>
        </div>

        {taskListOpen && (
          <div className="flex-1 overflow-y-auto py-2">
            {allTasks.map((task) => {
              const fixed = isTaskFixed(task.id);
              const isActive = task.id === activeTaskId;
              const locked = !unlockedTasks.some((t) => t.id === task.id);
              return (
                <button
                  key={task.id}
                  onClick={() => !locked && setActiveTaskId(task.id)}
                  disabled={locked}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-all ${
                    locked
                      ? "text-text-faint cursor-not-allowed opacity-50"
                      : isActive
                        ? "bg-accent/10 text-accent-soft border-l-[3px] border-accent"
                        : "text-text-muted hover:bg-surface-raised border-l-[3px] border-transparent"
                  }`}
                >
                  {locked ? (
                    <Lock size={14} className="shrink-0 text-text-faint" />
                  ) : fixed ? (
                    <CheckCircle2 size={14} className="shrink-0 text-success" />
                  ) : (
                    <Circle size={14} className="shrink-0 text-ghost" />
                  )}
                  <FileText
                    size={14}
                    className={`shrink-0 ${
                      locked
                        ? "text-text-faint"
                        : task.fileName.endsWith(".tsx")
                          ? "text-info-blue"
                          : task.fileName.endsWith(".ts")
                            ? "text-info"
                            : "text-warning"
                    }`}
                  />
                  <span className="truncate tracking-wider">
                    {task.fileName}
                  </span>
                  {!locked && (
                    <span
                      className={`ml-auto text-[9px] font-bold tracking-widest ${stageColors[task.stage]}`}
                    >
                      S{task.stage}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="border-t border-border px-4 py-3 bg-surface-overlay/30">
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] mb-2">
            Mission Objective
          </p>
          <p className="text-[11px] leading-relaxed text-text-secondary tracking-wide">
            {activeTask.description}
          </p>
          {isTaskFixed(activeTaskId) && (
            <p className="text-[11px] text-success mt-2 font-bold uppercase tracking-widest">
              ✓ Fixed
            </p>
          )}
        </div>

        {!isGhost && (
          <div className="border-t border-border px-3 py-3 space-y-2 bg-surface-overlay/30">
            <button
              onClick={() => takeSnapshot()}
              disabled={snapshotCooldown}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all ${
                snapshotCooldown
                  ? "bg-border/30 text-text-faint cursor-not-allowed border border-border/30"
                  : "bg-player-cyan/10 text-info-light hover:bg-player-cyan/20 border border-player-cyan/30"
              }`}
            >
              <Camera size={14} />
              {snapshotCooldown
                ? `Cooldown (${snapshotCooldownRemaining}s)`
                : Object.keys(snapshots).length > 0
                  ? "Update Snapshot"
                  : "Take Snapshot"}
            </button>
            {Object.keys(snapshots).length > 0 && (
              <button
                onClick={() => revertToSnapshot()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-warning/10 text-warning-light hover:bg-warning/20 border border-warning/30 transition-all"
              >
                <Camera size={14} />
                Revert System
              </button>
            )}
            <button
              onClick={runSecurityScan}
              disabled={scanCooldown}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all ${
                scanCooldown
                  ? "bg-border/30 text-text-faint cursor-not-allowed border border-border/30"
                  : "bg-accent/10 text-accent-glow hover:bg-accent/20 border border-accent/30"
              }`}
            >
              <ScanSearch size={14} />
              Security Scan {scanCooldown && `(${scanCooldownRemaining}s)`}
            </button>
          </div>
        )}
      </div>

      {/* ── Editor area (CodeMirror) ─────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-surface-deep min-w-0">
        {/* Tab bar */}
        <div className="h-10 bg-surface border-b border-border flex items-end">
          <div className="relative h-full px-5 flex items-center gap-2.5 text-sm bg-surface-deep text-text-primary border-r border-border font-medium tracking-wider">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent-soft" />
            <FileText
              size={14}
              className={
                activeTask.fileName.endsWith(".tsx")
                  ? "text-info-blue"
                  : activeTask.fileName.endsWith(".ts")
                    ? "text-info"
                    : "text-warning"
              }
            />
            {activeTask.fileName}
            {isTaskFixed(activeTaskId) && (
              <CheckCircle2 size={12} className="text-success ml-1" />
            )}
            <span
              className={`text-xs ml-2 uppercase font-bold ${stageColors[activeTask.stage]}`}
            >
              S{activeTask.stage}
            </span>
          </div>
          <div className="flex-1" />
        </div>

        {/* CodeMirror editor */}
        <div className="flex-1 relative overflow-hidden z-0">
          <CMEditor
            key={activeTaskId}
            content={currentContent}
            readOnly={!isTaskUnlocked}
            onChange={handleEditorChange}
            onCursorMove={handleCursorMove}
            remoteCursors={remoteCursors}
          />

          {!isTaskUnlocked && (
            <div className="absolute inset-0 bg-surface-deep/80 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="flex items-center gap-3 px-6 py-3 rounded-md bg-surface/90 border border-border text-text-muted text-xs font-bold uppercase tracking-widest">
                <Lock size={16} className="text-accent-soft" />
                <span>Unlocks at Stage {activeTask.stage}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
