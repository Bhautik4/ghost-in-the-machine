"use client";

import {
  FileText,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Camera,
  ScanSearch,
  Lock,
  XCircle,
  ArrowDown,
  Ban,
} from "lucide-react";
import type { ScenarioFile } from "@/types/scenario";

type FileStatus = "passed" | "failed" | "blocked" | "pending";

interface FileSidebarProps {
  files: ScenarioFile[];
  activeFileId: string;
  onSelectFile: (fileId: string) => void;
  getFileStatus: (fileId: string) => FileStatus;
  unlockedFileIds: string[];
  getDependencyLabel: (fileId: string) => string | null;
  passedCount: number;
  currentStage: number;
  scenarioLabel: string;
  isGhost: boolean;
  onTakeSnapshot: () => void;
  onRevertSnapshot: () => void;
  onSecurityScan: () => void;
  snapshotCooldown: boolean;
  snapshotCooldownRemaining: number;
  scanCooldown: boolean;
  scanCooldownRemaining: number;
  hasSnapshot: boolean;
  taskListOpen: boolean;
  onToggleTaskList: () => void;
}

const stageColors: Record<number, string> = {
  1: "text-success-light",
  2: "text-warning-light",
  3: "text-ghost-light",
};

function StatusIcon({ status }: { status: FileStatus }) {
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
}

export function FileSidebar({
  files,
  activeFileId,
  onSelectFile,
  getFileStatus,
  unlockedFileIds,
  getDependencyLabel,
  passedCount,
  currentStage,
  scenarioLabel,
  isGhost,
  onTakeSnapshot,
  onRevertSnapshot,
  onSecurityScan,
  snapshotCooldown,
  snapshotCooldownRemaining,
  scanCooldown,
  scanCooldownRemaining,
  hasSnapshot,
  taskListOpen,
  onToggleTaskList,
}: FileSidebarProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Section header */}
      <button
        onClick={onToggleTaskList}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-text-muted hover:text-text-primary uppercase tracking-wide border-b border-border transition-colors"
      >
        {taskListOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        System Files
        <span className="ml-auto text-text-subtle text-[11px] font-normal normal-case">
          {passedCount}/{files.length}
        </span>
      </button>

      {/* File list */}
      {taskListOpen && (
        <div className="flex-1 overflow-y-auto min-h-0">
          {files.map((file, idx) => {
            const status = getFileStatus(file.id);
            const isActive = file.id === activeFileId;
            const locked = !unlockedFileIds.includes(file.id);
            const depLabel = getDependencyLabel(file.id);
            return (
              <div key={file.id}>
                {idx > 0 && (
                  <div className="flex justify-center py-px">
                    <ArrowDown size={9} className="text-text-ghost" />
                  </div>
                )}
                <button
                  onClick={() => !locked && onSelectFile(file.id)}
                  disabled={locked}
                  className={`w-full flex flex-col px-3 py-1.5 transition-colors text-left ${
                    locked
                      ? "text-text-faint cursor-not-allowed opacity-40"
                      : isActive
                        ? "bg-surface-raised/80 text-text-primary border-l-2 border-accent"
                        : "text-text-secondary hover:bg-surface-raised/50 border-l-2 border-transparent"
                  }`}
                >
                  {/* File name row */}
                  <div className="flex items-center gap-1.5 w-full">
                    {locked ? (
                      <Lock size={13} className="shrink-0 text-text-faint" />
                    ) : (
                      <StatusIcon status={status} />
                    )}
                    <FileText
                      size={13}
                      className={`shrink-0 ${locked ? "text-text-faint" : "text-info"}`}
                    />
                    <span className="truncate font-mono text-[13px]">
                      {file.fileName}
                    </span>
                    {!locked && (
                      <span
                        className={`ml-auto text-[11px] shrink-0 ${stageColors[file.stage]}`}
                      >
                        S{file.stage}
                      </span>
                    )}
                  </div>
                  {/* Description — compact, 2 lines max */}
                  {!locked && (
                    <p className="text-xs text-text-subtle mt-0.5 ml-7">
                      {file.description}
                    </p>
                  )}
                  {/* Dependency */}
                  {depLabel && !locked && (
                    <span className="text-[10px] text-text-faint ml-7 mt-0.5">
                      ↳ {depLabel}
                    </span>
                  )}
                  {/* Status badges */}
                  {!locked && status === "passed" && (
                    <div className="flex items-center gap-1 ml-7 mt-0.5 text-[10px] text-success">
                      <CheckCircle2 size={10} />
                      Verified
                    </div>
                  )}
                  {!locked && status === "blocked" && (
                    <div className="flex items-center gap-1 ml-7 mt-0.5 text-[10px] text-warning">
                      <Ban size={10} />
                      Blocked
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Stage + scenario */}
      <div className="border-t border-border px-3 py-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-semibold ${stageColors[currentStage]}`}
          >
            Stage {currentStage}/3
          </span>
          <span className="text-[11px] text-text-subtle">
            {currentStage === 1 && "Foundation"}
            {currentStage === 2 && "Integration"}
            {currentStage === 3 && "System"}
          </span>
        </div>
        <div className="text-[10px] text-text-faint mt-0.5 truncate">
          {scenarioLabel}
        </div>
      </div>

      {/* Engineer tools */}
      {!isGhost && (
        <div className="border-t border-border px-2 py-2 space-y-1 shrink-0">
          <button
            onClick={onTakeSnapshot}
            disabled={snapshotCooldown}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border ${
              snapshotCooldown
                ? "text-text-faint cursor-not-allowed border-transparent"
                : "text-info-light border-border hover:bg-surface-raised hover:border-surface-hover"
            }`}
          >
            <Camera size={14} className="shrink-0" />
            {snapshotCooldown
              ? `Snapshot (${snapshotCooldownRemaining}s)`
              : hasSnapshot
                ? "Update Snapshot"
                : "Take Snapshot"}
          </button>
          {hasSnapshot && (
            <button
              onClick={onRevertSnapshot}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-warning-light border border-border hover:bg-surface-raised hover:border-surface-hover transition-colors"
            >
              <Camera size={14} className="shrink-0" />
              Revert
            </button>
          )}
          <button
            onClick={onSecurityScan}
            disabled={scanCooldown}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors border ${
              scanCooldown
                ? "text-text-faint cursor-not-allowed border-transparent"
                : "text-accent-light border-border hover:bg-surface-raised hover:border-surface-hover"
            }`}
          >
            <ScanSearch size={14} className="shrink-0" />
            {scanCooldown
              ? `Scan (${scanCooldownRemaining}s)`
              : "Security Scan"}
          </button>
        </div>
      )}
    </div>
  );
}
