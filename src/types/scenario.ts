import type { RunResult } from "@/lib/testRunner";

export interface Scenario {
  description: string;
  files: ScenarioFile[];
  dependencyGraph: DependencyGraph;
}

export interface ScenarioFile {
  id: string;
  fileName: string;
  label: string;
  description: string;
  buggyCode: string;
  fixedCode: string;
  stage: 1 | 2 | 3;
  testCases: TestCase[];
}

export interface TestCase {
  description: string;
  assertion: string;
  crossFile?: boolean;
}

export type DependencyGraph = Record<string, string[]>;

export type FileStatus = "passed" | "failed" | "blocked" | "pending";

export type SystemStatus = "operational" | "degraded";

export interface ChainValidationResult {
  fileResults: Record<
    string,
    {
      status: FileStatus;
      blockedBy?: string;
      testResult?: RunResult;
    }
  >;
  systemStatus: SystemStatus;
}
