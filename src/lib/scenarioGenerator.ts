/**
 * LLM-powered scenario generation for Ghost in the Machine.
 *
 * Generates a cohesive 3-file interconnected system scenario using
 * Gemini 3 Flash Preview in a single prompt. Falls back to static
 * scenarios on failure.
 */

import type {
  Scenario,
  ScenarioFile,
  TestCase,
  DependencyGraph,
} from "@/types/scenario";
import { validateCodeWithTests } from "@/lib/testRunner";

/** Themes to randomize scenario context across games */
const THEMES = [
  "authentication server",
  "payment processing pipeline",
  "real-time chat system",
  "inventory management system",
  "notification delivery service",
  "analytics data pipeline",
  "user session manager",
  "file upload processor",
  "search indexing service",
  "order fulfillment system",
  "rate limiting gateway",
  "cache invalidation service",
];

function pickTheme(): string {
  return THEMES[Math.floor(Math.random() * THEMES.length)];
}

function buildPrompt(theme: string): string {
  return `You are a coding challenge generator for a multiplayer game called "Ghost in the Machine".
Generate a cohesive broken system scenario with exactly 3 interconnected TypeScript/JavaScript files.

THEME: "${theme}"

The scenario represents a broken system where 3 files form a dependency chain:
- File 1 (stage 1): Foundation file with a SYNTAX bug (missing bracket, typo, etc.)
- File 2 (stage 2): Middle file with a LOGIC bug (wrong comparison, off-by-one, etc.) — depends on File 1
- File 3 (stage 3): Top file with an ALGORITHMIC bug (missing null check, wrong error handling, etc.) — depends on File 2

STRICT REQUIREMENTS:
1. Each file must be 10-30 lines of TypeScript/JavaScript with NO imports or external dependencies
2. Each file must export/define functions that the next file in the chain can call
3. buggyCode and fixedCode must be DIFFERENT for each file (minimal change to fix the bug)
4. Each file needs at least 2 test cases as self-contained JavaScript expressions that return true when code is correct
5. Test assertions must work by evaluating the code + assertion together (functions defined in the code are available)
6. The dependency graph must be a valid DAG: file1 has no deps, file2 depends on file1, file3 depends on file2
7. Include a narrative description of the broken system (1-2 sentences)
8. File IDs should be descriptive like "sys-config", "sys-validator", "sys-gateway"

Return ONLY valid JSON matching this exact schema:
{
  "description": "string (narrative of the broken system)",
  "files": [
    {
      "id": "string",
      "fileName": "string (ending in .ts)",
      "label": "string (2-3 word title)",
      "description": "string (what's broken in this file)",
      "buggyCode": "string",
      "fixedCode": "string",
      "stage": 1,
      "testCases": [
        { "description": "string", "assertion": "string (JS expression returning boolean)" }
      ]
    }
  ],
  "dependencyGraph": {
    "file1-id": [],
    "file2-id": ["file1-id"],
    "file3-id": ["file2-id"]
  }
}`;
}

/**
 * Validate and parse a raw LLM response into a Scenario.
 * Returns null if the response is invalid.
 */
