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
  Lock,
  Loader2,
  XCircle,
  Ban,
  FlaskConical,
  Terminal,
} from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useGameScenario } from "@/lib/useGameScenario";
import { validateChain, getInvalidationCascade } from "@/lib/chainValidator";
import { playTaskFixed } from "@/lib/sounds";
import { CMEditor } from "@/components/Editor/CMEditor";
import { FileSidebar } from "@/components/Editor/FileSidebar";
import { GhostControls } from "@/components/Editor/GhostControls";
import { VerifyPanel } from "@/components/Editor/VerifyPanel";
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
  const [showTerminal, setShowTerminal] = useState(false);
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
    setShowTerminal(true);

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
    <div className="flex-1 flex overflow-hidden">
      {/* ── Left sidebar area ────────────────────────────── */}
      <div className="w-64 bg-surface-deep border-r border-border flex flex-col shrink-0">
        <FileSidebar
          files={files}
          activeFileId={activeFileId}
          onSelectFile={setActiveFileId}
          getFileStatus={getFileStatus}
          unlockedFileIds={unlockedFiles.map((f) => f.id)}
          getDependencyLabel={getDependencyLabel}
          passedCount={passedCount}
          currentStage={currentStage}
          scenarioLabel={scenarioLabel}
          isGhost={isGhost}
          onTakeSnapshot={() => takeSnapshot()}
          onRevertSnapshot={() => revertToSnapshot()}
          onSecurityScan={runSecurityScan}
          snapshotCooldown={snapshotCooldown}
          snapshotCooldownRemaining={snapshotCooldownRemaining}
          scanCooldown={scanCooldown}
          scanCooldownRemaining={scanCooldownRemaining}
          hasSnapshot={Object.keys(snapshots).length > 0}
          taskListOpen={taskListOpen}
          onToggleTaskList={() => setTaskListOpen(!taskListOpen)}
        />
        {/* Ghost abilities (ghost only, in left sidebar) */}
        <GhostControls isGhost={isGhost} roomCode={roomCode} />
      </div>

      {/* ── Editor area (CodeMirror) ─────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-surface-deep min-w-0">
        {/* Tab bar with Verify button */}
        <div className="h-10 bg-surface border-b border-border flex items-center">
          <div className="relative h-full px-4 flex items-center gap-2 text-sm bg-surface-deep text-text-primary border-r border-border">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent" />
            <FileText size={14} className="text-info" />
            <span className="font-mono">{activeFile.fileName}</span>
            {getFileStatus(activeFileId) === "passed" && (
              <CheckCircle2 size={12} className="text-success" />
            )}
            <span className={`text-xs ${stageColors[activeFile.stage]}`}>
              S{activeFile.stage}
            </span>
          </div>

          <div className="flex-1" />

          {/* Verify button in tab bar */}
          {isFileUnlocked && (
            <div className="flex items-center gap-2 px-3">
              {/* Per-file status dots */}
              <div className="flex items-center gap-1">
                {files.map((f) => {
                  const status = getFileStatus(f.id);
                  return (
                    <span key={f.id} title={`${f.fileName}: ${status}`}>
                      {status === "passed" ? (
                        <CheckCircle2 size={12} className="text-success" />
                      ) : status === "failed" ? (
                        <XCircle size={12} className="text-ghost" />
                      ) : status === "blocked" ? (
                        <Ban size={12} className="text-warning" />
                      ) : (
                        <Circle size={12} className="text-text-faint" />
                      )}
                    </span>
                  );
                })}
              </div>

              <button
                onClick={handleVerifySystem}
                disabled={verifying}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  verifying
                    ? "bg-accent/10 text-accent-soft border border-accent/20 cursor-wait"
                    : "bg-accent/10 text-accent-light border border-accent/20 hover:bg-accent/15"
                }`}
              >
                {verifying ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <FlaskConical size={12} />
                    Verify System
                  </>
                )}
              </button>

              {/* Toggle terminal */}
              {Object.keys(testResults).length > 0 && (
                <button
                  onClick={() => setShowTerminal(!showTerminal)}
                  className={`p-1 rounded transition-colors ${
                    showTerminal
                      ? "text-accent-light bg-accent/10"
                      : "text-text-faint hover:text-text-muted"
                  }`}
                  title={showTerminal ? "Hide terminal" : "Show terminal"}
                >
                  <Terminal size={14} />
                </button>
              )}

              <span className="text-xs text-text-subtle">
                {activeFile.testCases.length} tests
              </span>
            </div>
          )}
        </div>

        {/* CodeMirror editor */}
        <div className="flex-1 relative overflow-hidden z-0 min-h-0">
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
              <div className="flex items-center gap-3 px-5 py-2.5 rounded-lg bg-surface border border-border text-text-muted text-xs">
                <Lock size={16} className="text-accent-soft" />
                Unlocks at Stage {activeFile.stage}
              </div>
            </div>
          )}
        </div>

        {/* ── Terminal output (collapsible) ─────────────── */}
        {showTerminal && Object.keys(testResults).length > 0 && (
          <VerifyPanel
            files={files}
            activeFileId={activeFileId}
            testResults={testResults}
            getFileStatus={getFileStatus}
            onVerify={handleVerifySystem}
            verifying={verifying}
            testCount={activeFile.testCases.length}
          />
        )}
      </div>
    </div>
  );
}
