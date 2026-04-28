"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  useStorage,
  useMutation,
  useOthers,
  useUpdateMyPresence,
  useBroadcastEvent,
  useSelf,
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
  FlaskConical,
  Loader2,
  XCircle,
  ArrowDown,
  Ban,
} from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useGameScenario } from "@/lib/useGameScenario";
import { validateChain, getInvalidationCascade } from "@/lib/chainValidator";
import { playTaskFixed } from "@/lib/sounds";
import { CMEditor } from "@/components/Editor/CMEditor";
import type { RunResult } from "@/lib/testRunner";

export function GameEditor({
  isGhost,
  roomCode,
}: {
  isGhost: boolean;
  roomCode: string;
}) {
  const { scenario, files, dependencyGraph, scenarioLabel, isGenerated } =
    useGameScenario(roomCode);
  const { getCurrentStage, getUnlockedFiles, GAME_DURATION } =
    useGameScenario(roomCode);
  const [activeFileId, setActiveFileId] = useState(files[0]?.id ?? "");
  const [taskListOpen, setTaskListOpen] = useState(true);
  const [snapshots, setSnapshots] = useState<Record<string, string>>({});
  const [scanResult, setScanResult] = useState<string[] | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [snapshotCooldown, setSnapshotCooldown] = useState(false);
  const [scanCooldownRemaining, setScanCooldownRemaining] = useState(0);
  const [snapshotCooldownRemaining, setSnapshotCooldownRemaining] = useState(0);
  const [testResults, setTestResults] = useState<Record<string, RunResult>>({});
  const [verifying, setVerifying] = useState(false);
  const scanExpiryRef = useRef(0);
  const snapshotExpiryRef = useRef(0);
  const updateMyPresence = useUpdateMyPresence();
  const others = useOthers();
  const broadcast = useBroadcastEvent();
  const self = useSelf();
  const editorContent = useStorage((root) => root.editorContent);
  const fakedTasks = useStorage((root) => root.fakedTasks);
  const fileVerification = useStorage((root) => root.fileVerification);
  const { timeRemaining } = useGameStore();

  // Sync activeFileId when files change
  useEffect(() => {
    if (files.length > 0 && !files.some((f) => f.id === activeFileId)) {
      setActiveFileId(files[0].id);
    }
  }, [files, activeFileId]);

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
  const unlockedFiles = getUnlockedFiles(elapsed);
  const prevStageRef = useRef(currentStage);

  useEffect(() => {
    if (currentStage > prevStageRef.current) {
      prevStageRef.current = currentStage;
    }
  }, [currentStage]);

  const activeFile = files.find((f) => f.id === activeFileId)!;
  const isFileUnlocked = unlockedFiles.some((f) => f.id === activeFileId);

  const rawContent = editorContent?.[activeFileId];
  const currentContent: string =
    typeof rawContent === "string" ? rawContent : (activeFile?.buggyCode ?? "");

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // File status helpers
  const getFileStatus = (
    fileId: string,
  ): "passed" | "failed" | "blocked" | "pending" => {
    // Check faked status for engineers
    const fakeExpiry = fakedTasks?.[fileId];
    if (typeof fakeExpiry === "number" && fakeExpiry > now && !isGhost)
      return "passed";

    const verification = fileVerification?.[fileId] as
      | { verified?: boolean; status?: string }
      | undefined;
    if (verification?.verified)
      return verification.status as "passed" | "failed" | "blocked" | "pending";
    return "pending";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle2 size={14} className="shrink-0 text-success" />;
      case "failed":
        return <XCircle size={14} className="shrink-0 text-ghost" />;
      case "blocked":
        return <Ban size={14} className="shrink-0 text-warning" />;
      default:
        return <Circle size={14} className="shrink-0 text-text-faint" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "passed":
        return "✓";
      case "failed":
        return "✗";
      case "blocked":
        return "⊘";
      default:
        return "○";
    }
  };

  const passedCount = files.filter(
    (f) => getFileStatus(f.id) === "passed",
  ).length;

  // Update file verification and system status in Liveblocks
  const updateVerification = useMutation(
    (
      { storage },
      results: Record<string, { verified: boolean; status: string }>,
      sysStatus: string,
    ) => {
      storage.set("fileVerification", results);
      storage.set("systemStatus", sysStatus as "operational" | "degraded");

      // Win condition: all 3 files pass
      if (sysStatus === "operational") {
        storage.set("gameStatus", "engineers-win");
      }
    },
    [],
  );

  // Invalidate verification for affected files
  const invalidateFiles = useMutation(({ storage }, fileIds: string[]) => {
    const current = { ...storage.get("fileVerification") };
    for (const id of fileIds) {
      delete current[id];
    }
    storage.set("fileVerification", current);
    storage.set("systemStatus", "degraded");
  }, []);

  /** Run chain validation for the entire system */
  const handleVerifySystem = useCallback(() => {
    setVerifying(true);

    setTimeout(() => {
      const currentVerification: Record<string, boolean> = {};
      // No files are pre-verified — we validate everything fresh
      const result = validateChain(
        scenario,
        (editorContent ?? {}) as Record<string, string>,
        currentVerification,
      );

      // Update test results for display
      const newTestResults: Record<string, RunResult> = {};
      for (const [fileId, fileResult] of Object.entries(result.fileResults)) {
        if (fileResult.testResult) {
          newTestResults[fileId] = fileResult.testResult;
        } else if (fileResult.status === "blocked") {
          // Create a synthetic result for blocked files so the panel shows them
          const blockedFile = files.find((f) => f.id === fileId);
          const blockerFile = fileResult.blockedBy
            ? files.find((f) => f.id === fileResult.blockedBy)
            : null;
          newTestResults[fileId] = {
            allPassed: false,
            totalPassed: 0,
            totalFailed: blockedFile?.testCases.length ?? 0,
            results: [
              {
                description: `Blocked — fix ${blockerFile?.fileName ?? "dependency"} first`,
                passed: false,
                error: `This file depends on ${blockerFile?.fileName ?? "another file"} which hasn't passed validation yet`,
              },
            ],
          };
        }
      }
      setTestResults(newTestResults);

      // Build verification map
      const verificationMap: Record<
        string,
        { verified: boolean; status: string }
      > = {};
      for (const [fileId, fileResult] of Object.entries(result.fileResults)) {
        verificationMap[fileId] = {
          verified: fileResult.status === "passed",
          status: fileResult.status,
        };
      }

      if (result.systemStatus === "operational") {
        playTaskFixed();
      }

      updateVerification(verificationMap, result.systemStatus);
      setVerifying(false);
    }, 100);
  }, [scenario, editorContent, updateVerification]);

  const updateContent = useMutation(
    ({ storage }, fileId: string, newCode: string) => {
      const content = { ...storage.get("editorContent"), [fileId]: newCode };
      storage.set("editorContent", content);

      // If this file was verified and code changed, invalidate it and all dependents
      const verification = storage.get("fileVerification");
      if (verification[fileId]?.verified) {
        const cascade = getInvalidationCascade(fileId, dependencyGraph);
        const updated = { ...verification };
        for (const id of cascade) {
          delete updated[id];
        }
        storage.set("fileVerification", updated);
        storage.set("systemStatus", "degraded");
      }
    },
    [dependencyGraph],
  );

  const LARGE_EDIT_THRESHOLD = 50;
  const editBroadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const prevContentRef = useRef<string>(currentContent);

  // Keep prevContentRef in sync when switching files
  useEffect(() => {
    prevContentRef.current = currentContent;
  }, [activeFileId]);

  const handleEditorChange = useCallback(
    (value: string) => {
      if (!isFileUnlocked) return;

      // Calculate change size for edit activity tracking
      const prev = prevContentRef.current;
      const charsChanged = Math.abs(value.length - prev.length);
      prevContentRef.current = value;

      updateContent(activeFileId, value);

      // Debounce edit-activity broadcast (500ms) to avoid spam on every keystroke
      if (editBroadcastTimerRef.current) {
        clearTimeout(editBroadcastTimerRef.current);
      }
      editBroadcastTimerRef.current = setTimeout(() => {
        const file = files.find((f) => f.id === activeFileId);
        if (!file || !self) return;

        // Calculate total diff from the last broadcast
        const totalDiff = Math.abs(value.length - prev.length);
        const isLargeEdit =
          charsChanged >= LARGE_EDIT_THRESHOLD ||
          totalDiff >= LARGE_EDIT_THRESHOLD;

        // Ghost edits show a random engineer's name to avoid exposure
        let displayName = self.presence.name as string;
        let displayColor = self.presence.color as string;
        if (isGhost) {
          const engineers = others
            .filter((o) => o.presence.name !== "")
            .map((o) => ({
              name: o.presence.name as string,
              color: o.presence.color as string,
            }));
          if (engineers.length > 0) {
            const pick =
              engineers[Math.floor(Math.random() * engineers.length)];
            displayName = pick.name;
            displayColor = pick.color;
          }
        }

        broadcast({
          type: "edit-activity",
          playerName: displayName,
          playerColor: displayColor,
          fileName: file.fileName,
          charsChanged: Math.max(charsChanged, totalDiff),
          isLargeEdit,
        });
      }, 500);
    },
    [activeFileId, updateContent, isFileUnlocked, files, broadcast, self],
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
      for (const file of files) {
        const raw = content[file.id];
        snap[file.id] =
          typeof raw === "string" ? (raw as string) : file.buggyCode;
      }
      setSnapshots(snap);
      snapshotExpiryRef.current = Date.now() + 30000;
      setSnapshotCooldown(true);
    },
    [snapshotCooldown, files],
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
    for (const file of unlockedFiles) {
      const raw = editorContent?.[file.id];
      const current = typeof raw === "string" ? raw : file.buggyCode;
      const buggyLines = file.buggyCode.split("\n");
      const fixedLines = file.fixedCode.split("\n");
      const currentLines = current.split("\n");
      currentLines.forEach((line, i) => {
        const buggy = buggyLines[i] || "";
        const fixed = fixedLines[i] || "";
        if (line !== buggy && line !== fixed && line.trim() !== "") {
          suspicious.push(`${file.fileName}:${i + 1}`);
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

  // Get dependency label for a file
  const getDependencyLabel = (fileId: string): string | null => {
    const deps = dependencyGraph[fileId];
    if (!deps || deps.length === 0) return null;
    const depFile = files.find((f) => f.id === deps[0]);
    return depFile ? `depends on ${depFile.label}` : null;
  };

  if (!activeFile) return null;

  return (
    <div className="flex-1 flex overflow-hidden font-mono">
      {/* ── File sidebar ─────────────────────────────────── */}
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
          System Files ({passedCount}/{files.length})
        </button>

        <div className="px-4 py-2 border-b border-border bg-surface-overlay/30">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
            {scenarioLabel}
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
            {currentStage === 1 && "Foundation"}
            {currentStage === 2 && "Integration"}
            {currentStage === 3 && "System"}
          </span>
        </div>

        {taskListOpen && (
          <div className="flex-1 overflow-y-auto py-2">
            {files.map((file, idx) => {
              const status = getFileStatus(file.id);
              const isActive = file.id === activeFileId;
              const locked = !unlockedFiles.some((f) => f.id === file.id);
              const depLabel = getDependencyLabel(file.id);
              return (
                <div key={file.id}>
                  {idx > 0 && (
                    <div className="flex justify-center py-0.5">
                      <ArrowDown size={10} className="text-text-faint" />
                    </div>
                  )}
                  <button
                    onClick={() => !locked && setActiveFileId(file.id)}
                    disabled={locked}
                    className={`w-full flex flex-col gap-0.5 px-4 py-2.5 text-xs transition-all ${
                      locked
                        ? "text-text-faint cursor-not-allowed opacity-50"
                        : isActive
                          ? "bg-accent/10 text-accent-soft border-l-[3px] border-accent"
                          : "text-text-muted hover:bg-surface-raised border-l-[3px] border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {locked ? (
                        <Lock size={14} className="shrink-0 text-text-faint" />
                      ) : (
                        getStatusIcon(status)
                      )}
                      <FileText
                        size={14}
                        className={`shrink-0 ${
                          locked ? "text-text-faint" : "text-info"
                        }`}
                      />
                      <span className="truncate tracking-wider">
                        {file.fileName}
                      </span>
                      {!locked && (
                        <span
                          className={`ml-auto text-[9px] font-bold tracking-widest ${stageColors[file.stage]}`}
                        >
                          S{file.stage}
                        </span>
                      )}
                    </div>
                    {depLabel && !locked && (
                      <span className="text-[9px] text-text-faint ml-8 tracking-wider">
                        ↳ {depLabel}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t border-border px-4 py-3 bg-surface-overlay/30">
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] mb-2">
            File Description
          </p>
          <p className="text-[11px] leading-relaxed text-text-secondary tracking-wide">
            {activeFile.description}
          </p>
          {getFileStatus(activeFileId) === "passed" && (
            <p className="text-[11px] text-success mt-2 font-bold uppercase tracking-widest">
              ✓ Verified
            </p>
          )}
          {getFileStatus(activeFileId) === "blocked" && (
            <p className="text-[11px] text-warning mt-2 font-bold uppercase tracking-widest">
              ⊘ Blocked — fix dependencies first
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
            <FileText size={14} className="text-info" />
            {activeFile.fileName}
            {getFileStatus(activeFileId) === "passed" && (
              <CheckCircle2 size={12} className="text-success ml-1" />
            )}
            <span
              className={`text-xs ml-2 uppercase font-bold ${stageColors[activeFile.stage]}`}
            >
              S{activeFile.stage}
            </span>
          </div>
          <div className="flex-1" />
        </div>

        {/* CodeMirror editor */}
        <div className="flex-1 relative overflow-hidden z-0">
          <CMEditor
            key={activeFileId}
            content={currentContent}
            readOnly={!isFileUnlocked}
            onChange={handleEditorChange}
            onCursorMove={handleCursorMove}
            remoteCursors={remoteCursors}
          />

          {!isFileUnlocked && (
            <div className="absolute inset-0 bg-surface-deep/80 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="flex items-center gap-3 px-6 py-3 rounded-md bg-surface/90 border border-border text-text-muted text-xs font-bold uppercase tracking-widest">
                <Lock size={16} className="text-accent-soft" />
                <span>Unlocks at Stage {activeFile.stage}</span>
              </div>
            </div>
          )}
        </div>

        {/* Verify System Panel */}
        {isFileUnlocked && (
          <div className="border-t border-border bg-surface shrink-0">
            {/* Verify button bar */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border/50">
              <button
                onClick={handleVerifySystem}
                disabled={verifying}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all ${
                  verifying
                    ? "bg-accent/10 text-accent-soft border border-accent/30 cursor-wait"
                    : "bg-accent/20 text-accent-glow border border-accent/50 hover:bg-accent/30 hover:border-accent/70 hover:shadow-accent-strong"
                }`}
              >
                {verifying ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Validating System...
                  </>
                ) : (
                  <>
                    <FlaskConical size={14} />
                    Verify System
                  </>
                )}
              </button>

              {/* Per-file status summary */}
              <div className="flex items-center gap-2 ml-2">
                {files.map((f) => {
                  const status = getFileStatus(f.id);
                  return (
                    <span
                      key={f.id}
                      className={`text-[10px] font-bold tracking-widest ${
                        status === "passed"
                          ? "text-success"
                          : status === "failed"
                            ? "text-ghost"
                            : status === "blocked"
                              ? "text-warning"
                              : "text-text-faint"
                      }`}
                      title={`${f.fileName}: ${status}`}
                    >
                      {getStatusLabel(status)}
                    </span>
                  );
                })}
              </div>

              <span className="ml-auto text-[9px] text-text-faint uppercase tracking-widest">
                {activeFile.testCases.length} test
                {activeFile.testCases.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Individual test results (shown after running) */}
            {Object.keys(testResults).length > 0 && (
              <div className="px-4 py-2 space-y-1 max-h-32 overflow-y-auto">
                {testResults[activeFileId] ? (
                  testResults[activeFileId].results.map((r, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 text-[10px] tracking-wider ${
                        r.passed ? "text-success/80" : "text-ghost/80"
                      }`}
                    >
                      {r.passed ? (
                        <CheckCircle2 size={12} className="shrink-0 mt-0.5" />
                      ) : (
                        <XCircle size={12} className="shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-bold">
                          {r.passed ? "PASS" : "FAIL"}
                        </span>
                        <span className="text-text-muted ml-2">
                          {r.description}
                        </span>
                        {r.error && !r.passed && (
                          <p className="text-ghost/60 mt-0.5 text-[9px]">
                            {r.error}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[9px] text-text-faint uppercase tracking-widest py-1">
                    No test results for this file — click Verify System to run
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