export function validateScenarioResponse(raw: unknown): Scenario | null {
  if (!raw || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;

  // Check description
  if (typeof obj.description !== "string" || obj.description.trim() === "")
    return null;

  // Check files
  if (!Array.isArray(obj.files) || obj.files.length !== 3) return null;

  const files: ScenarioFile[] = [];
  const fileIds = new Set<string>();

  for (const f of obj.files) {
    if (!f || typeof f !== "object") return null;
    const file = f as Record<string, unknown>;

    if (
      typeof file.id !== "string" ||
      typeof file.fileName !== "string" ||
      typeof file.label !== "string" ||
      typeof file.description !== "string" ||
      typeof file.buggyCode !== "string" ||
      typeof file.fixedCode !== "string" ||
      ![1, 2, 3].includes(file.stage as number)
    )
      return null;

    // buggyCode and fixedCode must be distinct
    if (file.buggyCode.toString().trim() === file.fixedCode.toString().trim())
      return null;

    // Line count check: 10-30 lines
    const buggyLines = (file.buggyCode as string).split("\n").length;
    const fixedLines = (file.fixedCode as string).split("\n").length;
    if (
      buggyLines < 10 ||
      buggyLines > 30 ||
      fixedLines < 10 ||
      fixedLines > 30
    )
      return null;

    // Test cases
    if (!Array.isArray(file.testCases) || file.testCases.length < 2)
      return null;

    const testCases: TestCase[] = [];
    for (const tc of file.testCases) {
      if (!tc || typeof tc !== "object") return null;
      const test = tc as Record<string, unknown>;
      if (
        typeof test.description !== "string" ||
        typeof test.assertion !== "string"
      )
        return null;
      testCases.push({
        description: test.description,
        assertion: test.assertion,
        crossFile: test.crossFile === true ? true : undefined,
      });
    }

    fileIds.add(file.id as string);
    files.push({
      id: file.id as string,
      fileName: file.fileName as string,
      label: file.label as string,
      description: file.description as string,
      buggyCode: file.buggyCode as string,
      fixedCode: file.fixedCode as string,
      stage: file.stage as 1 | 2 | 3,
      testCases,
    });
  }

  // Check dependency graph
  if (!obj.dependencyGraph || typeof obj.dependencyGraph !== "object")
    return null;
  const graph = obj.dependencyGraph as Record<string, unknown>;
  const dependencyGraph: DependencyGraph = {};

  for (const file of files) {
    const deps = graph[file.id];
    if (!Array.isArray(deps)) return null;
    for (const dep of deps) {
      if (typeof dep !== "string" || !fileIds.has(dep)) return null;
    }
    dependencyGraph[file.id] = deps as string[];
  }

  // Validate DAG: no cycles (simple check for 3 nodes)
  // Stage 1 should have no deps, stage 2 depends on stage 1, stage 3 depends on stage 2
  const stage1 = files.find((f) => f.stage === 1);
  const stage2 = files.find((f) => f.stage === 2);
  const stage3 = files.find((f) => f.stage === 3);
  if (!stage1 || !stage2 || !stage3) return null;
  if (dependencyGraph[stage1.id].length !== 0) return null;

  return {
    description: obj.description as string,
    files,
    dependencyGraph,
  };
}

/**
 * Validate that fixedCode passes tests and buggyCode fails at least one test per file.
 */
function validateScenarioTests(scenario: Scenario): boolean {
  for (const file of scenario.files) {
    const fixedResult = validateCodeWithTests(
      file.fixedCode,
      file.testCases,
      true,
    );
    if (!fixedResult.passed) return false;

    const buggyResult = validateCodeWithTests(
      file.buggyCode,
      file.testCases,
      false,
    );
    if (!buggyResult.passed) return false;
  }
  return true;
}

/**
 * Generate a complete interconnected scenario using Gemini 3 Flash Preview.
 * Retries up to 2 times on failure, returns null to signal fallback.
 */
export async function generateScenario(
  apiKey: string,
): Promise<Scenario | null> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });
  const theme = pickTheme();
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const prompt = buildPrompt(theme);

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are a precise scenario generator. Return ONLY valid JSON.\n\n${prompt}`,
        config: {
          responseMimeType: "application/json",
          temperature: 0.8 + attempt * 0.1,
          maxOutputTokens: 6000,
        },
      });

      const content = response.text;
      if (!content) {
        console.warn(`[ScenarioGen] Empty response, attempt ${attempt + 1}`);
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        console.warn(`[ScenarioGen] Invalid JSON, attempt ${attempt + 1}`);
        continue;
      }

      const scenario = validateScenarioResponse(parsed);
      if (!scenario) {
        console.warn(
          `[ScenarioGen] Schema validation failed, attempt ${attempt + 1}`,
        );
        continue;
      }

      if (!validateScenarioTests(scenario)) {
        console.warn(
          `[ScenarioGen] Test validation failed, attempt ${attempt + 1}`,
        );
        continue;
      }

      return scenario;
    } catch (err) {
      console.error(`[ScenarioGen] Attempt ${attempt + 1} failed:`, err);
      if (attempt === maxRetries) return null;
    }
  }

  return null;
}
