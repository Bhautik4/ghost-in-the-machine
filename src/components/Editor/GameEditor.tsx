"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  useStorage,
  useMutation,
  useOthers,
  useSelf,
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
  AlertTriangle,
} from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import {
  getTasksForRoom,
  getUnlockedTasks,
  getCurrentStage,
  GAME_DURATION,
  getTaskSet,
  getTaskSetLabel,
  type Task,
} from "@/lib/taskBank";
import { playTaskFixed } from "@/lib/sounds";

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
  const updateMyPresence = useUpdateMyPresence();
  const others = useOthers();
  const editorContent = useStorage((root) => root.editorContent);
  const fakedTasks = useStorage((root) => root.fakedTasks);
  const { timeRemaining } = useGameStore();

  const elapsed = GAME_DURATION - timeRemaining;
  const currentStage = getCurrentStage(elapsed);
  const unlockedTasks = getUnlockedTasks(allTasks, elapsed);
  const prevStageRef = useRef(currentStage);

  // Notify on stage unlock
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

  // Check if a task is truly fixed (ignoring fakes for the Ghost)
  const isTaskFixed = (taskId: string) => {
    const fakeExpiry = fakedTasks?.[taskId];
    if (typeof fakeExpiry === "number" && fakeExpiry > Date.now() && !isGhost) {
      return true;
    }
    const task = allTasks.find((t) => t.id === taskId)!;
    const raw = editorContent?.[taskId];
    const content: string = typeof raw === "string" ? raw : task.buggyCode;
    return content.trim() === task.fixedCode.trim();
  };

  const fixedCount = unlockedTasks.filter((t) => isTaskFixed(t.id)).length;

  // Write editor changes to Liveblocks Storage + check win
  const updateContent = useMutation(
    ({ storage }, taskId: string, newCode: string) => {
      const content = { ...storage.get("editorContent"), [taskId]: newCode };
      storage.set("editorContent", content);

      // Check if the specific task was just fixed
      const task = allTasks.find((t) => t.id === taskId);
      if (task) {
        const wasBuggy =
          typeof storage.get("editorContent")[taskId] !== "string" ||
          (storage.get("editorContent")[taskId] as string).trim() !==
            task.fixedCode.trim();
        if (wasBuggy && newCode.trim() === task.fixedCode.trim()) {
          playTaskFixed();
        }
      }

      // Win condition: all unlocked tasks fixed
      const allFixed = allTasks.every((t) => {
        const code =
          typeof content[t.id] === "string"
            ? (content[t.id] as string)
            : t.buggyCode;
        return code.trim() === t.fixedCode.trim();
      });
      if (allFixed) {
        storage.set("gameStatus", "engineers-win");
      }
    },
    [],
  );

  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!isTaskUnlocked) return;
      updateContent(activeTaskId, e.target.value);
    },
    [activeTaskId, updateContent, isTaskUnlocked],
  );

  // ── Engineer Utility: Snapshot ───────────────────────────────
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
      setSnapshotCooldown(true);
      setTimeout(() => setSnapshotCooldown(false), 30000);
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

  // ── Engineer Utility: Security Scan ──────────────────────────
  // Compares current code against the original buggy code.
  // Lines that differ from BOTH buggy and fixed = Ghost edits.
  const runSecurityScan = useCallback(() => {
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
    setScanCooldown(true);
    setTimeout(() => {
      setScanCooldown(false);
      setScanResult(null);
    }, 45000);
  }, [scanCooldown, editorContent, unlockedTasks]);

  const handleCursorMove = useCallback(
    (
      e:
        | React.MouseEvent<HTMLTextAreaElement>
        | React.KeyboardEvent<HTMLTextAreaElement>,
    ) => {
      const textarea = e.currentTarget;
      const line = textarea.value
        .substring(0, textarea.selectionStart)
        .split("\n").length;
      const col =
        textarea.selectionStart -
        textarea.value.lastIndexOf("\n", textarea.selectionStart - 1) -
        1;
      updateMyPresence({ cursor: { line, col } });
    },
    [updateMyPresence],
  );

  const lines = currentContent.split("\n");

  const highlightLine = (line: string) => {
    const parts = line.split(
      /(\b(?:import|export|from|const|let|var|function|return|if|else|new|typeof|class|async|await|throw|interface|while|for|break|null|number|string|boolean|void)\b|(?:["'`])(?:(?!["'`]).)*(?:["'`])|\/\/.*|\b\d+\b|[<>/{}()[\];,=+\-*!?:.|&])/,
    );
    return parts.map((part, i) => {
      if (
        /^(import|export|from|const|let|var|function|return|if|else|new|typeof|class|async|await|throw|interface|while|for|break|null)$/.test(
          part,
        )
      )
        return (
          <span
            key={i}
            className="text-[#c084fc] drop-shadow-[0_0_3px_rgba(192,132,252,0.4)]"
          >
            {part}
          </span>
        );
      if (/^(number|string|boolean|void)$/.test(part))
        return (
          <span
            key={i}
            className="text-[#22d3ee] drop-shadow-[0_0_3px_rgba(34,211,238,0.4)]"
          >
            {part}
          </span>
        );
      if (/^["'`]/.test(part))
        return (
          <span
            key={i}
            className="text-[#86efac] drop-shadow-[0_0_3px_rgba(134,239,172,0.4)]"
          >
            {part}
          </span>
        );
      if (/^\/\//.test(part))
        return (
          <span key={i} className="text-[#71717a] italic">
            {part}
          </span>
        );
      if (/^\d+$/.test(part))
        return (
          <span
            key={i}
            className="text-[#fde047] drop-shadow-[0_0_3px_rgba(253,224,71,0.4)]"
          >
            {part}
          </span>
        );
      if (/^[<>/{}()[\];,=+\-*!?:.|&]$/.test(part))
        return (
          <span key={i} className="text-[#52525b]">
            {part}
          </span>
        );
      if (/^[A-Z]/.test(part))
        return (
          <span
            key={i}
            className="text-[#22d3ee] drop-shadow-[0_0_3px_rgba(34,211,238,0.4)]"
          >
            {part}
          </span>
        );
      return (
        <span key={i} className="text-[#e4e4e7]">
          {part}
        </span>
      );
    });
  };

  // Suspicious lines from security scan
  const suspiciousLineNums = new Set<number>();
  if (scanResult) {
    scanResult.forEach((s) => {
      const [file, lineStr] = s.split(":");
      if (file === activeTask.fileName) {
        suspiciousLineNums.add(parseInt(lineStr));
      }
    });
  }

  const otherCursors = others.filter(
    (o) => o.presence.cursor !== null && o.presence.name !== "",
  );

  const stageColors: Record<number, string> = {
    1: "text-[#86efac] drop-shadow-[0_0_3px_rgba(134,239,172,0.4)]",
    2: "text-[#fde047] drop-shadow-[0_0_3px_rgba(253,224,71,0.4)]",
    3: "text-[#f87171] drop-shadow-[0_0_3px_rgba(248,113,113,0.4)]",
  };
  const stageBg: Record<number, string> = {
    1: "bg-[#22c55e]/10 border-l-[3px] border-[#22c55e]",
    2: "bg-[#eab308]/10 border-l-[3px] border-[#eab308]",
    3: "bg-[#ef4444]/10 border-l-[3px] border-[#ef4444]",
  };

  return (
    <div className="flex-1 flex overflow-hidden font-mono">
      {/* ── Task sidebar ─────────────────────────────────── */}
      <div className="w-64 bg-[#18181b] border-r border-[#27272a]/50 flex flex-col shrink-0">
        <button
          onClick={() => setTaskListOpen(!taskListOpen)}
          className="flex items-center gap-2 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#a1a1aa] hover:text-[#e4e4e7] border-b border-[#27272a]/50 transition-colors bg-[#09090b]/50"
        >
          {taskListOpen ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
          <Bug size={14} className="text-[#a78bfa]" />
          Tasks ({fixedCount}/{unlockedTasks.length})
        </button>

        {/* Task set + Stage indicator */}
        <div className="px-4 py-2 border-b border-[#27272a]/50 bg-[#09090b]/30">
          <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-widest">
            {getTaskSetLabel(taskSet)}
          </span>
        </div>
        <div
          className={`px-4 py-2 border-b border-[#27272a]/50 ${stageBg[currentStage]}`}
        >
          <span
            className={`text-[11px] font-bold uppercase tracking-widest ${stageColors[currentStage]}`}
          >
            Stage {currentStage}/3
          </span>
          <span className="text-[10px] text-[#71717a] ml-3 uppercase tracking-wider">
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
                      ? "text-[#52525b] cursor-not-allowed opacity-50"
                      : isActive
                        ? "bg-[#6d28d9]/10 text-[#a78bfa] border-l-[3px] border-[#6d28d9]"
                        : "text-[#a1a1aa] hover:bg-[#1e1e22] border-l-[3px] border-transparent"
                  }`}
                >
                  {locked ? (
                    <Lock size={14} className="shrink-0 text-[#52525b]" />
                  ) : fixed ? (
                    <CheckCircle2
                      size={14}
                      className="shrink-0 text-[#22c55e] drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]"
                    />
                  ) : (
                    <Circle
                      size={14}
                      className="shrink-0 text-[#ef4444] drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]"
                    />
                  )}
                  <FileText
                    size={14}
                    className={`shrink-0 ${
                      locked
                        ? "text-[#52525b]"
                        : task.fileName.endsWith(".tsx")
                          ? "text-[#3b82f6] drop-shadow-[0_0_5px_rgba(59,130,246,0.4)]"
                          : task.fileName.endsWith(".ts")
                            ? "text-[#06b6d4] drop-shadow-[0_0_5px_rgba(6,182,212,0.4)]"
                            : "text-[#eab308] drop-shadow-[0_0_5px_rgba(234,179,8,0.4)]"
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

        {/* Task description */}
        <div className="border-t border-[#27272a]/50 px-4 py-3 bg-[#09090b]/30">
          <p className="text-[10px] text-[#71717a] font-bold uppercase tracking-[0.2em] mb-2">
            Mission Objective
          </p>
          <p className="text-[11px] leading-relaxed text-[#d4d4d8] tracking-wide">
            {activeTask.description}
          </p>
          {isTaskFixed(activeTaskId) && (
            <p className="text-[11px] text-[#22c55e] mt-2 font-bold uppercase tracking-widest drop-shadow-[0_0_5px_rgba(34,197,94,0.4)]">
              ✓ Fixed
            </p>
          )}
        </div>

        {/* Engineer utilities */}
        {!isGhost && (
          <div className="border-t border-[#27272a]/50 px-3 py-3 space-y-2 bg-[#09090b]/50">
            <button
              onClick={() => takeSnapshot()}
              disabled={snapshotCooldown}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all ${
                snapshotCooldown
                  ? "bg-[#27272a]/30 text-[#52525b] cursor-not-allowed border border-[#27272a]/30"
                  : "bg-[#0891b2]/10 text-[#22d3ee] hover:bg-[#0891b2]/20 border border-[#0891b2]/30 shadow-[0_0_10px_rgba(8,145,178,0.1)]"
              }`}
            >
              <Camera size={14} />
              {Object.keys(snapshots).length > 0
                ? "Update Snapshot"
                : "Take Snapshot"}
            </button>
            {Object.keys(snapshots).length > 0 && (
              <button
                onClick={() => revertToSnapshot()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-[#eab308]/10 text-[#fde047] hover:bg-[#eab308]/20 border border-[#eab308]/30 transition-all shadow-[0_0_10px_rgba(234,179,8,0.1)]"
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
                  ? "bg-[#27272a]/30 text-[#52525b] cursor-not-allowed border border-[#27272a]/30"
                  : "bg-[#6d28d9]/10 text-[#c084fc] hover:bg-[#6d28d9]/20 border border-[#6d28d9]/30 shadow-[0_0_10px_rgba(109,40,217,0.1)]"
              }`}
            >
              <ScanSearch size={14} />
              Security Scan {scanCooldown && "(45s)"}
            </button>
          </div>
        )}
      </div>

      {/* ── Editor area ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#09090b]">
        {/* Tab bar */}
        <div className="h-10 bg-[#18181b] border-b border-[#27272a]/50 flex items-end">
          <div className="relative h-full px-5 flex items-center gap-2.5 text-[11px] bg-[#09090b] text-[#e4e4e7] border-r border-[#27272a]/50 font-medium tracking-wider">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#a78bfa] shadow-[0_0_5px_rgba(167,139,250,0.5)]" />
            <FileText
              size={14}
              className={
                activeTask.fileName.endsWith(".tsx")
                  ? "text-[#3b82f6] drop-shadow-[0_0_3px_rgba(59,130,246,0.5)]"
                  : activeTask.fileName.endsWith(".ts")
                    ? "text-[#06b6d4] drop-shadow-[0_0_3px_rgba(6,182,212,0.5)]"
                    : "text-[#eab308] drop-shadow-[0_0_3px_rgba(234,179,8,0.5)]"
              }
            />
            {activeTask.fileName}
            {isTaskFixed(activeTaskId) && (
              <CheckCircle2
                size={12}
                className="text-[#22c55e] drop-shadow-[0_0_3px_rgba(34,197,94,0.5)] ml-1"
              />
            )}
            <span
              className={`text-[9px] ml-2 uppercase font-bold ${stageColors[activeTask.stage]}`}
            >
              S{activeTask.stage}
            </span>
          </div>
          <div className="flex-1" />
        </div>

        {/* Code editor */}
        <div className="flex-1 overflow-auto relative">
          <div className="flex min-h-full">
            {/* Line numbers */}
            <div className="sticky left-0 bg-[#09090b] z-10 select-none pr-4 pl-4 pt-4 text-right border-r border-[#27272a]/50">
              {lines.map((_, i) => (
                <div
                  key={i}
                  className={`text-xs leading-6 ${
                    suspiciousLineNums.has(i + 1)
                      ? "text-[#ef4444] font-bold drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]"
                      : "text-[#52525b]"
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code */}
            <div className="flex-1 relative">
              <div className="absolute inset-0 pt-4 pl-5 pointer-events-none">
                {lines.map((line, i) => (
                  <div
                    key={i}
                    className={`text-[13px] tracking-wide leading-6 whitespace-pre ${
                      suspiciousLineNums.has(i + 1) ? "bg-red-500/10" : ""
                    }`}
                  >
                    {highlightLine(line)}
                  </div>
                ))}
              </div>

              <textarea
                value={currentContent}
                onChange={handleCodeChange}
                onClick={handleCursorMove}
                onKeyUp={handleCursorMove}
                readOnly={!isTaskUnlocked}
                spellCheck={false}
                className={`absolute inset-0 w-full h-full pt-4 pl-5 bg-transparent text-transparent caret-[#a78bfa] text-[13px] tracking-wide leading-6 resize-none outline-none font-mono selection:bg-[#6d28d9]/40 ${
                  !isTaskUnlocked ? "cursor-not-allowed" : ""
                }`}
                style={{ caretColor: "#a78bfa" }}
              />

              {/* Locked overlay */}
              {!isTaskUnlocked && (
                <div className="absolute inset-0 bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center z-20">
                  <div className="flex items-center gap-3 px-6 py-3 rounded-md bg-[#18181b]/90 border border-[#27272a] text-[#a1a1aa] text-xs font-bold uppercase tracking-widest shadow-2xl">
                    <Lock size={16} className="text-[#a78bfa]" />
                    <span>Unlocks at Stage {activeTask.stage}</span>
                  </div>
                </div>
              )}

              {/* Other players' cursors */}
              {otherCursors.map((o) => (
                <div
                  key={o.connectionId}
                  className="absolute pointer-events-none z-30 transition-all duration-150"
                  style={{
                    top: `${(o.presence.cursor!.line - 1) * 24 + 16}px`,
                    left: `${o.presence.cursor!.col * 7.8 + 20}px`,
                  }}
                >
                  <div
                    className="w-[2px] h-5 rounded-full shadow-[0_0_8px_currentColor]"
                    style={{
                      backgroundColor: o.presence.color,
                      color: o.presence.color,
                    }}
                  />
                  <div
                    className="absolute -top-6 left-0 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-lg"
                    style={{ backgroundColor: o.presence.color, color: "#fff" }}
                  >
                    {o.presence.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Minimap */}
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-[#09090b]/80 backdrop-blur-sm border-l border-[#27272a]/50 hidden lg:block z-10">
            <div className="p-1 pt-4">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className="h-[3px] mb-px rounded-sm"
                  style={{
                    width: `${Math.min(100, (line.length / 50) * 100)}%`,
                    backgroundColor: suspiciousLineNums.has(i + 1)
                      ? "rgba(239,68,68,0.6)"
                      : "rgba(113,113,122,0.2)",
                    boxShadow: suspiciousLineNums.has(i + 1)
                      ? "0 0 4px rgba(239,68,68,0.4)"
                      : "none",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
