/**
 * Chain Validator — Dependency-aware test execution for interconnected scenarios.
 *
 * Runs tests in topological (stage) order. Files with unverified dependencies
 * are marked "blocked" and their tests are skipped. System is "operational"
 * only when all files pass.
 */

import type {
  Scenario,
  DependencyGraph,
  ChainValidationResult,
  FileStatus,
} from "@/types/scenario";
import { runTests } from "@/lib/testRunner";

/**
 * Validate the entire scenario chain in dependency order.
 *
 * @param scenario - The scenario to validate
 * @param editorContent - Current editor content keyed by file ID
 * @param currentVerification - Which files are already verified (fileId → true)
 */
export function validateChain(
  scenario: Scenario,
  editorContent: Record<string, string>,
  currentVerification: Record<string, boolean>,
): ChainValidationResult {
  const fileResults: ChainValidationResult["fileResults"] = {};

  // Sort files by stage (topological order)
  const sortedFiles = [...scenario.files].sort((a, b) => a.stage - b.stage);

  // Track which files pass in this validation run
  const passedInRun = new Set<string>();

  for (const file of sortedFiles) {
    const deps = scenario.dependencyGraph[file.id] || [];

    // Check if any dependency is not verified (either previously or in this run)
    const blockedByDep = deps.find(
      (depId) => !currentVerification[depId] && !passedInRun.has(depId),
    );

    if (blockedByDep) {
      fileResults[file.id] = {
        status: "blocked" as FileStatus,
        blockedBy: blockedByDep,
      };
      continue;
    }

    // Build code context: for cross-file tests, prepend dependency code
    const depCode = buildDependencyCode(
      file.id,
      scenario,
      editorContent,
      passedInRun,
      currentVerification,
    );

    const rawContent = editorContent[file.id];
    const code = typeof rawContent === "string" ? rawContent : file.buggyCode;
    const fullCode = depCode + "\n" + code;

    const testResult = runTests(fullCode, file.testCases);

    const status: FileStatus = testResult.allPassed ? "passed" : "failed";
    fileResults[file.id] = { status, testResult };

    if (testResult.allPassed) {
      passedInRun.add(file.id);
    }
  }

  // System is operational only when ALL files pass
  const allPassed = sortedFiles.every(
    (f) => fileResults[f.id]?.status === "passed",
  );

  return {
    fileResults,
    systemStatus: allPassed ? "operational" : "degraded",
  };
}

/**
 * Build the code context from dependency files for cross-file test execution.
 */
function buildDependencyCode(
  fileId: string,
  scenario: Scenario,
  editorContent: Record<string, string>,
  passedInRun: Set<string>,
  currentVerification: Record<string, boolean>,
): string {
  const deps = scenario.dependencyGraph[fileId] || [];
  const parts: string[] = [];

  for (const depId of deps) {
    // Recursively include transitive dependencies
    const transitiveDeps = buildDependencyCode(
      depId,
      scenario,
      editorContent,
      passedInRun,
      currentVerification,
    );
    if (transitiveDeps) parts.push(transitiveDeps);

    const depFile = scenario.files.find((f) => f.id === depId);
    if (!depFile) continue;

    const raw = editorContent[depId];
    const code = typeof raw === "string" ? raw : depFile.buggyCode;
    parts.push(code);
  }

  return parts.join("\n");
}

/**
 * Get all file IDs that need re-verification when a file is edited.
 * Returns the edited file's ID plus all files that transitively depend on it.
 */
export function getInvalidationCascade(
  fileId: string,
  dependencyGraph: DependencyGraph,
): string[] {
  const result = new Set<string>();
  result.add(fileId);

  // Build reverse graph: fileId → files that depend on it
  const reverseDeps: Record<string, string[]> = {};
  for (const [id, deps] of Object.entries(dependencyGraph)) {
    for (const dep of deps) {
      if (!reverseDeps[dep]) reverseDeps[dep] = [];
      reverseDeps[dep].push(id);
    }
  }

  // BFS to find all transitive dependents
  const queue = [fileId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const dependents = reverseDeps[current] || [];
    for (const dep of dependents) {
      if (!result.has(dep)) {
        result.add(dep);
        queue.push(dep);
      }
    }
  }

  return Array.from(result);
}
