"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { RunResult } from "@/lib/testRunner";
import type { ScenarioFile } from "@/types/scenario";

type FileStatus = "passed" | "failed" | "blocked" | "pending";

interface VerifyPanelProps {
  files: ScenarioFile[];
  activeFileId: string;
  testResults: Record<string, RunResult>;
  getFileStatus: (fileId: string) => FileStatus;
  onVerify: () => void;
  verifying: boolean;
  testCount: number;
}

export function VerifyPanel({ activeFileId, testResults }: VerifyPanelProps) {
  const activeResults = testResults[activeFileId];

  if (!activeResults) {
    return (
      <div className="border-t border-border bg-surface-deep shrink-0 px-4 py-2">
        <p className="text-xs text-text-faint font-mono">
          No results for this file — click Verify System
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-surface-deep shrink-0">
      {/* Summary bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-border text-xs text-text-subtle">
        <span className="text-success">{activeResults.totalPassed} passed</span>
        {activeResults.totalFailed > 0 && (
          <span className="text-ghost">{activeResults.totalFailed} failed</span>
        )}
      </div>

      {/* Test output */}
      <div className="px-4 py-2 space-y-0.5 max-h-36 overflow-y-auto font-mono text-xs">
        {activeResults.results.map((r, i) => (
          <div key={i} className="flex items-start gap-2 py-0.5">
            {r.passed ? (
              <CheckCircle2
                size={12}
                className="text-success shrink-0 mt-0.5"
              />
            ) : (
              <XCircle size={12} className="text-ghost shrink-0 mt-0.5" />
            )}
            <span
              className={r.passed ? "text-text-muted" : "text-text-secondary"}
            >
              {r.description}
            </span>
            {r.error && !r.passed && (
              <span className="text-ghost/60 ml-2">{r.error}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
